import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowLeftRight, GitBranch, GitMerge, Info, AlertCircle } from 'lucide-react';
import { MessageProps } from './MessageBubble';
import { MessageList } from './MessageList';
import { conversationBranchService, type BranchComparisonResult } from '@/services/ConversationBranchService';

interface BranchComparisonProps {
  branches: {
    id: string;
    title: string;
    messages: MessageProps[];
  }[];
  onClose: () => void;
  onSelectBranch?: (branchId: string) => void;
  onMergeBranches?: (sourceBranchId: string, targetBranchId: string) => void;
  className?: string;
}

export function BranchComparison({
  branches,
  onClose,
  onSelectBranch,
  onMergeBranches,
  className
}: BranchComparisonProps) {
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    branches.slice(0, 2).map(branch => branch.id)
  );
  const [comparisonResult, setComparisonResult] = useState<BranchComparisonResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Toggle branch selection
  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranches(prev => {
      if (prev.includes(branchId)) {
        return prev.filter(id => id !== branchId);
      } else {
        // Limit to 2 branches for comparison
        if (prev.length >= 2) {
          return [prev[1], branchId];
        }
        return [...prev, branchId];
      }
    });
  };
  
  // Get selected branches data
  const selectedBranchesData = branches.filter(branch => 
    selectedBranches.includes(branch.id)
  );

  // Update comparison result when branches change
  useEffect(() => {
    if (selectedBranches.length === 2) {
      try {
        const result = conversationBranchService.compareBranches(
          selectedBranches[0], 
          selectedBranches[1]
        );
        setComparisonResult(result);
      } catch (error) {
        console.error('Failed to compare branches:', error);
        setComparisonResult(null);
      }
    } else {
      setComparisonResult(null);
    }
  }, [selectedBranches]);

  const handleMergeBranches = () => {
    if (selectedBranches.length === 2 && onMergeBranches) {
      onMergeBranches(selectedBranches[0], selectedBranches[1]);
    }
  };

  return (
    <motion.div
      className={cn(
        "flex flex-col h-full border rounded-lg bg-background",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <GitBranch className="h-4 w-4 mr-2" />
          <h3 className="font-medium">Branch Comparison</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Branch selector */}
      <div className="p-4 border-b">
        <div className="text-sm font-medium mb-2">Select branches to compare (max 2)</div>
        <div className="flex flex-wrap gap-2">
          {branches.map(branch => (
            <Button
              key={branch.id}
              variant={selectedBranches.includes(branch.id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleBranchSelection(branch.id)}
              className="flex items-center"
            >
              <span className="truncate max-w-[150px]">{branch.title}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Comparison Details */}
      {comparisonResult && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Comparison Details</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
          
          {showDetails && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Similarity Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(comparisonResult.similarityScore * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Common messages ratio
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Differences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Added:</span>
                      <Badge variant="secondary">
                        {comparisonResult.differences.added.length}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Removed:</span>
                      <Badge variant="secondary">
                        {comparisonResult.differences.removed.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Merge Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {comparisonResult.canMerge ? (
                      <Badge variant="default" className="bg-green-500">
                        Can Merge
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Has Conflicts
                      </Badge>
                    )}
                  </div>
                  {comparisonResult.conflicts.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {comparisonResult.conflicts.length} conflict(s)
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {comparisonResult.conflicts.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Merge Conflicts Detected
                </span>
              </div>
              <div className="text-sm text-yellow-700">
                {comparisonResult.conflicts.map((conflict, index) => (
                  <div key={index}>• {conflict}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Comparison view */}
      <div className="flex-1 flex overflow-hidden">
        {selectedBranchesData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div>
              <p className="text-muted-foreground">Select branches to compare</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {selectedBranchesData.map(branch => (
              <div key={branch.id} className="flex-1 flex flex-col border-r last:border-r-0">
                <div className="p-2 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{branch.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectBranch?.(branch.id)}
                    >
                      Switch to branch
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MessageList messages={branch.messages} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
          
          <div className="flex gap-2">
            {selectedBranchesData.length === 2 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectBranch?.(selectedBranchesData[0].id)}
                  className="flex items-center"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Switch to {selectedBranchesData[0].title}
                </Button>
                
                {comparisonResult?.canMerge && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleMergeBranches}
                    className="flex items-center"
                  >
                    <GitMerge className="h-4 w-4 mr-2" />
                    Merge Branches
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}