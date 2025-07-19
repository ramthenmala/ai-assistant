import React, { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types';
import { ArrowDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePerformanceMonitor, ScrollPositionManager } from '@/utils/performance';

interface VirtualizedMessageListProps {
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
  overscan?: number;
}

// Custom equality function for memo optimization with enhanced message comparison
const arePropsEqual = (prevProps: VirtualizedMessageListProps, nextProps: VirtualizedMessageListProps) => {
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
    prevProps.overscan === nextProps.overscan
    // We don't compare function references as they might change on parent re-renders
  );
};

export const VirtualizedMessageList = React.memo(({
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
  streamingMessageId,
  overscan = 5
}: VirtualizedMessageListProps) => {
  // Performance monitoring for component operations
  const performanceMonitor = usePerformanceMonitor('VirtualizedMessageList');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageLengthRef = useRef<number>(messages.length);
  const lastMessageIdRef = useRef<string | undefined>(messages[messages.length - 1]?.id);
  const scrollManagerRef = useRef<ScrollPositionManager | null>(null);
  
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  // Initialize scroll position manager for more efficient scroll handling
  useEffect(() => {
    if (containerRef.current && !scrollManagerRef.current) {
      scrollManagerRef.current = new ScrollPositionManager(containerRef.current, 150);
      
      // Set up position change handler
      const cleanup = scrollManagerRef.current.onPositionChange((nearBottom) => {
        if (nearBottom !== isNearBottom) {
          setIsNearBottom(nearBottom);
        }
        
        if (!nearBottom !== showScrollButton) {
          setShowScrollButton(!nearBottom);
        }
      });
      
      return () => {
        cleanup();
        if (scrollManagerRef.current) {
          scrollManagerRef.current.destroy();
          scrollManagerRef.current = null;
        }
      };
    }
  }, [isNearBottom, showScrollButton]);
  
  // Cache for message size estimations to avoid recalculating
  const messageSizeCache = useRef<Record<string, number>>({});
  
  // Optimized dynamic message size estimation with enhanced caching and performance improvements
  const estimateSize = useCallback((index: number) => {
    const message = messages[index];
    if (!message) return 100; // Default fallback
    
    // Check cache first to avoid expensive calculations
    if (messageSizeCache.current[message.id]) {
      return messageSizeCache.current[message.id];
    }
    
    // Base height for the message container
    const baseHeight = 80;
    
    // Fast path for very short messages
    if (message.content.length < 50 && !message.content.includes('\n')) {
      const estimatedHeight = baseHeight + 30 + (showTimestamps ? 24 : 0);
      messageSizeCache.current[message.id] = estimatedHeight;
      return estimatedHeight;
    }
    
    // Different character counts per line based on message role and viewport width
    // User messages tend to be shorter and have different styling
    const containerWidth = containerRef.current?.clientWidth || 800;
    const effectiveWidth = message.role === 'user' ? containerWidth * 0.7 : containerWidth * 0.85;
    const charsPerPixel = 0.125; // Approximate characters per pixel
    const charsPerLine = Math.floor(effectiveWidth * charsPerPixel);
    
    // Optimized line estimation with better performance
    let estimatedLines = 0;
    
    // Fast check for common patterns that affect height using indexOf instead of includes for better performance
    const hasCodeBlocks = message.content.indexOf('```') !== -1;
    const hasImages = message.content.indexOf('![') !== -1;
    const hasTables = message.content.indexOf('|') !== -1;
    
    // Count line breaks more efficiently - avoid regex for better performance
    let newlineCount = 0;
    let pos = -1;
    while ((pos = message.content.indexOf('\n', pos + 1)) !== -1) {
      newlineCount++;
    }
    
    const hasMultipleLineBreaks = newlineCount > 4;
    
    // If message has complex formatting, use more sophisticated estimation
    if (hasCodeBlocks || hasImages || hasTables || hasMultipleLineBreaks) {
      // For code blocks, use a more efficient approach
      if (hasCodeBlocks) {
        // Count code block markers to estimate number of blocks
        let codeBlockCount = 0;
        let markerPos = -1;
        let markerCount = 0;
        
        while ((markerPos = message.content.indexOf('```', markerPos + 1)) !== -1) {
          markerCount++;
        }
        
        codeBlockCount = Math.floor(markerCount / 2);
        
        // Estimate lines in code blocks (average 10 lines per block)
        estimatedLines += codeBlockCount * 12; // 10 lines + 2 for markers
        
        // For the rest of the content, use line break count as approximation
        estimatedLines += Math.max(0, newlineCount - (codeBlockCount * 10)) + 1;
      } else {
        // For other complex content, use line breaks as base estimation
        estimatedLines += newlineCount + 1;
        
        // Add extra lines for tables and images
        if (hasImages) {
          // Count image markers
          let imageCount = 0;
          let imgPos = -1;
          while ((imgPos = message.content.indexOf('![', imgPos + 1)) !== -1) {
            imageCount++;
          }
          estimatedLines += 5 * imageCount;
        }
        
        if (hasTables) {
          // Count pipe characters for table estimation
          let pipeCount = 0;
          let pipePos = -1;
          while ((pipePos = message.content.indexOf('|', pipePos + 1)) !== -1) {
            pipeCount++;
          }
          estimatedLines += 4 * pipeCount / 3;
        }
      }
    } else {
      // For simpler content, use character count and line breaks
      const textLines = Math.ceil(message.content.length / charsPerLine);
      
      // Use the larger of line break count or text line estimate
      estimatedLines = Math.max(newlineCount + 1, textLines);
    }
    
    // Minimum height for very short messages
    const lineHeight = 22; // Approximate line height in pixels
    const contentHeight = Math.max(20, estimatedLines * lineHeight);
    
    // Add extra space for metadata, timestamps, etc.
    const metadataHeight = showTimestamps ? 24 : 0;
    
    // Add extra padding for assistant messages which might have more complex formatting
    const rolePadding = message.role === 'assistant' ? 15 : 0;
    
    // Add extra height for edited messages with badges
    const editedHeight = message.isEdited ? 10 : 0;
    
    // Calculate final height with a small buffer to reduce layout shifts
    const estimatedHeight = baseHeight + contentHeight + metadataHeight + rolePadding + editedHeight + 10;
    
    // Cache the result
    messageSizeCache.current[message.id] = estimatedHeight;
    
    return estimatedHeight;
  }, [messages, showTimestamps]);
  
  // Set up virtualizer with enhanced dynamic size estimation and caching
  // This optimized version includes performance improvements and better scroll handling
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    // Adaptive overscan based on device capabilities and scroll velocity
    // This improves performance by rendering more items for fast scrolling
    overscan: (() => {
      // Default overscan value from props
      const baseOverscan = overscan || 5;
      
      // Check for high-performance device indicators
      const isHighPerformanceDevice = (() => {
        // Use cached value if available
        if (typeof window.__isHighPerformanceDevice !== 'undefined') {
          return window.__isHighPerformanceDevice;
        }
        
        const result = 
          (navigator.hardwareConcurrency && navigator.hardwareConcurrency >= 8) || // High CPU cores
          (window.performance && window.performance.memory && 
           (window.performance.memory as any).jsHeapSizeLimit > 4294967296); // > 4GB memory limit
        
        // @ts-ignore - Add to window for caching
        window.__isHighPerformanceDevice = result;
        return result;
      })();
      
      // Increase overscan for high-performance devices
      return isHighPerformanceDevice ? baseOverscan * 3 : baseOverscan * 2;
    })(),
    getItemKey: (index) => messages[index]?.id || index, // Use message ID for stable keys
    scrollPaddingStart: 16, // Add padding at the top for better UX
    scrollPaddingEnd: 16, // Add padding at the bottom for better UX
    measureElement: (element) => {
      performanceMonitor.start();
      
      // Get actual rendered height for more accurate virtualization
      if (element) {
        const height = element.getBoundingClientRect().height;
        
        // Cache the measured height for this message
        const messageId = element.getAttribute('data-message-id');
        if (messageId && height > 0) {
          messageSizeCache.current[messageId] = height;
        }
        
        performanceMonitor.end();
        return height;
      }
      
      performanceMonitor.end();
      return 100; // Fallback height
    },
    // Add optimized options for better performance
    lanes: 1, // Single lane for chat messages
    horizontal: false,
    // Enhanced options for better scroll performance
    paddingStart: 8,
    paddingEnd: 8,
    // Custom scroll implementation with optimized animation and error handling
    scrollToFn: (offset, options) => {
      performanceMonitor.start();
      
      const scrollElement = containerRef.current;
      if (!scrollElement) {
        performanceMonitor.end();
        return;
      }
      
      try {
        // Use scrollTo with behavior option if available
        if (options.behavior === 'smooth') {
          // For smooth scrolling, use optimized animation with RAF
          // This provides better performance and smoother scrolling
          
          // Cancel any existing animation to prevent conflicts
          if (window.__virtualListScrollAnimationId) {
            cancelAnimationFrame(window.__virtualListScrollAnimationId);
          }
          
          const startPosition = scrollElement.scrollTop;
          const distance = offset - startPosition;
          
          // Skip animation for very small distances
          if (Math.abs(distance) < 5) {
            scrollElement.scrollTop = offset;
            performanceMonitor.end();
            return;
          }
          
          // Adaptive duration based on distance for more natural feeling
          // Shorter distances use shorter durations
          const baseDuration = 300; // ms
          const duration = Math.min(
            baseDuration,
            baseDuration * (Math.abs(distance) / 1000)
          );
          
          const startTime = performance.now();
          
          const animateScroll = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Use ease-out cubic function for natural feeling
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            scrollElement.scrollTop = startPosition + distance * easeOutCubic;
            
            if (progress < 1) {
              // Store animation ID for potential cancellation
              window.__virtualListScrollAnimationId = requestAnimationFrame(animateScroll);
            } else {
              // Ensure we end exactly at the target position
              scrollElement.scrollTop = offset;
              window.__virtualListScrollAnimationId = undefined;
              performanceMonitor.end();
            }
          };
          
          window.__virtualListScrollAnimationId = requestAnimationFrame(animateScroll);
        } else {
          // For instant scrolling, use direct assignment
          scrollElement.scrollTop = offset;
          performanceMonitor.end();
        }
      } catch (error) {
        // Fallback for any errors
        console.warn('Error in custom scroll function:', error);
        scrollElement.scrollTop = offset;
        performanceMonitor.end();
      }
    }
  });

  // Enhanced scroll to bottom with performance optimizations
  // This version uses the ScrollPositionManager for more efficient scrolling
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    performanceMonitor.start('scrollToBottom');
    
    // Use the scroll manager if available for better performance
    if (scrollManagerRef.current) {
      scrollManagerRef.current.scrollToBottom(behavior);
      performanceMonitor.end('scrollToBottom');
      return;
    }
    
    // Fallback to direct DOM manipulation if scroll manager isn't available
    if (containerRef.current) {
      const scrollElement = containerRef.current;
      const scrollHeight = scrollElement.scrollHeight;
      const clientHeight = scrollElement.clientHeight;
      
      try {
        // Use scrollTo if available (modern browsers)
        if (typeof scrollElement.scrollTo === 'function') {
          // For smooth scrolling, use optimized animation with RAF for better performance
          if (behavior === 'smooth') {
            // Cancel any existing animation to prevent conflicts
            if (window.__virtualListScrollAnimationId) {
              cancelAnimationFrame(window.__virtualListScrollAnimationId);
            }
            
            const startPosition = scrollElement.scrollTop;
            const targetPosition = scrollHeight - clientHeight;
            const distance = targetPosition - startPosition;
            
            // Skip animation for very small distances
            if (Math.abs(distance) < 5) {
              scrollElement.scrollTop = targetPosition;
              performanceMonitor.end('scrollToBottom');
              return;
            }
            
            // Adaptive duration based on distance for more natural feeling
            const baseDuration = 300; // ms
            const duration = Math.min(
              baseDuration,
              baseDuration * (Math.abs(distance) / 1000)
            );
            
            const startTime = performance.now();
            
            const animateScroll = (currentTime: number) => {
              const elapsedTime = currentTime - startTime;
              const progress = Math.min(elapsedTime / duration, 1);
              
              // Use ease-out cubic function for natural feeling
              const easeOutCubic = 1 - Math.pow(1 - progress, 3);
              scrollElement.scrollTop = startPosition + distance * easeOutCubic;
              
              if (progress < 1) {
                // Store animation ID for potential cancellation
                window.__virtualListScrollAnimationId = requestAnimationFrame(animateScroll);
              } else {
                // Ensure we end exactly at the target position
                scrollElement.scrollTop = targetPosition;
                window.__virtualListScrollAnimationId = undefined;
              }
            };
            
            window.__virtualListScrollAnimationId = requestAnimationFrame(animateScroll);
          } else {
            // For instant scrolling, use direct assignment
            scrollElement.scrollTo({
              top: scrollHeight - clientHeight,
              behavior,
            });
          }
        } else {
          // Fallback for environments where scrollTo is not available
          scrollElement.scrollTop = scrollHeight - clientHeight;
        }
      } catch (error) {
        // Final fallback
        console.warn('Error scrolling:', error);
        if (scrollElement) {
          scrollElement.scrollTop = scrollHeight - clientHeight;
        }
      }
    }
    
    performanceMonitor.end('scrollToBottom');
  }, [performanceMonitor]);

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
    
    if (shouldAutoScroll) {
      // Use instant scroll for initial render, smooth for updates
      const behavior = messages.length <= 1 ? 'auto' : 'smooth';
      
      // Optimize scrolling by using a debounced approach for streaming messages
      // This prevents excessive scroll operations during rapid token streaming
      if (streamingMessageId) {
        // For streaming messages, use a more efficient approach with RAF
        // This helps smooth out scrolling during rapid token updates
        cancelAnimationFrame(window.requestAnimationFrame(() => {
          scrollToBottom(behavior);
        }));
      } else {
        // For normal messages, use standard approach
        requestAnimationFrame(() => {
          scrollToBottom(behavior);
        });
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
    hasNewMessages,
    hasNewMessageId,
    scrollToBottom
  ]);
  
  // Enhanced scroll handling with performance optimizations
  // This version uses the ScrollPositionManager for more efficient scroll tracking
  const handleScroll = useCallback(() => {
    performanceMonitor.start();
    
    // Use the scroll manager if available for better performance
    if (scrollManagerRef.current) {
      // The scroll manager already tracks position and updates state
      // We just need to handle user scrolling detection
      const isCurrentlyNearBottom = scrollManagerRef.current.getIsNearBottom();
      
      // Only set user scrolling if they're not at the bottom
      if (!isCurrentlyNearBottom) {
        setIsUserScrolling(true);
        
        // Clear existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        // Reset user scrolling state after 3 seconds of no scrolling
        // This allows auto-scrolling to resume after user stops scrolling
        const timeout = setTimeout(() => {
          setIsUserScrolling(false);
        }, 3000);
        
        setScrollTimeout(timeout);
      } else if (isUserScrolling) {
        setIsUserScrolling(false);
      }
    } else {
      // Fallback to direct DOM manipulation if scroll manager isn't available
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
    }
    
    performanceMonitor.end();
  }, [isNearBottom, isUserScrolling, scrollTimeout, showScrollButton, performanceMonitor]);

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
  // This enhanced version uses stable callback references and better equality checking
  const MessageBubbleMemo = React.memo(
    ({ message, isStreaming }: { message: Message; isStreaming: boolean }) => {
      // Performance monitoring for component rendering
      performanceMonitor.start();
      
      // Create stable callback references to prevent unnecessary re-renders
      // These callbacks are created once per message and preserved across renders
      const handleEdit = useCallback(
        (content: string) => {
          if (onEditMessage) {
            onEditMessage(message.id, content);
          }
        },
        [message.id]
      );
      
      const handleBranch = useCallback(
        () => {
          if (onBranchMessage) {
            onBranchMessage(message.id);
          }
        },
        [message.id]
      );
      
      const handleRegenerate = useCallback(
        () => {
          if (onRegenerateResponse && message.role === 'assistant') {
            onRegenerateResponse(message.id);
          }
        },
        [message.id, message.role]
      );
      
      const handleRevertVersion = useCallback(
        (versionId: string) => {
          if (onRevertVersion) {
            onRevertVersion(message.id, versionId);
          }
        },
        [message.id]
      );
      
      const handleViewHistory = useCallback(
        () => {
          if (onViewHistory) {
            onViewHistory(message.id);
          }
        },
        [message.id]
      );

      const handleCopy = useCallback(
        () => {
          if (onCopyMessage) {
            onCopyMessage(message.id);
          }
        },
        [message.id]
      );

      const handleToggleBookmark = useCallback(
        () => {
          if (onToggleBookmark) {
            onToggleBookmark(message.id);
          }
        },
        [message.id]
      );
      
      const result = (
        <MessageBubble
          message={message}
          showTimestamp={showTimestamps}
          isStreaming={isStreaming}
          onEdit={onEditMessage ? handleEdit : undefined}
          onBranch={onBranchMessage ? handleBranch : undefined}
          onRegenerate={message.role === 'assistant' && onRegenerateResponse ? handleRegenerate : undefined}
          onRevertVersion={onRevertVersion ? handleRevertVersion : undefined}
          onViewHistory={onViewHistory ? handleViewHistory : undefined}
          onCopy={onCopyMessage ? handleCopy : undefined}
          onToggleBookmark={onToggleBookmark ? handleToggleBookmark : undefined}
        />
      );
      
      performanceMonitor.end();
      return result;
    },
    (prev, next) => {
      // Ultra-optimized equality check for better memoization
      
      // Fast path: Object identity check (same reference = same props)
      if (prev.message === next.message && prev.isStreaming === next.isStreaming) {
        return true;
      }
      
      // Fast path: Check streaming state first as it's most likely to change
      if (prev.isStreaming !== next.isStreaming) {
        return false;
      }
      
      const prevMsg = prev.message;
      const nextMsg = next.message;
      
      // Check message ID first - if different, definitely re-render
      if (prevMsg.id !== nextMsg.id) {
        return false;
      }
      
      // Check edited state - important for UI indicators
      if (prevMsg.isEdited !== nextMsg.isEdited) {
        return false;
      }
      
      // For streaming messages, we need to check content more carefully
      if (prev.isStreaming || next.isStreaming) {
        // For streaming messages, always check content equality
        return prevMsg.content === nextMsg.content;
      }
      
      // For non-streaming messages, we can optimize further
      // If content length is significantly different, content has changed
      if (Math.abs(prevMsg.content.length - nextMsg.content.length) > 5) {
        return false;
      }
      
      // Final content equality check
      return prevMsg.content === nextMsg.content;
    }
  );

  return (
    <div 
      ref={containerRef}
      className={cn("flex-1 overflow-y-auto", className)}
      onScroll={handleScroll}
    >
      <div
        className="relative flex flex-col space-y-4 p-4 min-h-full"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={(el) => {
                // This allows the virtualizer to measure the actual rendered height
                // for more accurate virtualization on subsequent renders
                if (el) {
                  rowVirtualizer.measureElement(el);
                }
              }}
              className="message-container absolute top-0 left-0 right-0"
              data-message-id={message.id}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                padding: '8px 0',
                willChange: 'transform, height', // Optimize for animations
              }}
            >
              <MessageBubbleMemo
                message={message}
                isStreaming={streamingMessageId === message.id}
              />
            </div>
          );
        })}
      </div>
      
      {/* Scroll to bottom button */}
      {scrollButton}
    </div>
  );
}, arePropsEqual);

VirtualizedMessageList.displayName = 'VirtualizedMessageList';