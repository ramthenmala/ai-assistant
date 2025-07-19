import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique ID using crypto API when available, falls back to timestamp-based ID
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Formats a date into a readable timestamp
 */
export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Theme management utilities
 */
export const themeUtils = {
  /**
   * Sets the application theme and updates the DOM
   */
  setTheme(theme: 'dark' | 'light' | 'system'): void {
    const root = document.documentElement;
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Store the preference
    localStorage.setItem('theme', theme);
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
  },

  /**
   * Gets the current theme preference
   */
  getTheme(): 'dark' | 'light' | 'system' {
    if (typeof localStorage === 'undefined') return 'system';
    return (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'system';
  },
  
  /**
   * Checks if the current theme is dark mode
   */
  isDarkMode(): boolean {
    if (typeof window === 'undefined') return false;
    const theme = this.getTheme();
    return theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  },
  
  /**
   * Toggles between light, dark, and system themes
   */
  cycleTheme(): 'dark' | 'light' | 'system' {
    const currentTheme = this.getTheme();
    const nextTheme = currentTheme === 'dark' ? 'light' : 
                      currentTheme === 'light' ? 'system' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  },

  /**
   * Applies the theme on initial load
   */
  initTheme(): void {
    if (typeof window === 'undefined') return;
    const theme = this.getTheme();
    this.setTheme(theme);
  }
};

// For backward compatibility
export const setTheme = themeUtils.setTheme;
export const getTheme = themeUtils.getTheme;

// Export animation utilities
export * from './animations';