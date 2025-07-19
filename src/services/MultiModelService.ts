import { ModelManager } from './ModelManager';
import { modelManager } from './ModelManager';
import type { AIModel, Message } from '@/types';
import type { ChatContext, SendMessageOptions } from './ModelManager';

export interface MultiModelRequest {
  message: string;
  models: AIModel[];
  context: ChatContext;
  options?: SendMessageOptions;
}

export interface MultiModelResponse {
  modelId: string;
  model: AIModel;
  response?: {
    id: string;
    content: string;
    finishReason: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    responseTime: number;
  };
  error?: string;
  status: 'pending' | 'streaming' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
}

export interface ModelComparisonResult {
  responses: MultiModelResponse[];
  metrics: {
    totalModels: number;
    successfulModels: number;
    failedModels: number;
    averageResponseTime: number;
    bestResponseTime: number;
    worstResponseTime: number;
    totalTokensUsed: number;
    totalCost: number;
  };
  recommendations: {
    fastestModel: AIModel;
    mostTokenEfficient: AIModel;
    bestQualityModel?: AIModel;
    mostCostEffective: AIModel;
  };
}

export interface ModelPerformanceMetrics {
  modelId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  totalCost: number;
  uptime: number;
  errorRate: number;
  lastUsed: Date;
}

export interface ModelAvailabilityStatus {
  modelId: string;
  isAvailable: boolean;
  lastChecked: Date;
  errorCount: number;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  responseTime?: number;
}

export class MultiModelService {
  private modelManager: ModelManager;
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private availabilityStatus: Map<string, ModelAvailabilityStatus> = new Map();
  private costTracking: Map<string, number> = new Map();
  private modelFailoverMap: Map<string, string[]> = new Map();

  // Model pricing (tokens per dollar) - approximations
  private modelPricing: Map<string, { inputPrice: number; outputPrice: number }> = new Map([
    ['gpt-4', { inputPrice: 0.03, outputPrice: 0.06 }],
    ['gpt-3.5-turbo', { inputPrice: 0.001, outputPrice: 0.002 }],
    ['claude-3-opus', { inputPrice: 0.015, outputPrice: 0.075 }],
    ['claude-3-sonnet', { inputPrice: 0.003, outputPrice: 0.015 }],
    ['claude-3-haiku', { inputPrice: 0.00025, outputPrice: 0.00125 }]
  ]);

  constructor(modelManager?: ModelManager) {
    this.modelManager = modelManager || new ModelManager();
    this.initializePerformanceTracking();
    this.setupAvailabilityMonitoring();
  }

  /**
   * Send a message to multiple models in parallel
   */
  async sendToMultipleModels(request: MultiModelRequest): Promise<ModelComparisonResult> {
    const startTime = Date.now();
    const responses: MultiModelResponse[] = [];

    // Initialize responses for all models
    for (const model of request.models) {
      responses.push({
        modelId: model.id,
        model,
        status: 'pending',
        startTime
      });
    }

    // Send requests in parallel
    const promises = request.models.map(async (model, index) => {
      const responseIndex = index;
      
      try {
        responses[responseIndex].status = 'streaming';
        const requestStartTime = Date.now();
        
        // Update context for this specific model
        const modelContext = {
          ...request.context,
          activeModel: model
        };

        // Send message to model
        const messageId = await this.modelManager.sendMessage(
          modelContext,
          request.message,
          {
            ...request.options,
            onComplete: (id, response) => {
              const endTime = Date.now();
              responses[responseIndex] = {
                ...responses[responseIndex],
                status: 'completed',
                endTime,
                response: {
                  id,
                  content: response.content,
                  finishReason: response.finishReason || 'stop',
                  usage: response.usage,
                  responseTime: endTime - requestStartTime
                }
              };
              
              // Update performance metrics
              this.updatePerformanceMetrics(model.id, endTime - requestStartTime, response.usage);
              
              // Update availability status
              this.updateAvailabilityStatus(model.id, true, endTime - requestStartTime);
            },
            onError: (id, error) => {
              responses[responseIndex] = {
                ...responses[responseIndex],
                status: 'failed',
                error: error.message,
                endTime: Date.now()
              };
              
              // Update error metrics
              this.updateErrorMetrics(model.id, error.message);
              
              // Update availability status
              this.updateAvailabilityStatus(model.id, false);
            }
          }
        );

        return responses[responseIndex];
      } catch (error) {
        responses[responseIndex] = {
          ...responses[responseIndex],
          status: 'failed',
          error: (error as Error).message,
          endTime: Date.now()
        };
        
        this.updateErrorMetrics(model.id, (error as Error).message);
        this.updateAvailabilityStatus(model.id, false);
        
        return responses[responseIndex];
      }
    });

    // Wait for all requests to complete or timeout
    await Promise.allSettled(promises);

    // Calculate metrics and recommendations
    const metrics = this.calculateMetrics(responses);
    const recommendations = this.generateRecommendations(responses);

    return {
      responses,
      metrics,
      recommendations
    };
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(modelId: string): ModelPerformanceMetrics | undefined {
    return this.performanceMetrics.get(modelId);
  }

  /**
   * Get all model performance metrics
   */
  getAllModelMetrics(): ModelPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get model availability status
   */
  getModelAvailability(modelId: string): ModelAvailabilityStatus | undefined {
    return this.availabilityStatus.get(modelId);
  }

  /**
   * Get all model availability statuses
   */
  getAllModelAvailability(): ModelAvailabilityStatus[] {
    return Array.from(this.availabilityStatus.values());
  }

  /**
   * Get model cost tracking
   */
  getModelCost(modelId: string): number {
    return this.costTracking.get(modelId) || 0;
  }

  /**
   * Get total cost across all models
   */
  getTotalCost(): number {
    return Array.from(this.costTracking.values()).reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Set failover models for a primary model
   */
  setModelFailover(primaryModelId: string, failoverModelIds: string[]): void {
    this.modelFailoverMap.set(primaryModelId, failoverModelIds);
  }

  /**
   * Get failover models for a primary model
   */
  getModelFailover(primaryModelId: string): string[] {
    return this.modelFailoverMap.get(primaryModelId) || [];
  }

  /**
   * Get recommended model for a specific use case
   */
  getRecommendedModel(criteria: {
    prioritize: 'speed' | 'cost' | 'quality';
    maxCost?: number;
    maxResponseTime?: number;
    availableModels?: string[];
  }): AIModel | null {
    const availableModels = this.getAllModelMetrics()
      .filter(m => {
        const availability = this.getModelAvailability(m.modelId);
        return availability?.isAvailable && availability.status === 'online';
      })
      .filter(m => {
        if (criteria.availableModels) {
          return criteria.availableModels.includes(m.modelId);
        }
        return true;
      });

    if (availableModels.length === 0) return null;

    let bestModel: ModelPerformanceMetrics | null = null;

    switch (criteria.prioritize) {
      case 'speed':
        bestModel = availableModels.reduce((best, current) => 
          current.averageResponseTime < best.averageResponseTime ? current : best
        );
        break;
      
      case 'cost':
        bestModel = availableModels.reduce((best, current) => 
          (current.totalCost / current.totalRequests) < (best.totalCost / best.totalRequests) ? current : best
        );
        break;
      
      case 'quality':
        // For quality, we'll use a combination of success rate and low error rate
        bestModel = availableModels.reduce((best, current) => {
          const currentScore = (current.successfulRequests / current.totalRequests) * (1 - current.errorRate);
          const bestScore = (best.successfulRequests / best.totalRequests) * (1 - best.errorRate);
          return currentScore > bestScore ? current : best;
        });
        break;
    }

    // TODO: Convert modelId to AIModel - this would require model registry
    return null; // Placeholder
  }

  /**
   * Monitor model availability
   */
  async monitorModelAvailability(): Promise<void> {
    const models = this.getAllModelMetrics();
    
    for (const model of models) {
      try {
        // Simple availability check by sending a minimal request
        const startTime = Date.now();
        // TODO: Implement actual availability check
        const responseTime = Date.now() - startTime;
        
        this.updateAvailabilityStatus(model.modelId, true, responseTime);
      } catch (error) {
        this.updateAvailabilityStatus(model.modelId, false);
      }
    }
  }

  /**
   * Implement load balancing for model selection
   */
  selectModelWithLoadBalancing(availableModels: string[]): string | null {
    if (availableModels.length === 0) return null;
    
    // Simple round-robin load balancing based on recent usage
    const modelMetrics = availableModels
      .map(id => this.getModelMetrics(id))
      .filter(m => m !== undefined) as ModelPerformanceMetrics[];

    if (modelMetrics.length === 0) return availableModels[0];

    // Select model with least recent usage
    const leastUsedModel = modelMetrics.reduce((least, current) => 
      current.lastUsed < least.lastUsed ? current : least
    );

    return leastUsedModel.modelId;
  }

  /**
   * Private helper methods
   */

  private initializePerformanceTracking(): void {
    // Initialize basic metrics for common models
    const commonModels = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
    
    for (const modelId of commonModels) {
      this.performanceMetrics.set(modelId, {
        modelId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        uptime: 1.0,
        errorRate: 0,
        lastUsed: new Date()
      });
    }
  }

  private setupAvailabilityMonitoring(): void {
    // Set up periodic availability monitoring
    setInterval(() => {
      this.monitorModelAvailability();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private updatePerformanceMetrics(
    modelId: string, 
    responseTime: number, 
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): void {
    const metrics = this.performanceMetrics.get(modelId) || {
      modelId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      uptime: 1.0,
      errorRate: 0,
      lastUsed: new Date()
    };

    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    metrics.lastUsed = new Date();

    if (usage) {
      metrics.totalTokensUsed += usage.totalTokens;
      
      // Calculate cost
      const pricing = this.modelPricing.get(modelId);
      if (pricing) {
        const cost = (usage.promptTokens * pricing.inputPrice + usage.completionTokens * pricing.outputPrice) / 1000;
        metrics.totalCost += cost;
        this.costTracking.set(modelId, (this.costTracking.get(modelId) || 0) + cost);
      }
    }

    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
    this.performanceMetrics.set(modelId, metrics);
  }

  private updateErrorMetrics(modelId: string, error: string): void {
    const metrics = this.performanceMetrics.get(modelId);
    if (metrics) {
      metrics.failedRequests++;
      metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
      this.performanceMetrics.set(modelId, metrics);
    }
  }

  private updateAvailabilityStatus(modelId: string, isAvailable: boolean, responseTime?: number): void {
    const currentStatus = this.availabilityStatus.get(modelId) || {
      modelId,
      isAvailable: true,
      lastChecked: new Date(),
      errorCount: 0,
      status: 'online'
    };

    currentStatus.isAvailable = isAvailable;
    currentStatus.lastChecked = new Date();
    currentStatus.responseTime = responseTime;

    if (isAvailable) {
      currentStatus.errorCount = 0;
      currentStatus.status = 'online';
    } else {
      currentStatus.errorCount++;
      if (currentStatus.errorCount >= 3) {
        currentStatus.status = 'offline';
      } else {
        currentStatus.status = 'degraded';
      }
    }

    this.availabilityStatus.set(modelId, currentStatus);
  }

  private calculateMetrics(responses: MultiModelResponse[]): ModelComparisonResult['metrics'] {
    const successful = responses.filter(r => r.status === 'completed');
    const failed = responses.filter(r => r.status === 'failed');
    
    const responseTimes = successful
      .map(r => r.response?.responseTime || 0)
      .filter(t => t > 0);

    const totalTokens = successful.reduce((sum, r) => 
      sum + (r.response?.usage?.totalTokens || 0), 0
    );

    const totalCost = successful.reduce((sum, r) => {
      const pricing = this.modelPricing.get(r.modelId);
      const usage = r.response?.usage;
      if (pricing && usage) {
        return sum + (usage.promptTokens * pricing.inputPrice + usage.completionTokens * pricing.outputPrice) / 1000;
      }
      return sum;
    }, 0);

    return {
      totalModels: responses.length,
      successfulModels: successful.length,
      failedModels: failed.length,
      averageResponseTime: responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length || 0,
      bestResponseTime: Math.min(...responseTimes, Infinity),
      worstResponseTime: Math.max(...responseTimes, 0),
      totalTokensUsed: totalTokens,
      totalCost
    };
  }

  private generateRecommendations(responses: MultiModelResponse[]): ModelComparisonResult['recommendations'] {
    const successful = responses.filter(r => r.status === 'completed');
    
    // Find fastest model
    const fastestModel = successful.reduce((fastest, current) => {
      const fastestTime = fastest.response?.responseTime || Infinity;
      const currentTime = current.response?.responseTime || Infinity;
      return currentTime < fastestTime ? current : fastest;
    });

    // Find most token efficient model
    const mostTokenEfficient = successful.reduce((efficient, current) => {
      const efficientTokens = efficient.response?.usage?.totalTokens || Infinity;
      const currentTokens = current.response?.usage?.totalTokens || Infinity;
      return currentTokens < efficientTokens ? current : efficient;
    });

    // Find most cost effective model
    const mostCostEffective = successful.reduce((effective, current) => {
      const pricing1 = this.modelPricing.get(effective.modelId);
      const pricing2 = this.modelPricing.get(current.modelId);
      const usage1 = effective.response?.usage;
      const usage2 = current.response?.usage;
      
      if (!pricing1 || !usage1) return current;
      if (!pricing2 || !usage2) return effective;
      
      const cost1 = (usage1.promptTokens * pricing1.inputPrice + usage1.completionTokens * pricing1.outputPrice) / 1000;
      const cost2 = (usage2.promptTokens * pricing2.inputPrice + usage2.completionTokens * pricing2.outputPrice) / 1000;
      
      return cost2 < cost1 ? current : effective;
    });

    return {
      fastestModel: fastestModel.model,
      mostTokenEfficient: mostTokenEfficient.model,
      mostCostEffective: mostCostEffective.model
    };
  }
}

// Export singleton instance
export const multiModelService = new MultiModelService();