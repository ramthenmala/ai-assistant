import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  ArrowLeft,
  Sparkles,
  Zap,
  Clock,
  CheckCircle
} from 'lucide-react';
import { SDLCNavigationMenu } from '@/components/navigation/SDLCNavigationMenu';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  categoryId?: string;
  modelUsed?: string;
  responseTime?: number;
}

interface ModelConfig {
  name: string;
  description: string;
  strength: string;
  isActive: boolean;
}

// Mock model configurations for different SDLC categories
const CATEGORY_MODELS: Record<string, ModelConfig[]> = {
  'planning': [
    { name: 'Claude 3.5 Sonnet', description: 'Best for analytical thinking', strength: 'Architecture & Planning', isActive: true },
    { name: 'GPT-4', description: 'Excellent reasoning', strength: 'Requirements Analysis', isActive: true },
    { name: 'GPT-4 Turbo', description: 'Fast responses', strength: 'Quick Planning', isActive: false }
  ],
  'development': [
    { name: 'GPT-4', description: 'Superior coding skills', strength: 'Code Generation', isActive: true },
    { name: 'Claude 3.5 Sonnet', description: 'Great for refactoring', strength: 'Code Review', isActive: true },
    { name: 'GPT-4 Turbo', description: 'Fast coding', strength: 'Rapid Prototyping', isActive: false }
  ],
  'testing': [
    { name: 'GPT-4', description: 'Comprehensive testing', strength: 'Test Coverage', isActive: true },
    { name: 'Claude 3.5 Sonnet', description: 'Edge case detection', strength: 'Quality Assurance', isActive: true },
    { name: 'GPT-3.5 Turbo', description: 'Quick test generation', strength: 'Unit Tests', isActive: false }
  ],
  'ui-ux': [
    { name: 'Claude 3.5 Sonnet', description: 'Design thinking', strength: 'User Experience', isActive: true },
    { name: 'GPT-4', description: 'Interface design', strength: 'UI Components', isActive: true },
    { name: 'GPT-4 Turbo', description: 'Rapid prototyping', strength: 'Quick Mockups', isActive: false }
  ],
  'documentation': [
    { name: 'Claude 3.5 Sonnet', description: 'Technical writing', strength: 'Documentation', isActive: true },
    { name: 'GPT-4', description: 'API documentation', strength: 'API Specs', isActive: true },
    { name: 'GPT-3.5 Turbo', description: 'Quick docs', strength: 'Code Comments', isActive: false }
  ],
  'deployment': [
    { name: 'GPT-4', description: 'DevOps expertise', strength: 'CI/CD Pipelines', isActive: true },
    { name: 'Claude 3.5 Sonnet', description: 'Infrastructure planning', strength: 'Cloud Architecture', isActive: true },
    { name: 'GPT-4 Turbo', description: 'Quick deployment', strength: 'Rapid Setup', isActive: false }
  ],
  'quality-assurance': [
    { name: 'Claude 3.5 Sonnet', description: 'Security analysis', strength: 'Code Security', isActive: true },
    { name: 'GPT-4', description: 'Performance optimization', strength: 'Code Quality', isActive: true },
    { name: 'GPT-4 Turbo', description: 'Quick audits', strength: 'Fast Review', isActive: false }
  ]
};

interface SDLCChatInterfaceProps {
  className?: string;
}

export function SDLCChatInterface({ className }: SDLCChatInterfaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(true);

  const activeModels = selectedCategory ? CATEGORY_MODELS[selectedCategory] || [] : [];

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowCategoryMenu(false);
    
    // Add a welcome message for the selected category
    const categoryNames = {
      'planning': 'Planning & Analysis',
      'development': 'Development',
      'testing': 'Testing',
      'ui-ux': 'UI/UX Design',
      'documentation': 'Documentation',
      'deployment': 'Deployment',
      'quality-assurance': 'Quality Assurance'
    };

    const welcomeMessage: Message = {
      id: Date.now().toString(),
      content: `Welcome to the ${categoryNames[categoryId as keyof typeof categoryNames]} workspace! I'm now optimized with the best AI models for ${categoryNames[categoryId as keyof typeof categoryNames].toLowerCase()} tasks. How can I help you today?`,
      role: 'assistant',
      timestamp: new Date(),
      categoryId,
      modelUsed: activeModels.find(m => m.isActive)?.name || 'AI Assistant'
    };

    setMessages([welcomeMessage]);
  }, [activeModels]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading || !selectedCategory) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date(),
      categoryId: selectedCategory
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response with appropriate model
    const primaryModel = activeModels.find(m => m.isActive);
    const responseTime = Math.random() * 2000 + 1000; // 1-3 seconds

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're working on ${selectedCategory.replace('-', ' ')} tasks. ${primaryModel ? `Using ${primaryModel.name} for optimal results.` : ''} Let me help you with that...

[This is a demo response. In a real implementation, this would be processed by the selected AI model optimized for ${selectedCategory.replace('-', ' ')} tasks.]`,
        role: 'assistant',
        timestamp: new Date(),
        categoryId: selectedCategory,
        modelUsed: primaryModel?.name || 'AI Assistant',
        responseTime: Math.round(responseTime)
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, responseTime);
  }, [inputMessage, isLoading, selectedCategory, activeModels]);

  const handleBackToMenu = () => {
    setShowCategoryMenu(true);
    setSelectedCategory(null);
    setMessages([]);
  };

  if (showCategoryMenu) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="flex-1 overflow-y-auto p-6">
          <SDLCNavigationMenu
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMenu}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Categories
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h2 className="text-lg font-semibold">
              {selectedCategory?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Assistant
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">
              {activeModels.filter(m => m.isActive).length} models active
            </span>
          </div>
        </div>
      </div>

      {/* Active Models Panel */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Active AI Models</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeModels.filter(m => m.isActive).map((model) => (
            <Badge key={model.name} variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {model.name}
              <span className="text-xs text-muted-foreground">• {model.strength}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] rounded-lg p-4",
                message.role === 'user' 
                  ? "bg-blue-600 text-white" 
                  : "bg-white border border-gray-200"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {message.role === 'user' ? 'You' : message.modelUsed || 'AI Assistant'}
                  </span>
                  {message.responseTime && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {message.responseTime}ms
                    </div>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="max-w-[80%] rounded-lg p-4 bg-white border border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {activeModels.find(m => m.isActive)?.name || 'AI'} is thinking...
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex items-center gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask about ${selectedCategory?.replace('-', ' ')} tasks...`}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}