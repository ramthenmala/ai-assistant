import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSearch, Users, FileText, Settings as SettingsIcon } from 'lucide-react';
import { SingleResumeAnalysis } from './single/SingleResumeAnalysis';
import { BulkResumeRanking } from './bulk/BulkResumeRanking';
import { JobDescriptionManager } from './common/JobDescriptionManager';
import { ScoringSettings } from './common/ScoringSettings';

export const ATSContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('single');
  const [selectedJobDescription, setSelectedJobDescription] = useState<string>('');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ATS Resume Scanner</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered resume analysis and candidate ranking system
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex-shrink-0 p-6 pb-0">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Single Analysis
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Bulk Ranking
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Job Descriptions
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="single" className="h-full">
              <div className="p-6 space-y-6">
                <SingleResumeAnalysis jobDescription={selectedJobDescription} />
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="h-full">
              <div className="p-6 space-y-6">
                <BulkResumeRanking jobDescription={selectedJobDescription} />
              </div>
            </TabsContent>

            <TabsContent value="jobs" className="h-full">
              <div className="p-6 space-y-6">
                <JobDescriptionManager 
                  selectedId={selectedJobDescription}
                  onSelect={setSelectedJobDescription}
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="h-full">
              <div className="p-6 space-y-6">
                <ScoringSettings />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};