// SDLC (Software Development Life Cycle) categorization system types

export interface SDLCModelInfo {
  id: string;
  name: string;
  cost: 'free' | 'medium' | 'premium';
  strength: string;
}

export interface SDLCCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tasks: string[];
  primaryModels: SDLCModelInfo[];
  secondaryModels: SDLCModelInfo[];
  keywords: string[];
  aiModelPreferences: {
    primary: string;
    secondary: string[];
    temperature: number;
    maxTokens: number;
    specialPrompts: string[];
  };
  metrics: {
    accuracyScore: number;
    avgResponseTime: number;
    userSatisfaction: number;
    totalTasks: number;
  };
}

export interface SDLCSubCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  prompts: string[];
  examples: string[];
}

export interface SDLCTaskClassification {
  categoryId: string;
  subCategoryId?: string;
  confidence: number;
  reasoning: string;
  suggestedModel: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTime: number; // in minutes
  requiredKnowledge: string[];
}

export interface SDLCTaskAnalysis {
  originalQuery: string;
  classification: SDLCTaskClassification;
  enhancedPrompt: string;
  contextualHints: string[];
  relatedDocumentation: string[];
  bestPractices: string[];
  potentialRisks: string[];
  successCriteria: string[];
}

export interface SDLCModelConfiguration {
  modelId: string;
  categoryId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stopSequences: string[];
  customInstructions: string[];
}

export interface SDLCWorkflowStep {
  id: string;
  name: string;
  description: string;
  category: string;
  prerequisites: string[];
  deliverables: string[];
  estimatedTime: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  automationLevel: 'manual' | 'assisted' | 'automated';
}

export interface SDLCProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'desktop' | 'api' | 'ml' | 'devops';
  workflow: SDLCWorkflowStep[];
  recommendedModels: Record<string, string>;
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  requiredSkills: string[];
}

export interface SDLCMetrics {
  categoryId: string;
  totalTasks: number;
  completedTasks: number;
  avgAccuracy: number;
  avgResponseTime: number;
  userSatisfaction: number;
  mostUsedModels: Array<{
    modelId: string;
    usageCount: number;
    successRate: number;
  }>;
  commonPatterns: Array<{
    pattern: string;
    frequency: number;
    successRate: number;
  }>;
}

export interface SDLCRoutingDecision {
  taskId: string;
  originalQuery: string;
  selectedCategory: string;
  selectedModel: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    category: string;
    model: string;
    confidence: number;
  }>;
  processingTime: number;
  timestamp: Date;
}

export type SDLCCategoryType = 
  | 'planning'
  | 'development' 
  | 'testing'
  | 'ui-ux'
  | 'documentation'
  | 'deployment'
  | 'quality-assurance';

export interface SDLCInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'optimization' | 'warning';
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  data: Record<string, any>;
  createdAt: Date;
}

export interface SDLCSettings {
  autoClassification: boolean;
  confidenceThreshold: number;
  enableModelRouting: boolean;
  learningMode: boolean;
  collectMetrics: boolean;
  showAlternatives: boolean;
  enableInsights: boolean;
  maxHistorySize: number;
}