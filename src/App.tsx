import { useEffect, useState } from 'react';
import { Layout, useLayout } from './components/Layout';
import { EnhancedSplitChatContainer } from './components/chat/EnhancedSplitChatContainer';
import { ATSContainer } from './components/ats/ATSContainer';
import { Button } from './components/ui/button';
import { themeUtils } from './lib/utils';
import { Database } from 'lucide-react';
import { StorageInitializer } from './services/storage/StorageInitializer';
import { useModelStore } from './stores/useModelStore';
import { useChatStore } from './stores/useChatStore';
import { usePromptStore } from './stores/usePromptStore';
import { useKnowledgeStore } from './stores/useKnowledgeStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useSDLCStore } from './stores/useSDLCStore';

// Main content component that switches based on active tab
function MainContent() {
  const { activeTab } = useLayout();
  
  switch (activeTab) {
    case 'ats':
      return <ATSContainer />;
    case 'sdlc':
    case 'comparison':
    case 'metrics':
    case 'chat':
    default:
      return (
        <div className="flex-1 flex flex-col h-full">
          <EnhancedSplitChatContainer className="h-full" />
        </div>
      );
  }
}

function App() {
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  
  // Initialize stores
  const { loadDefaultModels } = useModelStore();
  const { createChat } = useChatStore();
  const { initializeDefaultPrompts } = usePromptStore();
  const { initializeServices } = useKnowledgeStore();
  const { getSettings } = useSettingsStore();
  const { initializeServices: initSDLCServices } = useSDLCStore();

  // Initialize theme and storage
  useEffect(() => {
    themeUtils.initTheme();
    
    // Initialize storage services
    StorageInitializer.initialize()
      .then(() => {
        setStorageInitialized(true);
        console.log('Storage services initialized successfully');
        
        // Initialize default models and create a default chat
        loadDefaultModels();
        createChat('Multi-Model Chat');
        initializeDefaultPrompts();
        
        // Initialize knowledge services if settings are available
        const currentSettings = getSettings();
        if (currentSettings) {
          initializeServices(currentSettings);
          initSDLCServices(currentSettings);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize storage services:', error);
        setStorageError(error.message);
      });
  }, [loadDefaultModels, createChat, initializeDefaultPrompts, initializeServices, initSDLCServices, getSettings]);
  
  // Initialize knowledge services when settings change
  useEffect(() => {
    if (storageInitialized) {
      const currentSettings = getSettings();
      if (currentSettings) {
        initializeServices(currentSettings);
        initSDLCServices(currentSettings);
      }
    }
  }, [storageInitialized, initializeServices, initSDLCServices, getSettings]);

  if (!storageInitialized) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Database className="h-6 w-6" />
              {storageError ? (
                <span className="text-red-600">Storage Error: {storageError}</span>
              ) : (
                <span className="text-yellow-600">Initializing...</span>
              )}
            </div>
            {storageError && (
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <MainContent />
    </Layout>
  );
}

export default App;