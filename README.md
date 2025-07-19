# AI Chat Assistant

A modern, feature-rich AI chat application built with React, TypeScript, and Electron. This application provides an intuitive interface for AI conversations with advanced features like message editing, conversation branching, and cross-platform storage.

## 🚀 Features Implemented

### Core Chat Functionality
- **Interactive Chat Interface**: Clean, modern chat UI with real-time streaming responses
- **Message Editing**: Click-to-edit functionality for any message with version history
- **Message Versioning**: Track and revert to previous versions of edited messages
- **Conversation Branching**: Create and manage multiple conversation branches
- **Streaming Responses**: Real-time token-by-token message streaming from AI models

### Advanced Features
- **Multi-Model Support**: Switch between different AI models seamlessly
- **Chat History**: Persistent conversation history with search and organization
- **Theme System**: Dark/Light/System theme support with smooth transitions
- **Cross-Platform Storage**: SQLite for Electron, IndexedDB for web browsers
- **Navigation Sidebar**: Quick access to chat history and settings

### Technical Architecture
- **React 18+** with TypeScript for type safety
- **Zustand** for state management
- **Framer Motion** for smooth animations
- **Tailwind CSS** with shadcn/ui components
- **Vite** for fast development and building
- **Better-SQLite3** for desktop storage
- **Dexie.js** for web storage

## 🛠️ Development Progress

### ✅ Completed Features

1. **Storage Service Layer**
   - `SqliteStorageService` - Full SQLite implementation for Electron
   - `IndexedDBStorageService` - Complete IndexedDB implementation for web
   - `StorageFactory` - Platform detection and service instantiation
   - Schema management and migrations support

2. **AI Model Services**
   - `ModelService` - Abstract base class for AI model integration
   - `MockModelService` - Development/testing service with streaming simulation
   - `ModelManager` - Multi-model management and chat context handling
   - Streaming response handling with token-by-token display

3. **Core Components**
   - `MessageBubble` - Interactive message component with editing capabilities
   - `ChatWindow` - Main chat interface with streaming support
   - `ChatHistory` - Conversation history with search and organization
   - `NavigationSidebar` - App navigation and chat management
   - `ThemeToggle` - Theme switching with system preference detection

4. **UI Components**
   - Complete shadcn/ui component library integration
   - Custom animations using Framer Motion
   - Responsive design with Tailwind CSS
   - Accessibility features and keyboard navigation

### 🔄 In Progress

1. **Branch Visualization** - Visual representation of conversation trees
2. **Knowledge Management** - RAG (Retrieval Augmented Generation) support
3. **Settings Panel** - Configuration for themes, API keys, and models

## 📁 Project Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx           # Main chat interface
│   │   ├── MessageBubble.tsx        # Interactive message component
│   │   ├── ChatHistory.tsx          # Conversation history
│   │   ├── EditableMessage.tsx      # Message editing functionality
│   │   ├── BranchComparison.tsx     # Branch comparison view
│   │   └── ConversationTree.tsx     # Tree visualization
│   ├── ui/                          # shadcn/ui components
│   └── Layout.tsx                   # Main layout component
├── services/
│   ├── storage/
│   │   ├── BaseStorageService.ts    # Storage abstraction
│   │   ├── SqliteStorageService.ts  # SQLite implementation
│   │   ├── IndexedDBStorageService.ts # IndexedDB implementation
│   │   └── StorageFactory.ts        # Platform detection
│   ├── ModelService.ts              # AI model abstraction
│   └── ModelManager.ts              # Multi-model management
├── stores/
│   ├── useChatStore.ts             # Chat state management
│   ├── useModelStore.ts            # Model state management
│   └── useAppStore.ts              # App-wide state
├── types/
│   └── index.ts                    # TypeScript definitions
└── lib/
    ├── utils.ts                    # Utility functions
    └── animations.ts               # Framer Motion animations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd ai-chat-assistant

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Server
The application runs on `http://localhost:5173/` with hot module replacement enabled.

## 🔧 Technical Implementation Details

### Storage Architecture
- **Cross-Platform**: Automatically detects platform and uses appropriate storage
- **Schema Management**: Versioned database schema with migration support
- **Type Safety**: Full TypeScript support with generic type parameters
- **Performance**: Optimized queries with proper indexing

### AI Model Integration
- **Streaming Support**: Real-time token-by-token response display
- **Multi-Model**: Easy switching between different AI providers
- **Mock Service**: Development-friendly mock service for testing
- **Error Handling**: Robust error handling with retry mechanisms

### State Management
- **Zustand**: Lightweight state management with TypeScript support
- **Persistence**: Automatic state persistence to storage
- **Reactivity**: Efficient re-renders with selective subscriptions

### UI/UX Features
- **Responsive Design**: Works on desktop and mobile devices
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: WCAG compliant with keyboard navigation
- **Theme System**: Comprehensive dark/light/system theme support

## 🧪 Testing

### Mock Services
The application includes a comprehensive mock service system for development:
- `MockModelService` - Simulates AI responses with configurable delays
- Streaming simulation with word-by-word display
- Configurable response patterns for testing

### Development Tools
- TypeScript strict mode for compile-time error checking
- ESLint for code quality
- Prettier for consistent formatting
- Hot module replacement for fast development

## 🔮 Future Enhancements

### Planned Features
1. **Real AI Integration**: OpenAI, Claude, and other provider integrations
2. **Conversation Export**: Export chats in various formats
3. **Plugin System**: Extensible architecture for custom features
4. **Advanced Search**: Full-text search across conversation history
5. **Collaboration**: Multi-user chat support
6. **Voice Integration**: Speech-to-text and text-to-speech

### Technical Improvements
- Unit and integration testing with Jest/Vitest
- E2E testing with Playwright
- Performance optimization and virtual scrolling
- Offline support with service workers
- Desktop app packaging with Electron

## 🤝 Contributing

This project was developed as part of a comprehensive AI chat application. The codebase is well-structured and documented for easy extension and maintenance.

### Code Quality
- TypeScript strict mode enabled
- Comprehensive error handling
- Consistent code formatting
- Modular architecture with clear separation of concerns

## 📄 License

This project is open source and available under the MIT License.

---

**Note**: This application is currently in active development. The core functionality is complete and working, with additional features being added regularly.