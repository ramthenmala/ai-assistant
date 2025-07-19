import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageList } from './MessageList';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { ChatInput } from './ChatInput';
import { EditableTitle } from './EditableTitle';
import { useChatStore } from '@/stores/useChatStore';
import { useModelStore } from '@/stores/useModelStore';
import { modelManager, createChatContext, createSendMessageOptions } from '@/services/ModelManager';
import { MessageService } from '@/services/MessageService';
import { useToastActions } from '@/components/ui/toast';
import { Calendar, MoreHorizontal, MessageSquare } from 'lucide-react';
import type { Message } from '@/types';
import { usePerformanceMonitor, throttle, rafThrottle, debounce } from '@/utils/performance';

// Props interface for ChatWindow component
interface ChatWindowProps {
  chatId?: string;
  modelId?: string;
  onSendMessage?: (content: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onBranchMessage?: (messageId: string) => void;
  onRegenerateResponse?: (messageId: string) => void;
  onOpenPromptLibrary?: () => void;
  className?: string;
  virtualizeThreshold?: number;
}

// Enhanced custom equality function for memo optimization with function identity stability
// This optimized version uses a more efficient comparison strategy with early exits
const arePropsEqual = (prevProps: ChatWindowProps, nextProps: ChatWindowProps) => {
  // Fast path: Use Object.is for identity comparison of primitive props
  // This is faster than individual comparisons for the common case where props haven't changed
  if (
    prevProps === nextProps || 
    (prevProps.chatId === nextProps.chatId &&
     prevProps.modelId === nextProps.modelId &&
     prevProps.className === nextProps.className &&
     prevProps.virtualizeThreshold === nextProps.virtualizeThreshold)
  ) {
    // Most common case: primitive props are identical, now check function props
    const functionProps: (keyof ChatWindowProps)[] = [
      'onSendMessage', 
      'onEditMessage', 
      'onBranchMessage', 
      'onRegenerateResponse', 
      'onOpenPromptLibrary'
    ];
    
    // For function props, we only care if they changed from defined to undefined or vice versa
    // This is a performance optimization that assumes parent components use useCallback
    for (const prop of functionProps) {
      const prevFn = prevProps[prop];
      const nextFn = nextProps[prop];
      
      // Check if one is defined and the other isn't (existence check only)
      if (!!prevFn !== !!nextFn) {
        return false;
      }
    }
    
    return true;
  }
  
  // Slow path: If primitive props are different, components need to re-render
  return false;
};

export const ChatWindow = memo(function ChatWindow({
  chatId,
  modelId,
  onSendMessage,
  onEditMessage,
  onBranchMessage,
  onRegenerateResponse,
  onOpenPromptLibrary,
  className,
  virtualizeThreshold = 50
}: ChatWindowProps) {
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor('ChatWindow');
  
  // Component state management for message list and input
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | undefined>();
  
  // Use refs to track previous values for comparison
  const prevChatIdRef = useRef<string | undefined>(chatId);
  const messagesLengthRef = useRef<number>(0);
  
  // Performance optimization: Debounced message updates for streaming
  const debouncedSetMessages = useMemo(
    () => debounce((newMessages: Message[]) => {
      setMessages(newMessages);
    }, 16), // ~60fps for smooth streaming
    []
  );
  
  // Throttled scroll position tracking for better performance
  const throttledScrollHandler = useMemo(
    () => throttle((scrollTop: number, scrollHeight: number, clientHeight: number) => {
      // This can be used for scroll position tracking if needed
      // Currently handled by individual message list components
    }, 16), // ~60fps
    []
  );
  
  // Get chat store actions and state - optimized selector to prevent unnecessary re-renders
  // Using stable references with useCallback to prevent selector recreation
  const {
    addMessage,
    setIsStreaming,
    isStreaming,
    currentChatId,
    createChat,
    getCurrentMessages,
    getChatById,
    updateChatTitle,
    updateStreamingContent,
    setStreamingMessage,
    editMessage,
    updateMessage,
    revertMessageVersion
  } = useChatStore(
    useCallback(state => ({
      addMessage: state.addMessage,
      setIsStreaming: state.setIsStreaming,
      isStreaming: state.isStreaming,
      currentChatId: state.currentChatId,
      createChat: state.createChat,
      getCurrentMessages: state.getCurrentMessages,
      getChatById: state.getChatById,
      updateChatTitle: state.updateChatTitle,
      updateStreamingContent: state.updateStreamingContent,
      setStreamingMessage: state.setStreamingMessage,
      editMessage: state.editMessage,
      updateMessage: state.updateMessage,
      revertMessageVersion: state.revertMessageVersion
    }), [])
  );

  // Get model store state
  const { getDefaultModel } = useModelStore(
    useCallback(state => ({
      getDefaultModel: state.getDefaultModel
    }), [])
  );

  // Toast notifications for user feedback
  const { success, error } = useToastActions();
  
  // Use the provided chatId or the current chat from the store
  const activeChatId = useMemo(() => chatId || currentChatId, [chatId, currentChatId]);
  
  // Get the active chat data - memoized to prevent unnecessary lookups
  const activeChat = useMemo(() => 
    activeChatId ? getChatById?.(activeChatId) : null, 
    [activeChatId, getChatById]
  );
  
  // Update local messages when store messages change - optimized with refs for change detection
  // This enhanced version uses more efficient update strategies and better memoization
  useEffect(() => {
    performanceMonitor.start();
    
    if (activeChatId) {
      const storeMessages = getCurrentMessages();
      
      // Fast path: If no messages in store, clear local messages
      if (storeMessages.length === 0) {
        if (messages.length > 0) {
          setMessages([]);
          messagesLengthRef.current = 0;
          prevChatIdRef.current = activeChatId;
        }
        return;
      }
      
      // Check if chat ID changed - if so, we need to update messages
      const chatIdChanged = prevChatIdRef.current !== activeChatId;
      
      // Check if message count changed - quick way to detect changes
      const messageCountChanged = storeMessages.length !== messagesLengthRef.current;
      
      // If chat ID changed, always do a full update
      if (chatIdChanged) {
        setMessages(storeMessages);
        messagesLengthRef.current = storeMessages.length;
        prevChatIdRef.current = activeChatId;
        performanceMonitor.end();
        return;
      }
      
      // If message count changed (new message added or removed)
      if (messageCountChanged) {
        // Optimize for the common case: a new message was added at the end
        if (storeMessages.length === messagesLengthRef.current + 1) {
          // Check if all previous messages are unchanged
          let previousMessagesUnchanged = true;
          const currentMessages = messages;
          
          // Fast check: verify first and last message IDs match
          if (currentMessages.length > 0 && 
              storeMessages.length > 1 && 
              currentMessages[0].id === storeMessages[0].id &&
              currentMessages[currentMessages.length - 1].id === storeMessages[storeMessages.length - 2].id) {
            
            // Just append the new message instead of replacing the entire array
            // This is much more efficient for large message lists
            const newMessage = storeMessages[storeMessages.length - 1];
            const updatedMessages = [...currentMessages, newMessage];
            
            // Use immediate update for new messages, not debounced
            setMessages(updatedMessages);
            messagesLengthRef.current = storeMessages.length;
            performanceMonitor.end();
            return;
          }
        }
        
        // For other message count changes, use debounced updates during streaming
        // to prevent too many re-renders during rapid token updates
        if (streamingMessageId) {
          debouncedSetMessages(storeMessages);
        } else {
          setMessages(storeMessages);
        }
        
        messagesLengthRef.current = storeMessages.length;
        performanceMonitor.end();
        return;
      }
      
      // At this point, we know the message count is the same
      // Now we need to check for content changes in existing messages
      
      // Skip further checks if we have no messages
      if (messages.length === 0) {
        performanceMonitor.end();
        return;
      }
      
      // Optimize for streaming updates - the most common case during AI responses
      // Only check the last message for streaming updates to avoid expensive comparisons
      const lastStoreMessage = storeMessages[storeMessages.length - 1];
      const currentMessages = messages;
      const lastCurrentMessage = currentMessages[currentMessages.length - 1];
      
      // Check if streaming message has changed
      const isStreamingMessage = streamingMessageId === lastStoreMessage.id;
      
      // Check if last message content changed or if it's a streaming message
      const lastMessageChanged = 
        lastStoreMessage.content !== lastCurrentMessage.content || 
        lastStoreMessage.isEdited !== lastCurrentMessage.isEdited;
      
      if (lastMessageChanged || isStreamingMessage) {
        // For streaming messages, optimize by only updating the changed message
        // instead of replacing the entire array
        if (isStreamingMessage && currentMessages.length === storeMessages.length) {
          // Create a new array with the updated streaming message
          // Use Object.assign for better performance than spread operator
          const updatedMessages = currentMessages.slice();
          updatedMessages[updatedMessages.length - 1] = lastStoreMessage;
          
          // Use RAF-based debouncing for streaming updates to reduce render pressure
          // This significantly improves performance during rapid token streaming
          if (window.requestAnimationFrame) {
            cancelAnimationFrame(window.__chatWindowRAFId);
            window.__chatWindowRAFId = requestAnimationFrame(() => {
              setMessages(updatedMessages);
            });
          } else {
            // Fallback for environments without RAF
            setMessages(updatedMessages);
          }
        } else {
          // For non-streaming changes, we need to check if other messages changed
          // Use a more efficient sampling approach to minimize comparisons
          
          // Only check a sample of messages for changes to avoid expensive full comparison
          // Focus on the first few and last few messages which are most likely to be edited
          const samplesToCheck = Math.min(3, Math.floor(storeMessages.length / 4));
          
          // Use a single-pass algorithm to check both first and last messages
          let otherMessagesChanged = false;
          
          // Check first few and last few messages in a single loop
          for (let i = 0; i < samplesToCheck; i++) {
            // Check message from the beginning
            if (storeMessages[i].content !== currentMessages[i].content ||
                storeMessages[i].isEdited !== currentMessages[i].isEdited) {
              otherMessagesChanged = true;
              break;
            }
            
            // Check message from the end (excluding the very last one we already checked)
            const endIndex = storeMessages.length - 2 - i;
            if (endIndex > samplesToCheck && // Avoid checking the same message twice
                storeMessages[endIndex].content !== currentMessages[endIndex].content ||
                storeMessages[endIndex].isEdited !== currentMessages[endIndex].isEdited) {
              otherMessagesChanged = true;
              break;
            }
          }
          
          // If other messages changed, update the entire array
          if (otherMessagesChanged) {
            setMessages(storeMessages);
          } else {
            // Otherwise, just update the last message for better performance
            const updatedMessages = currentMessages.slice();
            updatedMessages[updatedMessages.length - 1] = lastStoreMessage;
            setMessages(updatedMessages);
          }
        }
      }
      // If no messages changed, do nothing to avoid unnecessary re-renders
    }
    
    performanceMonitor.end();
  }, [activeChatId, getCurrentMessages, messages, streamingMessageId, performanceMonitor, debouncedSetMessages]);
  
  // Handle sending a new message - memoized to prevent unnecessary re-renders
  const handleSendMessage = useCallback(async (content: string) => {
    // Create a chat if none exists
    let targetChatId = activeChatId;
    if (!targetChatId) {
      targetChatId = createChat();
    }
    
    // Add user message to the store
    addMessage(targetChatId, {
      content,
      role: 'user',
      isEdited: false
    });
    
    // Add assistant message placeholder to the store
    const assistantMessageId = addMessage(targetChatId, {
      content: '',
      role: 'assistant',
      isEdited: false,
      metadata: { isLoading: true }
    });
    
    // Set streaming state and streaming message ID
    setIsStreaming(true);
    setStreamingMessage(assistantMessageId);
    
    // Call the parent handler if provided
    if (onSendMessage) {
      onSendMessage(content);
    }
    
    try {
      // Get the default model for the chat
      const defaultModel = getDefaultModel();
      if (!defaultModel) {
        throw new Error('No default model available');
      }
      
      // Get current messages for context
      const currentMessages = getCurrentMessages();
      
      // Create chat context
      const chatContext = createChatContext(
        targetChatId,
        currentMessages,
        defaultModel
      );
      
      // Create send message options with streaming handlers
      const sendOptions = createSendMessageOptions({
        stream: true,
        onStreamUpdate: (messageId: string, streamContent: string) => {
          // Update the streaming content in the store
          updateStreamingContent(targetChatId, assistantMessageId, streamContent);
        },
        onComplete: (messageId: string, response: any) => {
          // Mark streaming as complete
          setIsStreaming(false);
          setStreamingMessage(null);
          
          // Update the message with final content
          updateStreamingContent(targetChatId, assistantMessageId, response.content);
        },
        onError: (messageId: string, error: Error) => {
          // Handle error
          setIsStreaming(false);
          setStreamingMessage(null);
          
          // Update message with error content
          updateStreamingContent(
            targetChatId, 
            assistantMessageId, 
            `Error: ${error.message}`
          );
          
          console.error('AI response error:', error);
        }
      });
      
      // Send message through model manager
      await modelManager.sendMessage(chatContext, content, sendOptions);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update message with error content
      updateStreamingContent(
        targetChatId, 
        assistantMessageId, 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      // Reset streaming state
      setIsStreaming(false);
      setStreamingMessage(null);
    }
  }, [
    activeChatId, 
    addMessage, 
    createChat, 
    onSendMessage, 
    setIsStreaming, 
    setStreamingMessage,
    updateStreamingContent,
    getDefaultModel,
    getCurrentMessages
  ]);

  // Handle message editing - memoized to prevent unnecessary re-renders
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    if (!activeChatId) return;
    
    // Use the chat store's edit message function which handles versioning
    editMessage(activeChatId, messageId, content);
    
    // Call parent handler if provided
    if (onEditMessage) {
      onEditMessage(messageId, content);
    }
  }, [activeChatId, editMessage, onEditMessage]);

  // Handle message version revert
  const handleRevertMessageVersion = useCallback((messageId: string, versionId: string) => {
    if (!activeChatId) return;
    
    // Use the chat store's revert message version function
    revertMessageVersion(activeChatId, messageId, versionId);
  }, [activeChatId, revertMessageVersion]);

  // Handle view message history
  const handleViewHistory = useCallback((messageId: string) => {
    // TODO: Implement message history modal
    console.log('View history for message:', messageId);
  }, []);

  // Handle copying message content
  const handleCopyMessage = useCallback(async (messageId: string) => {
    const currentMessages = getCurrentMessages();
    const message = currentMessages.find(msg => msg.id === messageId);
    
    if (!message) return;
    
    const result = await MessageService.copyMessage(message);
    if (result.success) {
      success(result.message || 'Message copied to clipboard');
    } else {
      error(result.error || 'Failed to copy message');
    }
  }, [getCurrentMessages, success, error]);

  // Handle toggling message bookmark
  const handleToggleBookmark = useCallback(async (messageId: string) => {
    if (!activeChatId) return;
    
    const currentMessages = getCurrentMessages();
    const message = currentMessages.find(msg => msg.id === messageId);
    
    if (!message) return;
    
    const result = await MessageService.toggleBookmark(message, (id, updates) => {
      // Update the message in the store
      updateMessage(activeChatId, id, updates);
    });
    
    if (result.success) {
      success(result.message || 'Bookmark updated');
    } else {
      error(result.error || 'Failed to update bookmark');
    }
  }, [activeChatId, getCurrentMessages, updateMessage, success, error]);

  // Handle message regeneration
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    if (!activeChatId) return;
    
    const currentMessages = getCurrentMessages();
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;
    
    // Get the user message that prompted this response
    const userMessage = currentMessages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;
    
    try {
      // Get the default model for the chat
      const defaultModel = getDefaultModel();
      if (!defaultModel) {
        throw new Error('No default model available');
      }
      
      // Create context with messages up to the user message
      const contextMessages = currentMessages.slice(0, messageIndex);
      const chatContext = createChatContext(
        activeChatId,
        contextMessages,
        defaultModel
      );
      
      // Set streaming state
      setIsStreaming(true);
      setStreamingMessage(messageId);
      
      // Clear the message content
      updateStreamingContent(activeChatId, messageId, '');
      
      // Create send message options with streaming handlers
      const sendOptions = createSendMessageOptions({
        stream: true,
        onStreamUpdate: (_, streamContent: string) => {
          updateStreamingContent(activeChatId, messageId, streamContent);
        },
        onComplete: (_, response: any) => {
          setIsStreaming(false);
          setStreamingMessage(null);
          updateStreamingContent(activeChatId, messageId, response.content);
        },
        onError: (_, error: Error) => {
          setIsStreaming(false);
          setStreamingMessage(null);
          updateStreamingContent(activeChatId, messageId, `Error: ${error.message}`);
          console.error('Regeneration error:', error);
        }
      });
      
      // Regenerate message through model manager
      await modelManager.sendMessage(chatContext, userMessage.content, sendOptions);
      
    } catch (error) {
      console.error('Failed to regenerate message:', error);
      
      // Update message with error content
      updateStreamingContent(
        activeChatId, 
        messageId, 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      // Reset streaming state
      setIsStreaming(false);
      setStreamingMessage(null);
    }
    
    // Call parent handler if provided
    if (onRegenerateResponse) {
      onRegenerateResponse(messageId);
    }
  }, [
    activeChatId, 
    getCurrentMessages, 
    getDefaultModel, 
    setIsStreaming, 
    setStreamingMessage,
    updateStreamingContent,
    onRegenerateResponse
  ]);

  // Format date for display - memoized to prevent unnecessary recalculations
  const formatDate = useCallback((date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, []);
  
  // Advanced virtualization decision based on message count, content size, and rendering complexity
  // This optimized version uses memoization, early exits, and efficient content analysis
  const shouldUseVirtualization = useMemo(() => {
    // Cache key metrics for performance analysis
    const messageCount = messages.length;
    const userDefinedThreshold = virtualizeThreshold || 50;
    
    // Fast path: Always use virtualization if message count exceeds user-defined threshold
    if (messageCount > userDefinedThreshold) {
      return true;
    }
    
    // Fast path: Small conversations don't need virtualization
    if (messageCount < 10) {
      return false;
    }
    
    // Use a cached decision for better performance when message count doesn't change significantly
    // This prevents recalculating on every render
    const lastDecisionRef = useRef<{count: number, decision: boolean}>({count: 0, decision: false});
    if (Math.abs(lastDecisionRef.current.count - messageCount) < 5) {
      return lastDecisionRef.current.decision;
    }
    
    // Check for device capabilities and adjust thresholds accordingly
    // We cache this value to avoid recalculating on every render
    const devicePerformanceInfo = useMemo(() => {
      // Use a more comprehensive device performance detection
      const isLikelyMobile = window.innerWidth < 768;
      
      // Check for low-end device indicators
      const isLowPerformanceDevice = (() => {
        // Cache the result to avoid recalculating
        if (typeof window.__isLowPerformanceDevice !== 'undefined') {
          return window.__isLowPerformanceDevice;
        }
        
        // More comprehensive device performance detection
        const result = 
          (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || // Low CPU cores
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || // Mobile device
          (window.performance && window.performance.memory && 
           (window.performance.memory as any).jsHeapSizeLimit < 2147483648); // < 2GB memory limit
        
        // @ts-ignore - Add to window for caching
        window.__isLowPerformanceDevice = result;
        return result;
      })();
      
      // Calculate adaptive thresholds based on device capabilities
      const baseThreshold = isLikelyMobile ? 15 : 25;
      const finalThreshold = isLowPerformanceDevice ? baseThreshold * 0.7 : baseThreshold;
      
      return {
        isLowPerformanceDevice,
        isLikelyMobile,
        adaptiveThreshold: finalThreshold
      };
    }, []);
    
    // Fast path: Use virtualization for low-performance devices with moderate message count
    if (devicePerformanceInfo.isLowPerformanceDevice && messageCount > 15) {
      lastDecisionRef.current = {count: messageCount, decision: true};
      return true;
    }
    
    // Optimized content analysis using sampling and early exits
    // We analyze a subset of messages to determine complexity
    
    // Initialize counters for complexity metrics
    let totalContentSize = 0;
    let codeBlockCount = 0;
    let largeMessageCount = 0;
    let markdownComplexity = 0;
    let sampledMessages = 0;
    
    const largeMessageThreshold = 500; // characters
    
    // Always check the most recent messages as they're most visible and important
    const recentMessagesToCheck = Math.min(5, messageCount);
    const recentMessages = messages.slice(-recentMessagesToCheck);
    
    // Check recent messages first (they're most visible and important)
    for (const message of recentMessages) {
      const content = message.content;
      const contentLength = content.length;
      
      totalContentSize += contentLength;
      sampledMessages++;
      
      // Count large messages - early exit optimization
      if (contentLength > largeMessageThreshold) {
        largeMessageCount++;
        
        // Early exit: If we have large recent messages, use virtualization
        if (largeMessageCount >= 2 && messageCount > 15) {
          lastDecisionRef.current = {count: messageCount, decision: true};
          return true;
        }
      }
      
      // Detect code blocks - use indexOf instead of includes for better performance
      if (content.indexOf('```') !== -1) {
        codeBlockCount++;
        
        // Code blocks are render-intensive, so lower the threshold
        if (codeBlockCount >= 2 && messageCount > 12) {
          lastDecisionRef.current = {count: messageCount, decision: true};
          return true;
        }
      }
      
      // Ultra-optimized markdown complexity check - avoid regex and minimize string operations
      // We use a single-pass algorithm to check for multiple patterns at once
      let complexityScore = 0;
      let newlineCount = 0;
      
      // Scan the content once for multiple patterns
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        // Check for newlines
        if (char === '\n') {
          newlineCount++;
          
          // Early exit for messages with many line breaks
          if (newlineCount > 15 && messageCount > 15) {
            lastDecisionRef.current = {count: messageCount, decision: true};
            return true;
          }
        }
        
        // Check for markdown patterns
        if (char === '!') {
          // Potential image - check next char
          if (i + 1 < content.length && content[i + 1] === '[') {
            complexityScore += 5; // Images are render-intensive
          }
        } else if (char === '|') {
          complexityScore += 1; // Tables are render-intensive
        } else if (char === '#') {
          complexityScore += 1; // Headings affect layout
        } else if (char === '*' || char === '_') {
          complexityScore += 0.5; // Formatting
        }
        
        // Early exit if complexity is already high
        if (complexityScore > 15 && messageCount > 15) {
          lastDecisionRef.current = {count: messageCount, decision: true};
          return true;
        }
      }
      
      // Add complexity for many line breaks
      if (newlineCount > 10) complexityScore += 5;
      
      markdownComplexity += complexityScore;
    }
    
    // If we haven't exited early, sample older messages at regular intervals
    // Use an optimized sampling approach to minimize processing
    const sampleSize = Math.min(8, Math.ceil(messageCount / 8));
    const sampleStep = Math.max(1, Math.floor((messageCount - recentMessagesToCheck) / sampleSize));
    
    // Sample older messages efficiently
    for (let i = 0; i < messageCount - recentMessagesToCheck; i += sampleStep) {
      const message = messages[i];
      if (!message) continue; // Skip if message is undefined
      
      const content = message.content;
      const contentLength = content.length;
      
      totalContentSize += contentLength;
      sampledMessages++;
      
      // Quick checks for complexity indicators
      if (contentLength > largeMessageThreshold) {
        largeMessageCount++;
      }
      
      if (content.indexOf('```') !== -1) {
        codeBlockCount++;
      }
      
      // Quick check for complex markdown using a single indexOf call with common patterns
      const hasComplexMarkdown = 
        content.indexOf('![') !== -1 || 
        content.indexOf('|') !== -1 || 
        content.indexOf('##') !== -1 ||
        content.indexOf('\n\n\n') !== -1;
        
      if (hasComplexMarkdown) {
        markdownComplexity += 5;
      }
      
      // Early exit if we've already found enough complexity indicators
      if ((codeBlockCount >= 3 || largeMessageCount >= 3 || markdownComplexity > 20) && messageCount > 20) {
        lastDecisionRef.current = {count: messageCount, decision: true};
        return true;
      }
    }
    
    // Calculate average message size from sampled messages
    const averageMessageSize = sampledMessages > 0 ? totalContentSize / sampledMessages : 0;
    
    // Enhanced heuristic approach using multiple weighted factors
    // This formula has been tuned based on performance testing
    const complexityScore = 
      (averageMessageSize / 100) + // Size factor
      (codeBlockCount * 5) + // Code block factor (high weight)
      (largeMessageCount * 3) + // Large message factor
      (markdownComplexity / 5) + // Markdown complexity factor
      (messageCount / 5); // Message count factor
    
    // Use the adaptive threshold from our device performance info
    const decision = complexityScore > devicePerformanceInfo.adaptiveThreshold;
    
    // Cache the decision for future renders
    lastDecisionRef.current = {count: messageCount, decision};
    return decision;
  }, [messages, virtualizeThreshold]);

  // Memoize the header content to prevent unnecessary re-renders
  const headerContent = useMemo(() => (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* Model indicator if provided */}
          {modelId && (
            <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md">
              <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
              <span className="font-medium text-sm">{modelId}</span>
            </div>
          )}
          
          {/* Editable Chat title */}
          {activeChatId ? (
            <EditableTitle
              initialTitle={activeChat?.title || 'New Chat'}
              onSave={(newTitle) => {
                if (activeChatId) {
                  updateChatTitle(activeChatId, newTitle);
                }
              }}
              placeholder="Chat title"
            />
          ) : (
            <h2 className="font-semibold text-lg truncate">
              New Chat
            </h2>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Chat metadata */}
          {activeChat?.createdAt && (
            <div className="hidden sm:flex items-center text-xs text-muted-foreground gap-1 bg-muted/30 px-2 py-1 rounded-md">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(activeChat.createdAt)}</span>
            </div>
          )}
          
          {/* Message count */}
          {messages.length > 0 && (
            <div className="hidden sm:flex items-center text-xs text-muted-foreground gap-1 bg-muted/30 px-2 py-1 rounded-md">
              <MessageSquare className="h-3 w-3" />
              <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {/* More options button */}
          <button 
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  ), [activeChatId, activeChat?.createdAt, activeChat?.title, formatDate, messages.length, modelId, updateChatTitle]);

  // Empty state component - memoized to prevent unnecessary re-renders
  const emptyStateComponent = useMemo(() => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-muted-foreground space-y-2">
        <div className="text-4xl mb-4">💬</div>
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm">Start a conversation by typing a message below</p>
      </div>
    </div>
  ), []);

  // Memoize the virtualized message list component to prevent unnecessary re-renders
  // Enhanced with better dependency tracking and performance optimizations
  const virtualizedMessageListComponent = useMemo(() => {
    // Performance monitoring for component creation
    performanceMonitor.start();
    
    const component = (
      <VirtualizedMessageList
        messages={messages}
        onEditMessage={handleEditMessage}
        onBranchMessage={onBranchMessage}
        onRegenerateResponse={handleRegenerateMessage}
        onRevertVersion={handleRevertMessageVersion}
        onViewHistory={handleViewHistory}
        onCopyMessage={handleCopyMessage}
        onToggleBookmark={handleToggleBookmark}
        streamingMessageId={streamingMessageId}
        autoScroll={true}
        showTimestamps={true}
        className="h-full"
        overscan={25} // Increased overscan for smoother scrolling on high-performance devices
      />
    );
    
    performanceMonitor.end();
    return component;
  }, [
    // Use object reference equality for messages array to prevent unnecessary re-renders
    // This works because we're careful about creating new arrays only when needed
    messages, 
    // Function props - rely on parent component using useCallback
    handleEditMessage, 
    onBranchMessage, 
    handleRegenerateMessage, 
    handleRevertMessageVersion,
    handleViewHistory,
    handleCopyMessage,
    handleToggleBookmark,
    // Primitive values that might change frequently
    streamingMessageId,
    // Include performance monitor to ensure proper timing
    performanceMonitor
  ]);

  // Memoize the standard message list component to prevent unnecessary re-renders
  // Enhanced with better dependency tracking and performance optimizations
  const standardMessageListComponent = useMemo(() => {
    // Performance monitoring for component creation
    performanceMonitor.start();
    
    const component = (
      <MessageList
        messages={messages}
        onEditMessage={handleEditMessage}
        onBranchMessage={onBranchMessage}
        onRegenerateResponse={handleRegenerateMessage}
        onRevertVersion={handleRevertMessageVersion}
        onViewHistory={handleViewHistory}
        onCopyMessage={handleCopyMessage}
        onToggleBookmark={handleToggleBookmark}
        streamingMessageId={streamingMessageId}
        autoScroll={true}
        showTimestamps={true}
        className="h-full"
        // Add virtualizeThreshold to ensure consistent behavior with ChatWindow's decision
        virtualizeThreshold={virtualizeThreshold}
      />
    );
    
    performanceMonitor.end();
    return component;
  }, [
    // Same dependency array as virtualizedMessageListComponent for consistency
    messages, 
    handleEditMessage, 
    onBranchMessage, 
    handleRegenerateMessage, 
    handleRevertMessageVersion,
    handleViewHistory,
    handleCopyMessage,
    handleToggleBookmark,
    streamingMessageId,
    // Add virtualizeThreshold to ensure proper updates when this prop changes
    virtualizeThreshold,
    performanceMonitor
  ]);

  // Determine which message list component to render based on conditions
  // This enhanced version includes performance monitoring and better dependency tracking
  const messageListComponent = useMemo(() => {
    performanceMonitor.start('messageListComponentSelection');
    
    let result;
    if (messages.length === 0) {
      result = emptyStateComponent;
    } else {
      // Use virtualization based on the calculated decision
      result = shouldUseVirtualization ? virtualizedMessageListComponent : standardMessageListComponent;
      
      // Log virtualization decision for performance analysis
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          `ChatWindow: Using ${shouldUseVirtualization ? 'virtualized' : 'standard'} message list for ${messages.length} messages`
        );
      }
    }
    
    performanceMonitor.end('messageListComponentSelection');
    return result;
  }, [
    messages.length, 
    shouldUseVirtualization, 
    emptyStateComponent, 
    virtualizedMessageListComponent, 
    standardMessageListComponent,
    performanceMonitor
  ]);

  // Memoize the footer component to prevent unnecessary re-renders
  const footerComponent = useMemo(() => (
    <footer className="p-4 border-t bg-background">
      <ChatInput
        chatId={activeChatId || undefined}
        onSendMessage={handleSendMessage}
        onOpenPromptLibrary={onOpenPromptLibrary}
        isDisabled={false}
        isLoading={isStreaming}
        autoFocus
      />
    </footer>
  ), [activeChatId, handleSendMessage, isStreaming, onOpenPromptLibrary]);

  // Final render with performance optimizations
  // This enhanced version includes performance monitoring and better animation handling
  return (
    <motion.div
      className={cn(
        "grid grid-rows-[auto_1fr_auto] h-full",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.3,
        // Use more efficient animation settings for better performance
        ease: [0.25, 0.1, 0.25, 1.0], // Optimized cubic-bezier curve
        // Disable GPU acceleration only for this animation to prevent memory issues
        // with large message lists
        transitionEnd: {
          willChange: 'auto'
        }
      }}
      role="region"
      aria-label="Chat window"
      // Add data attributes for performance monitoring
      data-message-count={messages.length}
      data-virtualized={shouldUseVirtualization ? 'true' : 'false'}
    >
      {headerContent}
      
      {/* Message list - main content area */}
      <main className="overflow-hidden">
        {messageListComponent}
      </main>
      
      {footerComponent}
    </motion.div>
  );
}, arePropsEqual);

ChatWindow.displayName = 'ChatWindow';