import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Bot, 
  Zap, 
  Settings, 
  Play, 
  Pause,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { ModelManager } from '../../services/ModelManager';
import { createDefaultModel, createModelConfig } from '../../services/ModelService';
import { ResilienceHandler } from '../../services/RetryHandler';
import type { AIModel, ModelConfig } from '../../types';
import type { ChatContext, SendMessageOptions } from '../../services/ModelManager';

interface ModelServiceDemoProps {
  className?: string;
}

interface TestMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
}

interface ModelTestResult {
  modelId: string;
  success: boolean;
  responseTime: number;
  tokenCount?: number;
  error?: string;
}

export function ModelServiceDemo({ className }: ModelServiceDemoProps) {
  const [modelManager] = useState(() => new ModelManager());
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<ModelTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [resilienceHandler] = useState(() => new ResilienceHandler());
  
  // Configuration state
  const [config, setConfig] = useState<ModelConfig>({
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  });

  // Initialize demo with available models
  useEffect(() => {
    const initializeDemo = async () => {
      try {
        // Add mock model
        const mockModel = createDefaultModel('mock', 'Demo Assistant');
        await modelManager.addModel(mockModel, createModelConfig());
        
        // Add OpenAI model if API key is available
        if (localStorage.getItem('openai_api_key')) {
          const openaiModel = createDefaultModel('openai', 'gpt-3.5-turbo');
          const openaiConfig = createModelConfig({
            apiKey: localStorage.getItem('openai_api_key')!
          });
          await modelManager.addModel(openaiModel, openaiConfig);
        }
        
        // Add Anthropic model if API key is available
        if (localStorage.getItem('anthropic_api_key')) {
          const anthropicModel = createDefaultModel('anthropic', 'claude-3-sonnet-20240229');
          const anthropicConfig = createModelConfig({
            apiKey: localStorage.getItem('anthropic_api_key')!
          });
          await modelManager.addModel(anthropicModel, anthropicConfig);
        }
        
        // Update available models list
        const models = [
          mockModel,
          ...(localStorage.getItem('openai_api_key') ? [createDefaultModel('openai', 'gpt-3.5-turbo')] : []),
          ...(localStorage.getItem('anthropic_api_key') ? [createDefaultModel('anthropic', 'claude-3-sonnet-20240229')] : [])
        ];
        
        setAvailableModels(models);
        setSelectedModel(models[0]?.id || '');
      } catch (error) {
        console.error('Failed to initialize demo:', error);
      }
    };

    initializeDemo();
  }, [modelManager]);

  // Send message handler
  const handleSendMessage = useCallback(async (stream: boolean = false) => {
    if (!currentMessage.trim() || !selectedModel) return;
    
    const userMessage: TestMessage = {
      id: `msg-${Date.now()}`,
      content: currentMessage,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsStreaming(stream);
    
    const assistantMessage: TestMessage = {
      id: `msg-${Date.now()}-assistant`,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: stream
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    if (stream) {
      setStreamingMessageId(assistantMessage.id);
    }
    
    try {
      const selectedModelObj = availableModels.find(m => m.id === selectedModel);
      if (!selectedModelObj) {
        throw new Error('Selected model not found');
      }
      
      const chatContext: ChatContext = {
        chatId: 'demo-chat',
        messages: messages.map(m => ({
          id: m.id,
          content: m.content,
          role: m.role,
          timestamp: m.timestamp,
          isEdited: false
        })),
        activeModel: selectedModelObj,
        knowledgeStacks: []
      };
      
      const options: SendMessageOptions = {
        stream,
        onStreamUpdate: stream ? (messageId: string, content: string) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content } 
                : msg
            )
          );
        } : undefined,
        onComplete: (messageId: string, response: any) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: response.content, isStreaming: false } 
                : msg
            )
          );
          setIsStreaming(false);
          setStreamingMessageId(null);
        },
        onError: (messageId: string, error: Error) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, error: error.message, isStreaming: false } 
                : msg
            )
          );
          setIsStreaming(false);
          setStreamingMessageId(null);
        }
      };
      
      await modelManager.sendMessage(chatContext, currentMessage, options);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, error: (error as Error).message, isStreaming: false } 
            : msg
        )
      );
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  }, [currentMessage, selectedModel, messages, availableModels, modelManager]);

  // Run performance tests
  const runPerformanceTests = useCallback(async () => {
    if (!selectedModel) return;
    
    setIsRunningTests(true);
    setTestResults([]);
    
    const testMessages = [
      'Hello, how are you?',
      'What is the capital of France?',
      'Explain quantum computing in simple terms.',
      'Write a short poem about artificial intelligence.',
      'What are the benefits of renewable energy?'
    ];
    
    const results: ModelTestResult[] = [];
    
    for (const testMessage of testMessages) {
      try {
        const startTime = Date.now();
        const selectedModelObj = availableModels.find(m => m.id === selectedModel);
        if (!selectedModelObj) continue;
        
        const chatContext: ChatContext = {
          chatId: 'test-chat',
          messages: [],
          activeModel: selectedModelObj,
          knowledgeStacks: []
        };
        
        await modelManager.sendMessage(chatContext, testMessage, { stream: false });
        
        const responseTime = Date.now() - startTime;
        results.push({
          modelId: selectedModel,
          success: true,
          responseTime,
          tokenCount: testMessage.length // Simplified token count
        });
      } catch (error) {
        results.push({
          modelId: selectedModel,
          success: false,
          responseTime: 0,
          error: (error as Error).message
        });
      }
    }
    
    setTestResults(results);
    setIsRunningTests(false);
  }, [selectedModel, availableModels, modelManager]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setStreamingMessageId(null);
    setIsStreaming(false);
  }, []);

  // Update configuration
  const updateConfig = useCallback((key: keyof ModelConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className={cn('w-full max-w-6xl mx-auto space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Model Service Demo
          </CardTitle>
          <CardDescription>
            Test and interact with different AI models through the unified service interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">Chat Interface</TabsTrigger>
              <TabsTrigger value="tests">Performance Tests</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="space-y-4">
              {/* Model Selection */}
              <div className="flex items-center gap-4">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{model.provider}</Badge>
                          {model.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearConversation}
                  disabled={isStreaming}
                >
                  Clear Chat
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Resilience Status:
                  </span>
                  <Badge variant="outline">
                    {resilienceHandler.getStatus().circuitBreakerState}
                  </Badge>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="border rounded-lg p-4 min-h-[400px] max-h-[500px] overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    Start a conversation with the AI model
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        'p-3 rounded-lg max-w-[80%]',
                        message.role === 'user' 
                          ? 'bg-blue-50 ml-auto' 
                          : 'bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {message.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {message.isStreaming && (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span className="text-xs">Streaming...</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm">
                        {message.error ? (
                          <div className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            {message.error}
                          </div>
                        ) : (
                          message.content || (message.isStreaming ? 'Thinking...' : 'No response')
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Chat Input */}
              <div className="flex gap-2">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(false);
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleSendMessage(false)}
                    disabled={!currentMessage.trim() || isStreaming || !selectedModel}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                  <Button
                    onClick={() => handleSendMessage(true)}
                    disabled={!currentMessage.trim() || isStreaming || !selectedModel}
                    variant="outline"
                    size="sm"
                  >
                    <Zap className="h-4 w-4" />
                    Stream
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="tests" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Performance Tests</h3>
                  <p className="text-sm text-muted-foreground">
                    Run automated tests to measure model performance
                  </p>
                </div>
                <Button
                  onClick={runPerformanceTests}
                  disabled={isRunningTests || !selectedModel}
                >
                  {isRunningTests ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Tests
                </Button>
              </div>
              
              {testResults.length > 0 && (
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium">
                            Test {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {result.success ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {result.responseTime}ms
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {result.tokenCount} tokens
                              </div>
                            </>
                          ) : (
                            <span className="text-red-600">{result.error}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Test Summary */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Test Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="ml-2 font-medium">
                          {Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Response Time:</span>
                        <span className="ml-2 font-medium">
                          {Math.round(testResults.reduce((acc, r) => acc + r.responseTime, 0) / testResults.length)}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Tests:</span>
                        <span className="ml-2 font-medium">{testResults.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="config" className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Model Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Temperature</label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Tokens</label>
                    <Input
                      type="number"
                      min="1"
                      max="4096"
                      value={config.maxTokens}
                      onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Top P</label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.topP}
                      onChange={(e) => updateConfig('topP', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Frequency Penalty</label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.frequencyPenalty}
                      onChange={(e) => updateConfig('frequencyPenalty', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">API Keys</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  API keys are stored locally and used for testing real models
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={localStorage.getItem('openai_api_key') || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          localStorage.setItem('openai_api_key', e.target.value);
                        } else {
                          localStorage.removeItem('openai_api_key');
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Anthropic API Key</label>
                    <Input
                      type="password"
                      placeholder="sk-ant-..."
                      value={localStorage.getItem('anthropic_api_key') || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          localStorage.setItem('anthropic_api_key', e.target.value);
                        } else {
                          localStorage.removeItem('anthropic_api_key');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}