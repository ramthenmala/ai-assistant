import { useState, useCallback } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  BookOpen, 
  Database, 
  Settings, 
  Menu,
  ChevronDown,
  ChevronRight,
  Brain,
  BarChart3,
  Activity,
  TestTube,
  FileSearch
} from 'lucide-react';
import { ChatHistory } from './chat/ChatHistory';
import { useChatStore } from '../stores/useChatStore';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface NavigationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onPromptLibraryOpen?: () => void;
  onKnowledgeBaseOpen?: () => void;
  onSettingsOpen?: () => void;
  onSearchOpen?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isSDLCInitialized?: boolean;
  hasComparisonResult?: boolean;
}

export function NavigationSidebar({ 
  collapsed, 
  onToggle, 
  isMobile = false,
  onPromptLibraryOpen,
  onKnowledgeBaseOpen,
  onSettingsOpen,
  onSearchOpen,
  activeTab = 'chat',
  onTabChange,
  isSDLCInitialized = false,
  hasComparisonResult = false
}: NavigationSidebarProps) {
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(true);
  
  // Chat store integration
  const {
    chats,
    currentChatId,
    createChat,
    deleteChat,
    updateChatTitle,
    setCurrentChat,
  } = useChatStore();

  // Chat management handlers
  const handleChatCreate = useCallback(() => {
    createChat();
  }, [createChat]);

  const handleChatSelect = useCallback((chatId: string) => {
    setCurrentChat(chatId);
  }, [setCurrentChat]);

  const handleChatDelete = useCallback((chatId: string) => {
    deleteChat(chatId);
  }, [deleteChat]);

  const handleChatRename = useCallback((chatId: string, newTitle: string) => {
    updateChatTitle(chatId, newTitle);
  }, [updateChatTitle]);

  // Placeholder handlers for folder management (to be implemented)
  const handleFolderCreate = useCallback((name: string, parentId?: string) => {
    // TODO: Implement folder creation
    console.log('Create folder:', name, parentId);
  }, []);

  const handleFolderDelete = useCallback((folderId: string) => {
    // TODO: Implement folder deletion
    console.log('Delete folder:', folderId);
  }, []);

  const handleFolderRename = useCallback((folderId: string, newName: string) => {
    // TODO: Implement folder renaming
    console.log('Rename folder:', folderId, newName);
  }, []);

  const handleMoveChatToFolder = useCallback((chatId: string, folderId: string | null) => {
    // TODO: Implement chat folder management
    console.log('Move chat to folder:', chatId, folderId);
  }, []);

  const handleChatFavorite = useCallback((chatId: string) => {
    // TODO: Implement chat favorites
    console.log('Toggle favorite:', chatId);
  }, []);

  // Mock folders data for now
  const folders = [];

  
  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-card border-r transition-all duration-300 z-50 lg:relative lg:translate-x-0",
      collapsed ? (isMobile ? "-translate-x-full" : "w-16") : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h1 className="text-lg font-semibold text-foreground">AI Chat</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-2">
        <Button
          onClick={handleChatCreate}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="px-4 space-y-1 mb-4">
        <Button
          variant={activeTab === 'chat' ? 'default' : 'ghost'}
          onClick={() => onTabChange?.('chat')}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <MessageSquare className="h-4 w-4" />
          {!collapsed && <span>Chat</span>}
        </Button>
        
        <Button
          variant={activeTab === 'sdlc' ? 'default' : 'ghost'}
          onClick={() => onTabChange?.('sdlc')}
          disabled={!isSDLCInitialized}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Brain className="h-4 w-4" />
          {!collapsed && <span>SDLC</span>}
        </Button>
        
        <Button
          variant={activeTab === 'comparison' ? 'default' : 'ghost'}
          onClick={() => onTabChange?.('comparison')}
          disabled={!hasComparisonResult}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <BarChart3 className="h-4 w-4" />
          {!collapsed && <span>Analysis</span>}
        </Button>
        
        <Button
          variant={activeTab === 'metrics' ? 'default' : 'ghost'}
          onClick={() => onTabChange?.('metrics')}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Activity className="h-4 w-4" />
          {!collapsed && <span>Metrics</span>}
        </Button>
        
        <Button
          variant={activeTab === 'ats' ? 'default' : 'ghost'}
          onClick={() => onTabChange?.('ats')}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <FileSearch className="h-4 w-4" />
          {!collapsed && <span>ATS Scanner</span>}
        </Button>
        
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => onTabChange?.('settings')}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </Button>
      </nav>

      {/* Secondary Navigation Items */}
      <nav className="px-4 space-y-1">
        <Button
          variant="ghost"
          onClick={onPromptLibraryOpen}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <BookOpen className="h-4 w-4" />
          {!collapsed && <span>Prompt Library</span>}
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSearchOpen}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Search className="h-4 w-4" />
          {!collapsed && <span>Search</span>}
        </Button>
        
        <Button
          variant="ghost"
          onClick={onKnowledgeBaseOpen}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Database className="h-4 w-4" />
          {!collapsed && <span>Knowledge Base</span>}
        </Button>
        
        <Button
          variant="ghost"
          onClick={onSettingsOpen}
          className={cn(
            "w-full gap-3",
            collapsed ? "justify-center" : "justify-start"
          )}
          size="lg"
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </Button>
      </nav>

      {/* Chat History Section */}
      {!collapsed && (
        <div className="flex-1 mt-6">
          <ChatHistory
            chats={chats}
            folders={folders}
            currentChatId={currentChatId}
            onChatSelect={handleChatSelect}
            onChatCreate={handleChatCreate}
            onChatDelete={handleChatDelete}
            onChatRename={handleChatRename}
            onChatFavorite={handleChatFavorite}
            onFolderCreate={handleFolderCreate}
            onFolderDelete={handleFolderDelete}
            onFolderRename={handleFolderRename}
            onMoveChatToFolder={handleMoveChatToFolder}
            className="h-full"
          />
        </div>
      )}
    </aside>
  );
}