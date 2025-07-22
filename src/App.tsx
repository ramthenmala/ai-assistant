import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Button } from './components/ui/button';
import { themeUtils } from './lib/utils';
import { Database } from 'lucide-react';
import { StorageInitializer } from './services/storage/StorageInitializer';
import { useModelStore } from './stores/useModelStore';
import { useChatStore } from './stores/useChatStore';
import { usePromptStore } from './stores/usePromptStore';
import { useKnowledgeStore } from './stores/useKnowledgeStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useSDLCStore } from './stores/useSDLCStore';

// Pages
import { HomePage } from './pages/HomePage';
import { UserProfilePage } from './pages/UserProfilePage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { PasswordChangePage } from './pages/PasswordChangePage';
import { 
  LoginPage, 
  RegisterPage, 
  VerifyEmailPage, 
  ForgotPasswordPage, 
  ResetPasswordPage 
} from './pages';

// Components
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RAGDemo } from './components/demo/RAGDemo';

function App() {
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  
  // Initialize stores
  const { loadDefaultModels } = useModelStore();
  const { createChat } = useChatStore();
  const { initializeDefaultPrompts } = usePromptStore();
  const { initializeServices } = useKnowledgeStore();
  const { getSettings } = useSettingsStore();
  const { initializeServices: initSDLCServices } = useSDLCStore();

  // Initialize theme and storage
  useEffect(() => {
    themeUtils.initTheme();
    
    // Initialize storage services
    StorageInitializer.initialize()
      .then(() => {
        setStorageInitialized(true);
        console.log('Storage services initialized successfully');
        
        // Initialize default models and create a default chat
        loadDefaultModels();
        createChat('Multi-Model Chat');
        initializeDefaultPrompts();
        
        // Initialize knowledge services if settings are available
        const currentSettings = getSettings();
        if (currentSettings) {
          initializeServices(currentSettings);
          initSDLCServices(currentSettings);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize storage services:', error);
        setStorageError(error.message);
      });
  }, [loadDefaultModels, createChat, initializeDefaultPrompts, initializeServices, initSDLCServices, getSettings]);
  
  // Initialize knowledge services when settings change
  useEffect(() => {
    if (storageInitialized) {
      const currentSettings = getSettings();
      if (currentSettings) {
        initializeServices(currentSettings);
        initSDLCServices(currentSettings);
      }
    }
  }, [storageInitialized, initializeServices, initSDLCServices, getSettings]);

  if (!storageInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Database className="h-6 w-6" />
            {storageError ? (
              <span className="text-red-600">Storage Error: {storageError}</span>
            ) : (
              <span className="text-yellow-600">Initializing...</span>
            )}
          </div>
          {storageError && (
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><PasswordChangePage /></ProtectedRoute>} />
        <Route path="/rag-demo" element={<ProtectedRoute><RAGDemo /></ProtectedRoute>} />
        
        {/* Redirect all unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;