// Model Service for AI communication with streaming support
import type { AIModel, ModelConfig, StreamingStatus } from '../types';

export interface StreamingResponse {
  id: string;
  content: string;
  status: StreamingStatus;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ModelRequest {
  messages: ModelMessage[];
  model: AIModel;
  config?: ModelConfig;
  stream?: boolean;
  onStreamUpdate?: (response: StreamingResponse) => void;
  onComplete?: (response: StreamingResponse) => void;
  onError?: (error: Error) => void;
}

export interface ModelResponse {
  id: string;
  content: string;
  model: AIModel;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  metadata?: Record<string, any>;
}

export abstract class BaseModelService {
  protected model: AIModel;
  protected config: ModelConfig;

  constructor(model: AIModel, config: ModelConfig = {}) {
    this.model = model;
    this.config = config;
  }

  abstract sendMessage(request: ModelRequest): Promise<ModelResponse>;
  abstract streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse>;
  abstract isAvailable(): Promise<boolean>;
  abstract getModelInfo(): AIModel;
  abstract validateConfig(config: ModelConfig): boolean;
  abstract disconnect(): Promise<void>;

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createStreamingResponse(
    id: string,
    content: string,
    status: StreamingStatus,
    error?: string,
    metadata?: Record<string, any>
  ): StreamingResponse {
    return {
      id,
      content,
      status,
      error,
      metadata,
    };
  }

  protected handleError(error: unknown, context: string = 'Model operation'): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: ${String(error)}`);
  }
}

// Mock Model Service for development and testing
export class MockModelService extends BaseModelService {
  private isConnected = false;
  private responseDelay = 50; // ms between tokens
  private simulatedResponses: string[] = [
    "This is a simulated response from the AI model.",
    "I'm a mock service designed for testing the streaming functionality.",
    "Here's another example response that demonstrates token-by-token streaming.",
    "The streaming system allows for real-time display of AI responses as they're generated.",
  ];

  constructor(model: AIModel, config: ModelConfig = {}) {
    super(model, config);
    this.isConnected = true;
  }

  async sendMessage(request: ModelRequest): Promise<ModelResponse> {
    if (!this.isConnected) {
      throw new Error('Model service not connected');
    }

    const id = this.generateId();
    const response = this.getSimulatedResponse(request);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      id,
      content: response,
      model: this.model,
      usage: {
        promptTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0),
        completionTokens: response.length,
        totalTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0) + response.length,
      },
      finishReason: 'stop',
      metadata: {
        provider: 'mock',
        timestamp: new Date().toISOString(),
      },
    };
  }

  async* streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse> {
    if (!this.isConnected) {
      throw new Error('Model service not connected');
    }

    const id = this.generateId();
    const fullResponse = this.getSimulatedResponse(request);
    
    // Simulate streaming token by token
    let currentContent = '';
    const words = fullResponse.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      // Add word and space (except for last word)
      currentContent += words[i] + (i < words.length - 1 ? ' ' : '');
      
      const streamResponse = this.createStreamingResponse(
        id,
        currentContent,
        'streaming',
        undefined,
        {
          provider: 'mock',
          progress: (i + 1) / words.length,
          wordIndex: i,
        }
      );

      // Call callback if provided
      if (request.onStreamUpdate) {
        request.onStreamUpdate(streamResponse);
      }

      yield streamResponse;
      
      // Simulate delay between tokens
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    // Final response
    const finalResponse: ModelResponse = {
      id,
      content: currentContent,
      model: this.model,
      usage: {
        promptTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0),
        completionTokens: currentContent.length,
        totalTokens: request.messages.reduce((acc, msg) => acc + msg.content.length, 0) + currentContent.length,
      },
      finishReason: 'stop',
      metadata: {
        provider: 'mock',
        timestamp: new Date().toISOString(),
      },
    };

    // Call completion callback if provided
    if (request.onComplete) {
      request.onComplete(this.createStreamingResponse(id, currentContent, 'complete'));
    }

    return finalResponse;
  }

  async isAvailable(): Promise<boolean> {
    return this.isConnected;
  }

  getModelInfo(): AIModel {
    return this.model;
  }

  validateConfig(_config: ModelConfig): boolean {
    // Mock validation - always valid
    return true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  private getSimulatedResponse(request: ModelRequest): string {
    const lastMessage = request.messages[request.messages.length - 1];
    const messageLength = lastMessage.content.length;
    
    // Select response based on message characteristics
    let responseIndex = 0;
    if (messageLength > 100) {
      responseIndex = 3; // Longer response for longer input
    } else if (messageLength > 50) {
      responseIndex = 2;
    } else if (messageLength > 20) {
      responseIndex = 1;
    }
    
    return this.simulatedResponses[responseIndex];
  }

  // Development utilities
  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  addSimulatedResponse(response: string): void {
    this.simulatedResponses.push(response);
  }

  setSimulatedResponses(responses: string[]): void {
    this.simulatedResponses = responses;
  }
}

// OpenAI Model Service (placeholder for future implementation)
export class OpenAIModelService extends BaseModelService {
  private apiKey: string;
  private _baseUrl: string;

  constructor(model: AIModel, config: ModelConfig = {}) {
    super(model, config);
    this.apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async sendMessage(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this._baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model.name,
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        top_p: this.config.topP || 1,
        frequency_penalty: this.config.frequencyPenalty || 0,
        presence_penalty: this.config.presencePenalty || 0,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice) {
      throw new Error('No response from OpenAI API');
    }

    return {
      id: this.generateId(),
      content: choice.message?.content || '',
      model: this.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: choice.finish_reason || 'stop',
      metadata: {
        provider: 'openai',
        model: data.model,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async* streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this._baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model.name,
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        top_p: this.config.topP || 1,
        frequency_penalty: this.config.frequencyPenalty || 0,
        presence_penalty: this.config.presencePenalty || 0,
        stream: true
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from OpenAI API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const id = this.generateId();
    let currentContent = '';
    let usage: any = undefined;
    let finishReason = 'stop';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Stream complete
              const finalResponse = this.createStreamingResponse(
                id,
                currentContent,
                'complete',
                undefined,
                {
                  provider: 'openai',
                  model: this.model.name,
                  timestamp: new Date().toISOString(),
                }
              );
              
              if (request.onComplete) {
                request.onComplete(finalResponse);
              }
              
              return {
                id,
                content: currentContent,
                model: this.model,
                usage,
                finishReason,
                metadata: {
                  provider: 'openai',
                  model: this.model.name,
                  timestamp: new Date().toISOString(),
                },
              };
            }
            
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              
              if (choice?.delta?.content) {
                currentContent += choice.delta.content;
                
                const streamResponse = this.createStreamingResponse(
                  id,
                  currentContent,
                  'streaming',
                  undefined,
                  {
                    provider: 'openai',
                    model: parsed.model,
                    timestamp: new Date().toISOString(),
                  }
                );
                
                if (request.onStreamUpdate) {
                  request.onStreamUpdate(streamResponse);
                }
                
                yield streamResponse;
              }
              
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
              
              if (parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                };
              }
            } catch (parseError) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Return final response
    return {
      id,
      content: currentContent,
      model: this.model,
      usage,
      finishReason,
      metadata: {
        provider: 'openai',
        model: this.model.name,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  getModelInfo(): AIModel {
    return this.model;
  }

  validateConfig(config: ModelConfig): boolean {
    return Boolean(config.apiKey);
  }

  async disconnect(): Promise<void> {
    // No cleanup needed for HTTP-based service
  }
}

// Anthropic Model Service for Claude API
export class AnthropicModelService extends BaseModelService {
  private apiKey: string;
  private _baseUrl: string;

  constructor(model: AIModel, config: ModelConfig = {}) {
    super(model, config);
    this.apiKey = config.apiKey || '';
    this._baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  async sendMessage(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch(`${this._baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model.name,
        messages: request.messages.filter(msg => msg.role !== 'system').map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        system: request.messages.find(msg => msg.role === 'system')?.content,
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.content?.[0]?.text) {
      throw new Error('No response from Anthropic API');
    }

    return {
      id: this.generateId(),
      content: data.content[0].text,
      model: this.model,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      finishReason: data.stop_reason || 'stop',
      metadata: {
        provider: 'anthropic',
        model: data.model,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async* streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch(`${this._baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model.name,
        messages: request.messages.filter(msg => msg.role !== 'system').map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        system: request.messages.find(msg => msg.role === 'system')?.content,
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.7,
        stream: true
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Anthropic API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const id = this.generateId();
    let currentContent = '';
    let usage: any = undefined;
    let finishReason = 'stop';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                currentContent += parsed.delta.text;
                
                const streamResponse = this.createStreamingResponse(
                  id,
                  currentContent,
                  'streaming',
                  undefined,
                  {
                    provider: 'anthropic',
                    model: this.model.name,
                    timestamp: new Date().toISOString(),
                  }
                );
                
                if (request.onStreamUpdate) {
                  request.onStreamUpdate(streamResponse);
                }
                
                yield streamResponse;
              }
              
              if (parsed.type === 'message_stop') {
                finishReason = 'stop';
                break;
              }
              
              if (parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.input_tokens,
                  completionTokens: parsed.usage.output_tokens,
                  totalTokens: parsed.usage.input_tokens + parsed.usage.output_tokens,
                };
              }
            } catch (parseError) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Final response
    const finalResponse = this.createStreamingResponse(
      id,
      currentContent,
      'complete',
      undefined,
      {
        provider: 'anthropic',
        model: this.model.name,
        timestamp: new Date().toISOString(),
      }
    );
    
    if (request.onComplete) {
      request.onComplete(finalResponse);
    }

    return {
      id,
      content: currentContent,
      model: this.model,
      usage,
      finishReason,
      metadata: {
        provider: 'anthropic',
        model: this.model.name,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  getModelInfo(): AIModel {
    return this.model;
  }

  validateConfig(config: ModelConfig): boolean {
    return Boolean(config.apiKey);
  }

  async disconnect(): Promise<void> {
    // No cleanup needed for HTTP-based service
  }
}

// Model Service Factory
export class ModelServiceFactory {
  static createService(model: AIModel, config: ModelConfig = {}): BaseModelService {
    switch (model.provider) {
      case 'openai':
        return new OpenAIModelService(model, config);
      case 'anthropic':
        return new AnthropicModelService(model, config);
      case 'local':
      case 'custom':
      default:
        return new MockModelService(model, config);
    }
  }

  static async testConnection(model: AIModel, config: ModelConfig = {}): Promise<boolean> {
    try {
      const service = ModelServiceFactory.createService(model, config);
      return await service.isAvailable();
    } catch (error) {
      console.error('Model connection test failed:', error);
      return false;
    }
  }
}

// Utility functions for model management
export const createDefaultModel = (provider: string, name: string): AIModel => ({
  id: `${provider}-${name}`,
  name,
  provider: provider as AIModel['provider'],
  type: 'chat',
  isAvailable: false,
});

export const createModelConfig = (partial: Partial<ModelConfig> = {}): ModelConfig => ({
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  ...partial,
});

export const validateModelMessage = (message: ModelMessage): boolean => {
  return Boolean(
    message.role &&
    ['user', 'assistant', 'system'].includes(message.role) &&
    message.content &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
};