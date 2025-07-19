import { useState, useCallback, useEffect } from 'react';
import { useSDLCStore } from '@/stores/useSDLCStore';
import { useRAGChat } from '@/hooks/useRAGChat';
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';
import { useModelStore } from '@/stores/useModelStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { Message, AIModel } from '@/types';
import type { SDLCRoutingResult, SDLCTaskAnalysis } from '@/types/sdlc';

export interface SDLCIntegrationState {
  isProcessing: boolean;
  currentRouting: SDLCRoutingResult | null;
  selectedCategory: string | null;
  autoRouteEnabled: boolean;
  enhancedPrompt: string | null;
  error: string | null;
}

export interface SDLCIntegrationActions {
  processMessage: (message: string, conversationHistory: Message[]) => Promise<{
    enhancedPrompt: string;
    selectedModel: AIModel;
    routing: SDLCRoutingResult;
    ragContext?: any;
  }>;
  selectCategory: (categoryId: string | null) => void;
  toggleAutoRoute: (enabled: boolean) => void;
  retryRouting: () => Promise<void>;
  clearRouting: () => void;
  exportAnalytics: () => Promise<string>;
  provideFeedback: (routingId: string, feedback: any) => Promise<void>;
}

export function useSDLCIntegration(): SDLCIntegrationState & SDLCIntegrationActions {
  const [state, setState] = useState<SDLCIntegrationState>({
    isProcessing: false,
    currentRouting: null,
    selectedCategory: null,
    autoRouteEnabled: true,
    enhancedPrompt: null,
    error: null
  });

  const [lastQuery, setLastQuery] = useState<string>('');
  const [lastContext, setLastContext] = useState<any>(null);

  // Store hooks
  const {
    routeQuery,
    selectCategory: setSelectedCategory,
    setAutoRouteEnabled,
    clearCurrentRouting,
    exportHistory,
    provideFeedback: sdlcProvideFeedback,
    initializeServices,
    isInitialized,
    selectedCategory: storeSelectedCategory,
    autoRouteEnabled: storeAutoRouteEnabled,
    currentRoutingResult
  } = useSDLCStore();

  const {
    sendMessage: ragSendMessage,
    ragEnabled,
    getRelevantSources
  } = useRAGChat();

  const {
    ragOptions,
    activeStackIds
  } = useKnowledgeStore();

  const {
    availableModels,
    getModelById
  } = useModelStore();

  const {
    getSettings
  } = useSettingsStore();

  // Initialize SDLC services
  useEffect(() => {
    if (!isInitialized()) {
      const settings = getSettings();
      if (settings) {
        initializeServices(settings);
      }
    }
  }, [isInitialized, initializeServices, getSettings]);

  // Sync state with store
  useEffect(() => {
    setState(prev => ({
      ...prev,
      selectedCategory: storeSelectedCategory,
      autoRouteEnabled: storeAutoRouteEnabled,
      currentRouting: currentRoutingResult
    }));
  }, [storeSelectedCategory, storeAutoRouteEnabled, currentRoutingResult]);

  // Main message processing function
  const processMessage = useCallback(async (
    message: string,
    conversationHistory: Message[]
  ) => {
    if (!isInitialized()) {
      throw new Error('SDLC system not initialized');
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    setLastQuery(message);

    try {
      // Step 1: Get available models
      const models = availableModels();
      if (models.length === 0) {
        throw new Error('No AI models available');
      }

      // Step 2: Prepare context for routing
      const context = {
        conversationHistory,
        ragEnabled,
        activeKnowledgeStacks: activeStackIds,
        ragOptions,
        userPreferences: getSettings(),
        manualCategory: state.autoRouteEnabled ? undefined : state.selectedCategory
      };

      setLastContext(context);

      // Step 3: Route the query through SDLC system
      const routingResult = await routeQuery(message, context, models);

      // Step 4: Get RAG context if enabled
      let ragContext = null;
      if (ragEnabled && activeStackIds.length > 0) {
        try {
          const relevantSources = await getRelevantSources(message);
          ragContext = {
            sources: relevantSources,
            stackIds: activeStackIds,
            relevanceThreshold: ragOptions.relevanceThreshold
          };
        } catch (error) {
          console.warn('RAG context retrieval failed:', error);
        }
      }

      // Step 5: Combine SDLC routing with RAG enhancement
      let enhancedPrompt = routingResult.enhancedPrompt;
      if (ragContext && ragContext.sources.length > 0) {
        enhancedPrompt = await combineSDLCAndRAG(
          routingResult.enhancedPrompt,
          ragContext,
          routingResult.analysis
        );
      }

      // Step 6: Get the selected model
      const selectedModel = routingResult.selectedModel;

      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentRouting: routingResult,
        enhancedPrompt,
        error: null
      }));

      return {
        enhancedPrompt,
        selectedModel,
        routing: routingResult,
        ragContext
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      throw error;
    }
  }, [
    isInitialized,
    routeQuery,
    availableModels,
    ragEnabled,
    activeStackIds,
    ragOptions,
    getSettings,
    getRelevantSources,
    state.autoRouteEnabled,
    state.selectedCategory
  ]);

  // Combine SDLC routing with RAG enhancement
  const combineSDLCAndRAG = async (
    sdlcPrompt: string,
    ragContext: any,
    analysis: SDLCTaskAnalysis
  ): Promise<string> => {
    const contextSources = ragContext.sources
      .map((source: any, index: number) => `
**Source ${index + 1}:** ${source.sourceName} (${Math.round(source.relevance * 100)}% relevance)
${source.excerpt}
`)
      .join('\n');

    const ragEnhancedPrompt = `${sdlcPrompt}

## Knowledge Context
The following relevant information from your knowledge base may help with this ${analysis.classification.categoryId} task:

${contextSources}

## Instructions
- Use the knowledge context to provide more accurate and comprehensive responses
- Reference specific sources when applicable
- If the context doesn't contain relevant information, proceed with your general knowledge
- Maintain the focus on the ${analysis.classification.categoryId} domain expertise

## Enhanced Request
Please proceed with the original request, incorporating the knowledge context where relevant.`;

    return ragEnhancedPrompt;
  };

  // Category selection
  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setState(prev => ({ ...prev, selectedCategory: categoryId }));
  }, [setSelectedCategory]);

  // Auto-route toggle
  const toggleAutoRoute = useCallback((enabled: boolean) => {
    setAutoRouteEnabled(enabled);
    setState(prev => ({ ...prev, autoRouteEnabled: enabled }));
  }, [setAutoRouteEnabled]);

  // Retry routing with last parameters
  const retryRouting = useCallback(async () => {
    if (!lastQuery) {
      throw new Error('No previous query to retry');
    }

    const conversationHistory = lastContext?.conversationHistory || [];
    await processMessage(lastQuery, conversationHistory);
  }, [lastQuery, lastContext, processMessage]);

  // Clear current routing
  const clearRouting = useCallback(() => {
    clearCurrentRouting();
    setState(prev => ({
      ...prev,
      currentRouting: null,
      enhancedPrompt: null,
      error: null
    }));
  }, [clearCurrentRouting]);

  // Export analytics
  const exportAnalytics = useCallback(async () => {
    return await exportHistory();
  }, [exportHistory]);

  // Provide feedback
  const provideFeedback = useCallback(async (routingId: string, feedback: any) => {
    await sdlcProvideFeedback(routingId, feedback);
  }, [sdlcProvideFeedback]);

  return {
    // State
    isProcessing: state.isProcessing,
    currentRouting: state.currentRouting,
    selectedCategory: state.selectedCategory,
    autoRouteEnabled: state.autoRouteEnabled,
    enhancedPrompt: state.enhancedPrompt,
    error: state.error,

    // Actions
    processMessage,
    selectCategory,
    toggleAutoRoute,
    retryRouting,
    clearRouting,
    exportAnalytics,
    provideFeedback
  };
}

// Additional hook for SDLC-specific utilities
export function useSDLCUtils() {
  const { categories, getMetrics, getPerformanceMetrics } = useSDLCStore();

  const getCategoryStats = useCallback((categoryId: string) => {
    const metrics = getMetrics();
    return metrics.get(categoryId) || null;
  }, [getMetrics]);

  const getOverallStats = useCallback(() => {
    return getPerformanceMetrics();
  }, [getPerformanceMetrics]);

  const getCategoryByComplexity = useCallback((complexity: 'low' | 'medium' | 'high') => {
    // This would be enhanced with actual complexity analysis
    return categories.filter(cat => {
      // Simple heuristic based on category type
      switch (complexity) {
        case 'low':
          return ['documentation', 'ui-ux'].includes(cat.id);
        case 'medium':
          return ['testing', 'development'].includes(cat.id);
        case 'high':
          return ['planning', 'deployment', 'quality-assurance'].includes(cat.id);
        default:
          return false;
      }
    });
  }, [categories]);

  const getTopCategories = useCallback((limit: number = 5) => {
    const metrics = getMetrics();
    return Array.from(metrics.entries())
      .sort((a, b) => b[1].totalTasks - a[1].totalTasks)
      .slice(0, limit)
      .map(([categoryId, stats]) => ({
        category: categories.find(c => c.id === categoryId),
        stats
      }));
  }, [getMetrics, categories]);

  return {
    getCategoryStats,
    getOverallStats,
    getCategoryByComplexity,
    getTopCategories,
    categories
  };
}