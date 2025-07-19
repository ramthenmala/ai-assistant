// SQLite Storage Service for Electron desktop version

import { BaseStorageService } from './BaseStorageService';
import type { StorageConfig } from './BaseStorageService';

// Dynamically import better-sqlite3 to avoid bundling in browser
let Database: any;
try {
  // Only try to require in Node.js environment
  if (typeof require !== 'undefined' && typeof process !== 'undefined') {
    Database = require('better-sqlite3');
  }
} catch (error) {
  console.warn('better-sqlite3 not available, SQLite service will not work');
}

export class SqliteStorageService extends BaseStorageService {
  private db: any | null = null;
  private dbPath: string;

  constructor(config: StorageConfig, dbPath: string) {
    super(config);
    this.dbPath = dbPath;
    
    if (!Database) {
      throw new Error('better-sqlite3 is not available. SQLite service cannot be initialized.');
    }
  }

  private ensureDatabase(): any {
    if (!this.db) {
      if (!Database) {
        throw new Error('better-sqlite3 is not available');
      }
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
    }
    return this.db;
  }

  async initializeSchema(): Promise<void> {
    const db = this.ensureDatabase();
    
    // Create metadata table for schema versioning
    db.exec(`
      CREATE TABLE IF NOT EXISTS _metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create main tables
    db.exec(`
      -- Chats table
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        folder_id TEXT,
        active_knowledge_stacks TEXT, -- JSON array
        metadata TEXT -- JSON object
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        branch_id TEXT,
        parent_id TEXT,
        content TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_edited BOOLEAN DEFAULT FALSE,
        metadata TEXT, -- JSON object
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      );

      -- Branches table
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        parent_message_id TEXT NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      );

      -- Prompts table
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        tags TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        usage_count INTEGER DEFAULT 0,
        is_favorite BOOLEAN DEFAULT FALSE
      );

      -- Knowledge sources table
      CREATE TABLE IF NOT EXISTS knowledge_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('file', 'folder', 'url')),
        path TEXT NOT NULL,
        stack_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('indexing', 'ready', 'error')),
        indexed_at DATETIME,
        size INTEGER,
        chunk_count INTEGER,
        metadata TEXT -- JSON object
      );

      -- Knowledge stacks table
      CREATE TABLE IF NOT EXISTS knowledge_stacks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Key-value store table for simple storage
      CREATE TABLE IF NOT EXISTS key_value_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_branch_id ON messages(branch_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_branches_chat_id ON branches(chat_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_sources_stack_id ON knowledge_sources(stack_id);
      CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
    `);

    // Set initial schema version if not exists
    const versionCheck = db.prepare('SELECT value FROM _metadata WHERE key = ?').get('schema_version');
    if (!versionCheck) {
      db.prepare('INSERT INTO _metadata (key, value) VALUES (?, ?)').run('schema_version', '1');
    }
  }

  async getCurrentSchemaVersion(): Promise<number> {
    const db = this.ensureDatabase();
    const result = db.prepare('SELECT value FROM _metadata WHERE key = ?').get('schema_version') as { value: string } | undefined;
    return result ? parseInt(result.value, 10) : 0;
  }

  async get<T>(key: string): Promise<T | null> {
    const db = this.ensureDatabase();
    const result = db.prepare('SELECT value FROM key_value_store WHERE key = ?').get(key) as { value: string } | undefined;
    
    if (!result) {
      return null;
    }

    try {
      const parsed = JSON.parse(result.value);
      return this.deserializeFromStorage<T>(parsed);
    } catch (error) {
      console.error('Error parsing stored value:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = this.ensureDatabase();
    const serialized = this.serializeForStorage(value);
    const jsonValue = JSON.stringify(serialized);
    
    db.prepare(`
      INSERT OR REPLACE INTO key_value_store (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(key, jsonValue);
  }

  async remove(key: string): Promise<void> {
    const db = this.ensureDatabase();
    db.prepare('DELETE FROM key_value_store WHERE key = ?').run(key);
  }

  async clear(): Promise<void> {
    const db = this.ensureDatabase();
    db.prepare('DELETE FROM key_value_store').run();
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    const db = this.ensureDatabase();
    const placeholders = keys.map(() => '?').join(',');
    const results = db.prepare(`SELECT key, value FROM key_value_store WHERE key IN (${placeholders})`).all(...keys) as Array<{ key: string; value: string }>;
    
    const resultMap = new Map(results.map(r => [r.key, r.value]));
    
    return keys.map(key => {
      const value = resultMap.get(key);
      if (!value) return null;
      
      try {
        const parsed = JSON.parse(value);
        return this.deserializeFromStorage<T>(parsed);
      } catch (error) {
        console.error('Error parsing stored value:', error);
        return null;
      }
    });
  }

  async setMany<T>(items: Record<string, T>): Promise<void> {
    const db = this.ensureDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO key_value_store (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(items)) {
        const serialized = this.serializeForStorage(value);
        const jsonValue = JSON.stringify(serialized);
        stmt.run(key, jsonValue);
      }
    });
    
    transaction();
  }

  async query<T>(table: string, conditions?: Record<string, any>): Promise<T[]> {
    const db = this.ensureDatabase();
    
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }
    
    const results = db.prepare(sql).all(...params);
    return results.map(result => this.deserializeFromStorage<T>(this.parseTableRow(result)));
  }

  async insert<T>(table: string, data: T): Promise<string> {
    const db = this.ensureDatabase();
    const serialized = this.serializeForStorage(data);
    
    // Generate ID if not provided
    const id = (serialized as any).id || this.generateId();
    const dataWithId = { ...serialized, id };
    
    const columns = Object.keys(dataWithId);
    const placeholders = columns.map(() => '?').join(',');
    const values = columns.map(col => {
      const value = dataWithId[col];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    });
    
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    db.prepare(sql).run(...values);
    
    return id;
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    const db = this.ensureDatabase();
    const serialized = this.serializeForStorage(data);
    
    const columns = Object.keys(serialized);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => {
      const value = serialized[col];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    });
    
    const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.prepare(sql).run(...values, id);
  }

  async delete(table: string, id: string): Promise<void> {
    const db = this.ensureDatabase();
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private parseTableRow(row: any): any {
    const parsed = { ...row };
    
    // Parse JSON fields
    const jsonFields = ['metadata', 'tags', 'active_knowledge_stacks'];
    for (const field of jsonFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (error) {
          // Keep as string if parsing fails
        }
      }
    }
    
    // Convert boolean fields
    const booleanFields = ['is_edited', 'is_favorite', 'is_active'];
    for (const field of booleanFields) {
      if (parsed[field] !== undefined) {
        parsed[field] = Boolean(parsed[field]);
      }
    }
    
    // Convert date fields
    const dateFields = ['created_at', 'updated_at', 'timestamp', 'indexed_at'];
    for (const field of dateFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        parsed[field] = new Date(parsed[field]);
      }
    }
    
    return parsed;
  }
}