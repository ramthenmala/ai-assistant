import type { Message, AIModel, AppSettings } from '@/types';
import type { SDLCTaskAnalysis, SDLCRoutingDecision, SDLCCategory } from '@/types/sdlc';
import { SDLCClassificationService } from './SDLCClassificationService';
import { SDLC_CATEGORIES, SDLC_MODEL_CONFIGURATIONS } from '@/config/sdlcConfig';

export interface SDLCRoutingOptions {
  enableAutoRouting: boolean;
  confidenceThreshold: number;
  allowManualOverride: boolean;
  enableLearning: boolean;
  collectMetrics: boolean;
  showExplanations: boolean;
}

export interface SDLCRoutingResult {
  analysis: SDLCTaskAnalysis;
  selectedModel: AIModel;
  enhancedPrompt: string;
  categoryInfo: SDLCCategory;
  routingReason: string;
  alternatives: Array<{
    category: string;
    model: string;
    confidence: number;
    reasoning: string;
  }>;
  processingTime: number;
  timestamp: Date;
}

export interface SDLCModelRecommendation {
  modelId: string;
  confidence: number;
  reasoning: string;
  expectedPerformance: {
    accuracy: number;
    responseTime: number;
    userSatisfaction: number;
  };
}

export class SDLCRoutingService {
  private classificationService: SDLCClassificationService;
  private settings: AppSettings;
  private routingOptions: SDLCRoutingOptions;
  private routingHistory: SDLCRoutingResult[] = [];
  private modelPerformanceCache: Map<string, any> = new Map();

  constructor(settings: AppSettings, options: Partial<SDLCRoutingOptions> = {}) {
    this.settings = settings;
    this.classificationService = new SDLCClassificationService(settings);
    this.routingOptions = {
      enableAutoRouting: true,
      confidenceThreshold: 0.7,
      allowManualOverride: true,
      enableLearning: true,
      collectMetrics: true,
      showExplanations: true,
      ...options
    };
  }

  async routeQuery(
    query: string,
    context: {
      conversationHistory?: Message[];
      currentProject?: string;
      userPreferences?: Record<string, any>;
      manualCategory?: string;
    } = {},
    availableModels: AIModel[] = []
  ): Promise<SDLCRoutingResult> {
    const startTime = Date.now();

    try {
      // Step 1: Classify the task
      const analysis = await this.classifyTask(query, context);

      // Step 2: Handle manual override
      if (context.manualCategory && this.routingOptions.allowManualOverride) {
        analysis.classification.categoryId = context.manualCategory;
        analysis.classification.confidence = 0.9;
        analysis.classification.reasoning = 'Manual category override';
      }

      // Step 3: Select the best model
      const selectedModel = await this.selectModel(analysis, availableModels);

      // Step 4: Get category information
      const categoryInfo = SDLC_CATEGORIES.find(c => c.id === analysis.classification.categoryId);
      if (!categoryInfo) {
        throw new Error(`Category ${analysis.classification.categoryId} not found`);
      }

      // Step 5: Generate enhanced prompt
      const enhancedPrompt = await this.generateEnhancedPrompt(analysis, selectedModel, categoryInfo);

      // Step 6: Generate routing reason
      const routingReason = this.generateRoutingReason(analysis, selectedModel);

      // Step 7: Generate alternatives
      const alternatives = await this.generateAlternatives(analysis, availableModels);

      // Step 8: Create routing result
      const routingResult: SDLCRoutingResult = {
        analysis,
        selectedModel,
        enhancedPrompt,
        categoryInfo,
        routingReason,
        alternatives,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      // Step 9: Record for learning and metrics
      if (this.routingOptions.collectMetrics) {
        this.routingHistory.push(routingResult);
        this.updatePerformanceMetrics(routingResult);
      }

      return routingResult;
    } catch (error) {
      console.error('Routing error:', error);
      throw error;
    }
  }

  private async classifyTask(query: string, context: any): Promise<SDLCTaskAnalysis> {
    // Prepare context for classification
    const classificationContext = {
      previousMessages: context.conversationHistory?.slice(-5).map(m => m.content) || [],
      currentProject: context.currentProject,
      userPreferences: context.userPreferences
    };

    return await this.classificationService.classifyTask(query, classificationContext);
  }

  private async selectModel(analysis: SDLCTaskAnalysis, availableModels: AIModel[]): Promise<AIModel> {
    // Get model recommendations
    const recommendations = await this.getModelRecommendations(analysis, availableModels);
    
    if (recommendations.length === 0) {
      throw new Error('No suitable models available');
    }

    // Select the best model based on confidence and performance
    const bestRecommendation = recommendations[0];
    
    // Find the actual model object
    const selectedModel = availableModels.find(m => m.id === bestRecommendation.modelId);
    
    if (!selectedModel) {
      throw new Error(`Model ${bestRecommendation.modelId} not available`);
    }

    return selectedModel;
  }

  private async getModelRecommendations(
    analysis: SDLCTaskAnalysis,
    availableModels: AIModel[]
  ): Promise<SDLCModelRecommendation[]> {
    const categoryConfig = SDLC_MODEL_CONFIGURATIONS.find(c => c.categoryId === analysis.classification.categoryId);
    
    if (!categoryConfig) {
      // Fallback to general recommendations
      return this.getGeneralModelRecommendations(availableModels);
    }

    const recommendations: SDLCModelRecommendation[] = [];

    // Primary model recommendation
    const primaryModel = availableModels.find(m => m.id === categoryConfig.modelId);
    if (primaryModel) {
      const performance = this.getModelPerformance(primaryModel.id, analysis.classification.categoryId);
      recommendations.push({
        modelId: primaryModel.id,
        confidence: 0.9,
        reasoning: 'Primary model for this category',
        expectedPerformance: performance
      });
    }

    // Secondary model recommendations
    const category = SDLC_CATEGORIES.find(c => c.id === analysis.classification.categoryId);
    if (category) {
      category.aiModelPreferences.secondary.forEach(modelId => {
        const model = availableModels.find(m => m.id === modelId);
        if (model) {
          const performance = this.getModelPerformance(model.id, analysis.classification.categoryId);
          recommendations.push({
            modelId: model.id,
            confidence: 0.7,
            reasoning: 'Secondary model for this category',
            expectedPerformance: performance
          });
        }
      });
    }

    // Sort by confidence and performance
    recommendations.sort((a, b) => {
      const scoreA = a.confidence * 0.6 + a.expectedPerformance.accuracy * 0.4;
      const scoreB = b.confidence * 0.6 + b.expectedPerformance.accuracy * 0.4;
      return scoreB - scoreA;
    });

    return recommendations;
  }

  private getGeneralModelRecommendations(availableModels: AIModel[]): SDLCModelRecommendation[] {
    return availableModels.map(model => ({
      modelId: model.id,
      confidence: 0.5,
      reasoning: 'General model recommendation',
      expectedPerformance: {
        accuracy: 0.7,
        responseTime: 1000,
        userSatisfaction: 3.5
      }
    }));
  }

  private getModelPerformance(modelId: string, categoryId: string): {
    accuracy: number;
    responseTime: number;
    userSatisfaction: number;
  } {
    const cacheKey = `${modelId}_${categoryId}`;
    
    if (this.modelPerformanceCache.has(cacheKey)) {
      return this.modelPerformanceCache.get(cacheKey);
    }

    // Default performance metrics (would be populated from actual data)
    const defaultPerformance = {
      accuracy: 0.85,
      responseTime: 1200,
      userSatisfaction: 4.2
    };

    // Model-specific adjustments
    const modelAdjustments: Record<string, any> = {
      'gpt-4': { accuracy: 0.92, responseTime: 1500, userSatisfaction: 4.6 },
      'claude-3-opus': { accuracy: 0.90, responseTime: 1800, userSatisfaction: 4.5 },
      'claude-3-sonnet': { accuracy: 0.88, responseTime: 1000, userSatisfaction: 4.3 },
      'gpt-3.5-turbo': { accuracy: 0.82, responseTime: 800, userSatisfaction: 4.0 }
    };

    const performance = {
      ...defaultPerformance,
      ...(modelAdjustments[modelId] || {})
    };

    this.modelPerformanceCache.set(cacheKey, performance);
    return performance;
  }

  private async generateEnhancedPrompt(
    analysis: SDLCTaskAnalysis,
    selectedModel: AIModel,
    categoryInfo: SDLCCategory
  ): Promise<string> {
    const modelConfig = SDLC_MODEL_CONFIGURATIONS.find(c => c.categoryId === analysis.classification.categoryId);
    
    if (!modelConfig) {
      return analysis.enhancedPrompt;
    }

    // Build comprehensive prompt
    const sections = [
      `# ${categoryInfo.name} Task`,
      `**Complexity:** ${analysis.classification.estimatedComplexity}`,
      `**Estimated Time:** ${analysis.classification.estimatedTime} minutes`,
      `**Required Knowledge:** ${analysis.classification.requiredKnowledge.join(', ')}`,
      '',
      `## Context`,
      `${modelConfig.systemPrompt}`,
      '',
      `## Task Description`,
      `${analysis.originalQuery}`,
      '',
      `## Guidelines`,
      analysis.bestPractices.length > 0 ? `**Best Practices:**\n${analysis.bestPractices.map(p => `- ${p}`).join('\n')}` : '',
      analysis.potentialRisks.length > 0 ? `**Potential Risks:**\n${analysis.potentialRisks.map(r => `- ${r}`).join('\n')}` : '',
      analysis.successCriteria.length > 0 ? `**Success Criteria:**\n${analysis.successCriteria.map(c => `- ${c}`).join('\n')}` : '',
      '',
      `## Custom Instructions`,
      modelConfig.customInstructions.map(i => `- ${i}`).join('\n'),
      '',
      `Please provide a comprehensive response that addresses all aspects of this ${categoryInfo.name.toLowerCase()} task.`
    ];

    return sections.filter(section => section.trim()).join('\n');
  }

  private generateRoutingReason(analysis: SDLCTaskAnalysis, selectedModel: AIModel): string {
    const reasons = [
      `Classified as ${analysis.classification.categoryId} with ${(analysis.classification.confidence * 100).toFixed(1)}% confidence`,
      `Selected ${selectedModel.name} as optimal model for this category`,
      `Estimated ${analysis.classification.estimatedComplexity} complexity task`
    ];

    if (analysis.classification.reasoning) {
      reasons.push(`Reasoning: ${analysis.classification.reasoning}`);
    }

    return reasons.join('. ');
  }

  private async generateAlternatives(
    analysis: SDLCTaskAnalysis,
    availableModels: AIModel[]
  ): Promise<Array<{
    category: string;
    model: string;
    confidence: number;
    reasoning: string;
  }>> {
    const alternatives: Array<{
      category: string;
      model: string;
      confidence: number;
      reasoning: string;
    }> = [];

    // Get alternative categories
    const altCategories = Object.values(SDLC_CATEGORIES)
      .filter(c => c.id !== analysis.classification.categoryId)
      .slice(0, 3);

    for (const category of altCategories) {
      const model = availableModels.find(m => m.id === category.aiModelPreferences.primary);
      if (model) {
        alternatives.push({
          category: category.id,
          model: model.id,
          confidence: Math.max(0.1, analysis.classification.confidence - 0.2 - Math.random() * 0.3),
          reasoning: `Alternative interpretation as ${category.name}`
        });
      }
    }

    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  private updatePerformanceMetrics(result: SDLCRoutingResult): void {
    // Update performance metrics based on routing result
    const key = `${result.selectedModel.id}_${result.analysis.classification.categoryId}`;
    
    // This would integrate with actual performance tracking
    // For now, we'll just log the routing decision
    console.log('Routing decision logged:', {
      category: result.analysis.classification.categoryId,
      model: result.selectedModel.id,
      confidence: result.analysis.classification.confidence,
      processingTime: result.processingTime
    });
  }

  async provideFeedback(
    routingResultId: string,
    feedback: {
      accuracy: number; // 1-5 scale
      helpfulness: number; // 1-5 scale
      responseTime: number; // 1-5 scale
      overallSatisfaction: number; // 1-5 scale
      comments?: string;
    }
  ): Promise<void> {
    // This would be used to improve the routing algorithm
    console.log('Feedback received:', { routingResultId, feedback });
    
    // Update model performance metrics
    const result = this.routingHistory.find(r => r.timestamp.toISOString() === routingResultId);
    if (result) {
      const key = `${result.selectedModel.id}_${result.analysis.classification.categoryId}`;
      // Update performance cache with feedback
      this.modelPerformanceCache.set(key, {
        accuracy: feedback.accuracy / 5,
        responseTime: 2000 - (feedback.responseTime * 200),
        userSatisfaction: feedback.overallSatisfaction
      });
    }
  }

  async getRoutingInsights(): Promise<{
    totalRoutings: number;
    categoryDistribution: Record<string, number>;
    modelUsage: Record<string, number>;
    averageConfidence: number;
    averageProcessingTime: number;
    topPerformingModels: Array<{ modelId: string; performance: number }>;
  }> {
    const insights = {
      totalRoutings: this.routingHistory.length,
      categoryDistribution: {} as Record<string, number>,
      modelUsage: {} as Record<string, number>,
      averageConfidence: 0,
      averageProcessingTime: 0,
      topPerformingModels: [] as Array<{ modelId: string; performance: number }>
    };

    if (this.routingHistory.length === 0) {
      return insights;
    }

    // Category distribution
    this.routingHistory.forEach(result => {
      const category = result.analysis.classification.categoryId;
      insights.categoryDistribution[category] = (insights.categoryDistribution[category] || 0) + 1;
    });

    // Model usage
    this.routingHistory.forEach(result => {
      const modelId = result.selectedModel.id;
      insights.modelUsage[modelId] = (insights.modelUsage[modelId] || 0) + 1;
    });

    // Average confidence
    insights.averageConfidence = this.routingHistory.reduce((sum, result) => 
      sum + result.analysis.classification.confidence, 0) / this.routingHistory.length;

    // Average processing time
    insights.averageProcessingTime = this.routingHistory.reduce((sum, result) => 
      sum + result.processingTime, 0) / this.routingHistory.length;

    // Top performing models (based on usage and performance)
    const modelPerformance = new Map<string, number>();
    this.routingHistory.forEach(result => {
      const modelId = result.selectedModel.id;
      const currentScore = modelPerformance.get(modelId) || 0;
      modelPerformance.set(modelId, currentScore + result.analysis.classification.confidence);
    });

    insights.topPerformingModels = Array.from(modelPerformance.entries())
      .map(([modelId, score]) => ({ modelId, performance: score / (insights.modelUsage[modelId] || 1) }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 5);

    return insights;
  }

  async exportRoutingData(): Promise<string> {
    const exportData = {
      routingHistory: this.routingHistory,
      performanceMetrics: Object.fromEntries(this.modelPerformanceCache),
      insights: await this.getRoutingInsights(),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importRoutingData(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);
      
      if (importData.routingHistory) {
        this.routingHistory = importData.routingHistory;
      }
      
      if (importData.performanceMetrics) {
        this.modelPerformanceCache = new Map(Object.entries(importData.performanceMetrics));
      }
    } catch (error) {
      console.error('Failed to import routing data:', error);
      throw error;
    }
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
    this.classificationService.updateSettings(settings);
  }

  updateOptions(options: Partial<SDLCRoutingOptions>): void {
    this.routingOptions = { ...this.routingOptions, ...options };
  }

  getCategories(): SDLCCategory[] {
    return Object.values(SDLC_CATEGORIES);
  }

  getRoutingHistory(): SDLCRoutingResult[] {
    return this.routingHistory;
  }

  clearHistory(): void {
    this.routingHistory = [];
    this.modelPerformanceCache.clear();
  }
}