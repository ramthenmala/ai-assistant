import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useATSStore, useATSSelectors } from '@/stores/useATSStore';
import { 
  FileText, 
  Users, 
  Briefcase, 
  Settings, 
  Target,
  Clock,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

// Import ATS components (we'll create these next)
import { SingleResumeAnalysis } from './single/SingleResumeAnalysis';
import { BulkResumeRanking } from './bulk/BulkResumeRanking';
import { JobDescriptionManager } from './common/JobDescriptionManager';
import { ATSSettings } from './common/ATSSettings';

export const ATSContainer: React.FC = () => {
  const { activeTab, setActiveTab } = useATSStore();
  const { getATSStats } = useATSSelectors();
  const stats = getATSStats();

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">ATS Resume Scanner</h1>
              <p className="text-muted-foreground">
                AI-powered resume analysis and candidate ranking
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Target className="w-4 h-4 mr-1" />
                {stats.totalScores} Scores
              </Badge>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Resumes</p>
                  <p className="text-2xl font-bold">{stats.totalResumes}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Job Descriptions</p>
                  <p className="text-2xl font-bold">{stats.totalJobs}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Matches</p>
                  <p className="text-2xl font-bold">{stats.totalScores}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Avg Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore}%</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Single Analysis
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Bulk Ranking
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Job Descriptions
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 h-[calc(100%-4rem)]">
            <TabsContent value="single" className="h-full m-0">
              <SingleResumeAnalysis />
            </TabsContent>

            <TabsContent value="bulk" className="h-full m-0">
              <BulkResumeRanking />
            </TabsContent>

            <TabsContent value="jobs" className="h-full m-0">
              <JobDescriptionManager />
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0">
              <ATSSettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};