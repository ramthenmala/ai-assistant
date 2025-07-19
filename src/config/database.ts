// Database configuration
import type { StorageFactoryConfig } from '../services/storage';

// Environment variables for database configuration
const DATABASE_CONFIG = {
  // Database type selection
  DATABASE_TYPE: (typeof process !== 'undefined' && process.env?.DATABASE_TYPE) || 'indexeddb',
  
  // PostgreSQL configuration
  POSTGRES_HOST: (typeof process !== 'undefined' && process.env?.POSTGRES_HOST) || 'localhost',
  POSTGRES_PORT: parseInt((typeof process !== 'undefined' && process.env?.POSTGRES_PORT) || '5432', 10),
  POSTGRES_DB: (typeof process !== 'undefined' && process.env?.POSTGRES_DB) || 'ai_chat_assistant',
  POSTGRES_USER: (typeof process !== 'undefined' && process.env?.POSTGRES_USER) || 'postgres',
  POSTGRES_PASSWORD: (typeof process !== 'undefined' && process.env?.POSTGRES_PASSWORD) || '',
  POSTGRES_SSL: (typeof process !== 'undefined' && process.env?.POSTGRES_SSL) === 'true',
  
  // Connection string (overrides individual settings if provided)
  DATABASE_URL: (typeof process !== 'undefined' && process.env?.DATABASE_URL) || undefined,
  
  // SQLite configuration
  SQLITE_DB_PATH: (typeof process !== 'undefined' && process.env?.SQLITE_DB_PATH) || './database.sqlite',
};

export function getDatabaseConfig(): StorageFactoryConfig {
  // Auto-detect database type based on environment if not explicitly set
  let databaseType = DATABASE_CONFIG.DATABASE_TYPE;
  
  // If no explicit type is set, choose based on environment
  if (!DATABASE_CONFIG.DATABASE_TYPE || DATABASE_CONFIG.DATABASE_TYPE === 'auto') {
    if (typeof window !== 'undefined') {
      // Browser environment - use IndexedDB
      databaseType = 'indexeddb';
    } else if (typeof process !== 'undefined' && process.versions?.electron) {
      // Electron environment - use SQLite
      databaseType = 'sqlite';
    } else if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
      // Node.js environment - use PostgreSQL if available, otherwise SQLite
      databaseType = DATABASE_CONFIG.DATABASE_URL ? 'postgresql' : 'sqlite';
    } else {
      // Fallback
      databaseType = 'indexeddb';
    }
  }

  const config: StorageFactoryConfig = {
    databaseName: 'ai-chat-assistant',
    version: 1,
    databaseType: databaseType as any,
  };

  // PostgreSQL specific configuration
  if (databaseType === 'postgresql') {
    config.postgresql = {
      connectionString: DATABASE_CONFIG.DATABASE_URL,
      host: DATABASE_CONFIG.POSTGRES_HOST,
      port: DATABASE_CONFIG.POSTGRES_PORT,
      database: DATABASE_CONFIG.POSTGRES_DB,
      user: DATABASE_CONFIG.POSTGRES_USER,
      password: DATABASE_CONFIG.POSTGRES_PASSWORD,
      ssl: DATABASE_CONFIG.POSTGRES_SSL,
      databaseName: DATABASE_CONFIG.POSTGRES_DB,
      version: 1,
    };
  }

  // SQLite specific configuration
  if (databaseType === 'sqlite') {
    config.sqliteDbPath = DATABASE_CONFIG.SQLITE_DB_PATH;
  }

  return config;
}

// Helper function to get database type
export function getDatabaseType(): string {
  return DATABASE_CONFIG.DATABASE_TYPE;
}

// Helper function to check if database is configured
export function isDatabaseConfigured(): boolean {
  const config = getDatabaseConfig();
  const dbType = config.databaseType;
  
  switch (dbType) {
    case 'postgresql':
      return !!(DATABASE_CONFIG.DATABASE_URL || 
                (DATABASE_CONFIG.POSTGRES_HOST && 
                 DATABASE_CONFIG.POSTGRES_DB && 
                 DATABASE_CONFIG.POSTGRES_USER));
    
    case 'sqlite':
      return !!DATABASE_CONFIG.SQLITE_DB_PATH;
    
    case 'indexeddb':
      return typeof window !== 'undefined'; // Available in browser
    
    default:
      return false;
  }
}

// Export environment variables for reference
export { DATABASE_CONFIG };