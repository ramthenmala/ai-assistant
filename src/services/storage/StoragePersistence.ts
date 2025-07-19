// Storage persistence middleware for Zustand stores
import type { StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getStorageService } from './StorageFactory';
import type { StorageAdapter } from './BaseStorageService';

interface PersistOptions {
  name: string;
  version?: number;
  skipPersistenceFields?: string[];
  onRehydrateStorage?: (state: any) => void;
  onError?: (error: Error) => void;
}

interface PersistedState {
  state: any;
  version: number;
}

export const createStoragePersistence = <T>(
  config: StateCreator<T>,
  options: PersistOptions
) => {
  const {
    name,
    version = 1,
    skipPersistenceFields = [],
    onRehydrateStorage,
    onError
  } = options;

  return subscribeWithSelector<T>((set, get, api) => {
    const stateCreator = config(set, get, api);
    let storage: StorageAdapter | null = null;
    let isInitialized = false;
    let isRehydrating = false;

    // Initialize storage
    const initializeStorage = async () => {
      if (isInitialized) return;
      
      try {
        storage = await getStorageService();
        isInitialized = true;
        
        // Load persisted state
        await rehydrateState();
        
        // Set up persistence subscription
        setupPersistenceSubscription();
      } catch (error) {
        console.error('Failed to initialize storage persistence:', error);
        onError?.(error as Error);
      }
    };

    // Rehydrate state from storage
    const rehydrateState = async () => {
      if (!storage || isRehydrating) return;
      
      isRehydrating = true;
      
      try {
        const persistedData = await storage.get<PersistedState>(name);
        
        if (persistedData) {
          // Check version compatibility
          if (persistedData.version !== version) {
            console.warn(`Version mismatch for ${name}: expected ${version}, got ${persistedData.version}`);
            // Could implement migration logic here
          }
          
          // Merge persisted state
          const currentState = get();
          const newState = {
            ...currentState,
            ...persistedData.state
          };
          
          // Apply rehydrated state
          (set as any)(newState);
          
          // Call rehydration callback
          onRehydrateStorage?.(newState);
        }
      } catch (error) {
        console.error(`Failed to rehydrate state for ${name}:`, error);
        onError?.(error as Error);
      } finally {
        isRehydrating = false;
      }
    };

    // Set up persistence subscription
    const setupPersistenceSubscription = () => {
      if (!storage) return;

      // Subscribe to state changes
      const unsubscribe = api.subscribe(
        (state) => state, // Select entire state
        async (state) => {
          if (isRehydrating) return; // Skip persistence during rehydration
          
          try {
            await persistState(state);
          } catch (error) {
            console.error(`Failed to persist state for ${name}:`, error);
            onError?.(error as Error);
          }
        },
        {
          // Debounce persistence calls
          fireImmediately: false,
        }
      );

      // Clean up subscription on unmount
      return unsubscribe;
    };

    // Persist state to storage
    const persistState = async (state: T) => {
      if (!storage) return;

      // Filter out fields that shouldn't be persisted
      const stateToPersist = { ...state };
      skipPersistenceFields.forEach(field => {
        delete (stateToPersist as any)[field];
      });

      const persistedData: PersistedState = {
        state: stateToPersist,
        version
      };

      await storage.set(name, persistedData);
    };

    // Initialize storage asynchronously
    initializeStorage().catch(error => {
      console.error('Storage initialization failed:', error);
      onError?.(error as Error);
    });

    return stateCreator;
  });
};

// Database-specific persistence for complex data structures
export class DatabasePersistence {
  private storage: StorageAdapter | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.storage = await getStorageService();
    this.isInitialized = true;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.storage) {
      throw new Error('Database persistence not initialized');
    }
  }

  // Chat persistence methods
  async saveChat(chat: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.insert('chats', chat);
  }

  async updateChat(chatId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.update('chats', chatId, updates);
  }

  async deleteChat(chatId: string): Promise<void> {
    this.ensureInitialized();
    await this.storage!.delete('chats', chatId);
  }

  async getAllChats(): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('chats');
  }

  async getChatById(chatId: string): Promise<any | null> {
    this.ensureInitialized();
    const results = await this.storage!.query('chats', { id: chatId });
    return results[0] || null;
  }

  // Message persistence methods
  async saveMessage(message: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.insert('messages', message);
  }

  async updateMessage(messageId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.update('messages', messageId, updates);
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.ensureInitialized();
    await this.storage!.delete('messages', messageId);
  }

  async getMessagesByChat(chatId: string): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('messages', { chat_id: chatId });
  }

  async getMessagesByBranch(branchId: string): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('messages', { branch_id: branchId });
  }

  // Branch persistence methods
  async saveBranch(branch: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.insert('branches', branch);
  }

  async updateBranch(branchId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.update('branches', branchId, updates);
  }

  async deleteBranch(branchId: string): Promise<void> {
    this.ensureInitialized();
    await this.storage!.delete('branches', branchId);
  }

  async getBranchesByChat(chatId: string): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('branches', { chat_id: chatId });
  }

  // Prompt persistence methods
  async savePrompt(prompt: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.insert('prompts', prompt);
  }

  async updatePrompt(promptId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.update('prompts', promptId, updates);
  }

  async deletePrompt(promptId: string): Promise<void> {
    this.ensureInitialized();
    await this.storage!.delete('prompts', promptId);
  }

  async getAllPrompts(): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('prompts');
  }

  async getPromptsByTag(tag: string): Promise<any[]> {
    this.ensureInitialized();
    // Note: This would need special handling for JSON arrays in the actual implementation
    const allPrompts = await this.getAllPrompts();
    return allPrompts.filter(prompt => prompt.tags && prompt.tags.includes(tag));
  }

  // Knowledge source persistence methods
  async saveKnowledgeSource(source: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.insert('knowledge_sources', source);
  }

  async updateKnowledgeSource(sourceId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.update('knowledge_sources', sourceId, updates);
  }

  async deleteKnowledgeSource(sourceId: string): Promise<void> {
    this.ensureInitialized();
    await this.storage!.delete('knowledge_sources', sourceId);
  }

  async getKnowledgeSourcesByStack(stackId: string): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('knowledge_sources', { stack_id: stackId });
  }

  // Knowledge stack persistence methods
  async saveKnowledgeStack(stack: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.insert('knowledge_stacks', stack);
  }

  async updateKnowledgeStack(stackId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    await this.storage!.update('knowledge_stacks', stackId, updates);
  }

  async deleteKnowledgeStack(stackId: string): Promise<void> {
    this.ensureInitialized();
    await this.storage!.delete('knowledge_stacks', stackId);
  }

  async getAllKnowledgeStacks(): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('knowledge_stacks');
  }

  async getActiveKnowledgeStacks(): Promise<any[]> {
    this.ensureInitialized();
    return await this.storage!.query('knowledge_stacks', { is_active: true });
  }

  // Batch operations
  async batchSaveChats(chats: any[]): Promise<void> {
    this.ensureInitialized();
    
    // Use transaction if available or save individually
    for (const chat of chats) {
      await this.saveChat(chat);
    }
  }

  async batchSaveMessages(messages: any[]): Promise<void> {
    this.ensureInitialized();
    
    for (const message of messages) {
      await this.saveMessage(message);
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    this.ensureInitialized();
    
    // Clear all tables
    await this.storage!.delete('chats', '*');
    await this.storage!.delete('messages', '*');
    await this.storage!.delete('branches', '*');
    await this.storage!.delete('prompts', '*');
    await this.storage!.delete('knowledge_sources', '*');
    await this.storage!.delete('knowledge_stacks', '*');
  }

  async exportData(): Promise<{
    chats: any[];
    messages: any[];
    branches: any[];
    prompts: any[];
    knowledgeSources: any[];
    knowledgeStacks: any[];
  }> {
    this.ensureInitialized();
    
    return {
      chats: await this.getAllChats(),
      messages: await this.storage!.query('messages'),
      branches: await this.storage!.query('branches'),
      prompts: await this.getAllPrompts(),
      knowledgeSources: await this.storage!.query('knowledge_sources'),
      knowledgeStacks: await this.getAllKnowledgeStacks()
    };
  }

  async importData(data: {
    chats?: any[];
    messages?: any[];
    branches?: any[];
    prompts?: any[];
    knowledgeSources?: any[];
    knowledgeStacks?: any[];
  }): Promise<void> {
    this.ensureInitialized();
    
    // Import data in order of dependencies
    if (data.chats) {
      await this.batchSaveChats(data.chats);
    }
    
    if (data.branches) {
      for (const branch of data.branches) {
        await this.saveBranch(branch);
      }
    }
    
    if (data.messages) {
      await this.batchSaveMessages(data.messages);
    }
    
    if (data.prompts) {
      for (const prompt of data.prompts) {
        await this.savePrompt(prompt);
      }
    }
    
    if (data.knowledgeStacks) {
      for (const stack of data.knowledgeStacks) {
        await this.saveKnowledgeStack(stack);
      }
    }
    
    if (data.knowledgeSources) {
      for (const source of data.knowledgeSources) {
        await this.saveKnowledgeSource(source);
      }
    }
  }
}

// Singleton instance
export const databasePersistence = new DatabasePersistence();