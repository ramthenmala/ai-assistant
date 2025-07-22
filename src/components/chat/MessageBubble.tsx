import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn, formatTimestamp } from '@/lib/utils';
import { messageBubbleEntrance } from '@/lib/animations';
import { Edit, CornerUpRight, RefreshCw, Clock, History, MoreVertical, Copy, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditableMessage } from './EditableMessage';
import { MediaDisplay } from '@/components/media/MediaDisplay';
import type { Message } from '@/types';

export interface MessageBubbleProps {
  message: Message;
  isEditing?: boolean;
  onEdit?: (content: string) => void;
  onBranch?: () => void;
  onRegenerate?: () => void;
  onRevertVersion?: (versionId: string) => void;
  onViewHistory?: () => void;
  onCopy?: () => void;
  onToggleBookmark?: () => void;
  className?: string;
  showTimestamp?: boolean;
  isStreaming?: boolean;
}

// Enhanced custom equality function for memo optimization
// This optimized version uses a more efficient comparison strategy with early exits
const arePropsEqual = (prevProps: MessageBubbleProps, nextProps: MessageBubbleProps) => {
  // Fast path: Use Object.is for identity comparison
  // This is faster than individual comparisons for the common case where props haven't changed
  if (prevProps === nextProps) {
    return true;
  }
  
  // Fast path: Check streaming state first - most likely to change frequently during AI responses
  if (prevProps.isStreaming !== nextProps.isStreaming) {
    return false;
  }
  
  // Fast path: Check message ID - if different, definitely re-render
  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }
  
  // Check editing state - important for UI mode
  if (prevProps.isEditing !== nextProps.isEditing) {
    return false;
  }
  
  // For streaming messages, we need to check content more carefully
  if (prevProps.isStreaming || nextProps.isStreaming) {
    // Always check content equality for streaming messages
    if (prevProps.message.content !== nextProps.message.content) {
      return false;
    }
  } else {
    // For non-streaming messages, we can optimize further
    // If content length is significantly different, content has changed
    const prevContent = prevProps.message.content;
    const nextContent = nextProps.message.content;
    
    if (Math.abs(prevContent.length - nextContent.length) > 5) {
      return false;
    }
    
    // For small content changes, do a full comparison
    if (prevContent !== nextContent) {
      return false;
    }
  }
  
  // Check edited status - important for UI indicators
  if (prevProps.message.isEdited !== nextProps.message.isEdited) {
    return false;
  }
  
  // Check other props that affect rendering
  if (prevProps.showTimestamp !== nextProps.showTimestamp ||
      prevProps.className !== nextProps.className) {
    return false;
  }
  
  // For function props, we assume they're stable if parent uses useCallback
  // This is a performance trade-off - we don't deep compare functions
  return true;
};

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isEditing = false,
  onEdit,
  onBranch,
  onRegenerate,
  onRevertVersion,
  onViewHistory,
  onCopy,
  onToggleBookmark,
  className,
  showTimestamp = true,
  isStreaming = false
}: MessageBubbleProps) {
  const [localIsEditing, setLocalIsEditing] = useState(isEditing);
  
  // Memoize computed values to prevent unnecessary recalculations
  const isUser = useMemo(() => message.role === 'user', [message.role]);
  const hasBranches = useMemo(() => message.branchId !== undefined, [message.branchId]);
  
  // Memoize event handlers to prevent child re-renders
  const handleEditStart = useCallback(() => {
    setLocalIsEditing(true);
  }, []);
  
  const handleEditSave = useCallback((content: string) => {
    if (onEdit) {
      onEdit(content);
    }
    setLocalIsEditing(false);
  }, [onEdit]);
  
  const handleEditCancel = useCallback(() => {
    setLocalIsEditing(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      onCopy();
    } else {
      // Default copy behavior
      try {
        await navigator.clipboard.writeText(message.content);
      } catch (error) {
        console.error('Failed to copy message:', error);
      }
    }
  }, [onCopy, message.content]);

  const handleToggleBookmark = useCallback(() => {
    if (onToggleBookmark) {
      onToggleBookmark();
    }
  }, [onToggleBookmark]);

  // Memoize streaming indicator to prevent unnecessary re-renders
  const StreamingIndicator = useMemo(() => (
    <div className="flex space-x-1 items-center py-2">
      <motion.div
        className="w-2 h-2 rounded-full bg-current opacity-60"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop", times: [0, 0.5, 1] }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-current opacity-60"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop", times: [0, 0.5, 1], delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-current opacity-60"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop", times: [0, 0.5, 1], delay: 0.4 }}
      />
    </div>
  ), []);

  // Memoize formatted timestamp to prevent unnecessary recalculations
  const formattedTimestamp = useMemo(() => 
    formatTimestamp(message.timestamp), 
    [message.timestamp]
  );

  // Memoize CSS classes to prevent unnecessary recalculations
  const containerClasses = useMemo(() => cn(
    "group relative flex w-full",
    isUser ? "justify-end" : "justify-start",
    className
  ), [isUser, className]);

  const bubbleClasses = useMemo(() => cn(
    "max-w-[85%] rounded-lg p-4 relative",
    isUser 
      ? "bg-primary text-primary-foreground" 
      : "bg-card border border-border",
    localIsEditing && "w-full max-w-full"
  ), [isUser, localIsEditing]);

  const actionButtonsClasses = useMemo(() => cn(
    "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
    isUser ? "right-full mr-2" : "left-full ml-2"
  ), [isUser]);

  // Memoize metadata section to prevent unnecessary re-renders
  const metadataSection = useMemo(() => {
    if (!showTimestamp) return null;
    
    const versionCount = message.versions?.length || 0;
    const editedTimestamp = message.editedAt ? formatTimestamp(message.editedAt) : null;
    
    return (
      <div className="flex items-center justify-between text-xs opacity-70 pt-1">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>{formattedTimestamp}</span>
          {message.isEdited && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1 cursor-help">
                    edited {editedTimestamp && `• ${editedTimestamp}`}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Message edited{editedTimestamp && ` at ${editedTimestamp}`}</p>
                  {versionCount > 0 && <p>{versionCount} version{versionCount > 1 ? 's' : ''} available</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasBranches && (
            <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1">
              has branches
            </Badge>
          )}
          {versionCount > 0 && onViewHistory && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs opacity-70 hover:opacity-100"
                    onClick={onViewHistory}
                  >
                    <History className="h-3 w-3 mr-1" />
                    {versionCount}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View {versionCount} version{versionCount > 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }, [showTimestamp, formattedTimestamp, message.isEdited, message.editedAt, message.versions, hasBranches, onViewHistory]);

  // Memoize action buttons to prevent unnecessary re-renders
  const actionButtons = useMemo(() => {
    if (localIsEditing || isStreaming) return null;
    
    const hasVersions = message.versions && message.versions.length > 0;
    const showMoreMenu = hasVersions && (onRevertVersion || onViewHistory);
    
    return (
      <div className={actionButtonsClasses}>
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 shadow-sm border">
          {/* Copy button - always available */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleCopy}
            title="Copy message"
          >
            <Copy className="h-3 w-3" />
          </Button>

          {/* Bookmark button - always available */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-6 w-6", message.isBookmarked && "text-yellow-500")} 
            onClick={handleToggleBookmark}
            title={message.isBookmarked ? "Remove bookmark" : "Bookmark message"}
          >
            {message.isBookmarked ? <Star className="h-3 w-3 fill-current" /> : <StarOff className="h-3 w-3" />}
          </Button>

          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={handleEditStart}
              title="Edit message"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          {onBranch && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={onBranch}
              title="Branch from here"
            >
              <CornerUpRight className="h-3 w-3" />
            </Button>
          )}
          
          {onRegenerate && !isUser && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={onRegenerate}
              title="Regenerate response"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          
          {showMoreMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  title="More options"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleBookmark}>
                  {message.isBookmarked ? (
                    <>
                      <StarOff className="h-3 w-3 mr-2" />
                      Remove Bookmark
                    </>
                  ) : (
                    <>
                      <Star className="h-3 w-3 mr-2" />
                      Bookmark Message
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onViewHistory && (
                  <DropdownMenuItem onClick={onViewHistory}>
                    <History className="h-3 w-3 mr-2" />
                    View History ({message.versions?.length || 0})
                  </DropdownMenuItem>
                )}
                {onRevertVersion && message.versions && message.versions.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {message.versions.slice(0, 3).map((version) => (
                      <DropdownMenuItem 
                        key={version.id} 
                        onClick={() => onRevertVersion(version.id)}
                      >
                        <span className="text-xs">
                          Revert to {formatTimestamp(version.timestamp)}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    {message.versions.length > 3 && (
                      <DropdownMenuItem onClick={onViewHistory}>
                        <span className="text-xs">View all versions...</span>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  }, [localIsEditing, isStreaming, actionButtonsClasses, onEdit, onBranch, onRegenerate, onRevertVersion, onViewHistory, isUser, message.versions, message.isBookmarked, handleEditStart, handleCopy, handleToggleBookmark]);

  return (
    <motion.div
      className={containerClasses}
      variants={messageBubbleEntrance}
      initial="hidden"
      animate="visible"
    >
      <div className={bubbleClasses}>
        {localIsEditing ? (
          <EditableMessage
            initialContent={message.content}
            onSave={handleEditSave}
            onCancel={handleEditCancel}
          />
        ) : (
          <div className="space-y-2">
            {/* Media attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <MediaDisplay attachments={message.attachments} readonly={true} />
            )}
            
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && StreamingIndicator}
            </div>
            
            {/* Message metadata */}
            {metadataSection}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      {actionButtons}
    </motion.div>
  );
}, arePropsEqual);

MessageBubble.displayName = 'MessageBubble';

// Export MessageProps for use in other components
export type MessageProps = MessageBubbleProps;