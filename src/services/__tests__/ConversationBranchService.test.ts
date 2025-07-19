import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationBranchService } from '../ConversationBranchService';
import type { Chat, Message } from '@/types';

describe('ConversationBranchService', () => {
  let service: ConversationBranchService;
  let mockChat: Chat;
  let mockMessages: Message[];

  beforeEach(() => {
    service = new ConversationBranchService();
    
    mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello, how are you?',
        role: 'user',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        isEdited: false
      },
      {
        id: 'msg-2',
        content: 'I am doing well, thank you!',
        role: 'assistant',
        timestamp: new Date('2023-01-01T10:01:00Z'),
        isEdited: false
      },
      {
        id: 'msg-3',
        content: 'What can you help me with?',
        role: 'user',
        timestamp: new Date('2023-01-01T10:02:00Z'),
        isEdited: false
      }
    ];

    mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:02:00Z'),
      messages: mockMessages,
      branches: [],
      activeKnowledgeStacks: []
    };
  });

  describe('Initialization', () => {
    it('should initialize with main branch', () => {
      const branches = service.getBranchTree();
      expect(branches).toHaveLength(1);
      expect(branches[0].id).toBe('main');
      expect(branches[0].title).toBe('Main Conversation');
      expect(branches[0].isActive).toBe(true);
    });

    it('should have no messages in main branch initially', () => {
      const mainBranch = service.getBranch('main');
      expect(mainBranch).toBeDefined();
      expect(mainBranch?.messageCount).toBe(0);

      const messages = service.getBranchMessages('main');
      expect(messages).toHaveLength(0);
    });

    it('should get active branch correctly', () => {
      const activeBranch = service.getActiveBranch();
      expect(activeBranch).toBeDefined();
      expect(activeBranch?.id).toBe('main');
      expect(activeBranch?.isActive).toBe(true);
    });
  });

  describe('Loading from Chat', () => {
    it('should load chat messages into main branch', () => {
      service.loadFromChat(mockChat);
      
      const mainBranch = service.getBranch('main');
      expect(mainBranch?.messageCount).toBe(3);
      
      const messages = service.getBranchMessages('main');
      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[2].id).toBe('msg-3');
    });

    it('should load existing branches from chat', () => {
      const chatWithBranches = {
        ...mockChat,
        branches: [{
          id: 'branch-1',
          parentMessageId: 'msg-2',
          messages: mockMessages.slice(0, 2),
          title: 'Alternative Branch',
          createdAt: new Date('2023-01-01T10:01:30Z')
        }]
      };

      service.loadFromChat(chatWithBranches);
      const branches = service.getBranchTree();
      
      expect(branches).toHaveLength(2);
      expect(branches.find(b => b.id === 'branch-1')).toBeDefined();
    });
  });

  describe('Branch Creation', () => {
    beforeEach(() => {
      service.loadFromChat(mockChat);
    });

    it('should create a new branch from a message', () => {
      const { branchId, branch } = service.createBranch(
        mockChat,
        'msg-2',
        'New Branch',
        'Testing branch creation'
      );

      expect(branchId).toBeDefined();
      expect(branch.title).toBe('New Branch');
      expect(branch.parentBranchId).toBe('main');
      expect(branch.messageCount).toBe(2); // Messages up to msg-2
      expect(branch.isActive).toBe(false);
    });

    it('should copy messages up to branch point', () => {
      const { branchId } = service.createBranch(
        mockChat,
        'msg-2',
        'Test Branch'
      );

      const branchMessages = service.getBranchMessages(branchId);
      expect(branchMessages).toHaveLength(2);
      expect(branchMessages[0].id).toBe('msg-1');
      expect(branchMessages[1].id).toBe('msg-2');
    });

    it('should throw error for non-existent message', () => {
      expect(() => {
        service.createBranch(mockChat, 'non-existent', 'Test Branch');
      }).toThrow('Message not found in conversation');
    });

    it('should update branch tree after creation', () => {
      const initialBranches = service.getBranchTree();
      expect(initialBranches).toHaveLength(1);

      service.createBranch(mockChat, 'msg-2', 'New Branch');
      
      const updatedBranches = service.getBranchTree();
      expect(updatedBranches).toHaveLength(2);
    });
  });

  describe('Branch Switching', () => {
    let branchId: string;

    beforeEach(() => {
      service.loadFromChat(mockChat);
      const result = service.createBranch(mockChat, 'msg-2', 'Test Branch');
      branchId = result.branchId;
    });

    it('should switch to different branch', () => {
      const messages = service.switchBranch(branchId);
      
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[1].id).toBe('msg-2');
      
      const activeBranch = service.getActiveBranch();
      expect(activeBranch?.id).toBe(branchId);
    });

    it('should deactivate previous branch', () => {
      service.switchBranch(branchId);
      
      const mainBranch = service.getBranch('main');
      expect(mainBranch?.isActive).toBe(false);
    });

    it('should throw error for non-existent branch', () => {
      expect(() => {
        service.switchBranch('non-existent');
      }).toThrow('Branch not found');
    });
  });

  describe('Message Management', () => {
    beforeEach(() => {
      service.loadFromChat(mockChat);
    });

    it('should add message to active branch', () => {
      const newMessage: Message = {
        id: 'msg-4',
        content: 'New message',
        role: 'user',
        timestamp: new Date(),
        isEdited: false
      };

      service.addMessage(newMessage);
      
      const messages = service.getBranchMessages('main');
      expect(messages).toHaveLength(4);
      expect(messages[3].id).toBe('msg-4');
      
      const mainBranch = service.getBranch('main');
      expect(mainBranch?.messageCount).toBe(4);
    });

    it('should update branch metadata when adding message', () => {
      const branch = service.getBranch('main');
      const originalUpdatedAt = branch?.updatedAt;

      const newMessage: Message = {
        id: 'msg-4',
        content: 'New message',
        role: 'user',
        timestamp: new Date(),
        isEdited: false
      };

      service.addMessage(newMessage);
      
      const updatedBranch = service.getBranch('main');
      expect(updatedBranch?.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe('Branch Comparison', () => {
    let branch1Id: string;
    let branch2Id: string;

    beforeEach(() => {
      service.loadFromChat(mockChat);
      
      // Create two branches from different points
      const result1 = service.createBranch(mockChat, 'msg-2', 'Branch 1');
      branch1Id = result1.branchId;
      
      const result2 = service.createBranch(mockChat, 'msg-3', 'Branch 2');
      branch2Id = result2.branchId;
    });

    it('should compare two branches', () => {
      const comparison = service.compareBranches(branch1Id, branch2Id);
      
      expect(comparison.sourceBranch.id).toBe(branch1Id);
      expect(comparison.targetBranch.id).toBe(branch2Id);
      expect(comparison.similarityScore).toBeGreaterThan(0);
      expect(comparison.differences).toBeDefined();
    });

    it('should calculate similarity score correctly', () => {
      const comparison = service.compareBranches(branch1Id, branch2Id);
      
      // Branch 1 has 2 messages, Branch 2 has 3 messages
      // They share 2 common messages
      expect(comparison.similarityScore).toBe(2/3); // 2 common / 3 total
    });

    it('should detect differences correctly', () => {
      const comparison = service.compareBranches(branch1Id, branch2Id);
      
      // Branch 1 has no additional messages after common ancestor
      expect(comparison.differences.added).toHaveLength(0);
      // Branch 2 has 1 additional message after common ancestor
      expect(comparison.differences.removed).toHaveLength(1);
    });

    it('should throw error for non-existent branches', () => {
      expect(() => {
        service.compareBranches('non-existent', branch1Id);
      }).toThrow('One or both branches not found');
    });
  });

  describe('Branch Merging', () => {
    let sourceBranchId: string;
    let targetBranchId: string;

    beforeEach(() => {
      service.loadFromChat(mockChat);
      
      const result1 = service.createBranch(mockChat, 'msg-2', 'Source Branch');
      sourceBranchId = result1.branchId;
      
      const result2 = service.createBranch(mockChat, 'msg-2', 'Target Branch');
      targetBranchId = result2.branchId;
    });

    it('should merge branches with replace strategy', () => {
      const mergedMessages = service.mergeBranches(sourceBranchId, targetBranchId, {
        strategy: 'replace',
        keepBothOnConflict: false,
        preferSource: true
      });
      
      expect(mergedMessages).toHaveLength(2);
      
      const targetBranch = service.getBranch(targetBranchId);
      expect(targetBranch?.messageCount).toBe(2);
      expect(targetBranch?.tags).toContain('merged');
    });

    it('should merge branches with append strategy', () => {
      // Add different messages to each branch
      service.switchBranch(sourceBranchId);
      service.addMessage({
        id: 'msg-source',
        content: 'Source message',
        role: 'user',
        timestamp: new Date(),
        isEdited: false
      });

      service.switchBranch(targetBranchId);
      service.addMessage({
        id: 'msg-target',
        content: 'Target message',
        role: 'user',
        timestamp: new Date(),
        isEdited: false
      });

      const mergedMessages = service.mergeBranches(sourceBranchId, targetBranchId, {
        strategy: 'append',
        keepBothOnConflict: true,
        preferSource: false
      });
      
      expect(mergedMessages).toHaveLength(4); // 2 common + 1 target + 1 source
    });
  });

  describe('Branch Deletion', () => {
    let branchId: string;

    beforeEach(() => {
      service.loadFromChat(mockChat);
      const result = service.createBranch(mockChat, 'msg-2', 'Test Branch');
      branchId = result.branchId;
    });

    it('should delete branch successfully', () => {
      service.deleteBranch(branchId);
      
      const branch = service.getBranch(branchId);
      expect(branch).toBeUndefined();
      
      const branches = service.getBranchTree();
      expect(branches).toHaveLength(1); // Only main branch
    });

    it('should not allow deleting main branch', () => {
      expect(() => {
        service.deleteBranch('main');
      }).toThrow('Cannot delete main branch');
    });

    it('should switch to parent branch if deleting active branch', () => {
      service.switchBranch(branchId);
      expect(service.getActiveBranch()?.id).toBe(branchId);
      
      service.deleteBranch(branchId);
      expect(service.getActiveBranch()?.id).toBe('main');
    });

    it('should throw error for branches with children', () => {
      // Create a child branch
      service.createBranch(mockChat, 'msg-2', 'Child Branch');
      
      expect(() => {
        service.deleteBranch(branchId);
      }).toThrow('Cannot delete branch with children');
    });
  });

  describe('Branch Renaming', () => {
    let branchId: string;

    beforeEach(() => {
      service.loadFromChat(mockChat);
      const result = service.createBranch(mockChat, 'msg-2', 'Original Name');
      branchId = result.branchId;
    });

    it('should rename branch successfully', () => {
      service.renameBranch(branchId, 'New Name');
      
      const branch = service.getBranch(branchId);
      expect(branch?.title).toBe('New Name');
    });

    it('should update branch timestamp when renaming', () => {
      const originalBranch = service.getBranch(branchId);
      const originalUpdatedAt = originalBranch?.updatedAt;
      
      service.renameBranch(branchId, 'New Name');
      
      const updatedBranch = service.getBranch(branchId);
      expect(updatedBranch?.updatedAt).not.toEqual(originalUpdatedAt);
    });

    it('should throw error for non-existent branch', () => {
      expect(() => {
        service.renameBranch('non-existent', 'New Name');
      }).toThrow('Branch not found');
    });
  });

  describe('Chat Integration', () => {
    beforeEach(() => {
      service.loadFromChat(mockChat);
    });

    it('should update chat with branch data', () => {
      const branchId = service.createBranch(mockChat, 'msg-2', 'Test Branch').branchId;
      
      const updatedChat = service.updateChatWithBranch(mockChat, branchId);
      
      expect(updatedChat.branches).toHaveLength(2);
      expect(updatedChat.messages).toHaveLength(2); // Messages from the branch
      expect(updatedChat.metadata?.activeBranch).toBe(branchId);
      expect(updatedChat.metadata?.branchCount).toBe(2);
    });

    it('should throw error for non-existent branch in chat update', () => {
      expect(() => {
        service.updateChatWithBranch(mockChat, 'non-existent');
      }).toThrow('Branch not found');
    });
  });
});