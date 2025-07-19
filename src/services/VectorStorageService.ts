import type { EmbeddingVector } from './EmbeddingService';
import type { DocumentChunk } from './DocumentProcessingService';

export interface VectorSearchQuery {
  vector: number[];
  topK: number;
  threshold: number;
  filters?: {
    sourceId?: string;
    stackId?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface VectorSearchResult {
  id: string;
  content: string;
  sourceId: string;
  similarity: number;
  metadata: Record<string, any>;
  chunk?: DocumentChunk;
}

export interface VectorIndex {
  id: string;
  vectors: EmbeddingVector[];
  metadata: {
    dimensions: number;
    totalVectors: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

export class VectorStorageService {
  private storage: Map<string, EmbeddingVector> = new Map();
  private sourceIndex: Map<string, Set<string>> = new Map();
  private stackIndex: Map<string, Set<string>> = new Map();
  private dbName = 'vectorStorage';
  private dbVersion = 1;

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await this.loadFromIndexedDB();
    } catch (error) {
      console.error('Failed to initialize vector storage:', error);
    }
  }

  async storeVector(vector: EmbeddingVector, stackId?: string): Promise<void> {
    try {
      // Store in memory for fast access
      this.storage.set(vector.id, vector);
      
      // Update source index
      if (!this.sourceIndex.has(vector.metadata.sourceId)) {
        this.sourceIndex.set(vector.metadata.sourceId, new Set());
      }
      this.sourceIndex.get(vector.metadata.sourceId)!.add(vector.id);
      
      // Update stack index if provided
      if (stackId) {
        if (!this.stackIndex.has(stackId)) {
          this.stackIndex.set(stackId, new Set());
        }
        this.stackIndex.get(stackId)!.add(vector.id);
      }
      
      // Persist to IndexedDB
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to store vector:', error);
      throw error;
    }
  }

  async storeVectors(vectors: EmbeddingVector[], stackId?: string): Promise<void> {
    try {
      for (const vector of vectors) {
        // Store in memory
        this.storage.set(vector.id, vector);
        
        // Update source index
        if (!this.sourceIndex.has(vector.metadata.sourceId)) {
          this.sourceIndex.set(vector.metadata.sourceId, new Set());
        }
        this.sourceIndex.get(vector.metadata.sourceId)!.add(vector.id);
        
        // Update stack index if provided
        if (stackId) {
          if (!this.stackIndex.has(stackId)) {
            this.stackIndex.set(stackId, new Set());
          }
          this.stackIndex.get(stackId)!.add(vector.id);
        }
      }
      
      // Persist to IndexedDB
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to store vectors:', error);
      throw error;
    }
  }

  async searchVectors(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    try {
      let candidates: EmbeddingVector[] = [];
      
      // Apply filters to get candidate vectors
      if (query.filters?.sourceId) {
        const sourceVectorIds = this.sourceIndex.get(query.filters.sourceId);
        if (sourceVectorIds) {
          candidates = Array.from(sourceVectorIds)
            .map(id => this.storage.get(id))
            .filter(v => v !== undefined) as EmbeddingVector[];
        }
      } else if (query.filters?.stackId) {
        const stackVectorIds = this.stackIndex.get(query.filters.stackId);
        if (stackVectorIds) {
          candidates = Array.from(stackVectorIds)
            .map(id => this.storage.get(id))
            .filter(v => v !== undefined) as EmbeddingVector[];
        }
      } else {
        candidates = Array.from(this.storage.values());
      }
      
      // Apply date range filter if specified
      if (query.filters?.dateRange) {
        const { start, end } = query.filters.dateRange;
        candidates = candidates.filter(v => {
          const timestamp = v.metadata.timestamp;
          return timestamp >= start && timestamp <= end;
        });
      }
      
      // Calculate similarities
      const similarities = candidates.map(vector => ({
        id: vector.id,
        content: vector.metadata.content,
        sourceId: vector.metadata.sourceId,
        similarity: this.cosineSimilarity(query.vector, vector.vector),
        metadata: vector.metadata
      }));
      
      // Filter by threshold and sort by similarity
      return similarities
        .filter(result => result.similarity >= query.threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, query.topK);
    } catch (error) {
      console.error('Failed to search vectors:', error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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

  async getVectorsBySource(sourceId: string): Promise<EmbeddingVector[]> {
    const vectorIds = this.sourceIndex.get(sourceId);
    if (!vectorIds) return [];
    
    return Array.from(vectorIds)
      .map(id => this.storage.get(id))
      .filter(v => v !== undefined) as EmbeddingVector[];
  }

  async getVectorsByStack(stackId: string): Promise<EmbeddingVector[]> {
    const vectorIds = this.stackIndex.get(stackId);
    if (!vectorIds) return [];
    
    return Array.from(vectorIds)
      .map(id => this.storage.get(id))
      .filter(v => v !== undefined) as EmbeddingVector[];
  }

  async deleteVectorsBySource(sourceId: string): Promise<void> {
    try {
      const vectorIds = this.sourceIndex.get(sourceId);
      if (!vectorIds) return;
      
      // Remove from storage
      for (const vectorId of vectorIds) {
        this.storage.delete(vectorId);
      }
      
      // Remove from source index
      this.sourceIndex.delete(sourceId);
      
      // Remove from stack indexes
      for (const [stackId, stackVectorIds] of this.stackIndex) {
        for (const vectorId of vectorIds) {
          stackVectorIds.delete(vectorId);
        }
        if (stackVectorIds.size === 0) {
          this.stackIndex.delete(stackId);
        }
      }
      
      // Persist changes
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  async deleteVectorsByStack(stackId: string): Promise<void> {
    try {
      const vectorIds = this.stackIndex.get(stackId);
      if (!vectorIds) return;
      
      // Remove from storage
      for (const vectorId of vectorIds) {
        this.storage.delete(vectorId);
        
        // Remove from source indexes
        for (const [sourceId, sourceVectorIds] of this.sourceIndex) {
          sourceVectorIds.delete(vectorId);
          if (sourceVectorIds.size === 0) {
            this.sourceIndex.delete(sourceId);
          }
        }
      }
      
      // Remove from stack index
      this.stackIndex.delete(stackId);
      
      // Persist changes
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<{
    totalVectors: number;
    totalSources: number;
    totalStacks: number;
    memoryUsage: number;
  }> {
    const totalVectors = this.storage.size;
    const totalSources = this.sourceIndex.size;
    const totalStacks = this.stackIndex.size;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const vector of this.storage.values()) {
      memoryUsage += vector.vector.length * 8; // 8 bytes per float64
      memoryUsage += JSON.stringify(vector.metadata).length * 2; // 2 bytes per char
    }
    
    return {
      totalVectors,
      totalSources,
      totalStacks,
      memoryUsage
    };
  }

  private async saveToIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['vectors'], 'readwrite');
        const store = transaction.objectStore('vectors');
        
        // Clear existing data
        store.clear();
        
        // Store all vectors
        for (const vector of this.storage.values()) {
          store.add(vector);
        }
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore('vectors', { keyPath: 'id' });
        store.createIndex('sourceId', 'metadata.sourceId', { unique: false });
        store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
      };
    });
  }

  private async loadFromIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['vectors'], 'readonly');
        const store = transaction.objectStore('vectors');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const vectors = getAllRequest.result as EmbeddingVector[];
          
          // Rebuild indexes
          this.storage.clear();
          this.sourceIndex.clear();
          this.stackIndex.clear();
          
          for (const vector of vectors) {
            this.storage.set(vector.id, vector);
            
            // Rebuild source index
            if (!this.sourceIndex.has(vector.metadata.sourceId)) {
              this.sourceIndex.set(vector.metadata.sourceId, new Set());
            }
            this.sourceIndex.get(vector.metadata.sourceId)!.add(vector.id);
          }
          
          db.close();
          resolve();
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore('vectors', { keyPath: 'id' });
        store.createIndex('sourceId', 'metadata.sourceId', { unique: false });
        store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
      };
    });
  }

  async clearAll(): Promise<void> {
    try {
      this.storage.clear();
      this.sourceIndex.clear();
      this.stackIndex.clear();
      await this.saveToIndexedDB();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }
}