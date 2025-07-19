import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { EnhancedKnowledgePanel } from './knowledge/EnhancedKnowledgePanel';
import { SettingsPanel } from './settings/SettingsPanel';
import { PromptLibraryModal } from './prompt-library/PromptLibraryModal';
import { SearchModal } from './search/SearchModal';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastProvider } from './ui/toast';
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

// Layout Context for sharing panel functions with child components
interface LayoutContextType {
  openPromptLibrary: () => void;
  openKnowledgePanel: () => void;
  openSettings: () => void;
  openSearch: () => void;
  windowCount: number;
  setWindowCount: (count: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarCollapsed: boolean;
  insertPrompt: (content: string) => void;
  setInsertPrompt: (fn: (content: string) => void) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSDLCInitialized: boolean;
  hasComparisonResult: boolean;
  setIsSDLCInitialized: (initialized: boolean) => void;
  setHasComparisonResult: (hasResult: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a Layout component');
  }
  return context;
};

interface LayoutProps {
  children: React.ReactNode;
  windowCount?: number;
}

export function Layout({ children, windowCount = 0 }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [internalWindowCount, setInternalWindowCount] = useState(windowCount);
  const [insertPromptFn, setInsertPromptFn] = useState<(content: string) => void>(() => () => {});
  const [activeTab, setActiveTab] = useState('chat');
  const [isSDLCInitialized, setIsSDLCInitialized] = useState(false);
  const [hasComparisonResult, setHasComparisonResult] = useState(false);
  
  // Initialize knowledge services
  const initializeServices = useKnowledgeStore(state => state.initializeServices);
  const settings = useSettingsStore(state => state.settings);
  
  // Panel state management
  const [isKnowledgePanelOpen, setIsKnowledgePanelOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Initialize knowledge services with settings
  useEffect(() => {
    if (settings) {
      initializeServices(settings);
    }
  }, [settings, initializeServices]);

  // Auto-collapse sidebar when there are 3+ windows
  useEffect(() => {
    if (internalWindowCount >= 3) {
      setSidebarCollapsed(true);
    }
  }, [internalWindowCount]);

  // Navigation handlers
  const handlePromptLibraryOpen = useCallback(() => {
    setIsPromptLibraryOpen(true);
  }, []);

  const handleKnowledgeBaseOpen = useCallback(() => {
    setIsKnowledgePanelOpen(true);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsPanelOpen(true);
  }, []);

  const handleSearchOpen = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  // Mock data for panels (TODO: Replace with real data from stores)
  const mockKnowledgeStacks = [
    {
      id: 'stack-1',
      name: 'Project Documentation',
      description: 'Documentation and specs for the current project',
      sources: [
        {
          id: 'source-1',
          name: 'requirements.md',
          type: 'file' as const,
          path: '/docs/requirements.md',
          stackId: 'stack-1',
          status: 'ready' as const,
          size: 2048,
          chunkCount: 5
        }
      ],
      isActive: true
    }
  ];

  const mockPrompts = [
    {
      id: 'prompt-1',
      title: 'Code Review',
      description: 'Analyze code and provide feedback',
      content: 'Please review this code and provide feedback on:\n1. Code quality\n2. Performance\n3. Security\n4. Best practices',
      tags: ['code', 'review'],
      createdAt: new Date(),
      usageCount: 5,
      isFavorite: true
    }
  ];

  const mockApiKeys = [
    { service: 'OpenAI', key: '', isValid: false },
    { service: 'Anthropic', key: '', isValid: false }
  ];

  const mockPrivacySettings = {
    shareUsageData: false,
    allowErrorReporting: true,
    localProcessingOnly: false
  };

  const mockKeyboardShortcuts = [
    { action: 'Open Settings', keys: ['Ctrl', ','] },
    { action: 'Toggle Sidebar', keys: ['Ctrl', 'B'] },
    { action: 'Open Knowledge Panel', keys: ['Ctrl', 'K'] },
    { action: 'Open Prompt Library', keys: ['Ctrl', 'P'] },
    { action: 'Close Panels', keys: ['Escape'] }
  ];

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd key combinations
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd) {
        switch (event.key) {
          case ',':
            event.preventDefault();
            handleSettingsOpen();
            break;
          case 'b':
            event.preventDefault();
            setSidebarCollapsed(!sidebarCollapsed);
            break;
          case 'k':
            event.preventDefault();
            handleKnowledgeBaseOpen();
            break;
          case 'p':
            event.preventDefault();
            handlePromptLibraryOpen();
            break;
          case 'f':
            event.preventDefault();
            handleSearchOpen();
            break;
          case 'Escape':
            // Close all panels on Escape
            setIsKnowledgePanelOpen(false);
            setIsSettingsPanelOpen(false);
            setIsPromptLibraryOpen(false);
            setIsSearchOpen(false);
            break;
        }
      } else if (event.key === 'Escape') {
        // Close panels on Escape without Ctrl/Cmd
        setIsKnowledgePanelOpen(false);
        setIsSettingsPanelOpen(false);
        setIsPromptLibraryOpen(false);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed]);

  // Create context value
  const layoutContextValue: LayoutContextType = {
    openPromptLibrary: handlePromptLibraryOpen,
    openKnowledgePanel: handleKnowledgeBaseOpen,
    openSettings: handleSettingsOpen,
    openSearch: handleSearchOpen,
    windowCount: internalWindowCount,
    setWindowCount: setInternalWindowCount,
    setSidebarCollapsed,
    sidebarCollapsed,
    insertPrompt: insertPromptFn,
    setInsertPrompt: setInsertPromptFn,
    activeTab,
    setActiveTab,
    isSDLCInitialized,
    hasComparisonResult,
    setIsSDLCInitialized,
    setHasComparisonResult,
  };

  return (
    <ToastProvider>
      <LayoutContext.Provider value={layoutContextValue}>
        <ErrorBoundary level="critical" onError={(error, errorInfo) => {
          console.error('Critical layout error:', error, errorInfo);
        }}>
          <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <NavigationSidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobile={isMobile}
        onPromptLibraryOpen={handlePromptLibraryOpen}
        onKnowledgeBaseOpen={handleKnowledgeBaseOpen}
        onSettingsOpen={handleSettingsOpen}
        onSearchOpen={handleSearchOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSDLCInitialized={isSDLCInitialized}
        hasComparisonResult={hasComparisonResult}
      />
      
      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col transition-all duration-300`}>
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1">
            <ErrorBoundary level="page" onError={(error, errorInfo) => {
              console.error('Main content error:', error, errorInfo);
            }}>
              {children}
            </ErrorBoundary>
          </div>
          
          {/* Knowledge Panel - Side drawer */}
          {isKnowledgePanelOpen && (
            <div className="w-80 border-l bg-card relative">
              {/* Close button for Knowledge Panel */}
              <button
                onClick={() => setIsKnowledgePanelOpen(false)}
                className="absolute top-2 right-2 z-10 p-1 rounded-md hover:bg-accent"
                title="Close Knowledge Panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <ErrorBoundary level="component">
                <EnhancedKnowledgePanel className="h-full" />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </main>
      
      {/* Modal Overlays */}
      {isSettingsPanelOpen && (
        <ErrorBoundary level="component">
          <SettingsPanel
            apiKeys={mockApiKeys}
            privacySettings={mockPrivacySettings}
            keyboardShortcuts={mockKeyboardShortcuts}
            onClose={() => setIsSettingsPanelOpen(false)}
            onUpdateApiKey={(service, key) => {
              console.log('Update API key:', service, key);
            }}
            onUpdatePrivacySetting={(setting, value) => {
              console.log('Update privacy setting:', setting, value);
            }}
          />
        </ErrorBoundary>
      )}
      
      {isPromptLibraryOpen && (
        <ErrorBoundary level="component">
          <PromptLibraryModal
            prompts={mockPrompts}
            onClose={() => setIsPromptLibraryOpen(false)}
            onSelectPrompt={(prompt) => {
              insertPromptFn(prompt.content);
              setIsPromptLibraryOpen(false);
            }}
            onCreatePrompt={(prompt) => {
              console.log('Create prompt:', prompt);
            }}
            onToggleFavorite={(promptId) => {
              console.log('Toggle favorite:', promptId);
            }}
          />
        </ErrorBoundary>
      )}
      
      {/* Search Modal */}
      {isSearchOpen && (
        <ErrorBoundary level="component">
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onResultSelect={(result) => {
              console.log('Search result selected:', result);
              setIsSearchOpen(false);
            }}
            onChatOpen={(chatId) => {
              console.log('Open chat:', chatId);
              setIsSearchOpen(false);
            }}
          />
        </ErrorBoundary>
      )}
          </div>
        </ErrorBoundary>
      </LayoutContext.Provider>
    </ToastProvider>
  );
}