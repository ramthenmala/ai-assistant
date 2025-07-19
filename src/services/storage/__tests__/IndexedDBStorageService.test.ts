import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBStorageService } from '../IndexedDBStorageService';
import type { StorageConfig } from '../BaseStorageService';

// Mock Dexie for testing
const mockDexie = {
  open: vi.fn(),
  close: vi.fn(),
  _metadata: {
    get: vi.fn(),
    put: vi.fn()
  },
  key_value_store: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    bulkGet: vi.fn(),
    bulkPut: vi.fn()
  },
  chats: {
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }))
  },
  messages: {
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }))
  },
  branches: {
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }))
  },
  prompts: {
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }))
  },
  knowledge_sources: {
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }))
  },
  knowledge_stacks: {
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }))
  }
};

vi.mock('dexie', () => ({
  default: class MockDexie {
    constructor() {
      return mockDexie;
    }
    
    version() {
      return {
        stores: vi.fn()
      };
    }
  }
}));

describe('IndexedDBStorageService', () => {
  let storageService: IndexedDBStorageService;
  let mockConfig: StorageConfig;

  beforeEach(() => {
    mockConfig = {
      databaseName: 'test-db',
      version: 1
    };
    storageService = new IndexedDBStorageService(mockConfig);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await storageService.close();
  });

  describe('Schema initialization', () => {
    it('should initialize schema and set version', async () => {
      mockDexie._metadata.get.mockResolvedValue(null);
      
      await storageService.initializeSchema();
      
      expect(mockDexie.open).toHaveBeenCalled();
      expect(mockDexie._metadata.put).toHaveBeenCalledWith({
        key: 'schema_version',
        value: '1'
      });
    });

    it('should not set version if already exists', async () => {
      mockDexie._metadata.get.mockResolvedValue({ value: '1' });
      
      await storageService.initializeSchema();
      
      expect(mockDexie.open).toHaveBeenCalled();
      expect(mockDexie._metadata.put).not.toHaveBeenCalled();
    });
  });

  describe('Schema version management', () => {
    it('should return current schema version', async () => {
      mockDexie._metadata.get.mockResolvedValue({ value: '2' });
      
      const version = await storageService.getCurrentSchemaVersion();
      
      expect(version).toBe(2);
      expect(mockDexie._metadata.get).toHaveBeenCalledWith('schema_version');
    });

    it('should return 0 if no version found', async () => {
      mockDexie._metadata.get.mockResolvedValue(null);
      
      const version = await storageService.getCurrentSchemaVersion();
      
      expect(version).toBe(0);
    });
  });

  describe('Key-value operations', () => {
    it('should get value by key', async () => {
      const testValue = { name: 'test', value: 123 };
      mockDexie.key_value_store.get.mockResolvedValue({
        value: testValue,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      const result = await storageService.get('test-key');
      
      expect(result).toEqual(testValue);
      expect(mockDexie.key_value_store.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockDexie.key_value_store.get.mockResolvedValue(undefined);
      
      const result = await storageService.get('non-existent');
      
      expect(result).toBeNull();
    });

    it('should set value by key', async () => {
      const testValue = { name: 'test', value: 123 };
      
      await storageService.set('test-key', testValue);
      
      expect(mockDexie.key_value_store.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          value: testValue,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        })
      );
    });

    it('should remove key', async () => {
      await storageService.remove('test-key');
      
      expect(mockDexie.key_value_store.delete).toHaveBeenCalledWith('test-key');
    });

    it('should clear all data', async () => {
      await storageService.clear();
      
      expect(mockDexie.key_value_store.clear).toHaveBeenCalled();
    });
  });

  describe('Batch operations', () => {
    it('should get many values', async () => {
      const mockResults = [
        { value: 'value1' },
        { value: 'value2' },
        undefined
      ];
      mockDexie.key_value_store.bulkGet.mockResolvedValue(mockResults);
      
      const results = await storageService.getMany(['key1', 'key2', 'key3']);
      
      expect(results).toEqual(['value1', 'value2', null]);
      expect(mockDexie.key_value_store.bulkGet).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });

    it('should set many values', async () => {
      const items = {
        'key1': 'value1',
        'key2': 'value2'
      };
      
      await storageService.setMany(items);
      
      expect(mockDexie.key_value_store.bulkPut).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'key1',
            value: 'value1',
            created_at: expect.any(Date),
            updated_at: expect.any(Date)
          }),
          expect.objectContaining({
            key: 'key2',
            value: 'value2',
            created_at: expect.any(Date),
            updated_at: expect.any(Date)
          })
        ])
      );
    });
  });

  describe('Table operations', () => {
    it('should query table without conditions', async () => {
      const mockResults = [
        { id: '1', name: 'test1' },
        { id: '2', name: 'test2' }
      ];
      
      mockDexie.chats.toCollection().toArray.mockResolvedValue(mockResults);
      
      const results = await storageService.query('chats');
      
      expect(results).toEqual(mockResults);
      expect(mockDexie.chats.toCollection).toHaveBeenCalled();
    });

    it('should query table with conditions', async () => {
      const mockResults = [
        { id: '1', name: 'test1', type: 'A' }
      ];
      
      const mockCollection = {
        filter: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockResults)
      };
      
      mockDexie.chats.toCollection.mockReturnValue(mockCollection);
      
      const results = await storageService.query('chats', { type: 'A' });
      
      expect(results).toEqual(mockResults);
      expect(mockCollection.filter).toHaveBeenCalled();
    });

    it('should insert record', async () => {
      const testData = { name: 'test', value: 123 };
      
      const id = await storageService.insert('chats', testData);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(mockDexie.chats.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testData,
          id: expect.any(String),
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        })
      );
    });

    it('should update record', async () => {
      const updateData = { name: 'updated' };
      
      await storageService.update('chats', 'test-id', updateData);
      
      expect(mockDexie.chats.update).toHaveBeenCalledWith('test-id', {
        ...updateData,
        updated_at: expect.any(Date)
      });
    });

    it('should delete record', async () => {
      await storageService.delete('chats', 'test-id');
      
      expect(mockDexie.chats.delete).toHaveBeenCalledWith('test-id');
    });

    it('should throw error for unknown table', async () => {
      await expect(storageService.query('unknown-table')).rejects.toThrow('Table unknown-table not found');
    });
  });

  describe('Date serialization', () => {
    it('should serialize and deserialize dates in values', async () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      const testData = { name: 'test', date: testDate };
      
      let capturedValue: any;
      mockDexie.key_value_store.put.mockImplementation((data) => {
        capturedValue = data.value;
      });
      
      await storageService.set('date-test', testData);
      
      // Verify date is serialized
      expect(capturedValue.date).toEqual({
        __type: 'Date',
        value: testDate.toISOString()
      });
      
      // Mock getting the value back
      mockDexie.key_value_store.get.mockResolvedValue({
        value: capturedValue
      });
      
      const result = await storageService.get('date-test');
      
      expect(result).toBeDefined();
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.toISOString()).toBe(testDate.toISOString());
    });
  });

  describe('Connection management', () => {
    it('should close database connection', async () => {
      await storageService.close();
      
      expect(mockDexie.close).toHaveBeenCalled();
    });
  });

  describe('Message table operations', () => {
    it('should insert message with timestamp', async () => {
      const messageData = { content: 'test message', role: 'user' as const };
      
      await storageService.insert('messages', messageData);
      
      expect(mockDexie.messages.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...messageData,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Knowledge stack operations', () => {
    it('should insert knowledge stack with timestamps', async () => {
      const stackData = { name: 'test stack', is_active: true };
      
      await storageService.insert('knowledge_stacks', stackData);
      
      expect(mockDexie.knowledge_stacks.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...stackData,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        })
      );
    });
  });
});