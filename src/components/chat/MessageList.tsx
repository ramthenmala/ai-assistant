import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types';
import { ArrowDown } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  onEditMessage?: (id: string, content: string) => void;
  onBranchMessage?: (id: string) => void;
  onRegenerateResponse?: (id: string) => void;
  onRevertVersion?: (messageId: string, versionId: string) => void;
  onViewHistory?: (messageId: string) => void;
  onCopyMessage?: (id: string) => void;
  onToggleBookmark?: (id: string) => void;
  className?: string;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  streamingMessageId?: string;
  virtualizeThreshold?: number;
}

// Custom equality function for memo optimization with enhanced message comparison
const arePropsEqual = (prevProps: MessageListProps, nextProps: MessageListProps) => {
  // More thorough message comparison for better memoization
  // Check length, last message ID, and streaming message ID
  const messagesEqual = (() => {
    // Quick length check first
    if (prevProps.messages.length !== nextProps.messages.length) {
      return false;
    }
    
    // Empty arrays are equal
    if (prevProps.messages.length === 0) {
      return true;
    }
    
    // Check last message ID and content (most likely to change)
    const prevLastMsg = prevProps.messages[prevProps.messages.length - 1];
    const nextLastMsg = nextProps.messages[nextProps.messages.length - 1];
    
    if (prevLastMsg.id !== nextLastMsg.id || 
        prevLastMsg.content !== nextLastMsg.content ||
        prevLastMsg.isEdited !== nextLastMsg.isEdited) {
      return false;
    }
    
    // If streaming message ID is in the list, check its content too
    if (prevProps.streamingMessageId) {
      const prevStreamingMsg = prevProps.messages.find(m => m.id === prevProps.streamingMessageId);
      const nextStreamingMsg = nextProps.messages.find(m => m.id === prevProps.streamingMessageId);
      
      if (prevStreamingMsg && nextStreamingMsg && 
          prevStreamingMsg.content !== nextStreamingMsg.content) {
        return false;
      }
    }
    
    // For very large message lists, avoid checking every message
    // Instead, sample a few messages at different positions
    if (prevProps.messages.length > 20) {
      // Check first, middle, and a few random messages
      const checkIndices = [
        0, 
        Math.floor(prevProps.messages.length / 2),
        Math.floor(prevProps.messages.length / 4),
        Math.floor(prevProps.messages.length * 3 / 4)
      ];
      
      for (const idx of checkIndices) {
        const prevMsg = prevProps.messages[idx];
        const nextMsg = nextProps.messages[idx];
        
        if (prevMsg.id !== nextMsg.id || 
            prevMsg.content !== nextMsg.content ||
            prevMsg.isEdited !== nextMsg.isEdited) {
          return false;
        }
      }
      
      // If all sampled messages are the same, consider the arrays equal
      return true;
    }
    
    // For smaller lists, use a more efficient approach to check edited status
    // This is important because edits can happen to any message
    let editedMessageCountPrev = 0;
    let editedMessageCountNext = 0;
    
    // Count edited messages in a single pass
    for (let i = 0; i < prevProps.messages.length; i++) {
      if (prevProps.messages[i].isEdited) editedMessageCountPrev++;
      if (nextProps.messages[i].isEdited) editedMessageCountNext++;
      
      // Early exit if counts already differ
      if (editedMessageCountPrev !== editedMessageCountNext) {
        return false;
      }
      
      // Also check content equality for each message
      if (prevProps.messages[i].content !== nextProps.messages[i].content) {
        return false;
      }
    }
    
    // If we've passed all checks, consider the arrays equal
    return true;
  })();
  
  return (
    messagesEqual &&
    prevProps.streamingMessageId === nextProps.streamingMessageId &&
    prevProps.className === nextProps.className &&
    prevProps.autoScroll === nextProps.autoScroll &&
    prevProps.showTimestamps === nextProps.showTimestamps &&
    prevProps.virtualizeThreshold === nextProps.virtualizeThreshold
    // We don't compare function references as they might change on parent re-renders
  );
};

export const MessageList = React.memo(function MessageList({
  messages,
  onEditMessage,
  onBranchMessage,
  onRegenerateResponse,
  onRevertVersion,
  onViewHistory,
  onCopyMessage,
  onToggleBookmark,
  className,
  autoScroll = true,
  showTimestamps = true,
  streamingMessageId
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageLengthRef = useRef<number>(messages.length);
  const lastMessageIdRef = useRef<string | undefined>(messages[messages.length - 1]?.id);
  
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [scrollAnimation, setScrollAnimation] = useState<ScrollBehavior>('smooth');
  
  // Scroll to bottom with specified behavior - memoized to prevent recreating on each render
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    } catch (error) {
      // Fallback for environments where scrollIntoView is not available
      console.warn('scrollIntoView not available:', error);
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  }, []);

  // Check if new messages have been added - memoized for performance
  const hasNewMessages = useMemo(() => 
    messages.length > lastMessageLengthRef.current, 
    [messages.length]
  );
  
  const hasNewMessageId = useMemo(() => 
    messages.length > 0 && 
    messages[messages.length - 1]?.id !== lastMessageIdRef.current,
    [messages]
  );
  
  // Auto-scroll to bottom when new messages arrive or when streaming
  useEffect(() => {
    // Update refs for comparison on next render
    const isNewMessage = hasNewMessages || hasNewMessageId;
    
    // Determine if we should auto-scroll
    const shouldAutoScroll = 
      autoScroll && 
      (isNearBottom || streamingMessageId || isNewMessage) && 
      !isUserScrolling;
    
    if (shouldAutoScroll && messagesEndRef.current) {
      // Use instant scroll for initial render, smooth for updates
      const behavior = isNewMessage ? scrollAnimation : 'auto';
      
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        scrollToBottom(behavior);
      });
      
      // After initial load, always use smooth scrolling for new messages
      if (scrollAnimation === 'auto') {
        setScrollAnimation('smooth');
      }
    }
    
    // Update refs for next comparison
    lastMessageLengthRef.current = messages.length;
    lastMessageIdRef.current = messages[messages.length - 1]?.id;
  }, [
    messages, 
    streamingMessageId, 
    autoScroll, 
    isNearBottom, 
    isUserScrolling, 
    scrollToBottom,
    hasNewMessages,
    hasNewMessageId,
    scrollAnimation
  ]);
  
  // Handle scroll events to detect user scrolling and position - memoized for performance
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "near bottom" if within 150px of the bottom
    const nearBottomThreshold = 150;
    const isCurrentlyNearBottom = scrollBottom < nearBottomThreshold;
    
    // Only update state if there's a change to avoid unnecessary re-renders
    if (isCurrentlyNearBottom !== isNearBottom) {
      setIsNearBottom(isCurrentlyNearBottom);
    }
    
    if (!isCurrentlyNearBottom !== showScrollButton) {
      setShowScrollButton(!isCurrentlyNearBottom);
    }
    
    // Only set user scrolling if they're not at the bottom
    if (!isCurrentlyNearBottom) {
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Reset user scrolling state after 3 seconds of no scrolling
      const timeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 3000);
      
      setScrollTimeout(timeout);
    } else if (isUserScrolling) {
      setIsUserScrolling(false);
    }
  }, [isNearBottom, isUserScrolling, scrollTimeout, showScrollButton]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  // Memoize the scroll button to prevent unnecessary re-renders
  const scrollButton = useMemo(() => (
    <AnimatePresence>
      {showScrollButton && (
        <motion.button
          className="fixed bottom-20 right-4 bg-primary text-primary-foreground rounded-full p-3 shadow-lg z-10 hover:bg-primary/90 transition-colors"
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 20
            }
          }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            scrollToBottom('smooth');
            setIsUserScrolling(false);
            setShowScrollButton(false);
            setIsNearBottom(true);
          }}
          title="Scroll to bottom"
          aria-label="Scroll to bottom of conversation"
        >
          <ArrowDown className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  ), [showScrollButton, scrollToBottom]);

  // Empty state - memoized to prevent unnecessary re-renders
  const emptyState = useMemo(() => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-muted-foreground space-y-2">
        <div className="text-4xl mb-4">💬</div>
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm">Start a conversation by typing a message below</p>
      </div>
    </div>
  ), []);

  // Render empty state if no messages
  if (messages.length === 0) {
    return emptyState;
  }

  // Memoize the MessageBubble component to prevent unnecessary re-renders
  const MessageBubbleMemo = React.memo(
    ({ message, isStreaming }: { message: Message; isStreaming: boolean }) => (
      <MessageBubble
        message={message}
        showTimestamp={showTimestamps}
        isStreaming={isStreaming}
        onEdit={onEditMessage ? (content) => onEditMessage(message.id, content) : undefined}
        onBranch={onBranchMessage ? () => onBranchMessage(message.id) : undefined}
        onRegenerate={
          message.role === 'assistant' && onRegenerateResponse 
            ? () => onRegenerateResponse(message.id) 
            : undefined
        }
        onRevertVersion={onRevertVersion ? (versionId) => onRevertVersion(message.id, versionId) : undefined}
        onViewHistory={onViewHistory ? () => onViewHistory(message.id) : undefined}
        onCopy={onCopyMessage ? () => onCopyMessage(message.id) : undefined}
        onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(message.id) : undefined}
      />
    ),
    (prev, next) => {
      // Only re-render if message content or streaming state changes
      return (
        prev.message.content === next.message.content &&
        prev.message.isEdited === next.message.isEdited &&
        prev.isStreaming === next.isStreaming
      );
    }
  );

  // Use optimized rendering approach for messages to improve performance
  // We'll render all messages but use React.memo, chunking, and windowing to prevent unnecessary re-renders
  return (
    <div 
      ref={containerRef}
      className={cn("flex-1 overflow-y-auto", className)}
      onScroll={handleScroll}
    >
      <div
        className="flex flex-col space-y-4 p-4 min-h-full"
      >
        {/* Render messages with memoized components */}
        <div className="space-y-4">
          {/* Use chunking and windowing for large message lists to improve rendering performance */}
          {(() => {
            // For small message lists, render normally
            if (messages.length < 20) {
              return messages.map((message) => (
                <div
                  key={message.id}
                  className="message-container"
                >
                  <MessageBubbleMemo
                    message={message}
                    isStreaming={streamingMessageId === message.id}
                  />
                </div>
              ));
            }
            
            // For medium-sized lists, use chunking to improve rendering performance
            // This helps React's reconciliation process by creating stable subtrees
            if (messages.length < 50) {
              const chunks = [];
              const chunkSize = 10; // Adjust based on performance testing
              
              for (let i = 0; i < messages.length; i += chunkSize) {
                const chunk = messages.slice(i, i + chunkSize);
                
                // Create a stable key for each chunk based on first and last message IDs
                const chunkKey = `chunk-${chunk[0]?.id}-${chunk[chunk.length - 1]?.id}`;
                
                chunks.push(
                  <div key={chunkKey} className="message-chunk">
                    {chunk.map((message) => (
                      <div
                        key={message.id}
                        className="message-container mb-4"
                      >
                        <MessageBubbleMemo
                          message={message}
                          isStreaming={streamingMessageId === message.id}
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              
              return chunks;
            }
            
            // For larger lists, use a windowing approach with focus on visible content
            // This is a simplified windowing approach that focuses on the most important messages
            // without the complexity of a full virtualization library
            
            // Always render the first few messages for context
            const firstMessagesToRender = 5;
            // Always render the last few messages as they're most relevant
            const lastMessagesToRender = 15;
            // Calculate how many messages to skip in the middle
            const messagesToSkip = messages.length - firstMessagesToRender - lastMessagesToRender;
            
            // Only apply windowing if we have enough messages to make it worthwhile
            if (messagesToSkip <= 0) {
              // If not enough messages to skip, render all in chunks
              const chunks = [];
              const chunkSize = 10;
              
              for (let i = 0; i < messages.length; i += chunkSize) {
                const chunk = messages.slice(i, i + chunkSize);
                const chunkKey = `chunk-${chunk[0]?.id}-${chunk[chunk.length - 1]?.id}`;
                
                chunks.push(
                  <div key={chunkKey} className="message-chunk">
                    {chunk.map((message) => (
                      <div
                        key={message.id}
                        className="message-container mb-4"
                      >
                        <MessageBubbleMemo
                          message={message}
                          isStreaming={streamingMessageId === message.id}
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              
              return chunks;
            }
            
            // Apply windowing for large message lists
            const firstMessages = messages.slice(0, firstMessagesToRender);
            const lastMessages = messages.slice(messages.length - lastMessagesToRender);
            
            // Create stable keys for each section
            const firstChunkKey = `first-${firstMessages[0]?.id}-${firstMessages[firstMessages.length - 1]?.id}`;
            const lastChunkKey = `last-${lastMessages[0]?.id}-${lastMessages[lastMessages.length - 1]?.id}`;
            
            return (
              <>
                {/* Render first few messages */}
                <div key={firstChunkKey} className="message-chunk">
                  {firstMessages.map((message) => (
                    <div
                      key={message.id}
                      className="message-container mb-4"
                    >
                      <MessageBubbleMemo
                        message={message}
                        isStreaming={streamingMessageId === message.id}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Render a placeholder for skipped messages */}
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-px bg-border flex-1" />
                    <span>{messagesToSkip} earlier messages</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                </div>
                
                {/* Render last few messages */}
                <div key={lastChunkKey} className="message-chunk">
                  {lastMessages.map((message) => (
                    <div
                      key={message.id}
                      className="message-container mb-4"
                    >
                      <MessageBubbleMemo
                        message={message}
                        isStreaming={streamingMessageId === message.id}
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>
      
      {/* Scroll to bottom button */}
      {scrollButton}
    </div>
  );
}, arePropsEqual);

MessageList.displayName = 'MessageList';