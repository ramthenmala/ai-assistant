import type { Chat, Message, Branch } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface BranchPoint {
  messageId: string;
  messageIndex: number;
  timestamp: Date;
  reason: string;
}

export interface BranchDiff {
  added: Message[];
  removed: Message[];
  modified: Message[];
  branchPoint: BranchPoint;
}

export interface BranchMetadata {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  parentBranchId?: string;
  branchPoint: BranchPoint;
  messageCount: number;
  isActive: boolean;
  tags: string[];
}

export interface BranchMergeOptions {
  strategy: 'replace' | 'append' | 'merge';
  keepBothOnConflict: boolean;
  preferSource: boolean;
}

export interface BranchComparisonResult {
  sourceBranch: BranchMetadata;
  targetBranch: BranchMetadata;
  differences: BranchDiff;
  similarityScore: number;
  canMerge: boolean;
  conflicts: string[];
}

export class ConversationBranchService {
  private branches: Map<string, BranchMetadata> = new Map();
  private branchMessages: Map<string, Message[]> = new Map();
  private activeBranch: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Initialize with main branch
    const mainBranch: BranchMetadata = {
      id: 'main',
      title: 'Main Conversation',
      description: 'The primary conversation thread',
      createdAt: new Date(),
      updatedAt: new Date(),
      branchPoint: {
        messageId: 'root',
        messageIndex: 0,
        timestamp: new Date(),
        reason: 'Initial conversation'
      },
      messageCount: 0,
      isActive: true,
      tags: ['main']
    };

    this.branches.set('main', mainBranch);
    this.branchMessages.set('main', []);
    this.activeBranch = 'main';
  }

  /**
   * Create a new branch from a specific message
   */
  createBranch(
    chat: Chat,
    fromMessageId: string,
    title: string,
    reason: string = 'User-created branch'
  ): { branchId: string; branch: BranchMetadata } {
    const messageIndex = chat.messages.findIndex(m => m.id === fromMessageId);
    if (messageIndex === -1) {
      throw new Error('Message not found in conversation');
    }

    const branchId = uuidv4();
    const parentBranchId = this.activeBranch || 'main';
    
    const branchPoint: BranchPoint = {
      messageId: fromMessageId,
      messageIndex,
      timestamp: new Date(),
      reason
    };

    // Copy messages up to the branch point
    const branchMessages = chat.messages.slice(0, messageIndex + 1);
    
    const branch: BranchMetadata = {
      id: branchId,
      title,
      description: `Branched from message: "${chat.messages[messageIndex].content.substring(0, 50)}..."`,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentBranchId,
      branchPoint,
      messageCount: branchMessages.length,
      isActive: false,
      tags: ['user-created']
    };

    this.branches.set(branchId, branch);
    this.branchMessages.set(branchId, branchMessages);

    // Update parent branch to track children
    const parentBranch = this.branches.get(parentBranchId);
    if (parentBranch) {
      parentBranch.updatedAt = new Date();
    }

    return { branchId, branch };
  }

  /**
   * Switch to a different branch
   */
  switchBranch(branchId: string): Message[] {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error('Branch not found');
    }

    // Deactivate current branch
    if (this.activeBranch) {
      const currentBranch = this.branches.get(this.activeBranch);
      if (currentBranch) {
        currentBranch.isActive = false;
      }
    }

    // Activate new branch
    branch.isActive = true;
    branch.updatedAt = new Date();
    this.activeBranch = branchId;

    return this.branchMessages.get(branchId) || [];
  }

  /**
   * Add a message to the active branch
   */
  addMessage(message: Message): void {
    if (!this.activeBranch) {
      throw new Error('No active branch');
    }

    const messages = this.branchMessages.get(this.activeBranch) || [];
    messages.push(message);
    this.branchMessages.set(this.activeBranch, messages);

    // Update branch metadata
    const branch = this.branches.get(this.activeBranch);
    if (branch) {
      branch.messageCount = messages.length;
      branch.updatedAt = new Date();
    }
  }

  /**
   * Get all branches in a hierarchical structure
   */
  getBranchTree(): BranchMetadata[] {
    const branchMap = new Map<string, BranchMetadata & { children: BranchMetadata[] }>();
    const rootBranches: (BranchMetadata & { children: BranchMetadata[] })[] = [];

    // Create enhanced branch objects with children arrays
    for (const [id, branch] of this.branches) {
      branchMap.set(id, { ...branch, children: [] });
    }

    // Build the tree structure
    for (const [id, branch] of branchMap) {
      if (branch.parentBranchId) {
        const parent = branchMap.get(branch.parentBranchId);
        if (parent) {
          parent.children.push(branch);
        }
      } else {
        rootBranches.push(branch);
      }
    }

    return rootBranches.map(branch => this.flattenBranch(branch));
  }

  private flattenBranch(branch: BranchMetadata & { children: BranchMetadata[] }): BranchMetadata {
    const { children, ...branchData } = branch;
    return {
      ...branchData,
      // Add children count to metadata
      tags: [...branchData.tags, ...(children.length > 0 ? ['has-children'] : [])]
    };
  }

  /**
   * Compare two branches
   */
  compareBranches(sourceBranchId: string, targetBranchId: string): BranchComparisonResult {
    const sourceBranch = this.branches.get(sourceBranchId);
    const targetBranch = this.branches.get(targetBranchId);

    if (!sourceBranch || !targetBranch) {
      throw new Error('One or both branches not found');
    }

    const sourceMessages = this.branchMessages.get(sourceBranchId) || [];
    const targetMessages = this.branchMessages.get(targetBranchId) || [];

    // Find common ancestor
    const commonAncestorIndex = this.findCommonAncestor(sourceMessages, targetMessages);
    
    // Calculate differences
    const differences: BranchDiff = {
      added: sourceMessages.slice(commonAncestorIndex),
      removed: targetMessages.slice(commonAncestorIndex),
      modified: [],
      branchPoint: sourceBranch.branchPoint
    };

    // Calculate similarity score
    const similarityScore = this.calculateSimilarityScore(sourceMessages, targetMessages);

    // Check if branches can be merged
    const conflicts = this.detectMergeConflicts(sourceMessages, targetMessages);
    const canMerge = conflicts.length === 0;

    return {
      sourceBranch,
      targetBranch,
      differences,
      similarityScore,
      canMerge,
      conflicts
    };
  }

  /**
   * Merge one branch into another
   */
  mergeBranches(
    sourceBranchId: string,
    targetBranchId: string,
    options: BranchMergeOptions
  ): Message[] {
    const comparison = this.compareBranches(sourceBranchId, targetBranchId);
    
    if (!comparison.canMerge && !options.keepBothOnConflict) {
      throw new Error('Branches have conflicts and cannot be merged');
    }

    const sourceMessages = this.branchMessages.get(sourceBranchId) || [];
    const targetMessages = this.branchMessages.get(targetBranchId) || [];

    let mergedMessages: Message[] = [];

    switch (options.strategy) {
      case 'replace':
        mergedMessages = sourceMessages;
        break;
      case 'append':
        mergedMessages = [...targetMessages, ...comparison.differences.added];
        break;
      case 'merge':
        mergedMessages = this.performSmartMerge(sourceMessages, targetMessages, options);
        break;
    }

    // Update target branch with merged messages
    this.branchMessages.set(targetBranchId, mergedMessages);
    
    const targetBranch = this.branches.get(targetBranchId);
    if (targetBranch) {
      targetBranch.messageCount = mergedMessages.length;
      targetBranch.updatedAt = new Date();
      targetBranch.tags = [...targetBranch.tags, 'merged'];
    }

    return mergedMessages;
  }

  /**
   * Delete a branch
   */
  deleteBranch(branchId: string): void {
    if (branchId === 'main') {
      throw new Error('Cannot delete main branch');
    }

    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error('Branch not found');
    }

    // Check if branch has children
    const hasChildren = Array.from(this.branches.values()).some(b => b.parentBranchId === branchId);
    if (hasChildren) {
      throw new Error('Cannot delete branch with children. Delete child branches first.');
    }

    // Switch to parent branch if this is the active branch
    if (this.activeBranch === branchId) {
      const parentBranchId = branch.parentBranchId || 'main';
      this.switchBranch(parentBranchId);
    }

    this.branches.delete(branchId);
    this.branchMessages.delete(branchId);
  }

  /**
   * Rename a branch
   */
  renameBranch(branchId: string, newTitle: string): void {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error('Branch not found');
    }

    branch.title = newTitle;
    branch.updatedAt = new Date();
  }

  /**
   * Get branch by ID
   */
  getBranch(branchId: string): BranchMetadata | undefined {
    return this.branches.get(branchId);
  }

  /**
   * Get messages for a branch
   */
  getBranchMessages(branchId: string): Message[] {
    return this.branchMessages.get(branchId) || [];
  }

  /**
   * Get active branch
   */
  getActiveBranch(): BranchMetadata | null {
    return this.activeBranch ? this.branches.get(this.activeBranch) || null : null;
  }

  /**
   * Update chat with branch data
   */
  updateChatWithBranch(chat: Chat, branchId: string): Chat {
    const branch = this.branches.get(branchId);
    const messages = this.branchMessages.get(branchId);

    if (!branch || !messages) {
      throw new Error('Branch not found');
    }

    // Convert branch metadata to Chat branches format
    const branches: Branch[] = Array.from(this.branches.values()).map(b => ({
      id: b.id,
      parentMessageId: b.branchPoint.messageId,
      messages: this.branchMessages.get(b.id) || [],
      title: b.title,
      createdAt: b.createdAt
    }));

    return {
      ...chat,
      messages,
      branches,
      metadata: {
        ...chat.metadata,
        activeBranch: branchId,
        branchCount: this.branches.size
      }
    };
  }

  /**
   * Load branches from chat data
   */
  loadFromChat(chat: Chat): void {
    this.branches.clear();
    this.branchMessages.clear();

    // Load main branch
    const mainBranch: BranchMetadata = {
      id: 'main',
      title: 'Main Conversation',
      description: 'The primary conversation thread',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      branchPoint: {
        messageId: 'root',
        messageIndex: 0,
        timestamp: chat.createdAt,
        reason: 'Initial conversation'
      },
      messageCount: chat.messages.length,
      isActive: true,
      tags: ['main']
    };

    this.branches.set('main', mainBranch);
    this.branchMessages.set('main', chat.messages);
    this.activeBranch = 'main';

    // Load additional branches
    if (chat.branches) {
      for (const branch of chat.branches) {
        const branchMetadata: BranchMetadata = {
          id: branch.id,
          title: branch.title || `Branch ${branch.id}`,
          description: `Branch with ${branch.messages.length} messages`,
          createdAt: branch.createdAt,
          updatedAt: new Date(),
          parentBranchId: 'main', // Simplified - could be enhanced
          branchPoint: {
            messageId: branch.parentMessageId,
            messageIndex: chat.messages.findIndex(m => m.id === branch.parentMessageId),
            timestamp: branch.createdAt,
            reason: 'Loaded from chat'
          },
          messageCount: branch.messages.length,
          isActive: false,
          tags: ['loaded']
        };

        this.branches.set(branch.id, branchMetadata);
        this.branchMessages.set(branch.id, branch.messages);
      }
    }

    // Set active branch from metadata
    const activeBranchId = chat.metadata?.activeBranch;
    if (activeBranchId && this.branches.has(activeBranchId)) {
      this.switchBranch(activeBranchId);
    }
  }

  /**
   * Private helper methods
   */

  private findCommonAncestor(messages1: Message[], messages2: Message[]): number {
    let i = 0;
    while (i < messages1.length && i < messages2.length && messages1[i].id === messages2[i].id) {
      i++;
    }
    return i;
  }

  private calculateSimilarityScore(messages1: Message[], messages2: Message[]): number {
    const commonMessages = this.findCommonAncestor(messages1, messages2);
    const totalMessages = Math.max(messages1.length, messages2.length);
    return totalMessages === 0 ? 1 : commonMessages / totalMessages;
  }

  private detectMergeConflicts(messages1: Message[], messages2: Message[]): string[] {
    const conflicts: string[] = [];
    const commonAncestor = this.findCommonAncestor(messages1, messages2);

    // Simple conflict detection based on message content
    const divergent1 = messages1.slice(commonAncestor);
    const divergent2 = messages2.slice(commonAncestor);

    if (divergent1.length > 0 && divergent2.length > 0) {
      conflicts.push('Both branches have divergent messages');
    }

    return conflicts;
  }

  private performSmartMerge(
    sourceMessages: Message[],
    targetMessages: Message[],
    options: BranchMergeOptions
  ): Message[] {
    const commonAncestor = this.findCommonAncestor(sourceMessages, targetMessages);
    const baseMessages = sourceMessages.slice(0, commonAncestor);
    const sourceDivergent = sourceMessages.slice(commonAncestor);
    const targetDivergent = targetMessages.slice(commonAncestor);

    // Simple merge strategy: prefer source if specified, otherwise interleave
    if (options.preferSource) {
      return [...baseMessages, ...sourceDivergent];
    } else {
      return [...baseMessages, ...targetDivergent, ...sourceDivergent];
    }
  }
}

// Export singleton instance
export const conversationBranchService = new ConversationBranchService();