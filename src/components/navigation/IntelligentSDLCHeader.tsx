import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronRight, 
  Brain, 
  Zap, 
  Target, 
  Clock,
  TrendingUp,
  Settings,
  Info,
  CheckCircle
} from 'lucide-react';
import type { SDLCCategory, SDLCRoutingResult } from '@/types/sdlc';
import { SDLC_CATEGORIES } from '@/config/sdlcConfig';

interface IntelligentSDLCHeaderProps {
  selectedCategory?: string;
  onCategorySelect: (categoryId: string) => void;
  onAutoRouteToggle: (enabled: boolean) => void;
  autoRouteEnabled: boolean;
  routingResult?: SDLCRoutingResult;
  isProcessing?: boolean;
  className?: string;
}

export function IntelligentSDLCHeader({
  selectedCategory,
  onCategorySelect,
  onAutoRouteToggle,
  autoRouteEnabled,
  routingResult,
  isProcessing = false,
  className
}: IntelligentSDLCHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Auto-collapse when category is selected
  useEffect(() => {
    if (selectedCategory) {
      setIsExpanded(false);
    }
  }, [selectedCategory]);

  const getCurrentCategory = (): SDLCCategory | null => {
    if (routingResult) {
      return Object.values(SDLC_CATEGORIES).find(c => c.id === routingResult.analysis.classification.categoryId) || null;
    }
    if (selectedCategory) {
      return Object.values(SDLC_CATEGORIES).find(c => c.id === selectedCategory) || null;
    }
    return null;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplexityColor = (complexity: string): string => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentCategory = getCurrentCategory();

  return (
    <div className={cn("bg-white border-b border-gray-200 shadow-sm", className)}>
      {/* Main Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Category Selection */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                AI-Powered SDLC Assistant
              </h1>
            </div>
            
            {/* Auto-Route Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={autoRouteEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => onAutoRouteToggle(!autoRouteEnabled)}
                className="flex items-center space-x-2"
              >
                <Zap className={cn("h-4 w-4", autoRouteEnabled ? "text-white" : "text-gray-600")} />
                <span>Auto-Route</span>
              </Button>
              
              {isProcessing && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm text-gray-600">Analyzing...</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Current Category & Controls */}
          <div className="flex items-center space-x-4">
            {/* Current Category Display */}
            {currentCategory && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-lg">{currentCategory.icon}</span>
                <span className="font-medium text-gray-900">{currentCategory.name}</span>
                {routingResult && (
                  <Badge variant="secondary" className={getConfidenceColor(routingResult.analysis.classification.confidence)}>
                    {(routingResult.analysis.classification.confidence * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            )}

            {/* Category Selector */}
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2"
            >
              <span>Categories</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>

            {/* Insights Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInsights(!showInsights)}
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Insights</span>
            </Button>
          </div>
        </div>

        {/* Routing Information */}
        {routingResult && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Routed to {currentCategory?.name}
                  </span>
                </div>
                <Badge className={getComplexityColor(routingResult.analysis.classification.estimatedComplexity)}>
                  {routingResult.analysis.classification.estimatedComplexity} complexity
                </Badge>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>~{routingResult.analysis.classification.estimatedTime}min</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Model:</span>
                <Badge variant="outline">{routingResult.selectedModel.name}</Badge>
              </div>
            </div>
            
            {routingResult.routingReason && (
              <p className="mt-2 text-sm text-gray-700">
                {routingResult.routingReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expandable Category Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.values(SDLC_CATEGORIES).map(category => (
                  <motion.div
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedCategory === category.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    )}
                    onClick={() => {
                      onCategorySelect(category.id);
                      setIsExpanded(false);
                    }}
                    onMouseEnter={() => setHoveredCategory(category.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {category.aiModelPreferences.primary}
                        </Badge>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <TrendingUp className="h-3 w-3" />
                          <span>{(category.metrics.accuracyScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      {selectedCategory === category.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    {/* Hover Details */}
                    <AnimatePresence>
                      {hoveredCategory === category.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="mt-3 pt-3 border-t border-gray-200"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Avg Response Time</span>
                              <span className="text-gray-900">{category.metrics.avgResponseTime}ms</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">User Satisfaction</span>
                              <span className="text-gray-900">{category.metrics.userSatisfaction.toFixed(1)}/5</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Tasks Completed</span>
                              <span className="text-gray-900">{category.metrics.totalTasks}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Panel */}
      <AnimatePresence>
        {showInsights && routingResult && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50"
          >
            <div className="px-6 py-4">
              <div className="flex items-center space-x-2 mb-4">
                <Info className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Task Analysis Insights</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Classification Confidence */}
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Classification Confidence</span>
                    <span className={cn("text-sm font-bold", getConfidenceColor(routingResult.analysis.classification.confidence))}>
                      {(routingResult.analysis.classification.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={routingResult.analysis.classification.confidence * 100} 
                    className="h-2"
                  />
                </div>

                {/* Required Knowledge */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Required Knowledge</h4>
                  <div className="flex flex-wrap gap-1">
                    {routingResult.analysis.classification.requiredKnowledge.map(skill => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Processing Time */}
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Processing Time</span>
                    <span className="text-sm font-bold text-gray-900">
                      {routingResult.processingTime}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Route analysis completed in {routingResult.processingTime}ms
                  </div>
                </div>
              </div>

              {/* Contextual Hints */}
              {routingResult.analysis.contextualHints.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Contextual Hints</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {routingResult.analysis.contextualHints.map((hint, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <ChevronRight className="h-3 w-3 mt-0.5 text-gray-400" />
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alternatives */}
              {routingResult.alternatives.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Classifications</h4>
                  <div className="space-y-2">
                    {routingResult.alternatives.slice(0, 3).map((alt, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{alt.category}</span>
                          <Badge variant="outline" className="text-xs">
                            {alt.model}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {(alt.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}