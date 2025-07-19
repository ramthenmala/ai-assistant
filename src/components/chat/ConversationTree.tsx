import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, MessageSquare, GitBranch, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Branch {
  id: string;
  title: string;
  parentId?: string;
  messageCount: number;
  isActive?: boolean;
  children?: Branch[];
}

interface ConversationTreeProps {
  branches: Branch[];
  onSelectBranch?: (branchId: string) => void;
  onRenameBranch?: (branchId: string, title: string) => void;
  onDeleteBranch?: (branchId: string) => void;
  className?: string;
}

export function ConversationTree({
  branches,
  onSelectBranch,
  onRenameBranch,
  onDeleteBranch,
  className
}: ConversationTreeProps) {
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  
  // Toggle branch expansion
  const toggleBranchExpansion = (branchId: string) => {
    setExpandedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }));
  };
  
  // Recursive function to render branch tree
  const renderBranch = (branch: Branch, depth = 0) => {
    const isExpanded = expandedBranches[branch.id] ?? true;
    const hasChildren = branch.children && branch.children.length > 0;
    
    return (
      <div key={branch.id} className="w-full">
        <div 
          className={cn(
            "flex items-center py-1 px-2 rounded-md hover:bg-accent transition-colors cursor-pointer",
            branch.isActive && "bg-accent",
            depth > 0 && "ml-4"
          )}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleBranchExpansion(branch.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-7"></div>
          )}
          
          {/* Branch content */}
          <div 
            className="flex-1 flex items-center"
            onClick={() => onSelectBranch?.(branch.id)}
          >
            <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm truncate">{branch.title}</span>
            
            {/* Message count badge */}
            <Badge 
              variant="secondary" 
              size="sm" 
              className="ml-2"
            >
              {branch.messageCount}
            </Badge>
          </div>
          
          {/* Actions */}
          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
            {onRenameBranch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  const newTitle = prompt('Enter new branch name:', branch.title);
                  if (newTitle && newTitle !== branch.title) {
                    onRenameBranch(branch.id, newTitle);
                  }
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            
            {onDeleteBranch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this branch?')) {
                    onDeleteBranch(branch.id);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="pl-2">
            {branch.children!.map(child => renderBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // If there are no branches, show a placeholder
  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <GitBranch className="h-12 w-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Branches</h3>
        <p className="text-sm text-muted-foreground">
          Create branches to explore different conversation paths
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("w-full p-2", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-1">Conversation Branches</h3>
        <p className="text-xs text-muted-foreground">
          Select a branch to view or continue that conversation path
        </p>
      </div>
      
      <div className="space-y-1">
        {branches.map(branch => renderBranch(branch))}
      </div>
    </motion.div>
  );
}