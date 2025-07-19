// IndexedDB Storage Service for web browsers using Dexie

import Dexie from 'dexie';
import type { Table } from 'dexie';
import { BaseStorageService } from './BaseStorageService';
import type { StorageConfig } from './BaseStorageService';

// Define the database schema interfaces
interface ChatRecord {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  folder_id?: string;
  active_knowledge_stacks: string[];
  metadata?: Record<string, any>;
}

interface MessageRecord {
  id: string;
  chat_id: string;
  branch_id?: string;
  parent_id?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  is_edited: boolean;
  metadata?: Record<string, any>;
}

interface BranchRecord {
  id: string;
  chat_id: string;
  parent_message_id: string;
  title?: string;
  created_at: Date;
}

interface PromptRecord {
  id: string;
  title: string;
  description?: string;
  content: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  usage_count: number;
  is_favorite: boolean;
}

interface KnowledgeSourceRecord {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'url';
  path: string;
  stack_id: string;
  status: 'indexing' | 'ready' | 'error';
  indexed_at?: Date;
  size: number;
  chunk_count?: number;
  metadata?: Record<string, any>;
}

interface KnowledgeStackRecord {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface KeyValueRecord {
  key: string;
  value: any;
  created_at: Date;
  updated_at: Date;
}

interface MetadataRecord {
  key: string;
  value: string;
}

class ChatAssistantDB extends Dexie {
  chats!: Table<ChatRecord>;
  messages!: Table<MessageRecord>;
  branches!: Table<BranchRecord>;
  prompts!: Table<PromptRecord>;
  knowledge_sources!: Table<KnowledgeSourceRecord>;
  knowledge_stacks!: Table<KnowledgeStackRecord>;
  key_value_store!: Table<KeyValueRecord>;
  _metadata!: Table<MetadataRecord>;

  constructor(databaseName: string) {
    super(databaseName);
    
    this.version(1).stores({
      chats: 'id, title, created_at, updated_at, folder_id',
      messages: 'id, chat_id, branch_id, parent_id, role, timestamp',
      branches: 'id, chat_id, parent_message_id, created_at',
      prompts: 'id, title, created_at, updated_at, usage_count, is_favorite, *tags',
      knowledge_sources: 'id, name, type, stack_id, status, indexed_at',
      knowledge_stacks: 'id, name, is_active, created_at, updated_at',
      key_value_store: 'key, created_at, updated_at',
      _metadata: 'key'
    });
  }
}

export class IndexedDBStorageService extends BaseStorageService {
  private db: ChatAssistantDB;

  constructor(config: StorageConfig) {
    super(config);
    this.db = new ChatAssistantDB(config.databaseName);
  }

  async initializeSchema(): Promise<void> {
    // Dexie handles schema creation automatically
    await this.db.open();
    
    // Set initial schema version if not exists
    const versionCheck = await this.db._metadata.get('schema_version');
    if (!versionCheck) {
      await this.db._metadata.put({ key: 'schema_version', value: '1' });
    }
  }

  async getCurrentSchemaVersion(): Promise<number> {
    const result = await this.db._metadata.get('schema_version');
    return result ? parseInt(result.value, 10) : 0;
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.db.key_value_store.get(key);
    return result ? this.deserializeFromStorage<T>(result.value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = this.serializeForStorage(value);
    const now = new Date();
    
    await this.db.key_value_store.put({
      key,
      value: serialized,
      created_at: now,
      updated_at: now
    });
  }

  async remove(key: string): Promise<void> {
    await this.db.key_value_store.delete(key);
  }

  async clear(): Promise<void> {
    await this.db.key_value_store.clear();
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    const results = await this.db.key_value_store.bulkGet(keys);
    return results.map(result => 
      result ? this.deserializeFromStorage<T>(result.value) : null
    );
  }

  async setMany<T>(items: Record<string, T>): Promise<void> {
    const now = new Date();
    const records = Object.entries(items).map(([key, value]) => ({
      key,
      value: this.serializeForStorage(value),
      created_at: now,
      updated_at: now
    }));
    
    await this.db.key_value_store.bulkPut(records);
  }

  async query<T>(table: string, conditions?: Record<string, any>): Promise<T[]> {
    const dbTable = this.getTable(table);
    if (!dbTable) {
      throw new Error(`Table ${table} not found`);
    }

    let collection = dbTable.toCollection();
    
    if (conditions && Object.keys(conditions).length > 0) {
      collection = collection.filter(item => {
        return Object.entries(conditions).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }
    
    const results = await collection.toArray();
    return results.map(result => this.deserializeFromStorage<T>(result));
  }

  async insert<T>(table: string, data: T): Promise<string> {
    const dbTable = this.getTable(table);
    if (!dbTable) {
      throw new Error(`Table ${table} not found`);
    }

    const serialized = this.serializeForStorage(data);
    const id = (serialized as any).id || this.generateId();
    const dataWithId = { ...serialized, id };
    
    // Add timestamps for certain tables
    if (['chats', 'branches', 'prompts', 'knowledge_stacks'].includes(table)) {
      const now = new Date();
      if (!dataWithId.created_at) dataWithId.created_at = now;
      if (!dataWithId.updated_at) dataWithId.updated_at = now;
    } else if (table === 'messages') {
      if (!dataWithId.timestamp) dataWithId.timestamp = new Date();
    }
    
    await dbTable.put(dataWithId);
    return id;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    const dbTable = this.getTable(table);
    if (!dbTable) {
      throw new Error(`Table ${table} not found`);
    }

    const serialized = this.serializeForStorage(data);
    
    // Add updated timestamp for certain tables
    if (['chats', 'prompts', 'knowledge_stacks'].includes(table)) {
      serialized.updated_at = new Date();
    }
    
    await dbTable.update(id, serialized);
  }

  async delete(table: string, id: string): Promise<void> {
    const dbTable = this.getTable(table);
    if (!dbTable) {
      throw new Error(`Table ${table} not found`);
    }

    await dbTable.delete(id);
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  private getTable(tableName: string): Table<any, string> | null {
    switch (tableName) {
      case 'chats':
        return this.db.chats;
      case 'messages':
        return this.db.messages;
      case 'branches':
        return this.db.branches;
      case 'prompts':
        return this.db.prompts;
      case 'knowledge_sources':
        return this.db.knowledge_sources;
      case 'knowledge_stacks':
        return this.db.knowledge_stacks;
      case 'key_value_store':
        return this.db.key_value_store;
      case '_metadata':
        return this.db._metadata;
      default:
        return null;
    }
  }
}