import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatTimestamp } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  RotateCcw, 
  Clock, 
  Edit, 
  X, 
  Check,
  ChevronRight,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import type { Message, MessageVersion } from '@/types';

export interface MessageHistoryModalProps {
  open: boolean;
  onClose: () => void;
  message: Message;
  onRevertToVersion?: (versionId: string) => void;
  onDeleteVersion?: (versionId: string) => void;
  className?: string;
}

interface VersionItemProps {
  version: MessageVersion;
  isCurrentVersion: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRevert: () => void;
  onDelete: () => void;
}

const VersionItem = React.memo(function VersionItem({
  version,
  isCurrentVersion,
  isExpanded,
  onToggleExpanded,
  onRevert,
  onDelete
}: VersionItemProps) {
  const contentPreview = useMemo(() => {
    if (version.content.length <= 100) return version.content;
    return version.content.substring(0, 100) + '...';
  }, [version.content]);

  const contentWordCount = useMemo(() => {
    return version.content.split(/\s+/).filter(word => word.length > 0).length;
  }, [version.content]);

  return (
    <motion.div
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-all duration-200",
        isCurrentVersion 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-border/80"
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onToggleExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatTimestamp(version.timestamp)}
            </span>
          </div>
          
          {isCurrentVersion && (
            <Badge variant="default" className="text-xs">
              Current
            </Badge>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{contentWordCount} words</span>
            <span>•</span>
            <span>{version.content.length} chars</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!isCurrentVersion && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={onRevert}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Revert
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit reason */}
      {version.editReason && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Edit className="h-3 w-3" />
          <span className="italic">{version.editReason}</span>
        </div>
      )}

      {/* Content preview */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {isExpanded ? version.content : contentPreview}
        </div>
        
        {version.content.length > 100 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={onToggleExpanded}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </Button>
        )}
      </div>
    </motion.div>
  );
});

export const MessageHistoryModal = React.memo(function MessageHistoryModal({
  open,
  onClose,
  message,
  onRevertToVersion,
  onDeleteVersion,
  className
}: MessageHistoryModalProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  // Combine current message with versions for display
  const allVersions = useMemo(() => {
    const currentVersion: MessageVersion = {
      id: message.id,
      content: message.content,
      timestamp: message.editedAt || message.timestamp,
      editReason: message.isEdited ? 'Current version' : undefined
    };

    const versions = message.versions || [];
    return [currentVersion, ...versions.slice().reverse()];
  }, [message]);

  const toggleVersionExpanded = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  const handleRevertToVersion = (versionId: string) => {
    if (onRevertToVersion) {
      onRevertToVersion(versionId);
    }
    onClose();
  };

  const handleDeleteVersion = (versionId: string) => {
    if (onDeleteVersion) {
      onDeleteVersion(versionId);
    }
  };

  const totalVersions = allVersions.length;
  const editCount = totalVersions - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl max-h-[80vh] flex flex-col", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Message History
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{totalVersions} version{totalVersions > 1 ? 's' : ''}</span>
            {editCount > 0 && (
              <span>• {editCount} edit{editCount > 1 ? 's' : ''}</span>
            )}
            <span>• {message.role} message</span>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {allVersions.map((version, index) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isCurrentVersion={index === 0}
                  isExpanded={expandedVersions.has(version.id)}
                  onToggleExpanded={() => toggleVersionExpanded(version.id)}
                  onRevert={() => handleRevertToVersion(version.id)}
                  onDelete={() => handleDeleteVersion(version.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

MessageHistoryModal.displayName = 'MessageHistoryModal';