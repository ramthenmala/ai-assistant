#!/usr/bin/env node

// Database connection test script
import { getDatabaseConfig } from '../config/database';
import { createStorageService } from '../services/storage';

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  try {
    // Get database configuration
    const config = getDatabaseConfig();
    console.log(`Database type: ${config.databaseType}`);
    
    // Create storage service
    const storage = await createStorageService(config);
    
    // Test basic operations
    console.log('Testing basic operations...');
    
    // Test set/get
    await storage.set('test_key', { message: 'Hello Database!', timestamp: new Date() });
    const result = await storage.get('test_key');
    console.log('Set/Get test result:', result);
    
    // Test schema version
    const version = await storage.getCurrentSchemaVersion();
    console.log('Schema version:', version);
    
    // Test connection (if PostgreSQL)
    if (storage.constructor.name === 'PostgreSQLStorageService') {
      const pgStorage = storage as any;
      const connectionTest = await pgStorage.testConnection();
      console.log('PostgreSQL connection test:', connectionTest ? 'PASSED' : 'FAILED');
    }
    
    // Clean up test data
    await storage.remove('test_key');
    
    // Close connection
    await storage.close();
    
    console.log('✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

// Run the test if this is the main module
testDatabaseConnection();

export { testDatabaseConnection };