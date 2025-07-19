// Utility functions for the AI Chat Assistant

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind CSS class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate unique IDs
export function generateId(): string {
  return crypto.randomUUID();
}

// Format timestamps
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // More than 7 days - show date
  return date.toLocaleDateString();
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Generate chat title from first message
export function generateChatTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim();
  if (cleaned.length <= 50) return cleaned;
  
  // Try to break at word boundary
  const truncated = cleaned.slice(0, 47);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

// Platform detection
export function getPlatform(): 'web' | 'electron' {
  return typeof window !== 'undefined' && (window as any).electronAPI ? 'electron' : 'web';
}

// Local storage helpers
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate current timestamp
export function getCurrentTimestamp(): Date {
  return new Date();
}

// Data validation functions
export const validation = {
  // Validate Message object
  isValidMessage: (obj: any): obj is import('../types').Message => {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.content === 'string' &&
      (obj.role === 'user' || obj.role === 'assistant') &&
      obj.timestamp instanceof Date &&
      typeof obj.isEdited === 'boolean' &&
      (obj.parentId === undefined || typeof obj.parentId === 'string') &&
      (obj.branchId === undefined || typeof obj.branchId === 'string') &&
      (obj.metadata === undefined || (typeof obj.metadata === 'object' && obj.metadata !== null))
    );
  },

  // Validate Chat object
  isValidChat: (obj: any): obj is import('../types').Chat => {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.title === 'string' &&
      obj.title.length > 0 &&
      obj.createdAt instanceof Date &&
      obj.updatedAt instanceof Date &&
      (obj.folderId === undefined || typeof obj.folderId === 'string') &&
      Array.isArray(obj.messages) &&
      obj.messages.every((msg: any) => validation.isValidMessage(msg)) &&
      Array.isArray(obj.branches) &&
      obj.branches.every((branch: any) => validation.isValidBranch(branch)) &&
      Array.isArray(obj.activeKnowledgeStacks) &&
      obj.activeKnowledgeStacks.every((id: any) => typeof id === 'string') &&
      (obj.metadata === undefined || (typeof obj.metadata === 'object' && obj.metadata !== null))
    );
  },

  // Validate Branch object
  isValidBranch: (obj: any): obj is import('../types').Branch => {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.parentMessageId === 'string' &&
      obj.parentMessageId.length > 0 &&
      Array.isArray(obj.messages) &&
      obj.messages.every((msg: any) => validation.isValidMessage(msg)) &&
      (obj.title === undefined || typeof obj.title === 'string') &&
      obj.createdAt instanceof Date
    );
  },

  // Validate SavedPrompt object
  isValidSavedPrompt: (obj: any): obj is import('../types').SavedPrompt => {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.title === 'string' &&
      obj.title.length > 0 &&
      (obj.description === undefined || typeof obj.description === 'string') &&
      typeof obj.content === 'string' &&
      obj.content.length > 0 &&
      Array.isArray(obj.tags) &&
      obj.tags.every((tag: any) => typeof tag === 'string') &&
      obj.createdAt instanceof Date &&
      obj.updatedAt instanceof Date &&
      typeof obj.usageCount === 'number' &&
      obj.usageCount >= 0 &&
      typeof obj.isFavorite === 'boolean'
    );
  },

  // Validate KnowledgeSource object
  isValidKnowledgeSource: (obj: any): obj is import('../types').KnowledgeSource => {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.name === 'string' &&
      obj.name.length > 0 &&
      (obj.type === 'file' || obj.type === 'folder' || obj.type === 'url') &&
      typeof obj.path === 'string' &&
      obj.path.length > 0 &&
      typeof obj.stackId === 'string' &&
      obj.stackId.length > 0 &&
      (obj.status === 'indexing' || obj.status === 'ready' || obj.status === 'error') &&
      (obj.indexedAt === undefined || obj.indexedAt instanceof Date) &&
      typeof obj.size === 'number' &&
      obj.size >= 0 &&
      (obj.chunkCount === undefined || (typeof obj.chunkCount === 'number' && obj.chunkCount >= 0)) &&
      (obj.metadata === undefined || (typeof obj.metadata === 'object' && obj.metadata !== null))
    );
  },

  // Validate KnowledgeStack object
  isValidKnowledgeStack: (obj: any): obj is import('../types').KnowledgeStack => {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      obj.id.length > 0 &&
      typeof obj.name === 'string' &&
      obj.name.length > 0 &&
      (obj.description === undefined || typeof obj.description === 'string') &&
      Array.isArray(obj.sources) &&
      obj.sources.every((source: any) => validation.isValidKnowledgeSource(source)) &&
      typeof obj.isActive === 'boolean' &&
      obj.createdAt instanceof Date &&
      obj.updatedAt instanceof Date
    );
  },

  // Validate string is not empty
  isNonEmptyString: (value: any): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  },

  // Validate UUID format
  isValidUUID: (value: any): value is string => {
    if (typeof value !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  // Validate array of strings
  isStringArray: (value: any): value is string[] => {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
  },

  // Validate positive number
  isPositiveNumber: (value: any): value is number => {
    return typeof value === 'number' && value >= 0 && !isNaN(value);
  }
};