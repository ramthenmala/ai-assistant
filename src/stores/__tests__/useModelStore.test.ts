import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useModelStore } from '../useModelStore';
import type { AIModel, ModelConfig } from '../../types';

// Mock the utils
vi.mock('../../utils', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('useModelStore', () => {
  beforeEach(() => {
    // Clear any persisted state first
    useModelStore.persist.clearStorage();
    // Reset store state before each test
    useModelStore.getState().resetAllModels();
  });

  describe('Model Management', () => {
    const testModel: AIModel = {
      id: 'test-model',
      name: 'Test Model',
      provider: 'openai',
      type: 'chat',
      isAvailable: true,
    };

    it('should add a new model', () => {
      const store = useModelStore.getState();
      
      store.addModel(testModel);
      
      expect(store.availableModels).toHaveLength(1);
      expect(store.availableModels[0]).toEqual(testModel);
    });

    it('should update existing model when adding with same id', () => {
      const store = useModelStore.getState();
      
      store.addModel(testModel);
      
      const updatedModel = { ...testModel, name: 'Updated Test Model' };
      store.addModel(updatedModel);
      
      expect(store.availableModels).toHaveLength(1);
      expect(store.availableModels[0].name).toBe('Updated Test Model');
    });

    it('should remove a model', () => {
      const store = useModelStore.getState();
      
      store.addModel(testModel);
      store.addActiveModel(testModel.id);
      store.setDefaultModel(testModel.id);
      
      store.removeModel(testModel.id);
      
      expect(store.availableModels).toHaveLength(0);
      expect(store.activeModels).toHaveLength(0);
      expect(store.defaultModel).toBeNull();
    });

    it('should update model properties', () => {
      const store = useModelStore.getState();
      
      store.addModel(testModel);
      store.updateModel(testModel.id, { name: 'Updated Name', isAvailable: false });
      
      const model = store.getModelById(testModel.id);
      expect(model?.name).toBe('Updated Name');
      expect(model?.isAvailable).toBe(false);
    });

    it('should set model availability', () => {
      const store = useModelStore.getState();
      
      store.addModel(testModel);
      store.setModelAvailability(testModel.id, false);
      
      expect(store.getModelById(testModel.id)?.isAvailable).toBe(false);
    });

    it('should get model by id', () => {
      const store = useModelStore.getState();
      
      store.addModel(testModel);
      
      const foundModel = store.getModelById(testModel.id);
      expect(foundModel).toEqual(testModel);
      
      const notFoundModel = store.getModelById('non-existent');
      expect(notFoundModel).toBeUndefined();
    });
  });

  describe('Active Models Management', () => {
    const model1: AIModel = {
      id: 'model-1',
      name: 'Model 1',
      provider: 'openai',
      type: 'chat',
      isAvailable: true,
    };

    const model2: AIModel = {
      id: 'model-2',
      name: 'Model 2',
      provider: 'anthropic',
      type: 'chat',
      isAvailable: true,
    };

    beforeEach(() => {
      const store = useModelStore.getState();
      store.addModel(model1);
      store.addModel(model2);
    });

    it('should set active models', () => {
      const store = useModelStore.getState();
      
      store.setActiveModels([model1.id, model2.id]);
      
      expect(store.activeModels).toEqual([model1.id, model2.id]);
    });

    it('should filter out non-existent models when setting active models', () => {
      const store = useModelStore.getState();
      
      store.setActiveModels([model1.id, 'non-existent', model2.id]);
      
      expect(store.activeModels).toEqual([model1.id, model2.id]);
    });

    it('should add active model', () => {
      const store = useModelStore.getState();
      
      store.addActiveModel(model1.id);
      expect(store.activeModels).toContain(model1.id);
      
      // Should not add duplicate
      store.addActiveModel(model1.id);
      expect(store.activeModels.filter(id => id === model1.id)).toHaveLength(1);
    });

    it('should not add non-existent model as active', () => {
      const store = useModelStore.getState();
      
      store.addActiveModel('non-existent');
      expect(store.activeModels).not.toContain('non-existent');
    });

    it('should remove active model', () => {
      const store = useModelStore.getState();
      
      store.setActiveModels([model1.id, model2.id]);
      store.removeActiveModel(model1.id);
      
      expect(store.activeModels).toEqual([model2.id]);
    });

    it('should clear active models', () => {
      const store = useModelStore.getState();
      
      store.setActiveModels([model1.id, model2.id]);
      store.clearActiveModels();
      
      expect(store.activeModels).toHaveLength(0);
    });

    it('should get active models list', () => {
      const store = useModelStore.getState();
      
      store.setActiveModels([model1.id, model2.id]);
      
      const activeModels = store.getActiveModelsList();
      expect(activeModels).toHaveLength(2);
      expect(activeModels[0]).toEqual(model1);
      expect(activeModels[1]).toEqual(model2);
    });

    it('should check if model is active', () => {
      const store = useModelStore.getState();
      
      store.addActiveModel(model1.id);
      
      expect(store.isModelActive(model1.id)).toBe(true);
      expect(store.isModelActive(model2.id)).toBe(false);
    });
  });

  describe('Model Configuration', () => {
    const testModel: AIModel = {
      id: 'test-model',
      name: 'Test Model',
      provider: 'openai',
      type: 'chat',
      isAvailable: true,
    };

    beforeEach(() => {
      const store = useModelStore.getState();
      store.addModel(testModel);
    });

    it('should update model config', () => {
      const store = useModelStore.getState();
      
      const config: Partial<ModelConfig> = {
        temperature: 0.8,
        maxTokens: 2048,
      };
      
      store.updateModelConfig(testModel.id, config);
      
      const savedConfig = store.getModelConfig(testModel.id);
      expect(savedConfig?.temperature).toBe(0.8);
      expect(savedConfig?.maxTokens).toBe(2048);
    });

    it('should merge config updates', () => {
      const store = useModelStore.getState();
      
      store.updateModelConfig(testModel.id, { temperature: 0.8 });
      store.updateModelConfig(testModel.id, { maxTokens: 2048 });
      
      const config = store.getModelConfig(testModel.id);
      expect(config?.temperature).toBe(0.8);
      expect(config?.maxTokens).toBe(2048);
    });

    it('should reset model config to default', () => {
      const store = useModelStore.getState();
      
      // First load default models to have default configs
      store.loadDefaultModels();
      
      // Update config
      store.updateModelConfig('gpt-4', { temperature: 0.9 });
      
      // Reset to default
      store.resetModelConfig('gpt-4');
      
      const config = store.getModelConfig('gpt-4');
      expect(config?.temperature).toBe(0.7); // Default value
    });

    it('should get model config', () => {
      const store = useModelStore.getState();
      
      const config: ModelConfig = {
        temperature: 0.5,
        maxTokens: 1024,
      };
      
      store.updateModelConfig(testModel.id, config);
      
      const retrievedConfig = store.getModelConfig(testModel.id);
      expect(retrievedConfig).toEqual(config);
      
      const nonExistentConfig = store.getModelConfig('non-existent');
      expect(nonExistentConfig).toBeUndefined();
    });
  });

  describe('Default Model Management', () => {
    const testModel: AIModel = {
      id: 'test-model',
      name: 'Test Model',
      provider: 'openai',
      type: 'chat',
      isAvailable: true,
    };

    beforeEach(() => {
      const store = useModelStore.getState();
      store.addModel(testModel);
    });

    it('should set default model', () => {
      const store = useModelStore.getState();
      
      store.setDefaultModel(testModel.id);
      
      expect(store.defaultModel).toBe(testModel.id);
    });

    it('should not set non-existent model as default', () => {
      const store = useModelStore.getState();
      
      store.setDefaultModel('non-existent');
      
      expect(store.defaultModel).toBeNull();
    });

    it('should clear default model', () => {
      const store = useModelStore.getState();
      
      store.setDefaultModel(testModel.id);
      store.setDefaultModel(null);
      
      expect(store.defaultModel).toBeNull();
    });

    it('should get default model', () => {
      const store = useModelStore.getState();
      
      store.setDefaultModel(testModel.id);
      
      const defaultModel = store.getDefaultModel();
      expect(defaultModel).toEqual(testModel);
    });
  });

  describe('Utility Functions', () => {
    const availableModel: AIModel = {
      id: 'available-model',
      name: 'Available Model',
      provider: 'openai',
      type: 'chat',
      isAvailable: true,
    };

    const unavailableModel: AIModel = {
      id: 'unavailable-model',
      name: 'Unavailable Model',
      provider: 'anthropic',
      type: 'chat',
      isAvailable: false,
    };

    beforeEach(() => {
      const store = useModelStore.getState();
      store.addModel(availableModel);
      store.addModel(unavailableModel);
    });

    it('should get available models list', () => {
      const store = useModelStore.getState();
      
      const availableModels = store.getAvailableModelsList();
      
      expect(availableModels).toHaveLength(1);
      expect(availableModels[0]).toEqual(availableModel);
    });

    it('should check if model is available', () => {
      const store = useModelStore.getState();
      
      expect(store.isModelAvailable(availableModel.id)).toBe(true);
      expect(store.isModelAvailable(unavailableModel.id)).toBe(false);
      expect(store.isModelAvailable('non-existent')).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should manage loading state', () => {
      const store = useModelStore.getState();
      
      expect(store.isLoadingModels).toBe(false);
      
      store.setLoadingModels(true);
      expect(store.isLoadingModels).toBe(true);
      
      store.setLoadingModels(false);
      expect(store.isLoadingModels).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should load default models', () => {
      const store = useModelStore.getState();
      
      store.loadDefaultModels();
      
      expect(store.availableModels.length).toBeGreaterThan(0);
      expect(store.defaultModel).toBe('gpt-3.5-turbo');
      expect(Object.keys(store.modelConfigs).length).toBeGreaterThan(0);
    });

    it('should refresh model availability', async () => {
      const store = useModelStore.getState();
      
      store.loadDefaultModels();
      
      await store.refreshModelAvailability();
      
      // Local models should be marked as available
      const localModel = store.availableModels.find(m => m.provider === 'local');
      expect(localModel?.isAvailable).toBe(true);
    });

    it('should reset all models', () => {
      const store = useModelStore.getState();
      
      store.loadDefaultModels();
      store.setActiveModels(['gpt-4']);
      
      store.resetAllModels();
      
      expect(store.availableModels).toHaveLength(0);
      expect(store.activeModels).toHaveLength(0);
      expect(store.modelConfigs).toEqual({});
      expect(store.defaultModel).toBeNull();
      expect(store.isLoadingModels).toBe(false);
    });
  });
});