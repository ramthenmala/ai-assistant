// Core data types for the AI Chat Assistant

export interface MessageVersion {
  id: string;
  content: string;
  timestamp: Date;
  editReason?: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  base64Data?: string;
  thumbnailUrl?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  processingStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  extractedText?: string;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isEdited: boolean;
  isBookmarked?: boolean;
  parentId?: string;
  branchId?: string;
  metadata?: Record<string, any>;
  versions?: MessageVersion[];
  editedAt?: Date;
  attachments?: MediaAttachment[];
  hasVisionContent?: boolean;
}

export interface Branch {
  id: string;
  parentMessageId: string;
  messages: Message[];
  title?: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  folderId?: string;
  messages: Message[];
  branches: Branch[];
  activeKnowledgeStacks: string[];
  metadata?: Record<string, any>;
}

export interface PromptVersion {
  id: string;
  version: number;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  createdAt: Date;
  createdBy?: string;
  changelog?: string;
}

export interface PromptVariable {
  name: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  description?: string;
  required?: boolean;
  defaultValue?: string;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface SavedPrompt {
  id: string;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  isFavorite: boolean;
  isShared?: boolean;
  isTemplate?: boolean;
  versions?: PromptVersion[];
  currentVersion?: number;
  variables?: PromptVariable[];
  metadata?: {
    estimatedTokens?: number;
    idealModels?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    performance?: {
      avgResponseTime?: number;
      successRate?: number;
      userRating?: number;
    };
  };
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'url';
  path: string;
  stackId: string;
  status: 'indexing' | 'ready' | 'error';
  indexedAt?: Date;
  size: number;
  chunkCount?: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeStack {
  id: string;
  name: string;
  description?: string;
  sources: KnowledgeSource[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  type: 'chat' | 'completion';
  isAvailable: boolean;
  config?: ModelConfig;
  supportsVision?: boolean;
  supportedMediaTypes?: string[];
}

export interface ModelConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  apiKeys: Record<string, string>;
  privacySettings: PrivacySettings;
  uiPreferences: UIPreferences;
}

export interface PrivacySettings {
  shareUsageData: boolean;
  localProcessingOnly: boolean;
  saveConversations: boolean;
}

export interface UIPreferences {
  sidebarCollapsed: boolean;
  fontSize: 'small' | 'medium' | 'large';
  messageSpacing: 'compact' | 'comfortable';
  showTimestamps: boolean;
}

// Utility types
export type ChatFolder = {
  id: string;
  name: string;
  parentId?: string;
  chatIds: string[];
  createdAt: Date;
};

export type StreamingStatus = 'idle' | 'streaming' | 'complete' | 'error';

export type ViewMode = 'single' | 'split';

export type PlatformType = 'web' | 'electron';

// Enhanced prompt library types
export interface PromptCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  promptCount?: number;
  createdAt: Date;
}

export interface PromptTemplate {
  id: string;
  title: string;
  description?: string;
  content: string;
  variables: PromptVariable[];
  category?: string;
  tags: string[];
  isPublic?: boolean;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating?: number;
  reviewCount?: number;
}

export interface PromptExecution {
  id: string;
  promptId: string;
  variableValues: Record<string, string>;
  resolvedContent: string;
  modelId: string;
  responseTime?: number;
  success: boolean;
  error?: string;
  executedAt: Date;
}

export interface PromptSuggestion {
  id: string;
  content: string;
  context: string;
  relevanceScore: number;
  source: 'template' | 'history' | 'ai_generated';
  metadata?: Record<string, any>;
}

// SDLC Integration
export interface SDLCMetadata {
  categoryId: string;
  confidence: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTime: number;
  requiredKnowledge: string[];
  bestPractices: string[];
  potentialRisks: string[];
  processingTime: number;
}