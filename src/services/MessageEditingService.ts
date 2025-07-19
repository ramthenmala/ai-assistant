import type { Message, MessageVersion } from '@/types';

export interface EditMessageOptions {
  editReason?: string;
  preserveVersions?: boolean;
  maxVersions?: number;
}

export interface EditMessageResult {
  updatedMessage: Message;
  versionAdded?: MessageVersion;
  versionsRemoved?: MessageVersion[];
}

export interface RevertMessageOptions {
  createVersion?: boolean;
  editReason?: string;
}

export interface RevertMessageResult {
  updatedMessage: Message;
  versionAdded?: MessageVersion;
}

export class MessageEditingService {
  private maxVersionsPerMessage: number;
  private autoGenerateEditReasons: boolean;

  constructor(options: {
    maxVersionsPerMessage?: number;
    autoGenerateEditReasons?: boolean;
  } = {}) {
    this.maxVersionsPerMessage = options.maxVersionsPerMessage || 10;
    this.autoGenerateEditReasons = options.autoGenerateEditReasons || false;
  }

  /**
   * Edit a message and manage version history
   */
  editMessage(
    message: Message,
    newContent: string,
    options: EditMessageOptions = {}
  ): EditMessageResult {
    const {
      editReason,
      preserveVersions = true,
      maxVersions = this.maxVersionsPerMessage
    } = options;

    // Don't edit if content is the same
    if (message.content === newContent) {
      return { updatedMessage: message };
    }

    // Create version of current content if preserving versions
    let newVersions = [...(message.versions || [])];
    let versionAdded: MessageVersion | undefined;
    let versionsRemoved: MessageVersion[] = [];

    if (preserveVersions) {
      // Create version from current content
      const currentVersion: MessageVersion = {
        id: `${message.id}-v${Date.now()}`,
        content: message.content,
        timestamp: message.editedAt || message.timestamp,
        editReason: this.generateEditReason(message.content, newContent, editReason)
      };

      newVersions.unshift(currentVersion);
      versionAdded = currentVersion;

      // Trim versions if exceeding max
      if (newVersions.length > maxVersions) {
        versionsRemoved = newVersions.splice(maxVersions);
      }
    }

    // Create updated message
    const updatedMessage: Message = {
      ...message,
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
      versions: newVersions
    };

    return {
      updatedMessage,
      versionAdded,
      versionsRemoved: versionsRemoved.length > 0 ? versionsRemoved : undefined
    };
  }

  /**
   * Revert a message to a previous version
   */
  revertMessage(
    message: Message,
    versionId: string,
    options: RevertMessageOptions = {}
  ): RevertMessageResult {
    const { createVersion = true, editReason } = options;

    const version = message.versions?.find(v => v.id === versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    let newVersions = [...(message.versions || [])];
    let versionAdded: MessageVersion | undefined;

    if (createVersion) {
      // Create version from current content before reverting
      const currentVersion: MessageVersion = {
        id: `${message.id}-v${Date.now()}`,
        content: message.content,
        timestamp: message.editedAt || message.timestamp,
        editReason: editReason || `Reverted to version from ${this.formatTimestamp(version.timestamp)}`
      };

      newVersions.unshift(currentVersion);
      versionAdded = currentVersion;
    }

    // Create reverted message
    const updatedMessage: Message = {
      ...message,
      content: version.content,
      isEdited: true,
      editedAt: new Date(),
      versions: newVersions
    };

    return {
      updatedMessage,
      versionAdded
    };
  }

  /**
   * Delete a specific version
   */
  deleteVersion(message: Message, versionId: string): Message {
    const newVersions = (message.versions || []).filter(v => v.id !== versionId);
    
    return {
      ...message,
      versions: newVersions
    };
  }

  /**
   * Clear all versions for a message
   */
  clearVersions(message: Message): Message {
    return {
      ...message,
      versions: []
    };
  }

  /**
   * Get version statistics
   */
  getVersionStats(message: Message): {
    totalVersions: number;
    editCount: number;
    oldestVersion?: MessageVersion;
    newestVersion?: MessageVersion;
    totalContentLength: number;
  } {
    const versions = message.versions || [];
    const totalVersions = versions.length + 1; // +1 for current version
    const editCount = message.isEdited ? totalVersions - 1 : 0;

    const oldestVersion = versions.length > 0 ? versions[versions.length - 1] : undefined;
    const newestVersion = versions.length > 0 ? versions[0] : undefined;

    const totalContentLength = versions.reduce((sum, v) => sum + v.content.length, 0) + message.content.length;

    return {
      totalVersions,
      editCount,
      oldestVersion,
      newestVersion,
      totalContentLength
    };
  }

  /**
   * Find differences between two versions
   */
  findDifferences(content1: string, content2: string): {
    added: string[];
    removed: string[];
    changed: boolean;
  } {
    if (content1 === content2) {
      return { added: [], removed: [], changed: false };
    }

    // Simple word-based diff
    const words1 = content1.split(/\s+/);
    const words2 = content2.split(/\s+/);

    const added: string[] = [];
    const removed: string[] = [];

    // Find added words (in content2 but not in content1)
    for (const word of words2) {
      if (!words1.includes(word)) {
        added.push(word);
      }
    }

    // Find removed words (in content1 but not in content2)
    for (const word of words1) {
      if (!words2.includes(word)) {
        removed.push(word);
      }
    }

    return {
      added,
      removed,
      changed: true
    };
  }

  /**
   * Generate edit reason automatically
   */
  private generateEditReason(
    oldContent: string,
    newContent: string,
    providedReason?: string
  ): string {
    if (providedReason) {
      return providedReason;
    }

    if (!this.autoGenerateEditReasons) {
      return 'Message edited';
    }

    const oldLength = oldContent.length;
    const newLength = newContent.length;
    const lengthDiff = newLength - oldLength;

    // Simple heuristics for edit reason
    if (lengthDiff > 50) {
      return 'Content expanded';
    } else if (lengthDiff < -50) {
      return 'Content shortened';
    } else if (Math.abs(lengthDiff) <= 10) {
      return 'Minor corrections';
    } else {
      return 'Content modified';
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
  }

  /**
   * Validate message content
   */
  validateContent(content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }

    if (content.length > 10000) {
      errors.push('Message content is too long (max 10,000 characters)');
    }

    if (content.trim().length < 2) {
      errors.push('Message content must be at least 2 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate edit complexity
   */
  estimateEditComplexity(oldContent: string, newContent: string): {
    complexity: 'minor' | 'moderate' | 'major';
    score: number;
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    // Length change
    const lengthDiff = Math.abs(newContent.length - oldContent.length);
    const lengthRatio = lengthDiff / Math.max(oldContent.length, 1);
    
    if (lengthRatio > 0.5) {
      score += 3;
      factors.push('Significant length change');
    } else if (lengthRatio > 0.2) {
      score += 2;
      factors.push('Moderate length change');
    } else if (lengthRatio > 0.05) {
      score += 1;
      factors.push('Minor length change');
    }

    // Word changes
    const diff = this.findDifferences(oldContent, newContent);
    const wordChangeRatio = (diff.added.length + diff.removed.length) / Math.max(oldContent.split(/\s+/).length, 1);
    
    if (wordChangeRatio > 0.3) {
      score += 3;
      factors.push('Many word changes');
    } else if (wordChangeRatio > 0.1) {
      score += 2;
      factors.push('Some word changes');
    } else if (wordChangeRatio > 0.02) {
      score += 1;
      factors.push('Few word changes');
    }

    // Structural changes (simple heuristic)
    const oldLines = oldContent.split('\n').length;
    const newLines = newContent.split('\n').length;
    const lineDiff = Math.abs(newLines - oldLines);
    
    if (lineDiff > 3) {
      score += 2;
      factors.push('Structure changes');
    } else if (lineDiff > 1) {
      score += 1;
      factors.push('Line changes');
    }

    // Determine complexity
    let complexity: 'minor' | 'moderate' | 'major';
    if (score >= 6) {
      complexity = 'major';
    } else if (score >= 3) {
      complexity = 'moderate';
    } else {
      complexity = 'minor';
    }

    return {
      complexity,
      score,
      factors
    };
  }
}

// Export singleton instance
export const messageEditingService = new MessageEditingService({
  maxVersionsPerMessage: 10,
  autoGenerateEditReasons: true
});