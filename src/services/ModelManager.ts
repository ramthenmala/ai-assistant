// Model Manager for handling multiple AI models and integration with chat store
import type { AIModel, ModelConfig, Message } from '../types';
import { 
  BaseModelService, 
  ModelServiceFactory, 
  createDefaultModel,
  createModelConfig,
  validateModelMessage
} from './ModelService';
import type { 
  ModelRequest, 
  ModelResponse, 
  StreamingResponse
} from './ModelService';

export interface ModelManagerConfig {
  defaultModel?: AIModel;
  autoRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface ChatContext {
  chatId: string;
  messages: Message[];
  activeModel: AIModel;
  knowledgeStacks?: string[];
}

export interface SendMessageOptions {
  stream?: boolean;
  onStreamUpdate?: (messageId: string, content: string) => void;
  onComplete?: (messageId: string, response: ModelResponse) => void;
  onError?: (messageId: string, error: Error) => void;
  timeout?: number;
}

export class ModelManager {
  private services: Map<string, BaseModelService> = new Map();
  private _config: ModelManagerConfig;
  private defaultModel: AIModel;

  constructor(config: ModelManagerConfig = {}) {
    this._config = {
      autoRetry: true,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...config,
    };

    // Set up default model (mock for now)
    this.defaultModel = config.defaultModel || createDefaultModel('mock', 'Default Assistant');
    this.initializeDefaultService();
  }

  private async initializeDefaultService(): Promise<void> {
    const service = ModelServiceFactory.createService(this.defaultModel, createModelConfig());
    this.services.set(this.defaultModel.id, service);
  }

  async addModel(model: AIModel, config: ModelConfig = {}): Promise<boolean> {
    try {
      const service = ModelServiceFactory.createService(model, config);
      const isAvailable = await service.isAvailable();
      
      if (isAvailable) {
        this.services.set(model.id, service);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to add model ${model.id}:`, error);
      return false;
    }
  }

  async removeModel(modelId: string): Promise<void> {
    const service = this.services.get(modelId);
    if (service) {
      await service.disconnect();
      this.services.delete(modelId);
    }
  }

  async sendMessage(
    context: ChatContext,
    userMessage: string,
    options: SendMessageOptions = {}
  ): Promise<string> {
    const service = this.services.get(context.activeModel.id);
    if (!service) {
      throw new Error(`Model ${context.activeModel.id} not available`);
    }

    // Generate message ID
    const messageId = this.generateMessageId();

    // Convert chat messages to model format
    const modelMessages = this.convertMessagesToModelFormat([
      ...context.messages,
      { 
        id: messageId, 
        content: userMessage, 
        role: 'user' as const, 
        timestamp: new Date(), 
        isEdited: false 
      }
    ]);

    const request: ModelRequest = {
      messages: modelMessages,
      model: context.activeModel,
      stream: options.stream || false,
      onStreamUpdate: options.onStreamUpdate ? (response: StreamingResponse) => {
        options.onStreamUpdate!(messageId, response.content);
      } : undefined,
      onComplete: options.onComplete ? (response: StreamingResponse) => {
        options.onComplete!(messageId, {
          id: response.id,
          content: response.content,
          model: context.activeModel,
          finishReason: 'stop',
        });
      } : undefined,
      onError: options.onError ? (error: Error) => {
        options.onError!(messageId, error);
      } : undefined,
    };

    if (options.stream) {
      return await this.handleStreamingRequest(service, request, messageId);
    } else {
      return await this.handleNonStreamingRequest(service, request, messageId);
    }
  }

  async sendMessageToMultipleModels(
    context: ChatContext,
    userMessage: string,
    modelIds: string[],
    options: SendMessageOptions = {}
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const promises = modelIds.map(async (modelId) => {
      const service = this.services.get(modelId);
      if (!service) {
        throw new Error(`Model ${modelId} not available`);
      }

      const model = service.getModelInfo();
      const contextWithModel = { ...context, activeModel: model };
      
      try {
        const messageId = await this.sendMessage(contextWithModel, userMessage, options);
        results.set(modelId, messageId);
      } catch (error) {
        console.error(`Failed to send message to model ${modelId}:`, error);
        if (options.onError) {
          options.onError(modelId, error as Error);
        }
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  private async handleStreamingRequest(
    service: BaseModelService,
    request: ModelRequest,
    messageId: string
  ): Promise<string> {
    try {
      const generator = service.streamMessage(request);
      
      for await (const response of generator) {
        if (request.onStreamUpdate) {
          request.onStreamUpdate(response);
        }
      }

      return messageId;
    } catch (error) {
      if (request.onError) {
        request.onError(error as Error);
      }
      throw error;
    }
  }

  private async handleNonStreamingRequest(
    service: BaseModelService,
    request: ModelRequest,
    messageId: string
  ): Promise<string> {
    try {
      const response = await service.sendMessage(request);
      
      if (request.onComplete) {
        request.onComplete({
          id: response.id,
          content: response.content,
          status: 'complete',
        });
      }

      return messageId;
    } catch (error) {
      if (request.onError) {
        request.onError(error as Error);
      }
      throw error;
    }
  }

  private convertMessagesToModelFormat(messages: Message[]): Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }> {
    return messages
      .filter(msg => validateModelMessage({
        role: msg.role,
        content: msg.content,
      }))
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
  }

  async getAvailableModels(): Promise<AIModel[]> {
    const models: AIModel[] = [];
    
    for (const [modelId, service] of this.services) {
      try {
        const isAvailable = await service.isAvailable();
        const modelInfo = service.getModelInfo();
        models.push({
          ...modelInfo,
          isAvailable,
        });
      } catch (error) {
        console.error(`Failed to check availability for model ${modelId}:`, error);
      }
    }

    return models;
  }

  async testModelConnection(modelId: string): Promise<boolean> {
    const service = this.services.get(modelId);
    if (!service) {
      return false;
    }

    try {
      return await service.isAvailable();
    } catch (error) {
      console.error(`Model connection test failed for ${modelId}:`, error);
      return false;
    }
  }

  async updateModelConfig(modelId: string, config: ModelConfig): Promise<boolean> {
    const service = this.services.get(modelId);
    if (!service) {
      return false;
    }

    try {
      const isValid = service.validateConfig(config);
      if (isValid) {
        // For now, we'll need to recreate the service with new config
        // This could be optimized in the future
        await service.disconnect();
        const model = service.getModelInfo();
        const newService = ModelServiceFactory.createService(model, config);
        this.services.set(modelId, newService);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to update config for model ${modelId}:`, error);
      return false;
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.services.values()).map(service => 
      service.disconnect()
    );
    
    await Promise.allSettled(disconnectPromises);
    this.services.clear();
  }

  getModelById(modelId: string): AIModel | undefined {
    const service = this.services.get(modelId);
    return service?.getModelInfo();
  }

  getDefaultModel(): AIModel {
    return this.defaultModel;
  }

  setDefaultModel(model: AIModel): void {
    this.defaultModel = model;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for integration with chat store
  async regenerateMessage(
    context: ChatContext,
    messageToRegenerate: Message,
    options: SendMessageOptions = {}
  ): Promise<string> {
    // Get messages up to the message to regenerate
    const messageIndex = context.messages.findIndex(msg => msg.id === messageToRegenerate.id);
    if (messageIndex === -1) {
      throw new Error('Message not found in context');
    }

    // Get the user message that prompted this response
    const userMessage = context.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Cannot regenerate message: no user prompt found');
    }

    // Create context with messages up to the user message
    const contextForRegeneration = {
      ...context,
      messages: context.messages.slice(0, messageIndex),
    };

    return await this.sendMessage(contextForRegeneration, userMessage.content, options);
  }

  async continueConversation(
    context: ChatContext,
    options: SendMessageOptions = {}
  ): Promise<string> {
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Cannot continue conversation: last message is not from user');
    }

    return await this.sendMessage(context, lastMessage.content, options);
  }
}

// Singleton instance for global access
export const modelManager = new ModelManager();

// Utility function to create chat context
export const createChatContext = (
  chatId: string,
  messages: Message[],
  activeModel: AIModel,
  knowledgeStacks?: string[]
): ChatContext => ({
  chatId,
  messages,
  activeModel,
  knowledgeStacks,
});

// Utility function to create send message options
export const createSendMessageOptions = (
  partial: Partial<SendMessageOptions> = {}
): SendMessageOptions => ({
  stream: true,
  timeout: 30000,
  ...partial,
});