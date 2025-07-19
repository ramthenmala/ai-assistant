import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  BaseModelService, 
  MockModelService, 
  OpenAIModelService, 
  AnthropicModelService,
  ModelServiceFactory,
  createDefaultModel,
  createModelConfig,
  validateModelMessage
} from '../ModelService';
import type { 
  AIModel, 
  ModelConfig, 
  ModelRequest, 
  ModelMessage,
  StreamingResponse
} from '../ModelService';

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ModelService', () => {
  let mockModel: AIModel;
  let mockConfig: ModelConfig;

  beforeEach(() => {
    mockModel = createDefaultModel('mock', 'test-model');
    mockConfig = createModelConfig({
      temperature: 0.7,
      maxTokens: 1000,
      apiKey: 'test-key'
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('MockModelService', () => {
    let service: MockModelService;

    beforeEach(() => {
      service = new MockModelService(mockModel, mockConfig);
    });

    afterEach(async () => {
      await service.disconnect();
    });

    it('should create a mock service successfully', () => {
      expect(service).toBeInstanceOf(MockModelService);
      expect(service.getModelInfo()).toEqual(mockModel);
    });

    it('should validate config correctly', () => {
      expect(service.validateConfig(mockConfig)).toBe(true);
      expect(service.validateConfig({})).toBe(true); // Mock always validates
    });

    it('should be available after construction', async () => {
      expect(await service.isAvailable()).toBe(true);
    });

    it('should disconnect properly', async () => {
      await service.disconnect();
      expect(await service.isAvailable()).toBe(false);
    });

    it('should send non-streaming messages', async () => {
      const request: ModelRequest = {
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        model: mockModel,
        stream: false
      };

      const response = await service.sendMessage(request);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.model).toEqual(mockModel);
      expect(response.usage).toBeDefined();
      expect(response.finishReason).toBe('stop');
      expect(response.metadata?.provider).toBe('mock');
    });

    it('should handle streaming messages', async () => {
      const request: ModelRequest = {
        messages: [
          { role: 'user', content: 'Tell me a story' }
        ],
        model: mockModel,
        stream: true
      };

      const streamUpdates: StreamingResponse[] = [];
      let finalResponse: any = null;

      const generator = service.streamMessage(request);
      
      for await (const response of generator) {
        streamUpdates.push(response);
        finalResponse = response;
      }

      expect(streamUpdates.length).toBeGreaterThan(0);
      expect(finalResponse).toBeDefined();
      expect(finalResponse.content).toBeDefined();
      expect(finalResponse.status).toBe('streaming');
    });

    it('should call stream callbacks', async () => {
      const onStreamUpdate = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      const request: ModelRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        model: mockModel,
        stream: true,
        onStreamUpdate,
        onComplete,
        onError
      };

      const generator = service.streamMessage(request);
      
      for await (const response of generator) {
        // Process streaming
      }

      expect(onStreamUpdate).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle different response lengths', async () => {
      service.setSimulatedResponses([
        'Short',
        'Medium length response',
        'This is a much longer response that should be selected for longer inputs'
      ]);

      // Test short input
      const shortRequest: ModelRequest = {
        messages: [{ role: 'user', content: 'Hi' }],
        model: mockModel
      };
      const shortResponse = await service.sendMessage(shortRequest);
      expect(shortResponse.content).toBe('Short');

      // Test medium input
      const mediumRequest: ModelRequest = {
        messages: [{ role: 'user', content: 'This is a medium length input message' }],
        model: mockModel
      };
      const mediumResponse = await service.sendMessage(mediumRequest);
      expect(mediumResponse.content).toBe('Medium length response');

      // Test long input
      const longRequest: ModelRequest = {
        messages: [{ role: 'user', content: 'This is a very long input message that should trigger the longest response option available in the mock service configuration' }],
        model: mockModel
      };
      const longResponse = await service.sendMessage(longRequest);
      expect(longResponse.content).toBe('This is a much longer response that should be selected for longer inputs');
    });

    it('should allow customization of response delay', async () => {
      service.setResponseDelay(1); // Very fast for testing
      
      const start = Date.now();
      const generator = service.streamMessage({
        messages: [{ role: 'user', content: 'Test' }],
        model: mockModel
      });
      
      for await (const response of generator) {
        // Just consume the stream
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should be very fast
    });

    it('should handle errors when disconnected', async () => {
      await service.disconnect();
      
      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: mockModel
      };

      await expect(service.sendMessage(request)).rejects.toThrow('Model service not connected');
    });
  });

  describe('OpenAIModelService', () => {
    let service: OpenAIModelService;
    let openaiModel: AIModel;

    beforeEach(() => {
      openaiModel = createDefaultModel('openai', 'gpt-4');
      service = new OpenAIModelService(openaiModel, mockConfig);
    });

    afterEach(async () => {
      await service.disconnect();
    });

    it('should create OpenAI service successfully', () => {
      expect(service).toBeInstanceOf(OpenAIModelService);
      expect(service.getModelInfo()).toEqual(openaiModel);
    });

    it('should validate config correctly', () => {
      expect(service.validateConfig(mockConfig)).toBe(true);
      expect(service.validateConfig({})).toBe(false);
    });

    it('should be available with API key', async () => {
      expect(await service.isAvailable()).toBe(true);
    });

    it('should not be available without API key', async () => {
      const serviceWithoutKey = new OpenAIModelService(openaiModel, {});
      expect(await serviceWithoutKey.isAvailable()).toBe(false);
    });

    it('should send non-streaming messages to OpenAI API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: { content: 'Hello! How can I help you today?' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          },
          model: 'gpt-4'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel,
        stream: false
      };

      const response = await service.sendMessage(request);

      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          model: openaiModel.name,
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: false
        })
      });

      expect(response.content).toBe('Hello! How can I help you today?');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
      expect(response.finishReason).toBe('stop');
    });

    it('should handle OpenAI API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          error: { message: 'Invalid API key' }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel
      };

      await expect(service.sendMessage(request)).rejects.toThrow('OpenAI API error: Invalid API key');
    });

    it('should handle streaming messages from OpenAI API', async () => {
      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
        'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ value: new TextEncoder().encode(mockStreamData[0]), done: false })
          .mockResolvedValueOnce({ value: new TextEncoder().encode(mockStreamData[1]), done: false })
          .mockResolvedValueOnce({ value: new TextEncoder().encode(mockStreamData[2]), done: false })
          .mockResolvedValueOnce({ value: new TextEncoder().encode(mockStreamData[3]), done: false })
          .mockResolvedValueOnce({ value: new TextEncoder().encode(mockStreamData[4]), done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }),
        releaseLock: vi.fn()
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader
        }
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel,
        stream: true
      };

      const streamUpdates: StreamingResponse[] = [];
      const generator = service.streamMessage(request);
      
      for await (const response of generator) {
        streamUpdates.push(response);
      }

      expect(streamUpdates.length).toBeGreaterThan(0);
      expect(streamUpdates[streamUpdates.length - 1].content).toBe('Hello there!');
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should require API key for requests', async () => {
      const serviceWithoutKey = new OpenAIModelService(openaiModel, {});
      
      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel
      };

      await expect(serviceWithoutKey.sendMessage(request)).rejects.toThrow('OpenAI API key not configured');
    });
  });

  describe('AnthropicModelService', () => {
    let service: AnthropicModelService;
    let anthropicModel: AIModel;

    beforeEach(() => {
      anthropicModel = createDefaultModel('anthropic', 'claude-3-sonnet');
      service = new AnthropicModelService(anthropicModel, mockConfig);
    });

    afterEach(async () => {
      await service.disconnect();
    });

    it('should create Anthropic service successfully', () => {
      expect(service).toBeInstanceOf(AnthropicModelService);
      expect(service.getModelInfo()).toEqual(anthropicModel);
    });

    it('should send non-streaming messages to Anthropic API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          content: [
            { text: 'Hello! How can I assist you today?' }
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 20
          },
          stop_reason: 'end_turn',
          model: 'claude-3-sonnet'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request: ModelRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        model: anthropicModel,
        stream: false
      };

      const response = await service.sendMessage(request);

      expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: anthropicModel.name,
          messages: [{ role: 'user', content: 'Hello' }],
          system: 'You are a helpful assistant',
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      });

      expect(response.content).toBe('Hello! How can I assist you today?');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      });
      expect(response.finishReason).toBe('end_turn');
    });

    it('should handle Anthropic API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          error: { message: 'Invalid API key' }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: anthropicModel
      };

      await expect(service.sendMessage(request)).rejects.toThrow('Anthropic API error: Invalid API key');
    });

    it('should require API key for requests', async () => {
      const serviceWithoutKey = new AnthropicModelService(anthropicModel, {});
      
      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: anthropicModel
      };

      await expect(serviceWithoutKey.sendMessage(request)).rejects.toThrow('Anthropic API key not configured');
    });
  });

  describe('ModelServiceFactory', () => {
    it('should create OpenAI service for openai provider', () => {
      const openaiModel = createDefaultModel('openai', 'gpt-4');
      const service = ModelServiceFactory.createService(openaiModel, mockConfig);
      expect(service).toBeInstanceOf(OpenAIModelService);
    });

    it('should create Anthropic service for anthropic provider', () => {
      const anthropicModel = createDefaultModel('anthropic', 'claude-3-sonnet');
      const service = ModelServiceFactory.createService(anthropicModel, mockConfig);
      expect(service).toBeInstanceOf(AnthropicModelService);
    });

    it('should create Mock service for unknown providers', () => {
      const unknownModel = createDefaultModel('unknown', 'test-model');
      const service = ModelServiceFactory.createService(unknownModel, mockConfig);
      expect(service).toBeInstanceOf(MockModelService);
    });

    it('should test connection successfully', async () => {
      const result = await ModelServiceFactory.testConnection(mockModel, mockConfig);
      expect(result).toBe(true);
    });

    it('should handle connection test failures', async () => {
      const invalidModel = createDefaultModel('invalid', 'test');
      const result = await ModelServiceFactory.testConnection(invalidModel, {});
      expect(result).toBe(false);
    });
  });

  describe('Utility functions', () => {
    it('should create default model correctly', () => {
      const model = createDefaultModel('openai', 'gpt-4');
      expect(model).toEqual({
        id: 'openai-gpt-4',
        name: 'gpt-4',
        provider: 'openai',
        type: 'chat',
        isAvailable: false
      });
    });

    it('should create model config with defaults', () => {
      const config = createModelConfig();
      expect(config).toEqual({
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0
      });
    });

    it('should create model config with overrides', () => {
      const config = createModelConfig({
        temperature: 0.5,
        apiKey: 'test-key'
      });
      expect(config).toEqual({
        temperature: 0.5,
        maxTokens: 2048,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        apiKey: 'test-key'
      });
    });

    it('should validate model messages correctly', () => {
      const validMessage: ModelMessage = {
        role: 'user',
        content: 'Hello, how are you?'
      };
      expect(validateModelMessage(validMessage)).toBe(true);

      const invalidRole: ModelMessage = {
        role: 'invalid' as any,
        content: 'Hello'
      };
      expect(validateModelMessage(invalidRole)).toBe(false);

      const emptyContent: ModelMessage = {
        role: 'user',
        content: ''
      };
      expect(validateModelMessage(emptyContent)).toBe(false);

      const whitespaceContent: ModelMessage = {
        role: 'user',
        content: '   '
      };
      expect(validateModelMessage(whitespaceContent)).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      const openaiModel = createDefaultModel('openai', 'gpt-4');
      const service = new OpenAIModelService(openaiModel, mockConfig);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel
      };

      await expect(service.sendMessage(request)).rejects.toThrow();
    });

    it('should handle malformed API responses', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Missing required fields
          id: 'test-id'
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const openaiModel = createDefaultModel('openai', 'gpt-4');
      const service = new OpenAIModelService(openaiModel, mockConfig);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel
      };

      await expect(service.sendMessage(request)).rejects.toThrow('No response from OpenAI API');
    });

    it('should handle JSON parsing errors in API responses', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      mockFetch.mockResolvedValue(mockResponse);

      const openaiModel = createDefaultModel('openai', 'gpt-4');
      const service = new OpenAIModelService(openaiModel, mockConfig);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel
      };

      await expect(service.sendMessage(request)).rejects.toThrow('OpenAI API error: Bad Request');
    });
  });

  describe('Streaming edge cases', () => {
    it('should handle streaming interruption gracefully', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'), done: false })
          .mockRejectedValue(new Error('Stream interrupted')),
        releaseLock: vi.fn()
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader
        }
      };

      mockFetch.mockResolvedValue(mockResponse);

      const openaiModel = createDefaultModel('openai', 'gpt-4');
      const service = new OpenAIModelService(openaiModel, mockConfig);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel,
        stream: true
      };

      const generator = service.streamMessage(request);
      
      await expect(async () => {
        for await (const response of generator) {
          // This should throw when the stream is interrupted
        }
      }).rejects.toThrow('Stream interrupted');

      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should handle empty stream responses', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ value: undefined, done: true }),
        releaseLock: vi.fn()
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader
        }
      };

      mockFetch.mockResolvedValue(mockResponse);

      const openaiModel = createDefaultModel('openai', 'gpt-4');
      const service = new OpenAIModelService(openaiModel, mockConfig);

      const request: ModelRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: openaiModel,
        stream: true
      };

      const streamUpdates: StreamingResponse[] = [];
      const generator = service.streamMessage(request);
      
      for await (const response of generator) {
        streamUpdates.push(response);
      }

      expect(streamUpdates).toHaveLength(0);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });
  });
});