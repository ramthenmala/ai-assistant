import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestChatStore } from './testUtils';
import type { Message } from '../../types';

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

describe('useChatStore', () => {
  let store: ReturnType<typeof createTestChatStore>;

  beforeEach(() => {
    // Create a fresh store instance for each test
    store = createTestChatStore();
  });

  describe('Chat Management', () => {
    it('should create a new chat', () => {
      const chatId = store.getState().createChat('Test Chat');
      const state = store.getState();

      expect(chatId).toBeDefined();
      expect(state.chats).toHaveLength(1);
      expect(state.chats[0].title).toBe('Test Chat');
      expect(state.currentChatId).toBe(chatId);
    });

    it('should create a chat with default title when none provided', () => {
      const chatId = store.getState().createChat();
      const state = store.getState();

      expect(state.chats[0].title).toBe('New Chat');
    });

    it('should delete a chat', () => {
      const state = store.getState();
      const chatId = state.createChat('Test Chat');
      
      state.deleteChat(chatId);
      
      expect(store.getState().chats).toHaveLength(0);
      expect(store.getState().currentChatId).toBeNull();
    });

    it('should update chat title', () => {
      const state = store.getState();
      const chatId = state.createChat('Old Title');
      
      state.updateChatTitle(chatId, 'New Title');
      
      expect(store.getState().chats[0].title).toBe('New Title');
    });

    it('should set current chat', () => {
      const state = store.getState();
      const chatId = state.createChat('Test Chat');
      
      state.setCurrentChat(null);
      expect(store.getState().currentChatId).toBeNull();
      
      state.setCurrentChat(chatId);
      expect(store.getState().currentChatId).toBe(chatId);
    });

    it('should get chat by id', () => {
      const state = store.getState();
      const chatId = state.createChat('Test Chat');
      
      const chat = state.getChatById(chatId);
      expect(chat).toBeDefined();
      expect(chat?.title).toBe('Test Chat');
      
      const nonExistentChat = state.getChatById('non-existent');
      expect(nonExistentChat).toBeUndefined();
    });
  });

  describe('Message Management', () => {
    let chatId: string;

    beforeEach(() => {
      const state = store.getState();
      chatId = state.createChat('Test Chat');
    });

    it('should add a message to chat', () => {
      const state = store.getState();
      const messageData = {
        content: 'Hello, world!',
        role: 'user' as const,
        isEdited: false,
      };
      
      const messageId = state.addMessage(chatId, messageData);
      
      expect(messageId).toBeDefined();
      expect(store.getState().chats[0].messages).toHaveLength(1);
      expect(store.getState().chats[0].messages[0].content).toBe('Hello, world!');
      expect(store.getState().chats[0].messages[0].role).toBe('user');
    });

    it('should edit a message', () => {
      const state = store.getState();
      const messageId = state.addMessage(chatId, {
        content: 'Original content',
        role: 'user',
        isEdited: false,
      });
      
      state.editMessage(chatId, messageId, 'Edited content');
      
      const message = state.getMessageById(chatId, messageId);
      expect(message?.content).toBe('Edited content');
      expect(message?.isEdited).toBe(true);
    });

    it('should delete a message', () => {
      const state = store.getState();
      const messageId = state.addMessage(chatId, {
        content: 'Test message',
        role: 'user',
        isEdited: false,
      });
      
      state.deleteMessage(chatId, messageId);
      
      expect(store.getState().chats[0].messages).toHaveLength(0);
    });

    it('should get message by id', () => {
      const state = store.getState();
      const messageId = state.addMessage(chatId, {
        content: 'Test message',
        role: 'user',
        isEdited: false,
      });
      
      const message = state.getMessageById(chatId, messageId);
      expect(message).toBeDefined();
      expect(message?.content).toBe('Test message');
    });

    it('should get current messages', () => {
      const state = store.getState();
      state.addMessage(chatId, {
        content: 'Message 1',
        role: 'user',
        isEdited: false,
      });
      state.addMessage(chatId, {
        content: 'Message 2',
        role: 'assistant',
        isEdited: false,
      });
      
      const messages = state.getCurrentMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });
  });

  describe('Branch Management', () => {
    let chatId: string;
    let messageId: string;

    beforeEach(() => {
      const state = store.getState();
      chatId = state.createChat('Test Chat');
      messageId = state.addMessage(chatId, {
        content: 'Base message',
        role: 'user',
        isEdited: false,
      });
    });

    it('should create a branch', () => {
      const state = store.getState();
      const branchId = state.createBranch(chatId, messageId, 'Test Branch');
      
      expect(branchId).toBeDefined();
      expect(store.getState().chats[0].branches).toHaveLength(1);
      expect(store.getState().chats[0].branches[0].title).toBe('Test Branch');
      expect(store.getState().currentBranchId).toBe(branchId);
    });

    it('should create branch with default title', () => {
      const state = store.getState();
      const branchId = state.createBranch(chatId, messageId);
      
      expect(store.getState().chats[0].branches[0].title).toBe('Branch 1');
    });

    it('should delete a branch', () => {
      const state = store.getState();
      const branchId = state.createBranch(chatId, messageId, 'Test Branch');
      
      state.deleteBranch(chatId, branchId);
      
      expect(store.getState().chats[0].branches).toHaveLength(0);
      expect(store.getState().currentBranchId).toBeNull();
    });

    it('should switch branch', () => {
      const state = store.getState();
      const branchId = state.createBranch(chatId, messageId, 'Test Branch');
      
      state.switchBranch(chatId, branchId);
      expect(store.getState().currentBranchId).toBe(branchId);
    });

    it('should update branch title', () => {
      const state = store.getState();
      const branchId = state.createBranch(chatId, messageId, 'Old Title');
      
      state.updateBranchTitle(chatId, branchId, 'New Title');
      
      expect(store.getState().chats[0].branches[0].title).toBe('New Title');
    });

    it('should get branch by id', () => {
      const state = store.getState();
      const branchId = state.createBranch(chatId, messageId, 'Test Branch');
      
      const branch = state.getBranchById(chatId, branchId);
      expect(branch).toBeDefined();
      expect(branch?.title).toBe('Test Branch');
    });
  });

  describe('Streaming Management', () => {
    it('should manage streaming state', () => {
      const state = store.getState();
      
      state.setIsStreaming(true);
      expect(store.getState().isStreaming).toBe(true);
      
      state.setIsStreaming(false);
      expect(store.getState().isStreaming).toBe(false);
    });

    it('should set streaming message', () => {
      const state = store.getState();
      
      state.setStreamingMessage('message-id');
      expect(store.getState().streamingMessageId).toBe('message-id');
      
      state.setStreamingMessage(null);
      expect(store.getState().streamingMessageId).toBeNull();
    });

    it('should update streaming content', () => {
      const state = store.getState();
      const chatId = state.createChat('Test Chat');
      const messageId = state.addMessage(chatId, {
        content: 'Initial content',
        role: 'assistant',
        isEdited: false,
      });
      
      state.updateStreamingContent(chatId, messageId, 'Updated streaming content');
      
      const message = state.getMessageById(chatId, messageId);
      expect(message?.content).toBe('Updated streaming content');
    });
  });

  describe('Utility Functions', () => {
    it('should clear all chats', () => {
      const state = store.getState();
      state.createChat('Chat 1');
      state.createChat('Chat 2');
      
      expect(store.getState().chats).toHaveLength(2);
      
      state.clearAllChats();
      
      expect(store.getState().chats).toHaveLength(0);
      expect(store.getState().currentChatId).toBeNull();
      expect(store.getState().currentBranchId).toBeNull();
      expect(store.getState().streamingMessageId).toBeNull();
      expect(store.getState().isStreaming).toBe(false);
    });
  });
});