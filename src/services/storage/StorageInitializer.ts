// Storage service initialization and setup
import { StorageFactory } from './StorageFactory';
import { databasePersistence } from './StoragePersistence';
import type { StorageFactoryConfig } from './StorageFactory';
import { getDatabaseConfig } from '../../config/database';

export class StorageInitializer {
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  static async initialize(config?: Partial<StorageFactoryConfig>): Promise<void> {
    if (StorageInitializer.isInitialized) {
      return;
    }

    if (StorageInitializer.initPromise) {
      return StorageInitializer.initPromise;
    }

    StorageInitializer.initPromise = StorageInitializer.performInitialization(config);
    await StorageInitializer.initPromise;
    StorageInitializer.isInitialized = true;
  }

  private static async performInitialization(config?: Partial<StorageFactoryConfig>): Promise<void> {
    try {
      console.log('Initializing storage services...');
      
      // Detect platform first
      const platform = StorageFactory.detectPlatform();
      console.log('Detected platform:', platform);
      
      // Create storage service instance with database config
      const databaseConfig = getDatabaseConfig();
      const mergedConfig = { ...databaseConfig, ...config };
      await StorageFactory.createStorageService(mergedConfig);
      
      // Initialize database persistence
      await databasePersistence.initialize();
      
      // Check storage availability
      const isAvailable = await StorageFactory.isStorageAvailable();
      if (!isAvailable) {
        console.warn('Storage service is not available, but continuing...');
      }
      
      // Get storage info for debugging
      const storageInfo = await StorageFactory.getStorageInfo();
      console.log('Storage initialized successfully:', storageInfo);
      
      // Run any necessary migrations
      await StorageInitializer.runMigrations();
      
    } catch (error) {
      console.error('Failed to initialize storage services:', error);
      throw error;
    }
  }

  private static async runMigrations(): Promise<void> {
    try {
      const storageService = await StorageFactory.getStorageService();
      const currentVersion = await storageService.getCurrentSchemaVersion();
      
      // Add any custom migration logic here
      console.log(`Storage schema version: ${currentVersion}`);
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    try {
      await StorageFactory.closeStorageService();
      StorageInitializer.isInitialized = false;
      StorageInitializer.initPromise = null;
      
      console.log('Storage services cleaned up');
    } catch (error) {
      console.error('Failed to cleanup storage services:', error);
    }
  }

  static isReady(): boolean {
    return StorageInitializer.isInitialized;
  }

  static async waitForInitialization(): Promise<void> {
    if (StorageInitializer.isInitialized) {
      return;
    }

    if (StorageInitializer.initPromise) {
      await StorageInitializer.initPromise;
    }
  }
}

// Auto-initialize on module load in development
if (process.env.NODE_ENV === 'development') {
  StorageInitializer.initialize().catch(console.error);
}

// Cleanup on process exit
if (typeof process !== 'undefined' && process.on) {
  process.on('exit', () => {
    StorageInitializer.cleanup().catch(console.error);
  });
  
  process.on('SIGINT', async () => {
    await StorageInitializer.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await StorageInitializer.cleanup();
    process.exit(0);
  });
}

// Cleanup on window unload (for web)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    StorageInitializer.cleanup().catch(console.error);
  });
}

export default StorageInitializer;