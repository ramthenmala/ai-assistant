import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, 
  Plus, 
  Edit, 
  Trash2, 
  GitMerge,
  Copy,
  Eye,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ConversationTree } from './ConversationTree';
import { BranchComparison } from './BranchComparison';
import { 
  conversationBranchService, 
  type BranchMetadata,
  type BranchMergeOptions
} from '@/services/ConversationBranchService';
import type { Chat, Message } from '@/types';

export interface BranchManagementModalProps {
  open: boolean;
  onClose: () => void;
  chat: Chat;
  currentMessage?: Message;
  onBranchSwitch?: (branchId: string) => void;
  onBranchCreate?: (branchId: string) => void;
  onBranchDelete?: (branchId: string) => void;
  onBranchMerge?: (sourceBranchId: string, targetBranchId: string) => void;
  className?: string;
}

export const BranchManagementModal = React.memo(function BranchManagementModal({
  open,
  onClose,
  chat,
  currentMessage,
  onBranchSwitch,
  onBranchCreate,
  onBranchDelete,
  onBranchMerge,
  className
}: BranchManagementModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [branches, setBranches] = useState<BranchMetadata[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [mergeOptions, setMergeOptions] = useState<BranchMergeOptions>({
    strategy: 'merge',
    keepBothOnConflict: true,
    preferSource: false
  });

  // Load branches when modal opens
  useEffect(() => {
    if (open) {
      conversationBranchService.loadFromChat(chat);
      const branchTree = conversationBranchService.getBranchTree();
      setBranches(branchTree);
      
      const activeBranch = conversationBranchService.getActiveBranch();
      if (activeBranch) {
        setSelectedBranch(activeBranch.id);
      }
    }
  }, [open, chat]);

  // Create new branch
  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim() || !currentMessage) return;

    try {
      const { branchId } = conversationBranchService.createBranch(
        chat,
        currentMessage.id,
        newBranchName.trim(),
        'User-created branch from modal'
      );
      
      setBranches(conversationBranchService.getBranchTree());
      setNewBranchName('');
      onBranchCreate?.(branchId);
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  }, [newBranchName, currentMessage, chat, onBranchCreate]);

  // Switch branch
  const handleSwitchBranch = useCallback((branchId: string) => {
    try {
      conversationBranchService.switchBranch(branchId);
      setSelectedBranch(branchId);
      setBranches(conversationBranchService.getBranchTree());
      onBranchSwitch?.(branchId);
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  }, [onBranchSwitch]);

  // Delete branch
  const handleDeleteBranch = useCallback((branchId: string) => {
    try {
      conversationBranchService.deleteBranch(branchId);
      setBranches(conversationBranchService.getBranchTree());
      onBranchDelete?.(branchId);
    } catch (error) {
      console.error('Failed to delete branch:', error);
    }
  }, [onBranchDelete]);

  // Rename branch
  const handleRenameBranch = useCallback((branchId: string, newName: string) => {
    try {
      conversationBranchService.renameBranch(branchId, newName);
      setBranches(conversationBranchService.getBranchTree());
      setEditingBranch(null);
    } catch (error) {
      console.error('Failed to rename branch:', error);
    }
  }, []);

  // Merge branches
  const handleMergeBranches = useCallback((sourceBranchId: string, targetBranchId: string) => {
    try {
      conversationBranchService.mergeBranches(sourceBranchId, targetBranchId, mergeOptions);
      setBranches(conversationBranchService.getBranchTree());
      onBranchMerge?.(sourceBranchId, targetBranchId);
    } catch (error) {
      console.error('Failed to merge branches:', error);
    }
  }, [mergeOptions, onBranchMerge]);

  // Format branch for tree display
  const formatBranchesForTree = (branches: BranchMetadata[]) => {
    return branches.map(branch => ({
      id: branch.id,
      title: branch.title,
      parentId: branch.parentBranchId,
      messageCount: branch.messageCount,
      isActive: branch.isActive,
      children: []
    }));
  };

  // Format branches for comparison
  const formatBranchesForComparison = (branches: BranchMetadata[]) => {
    return branches.map(branch => ({
      id: branch.id,
      title: branch.title,
      messages: conversationBranchService.getBranchMessages(branch.id).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp,
        isEdited: msg.isEdited
      }))
    }));
  };

  const activeBranch = branches.find(b => b.isActive);
  const branchCount = branches.length;
  const totalMessages = branches.reduce((sum, b) => sum + b.messageCount, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-5xl max-h-[85vh] p-0", className)}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Branch Management
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{branchCount} branches</span>
            <span>•</span>
            <span>{totalMessages} total messages</span>
            <span>•</span>
            <span>Active: {activeBranch?.title || 'None'}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
              <TabsTrigger value="overview">
                <Eye className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tree">
                <GitBranch className="h-4 w-4 mr-2" />
                Tree View
              </TabsTrigger>
              <TabsTrigger value="compare">
                <GitMerge className="h-4 w-4 mr-2" />
                Compare
              </TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </TabsTrigger>
            </TabsList>

            <div className="overflow-auto p-6 h-full">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Total Branches</span>
                      </div>
                      <div className="text-2xl font-bold">{branchCount}</div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Total Messages</span>
                      </div>
                      <div className="text-2xl font-bold">{totalMessages}</div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Active Branch</span>
                      </div>
                      <div className="text-sm font-medium truncate">
                        {activeBranch?.title || 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Branch List */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">All Branches</h3>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {branches.map((branch) => (
                          <div
                            key={branch.id}
                            className={cn(
                              "p-3 border rounded-lg transition-colors",
                              branch.isActive && "bg-primary/10 border-primary"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{branch.title}</h4>
                                  {branch.isActive && (
                                    <Badge variant="default" className="text-xs">
                                      Active
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {branch.messageCount} messages
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Created: {branch.createdAt.toLocaleDateString()}
                                  {branch.description && (
                                    <span> • {branch.description}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSwitchBranch(branch.id)}
                                  disabled={branch.isActive}
                                >
                                  {branch.isActive ? 'Current' : 'Switch'}
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingBranch(branch.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                
                                {branch.id !== 'main' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteBranch(branch.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

              {/* Tree View Tab */}
              <TabsContent value="tree" className="mt-0">
                <ConversationTree
                  branches={formatBranchesForTree(branches)}
                  onSelectBranch={handleSwitchBranch}
                  onRenameBranch={handleRenameBranch}
                  onDeleteBranch={handleDeleteBranch}
                />
              </TabsContent>

              {/* Compare Tab */}
              <TabsContent value="compare" className="mt-0">
                <BranchComparison
                  branches={formatBranchesForComparison(branches)}
                  onClose={() => setActiveTab('overview')}
                  onSelectBranch={handleSwitchBranch}
                  onMergeBranches={handleMergeBranches}
                />
              </TabsContent>

              {/* Create Tab */}
              <TabsContent value="create" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Create New Branch</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="branch-name">Branch Name</Label>
                        <Input
                          id="branch-name"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="Enter branch name..."
                          className="mt-1"
                        />
                      </div>
                      
                      {currentMessage && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm font-medium mb-1">
                            Branch Point
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From message: "{currentMessage.content.substring(0, 50)}..."
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {currentMessage.timestamp.toLocaleString()}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateBranch}
                          disabled={!newBranchName.trim() || !currentMessage}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Create Branch
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => setNewBranchName('')}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>

                  {!currentMessage && (
                    <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          No Branch Point Selected
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        To create a branch, first select a message in the conversation to branch from.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="p-6 pt-0">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

BranchManagementModal.displayName = 'BranchManagementModal';