// Search results component with highlighting and pagination

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock, Star, Edit, ExternalLink, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { SearchResult, SearchStats, SearchHighlight } from '@/services/SearchService';

interface SearchResultsProps {
  results: SearchResult[];
  stats: SearchStats;
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
  onChatOpen?: (chatId: string) => void;
  className?: string;
  resultsPerPage?: number;
}

export function SearchResults({
  results,
  stats,
  isLoading = false,
  onResultClick,
  onChatOpen,
  className,
  resultsPerPage = 20
}: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [showStats, setShowStats] = useState(false);

  // Pagination
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentResults = results.slice(startIndex, endIndex);

  // Memoized stats
  const topChats = useMemo(() => {
    return Object.entries(stats.resultsByChat)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([chatId, count]) => {
        const chat = results.find(r => r.chat.id === chatId)?.chat;
        return { chatId, count, title: chat?.title || 'Unknown Chat' };
      });
  }, [stats.resultsByChat, results]);

  const topModels = useMemo(() => {
    return Object.entries(stats.resultsByModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [stats.resultsByModel]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {stats.totalResults} result{stats.totalResults !== 1 ? 's' : ''}
          </h2>
          <Badge variant="outline" className="text-xs">
            {stats.searchTime.toFixed(1)}ms
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="text-xs"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            {showStats ? 'Hide' : 'Show'} Stats
          </Button>
          
          {/* Pagination info */}
          {totalPages > 1 && (
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Search statistics */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card border border-border rounded-lg"
          >
            {/* Top chats */}
            <div>
              <h4 className="font-medium mb-2">Top Conversations</h4>
              <div className="space-y-1">
                {topChats.map(({ chatId, count, title }) => (
                  <div
                    key={chatId}
                    className="flex items-center justify-between text-sm"
                  >
                    <button
                      onClick={() => onChatOpen?.(chatId)}
                      className="text-left hover:text-primary transition-colors truncate flex-1"
                      title={title}
                    >
                      {title}
                    </button>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Top models */}
            <div>
              <h4 className="font-medium mb-2">Models</h4>
              <div className="space-y-1">
                {topModels.map(([model, count]) => (
                  <div
                    key={model}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{model}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Role distribution */}
            <div>
              <h4 className="font-medium mb-2">By Role</h4>
              <div className="space-y-1">
                {Object.entries(stats.resultsByRole).map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{role}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {currentResults.map((result, index) => (
            <SearchResultItem
              key={`${result.chat.id}-${result.message.id}-${index}`}
              result={result}
              onClick={() => onResultClick?.(result)}
              onChatOpen={() => onChatOpen?.(result.chat.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, results.length)} of {results.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  <span className="text-muted-foreground">...</span>
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual search result item component
function SearchResultItem({
  result,
  onClick,
  onChatOpen
}: {
  result: SearchResult;
  onClick: () => void;
  onChatOpen: () => void;
}) {
  const { message, chat, highlights, relevanceScore, matchType } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={onChatOpen}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {chat.title}
                </button>
                <Badge variant="outline" className="text-xs">
                  {matchType}
                </Badge>
                {message.isBookmarked && (
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                )}
                {message.isEdited && (
                  <Edit className="h-3 w-3 text-blue-500" />
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {message.timestamp.toLocaleString()}
                <Separator orientation="vertical" className="h-3" />
                <span className="capitalize">{message.role}</span>
                <Separator orientation="vertical" className="h-3" />
                <span>Score: {relevanceScore.toFixed(1)}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div 
            className="text-sm leading-relaxed cursor-pointer"
            onClick={onClick}
          >
            <HighlightedText highlights={highlights} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Highlighted text component
function HighlightedText({ highlights }: { highlights: SearchHighlight[] }) {
  return (
    <div className="whitespace-pre-wrap">
      {highlights.map((highlight, index) => (
        <span
          key={index}
          className={cn(
            highlight.isHighlighted && "bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded font-medium"
          )}
        >
          {highlight.text}
        </span>
      ))}
    </div>
  );
}