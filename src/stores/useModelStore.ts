// Model store for managing AI models and configurations
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIModel, ModelConfig } from '../types';
import { storage } from '../utils';
import { modelManager } from '../services/ModelManager';
import { createDefaultModel, createModelConfig } from '../services/ModelService';

interface ModelState {
  availableModels: AIModel[];
  activeModels: string[];
  modelConfigs: Record<string, ModelConfig>;
  defaultModel: string | null;
  isLoadingModels: boolean;
}

interface ModelActions {
  // Model management
  addModel: (model: AIModel) => void;
  removeModel: (modelId: string) => void;
  updateModel: (modelId: string, updates: Partial<AIModel>) => void;
  setModelAvailability: (modelId: string, isAvailable: boolean) => void;
  
  // Active models management
  setActiveModels: (modelIds: string[]) => void;
  addActiveModel: (modelId: string) => void;
  removeActiveModel: (modelId: string) => void;
  clearActiveModels: () => void;
  
  // Model configuration
  updateModelConfig: (modelId: string, config: Partial<ModelConfig>) => void;
  resetModelConfig: (modelId: string) => void;
  getModelConfig: (modelId: string) => ModelConfig | undefined;
  
  // Default model management
  setDefaultModel: (modelId: string | null) => void;
  getDefaultModel: () => AIModel | undefined;
  
  // Utility actions
  getModelById: (modelId: string) => AIModel | undefined;
  getActiveModelsList: () => AIModel[];
  getAvailableModelsList: () => AIModel[];
  isModelActive: (modelId: string) => boolean;
  isModelAvailable: (modelId: string) => boolean;
  
  // Loading state
  setLoadingModels: (loading: boolean) => void;
  
  // Bulk operations
  loadDefaultModels: () => void;
  refreshModelAvailability: () => Promise<void>;
  resetAllModels: () => void;
  
  // Model service integration
  sendMessage: (modelId: string, chatId: string, messages: any[], userMessage: string, stream?: boolean) => Promise<string>;
  testModelConnection: (modelId: string) => Promise<boolean>;
  addModelToManager: (model: AIModel, config?: ModelConfig) => Promise<boolean>;
}

// Default models configuration
const defaultModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    type: 'chat',
    isAvailable: true,
  },
  {
    id: 'gpt-4-vision',
    name: 'GPT-4 Vision',
    provider: 'openai',
    type: 'chat',
    isAvailable: true,
    supportsVision: true,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    type: 'chat',
    isAvailable: true,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    type: 'chat',
    isAvailable: true,
    supportsVision: true,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    type: 'chat',
    isAvailable: true,
    supportsVision: true,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    id: 'local-llama',
    name: 'Local Llama',
    provider: 'local',
    type: 'chat',
    isAvailable: true,
  },
];

const defaultModelConfigs: Record<string, ModelConfig> = {
  'gpt-4': {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  'gpt-4-vision': {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  'gpt-3.5-turbo': {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  'claude-3-opus': {
    temperature: 0.7,
    maxTokens: 4096,
  },
  'claude-3-sonnet': {
    temperature: 0.7,
    maxTokens: 4096,
  },
  'local-llama': {
    temperature: 0.7,
    maxTokens: 2048,
  },
};

export const useModelStore = create<ModelState & ModelActions>()(
  persist(
    (set, get) => ({
      // State
      availableModels: [],
      activeModels: [],
      modelConfigs: {},
      defaultModel: null,
      isLoadingModels: false,
      
      // Model management actions
      addModel: (model) => {
        set((state) => {
          const existingIndex = state.availableModels.findIndex(m => m.id === model.id);
          if (existingIndex >= 0) {
            // Update existing model
            const updatedModels = [...state.availableModels];
            updatedModels[existingIndex] = model;
            return { availableModels: updatedModels };
          } else {
            // Add new model
            return { availableModels: [...state.availableModels, model] };
          }
        });
      },
      
      removeModel: (modelId) => {
        set((state) => ({
          availableModels: state.availableModels.filter(model => model.id !== modelId),
          activeModels: state.activeModels.filter(id => id !== modelId),
          modelConfigs: Object.fromEntries(
            Object.entries(state.modelConfigs).filter(([id]) => id !== modelId)
          ),
          defaultModel: state.defaultModel === modelId ? null : state.defaultModel,
        }));
      },
      
      updateModel: (modelId, updates) => {
        set((state) => ({
          availableModels: state.availableModels.map(model =>
            model.id === modelId ? { ...model, ...updates } : model
          ),
        }));
      },
      
      setModelAvailability: (modelId, isAvailable) => {
        get().updateModel(modelId, { isAvailable });
      },
      
      // Active models management actions
      setActiveModels: (modelIds) => {
        const availableIds = get().availableModels.map(m => m.id);
        const validIds = modelIds.filter(id => availableIds.includes(id));
        set({ activeModels: validIds });
      },
      
      addActiveModel: (modelId) => {
        const { activeModels, availableModels } = get();
        const modelExists = availableModels.some(m => m.id === modelId);
        
        if (modelExists && !activeModels.includes(modelId)) {
          set({ activeModels: [...activeModels, modelId] });
        }
      },
      
      removeActiveModel: (modelId) => {
        set((state) => ({
          activeModels: state.activeModels.filter(id => id !== modelId),
        }));
      },
      
      clearActiveModels: () => {
        set({ activeModels: [] });
      },
      
      // Model configuration actions
      updateModelConfig: (modelId, config) => {
        set((state) => ({
          modelConfigs: {
            ...state.modelConfigs,
            [modelId]: { ...state.modelConfigs[modelId], ...config },
          },
        }));
      },
      
      resetModelConfig: (modelId) => {
        const defaultConfig = defaultModelConfigs[modelId];
        if (defaultConfig) {
          set((state) => ({
            modelConfigs: {
              ...state.modelConfigs,
              [modelId]: { ...defaultConfig },
            },
          }));
        }
      },
      
      getModelConfig: (modelId) => {
        return get().modelConfigs[modelId];
      },
      
      // Default model management actions
      setDefaultModel: (modelId) => {
        const modelExists = modelId ? get().availableModels.some(m => m.id === modelId) : true;
        if (modelExists) {
          set({ defaultModel: modelId });
        }
      },
      
      getDefaultModel: () => {
        const { defaultModel, availableModels } = get();
        return defaultModel ? availableModels.find(m => m.id === defaultModel) : undefined;
      },
      
      // Utility actions
      getModelById: (modelId) => {
        return get().availableModels.find(model => model.id === modelId);
      },
      
      getActiveModelsList: () => {
        const { activeModels, availableModels } = get();
        return activeModels
          .map(id => availableModels.find(m => m.id === id))
          .filter((model): model is AIModel => model !== undefined);
      },
      
      getAvailableModelsList: () => {
        return get().availableModels.filter(model => model.isAvailable);
      },
      
      isModelActive: (modelId) => {
        return get().activeModels.includes(modelId);
      },
      
      isModelAvailable: (modelId) => {
        const model = get().getModelById(modelId);
        return model?.isAvailable || false;
      },
      
      // Loading state actions
      setLoadingModels: (loading) => {
        set({ isLoadingModels: loading });
      },
      
      // Bulk operations
      loadDefaultModels: () => {
        set({
          availableModels: defaultModels,
          modelConfigs: defaultModelConfigs,
          defaultModel: 'gpt-3.5-turbo',
        });
      },
      
      refreshModelAvailability: async () => {
        set({ isLoadingModels: true });
        
        try {
          // This would normally check API availability
          // For now, we'll simulate the check
          const { availableModels } = get();
          const updatedModels = availableModels.map(model => ({
            ...model,
            isAvailable: model.provider === 'local' ? true : false, // Simulate local models as available
          }));
          
          set({ availableModels: updatedModels });
        } catch (error) {
          console.error('Failed to refresh model availability:', error);
        } finally {
          set({ isLoadingModels: false });
        }
      },
      
      resetAllModels: () => {
        set({
          availableModels: [],
          activeModels: [],
          modelConfigs: {},
          defaultModel: null,
          isLoadingModels: false,
        });
      },
      
      // Model service integration
      sendMessage: async (modelId, chatId, messages, userMessage, stream = true) => {
        const { availableModels, modelConfigs } = get();
        const model = availableModels.find(m => m.id === modelId);
        
        if (!model) {
          throw new Error(`Model ${modelId} not found`);
        }
        
        const config = modelConfigs[modelId] || createModelConfig();
        
        // Create chat context
        const context = {
          chatId,
          messages,
          activeModel: model,
        };
        
        // Send message through model manager
        return await modelManager.sendMessage(context, userMessage, { stream });
      },
      
      testModelConnection: async (modelId) => {
        return await modelManager.testModelConnection(modelId);
      },
      
      addModelToManager: async (model, config = createModelConfig()) => {
        const success = await modelManager.addModel(model, config);
        if (success) {
          set((state) => ({
            availableModels: [...state.availableModels.filter(m => m.id !== model.id), model],
            modelConfigs: {
              ...state.modelConfigs,
              [model.id]: config,
            },
          }));
        }
        return success;
      },
    }),
    {
      name: 'ai-chat-models',
      storage: createJSONStorage(() => ({
        getItem: (name) => storage.get(name),
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.remove(name),
      })),
      // Don't persist API keys in model configs for security
      partialize: (state) => ({
        availableModels: state.availableModels,
        activeModels: state.activeModels,
        modelConfigs: Object.fromEntries(
          Object.entries(state.modelConfigs).map(([id, config]) => [
            id,
            { ...config, apiKey: undefined }
          ])
        ),
        defaultModel: state.defaultModel,
      }),
    }
  )
);