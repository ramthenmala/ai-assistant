import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePromptStore } from '../usePromptStore';
import type { SavedPrompt } from '../../types';

// Mock the utils
vi.mock('../../utils', () => ({
  generateId: vi.fn(() => 'mock-id-' + Math.random().toString(36).substr(2, 9)),
  getCurrentTimestamp: vi.fn(() => new Date('2024-01-01T00:00:00Z')),
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('usePromptStore', () => {
  beforeEach(() => {
    // Clear any persisted state first
    usePromptStore.persist.clearStorage();
    // Reset store state before each test
    usePromptStore.getState().clearAllPrompts();
  });

  describe('Prompt Management', () => {
    const testPromptData = {
      title: 'Test Prompt',
      description: 'A test prompt for testing',
      content: 'This is a test prompt content',
      tags: ['test', 'example'],
      isFavorite: false,
    };

    it('should create a new prompt', () => {
      const store = usePromptStore.getState();
      
      const promptId = store.createPrompt(testPromptData);
      
      expect(promptId).toBeDefined();
      expect(store.prompts).toHaveLength(1);
      expect(store.prompts[0].title).toBe('Test Prompt');
      expect(store.prompts[0].usageCount).toBe(0);
      expect(store.tags).toEqual(['test', 'example']);
    });

    it('should update a prompt', () => {
      const store = usePromptStore.getState();
      
      const promptId = store.createPrompt(testPromptData);
      store.updatePrompt(promptId, {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated', 'test'],
      });
      
      const prompt = store.getPromptById(promptId);
      expect(prompt?.title).toBe('Updated Title');
      expect(prompt?.content).toBe('Updated content');
      expect(prompt?.tags).toEqual(['updated', 'test']);
      expect(store.tags).toContain('updated');
    });

    it('should delete a prompt', () => {
      const store = usePromptStore.getState();
      
      const promptId = store.createPrompt(testPromptData);
      store.deletePrompt(promptId);
      
      expect(store.prompts).toHaveLength(0);
      expect(store.getPromptById(promptId)).toBeUndefined();
    });

    it('should duplicate a prompt', () => {
      const store = usePromptStore.getState();
      
      const originalId = store.createPrompt(testPromptData);
      const duplicateId = store.duplicatePrompt(originalId);
      
      expect(store.prompts).toHaveLength(2);
      
      const duplicate = store.getPromptById(duplicateId);
      expect(duplicate?.title).toBe('Test Prompt (Copy)');
      expect(duplicate?.content).toBe(testPromptData.content);
      expect(duplicate?.tags).toEqual(testPromptData.tags);
      expect(duplicate?.isFavorite).toBe(false);
    });

    it('should return empty string when duplicating non-existent prompt', () => {
      const store = usePromptStore.getState();
      
      const result = store.duplicatePrompt('non-existent');
      
      expect(result).toBe('');
      expect(store.prompts).toHaveLength(0);
    });

    it('should get prompt by id', () => {
      const store = usePromptStore.getState();
      
      const promptId = store.createPrompt(testPromptData);
      
      const prompt = store.getPromptById(promptId);
      expect(prompt).toBeDefined();
      expect(prompt?.title).toBe('Test Prompt');
      
      const nonExistent = store.getPromptById('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Favorites Management', () => {
    let promptId: string;

    beforeEach(() => {
      const store = usePromptStore.getState();
      promptId = store.createPrompt({
        title: 'Test Prompt',
        content: 'Test content',
        tags: [],
        isFavorite: false,
      });
    });

    it('should toggle favorite status', () => {
      const store = usePromptStore.getState();
      
      expect(store.getPromptById(promptId)?.isFavorite).toBe(false);
      
      store.toggleFavorite(promptId);
      expect(store.getPromptById(promptId)?.isFavorite).toBe(true);
      
      store.toggleFavorite(promptId);
      expect(store.getPromptById(promptId)?.isFavorite).toBe(false);
    });

    it('should get favorite prompts', () => {
      const store = usePromptStore.getState();
      
      const favoriteId = store.createPrompt({
        title: 'Favorite Prompt',
        content: 'Favorite content',
        tags: [],
        isFavorite: true,
      });
      
      const favorites = store.getFavoritePrompts();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].id).toBe(favoriteId);
    });
  });

  describe('Usage Tracking', () => {
    let promptId: string;

    beforeEach(() => {
      const store = usePromptStore.getState();
      promptId = store.createPrompt({
        title: 'Test Prompt',
        content: 'Test content',
        tags: [],
        isFavorite: false,
      });
    });

    it('should increment usage count', () => {
      const store = usePromptStore.getState();
      
      expect(store.getPromptById(promptId)?.usageCount).toBe(0);
      
      store.incrementUsage(promptId);
      expect(store.getPromptById(promptId)?.usageCount).toBe(1);
      
      store.incrementUsage(promptId);
      expect(store.getPromptById(promptId)?.usageCount).toBe(2);
    });

    it('should reset usage count', () => {
      const store = usePromptStore.getState();
      
      store.incrementUsage(promptId);
      store.incrementUsage(promptId);
      expect(store.getPromptById(promptId)?.usageCount).toBe(2);
      
      store.resetUsageCount(promptId);
      expect(store.getPromptById(promptId)?.usageCount).toBe(0);
    });

    it('should get most used prompts', () => {
      const store = usePromptStore.getState();
      
      const prompt2Id = store.createPrompt({
        title: 'Prompt 2',
        content: 'Content 2',
        tags: [],
        isFavorite: false,
      });
      
      // Use prompt2 more than prompt1
      store.incrementUsage(promptId);
      store.incrementUsage(prompt2Id);
      store.incrementUsage(prompt2Id);
      
      const mostUsed = store.getMostUsedPrompts();
      expect(mostUsed).toHaveLength(2);
      expect(mostUsed[0].id).toBe(prompt2Id); // Should be first (most used)
      expect(mostUsed[1].id).toBe(promptId);
    });

    it('should limit most used prompts', () => {
      const store = usePromptStore.getState();
      
      // Create multiple prompts with usage
      for (let i = 0; i < 5; i++) {
        const id = store.createPrompt({
          title: `Prompt ${i}`,
          content: `Content ${i}`,
          tags: [],
          isFavorite: false,
        });
        store.incrementUsage(id);
      }
      
      const mostUsed = store.getMostUsedPrompts(3);
      expect(mostUsed).toHaveLength(3);
    });
  });

  describe('Tag Management', () => {
    it('should add tags', () => {
      const store = usePromptStore.getState();
      
      store.addTag('new-tag');
      expect(store.tags).toContain('new-tag');
      
      // Should not add duplicate
      store.addTag('new-tag');
      expect(store.tags.filter(tag => tag === 'new-tag')).toHaveLength(1);
    });

    it('should not add empty or whitespace-only tags', () => {
      const store = usePromptStore.getState();
      
      store.addTag('');
      store.addTag('   ');
      
      expect(store.tags).toHaveLength(0);
    });

    it('should remove tags', () => {
      const store = usePromptStore.getState();
      
      const promptId = store.createPrompt({
        title: 'Test',
        content: 'Test',
        tags: ['tag1', 'tag2'],
        isFavorite: false,
      });
      
      store.removeTag('tag1');
      
      expect(store.tags).not.toContain('tag1');
      expect(store.getPromptById(promptId)?.tags).toEqual(['tag2']);
    });

    it('should update prompt tags', () => {
      const store = usePromptStore.getState();
      
      const promptId = store.createPrompt({
        title: 'Test',
        content: 'Test',
        tags: ['old-tag'],
        isFavorite: false,
      });
      
      store.updatePromptTags(promptId, ['new-tag1', 'new-tag2']);
      
      const prompt = store.getPromptById(promptId);
      expect(prompt?.tags).toEqual(['new-tag1', 'new-tag2']);
    });

    it('should get all tags', () => {
      const store = usePromptStore.getState();
      
      store.createPrompt({
        title: 'Test 1',
        content: 'Test',
        tags: ['tag1', 'tag2'],
        isFavorite: false,
      });
      
      store.createPrompt({
        title: 'Test 2',
        content: 'Test',
        tags: ['tag2', 'tag3'],
        isFavorite: false,
      });
      
      const allTags = store.getAllTags();
      expect(allTags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should get tag usage count', () => {
      const store = usePromptStore.getState();
      
      store.createPrompt({
        title: 'Test 1',
        content: 'Test',
        tags: ['common-tag'],
        isFavorite: false,
      });
      
      store.createPrompt({
        title: 'Test 2',
        content: 'Test',
        tags: ['common-tag', 'unique-tag'],
        isFavorite: false,
      });
      
      expect(store.getTagUsageCount('common-tag')).toBe(2);
      expect(store.getTagUsageCount('unique-tag')).toBe(1);
      expect(store.getTagUsageCount('non-existent')).toBe(0);
    });

    it('should cleanup unused tags', () => {
      const store = usePromptStore.getState();
      
      store.addTag('unused-tag');
      store.createPrompt({
        title: 'Test',
        content: 'Test',
        tags: ['used-tag'],
        isFavorite: false,
      });
      
      expect(store.tags).toContain('unused-tag');
      
      store.cleanupUnusedTags();
      
      expect(store.tags).not.toContain('unused-tag');
      expect(store.tags).toContain('used-tag');
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      const store = usePromptStore.getState();
      
      store.createPrompt({
        title: 'JavaScript Helper',
        description: 'Helps with JS code',
        content: 'Write JavaScript code for...',
        tags: ['javascript', 'coding'],
        isFavorite: false,
      });
      
      store.createPrompt({
        title: 'Python Script',
        description: 'Python automation',
        content: 'Create a Python script that...',
        tags: ['python', 'coding'],
        isFavorite: true,
      });
      
      store.createPrompt({
        title: 'Email Template',
        description: 'Professional email',
        content: 'Write a professional email...',
        tags: ['email', 'communication'],
        isFavorite: false,
      });
    });

    it('should set and get search query', () => {
      const store = usePromptStore.getState();
      
      store.setSearchQuery('javascript');
      expect(store.searchQuery).toBe('javascript');
    });

    it('should search prompts by title', () => {
      const store = usePromptStore.getState();
      
      const results = store.searchPrompts('javascript');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Helper');
    });

    it('should search prompts by content', () => {
      const store = usePromptStore.getState();
      
      const results = store.searchPrompts('python script');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Python Script');
    });

    it('should search prompts by tags', () => {
      const store = usePromptStore.getState();
      
      const results = store.searchPrompts('coding');
      expect(results).toHaveLength(2);
    });

    it('should manage selected tags', () => {
      const store = usePromptStore.getState();
      
      store.addSelectedTag('coding');
      expect(store.selectedTags).toContain('coding');
      
      store.addSelectedTag('javascript');
      expect(store.selectedTags).toEqual(['coding', 'javascript']);
      
      store.removeSelectedTag('coding');
      expect(store.selectedTags).toEqual(['javascript']);
      
      store.clearSelectedTags();
      expect(store.selectedTags).toHaveLength(0);
    });

    it('should get filtered prompts', () => {
      const store = usePromptStore.getState();
      
      // Filter by search query
      store.setSearchQuery('python');
      let filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Python Script');
      
      // Clear search and filter by tags
      store.setSearchQuery('');
      store.setSelectedTags(['coding']);
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(2);
      
      // Combine search and tags
      store.setSearchQuery('javascript');
      store.setSelectedTags(['coding']);
      filtered = store.getFilteredPrompts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('JavaScript Helper');
    });

    it('should get prompts by tag', () => {
      const store = usePromptStore.getState();
      
      const codingPrompts = store.getPromptsByTag('coding');
      expect(codingPrompts).toHaveLength(2);
      
      const emailPrompts = store.getPromptsByTag('email');
      expect(emailPrompts).toHaveLength(1);
      expect(emailPrompts[0].title).toBe('Email Template');
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      const store = usePromptStore.getState();
      
      // Create prompts with different properties for sorting
      const id1 = store.createPrompt({
        title: 'B Prompt',
        content: 'Content B',
        tags: [],
        isFavorite: false,
      });
      
      const id2 = store.createPrompt({
        title: 'A Prompt',
        content: 'Content A',
        tags: [],
        isFavorite: false,
      });
      
      // Add usage to first prompt
      store.incrementUsage(id1);
      store.incrementUsage(id1);
      store.incrementUsage(id2);
    });

    it('should set sort criteria', () => {
      const store = usePromptStore.getState();
      
      store.setSortBy('title');
      expect(store.sortBy).toBe('title');
      
      store.setSortOrder('asc');
      expect(store.sortOrder).toBe('asc');
    });

    it('should sort prompts by title', () => {
      const store = usePromptStore.getState();
      
      store.setSortBy('title');
      store.setSortOrder('asc');
      
      const sorted = store.getSortedPrompts(store.prompts);
      expect(sorted[0].title).toBe('A Prompt');
      expect(sorted[1].title).toBe('B Prompt');
    });

    it('should sort prompts by usage count', () => {
      const store = usePromptStore.getState();
      
      store.setSortBy('usageCount');
      store.setSortOrder('desc');
      
      const sorted = store.getSortedPrompts(store.prompts);
      expect(sorted[0].title).toBe('B Prompt'); // Has 2 uses
      expect(sorted[1].title).toBe('A Prompt'); // Has 1 use
    });

    it('should respect sort order', () => {
      const store = usePromptStore.getState();
      
      store.setSortBy('title');
      store.setSortOrder('desc');
      
      const sorted = store.getSortedPrompts(store.prompts);
      expect(sorted[0].title).toBe('B Prompt');
      expect(sorted[1].title).toBe('A Prompt');
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      const store = usePromptStore.getState();
      
      // Create test prompts with different timestamps
      store.createPrompt({
        title: 'Recent Prompt',
        content: 'Recent content',
        tags: [],
        isFavorite: false,
      });
    });

    it('should get recent prompts', () => {
      const store = usePromptStore.getState();
      
      const recent = store.getRecentPrompts(5);
      expect(recent).toHaveLength(1);
      expect(recent[0].title).toBe('Recent Prompt');
    });
  });

  describe('Bulk Operations', () => {
    const testPrompts: SavedPrompt[] = [
      {
        id: 'import-1',
        title: 'Imported Prompt 1',
        content: 'Imported content 1',
        tags: ['imported'],
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isFavorite: false,
      },
      {
        id: 'import-2',
        title: 'Imported Prompt 2',
        content: 'Imported content 2',
        tags: ['imported', 'test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 5,
        isFavorite: true,
      },
    ];

    it('should import prompts', () => {
      const store = usePromptStore.getState();
      
      store.importPrompts(testPrompts);
      
      expect(store.prompts).toHaveLength(2);
      expect(store.tags).toContain('imported');
      expect(store.tags).toContain('test');
    });

    it('should not import duplicate prompts', () => {
      const store = usePromptStore.getState();
      
      store.importPrompts(testPrompts);
      store.importPrompts(testPrompts); // Import again
      
      expect(store.prompts).toHaveLength(2); // Should still be 2
    });

    it('should export prompts', () => {
      const store = usePromptStore.getState();
      
      store.createPrompt({
        title: 'Test Prompt',
        content: 'Test content',
        tags: ['test'],
        isFavorite: false,
      });
      
      const exported = store.exportPrompts();
      expect(exported).toHaveLength(1);
      expect(exported[0].title).toBe('Test Prompt');
    });

    it('should clear all prompts', () => {
      const store = usePromptStore.getState();
      
      store.createPrompt({
        title: 'Test Prompt',
        content: 'Test content',
        tags: ['test'],
        isFavorite: false,
      });
      
      store.setSearchQuery('test');
      store.setSelectedTags(['test']);
      
      store.clearAllPrompts();
      
      expect(store.prompts).toHaveLength(0);
      expect(store.tags).toHaveLength(0);
      expect(store.searchQuery).toBe('');
      expect(store.selectedTags).toHaveLength(0);
    });
  });

  describe('Loading State', () => {
    it('should manage loading state', () => {
      const store = usePromptStore.getState();
      
      expect(store.isLoading).toBe(false);
      
      store.setLoading(true);
      expect(store.isLoading).toBe(true);
      
      store.setLoading(false);
      expect(store.isLoading).toBe(false);
    });
  });
});