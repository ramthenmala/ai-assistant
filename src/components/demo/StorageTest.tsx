import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Database, Check, X, RefreshCw } from 'lucide-react';
import { StorageFactory } from '../../services/storage/StorageFactory';
import { databasePersistence } from '../../services/storage/StoragePersistence';

export function StorageTest() {
  const [storageInfo, setStorageInfo] = useState<{
    platform: string;
    isAvailable: boolean;
    version: number;
  } | null>(null);
  const [testResults, setTestResults] = useState<{
    keyValue: boolean;
    database: boolean;
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await StorageFactory.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults(null);
    
    try {
      const results = { keyValue: false, database: false };
      
      // Test 1: Key-value storage
      try {
        const storage = await StorageFactory.getStorageService();
        await storage.set('test-key', 'test-value');
        const value = await storage.get('test-key');
        results.keyValue = value === 'test-value';
        await storage.remove('test-key');
      } catch (error) {
        console.error('Key-value test failed:', error);
      }
      
      // Test 2: Database operations
      try {
        await databasePersistence.initialize();
        
        // Test inserting a chat
        const testChat = {
          id: 'test-chat-123',
          title: 'Test Chat',
          created_at: new Date(),
          updated_at: new Date(),
          active_knowledge_stacks: []
        };
        
        await databasePersistence.saveChat(testChat);
        const chats = await databasePersistence.getAllChats();
        results.database = chats.some(chat => chat.id === testChat.id);
        
        // Clean up
        await databasePersistence.deleteChat(testChat.id);
      } catch (error) {
        console.error('Database test failed:', error);
      }
      
      setTestResults(results);
    } catch (error) {
      setTestResults({ 
        keyValue: false, 
        database: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Storage System Test
        </CardTitle>
        <CardDescription>
          Test the storage functionality to verify it's working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">Storage Information</h3>
          {storageInfo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Platform:</span>
                <Badge variant="outline">{storageInfo.platform}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Available:</span>
                {storageInfo.isAvailable ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Yes
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    No
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Version:</span>
                <Badge variant="outline">v{storageInfo.version}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading storage info...</p>
          )}
        </div>

        {/* Test Button */}
        <Button 
          onClick={runTests} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Storage Tests
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResults && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Key-Value Storage:</span>
                {testResults.keyValue ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    Fail
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Database Operations:</span>
                {testResults.database ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    Fail
                  </Badge>
                )}
              </div>
              {testResults.error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <strong>Error:</strong> {testResults.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This test verifies that the storage system is working correctly</p>
          <p>• Key-Value test: Tests basic get/set operations</p>
          <p>• Database test: Tests chat creation and retrieval</p>
          <p>• In web browsers, IndexedDB is used for storage</p>
          <p>• In Electron, SQLite is used for storage</p>
        </div>
      </CardContent>
    </Card>
  );
}