import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatWindow } from './ChatWindow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, ArrowLeftRight, MessageSquare, Settings, BarChart3, Zap, Clock, DollarSign, Loader2 } from 'lucide-react';
import { ChatInput } from './ChatInput';
import { MessageProps } from './MessageBubble';
import { multiModelService, type MultiModelResponse, type ModelComparisonResult } from '@/services/MultiModelService';
import { useModelStore } from '@/stores/useModelStore';
import { useChatStore } from '@/stores/useChatStore';
import type { AIModel, Chat, Message } from '@/types';

interface ModelConfig {
  id: string;
  name: string;
  model: AIModel;
  messages: Message[];
  isActive: boolean;
  lastResponse?: MultiModelResponse;
}

interface SplitChatContainerProps {
  className?: string;
}

export function SplitChatContainer({
  className
}: SplitChatContainerProps) {
  // Store hooks
  const { 
    availableModels, 
    activeModels, 
    addActiveModel, 
    removeActiveModel, 
    getAvailableModelsList,
    getActiveModelsList 
  } = useModelStore();
  
  const { 
    currentChatId, 
    addMessage, 
    getCurrentMessages 
  } = useChatStore();
  
  // Local state
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [comparisonResult, setComparisonResult] = useState<ModelComparisonResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Initialize models from active models in store
  useEffect(() => {
    const activeModelsList = getActiveModelsList();
    const modelConfigs = activeModelsList.map(model => ({
      id: model.id,
      name: model.name,
      model,
      messages: [],
      isActive: true
    }));
    setModels(modelConfigs);
  }, [activeModels, getActiveModelsList]);
  
  // Handle adding a new model from available models
  const handleAddModel = (selectedModel?: AIModel) => {
    if (selectedModel) {
      addActiveModel(selectedModel.id);
    } else {
      setShowModelSelector(true);
    }
  };
  
  // Handle removing a model
  const handleRemoveModel = (modelId: string) => {
    removeActiveModel(modelId);
  };
  
  // Handle broadcasting a message to all models
  const handleBroadcastMessage = async (content: string) => {
    if (!currentChatId || models.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Add user message to chat
      const userMessageId = addMessage(currentChatId, {
        role: 'user',
        content,
        isMultiModel: true,
        modelResponses: {}
      });
      
      // Get current messages for context
      const currentMessages = getCurrentMessages();
      
      // Prepare multi-model request
      const modelsList = models.map(m => m.model);
      const request = {
        message: content,
        models: modelsList,
        context: {
          chatId: currentChatId,
          messages: currentMessages,
          activeModel: modelsList[0] // Default to first model
        }
      };
      
      // Send to multiple models
      const result = await multiModelService.sendToMultipleModels(request);
      
      // Process responses and add to chat
      for (const response of result.responses) {
        if (response.status === 'completed' && response.response) {
          addMessage(currentChatId, {
            role: 'assistant',
            content: response.response.content,
            modelId: response.modelId,
            isMultiModel: true,
            responseTime: response.response.responseTime,
            usage: response.response.usage
          });
        }
      }
      
      // Update comparison result
      setComparisonResult(result);
      
    } catch (error) {
      console.error('Error broadcasting message:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle individual model message
  const handleModelMessage = async (modelId: string, content: string) => {
    if (!currentChatId) return;
    
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    
    try {
      // Add user message
      const userMessageId = addMessage(currentChatId, {
        role: 'user',
        content,
        modelId
      });
      
      // Get current messages for context
      const currentMessages = getCurrentMessages();
      
      // Send to specific model
      const request = {
        message: content,
        models: [model.model],
        context: {
          chatId: currentChatId,
          messages: currentMessages,
          activeModel: model.model
        }
      };
      
      const result = await multiModelService.sendToMultipleModels(request);
      const response = result.responses[0];
      
      if (response.status === 'completed' && response.response) {
        addMessage(currentChatId, {
          role: 'assistant',
          content: response.response.content,
          modelId,
          responseTime: response.response.responseTime,
          usage: response.response.usage
        });
      }
      
    } catch (error) {
      console.error('Error sending message to model:', error);
    }
  };

  return (
    <motion.div
      className={cn(
        "flex flex-col h-full",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Split chat header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium">Multi-Model Chat</h2>
          <Badge variant="outline" className="text-xs">
            {models.length} Model{models.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBroadcastMode(!isBroadcastMode)}
            className={cn(isBroadcastMode && "bg-accent")}
            disabled={models.length === 0}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {isBroadcastMode ? "Broadcasting" : "Individual"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddModel()}
            disabled={getAvailableModelsList().length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab(activeTab === 'chat' ? 'metrics' : 'chat')}
            disabled={!comparisonResult}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {activeTab === 'chat' ? 'Show Metrics' : 'Show Chat'}
          </Button>
        </div>
      </div>
      
      {/* Model selector modal */}
      {showModelSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-80 overflow-y-auto">
            <CardHeader>
              <CardTitle>Select Model to Add</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getAvailableModelsList()
                  .filter(model => !activeModels.includes(model.id))
                  .map(model => (
                    <Button
                      key={model.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        handleAddModel(model);
                        setShowModelSelector(false);
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {model.provider}
                        </Badge>
                        <span>{model.name}</span>
                      </div>
                    </Button>
                  ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setShowModelSelector(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Split chat content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat Interface</TabsTrigger>
          <TabsTrigger value="metrics" disabled={!comparisonResult}>
            Performance Metrics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 flex overflow-hidden">
          {models.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Models Added</h3>
                <p className="text-muted-foreground mb-4">Add a model to start comparing responses</p>
                <Button onClick={() => handleAddModel()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Model
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-x-auto">
              {models.map((model) => (
                <div 
                  key={model.id} 
                  className="flex-1 min-w-[300px] border-r last:border-r-0 relative"
                >
                  {/* Model header */}
                  <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {model.model.provider}
                      </Badge>
                      <span className="text-sm font-medium">{model.name}</span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-50 hover:opacity-100"
                      onClick={() => handleRemoveModel(model.id)}
                      disabled={models.length <= 1}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <ChatWindow
                    modelId={model.id}
                    onSendMessage={(content) => handleModelMessage(model.id, content)}
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="metrics" className="flex-1 overflow-auto p-4">
          {comparisonResult ? (
            <div className="space-y-6">
              {/* Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {comparisonResult.metrics.successfulModels}
                      </div>
                      <div className="text-sm text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {comparisonResult.metrics.failedModels}
                      </div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {comparisonResult.metrics.averageResponseTime.toFixed(0)}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        ${comparisonResult.metrics.totalCost.toFixed(4)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Cost</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Model Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Model Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span>Fastest Model</span>
                      </div>
                      <Badge variant="outline">
                        {comparisonResult.recommendations.fastestModel.name}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span>Most Cost Effective</span>
                      </div>
                      <Badge variant="outline">
                        {comparisonResult.recommendations.mostCostEffective.name}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Most Token Efficient</span>
                      </div>
                      <Badge variant="outline">
                        {comparisonResult.recommendations.mostTokenEfficient.name}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Individual Model Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Individual Model Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {comparisonResult.responses.map((response) => (
                      <div key={response.modelId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {response.model.provider}
                            </Badge>
                            <span className="font-medium">{response.model.name}</span>
                          </div>
                          <Badge variant={response.status === 'completed' ? 'default' : 'destructive'}>
                            {response.status}
                          </Badge>
                        </div>
                        
                        {response.response && (
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Response Time:</span>
                              <div className="font-medium">{response.response.responseTime}ms</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tokens:</span>
                              <div className="font-medium">{response.response.usage?.totalTokens || 0}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Finish Reason:</span>
                              <div className="font-medium">{response.response.finishReason}</div>
                            </div>
                          </div>
                        )}
                        
                        {response.error && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            {response.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>No comparison data available yet</p>
                <p className="text-sm">Send a broadcast message to see performance metrics</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Broadcast input */}
      {isBroadcastMode && models.length > 0 && (
        <div className="p-4 border-t bg-accent/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center">
              <ArrowLeftRight className="h-3 w-3 mr-1" />
              Broadcasting to {models.length} model{models.length !== 1 ? 's' : ''}
            </span>
            {isProcessing && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
          <ChatInput
            onSendMessage={handleBroadcastMessage}
            placeholder="Type a message to send to all models..."
            disabled={isProcessing}
          />
        </div>
      )}
    </motion.div>
  );
}