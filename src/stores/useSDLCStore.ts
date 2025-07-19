import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  SDLCCategory, 
  SDLCRoutingDecision, 
  SDLCInsight, 
  SDLCMetrics,
  SDLCTaskAnalysis,
  SDLCSettings 
} from '@/types/sdlc';
import { SDLCRoutingService, type SDLCRoutingResult } from '@/services/SDLCRoutingService';
import { SDLC_CATEGORIES, DEFAULT_SDLC_SETTINGS } from '@/config/sdlcConfig';
import type { AIModel, AppSettings } from '@/types';

interface SDLCStoreState {
  // Core state
  categories: SDLCCategory[];
  selectedCategory: string | null;
  autoRouteEnabled: boolean;
  isProcessing: boolean;
  
  // Routing results
  currentRoutingResult: SDLCRoutingResult | null;
  routingHistory: SDLCRoutingResult[];
  
  // Insights and metrics
  insights: SDLCInsight[];
  metrics: Map<string, SDLCMetrics>;
  
  // Services
  routingService: SDLCRoutingService | null;
  
  // Settings
  settings: {
    autoClassification: boolean;
    confidenceThreshold: number;
    enableModelRouting: boolean;
    learningMode: boolean;
    collectMetrics: boolean;
    showAlternatives: boolean;
    enableInsights: boolean;
    maxHistorySize: number;
  };
  
  // Performance tracking
  performanceMetrics: {
    totalRoutings: number;
    averageProcessingTime: number;
    averageConfidence: number;
    successRate: number;
    categoryDistribution: Record<string, number>;
    modelUsage: Record<string, number>;
  };
}

interface SDLCStoreActions {
  // Initialization
  initializeServices: (appSettings: AppSettings) => void;
  updateAppSettings: (appSettings: AppSettings) => void;
  
  // Category management
  selectCategory: (categoryId: string | null) => void;
  getCategoryById: (categoryId: string) => SDLCCategory | null;
  
  // Routing
  routeQuery: (query: string, context?: any, availableModels?: AIModel[]) => Promise<SDLCRoutingResult>;
  setAutoRouteEnabled: (enabled: boolean) => void;
  clearCurrentRouting: () => void;
  
  // History management
  getRoutingHistory: () => SDLCRoutingResult[];
  clearHistory: () => void;
  exportHistory: () => Promise<string>;
  importHistory: (data: string) => Promise<void>;
  
  // Insights and analytics
  generateInsights: () => Promise<SDLCInsight[]>;
  getMetrics: () => Map<string, SDLCMetrics>;
  getPerformanceMetrics: () => any;
  updatePerformanceMetrics: (routingResult: SDLCRoutingResult) => void;
  recalculatePerformanceMetrics: () => void;
  
  // Feedback
  provideFeedback: (routingId: string, feedback: any) => Promise<void>;
  
  // Settings
  updateSettings: (settings: Partial<SDLCSettings>) => void;
  resetSettings: () => void;
  
  // Utility
  isInitialized: () => boolean;
  healthCheck: () => Promise<boolean>;
}

export const useSDLCStore = create<SDLCStoreState & SDLCStoreActions>()(
  persist(
    (set, get) => ({
      // Initial state
      categories: Object.values(SDLC_CATEGORIES),
      selectedCategory: null,
      autoRouteEnabled: true,
      isProcessing: false,
      currentRoutingResult: null,
      routingHistory: [],
      insights: [],
      metrics: new Map(),
      routingService: null,
      settings: DEFAULT_SDLC_SETTINGS,
      performanceMetrics: {
        totalRoutings: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
        successRate: 0,
        categoryDistribution: {},
        modelUsage: {}
      },

      // Actions
      initializeServices: (appSettings: AppSettings) => {
        const routingService = new SDLCRoutingService(appSettings, {
          enableAutoRouting: get().autoRouteEnabled,
          confidenceThreshold: get().settings.confidenceThreshold,
          enableLearning: get().settings.learningMode,
          collectMetrics: get().settings.collectMetrics
        });

        set({ routingService });
        
        // Initialize metrics for all categories
        const metrics = new Map<string, SDLCMetrics>();
        Object.values(SDLC_CATEGORIES).forEach(category => {
          metrics.set(category.id, {
            categoryId: category.id,
            totalTasks: 0,
            completedTasks: 0,
            avgAccuracy: category.metrics.accuracyScore,
            avgResponseTime: category.metrics.avgResponseTime,
            userSatisfaction: category.metrics.userSatisfaction,
            mostUsedModels: [],
            commonPatterns: []
          });
        });
        
        set({ metrics });
      },

      updateAppSettings: (appSettings: AppSettings) => {
        const { routingService } = get();
        if (routingService) {
          routingService.updateSettings(appSettings);
        }
      },

      selectCategory: (categoryId: string | null) => {
        set({ selectedCategory: categoryId });
      },

      getCategoryById: (categoryId: string) => {
        return Object.values(SDLC_CATEGORIES).find(c => c.id === categoryId) || null;
      },

      routeQuery: async (query: string, context = {}, availableModels = []) => {
        const { routingService, autoRouteEnabled } = get();
        
        if (!routingService) {
          throw new Error('SDLC routing service not initialized');
        }

        set({ isProcessing: true });

        try {
          const routingResult = await routingService.routeQuery(query, context, availableModels);
          
          // Update state
          set(state => ({
            currentRoutingResult: routingResult,
            routingHistory: [...state.routingHistory, routingResult].slice(-state.settings.maxHistorySize),
            selectedCategory: autoRouteEnabled ? routingResult.analysis.classification.categoryId : state.selectedCategory,
            isProcessing: false
          }));

          // Update performance metrics
          get().updatePerformanceMetrics(routingResult);

          return routingResult;
        } catch (error) {
          set({ isProcessing: false });
          throw error;
        }
      },

      setAutoRouteEnabled: (enabled: boolean) => {
        set({ autoRouteEnabled: enabled });
        
        const { routingService } = get();
        if (routingService) {
          routingService.updateOptions({ enableAutoRouting: enabled });
        }
      },

      clearCurrentRouting: () => {
        set({ currentRoutingResult: null });
      },

      getRoutingHistory: () => {
        return get().routingHistory;
      },

      clearHistory: () => {
        set({ 
          routingHistory: [],
          currentRoutingResult: null,
          performanceMetrics: {
            totalRoutings: 0,
            averageProcessingTime: 0,
            averageConfidence: 0,
            successRate: 0,
            categoryDistribution: {},
            modelUsage: {}
          }
        });
        
        const { routingService } = get();
        if (routingService) {
          routingService.clearHistory();
        }
      },

      exportHistory: async () => {
        const { routingService } = get();
        if (!routingService) {
          throw new Error('Routing service not initialized');
        }
        
        return await routingService.exportRoutingData();
      },

      importHistory: async (data: string) => {
        const { routingService } = get();
        if (!routingService) {
          throw new Error('Routing service not initialized');
        }
        
        await routingService.importRoutingData(data);
        
        // Refresh state from service
        const history = routingService.getRoutingHistory();
        set({ routingHistory: history });
        
        // Recalculate performance metrics
        get().recalculatePerformanceMetrics();
      },

      generateInsights: async () => {
        const { routingService } = get();
        if (!routingService) {
          return [];
        }
        
        const insights = await routingService.getRoutingInsights();
        const sdlcInsights: SDLCInsight[] = [
          {
            id: `insight_${Date.now()}`,
            type: 'pattern',
            category: 'usage',
            title: 'Category Usage Analysis',
            description: `Most used category: ${Object.keys(insights.categoryDistribution)[0] || 'None'}`,
            impact: 'medium',
            actionable: true,
            data: insights,
            createdAt: new Date()
          }
        ];
        
        set({ insights: sdlcInsights });
        return sdlcInsights;
      },

      getMetrics: () => {
        return get().metrics;
      },

      getPerformanceMetrics: () => {
        return get().performanceMetrics;
      },

      provideFeedback: async (routingId: string, feedback: any) => {
        const { routingService } = get();
        if (!routingService) {
          throw new Error('Routing service not initialized');
        }
        
        await routingService.provideFeedback(routingId, feedback);
      },

      updateSettings: (newSettings: Partial<SDLCStoreState['settings']>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }));
        
        const { routingService } = get();
        if (routingService) {
          routingService.updateOptions({
            confidenceThreshold: newSettings.confidenceThreshold,
            enableLearning: newSettings.learningMode,
            collectMetrics: newSettings.collectMetrics
          });
        }
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SDLC_SETTINGS });
      },

      isInitialized: () => {
        return get().routingService !== null;
      },

      healthCheck: async () => {
        const { routingService } = get();
        if (!routingService) {
          return false;
        }
        
        try {
          // Basic health check
          const categories = routingService.getCategories();
          return categories.length > 0;
        } catch (error) {
          console.error('SDLC health check failed:', error);
          return false;
        }
      },

      // Helper methods (not exposed in the interface)
      updatePerformanceMetrics: (routingResult: SDLCRoutingResult) => {
        set(state => {
          const metrics = state.performanceMetrics;
          const newMetrics = {
            ...metrics,
            totalRoutings: metrics.totalRoutings + 1,
            averageProcessingTime: (metrics.averageProcessingTime + routingResult.processingTime) / 2,
            averageConfidence: (metrics.averageConfidence + routingResult.analysis.classification.confidence) / 2,
            categoryDistribution: {
              ...metrics.categoryDistribution,
              [routingResult.analysis.classification.categoryId]: 
                (metrics.categoryDistribution[routingResult.analysis.classification.categoryId] || 0) + 1
            },
            modelUsage: {
              ...metrics.modelUsage,
              [routingResult.selectedModel.id]: 
                (metrics.modelUsage[routingResult.selectedModel.id] || 0) + 1
            }
          };
          
          return { performanceMetrics: newMetrics };
        });
      },

      recalculatePerformanceMetrics: () => {
        const { routingHistory } = get();
        
        if (routingHistory.length === 0) {
          set({
            performanceMetrics: {
              totalRoutings: 0,
              averageProcessingTime: 0,
              averageConfidence: 0,
              successRate: 0,
              categoryDistribution: {},
              modelUsage: {}
            }
          });
          return;
        }

        const totalRoutings = routingHistory.length;
        const averageProcessingTime = routingHistory.reduce((sum, r) => sum + r.processingTime, 0) / totalRoutings;
        const averageConfidence = routingHistory.reduce((sum, r) => sum + r.analysis.classification.confidence, 0) / totalRoutings;
        
        const categoryDistribution: Record<string, number> = {};
        const modelUsage: Record<string, number> = {};
        
        routingHistory.forEach(result => {
          const category = result.analysis.classification.categoryId;
          const model = result.selectedModel.id;
          
          categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
          modelUsage[model] = (modelUsage[model] || 0) + 1;
        });

        set({
          performanceMetrics: {
            totalRoutings,
            averageProcessingTime,
            averageConfidence,
            successRate: averageConfidence, // Approximation
            categoryDistribution,
            modelUsage
          }
        });
      }
    }),
    {
      name: 'sdlc-store',
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        autoRouteEnabled: state.autoRouteEnabled,
        routingHistory: state.routingHistory,
        settings: state.settings,
        performanceMetrics: state.performanceMetrics
      })
    }
  )
);