// Service for handling message actions like copy, bookmark, regenerate

import type { Message } from '@/types';

export interface MessageActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class MessageService {
  // Copy message content to clipboard
  static async copyMessage(message: Message): Promise<MessageActionResult> {
    try {
      await navigator.clipboard.writeText(message.content);
      return {
        success: true,
        message: 'Message copied to clipboard'
      };
    } catch (error) {
      console.error('Failed to copy message:', error);
      
      // Fallback for older browsers or when clipboard API is not available
      try {
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return {
          success: true,
          message: 'Message copied to clipboard (fallback)'
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: 'Failed to copy message to clipboard'
        };
      }
    }
  }

  // Toggle bookmark status for a message
  static async toggleBookmark(
    message: Message,
    onUpdate: (messageId: string, updates: Partial<Message>) => void
  ): Promise<MessageActionResult> {
    try {
      const newBookmarkStatus = !message.isBookmarked;
      
      // Update the message
      onUpdate(message.id, { isBookmarked: newBookmarkStatus });
      
      return {
        success: true,
        message: newBookmarkStatus 
          ? 'Message bookmarked' 
          : 'Bookmark removed'
      };
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      return {
        success: false,
        error: 'Failed to update bookmark status'
      };
    }
  }

  // Create a new message version when editing
  static createMessageVersion(originalMessage: Message, newContent: string, editReason?: string): Message {
    const now = new Date();
    
    // Create a new version from the current content
    const newVersion = {
      id: crypto.randomUUID(),
      content: originalMessage.content,
      timestamp: originalMessage.editedAt || originalMessage.timestamp,
      editReason
    };

    // Add the version to the versions array
    const versions = originalMessage.versions || [];
    versions.push(newVersion);

    // Return updated message with new content and version history
    return {
      ...originalMessage,
      content: newContent,
      isEdited: true,
      editedAt: now,
      versions
    };
  }

  // Regenerate message (placeholder for actual implementation)
  static async regenerateMessage(
    message: Message,
    onRegenerate: (messageId: string) => Promise<void>
  ): Promise<MessageActionResult> {
    try {
      if (message.role === 'user') {
        return {
          success: false,
          error: 'Cannot regenerate user messages'
        };
      }

      await onRegenerate(message.id);
      
      return {
        success: true,
        message: 'Message regenerated'
      };
    } catch (error) {
      console.error('Failed to regenerate message:', error);
      return {
        success: false,
        error: 'Failed to regenerate message'
      };
    }
  }

  // Branch from a message (create a new conversation branch)
  static async branchFromMessage(
    message: Message,
    onBranch: (messageId: string) => Promise<string>
  ): Promise<MessageActionResult> {
    try {
      const branchId = await onBranch(message.id);
      
      return {
        success: true,
        message: `Created new branch: ${branchId}`
      };
    } catch (error) {
      console.error('Failed to create branch:', error);
      return {
        success: false,
        error: 'Failed to create new branch'
      };
    }
  }

  // Format message for export
  static formatMessageForExport(message: Message, format: 'plain' | 'markdown' | 'json' = 'plain'): string {
    switch (format) {
      case 'markdown':
        const roleLabel = message.role === 'user' ? '**User**' : '**Assistant**';
        const timestamp = message.timestamp.toLocaleString();
        return `## ${roleLabel}\n\n*${timestamp}*\n\n${message.content}\n\n---\n`;
        
      case 'json':
        return JSON.stringify({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
          isEdited: message.isEdited,
          isBookmarked: message.isBookmarked
        }, null, 2);
        
      case 'plain':
      default:
        return `${message.role.toUpperCase()}: ${message.content}`;
    }
  }

  // Search messages by content
  static searchMessages(messages: Message[], query: string, options?: {
    caseSensitive?: boolean;
    wholeWords?: boolean;
    role?: 'user' | 'assistant';
  }): Message[] {
    const { caseSensitive = false, wholeWords = false, role } = options || {};
    
    let searchQuery = query;
    if (!caseSensitive) {
      searchQuery = query.toLowerCase();
    }

    return messages.filter(message => {
      // Filter by role if specified
      if (role && message.role !== role) {
        return false;
      }

      let content = message.content;
      if (!caseSensitive) {
        content = content.toLowerCase();
      }

      if (wholeWords) {
        const regex = new RegExp(`\\b${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi');
        return regex.test(content);
      } else {
        return content.includes(searchQuery);
      }
    });
  }

  // Get bookmarked messages
  static getBookmarkedMessages(messages: Message[]): Message[] {
    return messages.filter(message => message.isBookmarked);
  }

  // Get message statistics
  static getMessageStats(messages: Message[]): {
    total: number;
    userMessages: number;
    assistantMessages: number;
    editedMessages: number;
    bookmarkedMessages: number;
    totalCharacters: number;
    averageLength: number;
  } {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const editedMessages = messages.filter(m => m.isEdited);
    const bookmarkedMessages = messages.filter(m => m.isBookmarked);
    const totalCharacters = messages.reduce((sum, m) => sum + m.content.length, 0);

    return {
      total: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      editedMessages: editedMessages.length,
      bookmarkedMessages: bookmarkedMessages.length,
      totalCharacters,
      averageLength: messages.length > 0 ? Math.round(totalCharacters / messages.length) : 0
    };
  }
}