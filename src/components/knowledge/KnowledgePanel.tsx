import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  File, 
  Folder, 
  Globe, 
  Plus, 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  Edit,
  MoreHorizontal
} from 'lucide-react';

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'url';
  path: string;
  stackId: string;
  status: 'indexing' | 'ready' | 'error';
  indexedAt?: Date;
  size: number;
  chunkCount?: number;
}

interface KnowledgeStack {
  id: string;
  name: string;
  description?: string;
  sources: KnowledgeSource[];
  isActive: boolean;
}

interface KnowledgePanelProps {
  stacks: KnowledgeStack[];
  onAddSource?: (stackId: string, source: Omit<KnowledgeSource, 'id' | 'status' | 'indexedAt' | 'chunkCount'>) => void;
  onRemoveSource?: (sourceId: string) => void;
  onCreateStack?: (stack: Omit<KnowledgeStack, 'id' | 'sources'>) => void;
  onUpdateStack?: (stack: KnowledgeStack) => void;
  onDeleteStack?: (stackId: string) => void;
  onToggleStackActive?: (stackId: string) => void;
  className?: string;
}

export function KnowledgePanel({
  stacks,
  onAddSource,
  onRemoveSource,
  onCreateStack,
  onUpdateStack,
  onDeleteStack,
  onToggleStackActive,
  className
}: KnowledgePanelProps) {
  const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});
  const [isCreatingStack, setIsCreatingStack] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDescription, setNewStackDescription] = useState('');
  const [dragActiveStackId, setDragActiveStackId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toggle stack expansion
  const toggleStackExpansion = (stackId: string) => {
    setExpandedStacks(prev => ({
      ...prev,
      [stackId]: !prev[stackId]
    }));
  };
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, stackId: string) => {
    e.preventDefault();
    setDragActiveStackId(null);
    
    if (!onAddSource) return;
    
    // Handle dropped files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        onAddSource(stackId, {
          name: file.name,
          type: 'file',
          path: URL.createObjectURL(file), // This would be replaced with actual file handling
          stackId,
          size: file.size
        });
      });
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, stackId: string) => {
    if (!e.target.files || !onAddSource) return;
    
    Array.from(e.target.files).forEach(file => {
      onAddSource(stackId, {
        name: file.name,
        type: 'file',
        path: URL.createObjectURL(file), // This would be replaced with actual file handling
        stackId,
        size: file.size
      });
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle creating a new stack
  const handleCreateStack = () => {
    if (!newStackName || !onCreateStack) return;
    
    onCreateStack({
      name: newStackName,
      description: newStackDescription || undefined,
      isActive: false
    });
    
    // Reset form
    setNewStackName('');
    setNewStackDescription('');
    setIsCreatingStack(false);
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  // Get source icon based on type and status
  const getSourceIcon = (source: KnowledgeSource) => {
    if (source.status === 'indexing') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (source.status === 'error') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    
    switch (source.type) {
      case 'file':
        return <File className="h-4 w-4" />;
      case 'folder':
        return <Folder className="h-4 w-4" />;
      case 'url':
        return <Globe className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };
  
  // Get source status badge
  const getSourceStatusBadge = (source: KnowledgeSource) => {
    switch (source.status) {
      case 'indexing':
        return <Badge variant="secondary">Indexing</Badge>;
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={cn("flex flex-col h-full", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-medium flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Knowledge Base
        </h2>
        
        {onCreateStack && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingStack(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Stack
          </Button>
        )}
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isCreatingStack ? (
          <div className="border rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium mb-3">Create Knowledge Stack</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Name</label>
                <Input
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  placeholder="Enter stack name"
                  className="h-8 text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium block mb-1">Description (optional)</label>
                <Input
                  value={newStackDescription}
                  onChange={(e) => setNewStackDescription(e.target.value)}
                  placeholder="Enter stack description"
                  className="h-8 text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingStack(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCreateStack}
                  disabled={!newStackName}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        ) : stacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Database className="h-12 w-12 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Knowledge Stacks</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a knowledge stack to add files, folders, or URLs
            </p>
            {onCreateStack && (
              <Button
                variant="default"
                onClick={() => setIsCreatingStack(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Stack
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {stacks.map(stack => {
              const isExpanded = expandedStacks[stack.id] ?? true;
              
              return (
                <div
                  key={stack.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Stack header */}
                  <div className="flex items-center justify-between p-3 bg-muted/30">
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => toggleStackExpansion(stack.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      <span className="font-medium">{stack.name}</span>
                      <Badge 
                        variant={stack.isActive ? "success" : "outline"} 
                        className="ml-2"
                      >
                        {stack.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {onToggleStackActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onToggleStackActive(stack.id)}
                          title={stack.isActive ? "Deactivate stack" : "Activate stack"}
                        >
                          {stack.isActive ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {onUpdateStack && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit stack"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {onDeleteStack && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this stack?')) {
                              onDeleteStack(stack.id);
                            }
                          }}
                          title="Delete stack"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Stack content */}
                  {isExpanded && (
                    <div className="p-3">
                      {/* Stack description */}
                      {stack.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {stack.description}
                        </p>
                      )}
                      
                      {/* Sources list */}
                      <div className="space-y-2 mb-3">
                        {stack.sources.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No sources added to this stack
                          </div>
                        ) : (
                          stack.sources.map(source => (
                            <div
                              key={source.id}
                              className="flex items-center justify-between p-2 bg-accent/30 rounded-md"
                            >
                              <div className="flex items-center">
                                <div className="mr-2">
                                  {getSourceIcon(source)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{source.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(source.size)}
                                    {source.chunkCount && ` • ${source.chunkCount} chunks`}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {getSourceStatusBadge(source)}
                                
                                {onRemoveSource && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => onRemoveSource(source.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {/* Add source controls */}
                      {onAddSource && (
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-md p-4 text-center transition-colors",
                            dragActiveStackId === stack.id 
                              ? "border-primary bg-primary/10" 
                              : "border-gray-200 hover:border-primary/50"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragActiveStackId(stack.id);
                          }}
                          onDragLeave={() => setDragActiveStackId(null)}
                          onDrop={(e) => handleDrop(e, stack.id)}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileInputChange(e, stack.id)}
                          />
                          
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">
                            Drag files here or click to upload
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Support for PDF, TXT, MD, and more
                          </p>
                          
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <File className="h-4 w-4 mr-2" />
                              Upload Files
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Folder className="h-4 w-4 mr-2" />
                              Add Folder
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Add URL
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}