import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';

// Mock the utils
vi.mock('../../utils', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock document.documentElement
Object.defineProperty(document.documentElement, 'classList', {
  value: {
    toggle: vi.fn(),
  },
});

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Clear any persisted state first
    useSettingsStore.persist.clearStorage();
    // Reset store state before each test
    useSettingsStore.getState().resetAllSettings();
  });

  describe('Theme Management', () => {
    it('should set theme', () => {
      const store = useSettingsStore.getState();
      
      store.setTheme('light');
      expect(store.theme).toBe('light');
      
      store.setTheme('dark');
      expect(store.theme).toBe('dark');
      
      store.setTheme('auto');
      expect(store.theme).toBe('auto');
    });

    it('should get effective theme', () => {
      const store = useSettingsStore.getState();
      
      store.setTheme('light');
      expect(store.getEffectiveTheme()).toBe('light');
      
      store.setTheme('dark');
      expect(store.getEffectiveTheme()).toBe('dark');
    });

    it('should handle auto theme based on system preference', () => {
      // Mock dark mode preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const store = useSettingsStore.getState();
      store.setTheme('auto');
      
      expect(store.getEffectiveTheme()).toBe('dark');
    });
  });

  describe('API Key Management', () => {
    it('should set and get API keys', () => {
      const store = useSettingsStore.getState();
      
      store.setApiKey('openai', 'test-key-123');
      
      expect(store.getApiKey('openai')).toBe('test-key-123');
      expect(store.hasApiKey('openai')).toBe(true);
      expect(store.hasApiKey('anthropic')).toBe(false);
    });

    it('should remove API keys', () => {
      const store = useSettingsStore.getState();
      
      store.setApiKey('openai', 'test-key-123');
      expect(store.hasApiKey('openai')).toBe(true);
      
      store.removeApiKey('openai');
      expect(store.hasApiKey('openai')).toBe(false);
      expect(store.getApiKey('openai')).toBeUndefined();
    });

    it('should clear all API keys', () => {
      const store = useSettingsStore.getState();
      
      store.setApiKey('openai', 'key1');
      store.setApiKey('anthropic', 'key2');
      
      expect(store.hasApiKey('openai')).toBe(true);
      expect(store.hasApiKey('anthropic')).toBe(true);
      
      store.clearAllApiKeys();
      
      expect(store.hasApiKey('openai')).toBe(false);
      expect(store.hasApiKey('anthropic')).toBe(false);
    });

    it('should handle empty or whitespace-only keys', () => {
      const store = useSettingsStore.getState();
      
      store.setApiKey('openai', '');
      expect(store.hasApiKey('openai')).toBe(false);
      
      store.setApiKey('openai', '   ');
      expect(store.hasApiKey('openai')).toBe(false);
      
      store.setApiKey('openai', 'valid-key');
      expect(store.hasApiKey('openai')).toBe(true);
    });
  });

  describe('Privacy Settings', () => {
    it('should update privacy settings', () => {
      const store = useSettingsStore.getState();
      
      store.updatePrivacySettings({
        shareUsageData: true,
        localProcessingOnly: true,
      });
      
      expect(store.privacySettings.shareUsageData).toBe(true);
      expect(store.privacySettings.localProcessingOnly).toBe(true);
      expect(store.privacySettings.saveConversations).toBe(true); // Should remain unchanged
    });

    it('should reset privacy settings', () => {
      const store = useSettingsStore.getState();
      
      store.updatePrivacySettings({
        shareUsageData: true,
        localProcessingOnly: true,
        saveConversations: false,
      });
      
      store.resetPrivacySettings();
      
      expect(store.privacySettings.shareUsageData).toBe(false);
      expect(store.privacySettings.localProcessingOnly).toBe(false);
      expect(store.privacySettings.saveConversations).toBe(true);
    });
  });

  describe('UI Preferences', () => {
    it('should update UI preferences', () => {
      const store = useSettingsStore.getState();
      
      store.updateUIPreferences({
        fontSize: 'large',
        messageSpacing: 'compact',
      });
      
      expect(store.uiPreferences.fontSize).toBe('large');
      expect(store.uiPreferences.messageSpacing).toBe('compact');
      expect(store.uiPreferences.sidebarCollapsed).toBe(false); // Should remain unchanged
    });

    it('should set sidebar collapsed state', () => {
      const store = useSettingsStore.getState();
      
      store.setSidebarCollapsed(true);
      expect(store.uiPreferences.sidebarCollapsed).toBe(true);
      
      store.setSidebarCollapsed(false);
      expect(store.uiPreferences.sidebarCollapsed).toBe(false);
    });

    it('should set font size', () => {
      const store = useSettingsStore.getState();
      
      store.setFontSize('small');
      expect(store.uiPreferences.fontSize).toBe('small');
      
      store.setFontSize('large');
      expect(store.uiPreferences.fontSize).toBe('large');
    });

    it('should set message spacing', () => {
      const store = useSettingsStore.getState();
      
      store.setMessageSpacing('compact');
      expect(store.uiPreferences.messageSpacing).toBe('compact');
      
      store.setMessageSpacing('comfortable');
      expect(store.uiPreferences.messageSpacing).toBe('comfortable');
    });

    it('should set show timestamps', () => {
      const store = useSettingsStore.getState();
      
      store.setShowTimestamps(false);
      expect(store.uiPreferences.showTimestamps).toBe(false);
      
      store.setShowTimestamps(true);
      expect(store.uiPreferences.showTimestamps).toBe(true);
    });

    it('should reset UI preferences', () => {
      const store = useSettingsStore.getState();
      
      store.updateUIPreferences({
        sidebarCollapsed: true,
        fontSize: 'large',
        messageSpacing: 'compact',
        showTimestamps: false,
      });
      
      store.resetUIPreferences();
      
      expect(store.uiPreferences.sidebarCollapsed).toBe(false);
      expect(store.uiPreferences.fontSize).toBe('medium');
      expect(store.uiPreferences.messageSpacing).toBe('comfortable');
      expect(store.uiPreferences.showTimestamps).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should update keyboard shortcuts', () => {
      const store = useSettingsStore.getState();
      
      store.updateKeyboardShortcut('newChat', 'Ctrl+Shift+N');
      
      expect(store.getKeyboardShortcut('newChat')).toBe('Ctrl+Shift+N');
    });

    it('should get keyboard shortcuts', () => {
      const store = useSettingsStore.getState();
      
      expect(store.getKeyboardShortcut('newChat')).toBe('Ctrl+N');
      expect(store.getKeyboardShortcut('sendMessage')).toBe('Ctrl+Enter');
      expect(store.getKeyboardShortcut('nonexistent')).toBeUndefined();
    });

    it('should reset keyboard shortcuts', () => {
      const store = useSettingsStore.getState();
      
      store.updateKeyboardShortcut('newChat', 'Alt+N');
      expect(store.getKeyboardShortcut('newChat')).toBe('Alt+N');
      
      store.resetKeyboardShortcuts();
      expect(store.getKeyboardShortcut('newChat')).toBe('Ctrl+N');
    });
  });

  describe('General Settings', () => {
    it('should set first run flag', () => {
      const store = useSettingsStore.getState();
      
      expect(store.isFirstRun).toBe(false); // After resetAllSettings
      
      store.setFirstRun(true);
      expect(store.isFirstRun).toBe(true);
      
      store.setFirstRun(false);
      expect(store.isFirstRun).toBe(false);
    });

    it('should export settings', () => {
      const store = useSettingsStore.getState();
      
      store.setTheme('light');
      store.setApiKey('openai', 'test-key');
      store.updatePrivacySettings({ shareUsageData: true });
      store.updateUIPreferences({ fontSize: 'large' });
      
      const exported = store.exportSettings();
      
      expect(exported.theme).toBe('light');
      expect(exported.apiKeys.openai).toBe('test-key');
      expect(exported.privacySettings.shareUsageData).toBe(true);
      expect(exported.uiPreferences.fontSize).toBe('large');
    });

    it('should import settings', () => {
      const store = useSettingsStore.getState();
      
      const settingsToImport = {
        theme: 'light' as const,
        apiKeys: { openai: 'imported-key' },
        privacySettings: { shareUsageData: true, localProcessingOnly: false, saveConversations: true },
        uiPreferences: { sidebarCollapsed: true, fontSize: 'small' as const, messageSpacing: 'compact' as const, showTimestamps: false },
      };
      
      store.importSettings(settingsToImport);
      
      expect(store.theme).toBe('light');
      expect(store.getApiKey('openai')).toBe('imported-key');
      expect(store.privacySettings.shareUsageData).toBe(true);
      expect(store.uiPreferences.fontSize).toBe('small');
    });

    it('should reset all settings', () => {
      const store = useSettingsStore.getState();
      
      // Modify all settings
      store.setTheme('light');
      store.setApiKey('openai', 'test-key');
      store.updatePrivacySettings({ shareUsageData: true });
      store.updateUIPreferences({ fontSize: 'large' });
      store.setFirstRun(true);
      
      store.resetAllSettings();
      
      expect(store.theme).toBe('dark');
      expect(store.apiKeys).toEqual({});
      expect(store.privacySettings.shareUsageData).toBe(false);
      expect(store.uiPreferences.fontSize).toBe('medium');
      expect(store.isFirstRun).toBe(false);
    });
  });
});