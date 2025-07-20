import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Send, 
  Loader2, 
  Brain, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Target,
  Lightbulb,
  BookOpen,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import { IntelligentSDLCHeader } from '@/components/navigation/IntelligentSDLCHeader';
import { RAGContextCard } from '@/components/chat/RAGContextCard';
import { useSDLCIntegration } from '@/hooks/useSDLCIntegration';
import { useChatStore } from '@/stores/useChatStore';
import { useModelStore } from '@/stores/useModelStore';
import type { Message } from '@/types';

interface SDLCEnhancedChatWindowProps {
  chatId?: string;
  className?: string;
}

export function SDLCEnhancedChatWindow({ chatId, className }: SDLCEnhancedChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const {
    currentChatId,
    getChatById,
    addMessage,
    updateMessage,
    createChat
  } = useChatStore();

  const {
    sendMessage: sendToModel
  } = useModelStore();

  // SDLC Integration
  const {
    processMessage,
    selectCategory,
    toggleAutoRoute,
    currentRouting,
    selectedCategory,
    autoRouteEnabled,
    isProcessing,
    error: sdlcError,
    clearRouting,
    provideFeedback
  } = useSDLCIntegration();

  // Get current chat or create one
  const currentChat = currentChatId ? getChatById(currentChatId) : null;
  const messages = currentChat?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    const userMessage = message.trim();
    setMessage('');
    setIsGenerating(true);

    try {
      // Create chat if none exists
      let activeChatId = currentChatId;
      if (!activeChatId) {
        activeChatId = createChat('SDLC-Enhanced Chat');
      }

      // Add user message
      const userMessageId = addMessage(activeChatId, {
        content: userMessage,
        role: 'user'
      });

      // Process through SDLC system
      const {
        enhancedPrompt,
        selectedModel,
        routing,
        ragContext
      } = await processMessage(userMessage, messages);

      // Create assistant message placeholder
      const assistantMessageId = addMessage(activeChatId, {
        content: '',
        role: 'assistant',
        metadata: {
          sdlcRouting: routing,
          ragContext,
          model: selectedModel.id,
          isStreaming: true
        }
      });

      // Send to model with enhanced prompt
      let fullResponse = '';
      await sendToModel(selectedModel, enhancedPrompt, {
        onUpdate: (content) => {
          fullResponse = content;
          updateMessage(activeChatId, assistantMessageId, {
            content: fullResponse,
            metadata: {
              sdlcRouting: routing,
              ragContext,
              model: selectedModel.id,
              isStreaming: true
            }
          });
        },
        onComplete: (finalContent) => {
          fullResponse = finalContent;
          updateMessage(activeChatId, assistantMessageId, {
            content: fullResponse,
            metadata: {
              sdlcRouting: routing,
              ragContext,
              model: selectedModel.id,
              isStreaming: false,
              tokensUsed: finalContent.length // Approximate
            }
          });
        },
        onError: (error) => {
          updateMessage(activeChatId, assistantMessageId, {
            content: `Error: ${error.message}`,
            metadata: {
              sdlcRouting: routing,
              ragContext,
              model: selectedModel.id,
              isStreaming: false,
              hasError: true
            }
          });
        }
      });

    } catch (error) {
      console.error('Message processing error:', error);
      // Add error message
      if (currentChatId) {
        addMessage(currentChatId, {
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'assistant',
          metadata: {
            hasError: true
          }
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    message,
    isGenerating,
    currentChatId,
    messages,
    processMessage,
    sendToModel,
    createChat,
    addMessage,
    updateMessage
  ]);

  // Handle feedback
  const handleFeedback = useCallback(async (messageId: string, feedback: any) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.metadata?.sdlcRouting) {
      await provideFeedback(
        message.metadata.sdlcRouting.timestamp.toISOString(),
        feedback
      );
    }
  }, [messages, provideFeedback]);

  // Render message with SDLC enhancements
  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';
    const sdlcRouting = msg.metadata?.sdlcRouting;
    const ragContext = msg.metadata?.ragContext;
    const hasError = msg.metadata?.hasError;

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mb-4 flex",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <div className={cn(
          "max-w-[80%] rounded-lg p-4",
          isUser
            ? "bg-blue-600 text-white"
            : hasError
            ? "bg-red-50 border border-red-200"
            : "bg-white border border-gray-200"
        )}>
          {/* SDLC Routing Info (for assistant messages) */}
          {!isUser && sdlcRouting && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    SDLC Analysis
                  </span>
                </div>
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                >
                  {sdlcRouting.analysis.classification.categoryId}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-800">
                    {(sdlcRouting.analysis.classification.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-blue-800">
                    {sdlcRouting.analysis.classification.estimatedTime}min
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* RAG Context (if available) */}
          {!isUser && ragContext && ragContext.sources.length > 0 && (
            <div className="mb-3">
              <RAGContextCard
                query={ragContext.query || ''}
                sources={ragContext.sources}
                processingTime={ragContext.processingTime || 0}
                className="text-sm"
              />
            </div>
          )}

          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            {msg.metadata?.isStreaming ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Generating response...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            )}
          </div>

          {/* Error Indicator */}
          {hasError && (
            <div className="mt-2 flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">An error occurred</span>
            </div>
          )}

          {/* Best Practices & Tips (for assistant messages) */}
          {!isUser && sdlcRouting && sdlcRouting.analysis.bestPractices.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Best Practices</span>
              </div>
              <ul className="text-xs text-green-800 space-y-1">
                {sdlcRouting.analysis.bestPractices.slice(0, 3).map((practice, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-3 w-3 mt-0.5 text-green-600" />
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback Actions (for assistant messages) */}
          {!isUser && !msg.metadata?.isStreaming && (
            <div className="mt-3 flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFeedback(msg.id, { helpful: true })}
                className="text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Helpful
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFeedback(msg.id, { helpful: false })}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* SDLC Header */}
      <IntelligentSDLCHeader
        selectedCategory={selectedCategory}
        onCategorySelect={selectCategory}
        onAutoRouteToggle={toggleAutoRoute}
        autoRouteEnabled={autoRouteEnabled}
        routingResult={currentRouting}
        isProcessing={isProcessing}
      />

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI-Powered SDLC Assistant
            </h3>
            <p className="text-gray-600 max-w-md">
              Ask me anything about software development. I'll automatically route your questions 
              to the most suitable AI model and provide enhanced responses with relevant context.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">Planning & Analysis</Badge>
              <Badge variant="outline">Development</Badge>
              <Badge variant="outline">Testing</Badge>
              <Badge variant="outline">UI/UX</Badge>
              <Badge variant="outline">Documentation</Badge>
              <Badge variant="outline">Deployment</Badge>
              <Badge variant="outline">Quality Assurance</Badge>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* SDLC Error Display */}
      {sdlcError && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">SDLC Error: {sdlcError}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearRouting}
              className="ml-auto text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about planning, development, testing, deployment, or any SDLC topic..."
            disabled={isGenerating}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isGenerating || !message.trim()}
            className="flex items-center space-x-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{isGenerating ? 'Processing...' : 'Send'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}