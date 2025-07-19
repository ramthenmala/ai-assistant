import { describe, it, expect } from 'vitest';
import type { Message, Chat, Branch, SavedPrompt, KnowledgeSource, KnowledgeStack } from '../index';
import { generateId, getCurrentTimestamp, validation } from '../../utils';

// Factory functions for creating test data
export const createTestMessage = (overrides: Partial<Message> = {}): Message => ({
  id: generateId(),
  content: 'Test message content',
  role: 'user',
  timestamp: getCurrentTimestamp(),
  isEdited: false,
  ...overrides
});

export const createTestBranch = (overrides: Partial<Branch> = {}): Branch => ({
  id: generateId(),
  parentMessageId: generateId(),
  messages: [],
  createdAt: getCurrentTimestamp(),
  ...overrides
});

export const createTestChat = (overrides: Partial<Chat> = {}): Chat => ({
  id: generateId(),
  title: 'Test Chat',
  createdAt: getCurrentTimestamp(),
  updatedAt: getCurrentTimestamp(),
  messages: [],
  branches: [],
  activeKnowledgeStacks: [],
  ...overrides
});

export const createTestSavedPrompt = (overrides: Partial<SavedPrompt> = {}): SavedPrompt => ({
  id: generateId(),
  title: 'Test Prompt',
  content: 'Test prompt content',
  tags: ['test', 'example'],
  createdAt: getCurrentTimestamp(),
  updatedAt: getCurrentTimestamp(),
  usageCount: 0,
  isFavorite: false,
  ...overrides
});

export const createTestKnowledgeSource = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource => ({
  id: generateId(),
  name: 'Test Source',
  type: 'file',
  path: '/test/path',
  stackId: generateId(),
  status: 'ready',
  size: 1024,
  ...overrides
});

export const createTestKnowledgeStack = (overrides: Partial<KnowledgeStack> = {}): KnowledgeStack => ({
  id: generateId(),
  name: 'Test Stack',
  sources: [],
  isActive: true,
  createdAt: getCurrentTimestamp(),
  updatedAt: getCurrentTimestamp(),
  ...overrides
});

describe('Data Model Factories', () => {
  describe('createTestMessage', () => {
    it('should create valid message objects', () => {
      const message = createTestMessage();
      expect(validation.isValidMessage(message)).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const message = createTestMessage({
        content: 'Custom content',
        role: 'assistant',
        isEdited: true
      });
      
      expect(message.content).toBe('Custom content');
      expect(message.role).toBe('assistant');
      expect(message.isEdited).toBe(true);
      expect(validation.isValidMessage(message)).toBe(true);
    });

    it('should create messages with optional fields', () => {
      const message = createTestMessage({
        parentId: 'parent-123',
        branchId: 'branch-123',
        metadata: { key: 'value' }
      });
      
      expect(message.parentId).toBe('parent-123');
      expect(message.branchId).toBe('branch-123');
      expect(message.metadata).toEqual({ key: 'value' });
      expect(validation.isValidMessage(message)).toBe(true);
    });
  });

  describe('createTestBranch', () => {
    it('should create valid branch objects', () => {
      const branch = createTestBranch();
      expect(validation.isValidBranch(branch)).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const messages = [createTestMessage()];
      const branch = createTestBranch({
        title: 'Custom Branch',
        messages
      });
      
      expect(branch.title).toBe('Custom Branch');
      expect(branch.messages).toBe(messages);
      expect(validation.isValidBranch(branch)).toBe(true);
    });
  });

  describe('createTestChat', () => {
    it('should create valid chat objects', () => {
      const chat = createTestChat();
      expect(validation.isValidChat(chat)).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const messages = [createTestMessage()];
      const branches = [createTestBranch()];
      const chat = createTestChat({
        title: 'Custom Chat',
        messages,
        branches,
        folderId: 'folder-123'
      });
      
      expect(chat.title).toBe('Custom Chat');
      expect(chat.messages).toBe(messages);
      expect(chat.branches).toBe(branches);
      expect(chat.folderId).toBe('folder-123');
      expect(validation.isValidChat(chat)).toBe(true);
    });

    it('should create chats with knowledge stacks', () => {
      const chat = createTestChat({
        activeKnowledgeStacks: ['stack-1', 'stack-2']
      });
      
      expect(chat.activeKnowledgeStacks).toEqual(['stack-1', 'stack-2']);
      expect(validation.isValidChat(chat)).toBe(true);
    });
  });

  describe('createTestSavedPrompt', () => {
    it('should create valid prompt objects', () => {
      const prompt = createTestSavedPrompt();
      expect(validation.isValidSavedPrompt(prompt)).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const prompt = createTestSavedPrompt({
        title: 'Custom Prompt',
        description: 'Custom description',
        content: 'Custom content',
        tags: ['custom', 'tags'],
        usageCount: 5,
        isFavorite: true
      });
      
      expect(prompt.title).toBe('Custom Prompt');
      expect(prompt.description).toBe('Custom description');
      expect(prompt.content).toBe('Custom content');
      expect(prompt.tags).toEqual(['custom', 'tags']);
      expect(prompt.usageCount).toBe(5);
      expect(prompt.isFavorite).toBe(true);
      expect(validation.isValidSavedPrompt(prompt)).toBe(true);
    });
  });

  describe('createTestKnowledgeSource', () => {
    it('should create valid knowledge source objects', () => {
      const source = createTestKnowledgeSource();
      expect(validation.isValidKnowledgeSource(source)).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const source = createTestKnowledgeSource({
        name: 'Custom Source',
        type: 'folder',
        path: '/custom/path',
        status: 'indexing',
        size: 2048,
        chunkCount: 10,
        indexedAt: getCurrentTimestamp()
      });
      
      expect(source.name).toBe('Custom Source');
      expect(source.type).toBe('folder');
      expect(source.path).toBe('/custom/path');
      expect(source.status).toBe('indexing');
      expect(source.size).toBe(2048);
      expect(source.chunkCount).toBe(10);
      expect(source.indexedAt).toBeInstanceOf(Date);
      expect(validation.isValidKnowledgeSource(source)).toBe(true);
    });
  });

  describe('createTestKnowledgeStack', () => {
    it('should create valid knowledge stack objects', () => {
      const stack = createTestKnowledgeStack();
      expect(validation.isValidKnowledgeStack(stack)).toBe(true);
    });

    it('should apply overrides correctly', () => {
      const sources = [createTestKnowledgeSource()];
      const stack = createTestKnowledgeStack({
        name: 'Custom Stack',
        description: 'Custom description',
        sources,
        isActive: false
      });
      
      expect(stack.name).toBe('Custom Stack');
      expect(stack.description).toBe('Custom description');
      expect(stack.sources).toBe(sources);
      expect(stack.isActive).toBe(false);
      expect(validation.isValidKnowledgeStack(stack)).toBe(true);
    });
  });
});

describe('Data Model Integration', () => {
  it('should create complex chat with messages and branches', () => {
    const message1 = createTestMessage({ content: 'First message' });
    const message2 = createTestMessage({ 
      content: 'Second message', 
      role: 'assistant',
      parentId: message1.id 
    });
    
    const branch = createTestBranch({
      parentMessageId: message1.id,
      messages: [message2],
      title: 'Alternative response'
    });
    
    const chat = createTestChat({
      title: 'Complex Chat',
      messages: [message1, message2],
      branches: [branch]
    });
    
    expect(validation.isValidChat(chat)).toBe(true);
    expect(chat.messages).toHaveLength(2);
    expect(chat.branches).toHaveLength(1);
    expect(chat.branches[0].messages).toHaveLength(1);
  });

  it('should create knowledge stack with sources', () => {
    const source1 = createTestKnowledgeSource({
      name: 'Document 1',
      type: 'file',
      path: '/docs/doc1.pdf'
    });
    
    const source2 = createTestKnowledgeSource({
      name: 'Document 2',
      type: 'file',
      path: '/docs/doc2.txt'
    });
    
    const stack = createTestKnowledgeStack({
      name: 'Research Stack',
      sources: [source1, source2],
      description: 'Stack for research documents'
    });
    
    expect(validation.isValidKnowledgeStack(stack)).toBe(true);
    expect(stack.sources).toHaveLength(2);
    expect(stack.sources.every(s => validation.isValidKnowledgeSource(s))).toBe(true);
  });

  it('should maintain referential integrity', () => {
    const parentMessage = createTestMessage({ content: 'Parent message' });
    const childMessage = createTestMessage({ 
      content: 'Child message',
      parentId: parentMessage.id
    });
    
    const branch = createTestBranch({
      parentMessageId: parentMessage.id,
      messages: [childMessage]
    });
    
    expect(childMessage.parentId).toBe(parentMessage.id);
    expect(branch.parentMessageId).toBe(parentMessage.id);
    expect(branch.messages[0].parentId).toBe(parentMessage.id);
  });
});