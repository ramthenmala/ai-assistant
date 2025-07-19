import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Clock, 
  DollarSign, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { multiModelService, type ModelComparisonResult, type ModelPerformanceMetrics } from '@/services/MultiModelService';
import type { AIModel } from '@/types';

interface ModelComparisonPanelProps {
  comparisonResult: ModelComparisonResult;
  onModelSelect?: (model: AIModel) => void;
  className?: string;
}

interface ModelQualityScore {
  modelId: string;
  model: AIModel;
  overallScore: number;
  speedScore: number;
  costScore: number;
  reliabilityScore: number;
  qualityScore: number;
}

export function ModelComparisonPanel({ 
  comparisonResult, 
  onModelSelect, 
  className 
}: ModelComparisonPanelProps) {
  const [qualityScores, setQualityScores] = useState<ModelQualityScore[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'speed' | 'cost' | 'reliability' | 'quality'>('overall');
  const [historicalData, setHistoricalData] = useState<ModelPerformanceMetrics[]>([]);

  useEffect(() => {
    // Calculate quality scores for each model
    const scores = comparisonResult.responses.map(response => {
      const performance = multiModelService.getModelMetrics(response.modelId);
      
      // Calculate individual scores (0-100)
      const speedScore = response.response 
        ? Math.max(0, 100 - (response.response.responseTime / 100))
        : 0;
      
      const costScore = response.response?.usage 
        ? Math.max(0, 100 - (multiModelService.getModelCost(response.modelId) * 1000))
        : 0;
      
      const reliabilityScore = performance 
        ? (performance.successfulRequests / performance.totalRequests) * 100
        : response.status === 'completed' ? 100 : 0;
      
      // Quality score based on finish reason and content length
      const qualityScore = response.response && response.response.finishReason === 'stop'
        ? Math.min(100, (response.response.content.length / 10))
        : 0;
      
      const overallScore = (speedScore + costScore + reliabilityScore + qualityScore) / 4;
      
      return {
        modelId: response.modelId,
        model: response.model,
        overallScore,
        speedScore,
        costScore,
        reliabilityScore,
        qualityScore
      };
    });
    
    setQualityScores(scores.sort((a, b) => b.overallScore - a.overallScore));
    
    // Get historical performance data
    const historical = multiModelService.getAllModelMetrics();
    setHistoricalData(historical);
  }, [comparisonResult]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const sortedScores = [...qualityScores].sort((a, b) => {
    switch (selectedMetric) {
      case 'speed': return b.speedScore - a.speedScore;
      case 'cost': return b.costScore - a.costScore;
      case 'reliability': return b.reliabilityScore - a.reliabilityScore;
      case 'quality': return b.qualityScore - a.qualityScore;
      default: return b.overallScore - a.overallScore;
    }
  });

  return (
    <div className={className}>
      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scores">Quality Scores</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Quality Ranking</CardTitle>
              <div className="flex space-x-2">
                {(['overall', 'speed', 'cost', 'reliability', 'quality'] as const).map((metric) => (
                  <Button
                    key={metric}
                    variant={selectedMetric === metric ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMetric(metric)}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedScores.map((score, index) => {
                  const currentScore = score[`${selectedMetric}Score`] || score.overallScore;
                  return (
                    <div key={score.modelId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {score.model.provider}
                            </Badge>
                            <span className="font-medium">{score.model.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getScoreIcon(currentScore)}
                          <span className={`text-lg font-bold ${getScoreColor(currentScore)}`}>
                            {currentScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      
                      <Progress value={currentScore} className="h-2" />
                      
                      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Speed</div>
                          <div className={`font-medium ${getScoreColor(score.speedScore)}`}>
                            {score.speedScore.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Cost</div>
                          <div className={`font-medium ${getScoreColor(score.costScore)}`}>
                            {score.costScore.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Reliability</div>
                          <div className={`font-medium ${getScoreColor(score.reliabilityScore)}`}>
                            {score.reliabilityScore.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Quality</div>
                          <div className={`font-medium ${getScoreColor(score.qualityScore)}`}>
                            {score.qualityScore.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      
                      {onModelSelect && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => onModelSelect(score.model)}
                        >
                          Use This Model
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonResult.metrics.successfulModels}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful Models</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonResult.metrics.failedModels}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed Models</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.metrics.averageResponseTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Average Response</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${comparisonResult.metrics.totalCost.toFixed(4)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Individual Model Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparisonResult.responses.map((response) => (
                  <div key={response.modelId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-muted-foreground">Response Time</div>
                            <div className="font-medium">{response.response.responseTime}ms</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-muted-foreground">Tokens Used</div>
                            <div className="font-medium">{response.response.usage?.totalTokens || 0}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-muted-foreground">Cost</div>
                            <div className="font-medium">
                              ${(multiModelService.getModelCost(response.modelId) || 0).toFixed(4)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-muted-foreground">Finish Reason</div>
                            <div className="font-medium">{response.response.finishReason}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {response.error && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-700 text-sm">{response.error}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Fastest Model</div>
                      <div className="text-sm text-muted-foreground">
                        Best for time-sensitive applications
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {comparisonResult.recommendations.fastestModel.name}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {comparisonResult.metrics.bestResponseTime.toFixed(0)}ms
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">Most Cost Effective</div>
                      <div className="text-sm text-muted-foreground">
                        Best value for money
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {comparisonResult.recommendations.mostCostEffective.name}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Lowest cost per token
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Most Token Efficient</div>
                      <div className="text-sm text-muted-foreground">
                        Uses fewer tokens for similar output
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {comparisonResult.recommendations.mostTokenEfficient.name}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Optimized token usage
                    </div>
                  </div>
                </div>
                
                {comparisonResult.recommendations.bestQualityModel && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">Best Quality Model</div>
                        <div className="text-sm text-muted-foreground">
                          Highest quality responses
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {comparisonResult.recommendations.bestQualityModel.name}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Superior output quality
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Performance Data</CardTitle>
            </CardHeader>
            <CardContent>
              {historicalData.length > 0 ? (
                <div className="space-y-4">
                  {historicalData.map((metrics) => (
                    <div key={metrics.modelId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{metrics.modelId}</span>
                        <Badge variant="outline">
                          {metrics.totalRequests} requests
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-muted-foreground">Success Rate</div>
                          <div className="font-medium flex items-center justify-center">
                            {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%
                            {metrics.errorRate < 0.1 ? (
                              <TrendingUp className="h-3 w-3 text-green-500 ml-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500 ml-1" />
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Avg Response</div>
                          <div className="font-medium">{metrics.averageResponseTime.toFixed(0)}ms</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Total Cost</div>
                          <div className="font-medium">${metrics.totalCost.toFixed(4)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Uptime</div>
                          <div className="font-medium">{(metrics.uptime * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>No historical data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}