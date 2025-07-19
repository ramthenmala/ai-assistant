import type { KnowledgeSource } from '@/types';

export interface DocumentChunk {
  id: string;
  content: string;
  sourceId: string;
  chunkIndex: number;
  startIndex: number;
  endIndex: number;
  metadata: {
    fileName: string;
    fileType: string;
    size: number;
    chunkSize: number;
    overlap: number;
    timestamp: Date;
  };
}

export interface ChunkingOptions {
  maxChunkSize: number;
  overlap: number;
  preserveStructure: boolean;
  splitOnSentences: boolean;
}

export interface ProcessingResult {
  chunks: DocumentChunk[];
  totalChunks: number;
  totalTokens: number;
  processingTime: number;
}

export class DocumentProcessingService {
  private defaultChunkingOptions: ChunkingOptions = {
    maxChunkSize: 1000,
    overlap: 200,
    preserveStructure: true,
    splitOnSentences: true
  };

  async processDocument(
    file: File,
    sourceId: string,
    options: Partial<ChunkingOptions> = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const chunkingOptions = { ...this.defaultChunkingOptions, ...options };

    try {
      // Extract text content from file
      const content = await this.extractTextFromFile(file);
      
      // Create chunks
      const chunks = this.createChunks(content, sourceId, file.name, chunkingOptions);
      
      const processingTime = Date.now() - startTime;
      
      return {
        chunks,
        totalChunks: chunks.length,
        totalTokens: this.estimateTokens(content),
        processingTime
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type || this.getFileTypeFromName(file.name);

    switch (fileType) {
      case 'text/plain':
      case 'text/markdown':
      case 'application/json':
        return await this.extractTextFile(file);
      
      case 'application/pdf':
        return await this.extractPdfText(file);
      
      case 'text/html':
        return await this.extractHtmlText(file);
      
      default:
        // Try to read as text for unknown types
        return await this.extractTextFile(file);
    }
  }

  private async extractTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        resolve(text || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private async extractPdfText(file: File): Promise<string> {
    // For now, we'll throw an error for PDFs
    // In a real implementation, you'd use a library like pdf-parse or pdf2pic
    throw new Error('PDF processing not implemented yet. Please use text files.');
  }

  private async extractHtmlText(file: File): Promise<string> {
    const htmlContent = await this.extractTextFile(file);
    // Simple HTML text extraction (remove tags)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  private getFileTypeFromName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'txt':
        return 'text/plain';
      case 'md':
      case 'markdown':
        return 'text/markdown';
      case 'json':
        return 'application/json';
      case 'html':
      case 'htm':
        return 'text/html';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'text/plain';
    }
  }

  private createChunks(
    content: string,
    sourceId: string,
    fileName: string,
    options: ChunkingOptions
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { maxChunkSize, overlap, splitOnSentences } = options;

    if (content.length <= maxChunkSize) {
      // Content fits in a single chunk
      chunks.push(this.createChunk(content, sourceId, fileName, 0, 0, content.length));
      return chunks;
    }

    let currentIndex = 0;
    let chunkIndex = 0;

    while (currentIndex < content.length) {
      const endIndex = Math.min(currentIndex + maxChunkSize, content.length);
      let chunkEnd = endIndex;

      // If we're not at the end and we want to split on sentences
      if (endIndex < content.length && splitOnSentences) {
        // Find the last sentence boundary within the chunk
        const sentenceEnd = this.findLastSentenceBoundary(content, currentIndex, endIndex);
        if (sentenceEnd > currentIndex) {
          chunkEnd = sentenceEnd;
        }
      }

      const chunkContent = content.substring(currentIndex, chunkEnd);
      chunks.push(this.createChunk(chunkContent, sourceId, fileName, chunkIndex, currentIndex, chunkEnd));

      // Move to next chunk with overlap
      currentIndex = chunkEnd - overlap;
      if (currentIndex < 0) currentIndex = 0;
      
      chunkIndex++;
      
      // Prevent infinite loops
      if (currentIndex >= chunkEnd) break;
    }

    return chunks;
  }

  private findLastSentenceBoundary(text: string, start: number, end: number): number {
    const chunk = text.substring(start, end);
    const sentenceEnders = ['.', '!', '?', '\n\n'];
    
    let lastBoundary = -1;
    
    for (const ender of sentenceEnders) {
      const pos = chunk.lastIndexOf(ender);
      if (pos > lastBoundary) {
        lastBoundary = pos;
      }
    }
    
    if (lastBoundary === -1) {
      // No sentence boundary found, try word boundary
      const words = chunk.split(/\s+/);
      if (words.length > 1) {
        const lastWord = words[words.length - 1];
        return end - lastWord.length;
      }
    }
    
    return lastBoundary === -1 ? end : start + lastBoundary + 1;
  }

  private createChunk(
    content: string,
    sourceId: string,
    fileName: string,
    chunkIndex: number,
    startIndex: number,
    endIndex: number
  ): DocumentChunk {
    return {
      id: `${sourceId}_chunk_${chunkIndex}`,
      content: content.trim(),
      sourceId,
      chunkIndex,
      startIndex,
      endIndex,
      metadata: {
        fileName,
        fileType: this.getFileTypeFromName(fileName),
        size: content.length,
        chunkSize: this.defaultChunkingOptions.maxChunkSize,
        overlap: this.defaultChunkingOptions.overlap,
        timestamp: new Date()
      }
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // Process URL content
  async processUrl(url: string, sourceId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }
      
      const content = await response.text();
      const contentType = response.headers.get('content-type') || 'text/plain';
      
      // If it's HTML, extract text content
      let processedContent = content;
      if (contentType.includes('text/html')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        processedContent = tempDiv.textContent || tempDiv.innerText || '';
      }
      
      const chunks = this.createChunks(processedContent, sourceId, url, this.defaultChunkingOptions);
      
      const processingTime = Date.now() - startTime;
      
      return {
        chunks,
        totalChunks: chunks.length,
        totalTokens: this.estimateTokens(processedContent),
        processingTime
      };
    } catch (error) {
      console.error('URL processing error:', error);
      throw new Error(`Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get supported file types
  getSupportedFileTypes(): string[] {
    return [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/html',
      // 'application/pdf' // Commented out until implemented
    ];
  }

  // Validate file type
  isFileTypeSupported(file: File): boolean {
    const fileType = file.type || this.getFileTypeFromName(file.name);
    return this.getSupportedFileTypes().includes(fileType);
  }
}