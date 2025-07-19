import type { 
  SDLCTaskClassification, 
  SDLCTaskAnalysis, 
  SDLCRoutingDecision,
  SDLCMetrics,
  SDLCInsight,
  SDLCCategory
} from '@/types/sdlc';
import { SDLC_CATEGORIES, SDLC_MODEL_CONFIGURATIONS } from '@/config/sdlcConfig';
import type { AppSettings } from '@/types';

export class SDLCClassificationService {
  private settings: AppSettings;
  private classificationHistory: SDLCRoutingDecision[] = [];
  private categoryMetrics: Map<string, SDLCMetrics> = new Map();
  private learningEnabled: boolean = true;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    Object.values(SDLC_CATEGORIES).forEach(category => {
      this.categoryMetrics.set(category.id, {
        categoryId: category.id,
        totalTasks: 0,
        completedTasks: 0,
        avgAccuracy: 0,
        avgResponseTime: 0,
        userSatisfaction: 0,
        mostUsedModels: [],
        commonPatterns: []
      });
    });
  }

  async classifyTask(query: string, context?: {
    previousMessages?: string[];
    currentProject?: string;
    userPreferences?: Record<string, any>;
  }): Promise<SDLCTaskAnalysis> {
    const startTime = Date.now();

    try {
      // Step 1: Analyze the query using multiple approaches
      const keywordAnalysis = this.analyzeKeywords(query);
      const contextualAnalysis = this.analyzeContext(query, context);
      const semanticAnalysis = await this.performSemanticAnalysis(query);
      const patternAnalysis = this.analyzePatterns(query);

      // Step 2: Combine analyses to determine best classification
      const classification = this.combineAnalyses(
        keywordAnalysis,
        contextualAnalysis,
        semanticAnalysis,
        patternAnalysis
      );

      // Step 3: Generate enhanced prompt and analysis
      const enhancedPrompt = await this.generateEnhancedPrompt(query, classification);
      const contextualHints = this.generateContextualHints(classification);
      const relatedDocumentation = this.findRelatedDocumentation(classification);
      const bestPractices = this.getBestPractices(classification);
      const potentialRisks = this.identifyRisks(classification);
      const successCriteria = this.generateSuccessCriteria(classification);

      // Step 4: Record routing decision
      const routingDecision: SDLCRoutingDecision = {
        taskId: `task_${Date.now()}`,
        originalQuery: query,
        selectedCategory: classification.categoryId,
        selectedModel: classification.suggestedModel,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        alternatives: this.generateAlternatives(classification),
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.classificationHistory.push(routingDecision);
      this.updateMetrics(classification.categoryId, routingDecision);

      return {
        originalQuery: query,
        classification,
        enhancedPrompt,
        contextualHints,
        relatedDocumentation,
        bestPractices,
        potentialRisks,
        successCriteria
      };
    } catch (error) {
      console.error('Classification error:', error);
      
      // Fallback to development category for safety
      return this.getFallbackAnalysis(query);
    }
  }

  private analyzeKeywords(query: string): { categoryId: string; confidence: number; matchedKeywords: string[] } {
    const queryLower = query.toLowerCase();
    let bestMatch = { categoryId: 'coding', confidence: 0, matchedKeywords: [] as string[] };

    Object.values(SDLC_CATEGORIES).forEach(category => {
      const matchedKeywords = category.keywords.filter(keyword => 
        queryLower.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        // Calculate confidence based on keyword matches and specificity
        const confidence = Math.min(
          0.9, 
          (matchedKeywords.length / Math.max(category.keywords.length, 10)) * 
          (matchedKeywords.reduce((sum, keyword) => sum + keyword.length, 0) / 100)
        );
        
        if (confidence > bestMatch.confidence) {
          bestMatch = { categoryId: category.id, confidence, matchedKeywords };
        }
      }
    });

    return bestMatch;
  }

  private analyzeContext(query: string, context?: any): { categoryId: string; confidence: number; reasoning: string } {
    if (!context) {
      return { categoryId: 'coding', confidence: 0.3, reasoning: 'No context available' };
    }

    // Analyze previous messages for context
    if (context.previousMessages) {
      const recentContext = context.previousMessages.slice(-3).join(' ').toLowerCase();
      
      // Check for context clues
      if (recentContext.includes('test') || recentContext.includes('bug')) {
        return { categoryId: 'testing', confidence: 0.6, reasoning: 'Previous conversation about testing' };
      }
      if (recentContext.includes('deploy') || recentContext.includes('production')) {
        return { categoryId: 'deploy', confidence: 0.6, reasoning: 'Previous conversation about deployment' };
      }
      if (recentContext.includes('design') || recentContext.includes('interface')) {
        return { categoryId: 'uiux', confidence: 0.6, reasoning: 'Previous conversation about UI/UX' };
      }
    }

    return { categoryId: 'coding', confidence: 0.3, reasoning: 'General development context' };
  }

  private async performSemanticAnalysis(query: string): Promise<{ categoryId: string; confidence: number; reasoning: string }> {
    // This would integrate with embedding service for semantic similarity
    // For now, using rule-based approach with more sophisticated logic
    
    const patterns = {
      planning: [
        /\b(require|need|should|must|plan|design|architect|analysis|feasibility)\b/gi,
        /\b(user story|acceptance criteria|business|stakeholder|scope)\b/gi,
        /\b(architecture|system design|specification|requirements)\b/gi
      ],
      development: [
        /\b(code|implement|develop|build|create|program|function|class)\b/gi,
        /\b(debug|fix|error|bug|issue|problem|refactor|optimize)\b/gi,
        /\b(algorithm|data structure|api|database|framework|library)\b/gi
      ],
      testing: [
        /\b(test|testing|qa|quality|validate|verify|check)\b/gi,
        /\b(unit test|integration|e2e|performance|security|load)\b/gi,
        /\b(mock|assertion|coverage|automation|selenium|jest)\b/gi
      ],
      'ui-ux': [
        /\b(ui|ux|interface|design|user experience|usability|accessibility)\b/gi,
        /\b(responsive|mobile|layout|component|wireframe|prototype)\b/gi,
        /\b(css|html|react|vue|angular|figma|sketch)\b/gi
      ],
      documentation: [
        /\b(document|docs|readme|manual|guide|tutorial|specification)\b/gi,
        /\b(api docs|technical writing|user guide|help|instructions)\b/gi,
        /\b(markdown|wiki|swagger|openapi|jsdoc)\b/gi
      ],
      deployment: [
        /\b(deploy|deployment|devops|ci\/cd|docker|kubernetes|cloud)\b/gi,
        /\b(aws|azure|gcp|terraform|ansible|jenkins|pipeline)\b/gi,
        /\b(monitoring|infrastructure|serverless|container)\b/gi
      ],
      'quality-assurance': [
        /\b(quality|audit|review|standards|compliance|metrics)\b/gi,
        /\b(code quality|performance audit|security audit|best practices)\b/gi,
        /\b(sonarqube|eslint|technical debt|maintainability)\b/gi
      ]
    };

    let bestMatch = { categoryId: 'development', confidence: 0.4, reasoning: 'Default semantic analysis' };

    Object.entries(patterns).forEach(([categoryId, categoryPatterns]) => {
      let matchCount = 0;
      let totalMatches = 0;

      categoryPatterns.forEach(pattern => {
        const matches = query.match(pattern);
        if (matches) {
          matchCount += 1;
          totalMatches += matches.length;
        }
      });

      if (matchCount > 0) {
        const confidence = Math.min(0.9, (matchCount / categoryPatterns.length) * 0.4 + (totalMatches / 20) * 0.6);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            categoryId,
            confidence,
            reasoning: `Semantic analysis found ${matchCount} pattern matches with ${totalMatches} total occurrences`
          };
        }
      }
    });

    return bestMatch;
  }

  private analyzePatterns(query: string): { categoryId: string; confidence: number; patterns: string[] } {
    // Analyze common patterns from historical data
    const patterns = this.getCommonPatterns();
    
    let bestMatch = { categoryId: 'development', confidence: 0.3, patterns: [] as string[] };

    patterns.forEach(pattern => {
      if (query.toLowerCase().includes(pattern.pattern.toLowerCase())) {
        const confidence = Math.min(0.8, pattern.successRate * pattern.frequency);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            categoryId: pattern.categoryId,
            confidence,
            patterns: [pattern.pattern]
          };
        }
      }
    });

    return bestMatch;
  }

  private combineAnalyses(
    keywordAnalysis: any,
    contextualAnalysis: any,
    semanticAnalysis: any,
    patternAnalysis: any
  ): SDLCTaskClassification {
    // Weighted combination of all analyses
    const weights = {
      keyword: 0.3,
      contextual: 0.2,
      semantic: 0.4,
      pattern: 0.1
    };

    const candidates = [
      { ...keywordAnalysis, source: 'keyword', weight: weights.keyword },
      { ...contextualAnalysis, source: 'contextual', weight: weights.contextual },
      { ...semanticAnalysis, source: 'semantic', weight: weights.semantic },
      { ...patternAnalysis, source: 'pattern', weight: weights.pattern }
    ];

    // Calculate weighted scores
    const categoryScores = new Map<string, number>();
    const reasoningParts: string[] = [];

    candidates.forEach(candidate => {
      const weightedScore = candidate.confidence * candidate.weight;
      const currentScore = categoryScores.get(candidate.categoryId) || 0;
      categoryScores.set(candidate.categoryId, currentScore + weightedScore);
      
      if (candidate.confidence > 0.5) {
        reasoningParts.push(`${candidate.source} analysis (${(candidate.confidence * 100).toFixed(1)}%)`);
      }
    });

    // Find the best category
    let bestCategory = 'development';
    let bestScore = 0;

    categoryScores.forEach((score, categoryId) => {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = categoryId;
      }
    });

    // Determine complexity and estimated time
    const complexity = this.estimateComplexity(bestCategory, keywordAnalysis.matchedKeywords);
    const estimatedTime = this.estimateTime(complexity, bestCategory);
    const suggestedModel = this.getSuggestedModel(bestCategory);
    const requiredKnowledge = this.getRequiredKnowledge(bestCategory);

    return {
      categoryId: bestCategory,
      confidence: Math.min(0.95, bestScore),
      reasoning: reasoningParts.length > 0 
        ? `Based on ${reasoningParts.join(', ')}`
        : 'Based on general analysis',
      suggestedModel,
      estimatedComplexity: complexity,
      estimatedTime,
      requiredKnowledge
    };
  }

  private async generateEnhancedPrompt(query: string, classification: SDLCTaskClassification): Promise<string> {
    const category = SDLC_CATEGORIES.find(c => c.id === classification.categoryId);
    const modelConfig = SDLC_MODEL_CONFIGURATIONS.find(c => c.categoryId === classification.categoryId);

    if (!category || !modelConfig) {
      return query;
    }

    const contextualPrefix = this.generateContextualPrefix(classification);
    const domainGuidance = this.generateDomainGuidance(category);
    const qualityGuidelines = this.generateQualityGuidelines(classification);

    return `${contextualPrefix}

${domainGuidance}

Original Request: ${query}

${qualityGuidelines}

Please provide a comprehensive response that addresses the request with the expertise and considerations outlined above.`;
  }

  private generateContextualPrefix(classification: SDLCTaskClassification): string {
    const category = SDLC_CATEGORIES.find(c => c.id === classification.categoryId);
    if (!category) return '';

    return `Context: This is a ${category.name} task with ${classification.estimatedComplexity} complexity, estimated to take ${classification.estimatedTime} minutes. The confidence level is ${(classification.confidence * 100).toFixed(1)}%.`;
  }

  private generateDomainGuidance(category: SDLCCategory): string {
    const modelConfig = SDLC_MODEL_CONFIGURATIONS.find(c => c.categoryId === category.id);
    return modelConfig?.systemPrompt || '';
  }

  private generateQualityGuidelines(classification: SDLCTaskClassification): string {
    const guidelines = [
      '- Follow industry best practices',
      '- Consider scalability and maintainability',
      '- Include error handling and edge cases',
      '- Provide clear explanations and examples'
    ];

    if (classification.estimatedComplexity === 'high') {
      guidelines.push('- Break down complex solutions into manageable steps');
      guidelines.push('- Consider alternative approaches and trade-offs');
    }

    return `Quality Guidelines:\n${guidelines.join('\n')}`;
  }

  private generateContextualHints(classification: SDLCTaskClassification): string[] {
    const category = SDLC_CATEGORIES.find(c => c.id === classification.categoryId);
    if (!category) return [];

    const hints = [
      `This task falls under ${category.name} category`,
      `Estimated complexity: ${classification.estimatedComplexity}`,
      `Suggested model: ${classification.suggestedModel}`
    ];

    if (classification.requiredKnowledge.length > 0) {
      hints.push(`Required knowledge: ${classification.requiredKnowledge.join(', ')}`);
    }

    return hints;
  }

  private findRelatedDocumentation(classification: SDLCTaskClassification): string[] {
    const category = SDLC_CATEGORIES.find(c => c.id === classification.categoryId);
    if (!category) return [];

    // This would integrate with the RAG system to find relevant documentation
    const docs = [
      `${category.name} Best Practices Guide`,
      `${category.name} Standards and Guidelines`,
      `Industry Standards for ${category.name}`
    ];

    return docs;
  }

  private getBestPractices(classification: SDLCTaskClassification): string[] {
    const practicesMap: Record<string, string[]> = {
      planning: [
        'Start with clear problem definition',
        'Involve stakeholders in requirements gathering',
        'Create detailed user stories with acceptance criteria',
        'Consider non-functional requirements early'
      ],
      development: [
        'Write clean, readable code',
        'Follow SOLID principles',
        'Use meaningful variable and function names',
        'Include proper error handling'
      ],
      testing: [
        'Follow the testing pyramid',
        'Write tests before or during development',
        'Ensure good test coverage',
        'Use descriptive test names'
      ],
      'ui-ux': [
        'Follow accessibility guidelines (WCAG)',
        'Design mobile-first',
        'Use consistent design patterns',
        'Test with real users'
      ],
      documentation: [
        'Write for your audience',
        'Use clear, concise language',
        'Include practical examples',
        'Keep documentation up to date'
      ],
      deployment: [
        'Automate deployment processes',
        'Use infrastructure as code',
        'Implement proper monitoring',
        'Plan for rollback scenarios'
      ],
      'quality-assurance': [
        'Define quality metrics early',
        'Implement continuous quality monitoring',
        'Use automated quality gates',
        'Regular code reviews and audits'
      ]
    };

    return practicesMap[classification.categoryId] || [];
  }

  private identifyRisks(classification: SDLCTaskClassification): string[] {
    const risksMap: Record<string, string[]> = {
      planning: [
        'Incomplete or unclear requirements',
        'Stakeholder misalignment',
        'Scope creep',
        'Unrealistic timelines'
      ],
      development: [
        'Technical debt accumulation',
        'Security vulnerabilities',
        'Performance bottlenecks',
        'Integration issues'
      ],
      testing: [
        'Inadequate test coverage',
        'Environment inconsistencies',
        'Test data management issues',
        'Flaky tests'
      ],
      'ui-ux': [
        'Poor user experience',
        'Accessibility issues',
        'Inconsistent design',
        'Browser compatibility problems'
      ],
      documentation: [
        'Outdated documentation',
        'Poor information architecture',
        'Lack of maintenance',
        'Insufficient detail'
      ],
      deployment: [
        'Deployment failures',
        'Environment configuration issues',
        'Rollback complications',
        'Monitoring blind spots'
      ],
      'quality-assurance': [
        'Quality gate failures',
        'Technical debt accumulation',
        'Compliance issues',
        'Performance degradation'
      ]
    };

    return risksMap[classification.categoryId] || [];
  }

  private generateSuccessCriteria(classification: SDLCTaskClassification): string[] {
    const criteriaMap: Record<string, string[]> = {
      planning: [
        'All requirements are clearly defined and documented',
        'Stakeholders have approved the requirements',
        'Technical feasibility is confirmed',
        'Project timeline and resources are realistic'
      ],
      development: [
        'Code passes all tests',
        'Code follows established coding standards',
        'Security requirements are met',
        'Performance targets are achieved'
      ],
      testing: [
        'All test cases pass',
        'Code coverage targets are met',
        'No critical bugs remain',
        'Performance benchmarks are satisfied'
      ],
      'ui-ux': [
        'Design meets accessibility standards',
        'User testing shows positive feedback',
        'Design is responsive across devices',
        'Consistent with design system'
      ],
      documentation: [
        'Documentation is complete and accurate',
        'Content is clear and easy to understand',
        'Examples are working and relevant',
        'Stakeholders can successfully use the documentation'
      ],
      deployment: [
        'Application deploys successfully',
        'All environments are properly configured',
        'Monitoring and alerting are working',
        'Rollback procedures are tested'
      ],
      'quality-assurance': [
        'Quality metrics meet established thresholds',
        'All quality gates pass',
        'Technical debt is within acceptable limits',
        'Compliance requirements are satisfied'
      ]
    };

    return criteriaMap[classification.categoryId] || [];
  }

  private generateAlternatives(classification: SDLCTaskClassification): Array<{
    category: string;
    model: string;
    confidence: number;
  }> {
    // Generate alternative classifications with lower confidence
    const alternatives = SDLC_CATEGORIES
      .filter(c => c.id !== classification.categoryId)
      .map(category => ({
        category: category.id,
        model: category.aiModelPreferences.primary,
        confidence: Math.max(0.1, classification.confidence - 0.3 - Math.random() * 0.2)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return alternatives;
  }

  private estimateComplexity(categoryId: string, keywords: string[]): 'low' | 'medium' | 'high' {
    const complexityIndicators = {
      high: ['architecture', 'system', 'performance', 'security', 'scalability', 'integration'],
      medium: ['design', 'optimization', 'testing', 'deployment', 'documentation'],
      low: ['simple', 'basic', 'quick', 'small', 'minor']
    };

    if (keywords.some(k => complexityIndicators.high.includes(k))) return 'high';
    if (keywords.some(k => complexityIndicators.medium.includes(k))) return 'medium';
    return 'low';
  }

  private estimateTime(complexity: 'low' | 'medium' | 'high', categoryId: string): number {
    const baseTime = {
      planning: 60,
      coding: 120,
      testing: 45,
      uiux: 90,
      docs: 45,
      deploy: 75,
      qa: 60
    };

    const multiplier = {
      low: 0.5,
      medium: 1.0,
      high: 2.0
    };

    return Math.round((baseTime[categoryId as keyof typeof baseTime] || 60) * multiplier[complexity]);
  }

  private getSuggestedModel(categoryId: string): string {
    const category = SDLC_CATEGORIES[categoryId as keyof typeof SDLC_CATEGORIES];
    return category?.aiModelPreferences.primary || 'gpt-4';
  }

  private getRequiredKnowledge(categoryId: string): string[] {
    const knowledgeMap: Record<string, string[]> = {
      planning: ['Business Analysis', 'Requirements Engineering', 'System Architecture'],
      coding: ['Programming', 'Software Engineering', 'Design Patterns'],
      testing: ['Test Automation', 'Quality Assurance', 'Testing Frameworks'],
      uiux: ['User Experience Design', 'Interface Design', 'Accessibility'],
      docs: ['Technical Writing', 'Information Architecture', 'Documentation Tools'],
      deploy: ['DevOps', 'Cloud Platforms', 'CI/CD', 'Infrastructure'],
      qa: ['Code Quality', 'Performance Testing', 'Security Auditing']
    };

    return knowledgeMap[categoryId] || [];
  }

  private getFallbackAnalysis(query: string): SDLCTaskAnalysis {
    return {
      originalQuery: query,
      classification: {
        categoryId: 'coding',
        confidence: 0.5,
        reasoning: 'Fallback classification due to analysis error',
        suggestedModel: 'claude-3-sonnet',
        estimatedComplexity: 'medium',
        estimatedTime: 60,
        requiredKnowledge: ['General Programming']
      },
      enhancedPrompt: query,
      contextualHints: ['This is a general development task'],
      relatedDocumentation: [],
      bestPractices: [],
      potentialRisks: [],
      successCriteria: []
    };
  }

  private updateMetrics(categoryId: string, decision: SDLCRoutingDecision): void {
    const metrics = this.categoryMetrics.get(categoryId);
    if (!metrics) return;

    metrics.totalTasks += 1;
    metrics.avgResponseTime = (metrics.avgResponseTime + decision.processingTime) / 2;

    this.categoryMetrics.set(categoryId, metrics);
  }

  private getCommonPatterns(): Array<{
    pattern: string;
    categoryId: string;
    frequency: number;
    successRate: number;
  }> {
    // This would be populated from historical data
    return [
      { pattern: 'create a function', categoryId: 'development', frequency: 0.8, successRate: 0.9 },
      { pattern: 'write tests', categoryId: 'testing', frequency: 0.7, successRate: 0.85 },
      { pattern: 'design interface', categoryId: 'ui-ux', frequency: 0.6, successRate: 0.8 },
      { pattern: 'deploy application', categoryId: 'deployment', frequency: 0.5, successRate: 0.75 }
    ];
  }

  async generateInsights(): Promise<SDLCInsight[]> {
    const insights: SDLCInsight[] = [];
    
    // Analyze patterns and generate insights
    const categoryUsage = this.analyzeCategoryUsage();
    const performancePatterns = this.analyzePerformancePatterns();
    const qualityTrends = this.analyzeQualityTrends();

    insights.push(...categoryUsage);
    insights.push(...performancePatterns);
    insights.push(...qualityTrends);

    return insights;
  }

  private analyzeCategoryUsage(): SDLCInsight[] {
    const insights: SDLCInsight[] = [];
    
    // Find most and least used categories
    const usage = Array.from(this.categoryMetrics.entries())
      .map(([categoryId, metrics]) => ({ categoryId, usage: metrics.totalTasks }))
      .sort((a, b) => b.usage - a.usage);

    if (usage.length > 0) {
      const mostUsed = usage[0];
      const leastUsed = usage[usage.length - 1];

      insights.push({
        id: `usage_${Date.now()}`,
        type: 'pattern',
        category: 'usage',
        title: 'Category Usage Pattern',
        description: `Most used category: ${mostUsed.categoryId} (${mostUsed.usage} tasks). Consider optimizing this workflow.`,
        impact: 'medium',
        actionable: true,
        data: { mostUsed, leastUsed },
        createdAt: new Date()
      });
    }

    return insights;
  }

  private analyzePerformancePatterns(): SDLCInsight[] {
    const insights: SDLCInsight[] = [];
    
    // Analyze response times
    const avgResponseTime = this.classificationHistory.reduce((sum, decision) => 
      sum + decision.processingTime, 0) / this.classificationHistory.length;

    if (avgResponseTime > 1000) {
      insights.push({
        id: `performance_${Date.now()}`,
        type: 'optimization',
        category: 'performance',
        title: 'Classification Performance',
        description: `Average classification time is ${avgResponseTime.toFixed(0)}ms. Consider optimizing the classification algorithm.`,
        impact: 'medium',
        actionable: true,
        data: { avgResponseTime },
        createdAt: new Date()
      });
    }

    return insights;
  }

  private analyzeQualityTrends(): SDLCInsight[] {
    const insights: SDLCInsight[] = [];
    
    // Analyze confidence trends
    const recentDecisions = this.classificationHistory.slice(-10);
    const avgConfidence = recentDecisions.reduce((sum, decision) => 
      sum + decision.confidence, 0) / recentDecisions.length;

    if (avgConfidence < 0.7) {
      insights.push({
        id: `quality_${Date.now()}`,
        type: 'warning',
        category: 'quality',
        title: 'Classification Confidence',
        description: `Recent classification confidence is ${(avgConfidence * 100).toFixed(1)}%. Consider reviewing classification algorithms.`,
        impact: 'high',
        actionable: true,
        data: { avgConfidence },
        createdAt: new Date()
      });
    }

    return insights;
  }

  getMetrics(): Map<string, SDLCMetrics> {
    return this.categoryMetrics;
  }

  getClassificationHistory(): SDLCRoutingDecision[] {
    return this.classificationHistory;
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    this.settings = settings;
  }
}