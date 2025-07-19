import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateId,
  formatTimestamp,
  truncateText,
  generateChatTitle,
  isValidEmail,
  debounce,
  deepClone,
  getPlatform,
  storage,
  formatFileSize,
  getCurrentTimestamp,
  validation
} from '../index';
import type { Message, Chat, Branch, SavedPrompt, KnowledgeSource, KnowledgeStack } from '../../types';

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('should generate a unique string ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('formatTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for recent timestamps', () => {
      const now = new Date();
      vi.setSystemTime(now);
      
      const recent = new Date(now.getTime() - 30000); // 30 seconds ago
      expect(formatTimestamp(recent)).toBe('Just now');
    });

    it('should return minutes for timestamps within an hour', () => {
      const now = new Date();
      vi.setSystemTime(now);
      
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatTimestamp(fiveMinutesAgo)).toBe('5 minutes ago');
      
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      expect(formatTimestamp(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should return hours for timestamps within a day', () => {
      const now = new Date();
      vi.setSystemTime(now);
      
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatTimestamp(twoHoursAgo)).toBe('2 hours ago');
      
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      expect(formatTimestamp(oneHourAgo)).toBe('1 hour ago');
    });

    it('should return days for timestamps within a week', () => {
      const now = new Date();
      vi.setSystemTime(now);
      
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatTimestamp(threeDaysAgo)).toBe('3 days ago');
      
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(formatTimestamp(oneDayAgo)).toBe('1 day ago');
    });

    it('should return formatted date for older timestamps', () => {
      const now = new Date();
      vi.setSystemTime(now);
      
      const oldDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      expect(formatTimestamp(oldDate)).toBe(oldDate.toLocaleDateString());
    });
  });

  describe('truncateText', () => {
    it('should return original text if shorter than max length', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe(text);
    });

    it('should truncate text and add ellipsis if longer than max length', () => {
      const text = 'This is a very long text that should be truncated';
      const result = truncateText(text, 20);
      
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...' (may be less due to trim)
      expect(result.endsWith('...')).toBe(true);
      expect(result.startsWith('This is a very long')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('abc', 3)).toBe('abc');
      expect(truncateText('abcd', 3)).toBe('abc...');
    });
  });

  describe('generateChatTitle', () => {
    it('should return original message if 50 characters or less', () => {
      const message = 'Short message';
      expect(generateChatTitle(message)).toBe(message);
    });

    it('should truncate at word boundary when possible', () => {
      const message = 'This is a very long message that should be truncated at word boundary';
      const result = generateChatTitle(message);
      
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result.endsWith('...')).toBe(true);
      expect(result.includes(' ')).toBe(true);
    });

    it('should handle messages without spaces', () => {
      const message = 'a'.repeat(60);
      const result = generateChatTitle(message);
      
      expect(result.length).toBe(50); // 47 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should trim whitespace', () => {
      const message = '  Trimmed message  ';
      expect(generateChatTitle(message)).toBe('Trimmed message');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should cancel previous calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      debouncedFn('second');
      
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });

    it('should clone dates', () => {
      const date = new Date();
      const cloned = deepClone(date);
      
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);
      
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });
  });

  describe('getPlatform', () => {
    it('should return "web" by default in test environment', () => {
      // In test environment, electronAPI is undefined by default
      expect(getPlatform()).toBe('web');
    });

    it('should detect platform based on electronAPI presence', () => {
      // Test the logic by checking what the function looks for
      const hasElectronAPI = typeof window !== 'undefined' && window.electronAPI;
      const expectedPlatform = hasElectronAPI ? 'electron' : 'web';
      
      expect(getPlatform()).toBe(expectedPlatform);
    });
  });

  describe('storage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should store and retrieve data', () => {
      const testData = { key: 'value', number: 42 };
      storage.set('test', testData);
      
      const retrieved = storage.get('test');
      expect(retrieved).toEqual(testData);
    });

    it('should return default value when key does not exist', () => {
      const defaultValue = { default: true };
      const result = storage.get('nonexistent', defaultValue);
      
      expect(result).toEqual(defaultValue);
    });

    it('should return null when no default value provided', () => {
      const result = storage.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should remove items', () => {
      storage.set('test', 'value');
      storage.remove('test');
      
      expect(storage.get('test')).toBeNull();
    });

    it('should clear all items', () => {
      storage.set('test1', 'value1');
      storage.set('test2', 'value2');
      storage.clear();
      
      expect(storage.get('test1')).toBeNull();
      expect(storage.get('test2')).toBeNull();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return a Date object', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toBeInstanceOf(Date);
    });

    it('should return current time', () => {
      const before = Date.now();
      const timestamp = getCurrentTimestamp();
      const after = Date.now();
      
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(timestamp.getTime()).toBeLessThanOrEqual(after);
    });
  });
});

describe('Validation Functions', () => {
  describe('validation.isValidMessage', () => {
    const validMessage: Message = {
      id: 'msg-123',
      content: 'Hello world',
      role: 'user',
      timestamp: new Date(),
      isEdited: false
    };

    it('should validate correct message objects', () => {
      expect(validation.isValidMessage(validMessage)).toBe(true);
      
      const messageWithOptionals: Message = {
        ...validMessage,
        parentId: 'parent-123',
        branchId: 'branch-123',
        metadata: { key: 'value' }
      };
      expect(validation.isValidMessage(messageWithOptionals)).toBe(true);
    });

    it('should reject invalid message objects', () => {
      expect(validation.isValidMessage(null)).toBe(false);
      expect(validation.isValidMessage({})).toBe(false);
      expect(validation.isValidMessage({ ...validMessage, id: '' })).toBe(false);
      expect(validation.isValidMessage({ ...validMessage, id: 123 })).toBe(false);
      expect(validation.isValidMessage({ ...validMessage, content: 123 })).toBe(false);
      expect(validation.isValidMessage({ ...validMessage, role: 'invalid' })).toBe(false);
      expect(validation.isValidMessage({ ...validMessage, timestamp: 'invalid' })).toBe(false);
      expect(validation.isValidMessage({ ...validMessage, isEdited: 'invalid' })).toBe(false);
    });
  });

  describe('validation.isValidBranch', () => {
    const validBranch: Branch = {
      id: 'branch-123',
      parentMessageId: 'msg-123',
      messages: [],
      createdAt: new Date()
    };

    it('should validate correct branch objects', () => {
      expect(validation.isValidBranch(validBranch)).toBe(true);
      
      const branchWithTitle: Branch = {
        ...validBranch,
        title: 'Branch Title'
      };
      expect(validation.isValidBranch(branchWithTitle)).toBe(true);
    });

    it('should reject invalid branch objects', () => {
      expect(validation.isValidBranch(null)).toBe(false);
      expect(validation.isValidBranch({})).toBe(false);
      expect(validation.isValidBranch({ ...validBranch, id: '' })).toBe(false);
      expect(validation.isValidBranch({ ...validBranch, parentMessageId: '' })).toBe(false);
      expect(validation.isValidBranch({ ...validBranch, messages: 'invalid' })).toBe(false);
      expect(validation.isValidBranch({ ...validBranch, createdAt: 'invalid' })).toBe(false);
    });
  });

  describe('validation.isValidChat', () => {
    const validChat: Chat = {
      id: 'chat-123',
      title: 'Test Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      branches: [],
      activeKnowledgeStacks: []
    };

    it('should validate correct chat objects', () => {
      expect(validation.isValidChat(validChat)).toBe(true);
      
      const chatWithOptionals: Chat = {
        ...validChat,
        folderId: 'folder-123',
        metadata: { key: 'value' }
      };
      expect(validation.isValidChat(chatWithOptionals)).toBe(true);
    });

    it('should reject invalid chat objects', () => {
      expect(validation.isValidChat(null)).toBe(false);
      expect(validation.isValidChat({})).toBe(false);
      expect(validation.isValidChat({ ...validChat, id: '' })).toBe(false);
      expect(validation.isValidChat({ ...validChat, title: '' })).toBe(false);
      expect(validation.isValidChat({ ...validChat, messages: 'invalid' })).toBe(false);
      expect(validation.isValidChat({ ...validChat, branches: 'invalid' })).toBe(false);
      expect(validation.isValidChat({ ...validChat, activeKnowledgeStacks: 'invalid' })).toBe(false);
    });
  });

  describe('validation.isValidSavedPrompt', () => {
    const validPrompt: SavedPrompt = {
      id: 'prompt-123',
      title: 'Test Prompt',
      content: 'Prompt content',
      tags: ['tag1', 'tag2'],
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isFavorite: false
    };

    it('should validate correct prompt objects', () => {
      expect(validation.isValidSavedPrompt(validPrompt)).toBe(true);
      
      const promptWithDescription: SavedPrompt = {
        ...validPrompt,
        description: 'Prompt description'
      };
      expect(validation.isValidSavedPrompt(promptWithDescription)).toBe(true);
    });

    it('should reject invalid prompt objects', () => {
      expect(validation.isValidSavedPrompt(null)).toBe(false);
      expect(validation.isValidSavedPrompt({})).toBe(false);
      expect(validation.isValidSavedPrompt({ ...validPrompt, id: '' })).toBe(false);
      expect(validation.isValidSavedPrompt({ ...validPrompt, title: '' })).toBe(false);
      expect(validation.isValidSavedPrompt({ ...validPrompt, content: '' })).toBe(false);
      expect(validation.isValidSavedPrompt({ ...validPrompt, tags: 'invalid' })).toBe(false);
      expect(validation.isValidSavedPrompt({ ...validPrompt, usageCount: -1 })).toBe(false);
      expect(validation.isValidSavedPrompt({ ...validPrompt, isFavorite: 'invalid' })).toBe(false);
    });
  });

  describe('validation.isValidKnowledgeSource', () => {
    const validSource: KnowledgeSource = {
      id: 'source-123',
      name: 'Test Source',
      type: 'file',
      path: '/path/to/file',
      stackId: 'stack-123',
      status: 'ready',
      size: 1024
    };

    it('should validate correct knowledge source objects', () => {
      expect(validation.isValidKnowledgeSource(validSource)).toBe(true);
      
      const sourceWithOptionals: KnowledgeSource = {
        ...validSource,
        indexedAt: new Date(),
        chunkCount: 10,
        metadata: { key: 'value' }
      };
      expect(validation.isValidKnowledgeSource(sourceWithOptionals)).toBe(true);
    });

    it('should reject invalid knowledge source objects', () => {
      expect(validation.isValidKnowledgeSource(null)).toBe(false);
      expect(validation.isValidKnowledgeSource({})).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, id: '' })).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, name: '' })).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, type: 'invalid' })).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, path: '' })).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, stackId: '' })).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, status: 'invalid' })).toBe(false);
      expect(validation.isValidKnowledgeSource({ ...validSource, size: -1 })).toBe(false);
    });
  });

  describe('validation.isValidKnowledgeStack', () => {
    const validStack: KnowledgeStack = {
      id: 'stack-123',
      name: 'Test Stack',
      sources: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate correct knowledge stack objects', () => {
      expect(validation.isValidKnowledgeStack(validStack)).toBe(true);
      
      const stackWithDescription: KnowledgeStack = {
        ...validStack,
        description: 'Stack description'
      };
      expect(validation.isValidKnowledgeStack(stackWithDescription)).toBe(true);
    });

    it('should reject invalid knowledge stack objects', () => {
      expect(validation.isValidKnowledgeStack(null)).toBe(false);
      expect(validation.isValidKnowledgeStack({})).toBe(false);
      expect(validation.isValidKnowledgeStack({ ...validStack, id: '' })).toBe(false);
      expect(validation.isValidKnowledgeStack({ ...validStack, name: '' })).toBe(false);
      expect(validation.isValidKnowledgeStack({ ...validStack, sources: 'invalid' })).toBe(false);
      expect(validation.isValidKnowledgeStack({ ...validStack, isActive: 'invalid' })).toBe(false);
    });
  });

  describe('validation helper functions', () => {
    describe('isNonEmptyString', () => {
      it('should validate non-empty strings', () => {
        expect(validation.isNonEmptyString('hello')).toBe(true);
        expect(validation.isNonEmptyString('  hello  ')).toBe(true);
      });

      it('should reject empty or invalid strings', () => {
        expect(validation.isNonEmptyString('')).toBe(false);
        expect(validation.isNonEmptyString('   ')).toBe(false);
        expect(validation.isNonEmptyString(123)).toBe(false);
        expect(validation.isNonEmptyString(null)).toBe(false);
      });
    });

    describe('isValidUUID', () => {
      it('should validate correct UUID formats', () => {
        expect(validation.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(validation.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should reject invalid UUID formats', () => {
        expect(validation.isValidUUID('invalid-uuid')).toBe(false);
        expect(validation.isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
        expect(validation.isValidUUID(123)).toBe(false);
        expect(validation.isValidUUID('')).toBe(false);
      });
    });

    describe('isStringArray', () => {
      it('should validate string arrays', () => {
        expect(validation.isStringArray([])).toBe(true);
        expect(validation.isStringArray(['a', 'b', 'c'])).toBe(true);
      });

      it('should reject non-string arrays', () => {
        expect(validation.isStringArray([1, 2, 3])).toBe(false);
        expect(validation.isStringArray(['a', 1, 'c'])).toBe(false);
        expect(validation.isStringArray('not-array')).toBe(false);
      });
    });

    describe('isPositiveNumber', () => {
      it('should validate positive numbers', () => {
        expect(validation.isPositiveNumber(0)).toBe(true);
        expect(validation.isPositiveNumber(42)).toBe(true);
        expect(validation.isPositiveNumber(3.14)).toBe(true);
      });

      it('should reject negative numbers and non-numbers', () => {
        expect(validation.isPositiveNumber(-1)).toBe(false);
        expect(validation.isPositiveNumber(NaN)).toBe(false);
        expect(validation.isPositiveNumber('42')).toBe(false);
        expect(validation.isPositiveNumber(null)).toBe(false);
      });
    });
  });
});