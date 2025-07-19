import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';

interface ChatInputProps {
  chatId?: string;
  onSendMessage: (content: string) => void;
  onOpenPromptLibrary?: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function ChatInput({
  chatId,
  onSendMessage,
  onOpenPromptLibrary,
  isDisabled = false,
  isLoading = false,
  placeholder = 'Type a message...',
  className,
  autoFocus = false
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get streaming state from the store
  const isStreaming = useChatStore(state => state.isStreaming);
  const currentChatId = useChatStore(state => state.currentChatId);
  
  // Determine if the input should be disabled
  const shouldDisable = isDisabled || isLoading || isStreaming || (!chatId && !currentChatId);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set the height to scrollHeight + border
    const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
    textarea.style.height = `${newHeight}px`;
  }, [message]);
  
  // Auto-focus the textarea when the component mounts
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);
  
  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !shouldDisable) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      className={cn(
        "flex flex-col w-full border rounded-lg bg-background",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative flex items-end p-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={shouldDisable ? "Please wait..." : placeholder}
          disabled={shouldDisable}
          className="min-h-[40px] max-h-[200px] pr-24 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
          aria-label="Chat message input"
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          {onOpenPromptLibrary && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onOpenPromptLibrary}
              disabled={isDisabled}
              title="Open prompt library"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={shouldDisable}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button
            variant={message.trim() ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={handleSubmit}
            disabled={!message.trim() || shouldDisable}
            title="Send message"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="px-3 py-1 text-xs text-muted-foreground border-t">
        <span>Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send</span>
      </div>
    </motion.div>
  );
}