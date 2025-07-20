// Settings store for managing user preferences, theme, API keys, and privacy settings
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, PrivacySettings, UIPreferences } from '../types';

interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  apiKeys: Record<string, string>;
  privacySettings: PrivacySettings;
  uiPreferences: UIPreferences;
  keyboardShortcuts: Record<string, string>;
  isFirstRun: boolean;
}

interface SettingsActions {
  // Theme management
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  getEffectiveTheme: () => 'light' | 'dark';
  
  // API key management
  setApiKey: (service: string, key: string) => void;
  removeApiKey: (service: string) => void;
  getApiKey: (service: string) => string | undefined;
  hasApiKey: (service: string) => boolean;
  clearAllApiKeys: () => void;
  
  // Privacy settings
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  resetPrivacySettings: () => void;
  
  // UI preferences
  updateUIPreferences: (preferences: Partial<UIPreferences>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setMessageSpacing: (spacing: 'compact' | 'comfortable') => void;
  setShowTimestamps: (show: boolean) => void;
  resetUIPreferences: () => void;
  
  // Keyboard shortcuts
  updateKeyboardShortcut: (action: string, shortcut: string) => void;
  resetKeyboardShortcuts: () => void;
  getKeyboardShortcut: (action: string) => string | undefined;
  
  // General settings
  setFirstRun: (isFirstRun: boolean) => void;
  resetAllSettings: () => void;
  exportSettings: () => AppSettings;
  importSettings: (settings: Partial<AppSettings>) => void;
  getSettings: () => AppSettings;
}

// Default settings
const defaultPrivacySettings: PrivacySettings = {
  shareUsageData: false,
  localProcessingOnly: false,
  saveConversations: true,
};

const defaultUIPreferences: UIPreferences = {
  sidebarCollapsed: false,
  fontSize: 'medium',
  messageSpacing: 'comfortable',
  showTimestamps: true,
};

const defaultKeyboardShortcuts: Record<string, string> = {
  'newChat': 'Ctrl+N',
  'sendMessage': 'Ctrl+Enter',
  'editMessage': 'Ctrl+E',
  'deleteMessage': 'Ctrl+D',
  'toggleSidebar': 'Ctrl+B',
  'openPromptLibrary': 'Ctrl+P',
  'openSettings': 'Ctrl+,',
  'focusInput': 'Ctrl+L',
  'createBranch': 'Ctrl+Shift+B',
  'switchBranch': 'Ctrl+Shift+Tab',
  'regenerateResponse': 'Ctrl+R',
  'clearChat': 'Ctrl+Shift+Delete',
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      // State
      theme: 'dark',
      apiKeys: {},
      privacySettings: defaultPrivacySettings,
      uiPreferences: defaultUIPreferences,
      keyboardShortcuts: defaultKeyboardShortcuts,
      isFirstRun: true,
      
      // Theme management actions
      setTheme: (theme) => {
        set({ theme });
        
        // Apply theme to document
        const effectiveTheme = get().getEffectiveTheme();
        document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
      },
      
      getEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'auto') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
      
      // API key management actions
      setApiKey: (service, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [service]: key },
        }));
      },
      
      removeApiKey: (service) => {
        set((state) => {
          const { [service]: removed, ...rest } = state.apiKeys;
          return { apiKeys: rest };
        });
      },
      
      getApiKey: (service) => {
        return get().apiKeys[service];
      },
      
      hasApiKey: (service) => {
        const key = get().apiKeys[service];
        return Boolean(key && key.trim().length > 0);
      },
      
      clearAllApiKeys: () => {
        set({ apiKeys: {} });
      },
      
      // Privacy settings actions
      updatePrivacySettings: (settings) => {
        set((state) => ({
          privacySettings: { ...state.privacySettings, ...settings },
        }));
      },
      
      resetPrivacySettings: () => {
        set({ privacySettings: defaultPrivacySettings });
      },
      
      // UI preferences actions
      updateUIPreferences: (preferences) => {
        set((state) => ({
          uiPreferences: { ...state.uiPreferences, ...preferences },
        }));
      },
      
      setSidebarCollapsed: (collapsed) => {
        set((state) => ({
          uiPreferences: { ...state.uiPreferences, sidebarCollapsed: collapsed },
        }));
      },
      
      setFontSize: (size) => {
        set((state) => ({
          uiPreferences: { ...state.uiPreferences, fontSize: size },
        }));
      },
      
      setMessageSpacing: (spacing) => {
        set((state) => ({
          uiPreferences: { ...state.uiPreferences, messageSpacing: spacing },
        }));
      },
      
      setShowTimestamps: (show) => {
        set((state) => ({
          uiPreferences: { ...state.uiPreferences, showTimestamps: show },
        }));
      },
      
      resetUIPreferences: () => {
        set({ uiPreferences: defaultUIPreferences });
      },
      
      // Keyboard shortcuts actions
      updateKeyboardShortcut: (action, shortcut) => {
        set((state) => ({
          keyboardShortcuts: { ...state.keyboardShortcuts, [action]: shortcut },
        }));
      },
      
      resetKeyboardShortcuts: () => {
        set({ keyboardShortcuts: defaultKeyboardShortcuts });
      },
      
      getKeyboardShortcut: (action) => {
        return get().keyboardShortcuts[action];
      },
      
      // General settings actions
      setFirstRun: (isFirstRun) => {
        set({ isFirstRun });
      },
      
      resetAllSettings: () => {
        set({
          theme: 'dark',
          apiKeys: {},
          privacySettings: defaultPrivacySettings,
          uiPreferences: defaultUIPreferences,
          keyboardShortcuts: defaultKeyboardShortcuts,
          isFirstRun: false,
        });
      },
      
      exportSettings: () => {
        const state = get();
        return {
          theme: state.theme,
          apiKeys: state.apiKeys,
          privacySettings: state.privacySettings,
          uiPreferences: state.uiPreferences,
        };
      },
      
      getSettings: () => {
        const state = get();
        return {
          theme: state.theme,
          apiKeys: state.apiKeys,
          privacySettings: state.privacySettings,
          uiPreferences: state.uiPreferences,
        };
      },
      
      importSettings: (settings) => {
        set((state) => ({
          theme: settings.theme || state.theme,
          apiKeys: settings.apiKeys || state.apiKeys,
          privacySettings: settings.privacySettings || state.privacySettings,
          uiPreferences: settings.uiPreferences || state.uiPreferences,
        }));
      },
    }),
    {
      name: 'ai-chat-settings',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // Ignore storage errors
          }
        },
      })),
      // Don't persist API keys for security
      partialize: (state) => ({
        theme: state.theme,
        privacySettings: state.privacySettings,
        uiPreferences: state.uiPreferences,
        keyboardShortcuts: state.keyboardShortcuts,
        isFirstRun: state.isFirstRun,
      }),
    }
  )
);