// Storage service exports
export { BaseStorageService } from './BaseStorageService';
export { IndexedDBStorageService } from './IndexedDBStorageService';
export { SqliteStorageService } from './SqliteStorageService';
export { PostgreSQLStorageService } from './PostgreSQLStorageService';
export { StorageFactory, createStorageService, getStorageService, closeStorageService } from './StorageFactory';
export { createStoragePersistence, DatabasePersistence, databasePersistence } from './StoragePersistence';
export { StorageInitializer } from './StorageInitializer';

export type { StorageAdapter, StorageConfig, Migration } from './BaseStorageService';
export type { PlatformType, DatabaseType, StorageFactoryConfig } from './StorageFactory';
export type { PostgreSQLConfig } from './PostgreSQLStorageService';