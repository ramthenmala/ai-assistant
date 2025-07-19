# Database Setup Guide

This application now supports multiple database backends: PostgreSQL, SQLite, and IndexedDB (browser).

## Database Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database type: postgresql, sqlite, indexeddb, or auto
# Use 'auto' for automatic detection based on environment
DATABASE_TYPE=auto

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_chat_assistant
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
POSTGRES_SSL=false

# Alternative: Use connection string (overrides individual settings)
DATABASE_URL=postgresql://username:password@localhost:5432/ai_chat_assistant

# SQLite Configuration (if using SQLite)
SQLITE_DB_PATH=./database.sqlite
```

## PostgreSQL Setup

### 1. Install PostgreSQL

#### macOS (using Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows:
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database
CREATE DATABASE ai_chat_assistant;

-- Create user (optional, you can use the default postgres user)
CREATE USER ai_chat_user WITH PASSWORD 'yourpassword';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ai_chat_assistant TO ai_chat_user;

-- Exit psql
\q
```

### 3. Configure Environment Variables

Update your `.env` file with the correct PostgreSQL credentials:

```env
DATABASE_TYPE=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_chat_assistant
POSTGRES_USER=ai_chat_user
POSTGRES_PASSWORD=yourpassword
POSTGRES_SSL=false
```

### 4. Test Connection

Run the database test script to verify your connection:

```bash
npm run test:database
```

## SQLite Setup

If you prefer SQLite (default for Electron desktop app):

```env
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=./database.sqlite
```

## IndexedDB Setup

For browser-only usage (no additional setup required):

```env
DATABASE_TYPE=indexeddb
```

## Auto-Detection Setup

For automatic database selection based on environment:

```env
DATABASE_TYPE=auto
```

This will automatically choose:
- **IndexedDB** for browser environments
- **SQLite** for Electron desktop environments  
- **PostgreSQL** for Node.js environments (if DATABASE_URL is provided)
- **SQLite** as fallback for Node.js environments

## Database Migration

The application will automatically create the necessary tables when it starts. The schema includes:

- `chats` - Chat conversations
- `messages` - Chat messages with branching support
- `branches` - Conversation branches
- `prompts` - Saved prompts
- `knowledge_sources` - Knowledge base sources
- `knowledge_stacks` - Knowledge base stacks
- `key_value_store` - General key-value storage
- `_metadata` - Schema versioning

## Usage in Application

The application will automatically detect and use the configured database type. You can also programmatically specify the database type:

```typescript
import { createStorageService } from './services/storage';

// Use PostgreSQL
const storage = await createStorageService({
  databaseType: 'postgresql',
  postgresql: {
    host: 'localhost',
    port: 5432,
    database: 'ai_chat_assistant',
    user: 'postgres',
    password: 'yourpassword'
  }
});

// Use SQLite
const storage = await createStorageService({
  databaseType: 'sqlite',
  sqliteDbPath: './database.sqlite'
});

// Use IndexedDB (browser)
const storage = await createStorageService({
  databaseType: 'indexeddb'
});
```

## Troubleshooting

### PostgreSQL Connection Issues

1. **Connection refused**: Make sure PostgreSQL is running
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql  # Linux
   brew services list | grep postgresql  # macOS
   ```

2. **Authentication failed**: Check your username and password
   ```bash
   # Test connection manually
   psql -h localhost -U postgres -d ai_chat_assistant
   ```

3. **Database doesn't exist**: Create the database
   ```sql
   CREATE DATABASE ai_chat_assistant;
   ```

### SQLite Issues

1. **Permission denied**: Make sure the application has write permissions to the database file location
2. **Database locked**: Close any other applications that might be using the database file

### General Issues

1. **Environment variables not loaded**: Make sure your `.env` file is in the root directory
2. **TypeScript compilation errors**: Run `npm run build` to check for compilation issues
3. **Missing dependencies**: Run `npm install` to install all required packages

## Performance Considerations

- **PostgreSQL**: Best for production use with concurrent users
- **SQLite**: Good for single-user desktop applications
- **IndexedDB**: Suitable for browser-only applications with local storage needs

## Security Notes

- Never commit your `.env` file to version control
- Use strong passwords for PostgreSQL users
- Consider using SSL connections for production PostgreSQL deployments
- Regularly backup your database

## Backup and Recovery

### PostgreSQL Backup
```bash
pg_dump -h localhost -U postgres ai_chat_assistant > backup.sql
```

### PostgreSQL Restore
```bash
psql -h localhost -U postgres ai_chat_assistant < backup.sql
```

### SQLite Backup
```bash
cp database.sqlite database_backup.sqlite
```

For more information, refer to the respective database documentation.