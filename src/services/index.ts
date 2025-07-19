// Service interfaces for the AI Chat Assistant

import type { 
  Chat, 
  Message, 
  SavedPrompt, 
  KnowledgeSource, 
  KnowledgeStack, 
  AIModel, 
  ModelConfig,
  AppSettings 
} from '../types';

// Chat Service Interface
export interface IChatService {
  // Chat management
  createChat(title?: string): Promise<string>;
  getChat(chatId: string): Promise<Chat | null>;
  getAllChats(): Promise<Chat[]>;
  updateChat(chatId: string, updates: Partial<Chat>): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  
  // Message management
  addMessage(chatId: string, message: Omit<Message, 'id'>): Promise<string>;
  updateMessage(chatId: string, messageId: string, content: string): Promise<void>;
  deleteMessage(chatId: string, messageId: string): Promise<void>;
  
  // Branch management
  createBranch(chatId: string, fromMessageId: string): Promise<string>;
  switchBranch(chatId: string, branchId: string): Promise<void>;
}

// AI Model Service Interface
export interface IModelService {
  // Model management
  getAvailableModels(): Promise<AIModel[]>;
  getModel(modelId: string): Promise<AIModel | null>;
  updateModelConfig(modelId: string, config: Partial<ModelConfig>): Promise<void>;
  
  // Chat completion
  sendMessage(
    modelId: string, 
    messages: Message[], 
    config?: Partial<ModelConfig>
  ): Promise<AsyncIterable<string>>;
  
  // Model status
  checkModelAvailability(modelId: string): Promise<boolean>;
  validateApiKey(provider: string, apiKey: string): Promise<boolean>;
}

// Storage Service Interface
export interface IStorageService {
  // Generic storage operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // Batch operations
  getMany<T>(keys: string[]): Promise<(T | null)[]>;
  setMany<T>(items: Record<string, T>): Promise<void>;
  
  // Database operations (for complex data)
  query<T>(table: string, conditions?: Record<string, any>): Promise<T[]>;
  insert<T>(table: string, data: T): Promise<string>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<void>;
  delete(table: string, id: string): Promise<void>;
}

// Prompt Service Interface
export interface IPromptService {
  // Prompt management
  createPrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getPrompt(promptId: string): Promise<SavedPrompt | null>;
  getAllPrompts(): Promise<SavedPrompt[]>;
  updatePrompt(promptId: string, updates: Partial<SavedPrompt>): Promise<void>;
  deletePrompt(promptId: string): Promise<void>;
  
  // Search and filtering
  searchPrompts(query: string): Promise<SavedPrompt[]>;
  getPromptsByTag(tag: string): Promise<SavedPrompt[]>;
  getFavoritePrompts(): Promise<SavedPrompt[]>;
  
  // Usage tracking
  incrementUsage(promptId: string): Promise<void>;
}

// Knowledge Service Interface
export interface IKnowledgeService {
  // Source management
  addSource(source: Omit<KnowledgeSource, 'id'>): Promise<string>;
  getSource(sourceId: string): Promise<KnowledgeSource | null>;
  getAllSources(): Promise<KnowledgeSource[]>;
  updateSource(sourceId: string, updates: Partial<KnowledgeSource>): Promise<void>;
  deleteSource(sourceId: string): Promise<void>;
  
  // Stack management
  createStack(stack: Omit<KnowledgeStack, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getStack(stackId: string): Promise<KnowledgeStack | null>;
  getAllStacks(): Promise<KnowledgeStack[]>;
  updateStack(stackId: string, updates: Partial<KnowledgeStack>): Promise<void>;
  deleteStack(stackId: string): Promise<void>;
  
  // File processing
  processFile(filePath: string, stackId: string): Promise<void>;
  indexSource(sourceId: string): Promise<void>;
  
  // RAG operations
  searchKnowledge(query: string, stackIds: string[]): Promise<any[]>;
}

// Settings Service Interface
export interface ISettingsService {
  // Settings management
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>): Promise<void>;
  resetSettings(): Promise<void>;
  
  // Theme management
  setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void>;
  getTheme(): Promise<'light' | 'dark' | 'auto'>;
  
  // API key management
  setApiKey(provider: string, key: string): Promise<void>;
  getApiKey(provider: string): Promise<string | null>;
  removeApiKey(provider: string): Promise<void>;
}

// Export service factory type
export interface ServiceContainer {
  chatService: IChatService;
  modelService: IModelService;
  storageService: IStorageService;
  promptService: IPromptService;
  knowledgeService: IKnowledgeService;
  settingsService: ISettingsService;
}

// Export concrete implementations
export * from './storage/StorageFactory';
export * from './storage/BaseStorageService';
export * from './storage/IndexedDBStorageService';
export * from './storage/SqliteStorageService';
export * from './ModelService';
export * from './ModelManager';