import { BaseModelService, ModelRequest, ModelResponse, StreamingResponse } from '../ModelService';
import { AIModel, ModelConfig, StreamingStatus } from '../../types';

export class OllamaModelService extends BaseModelService {
  private baseUrl: string;
  private abortController?: AbortController;
  private isConnected: boolean = false;

  constructor(model: AIModel, config: ModelConfig = {}) {
    super(model, config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async sendMessage(request: ModelRequest): Promise<ModelResponse> {
    const modelName = this.config.ollamaModel || 'llama2';
    const prompt = this.formatMessagesAsPrompt(request.messages);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: {
            temperature: this.config.temperature || 0.7,
            top_p: this.config.topP || 1,
            num_predict: this.config.maxTokens || 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: this.generateId(),
        content: data.response,
        model: this.model,
        usage: {
          promptTokens: 0, // Ollama doesn't provide token counts
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: 'stop',
      };
    } catch (error) {
      throw this.handleError(error, 'Ollama sendMessage');
    }
  }

  async *streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse> {
    const id = this.generateId();
    const modelName = this.config.ollamaModel || 'llama2';
    const prompt = this.formatMessagesAsPrompt(request.messages);
    
    this.abortController = new AbortController();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: true,
          options: {
            temperature: this.config.temperature || 0.7,
            top_p: this.config.topP || 1,
            num_predict: this.config.maxTokens || 2048,
          },
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      
      // Yield initial streaming response
      yield this.createStreamingResponse(id, '', 'streaming');
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                accumulatedContent += data.response;
                yield this.createStreamingResponse(id, accumulatedContent, 'streaming');
              }
              
              if (data.done) {
                reader.releaseLock();
                return {
                  id,
                  content: accumulatedContent,
                  model: this.model,
                  usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                  },
                  finishReason: 'stop',
                };
              }
            } catch (e) {
              // Skip invalid JSON lines
              console.warn('Failed to parse Ollama response line:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      // Return final response
      return {
        id,
        content: accumulatedContent,
        model: this.model,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        finishReason: 'stop',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        yield this.createStreamingResponse(id, '', 'cancelled');
        throw new Error('Stream cancelled');
      }
      yield this.createStreamingResponse(id, '', 'error', error instanceof Error ? error.message : 'Unknown error');
      throw this.handleError(error, 'Ollama streamMessage');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      this.isConnected = response.ok;
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  getModelInfo(): AIModel {
    return this.model;
  }

  validateConfig(config: ModelConfig): boolean {
    // Ollama doesn't require API keys
    return true;
  }

  async disconnect(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
    this.isConnected = false;
  }

  private formatMessagesAsPrompt(messages: ModelRequest['messages']): string {
    return messages
      .map(msg => {
        switch (msg.role) {
          case 'system':
            return `System: ${msg.content}`;
          case 'user':
            return `User: ${msg.content}`;
          case 'assistant':
            return `Assistant: ${msg.content}`;
          default:
            return msg.content;
        }
      })
      .join('\n\n') + '\n\nAssistant:';
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}