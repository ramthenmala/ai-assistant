import type { AppSettings } from '@/types';

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: {
    content: string;
    sourceId: string;
    chunkIndex: number;
    timestamp: Date;
  };
}

export interface EmbeddingRequest {
  text: string;
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
}

export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface SimilaritySearchResult {
  id: string;
  content: string;
  sourceId: string;
  similarity: number;
  metadata: Record<string, any>;
}

export class EmbeddingService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(settings: AppSettings) {
    this.apiKey = settings.apiKeys.openai || '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'text-embedding-3-small'; // Default model
  }

  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: request.text,
        model: request.model || this.model,
        encoding_format: 'float'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const embedding = data.data[0];

    return {
      embedding: embedding.embedding,
      tokens: data.usage.total_tokens,
      model: data.model
    };
  }

  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Split into batches to avoid API limits
    const batchSize = 100;
    const results: EmbeddingResponse[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: batch,
          model: this.model,
          encoding_format: 'float'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      for (const embedding of data.data) {
        results.push({
          embedding: embedding.embedding,
          tokens: data.usage.total_tokens / data.data.length, // Approximate
          model: data.model
        });
      }
    }

    return results;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findSimilarEmbeddings(
    queryEmbedding: number[],
    embeddings: EmbeddingVector[],
    topK: number = 10,
    threshold: number = 0.7
  ): Promise<SimilaritySearchResult[]> {
    const similarities = embeddings.map(item => ({
      id: item.id,
      content: item.metadata.content,
      sourceId: item.metadata.sourceId,
      similarity: this.cosineSimilarity(queryEmbedding, item.vector),
      metadata: item.metadata
    }));

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async searchSimilarContent(
    query: string,
    embeddings: EmbeddingVector[],
    topK: number = 10,
    threshold: number = 0.7
  ): Promise<SimilaritySearchResult[]> {
    const queryEmbedding = await this.generateEmbedding({ text: query });
    return this.findSimilarEmbeddings(queryEmbedding.embedding, embeddings, topK, threshold);
  }

  // Utility method to check if service is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Update API key
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  // Update model
  updateModel(model: string): void {
    this.model = model;
  }
}