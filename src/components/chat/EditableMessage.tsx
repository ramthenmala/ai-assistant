import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface EditableMessageProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

export const EditableMessage = React.memo(function EditableMessage({
  initialContent,
  onSave,
  onCancel,
  className,
  placeholder = "Edit your message...",
  maxLength = 4000
}: EditableMessageProps) {
  const [content, setContent] = useState(initialContent);
  const [isValid, setIsValid] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end of text
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, []);

  // Validate content
  useEffect(() => {
    const trimmedContent = content.trim();
    setIsValid(trimmedContent.length > 0 && trimmedContent.length <= maxLength);
  }, [content, maxLength]);

  const handleSave = useCallback(() => {
    const trimmedContent = content.trim();
    if (trimmedContent && trimmedContent !== initialContent) {
      onSave(trimmedContent);
    } else {
      onCancel();
    }
  }, [content, initialContent, onSave, onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isValid) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [isValid, handleSave, onCancel]);

  const characterCount = content.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <motion.div
      className={cn("space-y-3", className)}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "min-h-[100px] w-full resize-none",
            isOverLimit && "border-destructive focus-visible:ring-destructive"
          )}
          maxLength={maxLength}
        />
        
        {/* Character count */}
        <div className={cn(
          "absolute bottom-2 right-2 text-xs",
          isOverLimit ? "text-destructive" : 
          isNearLimit ? "text-warning" : "text-muted-foreground"
        )}>
          {characterCount}/{maxLength}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCancel}
          className="h-8"
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleSave}
          disabled={!isValid}
          className="h-8"
        >
          <Check className="h-3 w-3 mr-1" />
          Save
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> to save, 
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Esc</kbd> to cancel
      </div>
    </motion.div>
  );
});

EditableMessage.displayName = 'EditableMessage';