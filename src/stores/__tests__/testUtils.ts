// Test utilities for store testing
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Chat, Message, Branch } from '../../types';
import { generateId, getCurrentTimestamp } from '../../utils';

// Create a non-persistent version of the chat store for testing
export const createTestChatStore = () => {
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
    editMessage: (chatId: string, messageId: string, content: string) => void;
    deleteMessage: (chatId: string, messageId: string) => void;
    regenerateMessage: (chatId: string, messageId: string) => void;
    
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
    clearAllChats: () => void;
  }

  return create<ChatState & ChatActions>()(
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
      
      editMessage: (chatId, messageId, content) => {
        set((state) => ({
          chats: state.chats.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === messageId
                      ? { ...msg, content, isEdited: true }
                      : msg
                  ),
                  branches: chat.branches.map(branch => ({
                    ...branch,
                    messages: branch.messages.map(msg =>
                      msg.id === messageId
                        ? { ...msg, content, isEdited: true }
                        : msg
                    ),
                  })),
                  updatedAt: getCurrentTimestamp(),
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
    }))
  );
};