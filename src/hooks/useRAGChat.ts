import { useState, useCallback, useEffect } from 'react';
import type { Message, AIModel, AppSettings } from '@/types';
import { RAGChatService } from '@/services/RAGChatService';
import type { RAGChatResult } from '@/services/RAGChatService';
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export interface RAGChatState {
  isProcessing: boolean;
  lastRAGResult: RAGChatResult | null;
  ragEnabled: boolean;
  activeStackIds: string[];
  error: string | null;
}

export interface RAGChatActions {
  sendMessage: (message: string, conversationHistory: Message[], model: AIModel) => Promise<RAGChatResult>;
  toggleRAG: (enabled: boolean) => void;
  setActiveStacks: (stackIds: string[]) => void;
  clearError: () => void;
  getRelevantSources: (query: string) => Promise<Array<{
    sourceId: string;
    sourceName: string;
    relevance: number;
    excerpt: string;
  }>>;
}

export function useRAGChat(): RAGChatState & RAGChatActions {
  const [state, setState] = useState<RAGChatState>({
    isProcessing: false,
    lastRAGResult: null,
    ragEnabled: false,
    activeStackIds: [],
    error: null
  });

  const [ragChatService, setRAGChatService] = useState<RAGChatService | null>(null);

  // Get state from knowledge store
  const {
    ragEnabled: storeRAGEnabled,
    activeStackIds: storeActiveStackIds,
    ragOptions,
    stats
  } = useKnowledgeStore();

  // Get settings
  const settings = useSettingsStore(state => state.settings);

  // Initialize RAG chat service
  useEffect(() => {
    if (settings) {
      const service = new RAGChatService(settings);
      setRAGChatService(service);
    }
  }, [settings]);

  // Sync with knowledge store
  useEffect(() => {
    setState(prev => ({
      ...prev,
      ragEnabled: storeRAGEnabled && stats.isConfigured,
      activeStackIds: storeActiveStackIds
    }));
  }, [storeRAGEnabled, storeActiveStackIds, stats.isConfigured]);

  // Send message with RAG processing
  const sendMessage = useCallback(async (
    message: string,
    conversationHistory: Message[],
    model: AIModel
  ): Promise<RAGChatResult> => {
    if (!ragChatService || !settings) {
      throw new Error('RAG chat service not initialized');
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const result = await ragChatService.processMessage(
        message,
        conversationHistory,
        {
          enableRAG: state.ragEnabled,
          activeStackIds: state.activeStackIds,
          model,
          settings
        }
      );

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastRAGResult: result,
        error: result.error || null
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [ragChatService, settings, state.ragEnabled, state.activeStackIds]);

  // Toggle RAG enabled state
  const toggleRAG = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, ragEnabled: enabled }));
  }, []);

  // Set active stack IDs
  const setActiveStacks = useCallback((stackIds: string[]) => {
    setState(prev => ({ ...prev, activeStackIds: stackIds }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get relevant sources for a query
  const getRelevantSources = useCallback(async (query: string) => {
    if (!ragChatService) {
      throw new Error('RAG chat service not initialized');
    }

    return await ragChatService.getRelevantSources(
      query,
      state.activeStackIds,
      {
        topK: ragOptions.maxResults,
        threshold: ragOptions.relevanceThreshold
      }
    );
  }, [ragChatService, state.activeStackIds, ragOptions]);

  return {
    ...state,
    sendMessage,
    toggleRAG,
    setActiveStacks,
    clearError,
    getRelevantSources
  };
}