import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Database, 
  ChevronDown, 
  ChevronUp, 
  File, 
  Globe, 
  Folder,
  Clock,
  Target,
  BookOpen
} from 'lucide-react';

interface RAGSource {
  sourceId: string;
  sourceName: string;
  relevance: number;
  excerpt: string;
}

interface RAGContextCardProps {
  query: string;
  sources: RAGSource[];
  processingTime: number;
  className?: string;
}

export function RAGContextCard({ 
  query, 
  sources, 
  processingTime, 
  className 
}: RAGContextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSource, setSelectedSource] = useState<RAGSource | null>(null);

  if (sources.length === 0) {
    return null;
  }

  // Get icon for source type
  const getSourceIcon = (sourceName: string) => {
    if (sourceName.startsWith('http')) {
      return <Globe className="h-3 w-3" />;
    }
    if (sourceName.includes('/')) {
      return <Folder className="h-3 w-3" />;
    }
    return <File className="h-3 w-3" />;
  };

  // Format relevance percentage
  const formatRelevance = (relevance: number) => {
    return Math.round(relevance * 100);
  };

  // Get relevance badge color
  const getRelevanceBadgeVariant = (relevance: number) => {
    if (relevance >= 0.8) return 'default';
    if (relevance >= 0.6) return 'secondary';
    return 'outline';
  };

  return (
    <Card className={cn("mb-4 border-l-4 border-l-blue-500", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Database className="h-4 w-4 mr-2 text-blue-600" />
            <span>Knowledge Sources Used</span>
            <Badge variant="secondary" className="ml-2">
              {sources.length}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {processingTime}ms
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-1"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Summary */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1 mb-2">
            {sources.slice(0, 3).map((source, index) => (
              <Badge 
                key={source.sourceId}
                variant={getRelevanceBadgeVariant(source.relevance)}
                className="text-xs cursor-pointer hover:bg-accent"
                onClick={() => setSelectedSource(source)}
              >
                <span className="flex items-center">
                  {getSourceIcon(source.sourceName)}
                  <span className="ml-1 truncate max-w-[100px]">
                    {source.sourceName}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    {formatRelevance(source.relevance)}%
                  </span>
                </span>
              </Badge>
            ))}
            
            {sources.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{sources.length - 3} more
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            <Target className="h-3 w-3 inline mr-1" />
            Avg. relevance: {formatRelevance(
              sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length
            )}%
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3 border-t">
                {/* Query */}
                <div>
                  <h4 className="text-xs font-medium mb-1 flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Query
                  </h4>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {query}
                  </p>
                </div>

                {/* Sources */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Sources</h4>
                  <div className="space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={source.sourceId}
                        className={cn(
                          "p-2 rounded-md border cursor-pointer transition-colors",
                          selectedSource?.sourceId === source.sourceId 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedSource(
                          selectedSource?.sourceId === source.sourceId ? null : source
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            {getSourceIcon(source.sourceName)}
                            <span className="ml-1 text-xs font-medium truncate">
                              {source.sourceName}
                            </span>
                          </div>
                          <Badge 
                            variant={getRelevanceBadgeVariant(source.relevance)}
                            className="text-xs"
                          >
                            {formatRelevance(source.relevance)}%
                          </Badge>
                        </div>
                        
                        <AnimatePresence>
                          {selectedSource?.sourceId === source.sourceId && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {source.excerpt}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}