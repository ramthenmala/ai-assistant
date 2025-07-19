import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KnowledgeSource, KnowledgeStack } from '@/types';
import { KnowledgeService } from '@/services/KnowledgeService';
import type { KnowledgeIndexingResult } from '@/services/KnowledgeService';
import { RAGQueryService } from '@/services/RAGQueryService';
import type { RAGQueryOptions, RAGQueryResult } from '@/services/RAGQueryService';

interface KnowledgeStoreState {
  // Knowledge stacks and sources
  stacks: KnowledgeStack[];
  sources: KnowledgeSource[];
  activeStackIds: string[];
  
  // RAG configuration
  ragEnabled: boolean;
  ragOptions: RAGQueryOptions;
  
  // Processing state
  isIndexing: boolean;
  indexingProgress: { sourceId: string; progress: number }[];
  
  // Services
  knowledgeService: KnowledgeService | null;
  ragQueryService: RAGQueryService | null;
  
  // Statistics
  stats: {
    totalVectors: number;
    totalSources: number;
    totalStacks: number;
    memoryUsage: number;
    isConfigured: boolean;
  };
  
  // Actions
  initializeServices: (settings: any) => void;
  updateSettings: (settings: any) => void;
  
  // Stack management
  createStack: (stack: Omit<KnowledgeStack, 'id' | 'createdAt' | 'updatedAt'>) => Promise<KnowledgeStack>;
  updateStack: (id: string, updates: Partial<KnowledgeStack>) => Promise<void>;
  deleteStack: (id: string) => Promise<void>;
  toggleStackActive: (id: string) => void;
  
  // Source management
  addSource: (stackId: string, source: Omit<KnowledgeSource, 'id' | 'stackId' | 'indexedAt'>, file?: File) => Promise<KnowledgeSource>;
  removeSource: (sourceId: string) => Promise<void>;
  updateSource: (id: string, updates: Partial<KnowledgeSource>) => Promise<void>;
  reindexSource: (sourceId: string) => Promise<void>;
  
  // RAG configuration
  setRAGEnabled: (enabled: boolean) => void;
  updateRAGOptions: (options: Partial<RAGQueryOptions>) => void;
  setActiveStacks: (stackIds: string[]) => void;
  
  // Query processing
  processQuery: (query: string, conversationHistory?: any[]) => Promise<RAGQueryResult>;
  
  // Utility actions
  refreshStats: () => Promise<void>;
  healthCheck: () => Promise<any>;
  exportKnowledge: () => Promise<string>;
  importKnowledge: (data: string) => Promise<void>;
}

const defaultRAGOptions: RAGQueryOptions = {
  enableRAG: true,
  activeStackIds: [],
  relevanceThreshold: 0.7,
  maxResults: 5,
  maxContextLength: 2000,
  includeSourceCitations: true,
  contextWeight: 0.8
};

export const useKnowledgeStore = create<KnowledgeStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      stacks: [],
      sources: [],
      activeStackIds: [],
      ragEnabled: false,
      ragOptions: defaultRAGOptions,
      isIndexing: false,
      indexingProgress: [],
      knowledgeService: null,
      ragQueryService: null,
      stats: {
        totalVectors: 0,
        totalSources: 0,
        totalStacks: 0,
        memoryUsage: 0,
        isConfigured: false
      },

      // Service initialization
      initializeServices: (settings) => {
        const knowledgeService = new KnowledgeService(settings);
        const ragQueryService = new RAGQueryService(settings);
        
        set({
          knowledgeService,
          ragQueryService,
          ragEnabled: !!settings.apiKeys.openai
        });
        
        // Refresh stats after initialization
        get().refreshStats();
      },

      updateSettings: async (settings) => {
        const { knowledgeService, ragQueryService } = get();
        
        if (knowledgeService) {
          await knowledgeService.updateSettings(settings);
        }
        
        if (ragQueryService) {
          await ragQueryService.updateSettings(settings);
        }
        
        set({ ragEnabled: !!settings.apiKeys.openai });
        get().refreshStats();
      },

      // Stack management
      createStack: async (stackData) => {
        const newStack: KnowledgeStack = {
          id: `stack_${Date.now()}`,
          ...stackData,
          sources: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => ({
          stacks: [...state.stacks, newStack]
        }));

        return newStack;
      },

      updateStack: async (id, updates) => {
        set((state) => ({
          stacks: state.stacks.map(stack =>
            stack.id === id
              ? { ...stack, ...updates, updatedAt: new Date() }
              : stack
          )
        }));
      },

      deleteStack: async (id) => {
        const { knowledgeService } = get();
        
        if (knowledgeService) {
          await knowledgeService.removeKnowledgeStack(id);
        }

        set((state) => ({
          stacks: state.stacks.filter(stack => stack.id !== id),
          sources: state.sources.filter(source => source.stackId !== id),
          activeStackIds: state.activeStackIds.filter(stackId => stackId !== id)
        }));
        
        get().refreshStats();
      },

      toggleStackActive: (id) => {
        set((state) => {
          const stack = state.stacks.find(s => s.id === id);
          if (!stack) return state;

          const updatedStacks = state.stacks.map(s =>
            s.id === id ? { ...s, isActive: !s.isActive, updatedAt: new Date() } : s
          );

          const activeStackIds = !stack.isActive
            ? [...state.activeStackIds, id]
            : state.activeStackIds.filter(stackId => stackId !== id);

          return {
            stacks: updatedStacks,
            activeStackIds,
            ragOptions: { ...state.ragOptions, activeStackIds }
          };
        });
      },

      // Source management
      addSource: async (stackId, sourceData, file) => {
        const { knowledgeService } = get();
        
        const newSource: KnowledgeSource = {
          id: `source_${Date.now()}`,
          ...sourceData,
          stackId,
          status: 'indexing'
        };

        // Add to state immediately
        set((state) => ({
          sources: [...state.sources, newSource],
          stacks: state.stacks.map(stack =>
            stack.id === stackId
              ? { ...stack, sources: [...stack.sources, newSource], updatedAt: new Date() }
              : stack
          )
        }));

        // Start indexing
        if (knowledgeService) {
          set({ isIndexing: true });
          
          try {
            const result = await knowledgeService.indexKnowledgeSource(newSource, stackId, file);
            
            // Update source status
            const updatedSource = {
              ...newSource,
              status: result.success ? 'ready' as const : 'error' as const,
              indexedAt: result.success ? new Date() : undefined,
              chunkCount: result.chunks,
              metadata: {
                ...newSource.metadata,
                indexingResult: result
              }
            };

            set((state) => ({
              sources: state.sources.map(source =>
                source.id === newSource.id ? updatedSource : source
              ),
              stacks: state.stacks.map(stack =>
                stack.id === stackId
                  ? {
                      ...stack,
                      sources: stack.sources.map(source =>
                        source.id === newSource.id ? updatedSource : source
                      ),
                      updatedAt: new Date()
                    }
                  : stack
              )
            }));
            
            get().refreshStats();
          } catch (error) {
            console.error('Failed to index source:', error);
            
            // Update source with error status
            set((state) => ({
              sources: state.sources.map(source =>
                source.id === newSource.id
                  ? { ...source, status: 'error' as const }
                  : source
              )
            }));
          } finally {
            set({ isIndexing: false });
          }
        }

        return newSource;
      },

      removeSource: async (sourceId) => {
        const { knowledgeService } = get();
        
        if (knowledgeService) {
          await knowledgeService.removeKnowledgeSource(sourceId);
        }

        set((state) => ({
          sources: state.sources.filter(source => source.id !== sourceId),
          stacks: state.stacks.map(stack => ({
            ...stack,
            sources: stack.sources.filter(source => source.id !== sourceId),
            updatedAt: new Date()
          }))
        }));
        
        get().refreshStats();
      },

      updateSource: async (id, updates) => {
        set((state) => ({
          sources: state.sources.map(source =>
            source.id === id ? { ...source, ...updates } : source
          ),
          stacks: state.stacks.map(stack => ({
            ...stack,
            sources: stack.sources.map(source =>
              source.id === id ? { ...source, ...updates } : source
            ),
            updatedAt: new Date()
          }))
        }));
      },

      reindexSource: async (sourceId) => {
        const { knowledgeService, sources } = get();
        const source = sources.find(s => s.id === sourceId);
        
        if (!source || !knowledgeService) return;

        // Update status to indexing
        await get().updateSource(sourceId, { status: 'indexing' });

        try {
          const result = await knowledgeService.indexKnowledgeSource(source, source.stackId);
          
          await get().updateSource(sourceId, {
            status: result.success ? 'ready' : 'error',
            indexedAt: result.success ? new Date() : undefined,
            chunkCount: result.chunks,
            metadata: {
              ...source.metadata,
              indexingResult: result
            }
          });
          
          get().refreshStats();
        } catch (error) {
          console.error('Failed to reindex source:', error);
          await get().updateSource(sourceId, { status: 'error' });
        }
      },

      // RAG configuration
      setRAGEnabled: (enabled) => {
        set((state) => ({
          ragEnabled: enabled,
          ragOptions: { ...state.ragOptions, enableRAG: enabled }
        }));
      },

      updateRAGOptions: (options) => {
        set((state) => ({
          ragOptions: { ...state.ragOptions, ...options }
        }));
      },

      setActiveStacks: (stackIds) => {
        set((state) => ({
          activeStackIds: stackIds,
          ragOptions: { ...state.ragOptions, activeStackIds: stackIds }
        }));
      },

      // Query processing
      processQuery: async (query, conversationHistory) => {
        const { ragQueryService, ragOptions } = get();
        
        if (!ragQueryService) {
          throw new Error('RAG query service not initialized');
        }

        return await ragQueryService.processQuery(query, ragOptions, conversationHistory);
      },

      // Utility actions
      refreshStats: async () => {
        const { knowledgeService } = get();
        
        if (!knowledgeService) return;

        try {
          const stats = await knowledgeService.getKnowledgeStats();
          set({ stats });
        } catch (error) {
          console.error('Failed to refresh stats:', error);
        }
      },

      healthCheck: async () => {
        const { knowledgeService, ragQueryService } = get();
        
        if (!knowledgeService || !ragQueryService) {
          return { status: 'not_initialized' };
        }

        const [knowledgeHealth, ragHealth] = await Promise.all([
          knowledgeService.healthCheck(),
          ragQueryService.healthCheck()
        ]);

        return {
          status: 'initialized',
          knowledge: knowledgeHealth,
          rag: ragHealth
        };
      },

      exportKnowledge: async () => {
        const { stacks, sources } = get();
        
        const exportData = {
          stacks,
          sources,
          exportedAt: new Date(),
          version: '1.0'
        };

        return JSON.stringify(exportData, null, 2);
      },

      importKnowledge: async (data) => {
        try {
          const importData = JSON.parse(data);
          
          if (!importData.stacks || !importData.sources) {
            throw new Error('Invalid import data format');
          }

          set({
            stacks: importData.stacks,
            sources: importData.sources
          });

          // Refresh stats after import
          get().refreshStats();
        } catch (error) {
          console.error('Failed to import knowledge:', error);
          throw error;
        }
      }
    }),
    {
      name: 'knowledge-store',
      partialize: (state) => ({
        stacks: state.stacks,
        sources: state.sources,
        activeStackIds: state.activeStackIds,
        ragEnabled: state.ragEnabled,
        ragOptions: state.ragOptions
      })
    }
  )
);