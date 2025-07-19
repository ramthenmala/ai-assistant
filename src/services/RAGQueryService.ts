import type { Message, AppSettings } from '@/types';
import { KnowledgeService } from './KnowledgeService';
import type { RAGContext, KnowledgeSearchResult } from './KnowledgeService';

export interface RAGQueryOptions {
  enableRAG: boolean;
  activeStackIds: string[];
  relevanceThreshold: number;
  maxResults: number;
  maxContextLength: number;
  includeSourceCitations: boolean;
  contextWeight: number; // 0-1, how much to weight context vs original prompt
}

export interface RAGQueryResult {
  enhancedPrompt: string;
  context: RAGContext;
  sources: KnowledgeSearchResult[];
  ragUsed: boolean;
  processingTime: number;
}

export interface SourceCitation {
  sourceId: string;
  sourceName: string;
  relevance: number;
  excerpt: string;
}

export class RAGQueryService {
  private knowledgeService: KnowledgeService;
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.knowledgeService = new KnowledgeService(settings);
  }

  async processQuery(
    query: string,
    options: RAGQueryOptions,
    conversationHistory?: Message[]
  ): Promise<RAGQueryResult> {
    const startTime = Date.now();

    try {
      // If RAG is disabled, return original query
      if (!options.enableRAG || options.activeStackIds.length === 0) {
        return {
          enhancedPrompt: query,
          context: {
            query,
            results: [],
            totalSources: 0,
            searchTime: 0,
            relevanceThreshold: options.relevanceThreshold
          },
          sources: [],
          ragUsed: false,
          processingTime: Date.now() - startTime
        };
      }

      // Enhance query with conversation context if provided
      const enhancedQuery = this.enhanceQueryWithContext(query, conversationHistory);

      // Search knowledge base
      const context = await this.knowledgeService.searchKnowledge(
        enhancedQuery,
        options.activeStackIds,
        {
          topK: options.maxResults,
          threshold: options.relevanceThreshold,
          maxCharsPerResult: Math.floor(options.maxContextLength / options.maxResults)
        }
      );

      // Build enhanced prompt if we have relevant results
      let enhancedPrompt = query;
      let ragUsed = false;

      if (context.results.length > 0) {
        enhancedPrompt = await this.knowledgeService.buildRAGPrompt(
          query,
          context,
          {
            includeSourceInfo: options.includeSourceCitations,
            maxContextLength: options.maxContextLength,
            systemPrompt: this.buildSystemPrompt(options)
          }
        );
        ragUsed = true;
      }

      const processingTime = Date.now() - startTime;

      return {
        enhancedPrompt,
        context,
        sources: context.results,
        ragUsed,
        processingTime
      };
    } catch (error) {
      console.error('RAG query processing error:', error);
      
      // Return fallback result
      return {
        enhancedPrompt: query,
        context: {
          query,
          results: [],
          totalSources: 0,
          searchTime: 0,
          relevanceThreshold: options.relevanceThreshold
        },
        sources: [],
        ragUsed: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  private enhanceQueryWithContext(query: string, conversationHistory?: Message[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return query;
    }

    // Get the last few messages for context
    const recentMessages = conversationHistory.slice(-3);
    const contextMessages = recentMessages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Combine context with current query
    return `Previous conversation context:\n${contextMessages}\n\nCurrent question: ${query}`;
  }

  private buildSystemPrompt(options: RAGQueryOptions): string {
    const basePrompt = `You are a helpful AI assistant with access to a knowledge base. Use the provided context to answer questions accurately and helpfully.`;

    const guidelines = [
      'Base your answers primarily on the provided context',
      'If the context doesn\'t contain relevant information, clearly state this',
      'Provide accurate information and avoid speculation',
      'Be concise but comprehensive in your responses'
    ];

    if (options.includeSourceCitations) {
      guidelines.push('When possible, reference the sources you used in your answer');
    }

    return `${basePrompt}\n\nGuidelines:\n${guidelines.map(g => `- ${g}`).join('\n')}`;
  }

  async extractSourceCitations(
    response: string,
    sources: KnowledgeSearchResult[]
  ): Promise<SourceCitation[]> {
    const citations: SourceCitation[] = [];

    for (const source of sources) {
      // Simple citation extraction - check if source content appears in response
      const sourceWords = source.content.toLowerCase().split(/\s+/);
      const responseWords = response.toLowerCase().split(/\s+/);

      let matchCount = 0;
      for (const word of sourceWords) {
        if (word.length > 3 && responseWords.includes(word)) {
          matchCount++;
        }
      }

      // If significant overlap, consider it a citation
      const relevance = matchCount / Math.max(sourceWords.length, 1);
      if (relevance > 0.1) {
        citations.push({
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          relevance,
          excerpt: source.context
        });
      }
    }

    return citations.sort((a, b) => b.relevance - a.relevance);
  }

  async getRelevantSources(
    query: string,
    stackIds: string[],
    options: {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<KnowledgeSearchResult[]> {
    const context = await this.knowledgeService.searchKnowledge(
      query,
      stackIds,
      {
        topK: options.topK || 5,
        threshold: options.threshold || 0.7
      }
    );

    return context.results;
  }

  async indexNewSource(
    source: { id: string; type: 'file' | 'url'; path: string; name: string },
    stackId: string,
    file?: File
  ): Promise<boolean> {
    try {
      const knowledgeSource = {
        id: source.id,
        name: source.name,
        type: source.type,
        path: source.path,
        stackId,
        status: 'indexing' as const,
        size: file?.size || 0,
        metadata: {
          addedAt: new Date(),
          fileType: file?.type || 'text/plain'
        }
      };

      const result = await this.knowledgeService.indexKnowledgeSource(
        knowledgeSource,
        stackId,
        file
      );

      return result.success;
    } catch (error) {
      console.error('Failed to index new source:', error);
      return false;
    }
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    this.settings = settings;
    await this.knowledgeService.updateSettings(settings);
  }

  async getKnowledgeStats(): Promise<{
    totalVectors: number;
    totalSources: number;
    totalStacks: number;
    memoryUsage: number;
    isConfigured: boolean;
  }> {
    return await this.knowledgeService.getKnowledgeStats();
  }

  async healthCheck(): Promise<{
    ragService: boolean;
    knowledgeService: boolean;
    apiConfiguration: boolean;
  }> {
    const knowledgeHealth = await this.knowledgeService.healthCheck();
    
    return {
      ragService: true,
      knowledgeService: knowledgeHealth.embeddingService && knowledgeHealth.vectorStorage,
      apiConfiguration: knowledgeHealth.apiKey
    };
  }

  // Utility method to determine if RAG should be used for a query
  shouldUseRAG(
    query: string,
    activeStackIds: string[],
    minQueryLength: number = 10
  ): boolean {
    // Don't use RAG for very short queries
    if (query.length < minQueryLength) {
      return false;
    }

    // Don't use RAG if no knowledge stacks are active
    if (activeStackIds.length === 0) {
      return false;
    }

    // Don't use RAG for certain types of queries
    const excludePatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
      /^(thanks|thank you|ok|okay|yes|no)$/i,
      /^(what time|what date|current time|current date)/i
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(query.trim())) {
        return false;
      }
    }

    return true;
  }

  // Generate a summary of RAG usage for analytics
  generateRAGSummary(results: RAGQueryResult[]): {
    totalQueries: number;
    ragUsageRate: number;
    averageProcessingTime: number;
    averageSourcesUsed: number;
    topSources: Array<{ sourceId: string; usageCount: number }>;
  } {
    const totalQueries = results.length;
    const ragUsedCount = results.filter(r => r.ragUsed).length;
    const ragUsageRate = totalQueries > 0 ? ragUsedCount / totalQueries : 0;

    const processingTimes = results.map(r => r.processingTime);
    const averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

    const sourcesUsed = results.flatMap(r => r.sources);
    const averageSourcesUsed = sourcesUsed.length / Math.max(ragUsedCount, 1);

    // Count source usage
    const sourceUsage = new Map<string, number>();
    for (const source of sourcesUsed) {
      sourceUsage.set(source.sourceId, (sourceUsage.get(source.sourceId) || 0) + 1);
    }

    const topSources = Array.from(sourceUsage.entries())
      .map(([sourceId, usageCount]) => ({ sourceId, usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    return {
      totalQueries,
      ragUsageRate,
      averageProcessingTime,
      averageSourcesUsed,
      topSources
    };
  }
}