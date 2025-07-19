import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SqliteStorageService } from '../SqliteStorageService';
import type { StorageConfig } from '../BaseStorageService';

// Mock better-sqlite3 for testing
const mockDatabase = {
  pragma: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
  close: vi.fn()
};

const mockStatement = {
  get: vi.fn(),
  run: vi.fn(),
  all: vi.fn()
};

vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => mockDatabase)
}));

describe('SqliteStorageService', () => {
  let storageService: SqliteStorageService;
  let mockConfig: StorageConfig;

  beforeEach(() => {
    mockConfig = {
      databaseName: 'test-db',
      version: 1
    };
    storageService = new SqliteStorageService(mockConfig, '/tmp/test.db');
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Default mock statement behavior
    mockDatabase.prepare.mockReturnValue(mockStatement);
  });

  afterEach(async () => {
    await storageService.close();
  });

  describe('Database initialization', () => {
    it('should initialize database with proper settings', async () => {
      await storageService.initializeSchema();
      
      expect(mockDatabase.pragma).toHaveBeenCalledWith('journal_mode = WAL');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('foreign_keys = ON');
      expect(mockDatabase.exec).toHaveBeenCalled();
    });

    it('should create all required tables', async () => {
      await storageService.initializeSchema();
      
      const execCall = mockDatabase.exec.mock.calls[0][0];
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS _metadata');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS chats');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS messages');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS branches');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS prompts');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS knowledge_sources');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS knowledge_stacks');
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS key_value_store');
    });

    it('should create indexes for performance', async () => {
      await storageService.initializeSchema();
      
      const execCalls = mockDatabase.exec.mock.calls;
      const indexCall = execCalls.find(call => call[0].includes('CREATE INDEX'));
      expect(indexCall).toBeTruthy();
    });

    it('should set initial schema version', async () => {
      mockStatement.get.mockReturnValue(null);
      
      await storageService.initializeSchema();
      
      expect(mockStatement.run).toHaveBeenCalledWith('schema_version', '1');
    });
  });

  describe('Schema version management', () => {
    it('should return current schema version', async () => {
      mockStatement.get.mockReturnValue({ value: '2' });
      
      const version = await storageService.getCurrentSchemaVersion();
      
      expect(version).toBe(2);
    });

    it('should return 0 if no version found', async () => {
      mockStatement.get.mockReturnValue(undefined);
      
      const version = await storageService.getCurrentSchemaVersion();
      
      expect(version).toBe(0);
    });
  });

  describe('Key-value operations', () => {
    it('should get value by key', async () => {
      const testValue = { name: 'test', value: 123 };
      mockStatement.get.mockReturnValue({ value: JSON.stringify(testValue) });
      
      const result = await storageService.get('test-key');
      
      expect(result).toEqual(testValue);
      expect(mockStatement.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockStatement.get.mockReturnValue(undefined);
      
      const result = await storageService.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors', async () => {
      mockStatement.get.mockReturnValue({ value: 'invalid-json' });
      
      const result = await storageService.get('test-key');
      
      expect(result).toBeNull();
    });

    it('should set value by key', async () => {
      const testValue = { name: 'test', value: 123 };
      
      await storageService.set('test-key', testValue);
      
      expect(mockStatement.run).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testValue)
      );
    });

    it('should remove key', async () => {
      await storageService.remove('test-key');
      
      expect(mockStatement.run).toHaveBeenCalledWith('test-key');
    });

    it('should clear all data', async () => {
      await storageService.clear();
      
      expect(mockStatement.run).toHaveBeenCalled();
    });
  });

  describe('Batch operations', () => {
    it('should get many values', async () => {
      const mockResults = [
        { key: 'key1', value: JSON.stringify('value1') },
        { key: 'key2', value: JSON.stringify('value2') }
      ];
      mockStatement.all.mockReturnValue(mockResults);
      
      const results = await storageService.getMany(['key1', 'key2', 'key3']);
      
      expect(results).toEqual(['value1', 'value2', null]);
    });

    it('should set many values using transaction', async () => {
      const items = {
        'key1': 'value1',
        'key2': 'value2'
      };
      
      const mockTransaction = vi.fn();
      mockDatabase.transaction = vi.fn(() => mockTransaction);
      
      await storageService.setMany(items);
      
      expect(mockDatabase.transaction).toHaveBeenCalled();
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('Table operations', () => {
    it('should query table without conditions', async () => {
      const mockResults = [
        { id: '1', name: 'test1', created_at: '2023-01-01' },
        { id: '2', name: 'test2', created_at: '2023-01-02' }
      ];
      mockStatement.all.mockReturnValue(mockResults);
      
      const results = await storageService.query('chats');
      
      expect(results).toHaveLength(2);
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it('should query table with conditions', async () => {
      const mockResults = [
        { id: '1', name: 'test1', type: 'A' }
      ];
      mockStatement.all.mockReturnValue(mockResults);
      
      const results = await storageService.query('chats', { type: 'A' });
      
      expect(results).toHaveLength(1);
      expect(mockStatement.all).toHaveBeenCalledWith('A');
    });

    it('should insert record', async () => {
      const testData = { name: 'test', value: 123 };
      
      const id = await storageService.insert('chats', testData);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(mockStatement.run).toHaveBeenCalled();
    });

    it('should update record', async () => {
      const updateData = { name: 'updated' };
      
      await storageService.update('chats', 'test-id', updateData);
      
      expect(mockStatement.run).toHaveBeenCalledWith('updated', 'test-id');
    });

    it('should delete record', async () => {
      await storageService.delete('chats', 'test-id');
      
      expect(mockStatement.run).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Date handling', () => {
    it('should serialize dates in values', async () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      const testData = { name: 'test', date: testDate };
      
      await storageService.set('date-test', testData);
      
      const expectedSerialized = JSON.stringify({
        name: 'test',
        date: { __type: 'Date', value: testDate.toISOString() }
      });
      
      expect(mockStatement.run).toHaveBeenCalledWith('date-test', expectedSerialized);
    });

    it('should parse date fields in table rows', async () => {
      const mockResults = [
        { 
          id: '1', 
          name: 'test', 
          created_at: '2023-01-01T12:00:00Z',
          is_active: 1,
          metadata: '{"key": "value"}',
          tags: '["tag1", "tag2"]'
        }
      ];
      mockStatement.all.mockReturnValue(mockResults);
      
      const results = await storageService.query('chats');
      
      expect(results[0].created_at).toBeInstanceOf(Date);
      expect(results[0].is_active).toBe(true);
      expect(results[0].metadata).toEqual({ key: 'value' });
      expect(results[0].tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Connection management', () => {
    it('should close database connection', async () => {
      await storageService.close();
      
      expect(mockDatabase.close).toHaveBeenCalled();
    });

    it('should handle multiple close calls', async () => {
      await storageService.close();
      await storageService.close();
      
      expect(mockDatabase.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockStatement.get.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      await expect(storageService.get('test-key')).rejects.toThrow('Database error');
    });
  });

  describe('JSON field handling', () => {
    it('should handle JSON fields correctly', async () => {
      const mockResults = [
        { 
          id: '1', 
          metadata: '{"key": "value"}',
          tags: '["tag1", "tag2"]',
          invalid_json: 'not-json'
        }
      ];
      mockStatement.all.mockReturnValue(mockResults);
      
      const results = await storageService.query('prompts');
      
      expect(results[0].metadata).toEqual({ key: 'value' });
      expect(results[0].tags).toEqual(['tag1', 'tag2']);
      expect(results[0].invalid_json).toBe('not-json'); // Should remain as string
    });
  });

  describe('Boolean field handling', () => {
    it('should convert boolean fields correctly', async () => {
      const mockResults = [
        { 
          id: '1', 
          is_edited: 1,
          is_favorite: 0,
          is_active: 1
        }
      ];
      mockStatement.all.mockReturnValue(mockResults);
      
      const results = await storageService.query('messages');
      
      expect(results[0].is_edited).toBe(true);
      expect(results[0].is_favorite).toBe(false);
      expect(results[0].is_active).toBe(true);
    });
  });
});