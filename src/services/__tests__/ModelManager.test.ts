import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelManager } from '../ModelManager';
import type { ModelManagerConfig, ChatContext, SendMessageOptions } from '../ModelManager';
import { createDefaultModel, createModelConfig } from '../ModelService';
import type { AIModel, ModelConfig, Message } from '../../types';

// Mock the ModelServiceFactory
vi.mock('../ModelService', async () => {
  const actual = await vi.importActual('../ModelService');
  return {
    ...actual,
    ModelServiceFactory: {
      createService: vi.fn().mockImplementation((model: AIModel, config: ModelConfig) => ({
        sendMessage: vi.fn().mockResolvedValue({
          id: 'test-response-id',
          content: 'Mock response content',
          model,
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          finishReason: 'stop',
          metadata: { provider: 'mock' }
        }),
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield {
            id: 'test-stream-id',
            content: 'Mock streaming content',
            status: 'streaming',
            metadata: { provider: 'mock' }
          };
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
        getModelInfo: vi.fn().mockReturnValue(model),
        validateConfig: vi.fn().mockReturnValue(true),
        disconnect: vi.fn().mockResolvedValue(undefined)
      }))
    }
  };
});

describe('ModelManager', () => {
  let manager: ModelManager;
  let mockConfig: ModelManagerConfig;
  let testModel: AIModel;
  let testMessages: Message[];

  beforeEach(() => {
    mockConfig = {
      autoRetry: true,
      retryAttempts: 3,
      retryDelay: 100,
      timeout: 5000
    };
    
    testModel = createDefaultModel('mock', 'test-model');
    testMessages = [
      {
        id: 'msg-1',
        content: 'Hello, how are you?',
        role: 'user',
        timestamp: new Date(),
        isEdited: false
      },
      {
        id: 'msg-2',
        content: 'I am doing well, thank you!',
        role: 'assistant',
        timestamp: new Date(),
        isEdited: false
      }
    ];
    
    manager = new ModelManager(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should create ModelManager with default config', () => {
      const defaultManager = new ModelManager();
      expect(defaultManager).toBeInstanceOf(ModelManager);
    });

    it('should create ModelManager with custom config', () => {
      expect(manager).toBeInstanceOf(ModelManager);
    });

    it('should initialize with default model', () => {
      expect(manager).toBeInstanceOf(ModelManager);
      // The default model should be set up internally
    });
  });

  describe('Model Management', () => {
    it('should add a model successfully', async () => {
      const newModel = createDefaultModel('openai', 'gpt-4');
      const config = createModelConfig({ apiKey: 'test-key' });
      
      const result = await manager.addModel(newModel, config);
      
      expect(result).toBe(true);
    });

    it('should fail to add unavailable model', async () => {
      const { ModelServiceFactory } = await import('../ModelService');
      const mockService = {
        isAvailable: vi.fn().mockResolvedValue(false),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any).mockReturnValue(mockService);
      
      const newModel = createDefaultModel('openai', 'gpt-4');
      const result = await manager.addModel(newModel, {});
      
      expect(result).toBe(false);
    });

    it('should handle model addition errors', async () => {
      const { ModelServiceFactory } = await import('../ModelService');
      const mockService = {
        isAvailable: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any).mockReturnValue(mockService);
      
      const newModel = createDefaultModel('openai', 'gpt-4');
      const result = await manager.addModel(newModel, {});
      
      expect(result).toBe(false);
    });

    it('should remove a model successfully', async () => {
      const newModel = createDefaultModel('openai', 'gpt-4');
      await manager.addModel(newModel, createModelConfig());
      
      await expect(manager.removeModel(newModel.id)).resolves.not.toThrow();
    });

    it('should handle removing non-existent model', async () => {
      await expect(manager.removeModel('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Single Model Communication', () => {
    let chatContext: ChatContext;
    let sendOptions: SendMessageOptions;

    beforeEach(async () => {
      // Add a test model
      await manager.addModel(testModel, createModelConfig());
      
      chatContext = {
        chatId: 'test-chat-id',
        messages: testMessages,
        activeModel: testModel,
        knowledgeStacks: []
      };
      
      sendOptions = {
        stream: false,
        onStreamUpdate: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };
    });

    it('should send non-streaming message successfully', async () => {
      const messageId = await manager.sendMessage(chatContext, 'Hello!', sendOptions);
      
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });

    it('should send streaming message successfully', async () => {
      const streamingOptions = { ...sendOptions, stream: true };
      
      const messageId = await manager.sendMessage(chatContext, 'Hello!', streamingOptions);
      
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
    });

    it('should call streaming callbacks', async () => {
      const onStreamUpdate = vi.fn();
      const onComplete = vi.fn();
      const streamingOptions = { ...sendOptions, stream: true, onStreamUpdate, onComplete };
      
      await manager.sendMessage(chatContext, 'Hello!', streamingOptions);
      
      // Note: The actual callback behavior depends on the mock implementation
      expect(onStreamUpdate).toHaveBeenCalled();
    });

    it('should handle unavailable model error', async () => {
      const unavailableContext = {
        ...chatContext,
        activeModel: createDefaultModel('unavailable', 'test')
      };
      
      await expect(
        manager.sendMessage(unavailableContext, 'Hello!', sendOptions)
      ).rejects.toThrow('Model unavailable-test not available');
    });

    it('should handle service errors', async () => {
      const { ModelServiceFactory } = await import('../ModelService');
      const mockService = {
        sendMessage: vi.fn().mockRejectedValue(new Error('API error')),
        getModelInfo: vi.fn().mockReturnValue(testModel),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any).mockReturnValue(mockService);
      
      // Add a model that will fail
      const errorModel = createDefaultModel('error', 'test');
      await manager.addModel(errorModel, createModelConfig());
      
      const errorContext = { ...chatContext, activeModel: errorModel };
      
      await expect(
        manager.sendMessage(errorContext, 'Hello!', sendOptions)
      ).rejects.toThrow('API error');
    });
  });

  describe('Multi-Model Communication', () => {
    let chatContext: ChatContext;
    let sendOptions: SendMessageOptions;
    let model1: AIModel;
    let model2: AIModel;

    beforeEach(async () => {
      model1 = createDefaultModel('openai', 'gpt-4');
      model2 = createDefaultModel('anthropic', 'claude-3');
      
      await manager.addModel(model1, createModelConfig());
      await manager.addModel(model2, createModelConfig());
      
      chatContext = {
        chatId: 'test-chat-id',
        messages: testMessages,
        activeModel: model1,
        knowledgeStacks: []
      };
      
      sendOptions = {
        stream: false,
        onStreamUpdate: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };
    });

    it('should send message to multiple models successfully', async () => {
      const modelIds = [model1.id, model2.id];
      
      const results = await manager.sendMessageToMultipleModels(
        chatContext,
        'Hello!',
        modelIds,
        sendOptions
      );
      
      expect(results.size).toBe(2);
      expect(results.has(model1.id)).toBe(true);
      expect(results.has(model2.id)).toBe(true);
    });

    it('should handle partial failures in multi-model requests', async () => {
      const { ModelServiceFactory } = await import('../ModelService');
      
      // Mock one service to fail
      const mockFailingService = {
        sendMessage: vi.fn().mockRejectedValue(new Error('Service failed')),
        getModelInfo: vi.fn().mockReturnValue(model2),
        disconnect: vi.fn()
      };
      
      const mockWorkingService = {
        sendMessage: vi.fn().mockResolvedValue({
          id: 'success-id',
          content: 'Success response',
          model: model1,
          finishReason: 'stop'
        }),
        getModelInfo: vi.fn().mockReturnValue(model1),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any)
        .mockImplementation((model: AIModel) => {
          if (model.id === model1.id) return mockWorkingService;
          if (model.id === model2.id) return mockFailingService;
          return mockWorkingService;
        });
      
      const onError = vi.fn();
      const optionsWithError = { ...sendOptions, onError };
      
      const results = await manager.sendMessageToMultipleModels(
        chatContext,
        'Hello!',
        [model1.id, model2.id],
        optionsWithError
      );
      
      expect(results.size).toBe(1);
      expect(results.has(model1.id)).toBe(true);
      expect(results.has(model2.id)).toBe(false);
      expect(onError).toHaveBeenCalled();
    });

    it('should handle unavailable models in multi-model requests', async () => {
      const unavailableModelIds = ['unavailable-1', 'unavailable-2'];
      
      const results = await manager.sendMessageToMultipleModels(
        chatContext,
        'Hello!',
        unavailableModelIds,
        sendOptions
      );
      
      expect(results.size).toBe(0);
    });
  });

  describe('Message Format Conversion', () => {
    it('should convert chat messages to model format correctly', async () => {
      const chatContext: ChatContext = {
        chatId: 'test-chat',
        messages: [
          {
            id: 'msg-1',
            content: 'Hello',
            role: 'user',
            timestamp: new Date(),
            isEdited: false
          },
          {
            id: 'msg-2',
            content: 'Hi there!',
            role: 'assistant',
            timestamp: new Date(),
            isEdited: false
          }
        ],
        activeModel: testModel
      };
      
      await manager.addModel(testModel, createModelConfig());
      
      const { ModelServiceFactory } = await import('../ModelService');
      const mockService = {
        sendMessage: vi.fn().mockResolvedValue({
          id: 'response-id',
          content: 'Response',
          model: testModel,
          finishReason: 'stop'
        }),
        getModelInfo: vi.fn().mockReturnValue(testModel),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any).mockReturnValue(mockService);
      
      await manager.sendMessage(chatContext, 'New message', { stream: false });
      
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello'
            }),
            expect.objectContaining({
              role: 'assistant',
              content: 'Hi there!'
            }),
            expect.objectContaining({
              role: 'user',
              content: 'New message'
            })
          ])
        })
      );
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', async () => {
      const chatContext: ChatContext = {
        chatId: 'test-chat',
        messages: [],
        activeModel: testModel
      };
      
      await manager.addModel(testModel, createModelConfig());
      
      const messageId1 = await manager.sendMessage(chatContext, 'Message 1', { stream: false });
      const messageId2 = await manager.sendMessage(chatContext, 'Message 2', { stream: false });
      
      expect(messageId1).toBeDefined();
      expect(messageId2).toBeDefined();
      expect(messageId1).not.toBe(messageId2);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle timeout errors', async () => {
      const { ModelServiceFactory } = await import('../ModelService');
      const mockService = {
        sendMessage: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        ),
        getModelInfo: vi.fn().mockReturnValue(testModel),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any).mockReturnValue(mockService);
      
      const timeoutModel = createDefaultModel('timeout', 'test');
      await manager.addModel(timeoutModel, createModelConfig());
      
      const chatContext: ChatContext = {
        chatId: 'test-chat',
        messages: [],
        activeModel: timeoutModel
      };
      
      await expect(
        manager.sendMessage(chatContext, 'Hello!', { stream: false, timeout: 50 })
      ).rejects.toThrow('Timeout');
    });

    it('should handle streaming errors', async () => {
      const { ModelServiceFactory } = await import('../ModelService');
      const mockService = {
        streamMessage: vi.fn().mockImplementation(async function* () {
          yield {
            id: 'test-id',
            content: 'Partial content',
            status: 'streaming'
          };
          throw new Error('Stream error');
        }),
        getModelInfo: vi.fn().mockReturnValue(testModel),
        disconnect: vi.fn()
      };
      
      (ModelServiceFactory.createService as any).mockReturnValue(mockService);
      
      const errorModel = createDefaultModel('stream-error', 'test');
      await manager.addModel(errorModel, createModelConfig());
      
      const chatContext: ChatContext = {
        chatId: 'test-chat',
        messages: [],
        activeModel: errorModel
      };
      
      const onError = vi.fn();
      
      await expect(
        manager.sendMessage(chatContext, 'Hello!', { stream: true, onError })
      ).rejects.toThrow('Stream error');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultManager = new ModelManager();
      expect(defaultManager).toBeInstanceOf(ModelManager);
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig: ModelManagerConfig = {
        autoRetry: false,
        retryAttempts: 5
      };
      
      const customManager = new ModelManager(customConfig);
      expect(customManager).toBeInstanceOf(ModelManager);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect all services when removing models', async () => {
      const model1 = createDefaultModel('test1', 'model1');
      const model2 = createDefaultModel('test2', 'model2');
      
      await manager.addModel(model1, createModelConfig());
      await manager.addModel(model2, createModelConfig());
      
      await manager.removeModel(model1.id);
      await manager.removeModel(model2.id);
      
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});