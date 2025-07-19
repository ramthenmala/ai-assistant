import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface EditableTitleProps {
  initialTitle: string;
  onSave: (title: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

export function EditableTitle({
  initialTitle,
  onSave,
  className,
  placeholder = "Chat title",
  maxLength = 100
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end of text
      inputRef.current.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length
      );
    }
  }, [isEditing]);

  // Validate title
  useEffect(() => {
    const trimmedTitle = title.trim();
    setIsValid(trimmedTitle.length > 0 && trimmedTitle.length <= maxLength);
  }, [title, maxLength]);

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle && isValid) {
      onSave(trimmedTitle);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isValid) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <motion.div
        className={cn("flex items-center gap-2", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 min-w-[200px]"
          maxLength={maxLength}
        />
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancel}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSave}
            disabled={!isValid}
            className="h-7 w-7"
          >
            <Check className="h-4 w-4" />
            <span className="sr-only">Save</span>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      <h2 className="font-semibold text-lg truncate">
        {initialTitle || placeholder}
      </h2>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit title"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}