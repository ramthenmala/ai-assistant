import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Upload, Download, Play } from 'lucide-react';

export const BulkResumeRanking: React.FC = () => {
  return (
    <div className="h-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Upload
            </CardTitle>
            <CardDescription>
              Upload multiple resumes (up to 50 files)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop multiple resume files or click to select
              </p>
              <Button variant="outline">
                Select Files
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Processing
            </CardTitle>
            <CardDescription>
              Batch processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>0/0</span>
                </div>
                <Progress value={0} />
              </div>
              <div className="text-sm text-muted-foreground">
                Ready to process resumes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export
            </CardTitle>
            <CardDescription>
              Download analysis results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export to PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidate Rankings
          </CardTitle>
          <CardDescription>
            Ranked list of candidates based on job requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4" />
            <p className="mb-2">No resumes uploaded yet</p>
            <p className="text-sm">Upload resumes and select a job description to see rankings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};