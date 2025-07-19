// Base Storage Service with common functionality

export interface StorageAdapter {
  // Basic key-value operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // Batch operations
  getMany<T>(keys: string[]): Promise<(T | null)[]>;
  setMany<T>(items: Record<string, T>): Promise<void>;
  
  // Database-like operations
  query<T>(table: string, conditions?: Record<string, any>): Promise<T[]>;
  insert<T>(table: string, data: T): Promise<string>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<void>;
  delete(table: string, id: string): Promise<void>;
  
  // Schema and migration
  initializeSchema(): Promise<void>;
  migrateSchema(fromVersion: number, toVersion: number): Promise<void>;
  getCurrentSchemaVersion(): Promise<number>;
  
  // Cleanup
  close(): Promise<void>;
}

export interface StorageConfig {
  databaseName: string;
  version: number;
  migrations?: Migration[];
}

export interface Migration {
  version: number;
  up: (adapter: StorageAdapter) => Promise<void>;
  down: (adapter: StorageAdapter) => Promise<void>;
}

export abstract class BaseStorageService implements StorageAdapter {
  protected config: StorageConfig;
  protected isInitialized = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  // Abstract methods to be implemented by concrete adapters
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getMany<T>(keys: string[]): Promise<(T | null)[]>;
  abstract setMany<T>(items: Record<string, T>): Promise<void>;
  abstract query<T>(table: string, conditions?: Record<string, any>): Promise<T[]>;
  abstract insert<T>(table: string, data: T): Promise<string>;
  abstract update<T>(table: string, id: string, data: Partial<T>): Promise<void>;
  abstract delete(table: string, id: string): Promise<void>;
  abstract initializeSchema(): Promise<void>;
  abstract getCurrentSchemaVersion(): Promise<number>;
  abstract close(): Promise<void>;

  // Common migration logic
  async migrateSchema(fromVersion: number, toVersion: number): Promise<void> {
    if (!this.config.migrations) {
      return;
    }

    const migrationsToRun = this.config.migrations
      .filter(m => m.version > fromVersion && m.version <= toVersion)
      .sort((a, b) => a.version - b.version);

    for (const migration of migrationsToRun) {
      try {
        await migration.up(this);
        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }

  // Initialize the storage service
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.initializeSchema();
    
    const currentVersion = await this.getCurrentSchemaVersion();
    if (currentVersion < this.config.version) {
      await this.migrateSchema(currentVersion, this.config.version);
    }

    this.isInitialized = true;
  }

  // Utility method to generate unique IDs
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility method to serialize dates for storage
  protected serializeForStorage<T>(data: T): any {
    return JSON.parse(JSON.stringify(data, (_key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    }));
  }

  // Utility method to deserialize dates from storage
  protected deserializeFromStorage<T>(data: any): T {
    return JSON.parse(JSON.stringify(data), (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  }
}