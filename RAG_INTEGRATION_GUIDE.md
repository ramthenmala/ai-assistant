# RAG Integration Guide

## Overview

This guide explains how to integrate and use the new RAG (Retrieval-Augmented Generation) system in the AI Chat Assistant. The RAG system enhances chat responses by retrieving relevant information from your knowledge base.

## Architecture

### Core Services

1. **EmbeddingService** (`src/services/EmbeddingService.ts`)
   - Generates embeddings using OpenAI's text-embedding-3-small model
   - Supports batch processing for efficient indexing
   - Provides cosine similarity calculations for vector search

2. **DocumentProcessingService** (`src/services/DocumentProcessingService.ts`)
   - Processes various file types (TXT, MD, JSON, HTML)
   - Chunks documents into manageable pieces
   - Preserves document structure and metadata

3. **VectorStorageService** (`src/services/VectorStorageService.ts`)
   - Stores embeddings in IndexedDB for persistence
   - Provides fast in-memory search capabilities
   - Maintains source and stack indexes for efficient filtering

4. **KnowledgeService** (`src/services/KnowledgeService.ts`)
   - Orchestrates the entire RAG pipeline
   - Handles document indexing and search operations
   - Builds enhanced prompts with relevant context

5. **RAGQueryService** (`src/services/RAGQueryService.ts`)
   - Processes queries and determines RAG usage
   - Extracts citations and source attributions
   - Integrates with conversation history

6. **RAGChatService** (`src/services/RAGChatService.ts`)
   - Integrates RAG with chat responses
   - Handles error recovery and fallback scenarios
   - Provides response formatting with citations

### Store Integration

- **useKnowledgeStore** (`src/stores/useKnowledgeStore.ts`)
  - Manages knowledge stacks and sources
  - Handles RAG configuration and settings
  - Provides state management for the UI

### UI Components

- **EnhancedKnowledgePanel** (`src/components/knowledge/EnhancedKnowledgePanel.tsx`)
  - File upload and URL processing
  - Stack management and organization
  - RAG configuration controls

- **RAGContextCard** (`src/components/chat/RAGContextCard.tsx`)
  - Displays source attributions in chat
  - Shows relevance scores and excerpts
  - Expandable context information

### Hooks

- **useRAGChat** (`src/hooks/useRAGChat.ts`)
  - Provides RAG-enhanced chat functionality
  - Manages state and error handling
  - Integrates with existing chat components

## Setup Instructions

### 1. API Configuration

Before using RAG features, configure your OpenAI API key:

```typescript
// In your settings store or configuration
const settings = {
  apiKeys: {
    openai: 'your-openai-api-key-here'
  }
};
```

### 2. Knowledge Stack Creation

Create knowledge stacks to organize your documents:

```typescript
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';

const { createStack } = useKnowledgeStore();

await createStack({
  name: 'Project Documentation',
  description: 'Technical documentation and specifications',
  isActive: true
});
```

### 3. Adding Sources

Add documents to your knowledge stacks:

```typescript
const { addSource } = useKnowledgeStore();

// Add a file
await addSource(stackId, {
  name: 'requirements.md',
  type: 'file',
  path: 'requirements.md',
  size: fileSize
}, file);

// Add a URL
await addSource(stackId, {
  name: 'API Documentation',
  type: 'url',
  path: 'https://api.example.com/docs',
  size: 0
});
```

### 4. Using RAG in Chat

Integrate RAG with your chat interface:

```typescript
import { useRAGChat } from '@/hooks/useRAGChat';

function ChatComponent() {
  const { sendMessage, ragEnabled, setActiveStacks } = useRAGChat();

  const handleSendMessage = async (message: string) => {
    const result = await sendMessage(message, conversationHistory, currentModel);
    
    // Display the response with RAG context
    if (result.ragContext) {
      console.log('Sources used:', result.ragContext.sourcesUsed);
    }
  };

  return (
    <div>
      {/* Your chat interface */}
      {ragEnabled && <RAGContextCard {...ragContext} />}
    </div>
  );
}
```

## Configuration Options

### RAG Options

```typescript
interface RAGQueryOptions {
  enableRAG: boolean;              // Enable/disable RAG
  activeStackIds: string[];        // Active knowledge stacks
  relevanceThreshold: number;      // Minimum similarity score (0-1)
  maxResults: number;              // Maximum sources per query
  maxContextLength: number;        // Maximum context characters
  includeSourceCitations: boolean; // Include source references
  contextWeight: number;           // Context vs original prompt weight
}
```

### Document Processing

```typescript
interface ChunkingOptions {
  maxChunkSize: number;      // Maximum chunk size in characters
  overlap: number;           // Overlap between chunks
  preserveStructure: boolean; // Preserve document structure
  splitOnSentences: boolean; // Split on sentence boundaries
}
```

## Usage Examples

### Basic RAG Query

```typescript
const { processQuery } = useKnowledgeStore();

const result = await processQuery(
  "How do I configure authentication?",
  conversationHistory
);

if (result.ragUsed) {
  console.log('Enhanced response with context');
  console.log('Sources:', result.sources);
}
```

### Custom RAG Configuration

```typescript
const { updateRAGOptions } = useKnowledgeStore();

updateRAGOptions({
  relevanceThreshold: 0.8,    // Higher threshold for more relevant results
  maxResults: 3,              // Limit to top 3 sources
  maxContextLength: 1500,     // Shorter context for faster responses
  includeSourceCitations: true // Always include citations
});
```

### Health Monitoring

```typescript
const { healthCheck } = useKnowledgeStore();

const health = await healthCheck();
console.log('RAG System Health:', health);
```

## Performance Considerations

### Indexing Performance

- **Batch Processing**: Documents are processed in batches to avoid API rate limits
- **Chunking Strategy**: Configurable chunk sizes balance context and search precision
- **Incremental Indexing**: Only new or modified documents are re-indexed

### Search Performance

- **In-Memory Search**: Embeddings are cached in memory for fast searches
- **Relevance Filtering**: Only sources above the threshold are considered
- **Source Limiting**: Configurable maximum results prevent context overflow

### Storage Management

- **IndexedDB Persistence**: Embeddings are stored persistently in the browser
- **Compression**: Metadata is compressed to reduce storage usage
- **Cleanup**: Unused embeddings are automatically garbage collected

## Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Ensure OpenAI API key is set in settings
   - Check API key permissions and quotas

2. **Document Processing Errors**
   - Verify file format is supported
   - Check file size limits
   - Ensure proper file encoding

3. **Search Not Working**
   - Verify knowledge stacks are active
   - Check relevance threshold settings
   - Ensure documents are properly indexed

4. **Performance Issues**
   - Reduce chunk size for faster processing
   - Lower relevance threshold for more results
   - Limit maximum context length

### Debug Information

Enable debug logging:

```typescript
// In your console or debug panel
localStorage.setItem('debug-rag', 'true');
```

Check statistics:

```typescript
const { stats } = useKnowledgeStore();
console.log('RAG Stats:', stats);
```

## File Type Support

Currently supported file types:
- **Text files**: .txt, .md, .json
- **Web content**: .html, .htm
- **URLs**: Any web page content

Planned support:
- **PDF files**: .pdf (requires additional library)
- **Office documents**: .docx, .xlsx, .pptx
- **Images**: OCR-based text extraction

## Security Considerations

- **API Key Protection**: Keys are stored securely in the browser
- **Content Privacy**: Documents are processed locally when possible
- **Data Retention**: Embeddings are stored only in local browser storage
- **Network Security**: All API calls use HTTPS encryption

## Future Enhancements

- **Advanced Document Processing**: Better PDF and Office document support
- **Multi-language Support**: Embeddings for non-English content
- **Custom Embedding Models**: Support for local or custom embedding models
- **Advanced Search**: Semantic search with metadata filtering
- **Collaborative Features**: Shared knowledge bases and team collaboration

## API Reference

### EmbeddingService Methods

```typescript
generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>
generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResponse[]>
cosineSimilarity(a: number[], b: number[]): number
findSimilarEmbeddings(queryEmbedding: number[], embeddings: EmbeddingVector[], topK?: number): Promise<SimilaritySearchResult[]>
```

### KnowledgeService Methods

```typescript
indexKnowledgeSource(source: KnowledgeSource, stackId: string, file?: File): Promise<KnowledgeIndexingResult>
searchKnowledge(query: string, stackIds?: string[], options?: SearchOptions): Promise<RAGContext>
buildRAGPrompt(originalPrompt: string, context: RAGContext, options?: PromptOptions): Promise<string>
removeKnowledgeSource(sourceId: string): Promise<void>
getKnowledgeStats(): Promise<KnowledgeStats>
```

### useKnowledgeStore Actions

```typescript
createStack(stack: StackData): Promise<KnowledgeStack>
addSource(stackId: string, source: SourceData, file?: File): Promise<KnowledgeSource>
toggleStackActive(stackId: string): void
updateRAGOptions(options: Partial<RAGQueryOptions>): void
processQuery(query: string, history?: Message[]): Promise<RAGQueryResult>
```

This comprehensive RAG system provides powerful knowledge retrieval capabilities while maintaining good performance and user experience. The modular architecture allows for easy customization and extension based on specific needs.