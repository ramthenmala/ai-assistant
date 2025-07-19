// Storage Factory - Creates appropriate storage service based on platform

import type { StorageAdapter, StorageConfig, Migration } from './BaseStorageService';
import { IndexedDBStorageService } from './IndexedDBStorageService';
import type { PostgreSQLConfig } from './PostgreSQLStorageService';

export type PlatformType = 'electron' | 'web';
export type DatabaseType = 'sqlite' | 'postgresql' | 'indexeddb';

export interface StorageFactoryConfig extends StorageConfig {
  platform?: PlatformType;
  databaseType?: DatabaseType;
  sqliteDbPath?: string;
  postgresql?: PostgreSQLConfig;
}

// Default migrations for schema evolution
const defaultMigrations: Migration[] = [
  {
    version: 2,
    up: async (_adapter: StorageAdapter) => {
      // Example migration: Add new column or table
      console.log('Running migration v2: Adding new features...');
      // Migration logic would go here
    },
    down: async (_adapter: StorageAdapter) => {
      console.log('Rolling back migration v2...');
      // Rollback logic would go here
    }
  }
];

export class StorageFactory {
  private static instance: StorageAdapter | null = null;

  static async createStorageService(config?: Partial<StorageFactoryConfig>): Promise<StorageAdapter> {
    if (StorageFactory.instance) {
      return StorageFactory.instance;
    }

    const defaultConfig: StorageFactoryConfig = {
      databaseName: 'ai-chat-assistant',
      version: 1,
      migrations: defaultMigrations,
      platform: StorageFactory.detectPlatform(),
      databaseType: config?.databaseType || 'sqlite',
      sqliteDbPath: StorageFactory.getDefaultSqlitePath(),
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'ai_chat_assistant',
        user: 'postgres',
        password: '',
        ...config?.postgresql
      },
      ...config
    };

    let storageService: StorageAdapter;

    // Select storage service based on database type
    switch (defaultConfig.databaseType) {
      case 'postgresql':
        const { PostgreSQLStorageService } = await import('./PostgreSQLStorageService');
        storageService = new PostgreSQLStorageService({
          ...defaultConfig,
          ...defaultConfig.postgresql
        });
        break;
      
      case 'sqlite':
        try {
          // Try to import SQLite service (works in both Node.js and Electron)
          const { SqliteStorageService } = await import('./SqliteStorageService');
          storageService = new SqliteStorageService(
            defaultConfig,
            defaultConfig.sqliteDbPath!
          );
        } catch (error) {
          console.warn('SQLite not available, falling back to IndexedDB:', error);
          // Fall back to IndexedDB if SQLite is not available
          storageService = new IndexedDBStorageService(defaultConfig);
        }
        break;
      
      case 'indexeddb':
      default:
        storageService = new IndexedDBStorageService(defaultConfig);
        break;
    }

    await storageService.initializeSchema();
    StorageFactory.instance = storageService;
    
    return storageService;
  }

  static async getStorageService(): Promise<StorageAdapter> {
    if (!StorageFactory.instance) {
      return await StorageFactory.createStorageService();
    }
    return StorageFactory.instance;
  }

  static async closeStorageService(): Promise<void> {
    if (StorageFactory.instance) {
      await StorageFactory.instance.close();
      StorageFactory.instance = null;
    }
  }

  static detectPlatform(): PlatformType {
    // Check if we're running in Electron renderer process
    if (typeof window !== 'undefined' && (window as any).process && (window as any).process.type) {
      return 'electron';
    }
    
    // Check for Node.js environment (Electron main process)
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      return 'electron';
    }
    
    // Check for Electron API
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return 'electron';
    }
    
    // Default to web platform
    return 'web';
  }

  private static getDefaultSqlitePath(): string {
    if (typeof process !== 'undefined' && process.env) {
      // In Electron, use app data directory
      try {
        const os = require('os');
        const path = require('path');
        return path.join(os.homedir(), '.ai-chat-assistant', 'database.sqlite');
      } catch (error) {
        // Fallback if require fails (ES modules)
        return './database.sqlite';
      }
    }
    
    // Fallback for web (won't be used)
    return './database.sqlite';
  }

  // Utility method to check if storage is available
  static async isStorageAvailable(): Promise<boolean> {
    try {
      const storage = await StorageFactory.getStorageService();
      await storage.set('_test', 'test');
      await storage.remove('_test');
      return true;
    } catch (error) {
      console.error('Storage availability check failed:', error);
      return false;
    }
  }

  // Utility method to get storage info
  static async getStorageInfo(): Promise<{
    platform: PlatformType;
    databaseType: DatabaseType;
    isAvailable: boolean;
    version: number;
  }> {
    const platform = StorageFactory.detectPlatform();
    const isAvailable = await StorageFactory.isStorageAvailable();
    
    let version = 0;
    let databaseType: DatabaseType = 'indexeddb';
    
    try {
      const storage = await StorageFactory.getStorageService();
      version = await storage.getCurrentSchemaVersion();
      
      // Determine database type based on storage service
      if (storage.constructor.name === 'PostgreSQLStorageService') {
        databaseType = 'postgresql';
      } else if (storage.constructor.name === 'SqliteStorageService') {
        databaseType = 'sqlite';
      } else {
        databaseType = 'indexeddb';
      }
    } catch (error) {
      console.error('Failed to get storage version:', error);
    }

    return {
      platform,
      databaseType,
      isAvailable,
      version
    };
  }
}

// Export convenience functions
export const createStorageService = StorageFactory.createStorageService;
export const getStorageService = StorageFactory.getStorageService;
export const closeStorageService = StorageFactory.closeStorageService;