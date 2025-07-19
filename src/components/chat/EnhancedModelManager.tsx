import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  Shield,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { multiModelService, type ModelAvailabilityStatus, type ModelPerformanceMetrics } from '@/services/MultiModelService';
import { useModelStore } from '@/stores/useModelStore';
import type { AIModel } from '@/types';

interface EnhancedModelManagerProps {
  onModelSelect?: (model: AIModel) => void;
  onFailoverConfigured?: (primaryModel: string, fallbackModels: string[]) => void;
  className?: string;
}

interface ModelStatus {
  model: AIModel;
  availability: ModelAvailabilityStatus;
  performance: ModelPerformanceMetrics | undefined;
  isHealthy: boolean;
  loadScore: number;
}

export function EnhancedModelManager({ 
  onModelSelect, 
  onFailoverConfigured, 
  className 
}: EnhancedModelManagerProps) {
  const { 
    availableModels, 
    setModelAvailability, 
    testModelConnection,
    refreshModelAvailability 
  } = useModelStore();
  
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [failoverConfig, setFailoverConfig] = useState<Record<string, string[]>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Initialize model statuses
  useEffect(() => {
    const updateModelStatuses = () => {
      const statuses: ModelStatus[] = availableModels.map(model => {
        const availability = multiModelService.getModelAvailability(model.id);
        const performance = multiModelService.getModelMetrics(model.id);
        
        // Calculate health score based on availability and performance
        const availabilityScore = availability?.isAvailable ? 1 : 0;
        const performanceScore = performance 
          ? (performance.successfulRequests / performance.totalRequests) 
          : 0;
        const responseTimeScore = performance && performance.averageResponseTime > 0
          ? Math.max(0, 1 - (performance.averageResponseTime / 10000)) // Normalize to 0-1
          : 0;
        
        const isHealthy = availabilityScore > 0.5 && performanceScore > 0.8;
        
        // Calculate load score (lower is better)
        const loadScore = performance
          ? (performance.totalRequests / (performance.totalRequests + 1)) * 100
          : 0;

        return {
          model,
          availability: availability || {
            modelId: model.id,
            isAvailable: model.isAvailable,
            lastChecked: new Date(),
            errorCount: 0,
            status: model.isAvailable ? 'online' : 'offline'
          },
          performance,
          isHealthy,
          loadScore
        };
      });
      
      setModelStatuses(statuses);
    };
    
    updateModelStatuses();
    
    // Set up periodic updates
    const interval = setInterval(updateModelStatuses, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [availableModels]);

  // Handle model availability monitoring
  const handleMonitoringToggle = async (enabled: boolean) => {
    setIsMonitoring(enabled);
    
    if (enabled) {
      // Start monitoring
      await multiModelService.monitorModelAvailability();
    }
  };

  // Handle manual model test
  const handleTestModel = async (modelId: string) => {
    try {
      const isAvailable = await testModelConnection(modelId);
      setModelAvailability(modelId, isAvailable);
      
      // Update local status
      setModelStatuses(prev => 
        prev.map(status => 
          status.model.id === modelId
            ? { 
                ...status, 
                availability: { 
                  ...status.availability, 
                  isAvailable,
                  lastChecked: new Date(),
                  status: isAvailable ? 'online' : 'offline'
                }
              }
            : status
        )
      );
    } catch (error) {
      console.error('Error testing model:', error);
    }
  };

  // Handle failover configuration
  const handleFailoverConfig = (primaryModelId: string, fallbackModelIds: string[]) => {
    const newConfig = { ...failoverConfig, [primaryModelId]: fallbackModelIds };
    setFailoverConfig(newConfig);
    
    // Configure in service
    multiModelService.setModelFailover(primaryModelId, fallbackModelIds);
    
    onFailoverConfigured?.(primaryModelId, fallbackModelIds);
  };

  // Refresh all model statuses
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await refreshModelAvailability();
      await multiModelService.monitorModelAvailability();
    } catch (error) {
      console.error('Error refreshing models:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'degraded': return 'text-yellow-600';
      case 'maintenance': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'offline': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'maintenance': return <Settings className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const healthyModels = modelStatuses.filter(s => s.isHealthy).length;
  const totalModels = modelStatuses.length;
  const systemHealth = totalModels > 0 ? (healthyModels / totalModels) * 100 : 0;

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* System Health Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>System Health</CardTitle>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isMonitoring}
                  onCheckedChange={handleMonitoringToggle}
                />
                <span className="text-sm text-muted-foreground">Auto Monitor</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{healthyModels}</div>
                <div className="text-sm text-muted-foreground">Healthy Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totalModels - healthyModels}</div>
                <div className="text-sm text-muted-foreground">Unhealthy Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalModels}</div>
                <div className="text-sm text-muted-foreground">Total Models</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${systemHealth >= 80 ? 'text-green-600' : systemHealth >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {systemHealth.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">System Health</div>
              </div>
            </div>
            
            <Progress value={systemHealth} className="h-2" />
            
            {systemHealth < 70 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  System health is degraded. Consider checking model configurations or network connectivity.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Model Status List */}
        <Card>
          <CardHeader>
            <CardTitle>Model Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modelStatuses.map((status) => (
                <div key={status.model.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status.availability.status)}
                      <div>
                        <div className="font-medium">{status.model.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {status.model.provider} • {status.model.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={status.isHealthy ? 'default' : 'destructive'}>
                        {status.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(status.availability.status)}>
                        {status.availability.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Response Time</div>
                        <div className="font-medium">
                          {status.availability.responseTime 
                            ? `${status.availability.responseTime}ms`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Error Count</div>
                        <div className="font-medium">{status.availability.errorCount}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Load Score</div>
                        <div className="font-medium">{status.loadScore.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Last Checked</div>
                        <div className="font-medium">
                          {new Date(status.availability.lastChecked).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {status.performance && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3 pt-3 border-t">
                      <div className="text-center">
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className="font-medium flex items-center justify-center">
                          {((status.performance.successfulRequests / status.performance.totalRequests) * 100).toFixed(1)}%
                          {status.performance.errorRate < 0.1 ? (
                            <TrendingUp className="h-3 w-3 text-green-500 ml-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500 ml-1" />
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Total Requests</div>
                        <div className="font-medium">{status.performance.totalRequests}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Avg Response</div>
                        <div className="font-medium">{status.performance.averageResponseTime.toFixed(0)}ms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Uptime</div>
                        <div className="font-medium">{(status.performance.uptime * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestModel(status.model.id)}
                      >
                        Test Connection
                      </Button>
                      {onModelSelect && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onModelSelect(status.model)}
                          disabled={!status.isHealthy}
                        >
                          Select Model
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedModel(
                        selectedModel === status.model.id ? null : status.model.id
                      )}
                    >
                      {selectedModel === status.model.id ? 'Hide' : 'Configure'} Failover
                    </Button>
                  </div>
                  
                  {/* Failover Configuration */}
                  {selectedModel === status.model.id && (
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <div className="text-sm font-medium mb-2">Failover Configuration</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        Select backup models that will be used if this model fails
                      </div>
                      <div className="space-y-2">
                        {modelStatuses
                          .filter(s => s.model.id !== status.model.id && s.isHealthy)
                          .map(fallbackStatus => (
                            <div key={fallbackStatus.model.id} className="flex items-center space-x-2">
                              <Switch
                                checked={failoverConfig[status.model.id]?.includes(fallbackStatus.model.id) || false}
                                onCheckedChange={(checked) => {
                                  const current = failoverConfig[status.model.id] || [];
                                  const updated = checked
                                    ? [...current, fallbackStatus.model.id]
                                    : current.filter(id => id !== fallbackStatus.model.id);
                                  handleFailoverConfig(status.model.id, updated);
                                }}
                              />
                              <span className="text-sm">{fallbackStatus.model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {fallbackStatus.model.provider}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}