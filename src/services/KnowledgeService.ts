import type { KnowledgeSource, KnowledgeStack, AppSettings } from '@/types';
import { EmbeddingService } from './EmbeddingService';
import type { EmbeddingVector } from './EmbeddingService';
import { DocumentProcessingService } from './DocumentProcessingService';
import type { DocumentChunk } from './DocumentProcessingService';
import { VectorStorageService } from './VectorStorageService';
import type { VectorSearchQuery, VectorSearchResult } from './VectorStorageService';

export interface KnowledgeIndexingResult {
  sourceId: string;
  success: boolean;
  chunks: number;
  vectors: number;
  processingTime: number;
  error?: string;
}

export interface KnowledgeSearchResult {
  content: string;
  sourceId: string;
  sourceName: string;
  similarity: number;
  chunkIndex: number;
  context: string;
}

export interface RAGContext {
  query: string;
  results: KnowledgeSearchResult[];
  totalSources: number;
  searchTime: number;
  relevanceThreshold: number;
}

export class KnowledgeService {
  private embeddingService: EmbeddingService;
  private documentProcessingService: DocumentProcessingService;
  private vectorStorageService: VectorStorageService;
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.embeddingService = new EmbeddingService(settings);
    this.documentProcessingService = new DocumentProcessingService();
    this.vectorStorageService = new VectorStorageService();
  }

  async indexKnowledgeSource(
    source: KnowledgeSource,
    stackId: string,
    file?: File
  ): Promise<KnowledgeIndexingResult> {
    const startTime = Date.now();
    
    try {
      let processingResult;
      
      // Process document based on type
      if (source.type === 'file' && file) {
        processingResult = await this.documentProcessingService.processDocument(
          file,
          source.id
        );
      } else if (source.type === 'url') {
        processingResult = await this.documentProcessingService.processUrl(
          source.path,
          source.id
        );
      } else {
        throw new Error(`Unsupported source type: ${source.type}`);
      }

      // Generate embeddings for chunks
      const texts = processingResult.chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(texts);

      // Create embedding vectors
      const vectors: EmbeddingVector[] = processingResult.chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: embeddings[index].embedding,
        metadata: {
          content: chunk.content,
          sourceId: source.id,
          chunkIndex: chunk.chunkIndex,
          timestamp: new Date()
        }
      }));

      // Store vectors
      await this.vectorStorageService.storeVectors(vectors, stackId);

      const processingTime = Date.now() - startTime;

      return {
        sourceId: source.id,
        success: true,
        chunks: processingResult.chunks.length,
        vectors: vectors.length,
        processingTime,
      };
    } catch (error) {
      console.error('Knowledge indexing error:', error);
      return {
        sourceId: source.id,
        success: false,
        chunks: 0,
        vectors: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async searchKnowledge(
    query: string,
    stackIds?: string[],
    options: {
      topK?: number;
      threshold?: number;
      maxCharsPerResult?: number;
    } = {}
  ): Promise<RAGContext> {
    const startTime = Date.now();
    const { topK = 5, threshold = 0.7, maxCharsPerResult = 500 } = options;

    try {
      // Generate embedding for query
      const queryEmbedding = await this.embeddingService.generateEmbedding({ text: query });

      // Prepare search query
      const searchQuery: VectorSearchQuery = {
        vector: queryEmbedding.embedding,
        topK: topK * 2, // Get more results to filter and rank
        threshold,
        filters: stackIds ? { stackId: stackIds[0] } : undefined // TODO: Support multiple stacks
      };

      // Search vectors
      const searchResults = await this.vectorStorageService.searchVectors(searchQuery);

      // Convert to knowledge search results
      const knowledgeResults: KnowledgeSearchResult[] = searchResults
        .slice(0, topK)
        .map(result => ({
          content: this.truncateContent(result.content, maxCharsPerResult),
          sourceId: result.sourceId,
          sourceName: result.metadata.fileName || result.sourceId,
          similarity: result.similarity,
          chunkIndex: result.metadata.chunkIndex,
          context: this.extractContext(result.content, query)
        }));

      const searchTime = Date.now() - startTime;

      return {
        query,
        results: knowledgeResults,
        totalSources: new Set(searchResults.map(r => r.sourceId)).size,
        searchTime,
        relevanceThreshold: threshold
      };
    } catch (error) {
      console.error('Knowledge search error:', error);
      return {
        query,
        results: [],
        totalSources: 0,
        searchTime: Date.now() - startTime,
        relevanceThreshold: threshold
      };
    }
  }

  private truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    
    // Try to truncate at word boundary
    const truncated = content.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxChars * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  private extractContext(content: string, query: string): string {
    // Simple context extraction - find the most relevant sentence
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let bestSentence = '';
    let bestScore = 0;
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const score = queryWords.reduce((acc, word) => {
        return acc + (sentenceLower.includes(word) ? 1 : 0);
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    }
    
    return bestSentence || sentences[0]?.trim() || content.substring(0, 100);
  }

  async buildRAGPrompt(
    originalPrompt: string,
    context: RAGContext,
    options: {
      includeSourceInfo?: boolean;
      maxContextLength?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const { includeSourceInfo = true, maxContextLength = 2000, systemPrompt } = options;

    if (context.results.length === 0) {
      return originalPrompt;
    }

    // Build context from search results
    let contextText = '';
    let currentLength = 0;
    
    for (const result of context.results) {
      const sourceInfo = includeSourceInfo 
        ? `[Source: ${result.sourceName}, Relevance: ${(result.similarity * 100).toFixed(1)}%]\n`
        : '';
      
      const resultText = `${sourceInfo}${result.content}\n\n`;
      
      if (currentLength + resultText.length > maxContextLength) {
        break;
      }
      
      contextText += resultText;
      currentLength += resultText.length;
    }

    // Build the enhanced prompt
    const enhancedPrompt = `${systemPrompt || 'You are a helpful assistant. Use the following context to answer questions accurately and cite sources when possible.'}

Context from knowledge base:
${contextText}

User question: ${originalPrompt}

Please answer based on the provided context. If the context doesn't contain relevant information, say so clearly.`;

    return enhancedPrompt;
  }

  async removeKnowledgeSource(sourceId: string): Promise<void> {
    try {
      await this.vectorStorageService.deleteVectorsBySource(sourceId);
    } catch (error) {
      console.error('Failed to remove knowledge source:', error);
      throw error;
    }
  }

  async removeKnowledgeStack(stackId: string): Promise<void> {
    try {
      await this.vectorStorageService.deleteVectorsByStack(stackId);
    } catch (error) {
      console.error('Failed to remove knowledge stack:', error);
      throw error;
    }
  }

  async getKnowledgeStats(): Promise<{
    totalVectors: number;
    totalSources: number;
    totalStacks: number;
    memoryUsage: number;
    isConfigured: boolean;
  }> {
    const storageStats = await this.vectorStorageService.getStorageStats();
    
    return {
      ...storageStats,
      isConfigured: this.embeddingService.isConfigured()
    };
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    this.settings = settings;
    this.embeddingService.updateApiKey(settings.apiKeys.openai || '');
  }

  // Batch processing for multiple sources
  async indexMultipleSources(
    sources: Array<{ source: KnowledgeSource; file?: File }>,
    stackId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<KnowledgeIndexingResult[]> {
    const results: KnowledgeIndexingResult[] = [];
    
    for (let i = 0; i < sources.length; i++) {
      const { source, file } = sources[i];
      
      try {
        const result = await this.indexKnowledgeSource(source, stackId, file);
        results.push(result);
        
        if (onProgress) {
          onProgress(i + 1, sources.length);
        }
      } catch (error) {
        console.error(`Failed to index source ${source.id}:`, error);
        results.push({
          sourceId: source.id,
          success: false,
          chunks: 0,
          vectors: 0,
          processingTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Health check
  async healthCheck(): Promise<{
    embeddingService: boolean;
    vectorStorage: boolean;
    documentProcessing: boolean;
    apiKey: boolean;
  }> {
    const embeddingService = this.embeddingService.isConfigured();
    const apiKey = !!this.settings.apiKeys.openai;
    
    // Test vector storage
    let vectorStorage = false;
    try {
      await this.vectorStorageService.getStorageStats();
      vectorStorage = true;
    } catch (error) {
      console.error('Vector storage health check failed:', error);
    }
    
    // Test document processing
    let documentProcessing = false;
    try {
      const supportedTypes = this.documentProcessingService.getSupportedFileTypes();
      documentProcessing = supportedTypes.length > 0;
    } catch (error) {
      console.error('Document processing health check failed:', error);
    }
    
    return {
      embeddingService,
      vectorStorage,
      documentProcessing,
      apiKey
    };
  }
}