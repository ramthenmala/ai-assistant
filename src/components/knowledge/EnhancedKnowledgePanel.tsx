import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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
  Settings,
  Activity,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';

interface EnhancedKnowledgePanelProps {
  className?: string;
}

export function EnhancedKnowledgePanel({ className }: EnhancedKnowledgePanelProps) {
  const {
    stacks,
    sources,
    activeStackIds,
    ragEnabled,
    ragOptions,
    isIndexing,
    indexingProgress,
    stats,
    createStack,
    updateStack,
    deleteStack,
    toggleStackActive,
    addSource,
    removeSource,
    reindexSource,
    setRAGEnabled,
    updateRAGOptions,
    refreshStats,
    healthCheck
  } = useKnowledgeStore();

  const [expandedStacks, setExpandedStacks] = useState<Record<string, boolean>>({});
  const [isCreatingStack, setIsCreatingStack] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDescription, setNewStackDescription] = useState('');
  const [dragActiveStackId, setDragActiveStackId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize stats and health check
  useEffect(() => {
    refreshStats();
    healthCheck().then(setHealthStatus);
  }, []);

  // Toggle stack expansion
  const toggleStackExpansion = (stackId: string) => {
    setExpandedStacks(prev => ({
      ...prev,
      [stackId]: !prev[stackId]
    }));
  };

  // Handle file drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, stackId: string) => {
    e.preventDefault();
    setDragActiveStackId(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      
      for (const file of files) {
        await addSource(stackId, {
          name: file.name,
          type: 'file',
          path: file.name,
          size: file.size,
          metadata: {
            fileType: file.type,
            lastModified: new Date(file.lastModified)
          }
        }, file);
      }
    }
  };

  // Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, stackId: string) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      await addSource(stackId, {
        name: file.name,
        type: 'file',
        path: file.name,
        size: file.size,
        metadata: {
          fileType: file.type,
          lastModified: new Date(file.lastModified)
        }
      }, file);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle creating a new stack
  const handleCreateStack = async () => {
    if (!newStackName) return;
    
    await createStack({
      name: newStackName,
      description: newStackDescription || undefined,
      isActive: false
    });
    
    // Reset form
    setNewStackName('');
    setNewStackDescription('');
    setIsCreatingStack(false);
  };

  // Handle URL addition
  const handleAddURL = async (stackId: string) => {
    const url = prompt('Enter URL to add:');
    if (!url) return;

    try {
      new URL(url); // Validate URL
      await addSource(stackId, {
        name: url,
        type: 'url',
        path: url,
        size: 0,
        metadata: {
          url: url,
          addedAt: new Date()
        }
      });
    } catch (error) {
      alert('Invalid URL format');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Get source icon based on type and status
  const getSourceIcon = (source: any) => {
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
  const getSourceStatusBadge = (source: any) => {
    switch (source.status) {
      case 'indexing':
        return <Badge variant="secondary">Indexing</Badge>;
      case 'ready':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  // Get stack sources
  const getStackSources = (stackId: string) => {
    return sources.filter(source => source.stackId === stackId);
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
          {stats.isConfigured && (
            <Badge variant="secondary" className="ml-2">
              {stats.totalVectors} vectors
            </Badge>
          )}
        </h2>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingStack(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Stack
          </Button>
        </div>
      </div>

      {/* RAG Settings Panel */}
      {showSettings && (
        <div className="border-b p-4 bg-muted/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">RAG Enabled</label>
                <p className="text-xs text-muted-foreground">
                  Use knowledge base to enhance responses
                </p>
              </div>
              <Switch
                checked={ragEnabled}
                onCheckedChange={setRAGEnabled}
                disabled={!stats.isConfigured}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Relevance Threshold</label>
                <p className="text-xs text-muted-foreground">
                  {Math.round(ragOptions.relevanceThreshold * 100)}% similarity required
                </p>
              </div>
              <Input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={ragOptions.relevanceThreshold}
                onChange={(e) => updateRAGOptions({ relevanceThreshold: parseFloat(e.target.value) })}
                className="w-20"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Max Results</label>
                <p className="text-xs text-muted-foreground">
                  Maximum sources per query
                </p>
              </div>
              <Input
                type="number"
                min="1"
                max="20"
                value={ragOptions.maxResults}
                onChange={(e) => updateRAGOptions({ maxResults: parseInt(e.target.value) })}
                className="w-16 h-8"
              />
            </div>

            {/* Health Status */}
            {healthStatus && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>API Configuration</span>
                  <span className={healthStatus.rag?.apiConfiguration ? "text-green-600" : "text-red-600"}>
                    {healthStatus.rag?.apiConfiguration ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Vector Storage</span>
                  <span className={healthStatus.knowledge?.vectorStorage ? "text-green-600" : "text-red-600"}>
                    {healthStatus.knowledge?.vectorStorage ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats.isConfigured && (
        <div className="px-4 py-2 border-b bg-muted/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm font-medium">{stats.totalSources}</div>
              <div className="text-xs text-muted-foreground">Sources</div>
            </div>
            <div>
              <div className="text-sm font-medium">{stats.totalVectors}</div>
              <div className="text-xs text-muted-foreground">Vectors</div>
            </div>
            <div>
              <div className="text-sm font-medium">{formatFileSize(stats.memoryUsage)}</div>
              <div className="text-xs text-muted-foreground">Memory</div>
            </div>
          </div>
        </div>
      )}

      {/* Indexing Progress */}
      {isIndexing && indexingProgress.length > 0 && (
        <div className="p-4 border-b bg-blue-50">
          <div className="flex items-center mb-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm font-medium">Indexing in progress...</span>
          </div>
          {indexingProgress.map(progress => (
            <div key={progress.sourceId} className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{progress.sourceId}</span>
                <span>{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}
      
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
              Create a knowledge stack to add files, folders, or URLs for RAG-enhanced responses
            </p>
            <Button
              variant="default"
              onClick={() => setIsCreatingStack(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Stack
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {stacks.map(stack => {
              const isExpanded = expandedStacks[stack.id] ?? true;
              const stackSources = getStackSources(stack.id);
              
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
                        variant={stack.isActive ? "default" : "outline"} 
                        className={cn(
                          "ml-2",
                          stack.isActive && "bg-green-100 text-green-800"
                        )}
                      >
                        {stack.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {stackSources.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {stackSources.length} sources
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleStackActive(stack.id)}
                        title={stack.isActive ? "Deactivate stack" : "Activate stack"}
                      >
                        {stack.isActive ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this stack?')) {
                            deleteStack(stack.id);
                          }
                        }}
                        title="Delete stack"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                        {stackSources.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No sources added to this stack
                          </div>
                        ) : (
                          stackSources.map(source => (
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
                                
                                {source.status === 'error' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => reindexSource(source.id)}
                                    title="Retry indexing"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeSource(source.id)}
                                  title="Remove source"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {/* Add source controls */}
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
                          accept=".txt,.md,.json,.html,.htm"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(e, stack.id)}
                        />
                        
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">
                          Drag files here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Support for TXT, MD, JSON, HTML files
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
                            onClick={() => handleAddURL(stack.id)}
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Add URL
                          </Button>
                        </div>
                      </div>
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