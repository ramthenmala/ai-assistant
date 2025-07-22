import React, { useState, useCallback, useEffect } from 'react';
import { Brain, Database, Search, BookOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatWindow } from './ChatWindow';
import { KnowledgeUpload } from '@/components/knowledge/KnowledgeUpload';
import { RAGContextCard } from './RAGContextCard';
import type { Message, MediaAttachment, KnowledgeStack } from '@/types';
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { RAGChatService } from '@/services/RAGChatService';
import type { RAGChatResult } from '@/services/RAGChatService';

interface RAGChatWindowProps {
  chatId?: string;
  modelId?: string;
  className?: string;
}

export const RAGChatWindow: React.FC<RAGChatWindowProps> = ({
  chatId,
  modelId,
  className = ''
}) => {
  const [ragEnabled, setRagEnabled] = useState(true);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [ragContext, setRagContext] = useState<any>(null);
  const [processingRAG, setProcessingRAG] = useState(false);

  const {
    knowledgeStacks,
    activeStackIds,
    activateStack,
    deactivateStack,
    createKnowledgeStack
  } = useKnowledgeStore();

  const settings = useSettingsStore(state => state.settings);
  const ragChatService = new RAGChatService(settings);

  // Create default knowledge stack if none exists
  useEffect(() => {
    if (knowledgeStacks.length === 0) {
      createKnowledgeStack({
        name: 'General Knowledge',
        description: 'General purpose knowledge base for chat assistance',
        sources: []
      });
    }
  }, [knowledgeStacks.length, createKnowledgeStack]);

  const handleSendMessage = useCallback(async (
    content: string, 
    attachments?: MediaAttachment[]
  ) => {
    if (!ragEnabled || activeStackIds.length === 0) {
      // Fall back to regular chat
      return;
    }

    setProcessingRAG(true);
    setRagContext(null);

    try {
      // Process message through RAG
      const ragResult: RAGChatResult = await ragChatService.processMessage(
        content,
        [], // TODO: Add conversation history
        {
          enableRAG: ragEnabled,
          activeStackIds,
          model: { id: modelId || 'gpt-4', name: 'GPT-4' } as any, // Simplified for demo
          settings
        }
      );

      // Set RAG context for display
      if (ragResult.ragContext) {
        setRagContext(ragResult.ragContext);
      }

      // The actual message sending will be handled by the parent ChatWindow
      // This is just for RAG context processing

    } catch (error) {
      console.error('RAG processing error:', error);
      // Fall back to regular chat on error
    } finally {
      setProcessingRAG(false);
    }
  }, [ragEnabled, activeStackIds, ragChatService, modelId, settings]);

  const toggleStack = useCallback((stackId: string, active: boolean) => {
    if (active) {
      activateStack(stackId);
    } else {
      deactivateStack(stackId);
    }
  }, [activateStack, deactivateStack]);

  const getActiveSourceCount = () => {
    return knowledgeStacks
      .filter(stack => activeStackIds.includes(stack.id))
      .reduce((count, stack) => count + stack.sources.length, 0);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* RAG Status Header */}
      <div className="border-b bg-card/50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Brain className={`h-5 w-5 ${ragEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="font-medium">RAG Assistant</span>
              <Switch
                checked={ragEnabled}
                onCheckedChange={setRagEnabled}
                disabled={processingRAG}
              />
            </div>
            
            {ragEnabled && (
              <Badge variant={activeStackIds.length > 0 ? 'default' : 'secondary'}>
                {getActiveSourceCount()} sources active
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
            >
              <Database className="h-4 w-4 mr-2" />
              Knowledge Base
            </Button>
          </div>
        </div>

        {processingRAG && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 animate-pulse" />
            <span>Searching knowledge base...</span>
          </div>
        )}
      </div>

      {/* Knowledge Panel */}
      <Collapsible open={showKnowledgePanel}>
        <CollapsibleContent>
          <div className="border-b bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Knowledge Stacks</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
              >
                Add Knowledge
              </Button>
            </div>

            {/* Knowledge Stacks List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {knowledgeStacks.map(stack => (
                <Card key={stack.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{stack.name}</CardTitle>
                      <Switch
                        checked={activeStackIds.includes(stack.id)}
                        onCheckedChange={(active) => toggleStack(stack.id, active)}
                        size="sm"
                      />
                    </div>
                    <CardDescription className="text-xs">
                      {stack.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{stack.sources.length} sources</span>
                      <span>Updated {new Date(stack.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Knowledge Upload */}
            <Collapsible open={showUpload}>
              <CollapsibleContent>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Add New Knowledge</CardTitle>
                    <CardDescription className="text-xs">
                      Upload documents or add web content to enhance the AI's knowledge
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KnowledgeUpload
                      stackId={knowledgeStacks[0]?.id || ''}
                      onComplete={() => setShowUpload(false)}
                    />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* RAG Context Display */}
      {ragContext && (
        <div className="border-b bg-blue-50 dark:bg-blue-950/20 p-3">
          <RAGContextCard context={ragContext} />
        </div>
      )}

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          chatId={chatId}
          modelId={modelId}
          onSendMessage={handleSendMessage}
          className="h-full"
        />
      </div>

      {/* RAG Status Footer */}
      {ragEnabled && activeStackIds.length === 0 && (
        <div className="border-t bg-amber-50 dark:bg-amber-950/20 p-3">
          <div className="flex items-center space-x-2 text-sm text-amber-700 dark:text-amber-300">
            <Info className="h-4 w-4" />
            <span>
              RAG is enabled but no knowledge sources are active. 
              <button 
                className="underline ml-1"
                onClick={() => setShowKnowledgePanel(true)}
              >
                Add knowledge sources
              </button> to enhance responses.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAGChatWindow;