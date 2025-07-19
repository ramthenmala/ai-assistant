import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Plus, Star, StarOff, Edit, Trash2, Copy, Download, Upload, BookOpen } from 'lucide-react';
import { usePromptStore } from '@/stores/usePromptStore';

interface PromptLibraryModalProps {
  prompts?: any[]; // Legacy prop - will be ignored
  onClose: () => void;
  onSelectPrompt: (prompt: any) => void;
  onCreatePrompt?: (prompt: any) => void;
  onUpdatePrompt?: (prompt: any) => void;
  onDeletePrompt?: (promptId: string) => void;
  onToggleFavorite?: (promptId: string) => void;
  className?: string;
}

export function PromptLibraryModal({
  onClose,
  onSelectPrompt,
  className
}: PromptLibraryModalProps) {
  // Use the enhanced prompt store
  const {
    prompts,
    categories,
    searchQuery,
    selectedTags,
    selectedCategory,
    getFilteredPrompts,
    setSearchQuery,
    setSelectedTags,
    setSelectedCategory,
    createPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    getFavoritePrompts,
    getMostUsedPrompts,
    exportPrompts,
    initializeDefaultPrompts
  } = usePromptStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  
  // New prompt form state
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptTags, setNewPromptTags] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState('');
  
  // Get filtered prompts from store
  const filteredPrompts = getFilteredPrompts();
  const favoritePrompts = getFavoritePrompts();
  const mostUsedPrompts = getMostUsedPrompts(10);
  
  // Initialize default prompts if none exist
  useEffect(() => {
    if (prompts.length === 0) {
      initializeDefaultPrompts();
    }
  }, [prompts.length, initializeDefaultPrompts]);
  
  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(
      selectedTags.includes(tag) 
        ? selectedTags.filter(t => t !== tag) 
        : [...selectedTags, tag]
    );
  };
  
  // Handle creating a new prompt
  const handleCreatePrompt = () => {
    if (!newPromptTitle || !newPromptContent) return;
    
    const tags = newPromptTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    
    const promptData = {
      title: newPromptTitle,
      description: newPromptDescription || undefined,
      content: newPromptContent,
      tags,
      category: newPromptCategory || undefined,
      isFavorite: false
    };
    
    if (editingPrompt) {
      updatePrompt(editingPrompt.id, promptData);
    } else {
      createPrompt(promptData);
    }
    
    // Reset form
    resetForm();
  };
  
  const resetForm = () => {
    setNewPromptTitle('');
    setNewPromptDescription('');
    setNewPromptContent('');
    setNewPromptTags('');
    setNewPromptCategory('');
    setIsCreating(false);
    setEditingPrompt(null);
  };
  
  // Start editing a prompt
  const startEditingPrompt = (prompt: any) => {
    setEditingPrompt(prompt);
    setNewPromptTitle(prompt.title);
    setNewPromptDescription(prompt.description || '');
    setNewPromptContent(prompt.content);
    setNewPromptTags(prompt.tags.join(', '));
    setNewPromptCategory(prompt.category || '');
    setIsCreating(true);
  };
  
  // Handle export
  const handleExport = () => {
    const data = exportPrompts('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-3xl max-h-[90vh] bg-card border rounded-lg shadow-lg flex flex-col"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-medium">Enhanced Prompt Library</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r p-4 flex flex-col">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Categories */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Categories
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "w-full text-left p-2 rounded-md text-sm hover:bg-accent",
                    selectedCategory === null && "bg-accent"
                  )}
                >
                  All Categories ({prompts.length})
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "w-full text-left p-2 rounded-md text-sm hover:bg-accent flex items-center",
                      selectedCategory === category.id && "bg-accent"
                    )}
                  >
                    <span className="mr-2">{category.icon}</span>
                    <span className="flex-1">{category.name}</span>
                    <Badge variant="secondary" size="sm">
                      {prompts.filter(p => p.category === category.id).length}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Create button */}
            <Button
              variant="default"
              size="sm"
              className="mb-4"
              onClick={() => {
                setIsCreating(true);
                setEditingPrompt(null);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Prompt
            </Button>
            
            {/* Favorites section */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Favorites</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {favoritePrompts.slice(0, 5).map(prompt => (
                  <div
                    key={prompt.id}
                    className="text-sm p-2 rounded-md hover:bg-accent cursor-pointer flex items-center"
                    onClick={() => onSelectPrompt(prompt)}
                  >
                    <Star className="h-3 w-3 mr-2 text-yellow-500" />
                    <span className="truncate">{prompt.title}</span>
                  </div>
                ))}
                
                {favoritePrompts.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No favorite prompts
                  </div>
                )}
              </div>
            </div>
            
            {/* Most used section */}
            <div>
              <h3 className="text-sm font-medium mb-2">Most Used</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {mostUsedPrompts.slice(0, 5).map(prompt => (
                  <div
                    key={prompt.id}
                    className="text-sm p-2 rounded-md hover:bg-accent cursor-pointer flex items-center justify-between"
                    onClick={() => onSelectPrompt(prompt)}
                  >
                    <span className="truncate">{prompt.title}</span>
                    <Badge variant="secondary" size="sm">
                      {prompt.usageCount}
                    </Badge>
                  </div>
                ))}
                
                {mostUsedPrompts.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No prompts available
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isCreating || editingPrompt ? (
              <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="text-lg font-medium mb-4">
                  {isCreating ? "Create New Prompt" : "Edit Prompt"}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Title</label>
                    <Input
                      value={newPromptTitle}
                      onChange={(e) => setNewPromptTitle(e.target.value)}
                      placeholder="Enter prompt title"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Description (optional)</label>
                    <Input
                      value={newPromptDescription}
                      onChange={(e) => setNewPromptDescription(e.target.value)}
                      placeholder="Enter prompt description"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Category</label>
                    <Select
                      value={newPromptCategory}
                      onValueChange={setNewPromptCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center">
                              <span className="mr-2">{category.icon}</span>
                              {category.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Content</label>
                    <Textarea
                      value={newPromptContent}
                      onChange={(e) => setNewPromptContent(e.target.value)}
                      placeholder="Enter prompt content"
                      className="min-h-[150px]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Tags (comma separated)</label>
                    <Input
                      value={newPromptTags}
                      onChange={(e) => setNewPromptTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleCreatePrompt}
                      disabled={!newPromptTitle || !newPromptContent}
                    >
                      {editingPrompt ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Prompt list */}
                <div className="flex-1 overflow-y-auto">
                  {filteredPrompts.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-4 text-center">
                      <div>
                        <p className="text-muted-foreground">No prompts found</p>
                        {searchQuery || selectedTags.length > 0 ? (
                          <Button
                            variant="link"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedTags([]);
                            }}
                          >
                            Clear filters
                          </Button>
                        ) : (
                          <Button
                            variant="link"
                            onClick={() => setIsCreating(true)}
                          >
                            Create your first prompt
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredPrompts.map(prompt => (
                        <div
                          key={prompt.id}
                          className="p-4 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{prompt.title}</h3>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(prompt.id);
                                }}
                              >
                                {prompt.isFavorite ? (
                                  <Star className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingPrompt(prompt);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this prompt?')) {
                                    deletePrompt(prompt.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {prompt.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {prompt.description}
                            </p>
                          )}
                          
                          <div className="bg-muted/50 p-3 rounded-md text-sm mb-3 max-h-24 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {prompt.content}
                            </pre>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {prompt.category && (
                                <Badge variant="secondary" size="sm">
                                  {categories.find(c => c.id === prompt.category)?.icon} {categories.find(c => c.id === prompt.category)?.name}
                                </Badge>
                              )}
                              {prompt.tags.map(tag => (
                                <Badge key={tag} variant="outline" size="sm">
                                  {tag}
                                </Badge>
                              ))}
                              {prompt.isTemplate && (
                                <Badge variant="default" size="sm">
                                  Template
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" size="sm">
                                Used {prompt.usageCount} times
                              </Badge>
                              
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => onSelectPrompt(prompt)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Use
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}