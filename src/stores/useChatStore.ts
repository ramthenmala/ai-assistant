// Chat store for managing conversations, messages, and branches
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Chat, Message, Branch, MessageVersion } from '../types';
import { generateId, getCurrentTimestamp } from '../utils';

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  currentBranchId: string | null;
  streamingMessageId: string | null;
  isStreaming: boolean;
}

interface ChatActions {
  // Chat management
  createChat: (title?: string) => string;
  deleteChat: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  setCurrentChat: (chatId: string | null) => void;
  
  // Message management
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => string;
  editMessage: (chatId: string, messageId: string, content: string, editReason?: string) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  regenerateMessage: (chatId: string, messageId: string) => void;
  revertMessageVersion: (chatId: string, messageId: string, versionId: string) => void;
  getMessageVersions: (chatId: string, messageId: string) => MessageVersion[];
  
  // Branch management
  createBranch: (chatId: string, fromMessageId: string, title?: string) => string;
  deleteBranch: (chatId: string, branchId: string) => void;
  switchBranch: (chatId: string, branchId: string) => void;
  setCurrentBranch: (branchId: string | null) => void;
  updateBranchTitle: (chatId: string, branchId: string, title: string) => void;
  
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
  clearAllChats: () => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  subscribeWithSelector((set, get) => ({
    // State
    chats: [],
    currentChatId: null,
    currentBranchId: null,
    streamingMessageId: null,
    isStreaming: false,
    
    // Chat management actions
    createChat: (title = 'New Chat') => {
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
      
      set((state) => ({
        chats: [...state.chats, newChat],
        currentChatId: chatId,
        currentBranchId: null,
      }));
      
      return chatId;
    },
    
    deleteChat: (chatId) => {
      set((state) => ({
        chats: state.chats.filter(chat => chat.id !== chatId),
        currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        currentBranchId: state.currentChatId === chatId ? null : state.currentBranchId,
      }));
    },
    
    updateChatTitle: (chatId, title) => {
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? { ...chat, title, updatedAt: getCurrentTimestamp() }
            : chat
        ),
      }));
    },
    
    setCurrentChat: (chatId) => {
      set({ currentChatId: chatId, currentBranchId: null });
    },
    
    // Message management actions
    addMessage: (chatId, messageData) => {
      const messageId = generateId();
      const message: Message = {
        ...messageData,
        id: messageId,
        timestamp: getCurrentTimestamp(),
      };
      
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
                updatedAt: getCurrentTimestamp(),
              }
            : chat
        ),
      }));
      
      return messageId;
    },
    
    editMessage: (chatId, messageId, content, editReason) => {
      const now = getCurrentTimestamp();
      
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
    },

    updateMessage: (chatId, messageId, updates) => {
      const now = getCurrentTimestamp();
      
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
    },
    
    deleteMessage: (chatId, messageId) => {
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
    },
    
    regenerateMessage: (chatId, messageId) => {
      // This will be implemented when AI service is available
      // For now, just mark the message for regeneration
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
    },
    
    // Branch management actions
    createBranch: (chatId, fromMessageId, title) => {
      const branchId = generateId();
      const chat = get().getChatById(chatId);
      
      if (!chat) return branchId;
      
      // Find the message to branch from and get all messages up to that point
      const messageIndex = chat.messages.findIndex(msg => msg.id === fromMessageId);
      const branchMessages = messageIndex >= 0 ? chat.messages.slice(0, messageIndex + 1) : [];
      
      const newBranch: Branch = {
        id: branchId,
        parentMessageId: fromMessageId,
        messages: branchMessages,
        title: title || `Branch ${chat.branches.length + 1}`,
        createdAt: getCurrentTimestamp(),
      };
      
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                branches: [...chat.branches, newBranch],
                updatedAt: getCurrentTimestamp(),
              }
            : chat
        ),
        currentBranchId: branchId,
      }));
      
      return branchId;
    },
    
    deleteBranch: (chatId, branchId) => {
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
    },
    
    switchBranch: (chatId, branchId) => {
      set({ currentBranchId: branchId });
    },
    
    setCurrentBranch: (branchId) => {
      set({ currentBranchId: branchId });
    },
    
    updateBranchTitle: (chatId, branchId, title) => {
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
    
    clearAllChats: () => {
      set({
        chats: [],
        currentChatId: null,
        currentBranchId: null,
        streamingMessageId: null,
        isStreaming: false,
      });
    },
    
    // Message versioning actions
    revertMessageVersion: (chatId, messageId, versionId) => {
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
    },
    
    getMessageVersions: (chatId, messageId) => {
      const message = get().getMessageById(chatId, messageId);
      return message?.versions || [];
    },
  }))
);