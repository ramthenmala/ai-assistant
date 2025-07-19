import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  RefreshCw, 
  MessageSquare, 
  Settings, 
  AlertCircle,
  Zap,
  History,
  Edit
} from 'lucide-react';
import type { Message, AIModel } from '@/types';

export interface RegenerateResponseModalProps {
  open: boolean;
  onClose: () => void;
  editedMessage: Message;
  subsequentMessages: Message[];
  availableModels: AIModel[];
  onRegenerate: (options: RegenerateOptions) => void;
  isGenerating?: boolean;
  className?: string;
}

export interface RegenerateOptions {
  regenerateFrom: 'edited' | 'all';
  preserveSubsequent: boolean;
  useCurrentModel: boolean;
  selectedModelId?: string;
  customInstructions?: string;
  temperature?: number;
  maxTokens?: number;
}

export const RegenerateResponseModal = React.memo(function RegenerateResponseModal({
  open,
  onClose,
  editedMessage,
  subsequentMessages,
  availableModels,
  onRegenerate,
  isGenerating = false,
  className
}: RegenerateResponseModalProps) {
  const [options, setOptions] = useState<RegenerateOptions>({
    regenerateFrom: 'edited',
    preserveSubsequent: false,
    useCurrentModel: true,
    temperature: 0.7,
    maxTokens: 1000
  });

  const [customInstructions, setCustomInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const subsequentCount = subsequentMessages.length;
  const hasSubsequentMessages = subsequentCount > 0;

  const handleOptionChange = useCallback((key: keyof RegenerateOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'customInstructions' && { customInstructions: value })
    }));
  }, []);

  const handleRegenerate = useCallback(() => {
    const finalOptions = {
      ...options,
      customInstructions: customInstructions.trim() || undefined
    };
    onRegenerate(finalOptions);
  }, [options, customInstructions, onRegenerate]);

  const getRegenerateDescription = () => {
    if (options.regenerateFrom === 'all') {
      return 'Regenerate all responses from the beginning of the conversation';
    }
    return 'Regenerate only the response to the edited message';
  };

  const getSubsequentDescription = () => {
    if (!hasSubsequentMessages) {
      return null;
    }

    if (options.preserveSubsequent) {
      return `Keep the ${subsequentCount} subsequent message${subsequentCount > 1 ? 's' : ''}`;
    }
    return `Remove the ${subsequentCount} subsequent message${subsequentCount > 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate Response
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            The message was edited. Choose how to regenerate the AI response.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Edited Message Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Edited Message</span>
              <Badge variant="outline" className="text-xs">
                {editedMessage.role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {editedMessage.content}
            </p>
          </div>

          {/* Regeneration Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Regeneration Scope</Label>
                <p className="text-xs text-muted-foreground">
                  {getRegenerateDescription()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={options.regenerateFrom === 'edited' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleOptionChange('regenerateFrom', 'edited')}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  From Edit
                </Button>
                <Button
                  variant={options.regenerateFrom === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleOptionChange('regenerateFrom', 'all')}
                >
                  <History className="h-3 w-3 mr-1" />
                  All
                </Button>
              </div>
            </div>

            {hasSubsequentMessages && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Subsequent Messages</Label>
                  <p className="text-xs text-muted-foreground">
                    {getSubsequentDescription()}
                  </p>
                </div>
                <Switch
                  checked={options.preserveSubsequent}
                  onCheckedChange={(checked) => handleOptionChange('preserveSubsequent', checked)}
                />
              </div>
            )}

            {hasSubsequentMessages && !options.preserveSubsequent && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Warning: Subsequent messages will be removed
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  This will permanently delete {subsequentCount} message{subsequentCount > 1 ? 's' : ''} 
                  that come after the edited message.
                </p>
              </div>
            )}

            {/* Model Selection */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Model Selection</Label>
                <p className="text-xs text-muted-foreground">
                  {options.useCurrentModel ? 'Use the current active model' : 'Choose a different model'}
                </p>
              </div>
              <Switch
                checked={options.useCurrentModel}
                onCheckedChange={(checked) => handleOptionChange('useCurrentModel', checked)}
              />
            </div>

            {!options.useCurrentModel && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Model</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableModels.map(model => (
                    <Button
                      key={model.id}
                      variant={options.selectedModelId === model.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOptionChange('selectedModelId', model.id)}
                      className="justify-start"
                    >
                      <Badge variant="outline" className="mr-2 text-xs">
                        {model.provider}
                      </Badge>
                      {model.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Custom Instructions (Optional)</Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add any specific instructions for regeneration..."
                className="min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {customInstructions.length}/500 characters
              </p>
            </div>

            {/* Advanced Options */}
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="justify-start p-0 h-auto"
              >
                <Settings className="h-4 w-4 mr-2" />
                Advanced Options
              </Button>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pl-6 border-l-2 border-border"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Temperature</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={options.temperature}
                          onChange={(e) => handleOptionChange('temperature', parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm w-10 text-right">{options.temperature}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Max Tokens</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="100"
                          max="4000"
                          step="100"
                          value={options.maxTokens}
                          onChange={(e) => handleOptionChange('maxTokens', parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm w-12 text-right">{options.maxTokens}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isGenerating}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={handleRegenerate} 
            disabled={isGenerating}
            className="min-w-[120px]"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

RegenerateResponseModal.displayName = 'RegenerateResponseModal';