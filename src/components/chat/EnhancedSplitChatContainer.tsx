import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatWindow } from './ChatWindow';
import { SDLCEnhancedChatWindow } from './SDLCEnhancedChatWindow';
import { ModelComparisonPanel } from './ModelComparisonPanel';
import { SDLC_CATEGORIES_UI } from '@/components/navigation/SDLCHeaderNav';
import { EnhancedModelManager } from './EnhancedModelManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLayout } from '@/components/Layout';
import { useSDLCStore } from '@/stores/useSDLCStore';
import { 
  Plus, 
  X, 
  ArrowLeftRight, 
  MessageSquare, 
  Settings, 
  BarChart3, 
  Zap, 
  Clock, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Loader2,
  Menu,
  Brain,
  FileText,
  Code,
  TestTube,
  Palette,
  BookOpen,
  Rocket
} from 'lucide-react';
import { ChatInput } from './ChatInput';
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
  responseTime?: number;
  tokenUsage?: number;
  cost?: number;
}

interface EnhancedSplitChatContainerProps {
  className?: string;
}

export function EnhancedSplitChatContainer({
  className
}: EnhancedSplitChatContainerProps) {
  // Layout hook for sidebar control and tab management
  const { 
    setSidebarCollapsed, 
    sidebarCollapsed, 
    setWindowCount,
    activeTab,
    setActiveTab,
    isSDLCInitialized,
    hasComparisonResult,
    setIsSDLCInitialized,
    setHasComparisonResult
  } = useLayout();
  
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
    getCurrentMessages,
    setIsStreaming,
    setStreamingMessage
  } = useChatStore();
  // Local state
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isBroadcastMode, setIsBroadcastMode] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ModelComparisonResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModelForAdd, setSelectedModelForAdd] = useState<string>('');
  const [showModelManager, setShowModelManager] = useState(false);
  const [streamingMessageIds, setStreamingMessageIds] = useState<Set<string>>(new Set());
  const [processingProgress, setProcessingProgress] = useState(0);
  const [closedWindows, setClosedWindows] = useState<ModelConfig[]>([]);
  const [selectedSDLCCategory, setSelectedSDLCCategory] = useState<string | null>(null);
  
  // SDLC Store
  const { isInitialized: sdlcStoreInitialized } = useSDLCStore();

  // Initialize with 3 default chat windows
  useEffect(() => {
    const availableModelsList = getAvailableModelsList();
    if (availableModelsList.length >= 3 && models.length === 0) {
      // Create 3 default chat windows with different models
      const defaultModels = [
        availableModelsList.find(m => m.id === 'gpt-4') || availableModelsList[0],
        availableModelsList.find(m => m.id === 'claude-3-sonnet') || availableModelsList[1],
        availableModelsList.find(m => m.id === 'gpt-3.5-turbo') || availableModelsList[2]
      ];
      
      const modelConfigs = defaultModels.map((model, index) => ({
        id: `window-${index}-${model.id}`,
        name: model.name,
        model,
        messages: [],
        isActive: true
      }));
      
      setModels(modelConfigs);
    }
  }, [availableModels, getAvailableModelsList, models.length]);

  // Update window count in layout context
  useEffect(() => {
    setWindowCount(models.length);
  }, [models.length, setWindowCount]);

  // Update SDLC initialization status in layout
  useEffect(() => {
    setIsSDLCInitialized(sdlcStoreInitialized);
  }, [sdlcStoreInitialized, setIsSDLCInitialized]);

  // Update comparison result status in layout
  useEffect(() => {
    setHasComparisonResult(!!comparisonResult);
  }, [comparisonResult, setHasComparisonResult]);

  // Handle adding a new model
  const handleAddModel = useCallback(() => {
    if (!selectedModelForAdd) return;
    
    const modelToAdd = availableModels.find(m => m.id === selectedModelForAdd);
    if (!modelToAdd) return;

    // Add new chat window
    const newWindow = {
      id: `window-${models.length}-${modelToAdd.id}`,
      name: modelToAdd.name,
      model: modelToAdd,
      messages: [],
      isActive: true
    };
    
    setModels(prev => [...prev, newWindow]);
    setSelectedModelForAdd('');
  }, [selectedModelForAdd, availableModels, models.length]);

  // Handle closing a window (moves to closed windows for restore)
  const handleCloseWindow = useCallback((windowId: string) => {
    const windowToClose = models.find(m => m.id === windowId);
    if (!windowToClose) return;
    
    // Move to closed windows
    setClosedWindows(prev => [...prev, windowToClose]);
    // Remove from active models
    setModels(prev => prev.filter(model => model.id !== windowId));
  }, [models]);
  
  // Handle restoring a closed window
  const handleRestoreWindow = useCallback((windowId: string) => {
    const windowToRestore = closedWindows.find(w => w.id === windowId);
    if (!windowToRestore) return;
    
    // Move back to active models
    setModels(prev => [...prev, windowToRestore]);
    // Remove from closed windows
    setClosedWindows(prev => prev.filter(w => w.id !== windowId));
  }, [closedWindows]);

  // Handle broadcasting a message to all models
  const handleBroadcastMessage = useCallback(async (content: string) => {
    if (!content.trim() || !currentChatId || models.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setIsStreaming(true);
    
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
      
      // Update model configs with response data
      setModels(prev => prev.map(model => {
        const response = result.responses.find(r => r.modelId === model.id);
        return {
          ...model,
          lastResponse: response,
          responseTime: response?.response?.responseTime,
          tokenUsage: response?.response?.usage?.totalTokens
        };
      }));
      
    } catch (error) {
      console.error('Error broadcasting message:', error);
    } finally {
      setIsProcessing(false);
      setIsStreaming(false);
      setProcessingProgress(0);
    }
  }, [currentChatId, models, addMessage, getCurrentMessages, setIsStreaming]);

  // Handle single model message
  const handleSingleModelMessage = useCallback(async (modelId: string, content: string) => {
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
  }, [currentChatId, models, addMessage, getCurrentMessages]);

  // Get model performance metrics
  const getModelMetrics = useCallback((modelId: string) => {
    return multiModelService.getModelMetrics(modelId);
  }, []);

  // Get model availability status
  const getModelAvailability = useCallback((modelId: string) => {
    return multiModelService.getModelAvailability(modelId);
  }, []);

  // Handle model selection from manager
  const handleModelSelect = useCallback((model: AIModel) => {
    if (!activeModels.includes(model.id)) {
      addActiveModel(model.id);
    }
    setShowModelManager(false);
  }, [activeModels, addActiveModel]);

  // Handle failover configuration
  const handleFailoverConfigured = useCallback((primaryModel: string, fallbackModels: string[]) => {
    console.log(`Failover configured for ${primaryModel}:`, fallbackModels);
  }, []);

  // Handle model change for a specific chat window
  const handleModelChange = useCallback((currentWindowId: string, newModelId: string) => {
    const newModel = availableModels.find(m => m.id === newModelId);
    if (!newModel) return;

    // Update the model configuration
    setModels(prev => prev.map(model => 
      model.id === currentWindowId 
        ? {
            ...model,
            name: newModel.name,
            model: newModel,
            lastResponse: undefined,
            responseTime: undefined,
            tokenUsage: undefined
          }
        : model
    ));
  }, [availableModels]);

  // Handle SDLC category selection
  const handleSDLCCategorySelect = useCallback((categoryId: string) => {
    setSelectedSDLCCategory(categoryId);
    
    // Find the category configuration
    const category = SDLC_CATEGORIES_UI.find(c => c.id === categoryId);
    if (!category) return;

    // Get the recommended models for this category
    const primaryModelName = category.primaryModel;
    const secondaryModelNames = category.secondaryModels;
    
    // Map to available models
    const availableModelsList = getAvailableModelsList();
    const primaryModel = availableModelsList.find(m => 
      m.name.toLowerCase().includes(primaryModelName.toLowerCase()) ||
      m.id.toLowerCase().includes(primaryModelName.toLowerCase())
    );
    
    const secondaryModels = secondaryModelNames.map(name => 
      availableModelsList.find(m => 
        m.name.toLowerCase().includes(name.toLowerCase()) ||
        m.id.toLowerCase().includes(name.toLowerCase())
      )
    ).filter(Boolean);

    // Update the 3 chat windows with optimal models
    const recommendedModels = [
      primaryModel,
      ...secondaryModels.slice(0, 2)
    ].filter(Boolean);

    // Fill remaining slots with available models if needed
    while (recommendedModels.length < 3 && recommendedModels.length < availableModelsList.length) {
      const nextModel = availableModelsList.find(m => 
        !recommendedModels.some(rm => rm?.id === m.id)
      );
      if (nextModel) recommendedModels.push(nextModel);
    }

    // Create new model configurations
    const newModelConfigs = recommendedModels.slice(0, 3).map((model, index) => ({
      id: `sdlc-window-${index}-${model.id}`,
      name: model.name,
      model,
      messages: [],
      isActive: true
    }));

    setModels(newModelConfigs);
  }, [getAvailableModelsList]);

  // Get category-specific window titles
  const getWindowTitle = useCallback((windowIndex: number, model: any) => {
    if (!selectedSDLCCategory) return `Window ${windowIndex + 1}`;
    
    const category = SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory);
    if (!category) return `Window ${windowIndex + 1}`;

    const roles = ['Primary', 'Secondary', 'Alternative'];
    return `${roles[windowIndex] || 'Window'} (${category.shortName})`;
  }, [selectedSDLCCategory]);

  // Calculate comparison metrics
  const comparisonMetrics = comparisonResult ? {
    averageResponseTime: comparisonResult.metrics.averageResponseTime,
    totalCost: comparisonResult.metrics.totalCost,
    successRate: (comparisonResult.metrics.successfulModels / comparisonResult.metrics.totalModels) * 100,
    fastestModel: comparisonResult.recommendations.fastestModel.name,
    mostCostEffective: comparisonResult.recommendations.mostCostEffective.name
  } : null;

  // Calculate system health
  const systemHealth = models.length > 0 
    ? models.filter(m => (m.tokenUsage || 0) > 0).length / models.length * 100 
    : 100;

  return (
    <motion.div
      className={cn("flex flex-col h-full", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* SDLC Header Navigation */}
      <div className="border-b bg-white">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">AI-Powered SDLC Assistant</h2>
              </div>
              
              {/* SDLC Category Buttons */}
              <div className="flex items-center gap-1">
                {SDLC_CATEGORIES_UI.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedSDLCCategory === category.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleSDLCCategorySelect(category.id)}
                    className={cn(
                      "flex items-center gap-2 transition-all h-8",
                      selectedSDLCCategory === category.id && "shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center",
                      selectedSDLCCategory === category.id ? "text-white" : category.color
                    )}>
                      {category.icon}
                    </div>
                    <span className="font-medium text-sm">{category.shortName}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Status indicators */}
              <div className="flex items-center gap-2">
                {/* Current Tab Indicator */}
                <Badge variant="outline" className="text-xs">
                  {activeTab === 'chat' && <MessageSquare className="h-3 w-3 mr-1" />}
                  {activeTab === 'sdlc' && <Brain className="h-3 w-3 mr-1" />}
                  {activeTab === 'comparison' && <BarChart3 className="h-3 w-3 mr-1" />}
                  {activeTab === 'metrics' && <Activity className="h-3 w-3 mr-1" />}
                  {activeTab === 'settings' && <Settings className="h-3 w-3 mr-1" />}
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </Badge>
                
                {isSDLCInitialized && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    <Brain className="h-3 w-3 mr-1" />
                    SDLC Ready
                  </Badge>
                )}
                {selectedSDLCCategory && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory)?.shortName} Mode
                  </Badge>
                )}
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Health: {systemHealth.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Category Info */}
          {selectedSDLCCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory)?.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Optimized for {SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory)?.description}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Primary: {SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory)?.primaryModel} • 
                    Secondary: {SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory)?.secondaryModels.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full bg-current", SDLC_CATEGORIES_UI.find(c => c.id === selectedSDLCCategory)?.color)} />
                  <span className="text-xs text-muted-foreground">Ready</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content Area - Render based on activeTab */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'chat' && (
          <>
            <div className="flex items-center justify-between p-2 border-b bg-background/50 flex-shrink-0">
              <div className="flex items-center gap-2">
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
                
                {comparisonMetrics && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{comparisonMetrics.averageResponseTime.toFixed(0)}ms avg</span>
                    <DollarSign className="h-3 w-3" />
                    <span>${comparisonMetrics.totalCost.toFixed(4)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Add 4th Window Button - only show when there are exactly 3 windows */}
                {models.length === 3 && (
                  <>
                    <Select value={selectedModelForAdd} onValueChange={setSelectedModelForAdd}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select model for 4th window" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{model.provider}</Badge>
                                {model.name}
                              </div>
                              <div className="flex items-center gap-1">
                                {model.isAvailable && (
                                  <Badge variant="outline" className="text-xs text-green-600">
                                    Available
                                  </Badge>
                                )}
                                {models.some(m => m.model.id === model.id) && (
                                  <Badge variant="outline" className="text-xs text-orange-600">
                                    In Use
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddModel}
                      disabled={!selectedModelForAdd}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add 4th Window
                    </Button>
                  </>
                )}
                
                {/* Show restore options if there are closed windows */}
                {closedWindows.length > 0 && (
                  <Select value="" onValueChange={handleRestoreWindow}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Restore closed window" />
                    </SelectTrigger>
                    <SelectContent>
                      {closedWindows.map(window => (
                        <SelectItem key={window.id} value={window.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{window.model.provider}</Badge>
                            {window.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Dialog open={showModelManager} onOpenChange={setShowModelManager}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Shield className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Model Management</DialogTitle>
                    </DialogHeader>
                    <EnhancedModelManager 
                      onModelSelect={handleModelSelect}
                      onFailoverConfigured={handleFailoverConfigured}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex overflow-hidden">
              {models.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Models Added</h3>
                    <p className="text-muted-foreground mb-4">Add models to start comparing responses</p>
                    <Button onClick={() => handleAddModel()} disabled={availableModels.length === 0}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Model
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex overflow-x-auto">
                  <AnimatePresence mode="popLayout">
                    {models.map((model) => (
                      <motion.div
                        key={model.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 min-w-[300px] border-r last:border-r-0 flex flex-col"
                      >
                        {/* Model Header */}
                        <div className="p-2 border-b bg-muted/30 flex-shrink-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {getWindowTitle(models.findIndex(m => m.id === model.id), model.model)}
                              </Badge>
                              <Badge variant="outline">{model.model.provider}</Badge>
                              
                              {/* Model Status */}
                              {(() => {
                                const availability = getModelAvailability(model.id);
                                const metrics = getModelMetrics(model.id);
                                
                                return (
                                  <div className="flex items-center gap-1">
                                    {availability?.isAvailable ? (
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-3 w-3 text-red-500" />
                                    )}
                                    {metrics && (
                                      <span className="text-xs text-muted-foreground">
                                        {metrics.averageResponseTime.toFixed(0)}ms
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {model.lastResponse && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {model.lastResponse.status === 'completed' ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : model.lastResponse.status === 'failed' ? (
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  )}
                                  {model.responseTime && (
                                    <span>{model.responseTime}ms</span>
                                  )}
                                </div>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                onClick={() => handleCloseWindow(model.id)}
                                disabled={models.length <= 1}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Model Selector */}
                          <Select 
                            value={model.model.id} 
                            onValueChange={(newModelId) => handleModelChange(model.id, newModelId)}
                          >
                            <SelectTrigger className="w-full h-8">
                              <SelectValue>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {model.model.provider}
                                  </Badge>
                                  <span className="text-sm">{model.name}</span>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map(availableModel => (
                                <SelectItem key={availableModel.id} value={availableModel.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {availableModel.provider}
                                      </Badge>
                                      <span>{availableModel.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {availableModel.isAvailable && (
                                        <Badge variant="outline" className="text-xs text-green-600">
                                          Available
                                        </Badge>
                                      )}
                                      {models.some(m => m.model.id === availableModel.id && m.id !== model.id) && (
                                        <Badge variant="outline" className="text-xs text-orange-600">
                                          In Use
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Chat Window */}
                        <div className="flex-1 overflow-hidden">
                          <ChatWindow
                            modelId={model.name}
                            onSendMessage={(content) => handleSingleModelMessage(model.id, content)}
                            className="h-full"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Broadcast Input */}
            {isBroadcastMode && models.length > 0 && (
              <div className="p-2 border-t bg-accent/20 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center">
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    Broadcasting to {models.filter(m => m.isActive).length} model{models.filter(m => m.isActive).length !== 1 ? 's' : ''}
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
          </>
        )}

        {activeTab === 'sdlc' && (
          <SDLCEnhancedChatWindow 
            chatId={currentChatId || undefined}
            className="h-full"
          />
        )}

        {activeTab === 'comparison' && (
          <div className="flex-1 overflow-hidden">
            {comparisonResult ? (
              <ModelComparisonPanel 
                comparisonResult={comparisonResult}
                onModelSelect={handleModelSelect}
                className="h-full overflow-auto p-4"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>No comparison data available yet</p>
                  <p className="text-sm">Send a broadcast message to see performance analysis</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Model Performance Comparison</h3>
                
                {comparisonResult ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Average Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {comparisonResult.metrics.averageResponseTime.toFixed(0)}ms
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {((comparisonResult.metrics.successfulModels / comparisonResult.metrics.totalModels) * 100).toFixed(0)}%
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${comparisonResult.metrics.totalCost.toFixed(4)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Tokens Used</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {comparisonResult.metrics.totalTokensUsed.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Send a broadcast message to see performance comparison</p>
                  </div>
                )}
              </div>

              {/* Model-specific metrics */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Individual Model Metrics</h3>
                <div className="space-y-4">
                  {models.map(model => {
                    const metrics = getModelMetrics(model.id);
                    const availability = getModelAvailability(model.id);
                    
                    return (
                      <Card key={model.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{model.model.provider}</Badge>
                              <span>{model.name}</span>
                            </div>
                            <Badge variant={availability?.isAvailable ? "default" : "destructive"}>
                              {availability?.status || 'Unknown'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-2xl font-bold">
                                {metrics?.averageResponseTime.toFixed(0) || 0}ms
                              </div>
                              <div className="text-sm text-muted-foreground">Avg Response Time</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {metrics?.totalRequests || 0}
                              </div>
                              <div className="text-sm text-muted-foreground">Total Requests</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {((metrics?.successfulRequests || 0) / Math.max(metrics?.totalRequests || 1, 1) * 100).toFixed(0)}%
                              </div>
                              <div className="text-sm text-muted-foreground">Success Rate</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                ${metrics?.totalCost.toFixed(4) || '0.0000'}
                              </div>
                              <div className="text-sm text-muted-foreground">Total Cost</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-hidden p-4">
            <EnhancedModelManager 
              onModelSelect={handleModelSelect}
              onFailoverConfigured={handleFailoverConfigured}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}