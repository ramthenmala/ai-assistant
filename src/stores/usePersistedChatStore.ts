// Enhanced chat store with storage persistence
import { create } from 'zustand';
import type { Chat, Message, Branch, MessageVersion } from '../types';
import { generateId, getCurrentTimestamp } from '../utils';
import { createStoragePersistence, databasePersistence } from '../services/storage/StoragePersistence';

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  currentBranchId: string | null;
  streamingMessageId: string | null;
  isStreaming: boolean;
  isLoading: boolean;
  isHydrated: boolean;
}

interface ChatActions {
  // Chat management
  createChat: (title?: string) => Promise<string>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  setCurrentChat: (chatId: string | null) => void;
  loadChats: () => Promise<void>;
  
  // Message management
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<string>;
  editMessage: (chatId: string, messageId: string, content: string, editReason?: string) => Promise<void>;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  regenerateMessage: (chatId: string, messageId: string) => Promise<void>;
  revertMessageVersion: (chatId: string, messageId: string, versionId: string) => Promise<void>;
  getMessageVersions: (chatId: string, messageId: string) => MessageVersion[];
  
  // Branch management
  createBranch: (chatId: string, fromMessageId: string, title?: string) => Promise<string>;
  deleteBranch: (chatId: string, branchId: string) => Promise<void>;
  switchBranch: (chatId: string, branchId: string) => void;
  setCurrentBranch: (branchId: string | null) => void;
  updateBranchTitle: (chatId: string, branchId: string, title: string) => Promise<void>;
  
  // Streaming management
  setStreamingMessage: (messageId: string | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  updateStreamingContent: (chatId: string, messageId: string, content: string) => void;
  
  // Utility actions
  getChatById: (chatId: string) => Chat | undefined;
  getMessageById: (chatId: string, messageId: string) => Message | undefined;
  getBranchById: (chatId: string, branchId: string) => Branch | undefined;
  getCurrentMessages: () => Message[];
  getAllChats: () => Chat[];
  clearAllChats: () => Promise<void>;
  
  // Persistence actions
  initializePersistence: () => Promise<void>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
}

export const usePersistedChatStore = create<ChatState & ChatActions>()(
  createStoragePersistence((set, get) => ({
    // State
    chats: [],
    currentChatId: null,
    currentBranchId: null,
    streamingMessageId: null,
    isStreaming: false,
    isLoading: false,
    isHydrated: false,
    
    // Initialize persistence
    initializePersistence: async () => {
      try {
        set({ isLoading: true });
        await databasePersistence.initialize();
        await get().loadChats();
        set({ isHydrated: true });
      } catch (error) {
        console.error('Failed to initialize persistence:', error);
      } finally {
        set({ isLoading: false });
      }
    },
    
    // Load chats from storage
    loadChats: async () => {
      try {
        const chats = await databasePersistence.getAllChats();
        
        // Load messages and branches for each chat
        const chatsWithData = await Promise.all(
          chats.map(async (chat) => {
            const [messages, branches] = await Promise.all([
              databasePersistence.getMessagesByChat(chat.id),
              databasePersistence.getBranchesByChat(chat.id)
            ]);
            
            // Load branch messages
            const branchesWithMessages = await Promise.all(
              branches.map(async (branch) => {
                const branchMessages = await databasePersistence.getMessagesByBranch(branch.id);
                return { ...branch, messages: branchMessages };
              })
            );
            
            return {
              ...chat,
              messages,
              branches: branchesWithMessages,
              activeKnowledgeStacks: chat.active_knowledge_stacks || []
            };
          })
        );
        
        set({ chats: chatsWithData });
      } catch (error) {
        console.error('Failed to load chats:', error);
      }
    },
    
    // Chat management actions
    createChat: async (title = 'New Chat') => {
      const chatId = generateId();
      const now = getCurrentTimestamp();
      
      const newChat: Chat = {
        id: chatId,
        title,
        createdAt: now,
        updatedAt: now,
        messages: [],
        branches: [],
        activeKnowledgeStacks: [],
      };
      
      try {
        // Save to database
        await databasePersistence.saveChat({
          id: chatId,
          title,
          created_at: now,
          updated_at: now,
          active_knowledge_stacks: [],
        });
        
        // Update store
        set((state) => ({
          chats: [...state.chats, newChat],
          currentChatId: chatId,
          currentBranchId: null,
        }));
        
        return chatId;
      } catch (error) {
        console.error('Failed to create chat:', error);
        throw error;
      }
    },
    
    deleteChat: async (chatId) => {
      try {
        // Delete from database
        await databasePersistence.deleteChat(chatId);
        
        // Update store
        set((state) => ({
          chats: state.chats.filter(chat => chat.id !== chatId),
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
          currentBranchId: state.currentChatId === chatId ? null : state.currentBranchId,
        }));
      } catch (error) {
        console.error('Failed to delete chat:', error);
        throw error;
      }
    },
    
    updateChatTitle: async (chatId, title) => {
      try {
        const now = getCurrentTimestamp();
        
        // Update database
        await databasePersistence.updateChat(chatId, {
          title,
          updated_at: now
        });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? { ...chat, title, updatedAt: now }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to update chat title:', error);
        throw error;
      }
    },
    
    setCurrentChat: (chatId) => {
      set({ currentChatId: chatId, currentBranchId: null });
    },
    
    // Message management actions
    addMessage: async (chatId, messageData) => {
      const messageId = generateId();
      const now = getCurrentTimestamp();
      
      const message: Message = {
        ...messageData,
        id: messageId,
        timestamp: now,
      };
      
      try {
        // Save to database
        await databasePersistence.saveMessage({
          id: messageId,
          chat_id: chatId,
          branch_id: get().currentBranchId,
          content: message.content,
          role: message.role,
          timestamp: now,
          is_edited: false,
          metadata: message.metadata || {},
        });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: state.currentBranchId
                    ? chat.messages // Branch messages are handled separately
                    : [...chat.messages, message],
                  branches: state.currentBranchId
                    ? chat.branches.map(branch =>
                        branch.id === state.currentBranchId
                          ? { ...branch, messages: [...branch.messages, message] }
                          : branch
                      )
                    : chat.branches,
                  updatedAt: now,
                }
              : chat
          ),
        }));
        
        return messageId;
      } catch (error) {
        console.error('Failed to add message:', error);
        throw error;
      }
    },
    
    editMessage: async (chatId, messageId, content, editReason) => {
      const now = getCurrentTimestamp();
      
      try {
        // Update database
        await databasePersistence.updateMessage(messageId, {
          content,
          is_edited: true,
          edited_at: now,
        });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          content,
                          isEdited: true,
                          editedAt: now,
                          versions: [
                            ...(msg.versions || []),
                            {
                              id: generateId(),
                              content: msg.content,
                              timestamp: msg.timestamp,
                              editReason,
                            },
                          ],
                        }
                      : msg
                  ),
                  branches: chat.branches.map(branch => ({
                    ...branch,
                    messages: branch.messages.map(msg =>
                      msg.id === messageId
                        ? {
                            ...msg,
                            content,
                            isEdited: true,
                            editedAt: now,
                            versions: [
                              ...(msg.versions || []),
                              {
                                id: generateId(),
                                content: msg.content,
                                timestamp: msg.timestamp,
                                editReason,
                              },
                            ],
                          }
                        : msg
                    ),
                  })),
                  updatedAt: now,
                }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to edit message:', error);
        throw error;
      }
    },

    updateMessage: async (chatId, messageId, updates) => {
      const now = getCurrentTimestamp();
      
      try {
        // Update database
        await databasePersistence.updateMessage(messageId, {
          ...updates,
          updated_at: now,
        });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === messageId
                      ? { ...msg, ...updates, updatedAt: now }
                      : msg
                  ),
                  branches: chat.branches.map(branch => ({
                    ...branch,
                    messages: branch.messages.map(msg =>
                      msg.id === messageId
                        ? { ...msg, ...updates, updatedAt: now }
                        : msg
                    ),
                  })),
                  updatedAt: now,
                }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to update message:', error);
        throw error;
      }
    },
    
    deleteMessage: async (chatId, messageId) => {
      try {
        // Delete from database
        await databasePersistence.deleteMessage(messageId);
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.filter(msg => msg.id !== messageId),
                  branches: chat.branches.map(branch => ({
                    ...branch,
                    messages: branch.messages.filter(msg => msg.id !== messageId),
                  })),
                  updatedAt: getCurrentTimestamp(),
                }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to delete message:', error);
        throw error;
      }
    },
    
    regenerateMessage: async (chatId, messageId) => {
      try {
        // Update database
        await databasePersistence.updateMessage(messageId, {
          metadata: { regenerating: true },
        });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === messageId
                      ? { ...msg, metadata: { ...msg.metadata, regenerating: true } }
                      : msg
                  ),
                  updatedAt: getCurrentTimestamp(),
                }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to regenerate message:', error);
        throw error;
      }
    },
    
    // Branch management actions
    createBranch: async (chatId, fromMessageId, title) => {
      const branchId = generateId();
      const now = getCurrentTimestamp();
      const chat = get().getChatById(chatId);
      
      if (!chat) throw new Error('Chat not found');
      
      // Find the message to branch from and get all messages up to that point
      const messageIndex = chat.messages.findIndex(msg => msg.id === fromMessageId);
      const branchMessages = messageIndex >= 0 ? chat.messages.slice(0, messageIndex + 1) : [];
      
      const newBranch: Branch = {
        id: branchId,
        parentMessageId: fromMessageId,
        messages: branchMessages,
        title: title || `Branch ${chat.branches.length + 1}`,
        createdAt: now,
      };
      
      try {
        // Save to database
        await databasePersistence.saveBranch({
          id: branchId,
          chat_id: chatId,
          parent_message_id: fromMessageId,
          title: newBranch.title,
          created_at: now,
        });
        
        // Save branch messages
        for (const message of branchMessages) {
          await databasePersistence.saveMessage({
            id: message.id,
            chat_id: chatId,
            branch_id: branchId,
            content: message.content,
            role: message.role,
            timestamp: message.timestamp,
            is_edited: message.isEdited || false,
            metadata: message.metadata || {},
          });
        }
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  branches: [...chat.branches, newBranch],
                  updatedAt: now,
                }
              : chat
          ),
          currentBranchId: branchId,
        }));
        
        return branchId;
      } catch (error) {
        console.error('Failed to create branch:', error);
        throw error;
      }
    },
    
    deleteBranch: async (chatId, branchId) => {
      try {
        // Delete from database
        await databasePersistence.deleteBranch(branchId);
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  branches: chat.branches.filter(branch => branch.id !== branchId),
                  updatedAt: getCurrentTimestamp(),
                }
              : chat
          ),
          currentBranchId: state.currentBranchId === branchId ? null : state.currentBranchId,
        }));
      } catch (error) {
        console.error('Failed to delete branch:', error);
        throw error;
      }
    },
    
    switchBranch: (_chatId, branchId) => {
      set({ currentBranchId: branchId });
    },
    
    setCurrentBranch: (branchId) => {
      set({ currentBranchId: branchId });
    },
    
    updateBranchTitle: async (chatId, branchId, title) => {
      try {
        // Update database
        await databasePersistence.updateBranch(branchId, { title });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  branches: chat.branches.map(branch =>
                    branch.id === branchId
                      ? { ...branch, title }
                      : branch
                  ),
                  updatedAt: getCurrentTimestamp(),
                }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to update branch title:', error);
        throw error;
      }
    },
    
    // Streaming management actions
    setStreamingMessage: (messageId) => {
      set({ streamingMessageId: messageId });
    },
    
    setIsStreaming: (isStreaming) => {
      set({ isStreaming });
    },
    
    updateStreamingContent: (chatId, messageId, content) => {
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === messageId
                    ? { ...msg, content }
                    : msg
                ),
                branches: chat.branches.map(branch => ({
                  ...branch,
                  messages: branch.messages.map(msg =>
                    msg.id === messageId
                      ? { ...msg, content }
                      : msg
                  ),
                })),
              }
            : chat
        ),
      }));
    },
    
    // Utility actions
    getChatById: (chatId) => {
      return get().chats.find(chat => chat.id === chatId);
    },
    
    getMessageById: (chatId, messageId) => {
      const chat = get().getChatById(chatId);
      if (!chat) return undefined;
      
      const { currentBranchId } = get();
      
      if (currentBranchId) {
        const branch = chat.branches.find(b => b.id === currentBranchId);
        return branch?.messages.find(msg => msg.id === messageId);
      }
      
      return chat.messages.find(msg => msg.id === messageId);
    },
    
    getBranchById: (chatId, branchId) => {
      const chat = get().getChatById(chatId);
      return chat?.branches.find(branch => branch.id === branchId);
    },
    
    getCurrentMessages: () => {
      const { currentChatId, currentBranchId } = get();
      if (!currentChatId) return [];
      
      const chat = get().getChatById(currentChatId);
      if (!chat) return [];
      
      if (currentBranchId) {
        const branch = chat.branches.find(b => b.id === currentBranchId);
        return branch?.messages || [];
      }
      
      return chat.messages;
    },
    
    clearAllChats: async () => {
      try {
        // Clear database
        await databasePersistence.clearAllData();
        
        // Clear store
        set({
          chats: [],
          currentChatId: null,
          currentBranchId: null,
          streamingMessageId: null,
          isStreaming: false,
        });
      } catch (error) {
        console.error('Failed to clear all chats:', error);
        throw error;
      }
    },
    
    // Export/Import functionality
    exportData: async () => {
      try {
        return await databasePersistence.exportData();
      } catch (error) {
        console.error('Failed to export data:', error);
        throw error;
      }
    },
    
    importData: async (data) => {
      try {
        await databasePersistence.importData(data);
        await get().loadChats();
      } catch (error) {
        console.error('Failed to import data:', error);
        throw error;
      }
    },
    
    // Message versioning actions
    revertMessageVersion: async (chatId, messageId, versionId) => {
      const { chats } = get();
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;
      
      const updateMessage = (msg: Message) => {
        if (msg.id !== messageId) return msg;
        
        const version = msg.versions?.find(v => v.id === versionId);
        if (!version) return msg;
        
        // Create new version with current content
        const newVersion: MessageVersion = {
          id: generateId(),
          content: msg.content,
          timestamp: msg.editedAt || msg.timestamp,
          editReason: 'Manual revert',
        };
        
        return {
          ...msg,
          content: version.content,
          isEdited: true,
          editedAt: getCurrentTimestamp(),
          versions: [...(msg.versions || []), newVersion],
        };
      };
      
      try {
        const message = get().getMessageById(chatId, messageId);
        if (!message) return;
        
        const version = message.versions?.find(v => v.id === versionId);
        if (!version) return;
        
        // Update database
        await databasePersistence.updateMessage(messageId, {
          content: version.content,
          is_edited: true,
          edited_at: getCurrentTimestamp(),
        });
        
        // Update store
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map(updateMessage),
                  branches: chat.branches.map(branch => ({
                    ...branch,
                    messages: branch.messages.map(updateMessage),
                  })),
                  updatedAt: getCurrentTimestamp(),
                }
              : chat
          ),
        }));
      } catch (error) {
        console.error('Failed to revert message version:', error);
        throw error;
      }
    },
    
    getMessageVersions: (chatId, messageId) => {
      const message = get().getMessageById(chatId, messageId);
      return message?.versions || [];
    },
    
    getAllChats: () => {
      return get().chats;
    },
  }), {
    name: 'chat-store',
    version: 1,
    skipPersistenceFields: ['streamingMessageId', 'isStreaming', 'isLoading'],
    onRehydrateStorage: (state) => {
      console.log('Chat store rehydrated');
      state.isHydrated = true;
    },
    onError: (error) => {
      console.error('Chat store persistence error:', error);
    },
  })
);