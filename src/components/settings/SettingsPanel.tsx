import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn, themeUtils } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  X, 
  Settings, 
  Moon, 
  Sun, 
  Laptop, 
  Key, 
  Eye, 
  EyeOff, 
  Shield, 
  Keyboard, 
  Cpu, 
  Cloud,
  Check
} from 'lucide-react';

interface ApiKey {
  service: string;
  key: string;
  isValid: boolean;
}

interface PrivacySettings {
  shareUsageData: boolean;
  allowErrorReporting: boolean;
  localProcessingOnly: boolean;
}

interface KeyboardShortcut {
  action: string;
  keys: string[];
}

interface SettingsPanelProps {
  apiKeys: ApiKey[];
  privacySettings: PrivacySettings;
  keyboardShortcuts: KeyboardShortcut[];
  onClose: () => void;
  onUpdateApiKey?: (service: string, key: string) => void;
  onUpdatePrivacySetting?: (setting: keyof PrivacySettings, value: boolean) => void;
  onUpdateKeyboardShortcut?: (action: string, keys: string[]) => void;
  className?: string;
}

export function SettingsPanel({
  apiKeys,
  privacySettings,
  keyboardShortcuts,
  onClose,
  onUpdateApiKey,
  onUpdatePrivacySetting,
  onUpdateKeyboardShortcut,
  className
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'api-keys' | 'privacy' | 'shortcuts'>('appearance');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  
  // Toggle API key visibility
  const toggleApiKeyVisibility = (service: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };
  
  // Handle API key change
  const handleApiKeyChange = (service: string, key: string) => {
    if (onUpdateApiKey) {
      onUpdateApiKey(service, key);
    }
  };
  
  // Handle privacy setting toggle
  const handlePrivacySettingToggle = (setting: keyof PrivacySettings) => {
    if (onUpdatePrivacySetting) {
      onUpdatePrivacySetting(setting, !privacySettings[setting]);
    }
  };

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[90vh] bg-card border rounded-lg shadow-lg flex flex-col"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-medium flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Settings
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'appearance' ? 'default' : 'ghost'}
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'appearance' 
                ? "border-primary" 
                : "border-transparent"
            )}
            onClick={() => setActiveTab('appearance')}
          >
            <Sun className="h-4 w-4 mr-2" />
            Appearance
          </Button>
          
          <Button
            variant={activeTab === 'api-keys' ? 'default' : 'ghost'}
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'api-keys' 
                ? "border-primary" 
                : "border-transparent"
            )}
            onClick={() => setActiveTab('api-keys')}
          >
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Button>
          
          <Button
            variant={activeTab === 'privacy' ? 'default' : 'ghost'}
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'privacy' 
                ? "border-primary" 
                : "border-transparent"
            )}
            onClick={() => setActiveTab('privacy')}
          >
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </Button>
          
          <Button
            variant={activeTab === 'shortcuts' ? 'default' : 'ghost'}
            className={cn(
              "flex-1 rounded-none border-b-2",
              activeTab === 'shortcuts' 
                ? "border-primary" 
                : "border-transparent"
            )}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        </div>
        
        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Appearance tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Theme</h3>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-md">
                    <div className="flex items-center">
                      <div className="mr-3">
                        <ThemeToggle showLabel size="default" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current theme</p>
                        <p className="text-xs text-muted-foreground">
                          Switch between light, dark, and system themes
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={cn(
                        "flex flex-col items-center p-4 border rounded-md cursor-pointer",
                        themeUtils.getTheme() === 'light' && "ring-2 ring-primary"
                      )}
                      onClick={() => themeUtils.setTheme('light')}
                    >
                      <div className="w-full h-24 bg-white border rounded-md mb-3 flex items-center justify-center">
                        <Sun className="h-8 w-8 text-black" />
                      </div>
                      <span className="text-sm font-medium">Light</span>
                    </div>
                    
                    <div 
                      className={cn(
                        "flex flex-col items-center p-4 border rounded-md cursor-pointer",
                        themeUtils.getTheme() === 'dark' && "ring-2 ring-primary"
                      )}
                      onClick={() => themeUtils.setTheme('dark')}
                    >
                      <div className="w-full h-24 bg-black border rounded-md mb-3 flex items-center justify-center">
                        <Moon className="h-8 w-8 text-white" />
                      </div>
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                    
                    <div 
                      className={cn(
                        "flex flex-col items-center p-4 border rounded-md cursor-pointer",
                        themeUtils.getTheme() === 'system' && "ring-2 ring-primary"
                      )}
                      onClick={() => themeUtils.setTheme('system')}
                    >
                      <div className="w-full h-24 bg-gradient-to-r from-white to-black border rounded-md mb-3 flex items-center justify-center">
                        <Laptop className="h-8 w-8 text-gray-500" />
                      </div>
                      <span className="text-sm font-medium">System</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* API Keys tab */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">API Keys</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your API keys to use external AI models and services. Your keys are stored locally and never shared.
                </p>
                
                <div className="space-y-4">
                  {apiKeys.map(apiKey => (
                    <div key={apiKey.service} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">{apiKey.service}</label>
                        <Badge variant={apiKey.isValid ? "success" : "outline"}>
                          {apiKey.isValid ? "Valid" : "Not Set"}
                        </Badge>
                      </div>
                      
                      <div className="flex">
                        <Input
                          type={showApiKeys[apiKey.service] ? "text" : "password"}
                          value={apiKey.key}
                          onChange={(e) => handleApiKeyChange(apiKey.service, e.target.value)}
                          placeholder={`Enter ${apiKey.service} API key`}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleApiKeyVisibility(apiKey.service)}
                          className="ml-2"
                        >
                          {showApiKeys[apiKey.service] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Model Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-md">
                    <div className="flex items-center">
                      <Cpu className="h-5 w-5 mr-3" />
                      <div>
                        <p className="text-sm font-medium">Local Models</p>
                        <p className="text-xs text-muted-foreground">
                          Use models running on your device
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-md">
                    <div className="flex items-center">
                      <Cloud className="h-5 w-5 mr-3" />
                      <div>
                        <p className="text-sm font-medium">Cloud Models</p>
                        <p className="text-xs text-muted-foreground">
                          Use models from OpenAI, Anthropic, etc.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Privacy tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Privacy Settings</h3>
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-md cursor-pointer"
                    onClick={() => handlePrivacySettingToggle('shareUsageData')}
                  >
                    <div className="flex items-center">
                      <div className="mr-3">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Share Usage Data</p>
                        <p className="text-xs text-muted-foreground">
                          Help improve the app by sharing anonymous usage statistics
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      privacySettings.shareUsageData ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute w-4 h-4 rounded-full bg-white top-0.5 transition-transform",
                        privacySettings.shareUsageData ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-md cursor-pointer"
                    onClick={() => handlePrivacySettingToggle('allowErrorReporting')}
                  >
                    <div className="flex items-center">
                      <div className="mr-3">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Error Reporting</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically send error reports to help fix issues
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      privacySettings.allowErrorReporting ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute w-4 h-4 rounded-full bg-white top-0.5 transition-transform",
                        privacySettings.allowErrorReporting ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </div>
                  </div>
                  
                  <div 
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-md cursor-pointer"
                    onClick={() => handlePrivacySettingToggle('localProcessingOnly')}
                  >
                    <div className="flex items-center">
                      <div className="mr-3">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Local Processing Only</p>
                        <p className="text-xs text-muted-foreground">
                          Process all data locally without sending to cloud services
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      privacySettings.localProcessingOnly ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute w-4 h-4 rounded-full bg-white top-0.5 transition-transform",
                        privacySettings.localProcessingOnly ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Data Management</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Export All Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Delete Chat History
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Shortcuts tab */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Keyboard Shortcuts</h3>
                <div className="space-y-2">
                  {keyboardShortcuts.map(shortcut => (
                    <div 
                      key={shortcut.action}
                      className="flex items-center justify-between p-3 bg-accent/30 rounded-md"
                    >
                      <span className="text-sm">{shortcut.action}</span>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, index) => (
                          <React.Fragment key={index}>
                            <kbd className="px-2 py-1 bg-muted border rounded text-xs font-mono">
                              {key}
                            </kbd>
                            {index < shortcut.keys.length - 1 && (
                              <span className="text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-4 border-t">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}