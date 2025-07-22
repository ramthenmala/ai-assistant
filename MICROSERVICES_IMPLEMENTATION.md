# Microservices Implementation Guide

## Overview
This guide provides step-by-step instructions for converting the AI Chat Assistant monolith into microservices.

## Project Structure
```
ai-chat-microservices/
├── services/
│   ├── chat-service/
│   ├── model-gateway/
│   ├── knowledge-service/
│   ├── sdlc-service/
│   ├── ats-service/
│   ├── storage-service/
│   └── auth-service/
├── api-gateway/
├── shared/
│   ├── types/
│   ├── utils/
│   └── contracts/
└── infrastructure/
    ├── docker/
    ├── kubernetes/
    └── scripts/
```

## Service Implementation Details

### 1. Chat Service

#### Directory Structure
```
chat-service/
├── src/
│   ├── controllers/
│   │   ├── messageController.ts
│   │   ├── conversationController.ts
│   │   └── branchController.ts
│   ├── services/
│   │   ├── messageService.ts
│   │   ├── conversationService.ts
│   │   └── branchingService.ts
│   ├── models/
│   │   ├── message.model.ts
│   │   └── conversation.model.ts
│   ├── routes/
│   │   └── index.ts
│   ├── websocket/
│   │   └── chatSocket.ts
│   └── index.ts
├── tests/
├── Dockerfile
├── package.json
└── tsconfig.json
```

#### Implementation: `chat-service/src/index.ts`
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes';
import { setupWebSocket } from './websocket/chatSocket';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/chat', router);

// WebSocket setup
setupWebSocket(io);

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'chat-service' });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await connectDatabase();
    httpServer.listen(PORT, () => {
      logger.info(`Chat Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

#### Message Controller: `chat-service/src/controllers/messageController.ts`
```typescript
import { Request, Response } from 'express';
import { MessageService } from '../services/messageService';
import { validate } from '../utils/validation';
import { CreateMessageDTO, UpdateMessageDTO } from '../types/dto';

export class MessageController {
  constructor(private messageService: MessageService) {}

  async createMessage(req: Request, res: Response) {
    try {
      const validatedData = validate(CreateMessageDTO, req.body);
      const message = await this.messageService.create(validatedData);
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const messages = await this.messageService.getByConversation(conversationId);
      res.json({ success: true, data: messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = validate(UpdateMessageDTO, req.body);
      const message = await this.messageService.update(id, validatedData);
      res.json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.messageService.delete(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

#### WebSocket Handler: `chat-service/src/websocket/chatSocket.ts`
```typescript
import { Server, Socket } from 'socket.io';
import { MessageService } from '../services/messageService';
import { ConversationService } from '../services/conversationService';
import { authenticate } from '../middleware/socketAuth';
import { logger } from '../utils/logger';

export function setupWebSocket(io: Server) {
  const messageService = new MessageService();
  const conversationService = new ConversationService();

  io.use(authenticate);

  io.on('connection', (socket: Socket) => {
    logger.info(`User connected: ${socket.data.userId}`);

    socket.on('join:conversation', async (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      const messages = await messageService.getByConversation(conversationId);
      socket.emit('conversation:messages', messages);
    });

    socket.on('message:send', async (data: {
      conversationId: string;
      content: string;
      role: 'user' | 'assistant';
    }) => {
      try {
        const message = await messageService.create({
          ...data,
          userId: socket.data.userId,
        });

        io.to(`conversation:${data.conversationId}`).emit('message:new', message);

        // Emit to model gateway for AI response if user message
        if (data.role === 'user') {
          emitToModelGateway({
            conversationId: data.conversationId,
            message: message,
            userId: socket.data.userId
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:edit', async (data: {
      messageId: string;
      content: string;
    }) => {
      try {
        const message = await messageService.update(data.messageId, {
          content: data.content,
          edited: true
        });
        
        const conversationId = message.conversationId;
        io.to(`conversation:${conversationId}`).emit('message:updated', message);
      } catch (error) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.data.userId,
        typing: true
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.data.userId,
        typing: false
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.data.userId}`);
    });
  });
}

async function emitToModelGateway(data: any) {
  // Implement message queue publishing or direct HTTP call
  // This would typically use RabbitMQ/Kafka
}
```

### 2. Model Gateway Service

#### Directory Structure
```
model-gateway/
├── src/
│   ├── controllers/
│   │   └── inferenceController.ts
│   ├── services/
│   │   ├── modelRouter.ts
│   │   ├── providers/
│   │   │   ├── openaiProvider.ts
│   │   │   ├── anthropicProvider.ts
│   │   │   └── localProvider.ts
│   │   └── streamHandler.ts
│   ├── queue/
│   │   └── messageConsumer.ts
│   └── index.ts
├── Dockerfile
└── package.json
```

#### Model Gateway Implementation: `model-gateway/src/index.ts`
```typescript
import express from 'express';
import { InferenceController } from './controllers/inferenceController';
import { MessageConsumer } from './queue/messageConsumer';
import { ModelRouter } from './services/modelRouter';
import { logger } from './utils/logger';

const app = express();
app.use(express.json());

const modelRouter = new ModelRouter();
const inferenceController = new InferenceController(modelRouter);

// REST endpoints for direct inference
app.post('/api/v1/inference', inferenceController.handleInference.bind(inferenceController));
app.post('/api/v1/inference/stream', inferenceController.handleStreamingInference.bind(inferenceController));

// Health check with model availability
app.get('/health', async (req, res) => {
  const modelStatus = await modelRouter.getModelStatus();
  res.json({ 
    status: 'healthy', 
    service: 'model-gateway',
    models: modelStatus 
  });
});

// Start message queue consumer
const messageConsumer = new MessageConsumer(modelRouter);
messageConsumer.start();

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Model Gateway running on port ${PORT}`);
});
```

#### Model Router: `model-gateway/src/services/modelRouter.ts`
```typescript
import { OpenAIProvider } from './providers/openaiProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { LocalProvider } from './providers/localProvider';
import { ModelProvider, InferenceRequest, InferenceResponse } from '../types';
import { logger } from '../utils/logger';

export class ModelRouter {
  private providers: Map<string, ModelProvider> = new Map();
  
  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider());
    }
    if (process.env.LOCAL_MODEL_ENDPOINT) {
      this.providers.set('local', new LocalProvider());
    }
  }

  async route(request: InferenceRequest): Promise<InferenceResponse> {
    const provider = this.selectProvider(request);
    
    if (!provider) {
      throw new Error(`No provider available for model: ${request.model}`);
    }

    try {
      const response = await provider.generateResponse(request);
      return response;
    } catch (error) {
      logger.error(`Provider ${request.provider} failed:`, error);
      // Implement fallback logic
      return this.handleFailover(request, error);
    }
  }

  async streamRoute(request: InferenceRequest): Promise<AsyncGenerator<string>> {
    const provider = this.selectProvider(request);
    
    if (!provider) {
      throw new Error(`No provider available for model: ${request.model}`);
    }

    return provider.streamResponse(request);
  }

  private selectProvider(request: InferenceRequest): ModelProvider | undefined {
    if (request.provider) {
      return this.providers.get(request.provider);
    }

    // Auto-select based on model name
    if (request.model.includes('gpt')) {
      return this.providers.get('openai');
    } else if (request.model.includes('claude')) {
      return this.providers.get('anthropic');
    }

    // Default to first available provider
    return this.providers.values().next().value;
  }

  private async handleFailover(request: InferenceRequest, error: Error): Promise<InferenceResponse> {
    // Implement circuit breaker and failover logic
    const alternativeProviders = Array.from(this.providers.entries())
      .filter(([name, _]) => name !== request.provider);

    for (const [name, provider] of alternativeProviders) {
      try {
        logger.info(`Failing over to provider: ${name}`);
        return await provider.generateResponse(request);
      } catch (fallbackError) {
        logger.error(`Failover to ${name} failed:`, fallbackError);
      }
    }

    throw new Error('All providers failed');
  }

  async getModelStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        status[name] = await provider.isHealthy();
      } catch {
        status[name] = false;
      }
    }

    return status;
  }
}
```

### 3. Knowledge/RAG Service

#### Directory Structure
```
knowledge-service/
├── src/
│   ├── controllers/
│   │   ├── documentController.ts
│   │   └── searchController.ts
│   ├── services/
│   │   ├── embeddingService.ts
│   │   ├── documentProcessor.ts
│   │   ├── vectorStore.ts
│   │   └── ragService.ts
│   ├── workers/
│   │   └── embeddingWorker.ts
│   └── index.ts
└── Dockerfile
```

#### RAG Service Implementation: `knowledge-service/src/services/ragService.ts`
```typescript
import { EmbeddingService } from './embeddingService';
import { VectorStore } from './vectorStore';
import { DocumentProcessor } from './documentProcessor';
import { logger } from '../utils/logger';

export class RAGService {
  constructor(
    private embeddingService: EmbeddingService,
    private vectorStore: VectorStore,
    private documentProcessor: DocumentProcessor
  ) {}

  async addDocument(file: Buffer, metadata: any): Promise<string> {
    try {
      // Process document
      const chunks = await this.documentProcessor.process(file, metadata.type);
      
      // Generate embeddings
      const embeddings = await Promise.all(
        chunks.map(chunk => this.embeddingService.embed(chunk.text))
      );

      // Store in vector database
      const documentId = await this.vectorStore.addDocument({
        chunks: chunks.map((chunk, index) => ({
          ...chunk,
          embedding: embeddings[index]
        })),
        metadata
      });

      logger.info(`Document added: ${documentId}`);
      return documentId;
    } catch (error) {
      logger.error('Failed to add document:', error);
      throw error;
    }
  }

  async search(query: string, options: {
    limit?: number;
    threshold?: number;
    filters?: any;
  } = {}): Promise<any[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.embed(query);

    // Search vector store
    const results = await this.vectorStore.search(queryEmbedding, {
      limit: options.limit || 5,
      threshold: options.threshold || 0.7,
      filters: options.filters
    });

    // Post-process results
    return this.rankResults(results, query);
  }

  async getContext(query: string, conversationId?: string): Promise<string> {
    const searchResults = await this.search(query);
    
    if (searchResults.length === 0) {
      return '';
    }

    // Format context for LLM
    const context = searchResults
      .map((result, index) => `[${index + 1}] ${result.text}`)
      .join('\n\n');

    return `Based on the following context:\n\n${context}`;
  }

  private rankResults(results: any[], query: string): any[] {
    // Implement re-ranking logic (e.g., using cross-encoder)
    return results.sort((a, b) => b.score - a.score);
  }
}
```

### 4. API Gateway Configuration

#### Directory Structure
```
api-gateway/
├── src/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rateLimiter.ts
│   │   └── requestLogger.ts
│   ├── routes/
│   │   └── index.ts
│   ├── services/
│   │   └── serviceRegistry.ts
│   └── index.ts
├── nginx.conf
└── Dockerfile
```

#### API Gateway with Express: `api-gateway/src/index.ts`
```typescript
import express from 'express';
import httpProxy from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { ServiceRegistry } from './services/serviceRegistry';
import { logger } from './utils/logger';

const app = express();
const serviceRegistry = new ServiceRegistry();

// Global middleware
app.use(requestLogger);
app.use(authMiddleware);
app.use(rateLimiter);

// Service routes
const services = {
  '/api/v1/chat': process.env.CHAT_SERVICE_URL || 'http://chat-service:3001',
  '/api/v1/inference': process.env.MODEL_GATEWAY_URL || 'http://model-gateway:3002',
  '/api/v1/knowledge': process.env.KNOWLEDGE_SERVICE_URL || 'http://knowledge-service:3003',
  '/api/v1/sdlc': process.env.SDLC_SERVICE_URL || 'http://sdlc-service:3004',
  '/api/v1/ats': process.env.ATS_SERVICE_URL || 'http://ats-service:3005',
};

// Dynamic proxy configuration
Object.entries(services).forEach(([path, target]) => {
  app.use(path, httpProxy.createProxyMiddleware({
    target,
    changeOrigin: true,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${path}:`, err);
      res.status(502).json({ error: 'Service unavailable' });
    },
    onProxyReq: (proxyReq, req) => {
      // Add trace headers
      proxyReq.setHeader('X-Trace-Id', req.headers['x-trace-id'] || generateTraceId());
      proxyReq.setHeader('X-User-Id', req.user?.id);
    }
  }));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await serviceRegistry.checkHealth();
  res.json(health);
});

// WebSocket proxy for chat
const server = app.listen(process.env.PORT || 3000, () => {
  logger.info(`API Gateway running on port ${process.env.PORT || 3000}`);
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/ws/chat')) {
    const target = process.env.CHAT_SERVICE_URL || 'http://chat-service:3001';
    httpProxy.createProxyMiddleware({ target, ws: true })(request, socket, head);
  }
});
```

### 5. Docker Configuration

#### Chat Service Dockerfile: `services/chat-service/Dockerfile`
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

#### Docker Compose for Development: `docker-compose.yml`
```yaml
version: '3.8'

services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - CHAT_SERVICE_URL=http://chat-service:3001
      - MODEL_GATEWAY_URL=http://model-gateway:3002
      - KNOWLEDGE_SERVICE_URL=http://knowledge-service:3003
    depends_on:
      - chat-service
      - model-gateway
      - knowledge-service
    networks:
      - app-network

  chat-service:
    build: ./services/chat-service
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/chat
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - app-network

  model-gateway:
    build: ./services/model-gateway
    environment:
      - NODE_ENV=development
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - rabbitmq
    networks:
      - app-network

  knowledge-service:
    build: ./services/knowledge-service
    environment:
      - NODE_ENV=development
      - VECTOR_DB_URL=http://qdrant:6333
      - EMBEDDING_SERVICE_URL=http://model-gateway:3002
    depends_on:
      - qdrant
    networks:
      - app-network

  # Infrastructure services
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=aiassistant
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - app-network

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - app-network

  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:
  qdrant-data:
```

### 6. Kubernetes Deployment

#### Chat Service Deployment: `kubernetes/services/chat-service.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-service
  namespace: ai-assistant
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chat-service
  template:
    metadata:
      labels:
        app: chat-service
    spec:
      containers:
      - name: chat-service
        image: ai-assistant/chat-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: redis-config
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: chat-service
  namespace: ai-assistant
spec:
  selector:
    app: chat-service
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chat-service-hpa
  namespace: ai-assistant
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 7. Service Communication Patterns

#### Message Queue Integration: `shared/queue/publisher.ts`
```typescript
import amqp from 'amqplib';
import { logger } from '../utils/logger';

export class MessagePublisher {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async connect(url: string) {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Set up exchanges
      await this.channel.assertExchange('ai-assistant', 'topic', { durable: true });
      
      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(routingKey: string, message: any) {
    if (!this.channel) {
      throw new Error('Not connected to message queue');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    return this.channel.publish(
      'ai-assistant',
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now()
      }
    );
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
```

### 8. Shared Types and Contracts

#### Shared Types: `shared/types/index.ts`
```typescript
// Message types
export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Model types
export interface ModelRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// Service contracts
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// Event types for message queue
export interface ChatEvent {
  type: 'message.created' | 'message.updated' | 'conversation.created';
  payload: any;
  userId: string;
  timestamp: Date;
}
```

## Migration Strategy

### Phase 1: Extract Services (Weeks 1-2)
1. Set up service scaffolding
2. Extract domain logic from monolith
3. Implement service APIs
4. Set up inter-service communication

### Phase 2: Data Migration (Weeks 3-4)
1. Design distributed data model
2. Implement data synchronization
3. Set up event sourcing for consistency
4. Migrate existing data

### Phase 3: Integration Testing (Week 5)
1. End-to-end testing
2. Performance testing
3. Failure scenario testing
4. Security testing

### Phase 4: Deployment (Week 6)
1. Set up CI/CD pipelines
2. Deploy to staging
3. Gradual rollout to production
4. Monitor and optimize

## Best Practices

1. **Service Communication**
   - Use async messaging for non-critical paths
   - Implement circuit breakers
   - Add request tracing

2. **Data Management**
   - Each service owns its data
   - Use event sourcing for consistency
   - Implement CQRS where appropriate

3. **Security**
   - Service-to-service authentication
   - API Gateway for external access
   - Encrypt sensitive data

4. **Monitoring**
   - Distributed tracing (Jaeger)
   - Centralized logging (ELK)
   - Metrics collection (Prometheus)

5. **Development**
   - Use feature flags
   - Implement health checks
   - Version APIs properly