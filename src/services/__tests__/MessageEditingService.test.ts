import { describe, it, expect, beforeEach } from 'vitest';
import { MessageEditingService } from '../MessageEditingService';
import type { Message, MessageVersion } from '@/types';

describe('MessageEditingService', () => {
  let service: MessageEditingService;
  let mockMessage: Message;

  beforeEach(() => {
    service = new MessageEditingService({
      maxVersionsPerMessage: 5,
      autoGenerateEditReasons: true
    });

    mockMessage = {
      id: 'msg-1',
      content: 'Hello, how are you?',
      role: 'user',
      timestamp: new Date('2023-01-01T10:00:00Z'),
      isEdited: false,
      versions: []
    };
  });

  describe('Message Editing', () => {
    it('should edit a message and create a version', () => {
      const newContent = 'Hello, how are you doing today?';
      const result = service.editMessage(mockMessage, newContent);

      expect(result.updatedMessage.content).toBe(newContent);
      expect(result.updatedMessage.isEdited).toBe(true);
      expect(result.updatedMessage.editedAt).toBeInstanceOf(Date);
      expect(result.updatedMessage.versions).toHaveLength(1);
      expect(result.versionAdded).toBeDefined();
      expect(result.versionAdded?.content).toBe(mockMessage.content);
    });

    it('should not edit if content is the same', () => {
      const result = service.editMessage(mockMessage, mockMessage.content);

      expect(result.updatedMessage).toBe(mockMessage);
      expect(result.versionAdded).toBeUndefined();
    });

    it('should preserve existing versions when editing', () => {
      const existingVersion: MessageVersion = {
        id: 'v1',
        content: 'Original content',
        timestamp: new Date('2023-01-01T09:00:00Z'),
        editReason: 'First edit'
      };

      const messageWithVersions = {
        ...mockMessage,
        versions: [existingVersion]
      };

      const result = service.editMessage(messageWithVersions, 'New content');

      expect(result.updatedMessage.versions).toHaveLength(2);
      expect(result.updatedMessage.versions?.[1]).toBe(existingVersion);
    });

    it('should trim versions when exceeding max limit', () => {
      const versions: MessageVersion[] = [];
      for (let i = 0; i < 5; i++) {
        versions.push({
          id: `v${i}`,
          content: `Content ${i}`,
          timestamp: new Date(),
          editReason: `Edit ${i}`
        });
      }

      const messageWithManyVersions = {
        ...mockMessage,
        versions
      };

      const result = service.editMessage(messageWithManyVersions, 'New content', {
        maxVersions: 3
      });

      expect(result.updatedMessage.versions).toHaveLength(3);
      expect(result.versionsRemoved).toHaveLength(3);
    });

    it('should not preserve versions when disabled', () => {
      const result = service.editMessage(mockMessage, 'New content', {
        preserveVersions: false
      });

      expect(result.updatedMessage.versions).toHaveLength(0);
      expect(result.versionAdded).toBeUndefined();
    });

    it('should use custom edit reason', () => {
      const customReason = 'Fixed typo';
      const result = service.editMessage(mockMessage, 'New content', {
        editReason: customReason
      });

      expect(result.versionAdded?.editReason).toBe(customReason);
    });

    it('should auto-generate edit reasons', () => {
      const result = service.editMessage(mockMessage, 'New content');

      expect(result.versionAdded?.editReason).toBeDefined();
      expect(result.versionAdded?.editReason).toBe('Content modified');
    });
  });

  describe('Message Reversion', () => {
    let messageWithVersions: Message;

    beforeEach(() => {
      const version: MessageVersion = {
        id: 'v1',
        content: 'Original content',
        timestamp: new Date('2023-01-01T09:00:00Z'),
        editReason: 'First edit'
      };

      messageWithVersions = {
        ...mockMessage,
        content: 'Current content',
        isEdited: true,
        versions: [version]
      };
    });

    it('should revert to a previous version', () => {
      const result = service.revertMessage(messageWithVersions, 'v1');

      expect(result.updatedMessage.content).toBe('Original content');
      expect(result.updatedMessage.isEdited).toBe(true);
      expect(result.updatedMessage.versions).toHaveLength(2);
      expect(result.versionAdded).toBeDefined();
    });

    it('should not create version when reverting if disabled', () => {
      const result = service.revertMessage(messageWithVersions, 'v1', {
        createVersion: false
      });

      expect(result.updatedMessage.content).toBe('Original content');
      expect(result.updatedMessage.versions).toHaveLength(1);
      expect(result.versionAdded).toBeUndefined();
    });

    it('should use custom revert reason', () => {
      const customReason = 'Reverted due to error';
      const result = service.revertMessage(messageWithVersions, 'v1', {
        editReason: customReason
      });

      expect(result.versionAdded?.editReason).toBe(customReason);
    });

    it('should throw error for non-existent version', () => {
      expect(() => {
        service.revertMessage(messageWithVersions, 'non-existent');
      }).toThrow('Version non-existent not found');
    });
  });

  describe('Version Management', () => {
    it('should delete a specific version', () => {
      const versions: MessageVersion[] = [
        {
          id: 'v1',
          content: 'Version 1',
          timestamp: new Date(),
          editReason: 'Edit 1'
        },
        {
          id: 'v2',
          content: 'Version 2',
          timestamp: new Date(),
          editReason: 'Edit 2'
        }
      ];

      const messageWithVersions = {
        ...mockMessage,
        versions
      };

      const result = service.deleteVersion(messageWithVersions, 'v1');

      expect(result.versions).toHaveLength(1);
      expect(result.versions?.[0].id).toBe('v2');
    });

    it('should clear all versions', () => {
      const versions: MessageVersion[] = [
        {
          id: 'v1',
          content: 'Version 1',
          timestamp: new Date(),
          editReason: 'Edit 1'
        }
      ];

      const messageWithVersions = {
        ...mockMessage,
        versions
      };

      const result = service.clearVersions(messageWithVersions);

      expect(result.versions).toHaveLength(0);
    });
  });

  describe('Version Statistics', () => {
    it('should calculate version statistics correctly', () => {
      const versions: MessageVersion[] = [
        {
          id: 'v1',
          content: 'Version 1 content',
          timestamp: new Date('2023-01-01T09:00:00Z'),
          editReason: 'Edit 1'
        },
        {
          id: 'v2',
          content: 'Version 2 content that is longer',
          timestamp: new Date('2023-01-01T08:00:00Z'),
          editReason: 'Edit 2'
        }
      ];

      const messageWithVersions = {
        ...mockMessage,
        content: 'Current content',
        isEdited: true,
        versions
      };

      const stats = service.getVersionStats(messageWithVersions);

      expect(stats.totalVersions).toBe(3); // 2 versions + 1 current
      expect(stats.editCount).toBe(2);
      expect(stats.oldestVersion?.id).toBe('v2');
      expect(stats.newestVersion?.id).toBe('v1');
      expect(stats.totalContentLength).toBe(
        'Current content'.length + 'Version 1 content'.length + 'Version 2 content that is longer'.length
      );
    });

    it('should handle message with no versions', () => {
      const stats = service.getVersionStats(mockMessage);

      expect(stats.totalVersions).toBe(1);
      expect(stats.editCount).toBe(0);
      expect(stats.oldestVersion).toBeUndefined();
      expect(stats.newestVersion).toBeUndefined();
    });
  });

  describe('Content Differences', () => {
    it('should find differences between content', () => {
      const content1 = 'Hello world how are you';
      const content2 = 'Hello beautiful world how are you doing';

      const diff = service.findDifferences(content1, content2);

      expect(diff.changed).toBe(true);
      expect(diff.added).toContain('beautiful');
      expect(diff.added).toContain('doing');
      expect(diff.removed).toHaveLength(0);
    });

    it('should detect removed words', () => {
      const content1 = 'Hello beautiful world how are you doing';
      const content2 = 'Hello world how are you';

      const diff = service.findDifferences(content1, content2);

      expect(diff.changed).toBe(true);
      expect(diff.removed).toContain('beautiful');
      expect(diff.removed).toContain('doing');
      expect(diff.added).toHaveLength(0);
    });

    it('should detect no changes for identical content', () => {
      const content = 'Hello world';
      const diff = service.findDifferences(content, content);

      expect(diff.changed).toBe(false);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
    });
  });

  describe('Content Validation', () => {
    it('should validate valid content', () => {
      const validation = service.validateContent('This is valid content');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty content', () => {
      const validation = service.validateContent('');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message content cannot be empty');
    });

    it('should reject content that is too long', () => {
      const longContent = 'x'.repeat(10001);
      const validation = service.validateContent(longContent);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message content is too long (max 10,000 characters)');
    });

    it('should reject content that is too short', () => {
      const validation = service.validateContent('x');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message content must be at least 2 characters');
    });
  });

  describe('Edit Complexity Estimation', () => {
    it('should estimate minor edit complexity', () => {
      const oldContent = 'Hello world';
      const newContent = 'Hello world!';

      const complexity = service.estimateEditComplexity(oldContent, newContent);

      expect(complexity.complexity).toBe('minor');
      expect(complexity.score).toBeLessThan(3);
    });

    it('should estimate moderate edit complexity', () => {
      const oldContent = 'Hello world how are you';
      const newContent = 'Hello beautiful world how are you doing today';

      const complexity = service.estimateEditComplexity(oldContent, newContent);

      expect(complexity.complexity).toBe('moderate');
      expect(complexity.score).toBeGreaterThanOrEqual(3);
      expect(complexity.score).toBeLessThan(6);
    });

    it('should estimate major edit complexity', () => {
      const oldContent = 'Hello world';
      const newContent = 'This is a completely different message with much more content and different structure';

      const complexity = service.estimateEditComplexity(oldContent, newContent);

      expect(complexity.complexity).toBe('major');
      expect(complexity.score).toBeGreaterThanOrEqual(6);
    });

    it('should include complexity factors', () => {
      const oldContent = 'Hello world';
      const newContent = 'Hello beautiful world with additional content';

      const complexity = service.estimateEditComplexity(oldContent, newContent);

      expect(complexity.factors).toContain('Moderate length change');
      expect(complexity.factors).toContain('Some word changes');
    });
  });

  describe('Edit Reason Generation', () => {
    it('should generate content expanded reason', () => {
      const service = new MessageEditingService({ autoGenerateEditReasons: true });
      const result = service.editMessage(mockMessage, mockMessage.content + ' ' + 'x'.repeat(60));

      expect(result.versionAdded?.editReason).toBe('Content expanded');
    });

    it('should generate content shortened reason', () => {
      const service = new MessageEditingService({ autoGenerateEditReasons: true });
      const longMessage = {
        ...mockMessage,
        content: 'x'.repeat(100)
      };
      const result = service.editMessage(longMessage, 'Short');

      expect(result.versionAdded?.editReason).toBe('Content shortened');
    });

    it('should generate minor corrections reason', () => {
      const service = new MessageEditingService({ autoGenerateEditReasons: true });
      const result = service.editMessage(mockMessage, mockMessage.content + '!');

      expect(result.versionAdded?.editReason).toBe('Minor corrections');
    });

    it('should use provided reason over auto-generated', () => {
      const service = new MessageEditingService({ autoGenerateEditReasons: true });
      const customReason = 'Custom edit reason';
      const result = service.editMessage(mockMessage, 'New content', {
        editReason: customReason
      });

      expect(result.versionAdded?.editReason).toBe(customReason);
    });
  });
});