// Prompt store for managing saved prompts and tags
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SavedPrompt, PromptCategory, PromptVariable, PromptVersion } from '../types';
import { generateId, getCurrentTimestamp, storage } from '../utils';
import { PromptService } from '../services/PromptService';
import { defaultPrompts } from '../services/DefaultPrompts';

interface PromptState {
  prompts: SavedPrompt[];
  categories: PromptCategory[];
  tags: string[];
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string | null;
  sortBy: 'createdAt' | 'updatedAt' | 'usageCount' | 'title';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
}

interface PromptActions {
  // Prompt management
  createPrompt: (prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => string;
  updatePrompt: (promptId: string, updates: Partial<Omit<SavedPrompt, 'id' | 'createdAt'>>) => void;
  deletePrompt: (promptId: string) => void;
  duplicatePrompt: (promptId: string) => string;
  
  // Versioning
  createVersion: (promptId: string, updates: Partial<Pick<SavedPrompt, 'title' | 'description' | 'content' | 'tags'>>, changelog?: string) => boolean;
  getVersionHistory: (promptId: string) => PromptVersion[];
  revertToVersion: (promptId: string, version: number) => boolean;
  
  // Variable management
  extractVariables: (content: string) => string[];
  substituteVariables: (content: string, variables: Record<string, string>) => string;
  validateVariables: (variables: PromptVariable[], values: Record<string, string>) => { isValid: boolean; errors: string[] };
  generateVariableDefinitions: (content: string) => PromptVariable[];
  
  // Categories
  createCategory: (category: Omit<PromptCategory, 'id' | 'createdAt' | 'promptCount'>) => string;
  updateCategory: (categoryId: string, updates: Partial<Omit<PromptCategory, 'id' | 'createdAt'>>) => void;
  deleteCategory: (categoryId: string) => void;
  getCategoryById: (categoryId: string) => PromptCategory | undefined;
  getPromptsByCategory: (categoryId: string) => SavedPrompt[];
  setSelectedCategory: (categoryId: string | null) => void;
  
  // Favorites management
  toggleFavorite: (promptId: string) => void;
  getFavoritePrompts: () => SavedPrompt[];
  
  // Usage tracking
  incrementUsage: (promptId: string) => void;
  resetUsageCount: (promptId: string) => void;
  getMostUsedPrompts: (limit?: number) => SavedPrompt[];
  
  // Tag management
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  updatePromptTags: (promptId: string, tags: string[]) => void;
  getAllTags: () => string[];
  getTagUsageCount: (tag: string) => number;
  cleanupUnusedTags: () => void;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  addSelectedTag: (tag: string) => void;
  removeSelectedTag: (tag: string) => void;
  clearSelectedTags: () => void;
  getFilteredPrompts: () => SavedPrompt[];
  
  // Sorting
  setSortBy: (sortBy: PromptState['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  getSortedPrompts: (prompts: SavedPrompt[]) => SavedPrompt[];
  
  // Utility actions
  getPromptById: (promptId: string) => SavedPrompt | undefined;
  searchPrompts: (query: string) => SavedPrompt[];
  getPromptsByTag: (tag: string) => SavedPrompt[];
  getRecentPrompts: (limit?: number) => SavedPrompt[];
  
  // Bulk operations
  importPrompts: (prompts: SavedPrompt[]) => void;
  exportPrompts: (format?: 'json' | 'csv' | 'markdown') => string;
  clearAllPrompts: () => void;
  
  // Suggestions and recommendations
  getSuggestions: (context: string, limit?: number) => SavedPrompt[];
  getRecommendations: (currentPrompt: SavedPrompt, limit?: number) => SavedPrompt[];
  
  // Loading state
  setLoading: (loading: boolean) => void;
  
  // Initialization
  initializeDefaultPrompts: () => void;
}

// Default categories
const defaultCategories: PromptCategory[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General purpose prompts',
    icon: '💬',
    color: '#6B7280',
    createdAt: new Date(),
  },
  {
    id: 'writing',
    name: 'Writing',
    description: 'Writing and content creation prompts',
    icon: '✍️',
    color: '#3B82F6',
    createdAt: new Date(),
  },
  {
    id: 'coding',
    name: 'Coding',
    description: 'Programming and development prompts',
    icon: '💻',
    color: '#10B981',
    createdAt: new Date(),
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Data analysis and research prompts',
    icon: '📊',
    color: '#F59E0B',
    createdAt: new Date(),
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Creative and artistic prompts',
    icon: '🎨',
    color: '#EF4444',
    createdAt: new Date(),
  },
];

export const usePromptStore = create<PromptState & PromptActions>()(
  persist(
    (set, get) => ({
      // State
      prompts: [],
      categories: defaultCategories,
      tags: [],
      searchQuery: '',
      selectedTags: [],
      selectedCategory: null,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      isLoading: false,
      
      // Prompt management actions
      createPrompt: (promptData) => {
        const promptId = generateId();
        const now = getCurrentTimestamp();
        
        const newPrompt: SavedPrompt = {
          ...promptData,
          id: promptId,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };
        
        set((state) => {
          // Update tags list
          const newTags = promptData.tags.filter(tag => !state.tags.includes(tag));
          
          return {
            prompts: [...state.prompts, newPrompt],
            tags: [...state.tags, ...newTags],
          };
        });
        
        return promptId;
      },
      
      updatePrompt: (promptId, updates) => {
        set((state) => {
          const updatedPrompts = state.prompts.map(prompt =>
            prompt.id === promptId
              ? { ...prompt, ...updates, updatedAt: getCurrentTimestamp() }
              : prompt
          );
          
          // Update tags if tags were modified
          let newTags = state.tags;
          if (updates.tags) {
            const allTags = new Set(state.tags);
            updates.tags.forEach(tag => allTags.add(tag));
            newTags = Array.from(allTags);
          }
          
          return {
            prompts: updatedPrompts,
            tags: newTags,
          };
        });
      },
      
      deletePrompt: (promptId) => {
        set((state) => ({
          prompts: state.prompts.filter(prompt => prompt.id !== promptId),
        }));
        
        // Clean up unused tags
        get().cleanupUnusedTags();
      },
      
      duplicatePrompt: (promptId) => {
        const originalPrompt = get().getPromptById(promptId);
        if (!originalPrompt) return '';
        
        return get().createPrompt({
          title: `${originalPrompt.title} (Copy)`,
          description: originalPrompt.description,
          content: originalPrompt.content,
          tags: [...originalPrompt.tags],
          category: originalPrompt.category,
          isFavorite: false,
        });
      },
      
      // Versioning actions
      createVersion: (promptId, updates, changelog) => {
        const prompt = get().getPromptById(promptId);
        if (!prompt) return false;
        
        const newVersion = PromptService.createVersion(prompt, updates, changelog);
        
        set((state) => ({
          prompts: state.prompts.map(p =>
            p.id === promptId
              ? {
                  ...p,
                  versions: [...(p.versions || []), newVersion],
                  currentVersion: newVersion.version,
                  ...updates,
                  updatedAt: getCurrentTimestamp()
                }
              : p
          ),
        }));
        
        return true;
      },
      
      getVersionHistory: (promptId) => {
        const prompt = get().getPromptById(promptId);
        if (!prompt) return [];
        
        return PromptService.getVersionHistory(prompt);
      },
      
      revertToVersion: (promptId, version) => {
        const prompt = get().getPromptById(promptId);
        if (!prompt) return false;
        
        const revertData = PromptService.revertToVersion(prompt, version);
        if (!revertData) return false;
        
        get().updatePrompt(promptId, revertData);
        return true;
      },
      
      // Variable management actions
      extractVariables: (content) => {
        return PromptService.extractVariables(content);
      },
      
      substituteVariables: (content, variables) => {
        return PromptService.substituteVariables(content, variables);
      },
      
      validateVariables: (variables, values) => {
        return PromptService.validateVariables(variables, values);
      },
      
      generateVariableDefinitions: (content) => {
        return PromptService.generateVariableDefinitions(content);
      },
      
      // Category management actions
      createCategory: (categoryData) => {
        const categoryId = generateId();
        const newCategory: PromptCategory = {
          ...categoryData,
          id: categoryId,
          createdAt: getCurrentTimestamp(),
          promptCount: 0,
        };
        
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
        
        return categoryId;
      },
      
      updateCategory: (categoryId, updates) => {
        set((state) => ({
          categories: state.categories.map(category =>
            category.id === categoryId
              ? { ...category, ...updates }
              : category
          ),
        }));
      },
      
      deleteCategory: (categoryId) => {
        set((state) => ({
          categories: state.categories.filter(category => category.id !== categoryId),
          prompts: state.prompts.map(prompt =>
            prompt.category === categoryId
              ? { ...prompt, category: undefined }
              : prompt
          ),
          selectedCategory: state.selectedCategory === categoryId ? null : state.selectedCategory,
        }));
      },
      
      getCategoryById: (categoryId) => {
        return get().categories.find(category => category.id === categoryId);
      },
      
      getPromptsByCategory: (categoryId) => {
        return get().prompts.filter(prompt => prompt.category === categoryId);
      },
      
      setSelectedCategory: (categoryId) => {
        set({ selectedCategory: categoryId });
      },
      
      // Favorites management actions
      toggleFavorite: (promptId) => {
        set((state) => ({
          prompts: state.prompts.map(prompt =>
            prompt.id === promptId
              ? { ...prompt, isFavorite: !prompt.isFavorite, updatedAt: getCurrentTimestamp() }
              : prompt
          ),
        }));
      },
      
      getFavoritePrompts: () => {
        return get().prompts.filter(prompt => prompt.isFavorite);
      },
      
      // Usage tracking actions
      incrementUsage: (promptId) => {
        set((state) => ({
          prompts: state.prompts.map(prompt =>
            prompt.id === promptId
              ? { ...prompt, usageCount: prompt.usageCount + 1, updatedAt: getCurrentTimestamp() }
              : prompt
          ),
        }));
      },
      
      resetUsageCount: (promptId) => {
        set((state) => ({
          prompts: state.prompts.map(prompt =>
            prompt.id === promptId
              ? { ...prompt, usageCount: 0, updatedAt: getCurrentTimestamp() }
              : prompt
          ),
        }));
      },
      
      getMostUsedPrompts: (limit = 10) => {
        return get().prompts
          .filter(prompt => prompt.usageCount > 0)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },
      
      // Tag management actions
      addTag: (tag) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !get().tags.includes(trimmedTag)) {
          set((state) => ({
            tags: [...state.tags, trimmedTag],
          }));
        }
      },
      
      removeTag: (tag) => {
        set((state) => ({
          tags: state.tags.filter(t => t !== tag),
          selectedTags: state.selectedTags.filter(t => t !== tag),
          prompts: state.prompts.map(prompt => ({
            ...prompt,
            tags: prompt.tags.filter(t => t !== tag),
            updatedAt: prompt.tags.includes(tag) ? getCurrentTimestamp() : prompt.updatedAt,
          })),
        }));
      },
      
      updatePromptTags: (promptId, tags) => {
        get().updatePrompt(promptId, { tags });
      },
      
      getAllTags: () => {
        return get().tags;
      },
      
      getTagUsageCount: (tag) => {
        return get().prompts.filter(prompt => prompt.tags.includes(tag)).length;
      },
      
      cleanupUnusedTags: () => {
        const { prompts } = get();
        const usedTags = new Set<string>();
        
        prompts.forEach(prompt => {
          prompt.tags.forEach(tag => usedTags.add(tag));
        });
        
        set((state) => ({
          tags: state.tags.filter(tag => usedTags.has(tag)),
          selectedTags: state.selectedTags.filter(tag => usedTags.has(tag)),
        }));
      },
      
      // Search and filtering actions
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },
      
      setSelectedTags: (tags) => {
        set({ selectedTags: tags });
      },
      
      addSelectedTag: (tag) => {
        set((state) => ({
          selectedTags: state.selectedTags.includes(tag)
            ? state.selectedTags
            : [...state.selectedTags, tag],
        }));
      },
      
      removeSelectedTag: (tag) => {
        set((state) => ({
          selectedTags: state.selectedTags.filter(t => t !== tag),
        }));
      },
      
      clearSelectedTags: () => {
        set({ selectedTags: [] });
      },
      
      getFilteredPrompts: () => {
        const { prompts, searchQuery, selectedTags, selectedCategory } = get();
        
        let filtered = prompts;
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(prompt =>
            prompt.title.toLowerCase().includes(query) ||
            prompt.description?.toLowerCase().includes(query) ||
            prompt.content.toLowerCase().includes(query) ||
            prompt.tags.some(tag => tag.toLowerCase().includes(query)) ||
            prompt.category?.toLowerCase().includes(query)
          );
        }
        
        // Filter by selected tags
        if (selectedTags.length > 0) {
          filtered = filtered.filter(prompt =>
            selectedTags.every(tag => prompt.tags.includes(tag))
          );
        }
        
        // Filter by selected category
        if (selectedCategory) {
          filtered = filtered.filter(prompt => prompt.category === selectedCategory);
        }
        
        return get().getSortedPrompts(filtered);
      },
      
      // Sorting actions
      setSortBy: (sortBy) => {
        set({ sortBy });
      },
      
      setSortOrder: (order) => {
        set({ sortOrder: order });
      },
      
      getSortedPrompts: (prompts) => {
        const { sortBy, sortOrder } = get();
        
        return [...prompts].sort((a, b) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'title':
              comparison = a.title.localeCompare(b.title);
              break;
            case 'createdAt':
              comparison = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'updatedAt':
              comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
              break;
            case 'usageCount':
              comparison = a.usageCount - b.usageCount;
              break;
            default:
              comparison = 0;
          }
          
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      },
      
      // Utility actions
      getPromptById: (promptId) => {
        return get().prompts.find(prompt => prompt.id === promptId);
      },
      
      searchPrompts: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().prompts.filter(prompt =>
          prompt.title.toLowerCase().includes(lowerQuery) ||
          prompt.description?.toLowerCase().includes(lowerQuery) ||
          prompt.content.toLowerCase().includes(lowerQuery) ||
          prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      },
      
      getPromptsByTag: (tag) => {
        return get().prompts.filter(prompt => prompt.tags.includes(tag));
      },
      
      getRecentPrompts: (limit = 10) => {
        return get().prompts
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, limit);
      },
      
      // Bulk operations
      importPrompts: (prompts) => {
        set((state) => {
          const allTags = new Set(state.tags);
          const existingIds = new Set(state.prompts.map(p => p.id));
          
          // Filter out duplicates and collect new tags
          const newPrompts = prompts.filter(prompt => {
            if (existingIds.has(prompt.id)) return false;
            prompt.tags.forEach(tag => allTags.add(tag));
            return true;
          });
          
          return {
            prompts: [...state.prompts, ...newPrompts],
            tags: Array.from(allTags),
          };
        });
      },
      
      exportPrompts: (format = 'json') => {
        return PromptService.exportPrompts(get().prompts, format);
      },
      
      clearAllPrompts: () => {
        set({
          prompts: [],
          tags: [],
          searchQuery: '',
          selectedTags: [],
          selectedCategory: null,
        });
      },
      
      // Suggestions and recommendations
      getSuggestions: (context, limit = 5) => {
        return PromptService.generateSuggestions(context, get().prompts, limit);
      },
      
      getRecommendations: (currentPrompt, limit = 5) => {
        const { prompts } = get();
        const otherPrompts = prompts.filter(p => p.id !== currentPrompt.id);
        
        // Simple recommendation based on shared tags and category
        const scored = otherPrompts.map(prompt => {
          let score = 0;
          
          // Score based on shared tags
          const sharedTags = prompt.tags.filter(tag => currentPrompt.tags.includes(tag));
          score += sharedTags.length * 2;
          
          // Score based on same category
          if (prompt.category === currentPrompt.category) {
            score += 3;
          }
          
          // Score based on usage
          score += Math.min(prompt.usageCount * 0.1, 1);
          
          return { prompt, score };
        });
        
        return scored
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(item => item.prompt);
      },
      
      // Loading state actions
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      // Initialization
      initializeDefaultPrompts: () => {
        const { prompts } = get();
        
        // Only initialize if no prompts exist
        if (prompts.length === 0) {
          set({ prompts: defaultPrompts });
        }
      },
    }),
    {
      name: 'ai-chat-prompts',
      storage: createJSONStorage(() => ({
        getItem: (name) => storage.get(name),
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.remove(name),
      })),
    }
  )
);