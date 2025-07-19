// PostgreSQL Storage Service
import { Pool, PoolClient } from 'pg';
import { BaseStorageService } from './BaseStorageService';
import type { StorageConfig } from './BaseStorageService';

export interface PostgreSQLConfig extends StorageConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  connectionString?: string;
}

export class PostgreSQLStorageService extends BaseStorageService {
  private pool: Pool;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    super(config);
    this.config = config;
    
    // Create connection pool
    this.pool = new Pool({
      connectionString: config.connectionString || undefined,
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || config.databaseName,
      user: config.user || 'postgres',
      password: config.password || '',
      ssl: config.ssl || false,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create metadata table for schema versioning
      await client.query(`
        CREATE TABLE IF NOT EXISTS _metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Create main tables
      await client.query(`
        -- Chats table
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          folder_id TEXT,
          active_knowledge_stacks JSONB DEFAULT '[]'::jsonb,
          metadata JSONB DEFAULT '{}'::jsonb
        );

        -- Messages table
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          branch_id TEXT,
          parent_id TEXT,
          content TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_edited BOOLEAN DEFAULT FALSE,
          metadata JSONB DEFAULT '{}'::jsonb,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        );

        -- Branches table
        CREATE TABLE IF NOT EXISTS branches (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          parent_message_id TEXT NOT NULL,
          title TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        );

        -- Prompts table
        CREATE TABLE IF NOT EXISTS prompts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          content TEXT NOT NULL,
          tags JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
          indexed_at TIMESTAMP,
          size INTEGER,
          chunk_count INTEGER,
          metadata JSONB DEFAULT '{}'::jsonb
        );

        -- Knowledge stacks table
        CREATE TABLE IF NOT EXISTS knowledge_stacks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Key-value store table for simple storage
        CREATE TABLE IF NOT EXISTS key_value_store (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
        CREATE INDEX IF NOT EXISTS idx_messages_branch_id ON messages(branch_id);
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_branches_chat_id ON branches(chat_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_stack_id ON knowledge_sources(stack_id);
        CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at);
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_metadata ON knowledge_sources USING GIN(metadata);
        CREATE INDEX IF NOT EXISTS idx_chats_active_knowledge_stacks ON chats USING GIN(active_knowledge_stacks);
      `);

      // Set initial schema version if not exists
      const versionResult = await client.query('SELECT value FROM _metadata WHERE key = $1', ['schema_version']);
      if (versionResult.rows.length === 0) {
        await client.query('INSERT INTO _metadata (key, value) VALUES ($1, $2)', ['schema_version', '1']);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCurrentSchemaVersion(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT value FROM _metadata WHERE key = $1', ['schema_version']);
      return result.rows.length > 0 ? parseInt(result.rows[0].value, 10) : 0;
    } finally {
      client.release();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT value FROM key_value_store WHERE key = $1', [key]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const value = result.rows[0].value;
      return this.deserializeFromStorage<T>(value);
    } catch (error) {
      console.error('Error getting value from PostgreSQL:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const client = await this.pool.connect();
    try {
      const serialized = this.serializeForStorage(value);
      
      await client.query(`
        INSERT INTO key_value_store (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at
      `, [key, serialized]);
    } finally {
      client.release();
    }
  }

  async remove(key: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM key_value_store WHERE key = $1', [key]);
    } finally {
      client.release();
    }
  }

  async clear(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM key_value_store');
    } finally {
      client.release();
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT key, value FROM key_value_store WHERE key = ANY($1)',
        [keys]
      );
      
      const resultMap = new Map(result.rows.map(row => [row.key, row.value]));
      
      return keys.map(key => {
        const value = resultMap.get(key);
        if (!value) return null;
        
        try {
          return this.deserializeFromStorage<T>(value);
        } catch (error) {
          console.error('Error deserializing value:', error);
          return null;
        }
      });
    } finally {
      client.release();
    }
  }

  async setMany<T>(items: Record<string, T>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const keys = Object.keys(items);
      const values = keys.map(key => this.serializeForStorage(items[key]));
      
      // Use PostgreSQL's unnest function for bulk insert
      const placeholders = keys.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
      const queryParams = keys.flatMap((key, i) => [key, values[i]]);
      
      await client.query(`
        INSERT INTO key_value_store (key, value, updated_at) 
        VALUES ${placeholders}
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
      `, queryParams);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async query<T>(table: string, conditions?: Record<string, any>): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      let sql = `SELECT * FROM ${table}`;
      const params: any[] = [];
      
      if (conditions && Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      const result = await client.query(sql, params);
      return result.rows.map(row => this.deserializeFromStorage<T>(this.parseTableRow(row)));
    } finally {
      client.release();
    }
  }

  async insert<T>(table: string, data: T): Promise<string> {
    const client = await this.pool.connect();
    try {
      const serialized = this.serializeForStorage(data);
      
      // Generate ID if not provided
      const id = (serialized as any).id || this.generateId();
      const dataWithId = { ...serialized, id };
      
      const columns = Object.keys(dataWithId);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const values = columns.map(col => {
        const value = dataWithId[col];
        return typeof value === 'object' ? value : value;
      });
      
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
      const result = await client.query(sql, values);
      
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<void> {
    const client = await this.pool.connect();
    try {
      const serialized = this.serializeForStorage(data);
      
      const columns = Object.keys(serialized);
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const values = columns.map(col => serialized[col]);
      
      const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${columns.length + 1}`;
      await client.query(sql, [...values, id]);
    } finally {
      client.release();
    }
  }

  async delete(table: string, id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private parseTableRow(row: any): any {
    const parsed = { ...row };
    
    // PostgreSQL automatically handles JSON/JSONB fields
    // Convert date fields to proper Date objects if they're strings
    const dateFields = ['created_at', 'updated_at', 'timestamp', 'indexed_at'];
    for (const field of dateFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        parsed[field] = new Date(parsed[field]);
      }
    }
    
    return parsed;
  }

  // Additional PostgreSQL-specific methods
  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async executeTransaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const query of queries) {
        await client.query(query.sql, query.params || []);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('PostgreSQL connection test failed:', error);
      return false;
    }
  }
}