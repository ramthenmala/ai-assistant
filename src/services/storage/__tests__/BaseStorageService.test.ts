import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseStorageService } from '../BaseStorageService';
import type { StorageConfig, Migration } from '../BaseStorageService';

// Mock concrete implementation for testing
class MockStorageService extends BaseStorageService {
  private store = new Map<string, any>();
  private tables = new Map<string, Map<string, any>>();
  private schemaVersion = 1;

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    return value ? this.deserializeFromStorage<T>(value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, this.serializeForStorage(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return keys.map(key => {
      const value = this.store.get(key);
      return value ? this.deserializeFromStorage<T>(value) : null;
    });
  }

  async setMany<T>(items: Record<string, T>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }

  async query<T>(table: string, conditions?: Record<string, any>): Promise<T[]> {
    const tableData = this.tables.get(table);
    if (!tableData) return [];

    const results = Array.from(tableData.values());
    
    if (conditions) {
      return results.filter(item => {
        return Object.entries(conditions).every(([key, value]) => item[key] === value);
      });
    }

    return results;
  }

  async insert<T>(table: string, data: T): Promise<string> {
    const tableData = this.tables.get(table) || new Map();
    const id = (data as any).id || this.generateId();
    const dataWithId = { ...data, id };
    
    tableData.set(id, dataWithId);
    this.tables.set(table, tableData);
    
    return id;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    const tableData = this.tables.get(table);
    if (!tableData || !tableData.has(id)) {
      throw new Error(`Record with id ${id} not found in table ${table}`);
    }

    const existing = tableData.get(id);
    tableData.set(id, { ...existing, ...data });
  }

  async delete(table: string, id: string): Promise<void> {
    const tableData = this.tables.get(table);
    if (tableData) {
      tableData.delete(id);
    }
  }

  async initializeSchema(): Promise<void> {
    // Mock initialization
  }

  async getCurrentSchemaVersion(): Promise<number> {
    return this.schemaVersion;
  }

  async close(): Promise<void> {
    this.store.clear();
    this.tables.clear();
  }

  // Test helper methods
  setSchemaVersion(version: number): void {
    this.schemaVersion = version;
  }

  getStore(): Map<string, any> {
    return this.store;
  }

  getTables(): Map<string, Map<string, any>> {
    return this.tables;
  }
}

describe('BaseStorageService', () => {
  let storageService: MockStorageService;
  let mockConfig: StorageConfig;

  beforeEach(() => {
    mockConfig = {
      databaseName: 'test-db',
      version: 2,
      migrations: [
        {
          version: 2,
          up: vi.fn(),
          down: vi.fn()
        }
      ]
    };
    storageService = new MockStorageService(mockConfig);
  });

  describe('Basic key-value operations', () => {
    it('should set and get values', async () => {
      await storageService.set('test-key', 'test-value');
      const result = await storageService.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const result = await storageService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should remove keys', async () => {
      await storageService.set('test-key', 'test-value');
      await storageService.remove('test-key');
      const result = await storageService.get('test-key');
      expect(result).toBeNull();
    });

    it('should clear all data', async () => {
      await storageService.set('key1', 'value1');
      await storageService.set('key2', 'value2');
      await storageService.clear();
      
      const result1 = await storageService.get('key1');
      const result2 = await storageService.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Batch operations', () => {
    it('should get many values', async () => {
      await storageService.set('key1', 'value1');
      await storageService.set('key2', 'value2');
      
      const results = await storageService.getMany(['key1', 'key2', 'key3']);
      expect(results).toEqual(['value1', 'value2', null]);
    });

    it('should set many values', async () => {
      await storageService.setMany({
        'key1': 'value1',
        'key2': 'value2'
      });
      
      const result1 = await storageService.get('key1');
      const result2 = await storageService.get('key2');
      
      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });
  });

  describe('Database-like operations', () => {
    it('should insert records', async () => {
      const testData = { name: 'test', value: 123 };
      const id = await storageService.insert('test-table', testData);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      
      const results = await storageService.query('test-table');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ ...testData, id });
    });

    it('should query records with conditions', async () => {
      await storageService.insert('test-table', { name: 'test1', type: 'A' });
      await storageService.insert('test-table', { name: 'test2', type: 'B' });
      await storageService.insert('test-table', { name: 'test3', type: 'A' });
      
      const results = await storageService.query('test-table', { type: 'A' });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'A')).toBe(true);
    });

    it('should update records', async () => {
      const id = await storageService.insert('test-table', { name: 'test', value: 123 });
      await storageService.update('test-table', id, { value: 456 });
      
      const results = await storageService.query('test-table');
      expect(results[0]).toMatchObject({ name: 'test', value: 456 });
    });

    it('should delete records', async () => {
      const id = await storageService.insert('test-table', { name: 'test', value: 123 });
      await storageService.delete('test-table', id);
      
      const results = await storageService.query('test-table');
      expect(results).toHaveLength(0);
    });
  });

  describe('Data serialization', () => {
    it('should serialize and deserialize dates', async () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      const testData = { name: 'test', date: testDate };
      
      await storageService.set('date-test', testData);
      const result = await storageService.get<typeof testData>('date-test');
      
      expect(result).toBeDefined();
      expect(result!.date).toBeInstanceOf(Date);
      expect(result!.date.toISOString()).toBe(testDate.toISOString());
    });

    it('should serialize complex objects', async () => {
      const testData = {
        name: 'test',
        nested: { value: 123, array: [1, 2, 3] },
        date: new Date('2023-01-01T12:00:00Z')
      };
      
      await storageService.set('complex-test', testData);
      const result = await storageService.get<typeof testData>('complex-test');
      
      expect(result).toBeDefined();
      expect(result!.nested).toEqual(testData.nested);
      expect(result!.date).toBeInstanceOf(Date);
    });
  });

  describe('Migration system', () => {
    it('should initialize without migrations', async () => {
      const serviceWithoutMigrations = new MockStorageService({
        databaseName: 'test-db',
        version: 1
      });
      
      await expect(serviceWithoutMigrations.initialize()).resolves.not.toThrow();
    });

    it('should run migrations when needed', async () => {
      const migration = {
        version: 2,
        up: vi.fn(),
        down: vi.fn()
      };
      
      const serviceWithMigrations = new MockStorageService({
        databaseName: 'test-db',
        version: 2,
        migrations: [migration]
      });
      
      // Set current version to 1 to trigger migration
      serviceWithMigrations.setSchemaVersion(1);
      
      await serviceWithMigrations.initialize();
      
      expect(migration.up).toHaveBeenCalled();
    });

    it('should run multiple migrations in order', async () => {
      const migration1 = {
        version: 2,
        up: vi.fn(),
        down: vi.fn()
      };
      
      const migration2 = {
        version: 3,
        up: vi.fn(),
        down: vi.fn()
      };
      
      const serviceWithMigrations = new MockStorageService({
        databaseName: 'test-db',
        version: 3,
        migrations: [migration2, migration1] // Intentionally out of order
      });
      
      // Set current version to 1 to trigger both migrations
      serviceWithMigrations.setSchemaVersion(1);
      
      await serviceWithMigrations.initialize();
      
      expect(migration1.up).toHaveBeenCalled();
      expect(migration2.up).toHaveBeenCalled();
    });

    it('should handle migration errors', async () => {
      const failingMigration = {
        version: 2,
        up: vi.fn().mockRejectedValue(new Error('Migration failed')),
        down: vi.fn()
      };
      
      const serviceWithFailingMigration = new MockStorageService({
        databaseName: 'test-db',
        version: 2,
        migrations: [failingMigration]
      });
      
      serviceWithFailingMigration.setSchemaVersion(1);
      
      await expect(serviceWithFailingMigration.initialize()).rejects.toThrow('Migration failed');
    });
  });

  describe('Utility methods', () => {
    it('should generate unique IDs', async () => {
      const id1 = await storageService.insert('test-table', { name: 'test1' });
      const id2 = await storageService.insert('test-table', { name: 'test2' });
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should use provided ID if available', async () => {
      const customId = 'custom-id-123';
      const id = await storageService.insert('test-table', { id: customId, name: 'test' });
      
      expect(id).toBe(customId);
    });
  });

  describe('Initialization', () => {
    it('should initialize only once', async () => {
      const initSpy = vi.spyOn(storageService, 'initializeSchema');
      
      await storageService.initialize();
      await storageService.initialize();
      
      expect(initSpy).toHaveBeenCalledTimes(1);
    });

    it('should check schema version during initialization', async () => {
      const versionSpy = vi.spyOn(storageService, 'getCurrentSchemaVersion');
      
      await storageService.initialize();
      
      expect(versionSpy).toHaveBeenCalled();
    });
  });
});