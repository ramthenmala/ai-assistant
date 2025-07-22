// Vision Model Service for handling image analysis with AI models
import { BaseModelService } from './ModelService';
import type { ModelRequest, ModelResponse, StreamingResponse } from './ModelService';
import type { AIModel, ModelConfig, MediaAttachment } from '../types';

interface VisionContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

interface OpenAIVisionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | VisionContent[];
}

interface AnthropicVisionContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface AnthropicVisionMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicVisionContent[];
}

export class OpenAIVisionService extends BaseModelService {
  private apiKey: string;
  private baseUrl: string;

  constructor(model: AIModel, config: ModelConfig = {}) {
    super(model, config);
    this.apiKey = config.apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async sendMessage(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const messages = this.formatMessagesForOpenAI(request.messages);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model.id,
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
        top_p: this.config.topP || 1,
        frequency_penalty: this.config.frequencyPenalty || 0,
        presence_penalty: this.config.presencePenalty || 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      content: data.choices[0].message.content,
      model: this.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: data.choices[0].finish_reason,
    };
  }

  async *streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const messages = this.formatMessagesForOpenAI(request.messages);
    const id = this.generateId();
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model.id,
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    let fullContent = '';
    let usage = undefined;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield this.createStreamingResponse(id, fullContent, 'complete');
              return {
                id,
                content: fullContent,
                model: this.model,
                usage,
              };
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                yield this.createStreamingResponse(id, fullContent, 'streaming');
              }
              
              if (parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                };
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      id,
      content: fullContent,
      model: this.model,
      usage,
    };
  }

  private formatMessagesForOpenAI(messages: Array<{ role: string; content: string; attachments?: MediaAttachment[] }>): OpenAIVisionMessage[] {
    return messages.map(message => {
      if (message.attachments && message.attachments.length > 0) {
        const content: VisionContent[] = [];
        
        // Add text content
        if (message.content) {
          content.push({ type: 'text', text: message.content });
        }
        
        // Add image attachments
        message.attachments.forEach(attachment => {
          if (attachment.type === 'image' && attachment.base64Data) {
            content.push({
              type: 'image_url',
              image_url: {
                url: attachment.base64Data,
                detail: 'high'
              }
            });
          }
        });
        
        return {
          role: message.role as 'user' | 'assistant' | 'system',
          content
        };
      }
      
      return {
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content
      };
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getModelInfo(): AIModel {
    return {
      ...this.model,
      supportsVision: true,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    };
  }

  validateConfig(config: ModelConfig): boolean {
    return !!config.apiKey;
  }

  async disconnect(): Promise<void> {
    // No persistent connection to close
  }
}

export class AnthropicVisionService extends BaseModelService {
  private apiKey: string;
  private baseUrl: string;

  constructor(model: AIModel, config: ModelConfig = {}) {
    super(model, config);
    this.apiKey = config.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  async sendMessage(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const messages = this.formatMessagesForAnthropic(request.messages);
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model.id,
        messages,
        max_tokens: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7,
        top_p: this.config.topP || 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      content: data.content[0].text,
      model: this.model,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      finishReason: data.stop_reason,
    };
  }

  async *streamMessage(request: ModelRequest): AsyncGenerator<StreamingResponse, ModelResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const messages = this.formatMessagesForAnthropic(request.messages);
    const id = this.generateId();
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model.id,
        messages,
        max_tokens: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    let fullContent = '';
    let usage = undefined;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text;
                if (delta) {
                  fullContent += delta;
                  yield this.createStreamingResponse(id, fullContent, 'streaming');
                }
              } else if (parsed.type === 'message_delta') {
                if (parsed.usage) {
                  usage = {
                    promptTokens: parsed.usage.input_tokens || 0,
                    completionTokens: parsed.usage.output_tokens || 0,
                    totalTokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0),
                  };
                }
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield this.createStreamingResponse(id, fullContent, 'complete');
    return {
      id,
      content: fullContent,
      model: this.model,
      usage,
    };
  }

  private formatMessagesForAnthropic(messages: Array<{ role: string; content: string; attachments?: MediaAttachment[] }>): AnthropicVisionMessage[] {
    return messages
      .filter(message => message.role !== 'system') // Anthropic handles system messages differently
      .map(message => {
        if (message.attachments && message.attachments.length > 0) {
          const content: AnthropicVisionContent[] = [];
          
          // Add text content
          if (message.content) {
            content.push({ type: 'text', text: message.content });
          }
          
          // Add image attachments
          message.attachments.forEach(attachment => {
            if (attachment.type === 'image' && attachment.base64Data) {
              // Remove data URL prefix for Anthropic
              const base64Data = attachment.base64Data.split(',')[1];
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: attachment.mimeType,
                  data: base64Data
                }
              });
            }
          });
          
          return {
            role: message.role as 'user' | 'assistant',
            content
          };
        }
        
        return {
          role: message.role as 'user' | 'assistant',
          content: message.content
        };
      });
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  getModelInfo(): AIModel {
    return {
      ...this.model,
      supportsVision: true,
      supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    };
  }

  validateConfig(config: ModelConfig): boolean {
    return !!config.apiKey;
  }

  async disconnect(): Promise<void> {
    // No persistent connection to close
  }
}

// Factory function to create vision-enabled model services
export const createVisionModelService = (model: AIModel, config: ModelConfig) => {
  if (model.provider === 'openai' && model.supportsVision) {
    return new OpenAIVisionService(model, config);
  } else if (model.provider === 'anthropic' && model.supportsVision) {
    return new AnthropicVisionService(model, config);
  } else {
    throw new Error(`Vision not supported for provider: ${model.provider}`);
  }
};

export default { OpenAIVisionService, AnthropicVisionService, createVisionModelService };