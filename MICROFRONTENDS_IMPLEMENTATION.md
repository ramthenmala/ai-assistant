# Microfrontends Implementation Guide

## Overview
This guide details the transformation of the monolithic React application into a microfrontend architecture using Module Federation.

## Architecture Overview

```
ai-chat-microfrontends/
├── shell/                  # Host application
├── chat-mfe/              # Chat microfrontend
├── knowledge-mfe/         # Knowledge/RAG microfrontend
├── ats-mfe/              # ATS microfrontend
├── settings-mfe/         # Settings microfrontend
├── shared/               # Shared libraries
│   ├── ui-components/   # Common UI components
│   ├── utils/          # Shared utilities
│   └── state/         # Shared state management
└── infrastructure/      # Build and deployment configs
```

## 1. Shell Application (Host)

### Directory Structure
```
shell/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Navigation.tsx
│   │   └── ErrorBoundary.tsx
│   ├── routing/
│   │   └── AppRouter.tsx
│   ├── services/
│   │   ├── mfeLoader.ts
│   │   └── eventBus.ts
│   ├── store/
│   │   └── globalStore.ts
│   └── App.tsx
├── webpack.config.js
├── package.json
└── tsconfig.json
```

### Webpack Configuration: `shell/webpack.config.js`
```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;

module.exports = {
  mode: 'development',
  devServer: {
    port: 3000,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        chat: 'chat@http://localhost:3001/remoteEntry.js',
        knowledge: 'knowledge@http://localhost:3002/remoteEntry.js',
        ats: 'ats@http://localhost:3003/remoteEntry.js',
        settings: 'settings@http://localhost:3004/remoteEntry.js',
      },
      shared: {
        react: { 
          singleton: true, 
          requiredVersion: deps.react,
          eager: true 
        },
        'react-dom': { 
          singleton: true, 
          requiredVersion: deps['react-dom'],
          eager: true 
        },
        'react-router-dom': { 
          singleton: true,
          requiredVersion: deps['react-router-dom']
        },
        zustand: { 
          singleton: true,
          requiredVersion: deps.zustand 
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
```

### Shell Application: `shell/src/App.tsx`
```typescript
import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AppRouter } from './routing/AppRouter';
import { GlobalStoreProvider } from './store/globalStore';
import { MFELoader } from './services/mfeLoader';
import './index.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <GlobalStoreProvider>
        <BrowserRouter>
          <MFELoader>
            <Layout>
              <Suspense fallback={<div>Loading...</div>}>
                <AppRouter />
              </Suspense>
            </Layout>
          </MFELoader>
        </BrowserRouter>
      </GlobalStoreProvider>
    </ErrorBoundary>
  );
};

export default App;
```

### MFE Loader Service: `shell/src/services/mfeLoader.ts`
```typescript
import React, { useEffect, useState } from 'react';
import { eventBus } from './eventBus';

interface MFEConfig {
  name: string;
  url: string;
  scope: string;
  module: string;
}

const mfeConfigs: MFEConfig[] = [
  {
    name: 'chat',
    url: process.env.REACT_APP_CHAT_MFE_URL || 'http://localhost:3001',
    scope: 'chat',
    module: './ChatApp'
  },
  {
    name: 'knowledge',
    url: process.env.REACT_APP_KNOWLEDGE_MFE_URL || 'http://localhost:3002',
    scope: 'knowledge',
    module: './KnowledgeApp'
  },
  // Add other MFEs
];

export class MFELoader {
  private loadedScripts: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  async loadMFE(config: MFEConfig): Promise<any> {
    const scriptId = `mfe-${config.name}`;
    
    if (this.loadedScripts.has(scriptId)) {
      return this.getMFEModule(config);
    }

    if (this.loadingPromises.has(scriptId)) {
      await this.loadingPromises.get(scriptId);
      return this.getMFEModule(config);
    }

    const loadPromise = this.loadScript(config, scriptId);
    this.loadingPromises.set(scriptId, loadPromise);
    
    try {
      await loadPromise;
      this.loadedScripts.add(scriptId);
      return this.getMFEModule(config);
    } finally {
      this.loadingPromises.delete(scriptId);
    }
  }

  private async loadScript(config: MFEConfig, scriptId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `${config.url}/remoteEntry.js`;
      script.async = true;

      script.onload = () => {
        console.log(`MFE ${config.name} loaded successfully`);
        eventBus.emit('mfe:loaded', { name: config.name });
        resolve();
      };

      script.onerror = () => {
        console.error(`Failed to load MFE ${config.name}`);
        eventBus.emit('mfe:error', { name: config.name, error: 'Script load failed' });
        reject(new Error(`Failed to load MFE ${config.name}`));
      };

      document.head.appendChild(script);
    });
  }

  private async getMFEModule(config: MFEConfig): Promise<any> {
    try {
      // @ts-ignore
      await __webpack_init_sharing__('default');
      // @ts-ignore
      const container = window[config.scope];
      // @ts-ignore
      await container.init(__webpack_share_scopes__.default);
      // @ts-ignore
      const factory = await container.get(config.module);
      return factory();
    } catch (error) {
      console.error(`Error loading module from MFE ${config.name}:`, error);
      throw error;
    }
  }
}

// React Hook for loading MFEs
export const useMFE = (name: string) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loader = new MFELoader();
    const config = mfeConfigs.find(c => c.name === name);

    if (!config) {
      setError(new Error(`MFE ${name} not found`));
      setLoading(false);
      return;
    }

    loader.loadMFE(config)
      .then(module => {
        setComponent(() => module.default || module);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [name]);

  return { Component, error, loading };
};
```

### Event Bus for Cross-MFE Communication: `shell/src/services/eventBus.ts`
```typescript
type EventHandler = (data: any) => void;

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(handler);
    };
  }

  emit(event: string, data?: any): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  once(event: string, handler: EventHandler): void {
    const onceHandler = (data: any) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.events.delete(event);
    } else {
      this.events.get(event)?.delete(handler);
    }
  }
}

export const eventBus = new EventBus();

// Typed event system
export interface MFEEvents {
  'chat:message': { conversationId: string; message: any };
  'knowledge:document-added': { documentId: string };
  'settings:updated': { setting: string; value: any };
  'navigation:route-change': { path: string };
}

export class TypedEventBus extends EventBus {
  on<K extends keyof MFEEvents>(
    event: K,
    handler: (data: MFEEvents[K]) => void
  ): () => void {
    return super.on(event, handler);
  }

  emit<K extends keyof MFEEvents>(event: K, data: MFEEvents[K]): void {
    super.emit(event, data);
  }
}

export const typedEventBus = new TypedEventBus();
```

### App Router: `shell/src/routing/AppRouter.tsx`
```typescript
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useMFE } from '../services/mfeLoader';

// Lazy load MFEs
const ChatMFE = lazy(() => import('chat/ChatApp'));
const KnowledgeMFE = lazy(() => import('knowledge/KnowledgeApp'));
const ATSMFE = lazy(() => import('ats/ATSApp'));
const SettingsMFE = lazy(() => import('settings/SettingsApp'));

// Fallback component for MFE loading errors
const MFEErrorFallback: React.FC<{ name: string }> = ({ name }) => (
  <div className="p-4 bg-red-50 text-red-700 rounded">
    <h3>Failed to load {name} module</h3>
    <p>Please try refreshing the page or contact support.</p>
  </div>
);

// Dynamic MFE Route Component
const MFERoute: React.FC<{ name: string }> = ({ name }) => {
  const { Component, error, loading } = useMFE(name);

  if (loading) {
    return <div>Loading {name}...</div>;
  }

  if (error || !Component) {
    return <MFEErrorFallback name={name} />;
  }

  return <Component />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" />} />
      <Route path="/chat/*" element={<MFERoute name="chat" />} />
      <Route path="/knowledge/*" element={<MFERoute name="knowledge" />} />
      <Route path="/ats/*" element={<MFERoute name="ats" />} />
      <Route path="/settings/*" element={<MFERoute name="settings" />} />
    </Routes>
  );
};
```

## 2. Chat Microfrontend

### Directory Structure
```
chat-mfe/
├── src/
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageList.tsx
│   │   └── ChatInput.tsx
│   ├── services/
│   │   └── chatService.ts
│   ├── store/
│   │   └── chatStore.ts
│   ├── ChatApp.tsx
│   └── bootstrap.tsx
├── webpack.config.js
└── package.json
```

### Chat MFE Webpack Config: `chat-mfe/webpack.config.js`
```javascript
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;

module.exports = {
  mode: 'development',
  devServer: {
    port: 3001,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'chat',
      filename: 'remoteEntry.js',
      exposes: {
        './ChatApp': './src/ChatApp',
        './ChatWindow': './src/components/ChatWindow',
        './chatStore': './src/store/chatStore',
      },
      shared: {
        react: { 
          singleton: true, 
          requiredVersion: deps.react 
        },
        'react-dom': { 
          singleton: true, 
          requiredVersion: deps['react-dom'] 
        },
        zustand: { 
          singleton: true,
          requiredVersion: deps.zustand 
        },
        '@shared/ui': {
          singleton: true,
          import: '@shared/ui',
          requiredVersion: deps['@shared/ui']
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};
```

### Chat App Component: `chat-mfe/src/ChatApp.tsx`
```typescript
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ChatContainer } from './components/ChatContainer';
import { ChatHistory } from './components/ChatHistory';
import { useChatStore } from './store/chatStore';
import { eventBus } from '@shared/events';

const ChatApp: React.FC = () => {
  const { setActiveConversation } = useChatStore();

  useEffect(() => {
    // Listen for cross-MFE events
    const unsubscribe = eventBus.on('navigation:chat-conversation', (data) => {
      setActiveConversation(data.conversationId);
    });

    return unsubscribe;
  }, [setActiveConversation]);

  return (
    <div className="chat-mfe-container h-full">
      <Routes>
        <Route path="/" element={<ChatContainer />} />
        <Route path="/history" element={<ChatHistory />} />
        <Route path="/conversation/:id" element={<ChatContainer />} />
      </Routes>
    </div>
  );
};

export default ChatApp;
```

### Chat Store with Cross-MFE State: `chat-mfe/src/store/chatStore.ts`
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { eventBus } from '@shared/events';

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  conversations: Map<string, Message[]>;
  activeConversationId: string | null;
  isLoading: boolean;
  
  // Actions
  addMessage: (message: Message) => void;
  setActiveConversation: (id: string) => void;
  clearConversation: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: new Map(),
      activeConversationId: null,
      isLoading: false,

      addMessage: (message) => {
        set((state) => {
          const conversations = new Map(state.conversations);
          const messages = conversations.get(message.conversationId) || [];
          conversations.set(message.conversationId, [...messages, message]);
          
          // Emit event for other MFEs
          eventBus.emit('chat:message', {
            conversationId: message.conversationId,
            message
          });
          
          return { conversations };
        });
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        eventBus.emit('chat:conversation-changed', { conversationId: id });
      },

      clearConversation: (id) => {
        set((state) => {
          const conversations = new Map(state.conversations);
          conversations.delete(id);
          return { conversations };
        });
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: Array.from(state.conversations.entries()),
        activeConversationId: state.activeConversationId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.conversations)) {
          state.conversations = new Map(state.conversations);
        }
      },
    }
  )
);
```

## 3. Shared UI Components Library

### Directory Structure
```
shared/ui-components/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── hooks/
│   ├── utils/
│   └── index.ts
├── webpack.config.js
└── package.json
```

### Shared Components Webpack Config: `shared/ui-components/webpack.config.js`
```javascript
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shared_ui',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button',
        './Card': './src/components/Card',
        './Modal': './src/components/Modal',
        './hooks': './src/hooks',
        './utils': './src/utils',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'tailwindcss': { singleton: true },
      },
    }),
  ],
};
```

### Shared Button Component: `shared/ui-components/src/components/Button/Button.tsx`
```typescript
import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
      ghost: 'hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

## 4. State Management Across MFEs

### Global State Manager: `shell/src/store/globalStore.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { eventBus } from '../services/eventBus';

interface User {
  id: string;
  name: string;
  email: string;
}

interface GlobalState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
  
  // Actions
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      notifications: [],

      setUser: (user) => {
        set({ user });
        // Broadcast to all MFEs
        eventBus.emit('global:user-changed', { user });
      },

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
        eventBus.emit('global:theme-changed', { theme });
      },

      addNotification: (notification) => {
        set((state) => ({
          notifications: [...state.notifications, notification]
        }));
      },
    }),
    {
      name: 'global-storage',
    }
  )
);

// Make global store available to all MFEs
if (typeof window !== 'undefined') {
  (window as any).__GLOBAL_STORE__ = useGlobalStore;
}
```

### Cross-MFE State Synchronization: `shared/state/src/syncStore.ts`
```typescript
import { StoreApi } from 'zustand';
import { eventBus } from '@shared/events';

export function createSyncedStore<T extends object>(
  storeName: string,
  createStore: () => StoreApi<T>
): StoreApi<T> {
  const store = createStore();
  
  // Subscribe to store changes
  store.subscribe((state, prevState) => {
    // Emit state changes
    eventBus.emit(`store:${storeName}:changed`, {
      state,
      prevState,
      timestamp: Date.now()
    });
  });

  // Listen for state changes from other MFEs
  eventBus.on(`store:${storeName}:sync`, (data) => {
    if (data.source !== window.location.origin) {
      store.setState(data.state);
    }
  });

  return store;
}

// Usage in MFE
export const useSyncedChatStore = create<ChatState>()(
  createSyncedStore('chat', () =>
    create<ChatState>((set) => ({
      // ... store implementation
    }))
  )
);
```

## 5. Build and Deployment

### Nx Monorepo Configuration: `nx.json`
```json
{
  "npmScope": "ai-assistant",
  "affected": {
    "defaultBase": "main"
  },
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "libs"
  },
  "implicitDependencies": {
    "package.json": "*",
    "tsconfig.base.json": "*"
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "dependsOn": ["^build"]
    }
  },
  "generators": {
    "@nx/react": {
      "application": {
        "style": "css",
        "linter": "eslint",
        "bundler": "webpack"
      }
    }
  }
}
```

### Docker Compose for MFEs: `docker-compose.mfe.yml`
```yaml
version: '3.8'

services:
  shell:
    build:
      context: ./shell
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_CHAT_MFE_URL=http://chat-mfe:80
      - REACT_APP_KNOWLEDGE_MFE_URL=http://knowledge-mfe:80
      - REACT_APP_ATS_MFE_URL=http://ats-mfe:80
      - REACT_APP_SETTINGS_MFE_URL=http://settings-mfe:80
    depends_on:
      - chat-mfe
      - knowledge-mfe
      - ats-mfe
      - settings-mfe

  chat-mfe:
    build:
      context: ./chat-mfe
      dockerfile: Dockerfile
    environment:
      - REACT_APP_API_URL=http://api-gateway:3000
    
  knowledge-mfe:
    build:
      context: ./knowledge-mfe
      dockerfile: Dockerfile
    environment:
      - REACT_APP_API_URL=http://api-gateway:3000

  ats-mfe:
    build:
      context: ./ats-mfe
      dockerfile: Dockerfile
    environment:
      - REACT_APP_API_URL=http://api-gateway:3000

  settings-mfe:
    build:
      context: ./settings-mfe
      dockerfile: Dockerfile
    environment:
      - REACT_APP_API_URL=http://api-gateway:3000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - shell
```

### Nginx Configuration for MFEs: `nginx/nginx.conf`
```nginx
events {
  worker_connections 1024;
}

http {
  upstream shell {
    server shell:80;
  }

  upstream chat_mfe {
    server chat-mfe:80;
  }

  upstream knowledge_mfe {
    server knowledge-mfe:80;
  }

  upstream ats_mfe {
    server ats-mfe:80;
  }

  upstream settings_mfe {
    server settings-mfe:80;
  }

  server {
    listen 80;
    server_name localhost;

    # Enable CORS for MFE resources
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;

    # Shell application
    location / {
      proxy_pass http://shell;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    # MFE remote entries
    location ~ ^/mfe/chat/(.*)$ {
      proxy_pass http://chat_mfe/$1;
      proxy_set_header Host $host;
    }

    location ~ ^/mfe/knowledge/(.*)$ {
      proxy_pass http://knowledge_mfe/$1;
      proxy_set_header Host $host;
    }

    location ~ ^/mfe/ats/(.*)$ {
      proxy_pass http://ats_mfe/$1;
      proxy_set_header Host $host;
    }

    location ~ ^/mfe/settings/(.*)$ {
      proxy_pass http://settings_mfe/$1;
      proxy_set_header Host $host;
    }
  }
}
```

## 6. Testing Strategy

### MFE Integration Tests: `tests/integration/mfe-integration.test.ts`
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MFETestHarness } from './utils/MFETestHarness';

describe('MFE Integration', () => {
  let harness: MFETestHarness;

  beforeEach(() => {
    harness = new MFETestHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  test('Shell loads Chat MFE successfully', async () => {
    const { container } = harness.renderShell();
    
    // Navigate to chat
    act(() => {
      window.history.pushState({}, '', '/chat');
    });

    await waitFor(() => {
      expect(screen.getByTestId('chat-mfe')).toBeInTheDocument();
    });
  });

  test('Cross-MFE communication works', async () => {
    const { eventBus } = harness.renderWithAllMFEs();
    
    const messageHandler = jest.fn();
    eventBus.on('chat:message', messageHandler);

    // Simulate message from Chat MFE
    act(() => {
      eventBus.emit('chat:message', {
        conversationId: '123',
        message: { content: 'Test message' }
      });
    });

    expect(messageHandler).toHaveBeenCalledWith({
      conversationId: '123',
      message: { content: 'Test message' }
    });
  });

  test('MFE fails gracefully when remote is unavailable', async () => {
    harness.mockMFEFailure('chat');
    
    const { container } = harness.renderShell();
    
    act(() => {
      window.history.pushState({}, '', '/chat');
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load chat module/)).toBeInTheDocument();
    });
  });
});
```

## 7. Development Workflow

### Local Development Setup Script: `scripts/setup-dev.sh`
```bash
#!/bin/bash

echo "Setting up Microfrontend Development Environment..."

# Install dependencies for all MFEs
echo "Installing dependencies..."
npm install -g nx
npx lerna bootstrap

# Start all MFEs in development mode
echo "Starting MFEs..."
npx nx run-many --target=serve --all --parallel

# Open browser
echo "Opening browser..."
open http://localhost:3000
```

### MFE Development Guidelines

1. **Independent Development**
   - Each MFE can be developed and tested independently
   - Use the standalone mode for isolated development
   - Mock external dependencies when needed

2. **Shared Dependencies**
   - Use Module Federation's shared scope for common dependencies
   - Version align critical dependencies (React, routing, state management)
   - Use semantic versioning for shared libraries

3. **Cross-MFE Communication**
   - Use event bus for loose coupling
   - Define clear event contracts
   - Document all cross-MFE interactions

4. **State Management**
   - Keep MFE-specific state local
   - Use global store only for truly shared state
   - Implement state synchronization carefully

5. **Testing**
   - Unit test each MFE independently
   - Integration test cross-MFE scenarios
   - E2E test critical user journeys

6. **Performance**
   - Lazy load MFEs on demand
   - Implement proper code splitting
   - Monitor bundle sizes
   - Use webpack bundle analyzer

## Best Practices

1. **Module Boundaries**
   - Define clear interfaces between MFEs
   - Avoid direct dependencies between MFEs
   - Use TypeScript for type safety across boundaries

2. **Error Handling**
   - Implement error boundaries in each MFE
   - Graceful degradation when MFEs fail
   - User-friendly error messages

3. **Versioning**
   - Version each MFE independently
   - Use feature flags for gradual rollouts
   - Maintain backward compatibility

4. **Security**
   - Implement CSP headers
   - Sanitize cross-MFE messages
   - Validate all inputs from other MFEs

5. **Monitoring**
   - Track MFE load times
   - Monitor cross-MFE communication
   - Log errors with context