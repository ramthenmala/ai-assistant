// Main application store - placeholder for future implementation
import { create } from 'zustand';

interface AppState {
  isLoading: boolean;
  error: string | null;
  platform: 'web' | 'electron';
}

interface AppActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPlatform: (platform: 'web' | 'electron') => void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  // State
  isLoading: false,
  error: null,
  platform: typeof window !== 'undefined' && window.electronAPI ? 'electron' : 'web',
  
  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setPlatform: (platform) => set({ platform }),
}));