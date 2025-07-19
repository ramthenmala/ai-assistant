import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatTimestamp } from '@/lib/utils';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  MessageSquare,
  Clock,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Star,
  StarOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Chat, ChatFolder } from '@/types';

export interface ChatHistoryProps {
  chats: Chat[];
  folders: ChatFolder[];
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onChatCreate: () => void;
  onChatDelete: (chatId: string) => void;
  onChatRename: (chatId: string, newTitle: string) => void;
  onChatFavorite?: (chatId: string) => void;
  onFolderCreate: (name: string, parentId?: string) => void;
  onFolderDelete: (folderId: string) => void;
  onFolderRename: (folderId: string, newName: string) => void;
  onMoveChatToFolder: (chatId: string, folderId: string | null) => void;
  className?: string;
}

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  onFavorite?: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  folders: ChatFolder[];
}

interface FolderItemProps {
  folder: ChatFolder;
  chats: Chat[];
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onChatSelect: (chatId: string) => void;
  onChatRename: (chatId: string, newTitle: string) => void;
  onChatDelete: (chatId: string) => void;
  onChatFavorite?: (chatId: string) => void;
  onMoveChatToFolder: (chatId: string, folderId: string | null) => void;
  currentChatId?: string;
  folders: ChatFolder[];
}

const ChatItem = React.memo(function ChatItem({
  chat,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onFavorite,
  onMoveToFolder,
  folders,
}: ChatItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  const handleRename = useCallback(() => {
    if (editTitle.trim() && editTitle !== chat.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  }, [editTitle, chat.title, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(chat.title);
      setIsEditing(false);
    }
  }, [handleRename, chat.title]);

  const messagePreview = useMemo(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    return lastMessage?.content.substring(0, 50) + (lastMessage?.content.length > 50 ? '...' : '');
  }, [chat.messages]);

  const chatItemClasses = cn(
    'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
    'hover:bg-accent/50',
    isSelected && 'bg-accent text-accent-foreground',
    'border border-transparent hover:border-border/50'
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={chatItemClasses}
      onClick={onSelect}
    >
      <div className="flex-shrink-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-6 text-sm"
            autoFocus
          />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{chat.title}</span>
              {chat.metadata?.isFavorite && (
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(chat.updatedAt)}</span>
              <span>•</span>
              <span>{chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}</span>
            </div>
            {messagePreview && (
              <div className="text-xs text-muted-foreground/80 truncate">
                {messagePreview}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-3 w-3 mr-2" />
              Rename
            </DropdownMenuItem>
            {onFavorite && (
              <DropdownMenuItem onClick={onFavorite}>
                {chat.metadata?.isFavorite ? (
                  <>
                    <StarOff className="h-3 w-3 mr-2" />
                    Remove from favorites
                  </>
                ) : (
                  <>
                    <Star className="h-3 w-3 mr-2" />
                    Add to favorites
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
              <Folder className="h-3 w-3 mr-2" />
              Move to root
            </DropdownMenuItem>
            {folders.map((folder) => (
              <DropdownMenuItem 
                key={folder.id} 
                onClick={() => onMoveToFolder(folder.id)}
              >
                <FolderOpen className="h-3 w-3 mr-2" />
                Move to {folder.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
});

const FolderItem = React.memo(function FolderItem({
  folder,
  chats,
  level,
  isExpanded,
  onToggle,
  onRename,
  onDelete,
  onChatSelect,
  onChatRename,
  onChatDelete,
  onChatFavorite,
  onMoveChatToFolder,
  currentChatId,
  folders,
}: FolderItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const folderChats = useMemo(() => 
    chats.filter(chat => chat.folderId === folder.id),
    [chats, folder.id]
  );

  const handleRename = useCallback(() => {
    if (editName.trim() && editName !== folder.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  }, [editName, folder.name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(folder.name);
      setIsEditing(false);
    }
  }, [handleRename, folder.name]);

  const folderItemClasses = cn(
    'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
    'hover:bg-accent/30',
    'border border-transparent hover:border-border/30'
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-1"
    >
      <div 
        className={folderItemClasses}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          onClick={onToggle}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
        
        <div className="flex-shrink-0">
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="h-6 text-sm"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{folder.name}</span>
              <Badge variant="secondary" className="text-xs">
                {folderChats.length}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-3 w-3 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1"
            style={{ paddingLeft: `${(level + 1) * 16}px` }}
          >
            {folderChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isSelected={currentChatId === chat.id}
                onSelect={() => onChatSelect(chat.id)}
                onRename={(newTitle) => onChatRename(chat.id, newTitle)}
                onDelete={() => onChatDelete(chat.id)}
                onFavorite={onChatFavorite ? () => onChatFavorite(chat.id) : undefined}
                onMoveToFolder={(folderId) => onMoveChatToFolder(chat.id, folderId)}
                folders={folders}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export const ChatHistory = React.memo(function ChatHistory({
  chats,
  folders,
  currentChatId,
  onChatSelect,
  onChatCreate,
  onChatDelete,
  onChatRename,
  onChatFavorite,
  onFolderCreate,
  onFolderDelete,
  onFolderRename,
  onMoveChatToFolder,
  className,
}: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  const filteredChats = useMemo(() => {
    let filtered = chats;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat =>
        chat.title.toLowerCase().includes(query) ||
        chat.messages.some(msg => msg.content.toLowerCase().includes(query))
      );
    }

    // Filter by favorites
    if (showFavorites) {
      filtered = filtered.filter(chat => chat.metadata?.isFavorite);
    }

    return filtered;
  }, [chats, searchQuery, showFavorites]);

  const rootChats = useMemo(() => 
    filteredChats.filter(chat => !chat.folderId),
    [filteredChats]
  );

  const rootFolders = useMemo(() => 
    folders.filter(folder => !folder.parentId),
    [folders]
  );

  const handleCreateFolder = useCallback(() => {
    onFolderCreate('New Folder');
  }, [onFolderCreate]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Chat History</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onChatCreate}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Search */}
      <div className="p-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showFavorites ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowFavorites(!showFavorites)}
          >
            <Star className="h-3 w-3 mr-1" />
            Favorites
          </Button>
          
          <Button variant="ghost" size="sm" onClick={handleCreateFolder}>
            <Folder className="h-3 w-3 mr-1" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1 pb-4">
          <AnimatePresence>
            {/* Root folders */}
            {rootFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                chats={filteredChats}
                level={0}
                isExpanded={expandedFolders.has(folder.id)}
                onToggle={() => toggleFolder(folder.id)}
                onRename={(newName) => onFolderRename(folder.id, newName)}
                onDelete={() => onFolderDelete(folder.id)}
                onChatSelect={onChatSelect}
                onChatRename={onChatRename}
                onChatDelete={onChatDelete}
                onChatFavorite={onChatFavorite}
                onMoveChatToFolder={onMoveChatToFolder}
                currentChatId={currentChatId}
                folders={folders}
              />
            ))}

            {/* Root chats */}
            {rootChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isSelected={currentChatId === chat.id}
                onSelect={() => onChatSelect(chat.id)}
                onRename={(newTitle) => onChatRename(chat.id, newTitle)}
                onDelete={() => onChatDelete(chat.id)}
                onFavorite={onChatFavorite ? () => onChatFavorite(chat.id) : undefined}
                onMoveToFolder={(folderId) => onMoveChatToFolder(chat.id, folderId)}
                folders={folders}
              />
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {filteredChats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No chats match your search' : 'No chats yet'}
              </p>
              {!searchQuery && (
                <Button variant="ghost" size="sm" onClick={onChatCreate} className="mt-2">
                  <Plus className="h-4 w-4 mr-1" />
                  Create your first chat
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

ChatHistory.displayName = 'ChatHistory';