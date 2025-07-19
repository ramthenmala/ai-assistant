import type { Message, AIModel, AppSettings } from '@/types';
import { RAGQueryService } from './RAGQueryService';
import type { RAGQueryResult } from './RAGQueryService';

export interface RAGChatOptions {
  enableRAG: boolean;
  activeStackIds: string[];
  model: AIModel;
  settings: AppSettings;
}

export interface RAGChatResult {
  message: Message;
  ragContext?: {
    query: string;
    sourcesUsed: Array<{
      sourceId: string;
      sourceName: string;
      relevance: number;
      excerpt: string;
    }>;
    processingTime: number;
  };
  error?: string;
}

export class RAGChatService {
  private ragQueryService: RAGQueryService;

  constructor(settings: AppSettings) {
    this.ragQueryService = new RAGQueryService(settings);
  }

  async processMessage(
    userMessage: string,
    conversationHistory: Message[],
    options: RAGChatOptions
  ): Promise<RAGChatResult> {
    const startTime = Date.now();

    try {
      // Process the query through RAG if enabled
      let ragResult: RAGQueryResult;
      
      if (options.enableRAG && options.activeStackIds.length > 0) {
        // Use RAG query service to enhance the prompt
        ragResult = await this.ragQueryService.processQuery(
          userMessage,
          {
            enableRAG: true,
            activeStackIds: options.activeStackIds,
            relevanceThreshold: 0.7,
            maxResults: 5,
            maxContextLength: 2000,
            includeSourceCitations: true,
            contextWeight: 0.8
          },
          conversationHistory
        );
      } else {
        // Use original query without RAG
        ragResult = {
          enhancedPrompt: userMessage,
          context: {
            query: userMessage,
            results: [],
            totalSources: 0,
            searchTime: 0,
            relevanceThreshold: 0.7
          },
          sources: [],
          ragUsed: false,
          processingTime: 0
        };
      }

      // Return the enhanced prompt for the existing chat system to use
      // The actual model response generation will be handled by the existing chat flow
      const response = {
        content: ragResult.enhancedPrompt, // This will be sent to the model by the existing system
        tokensUsed: 0
      };

      // Create the assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        isEdited: false,
        metadata: {
          model: options.model.id,
          ragUsed: ragResult.ragUsed,
          processingTime: Date.now() - startTime,
          tokensUsed: response.tokensUsed,
          ...(ragResult.ragUsed && {
            ragSources: ragResult.sources.map(source => ({
              sourceId: source.sourceId,
              sourceName: source.sourceName,
              relevance: source.similarity,
              excerpt: source.context
            }))
          })
        }
      };

      // Build RAG context for the result
      const ragContext = ragResult.ragUsed ? {
        query: ragResult.context.query,
        sourcesUsed: ragResult.sources.map(source => ({
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          relevance: source.similarity,
          excerpt: source.context
        })),
        processingTime: ragResult.processingTime
      } : undefined;

      return {
        message: assistantMessage,
        ragContext
      };
    } catch (error) {
      console.error('RAG chat processing error:', error);
      
      // Return error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        isEdited: false,
        metadata: {
          model: options.model.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - startTime
        }
      };

      return {
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    await this.ragQueryService.updateSettings(settings);
  }

  async healthCheck(): Promise<{
    ragService: boolean;
    modelService: boolean;
    apiConfiguration: boolean;
  }> {
    const ragHealth = await this.ragQueryService.healthCheck();
    
    return {
      ragService: ragHealth.ragService,
      modelService: true, // Model service is handled separately
      apiConfiguration: ragHealth.apiConfiguration
    };
  }

  // Helper method to format response with citations
  formatResponseWithCitations(
    response: string,
    sources: Array<{
      sourceId: string;
      sourceName: string;
      relevance: number;
      excerpt: string;
    }>
  ): string {
    if (sources.length === 0) {
      return response;
    }

    const citationsText = sources
      .map((source, index) => 
        `[${index + 1}] ${source.sourceName} (${Math.round(source.relevance * 100)}% relevance)`
      )
      .join('\n');

    return `${response}\n\n**Sources:**\n${citationsText}`;
  }

  // Helper method to extract key insights from RAG context
  extractKeyInsights(ragContext: {
    query: string;
    sourcesUsed: Array<{
      sourceId: string;
      sourceName: string;
      relevance: number;
      excerpt: string;
    }>;
    processingTime: number;
  }): {
    topSource: string;
    averageRelevance: number;
    totalSources: number;
    processingTime: number;
  } {
    const { sourcesUsed, processingTime } = ragContext;
    
    const topSource = sourcesUsed.length > 0 
      ? sourcesUsed.reduce((prev, current) => 
          prev.relevance > current.relevance ? prev : current
        ).sourceName
      : 'None';

    const averageRelevance = sourcesUsed.length > 0
      ? sourcesUsed.reduce((sum, source) => sum + source.relevance, 0) / sourcesUsed.length
      : 0;

    return {
      topSource,
      averageRelevance,
      totalSources: sourcesUsed.length,
      processingTime
    };
  }

  // Method to determine if RAG should be used for a query
  shouldUseRAG(
    query: string,
    activeStackIds: string[],
    conversationHistory: Message[]
  ): boolean {
    // Use the RAG query service's logic
    return this.ragQueryService.shouldUseRAG(query, activeStackIds);
  }

  // Method to get relevant sources for a query without generating a response
  async getRelevantSources(
    query: string,
    activeStackIds: string[],
    options: {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<Array<{
    sourceId: string;
    sourceName: string;
    relevance: number;
    excerpt: string;
  }>> {
    const sources = await this.ragQueryService.getRelevantSources(
      query,
      activeStackIds,
      options
    );

    return sources.map(source => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      relevance: source.similarity,
      excerpt: source.context
    }));
  }
}