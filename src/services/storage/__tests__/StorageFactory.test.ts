import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageFactory } from '../StorageFactory';
import type { StorageFactoryConfig } from '../StorageFactory';

// Mock the storage services
vi.mock('../SqliteStorageService', () => ({
  SqliteStorageService: vi.fn().mockImplementation(() => ({
    initializeSchema: vi.fn(),
    close: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }))
}));

vi.mock('../IndexedDBStorageService', () => ({
  IndexedDBStorageService: vi.fn().mockImplementation(() => ({
    initializeSchema: vi.fn(),
    close: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }))
}));

// Mock window and process for platform detection
const mockWindow = {
  process: { type: 'renderer' }
};

const mockProcess = {
  versions: { electron: '27.1.0' },
  env: { NODE_ENV: 'test' }
};

describe('StorageFactory', () => {
  beforeEach(() => {
    // Reset the singleton instance
    (StorageFactory as any).instance = null;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await StorageFactory.closeStorageService();
  });

  describe('Platform detection', () => {
    it('should detect Electron renderer process', async () => {
      // Mock window with process property
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      const service = await StorageFactory.createStorageService();
      
      expect(service).toBeDefined();
      
      // Clean up
      delete (global as any).window;
    });

    it('should detect Electron main process', async () => {
      // Mock process global
      Object.defineProperty(global, 'process', {
        value: mockProcess,
        writable: true,
        configurable: true
      });
      
      const service = await StorageFactory.createStorageService();
      
      expect(service).toBeDefined();
      
      // Clean up
      delete (global as any).process;
    });

    it('should default to web platform', async () => {
      // Ensure no electron indicators
      delete (global as any).window;
      delete (global as any).process;
      
      const service = await StorageFactory.createStorageService();
      
      expect(service).toBeDefined();
    });
  });

  describe('Service creation', () => {
    it('should create storage service with default config', async () => {
      const service = await StorageFactory.createStorageService();
      
      expect(service).toBeDefined();
      expect(service.initializeSchema).toHaveBeenCalled();
    });

    it('should create storage service with custom config', async () => {
      const customConfig: Partial<StorageFactoryConfig> = {
        databaseName: 'custom-db',
        version: 2,
        platform: 'web'
      };
      
      const service = await StorageFactory.createStorageService(customConfig);
      
      expect(service).toBeDefined();
    });

    it('should return singleton instance on subsequent calls', async () => {
      const service1 = await StorageFactory.createStorageService();
      const service2 = await StorageFactory.createStorageService();
      
      expect(service1).toBe(service2);
    });
  });

  describe('Service retrieval', () => {
    it('should get existing storage service', async () => {
      const createdService = await StorageFactory.createStorageService();
      const retrievedService = await StorageFactory.getStorageService();
      
      expect(createdService).toBe(retrievedService);
    });

    it('should create service if none exists', async () => {
      const service = await StorageFactory.getStorageService();
      
      expect(service).toBeDefined();
    });
  });

  describe('Service cleanup', () => {
    it('should close storage service', async () => {
      const service = await StorageFactory.createStorageService();
      const closeSpy = vi.spyOn(service, 'close');
      
      await StorageFactory.closeStorageService();
      
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle closing non-existent service', async () => {
      await expect(StorageFactory.closeStorageService()).resolves.not.toThrow();
    });

    it('should reset instance after closing', async () => {
      await StorageFactory.createStorageService();
      await StorageFactory.closeStorageService();
      
      const newService = await StorageFactory.getStorageService();
      expect(newService).toBeDefined();
    });
  });

  describe('Storage availability', () => {
    it('should check storage availability', async () => {
      const mockService = {
        set: vi.fn(),
        remove: vi.fn(),
        initializeSchema: vi.fn()
      };
      
      vi.spyOn(StorageFactory, 'getStorageService').mockResolvedValue(mockService as any);
      
      const isAvailable = await StorageFactory.isStorageAvailable();
      
      expect(isAvailable).toBe(true);
      expect(mockService.set).toHaveBeenCalledWith('_test', 'test');
      expect(mockService.remove).toHaveBeenCalledWith('_test');
    });

    it('should handle storage unavailability', async () => {
      const mockService = {
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        initializeSchema: vi.fn()
      };
      
      vi.spyOn(StorageFactory, 'getStorageService').mockResolvedValue(mockService as any);
      
      const isAvailable = await StorageFactory.isStorageAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('Storage info', () => {
    it('should get storage info', async () => {
      const mockService = {
        getCurrentSchemaVersion: vi.fn().mockResolvedValue(2),
        set: vi.fn(),
        remove: vi.fn(),
        initializeSchema: vi.fn()
      };
      
      vi.spyOn(StorageFactory, 'getStorageService').mockResolvedValue(mockService as any);
      
      const info = await StorageFactory.getStorageInfo();
      
      expect(info).toEqual({
        platform: 'web',
        isAvailable: true,
        version: 2
      });
    });

    it('should handle version retrieval errors', async () => {
      const mockService = {
        getCurrentSchemaVersion: vi.fn().mockRejectedValue(new Error('Version error')),
        set: vi.fn(),
        remove: vi.fn(),
        initializeSchema: vi.fn()
      };
      
      vi.spyOn(StorageFactory, 'getStorageService').mockResolvedValue(mockService as any);
      
      const info = await StorageFactory.getStorageInfo();
      
      expect(info.version).toBe(0);
    });
  });

  describe('Default SQLite path', () => {
    it('should generate default SQLite path in Node.js environment', () => {
      // Mock os and path modules
      const mockOs = { homedir: () => '/home/user' };
      const mockPath = { join: (...args: string[]) => args.join('/') };
      
      // Mock require for Node.js modules
      const originalRequire = global.require;
      global.require = vi.fn().mockImplementation((module: string) => {
        if (module === 'os') return mockOs;
        if (module === 'path') return mockPath;
        return originalRequire?.(module);
      });
      
      // Mock process.env
      Object.defineProperty(global, 'process', {
        value: { env: {} },
        writable: true,
        configurable: true
      });
      
      const path = (StorageFactory as any).getDefaultSqlitePath();
      
      expect(path).toBe('/home/user/.ai-chat-assistant/database.sqlite');
      
      // Clean up
      global.require = originalRequire;
      delete (global as any).process;
    });

    it('should return fallback path in web environment', () => {
      // Ensure no Node.js environment
      delete (global as any).process;
      
      const path = (StorageFactory as any).getDefaultSqlitePath();
      
      expect(path).toBe('./database.sqlite');
    });
  });

  describe('Migration handling', () => {
    it('should include default migrations', async () => {
      const config: Partial<StorageFactoryConfig> = {
        version: 2
      };
      
      const service = await StorageFactory.createStorageService(config);
      
      expect(service).toBeDefined();
      expect(service.initializeSchema).toHaveBeenCalled();
    });

    it('should use custom migrations', async () => {
      const customMigrations = [
        {
          version: 3,
          up: vi.fn(),
          down: vi.fn()
        }
      ];
      
      const config: Partial<StorageFactoryConfig> = {
        version: 3,
        migrations: customMigrations
      };
      
      const service = await StorageFactory.createStorageService(config);
      
      expect(service).toBeDefined();
    });
  });

  describe('Convenience functions', () => {
    it('should export convenience functions', () => {
      const { createStorageService, getStorageService, closeStorageService } = require('../StorageFactory');
      
      expect(createStorageService).toBeDefined();
      expect(getStorageService).toBeDefined();
      expect(closeStorageService).toBeDefined();
    });
  });
});