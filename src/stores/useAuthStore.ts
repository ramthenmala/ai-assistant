import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicClientApplication } from '@azure/msal-browser';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithMicrosoft: (msalInstance: PublicClientApplication) => Promise<boolean>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<boolean>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
}

// Demo user for testing
const DEMO_USER: User = {
  id: '1',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
};

const DEMO_PASSWORD = 'demo123!';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Demo login logic
        if (email === DEMO_USER.email && password === DEMO_PASSWORD) {
          set({ user: DEMO_USER, isAuthenticated: true });
          return true;
        }
        return false;
      },

      loginWithMicrosoft: async (msalInstance: PublicClientApplication) => {
        try {
          const { loginRequest } = await import('../config/msalConfig');
          const loginResponse = await msalInstance.loginPopup(loginRequest);
          
          if (loginResponse && loginResponse.account) {
            const account = loginResponse.account;
            const user: User = {
              id: account.homeAccountId,
              email: account.username,
              firstName: (account.idTokenClaims?.given_name as string) || '',
              lastName: (account.idTokenClaims?.family_name as string) || '',
              avatar: account.idTokenClaims?.picture as string | undefined,
            };
            
            set({ user, isAuthenticated: true });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Microsoft login error:', error);
          return false;
        }
      },

      register: async (userData) => {
        // Demo registration - in real app, this would call an API
        console.log('Registration attempt:', userData);
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      verifyEmail: async (code: string) => {
        // Demo verification - accept any 6-digit code
        if (code.length === 6 && /^\d+$/.test(code)) {
          // After successful verification, log the user in
          set({ user: DEMO_USER, isAuthenticated: true });
          return true;
        }
        return false;
      },

      forgotPassword: async (email: string) => {
        // Demo forgot password - just simulate success
        console.log('Password reset requested for:', email);
        return true;
      },

      resetPassword: async (token: string, newPassword: string) => {
        // Demo reset password - just simulate success
        console.log('Password reset with token:', token, 'new password length:', newPassword.length);
        return true;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);