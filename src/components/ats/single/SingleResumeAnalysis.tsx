import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useATSStore } from '@/stores/useATSStore';
import { ATSManager } from '@/services/ats/ATSManager';
import type { ParsedResume, ATSScore } from '@/types/ats';

export const SingleResumeAnalysis: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentResume, setCurrentResume] = useState<ParsedResume | null>(null);
  const [currentScore, setCurrentScore] = useState<ATSScore | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; models: string[] }>({ connected: false, models: [] });
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const atsManagerRef = useRef<ATSManager | null>(null);

  // Initialize ATS Manager
  const getATSManager = () => {
    if (!atsManagerRef.current) {
      atsManagerRef.current = new ATSManager();
    }
    return atsManagerRef.current;
  };

  const { selectedJobId, getJobDescriptionById, addResume, addScore } = useATSStore();
  const selectedJob = selectedJobId ? getJobDescriptionById(selectedJobId) : null;

  // Check Ollama status on component mount
  React.useEffect(() => {
    const checkOllama = async () => {
      const manager = getATSManager();
      const status = await manager.testOllamaConnection();
      setOllamaStatus(status);
    };
    checkOllama();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setUploadStatus('uploading');
    setErrorMessage('');
    setProcessingProgress(10);

    try {
      const manager = getATSManager();
      
      // Simulate upload progress
      await new Promise(resolve => setTimeout(resolve, 500));
      setProcessingProgress(30);
      setUploadStatus('processing');
      
      console.log('Starting resume parsing for:', file.name);
      
      // Real resume parsing with ATS services
      const parsedResume = await manager.parseResume(file);
      console.log('Parsed resume:', parsedResume);
      
      setProcessingProgress(70);
      
      // Add to store
      addResume(parsedResume);
      setCurrentResume(parsedResume);
      
      // Score if job is selected
      let score: ATSScore | null = null;
      if (selectedJob && parsedResume.parseStatus === 'completed') {
        console.log('Scoring against job:', selectedJob.title);
        score = await manager.scoreResume(parsedResume, selectedJob);
        console.log('Score result:', score);
        
        addScore(score);
        setCurrentScore(score);
      }
      
      setProcessingProgress(100);
      setUploadStatus('complete');

    } catch (error) {
      console.error('Resume processing error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process resume. Please try again.');
      setUploadStatus('error');
      setProcessingProgress(0);
    }
  }, [selectedJob, addResume, addScore]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
    },
    maxFiles: 1,
    disabled: uploadStatus === 'uploading' || uploadStatus === 'processing',
  });

  const resetUpload = () => {
    setUploadStatus('idle');
    setCurrentResume(null);
    setCurrentScore(null);
    setErrorMessage('');
  };

  return (
    <div className="h-full space-y-6">
      {/* Status Indicators */}
      <div className="flex gap-4">
        {/* Job Selection Alert */}
        {!selectedJob && (
          <Alert className="flex-1">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select a job description from the "Job Descriptions" tab to enable resume scoring.
            </AlertDescription>
          </Alert>
        )}

        {/* Ollama Status */}
        <Alert className={ollamaStatus.connected ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
          {ollamaStatus.connected ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-orange-600" />
          )}
          <AlertDescription className={ollamaStatus.connected ? 'text-green-800' : 'text-orange-800'}>
            {ollamaStatus.connected 
              ? `Ollama connected (${ollamaStatus.models.length} models)`
              : 'Ollama not connected - using fallback parsing'
            }
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Upload Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>
              Upload a resume file to analyze. Supported formats: PDF, DOCX, DOC, TXT, RTF
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            {uploadStatus === 'idle' && (
              <div
                {...getRootProps()}
                className={`flex-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a resume'}
                </p>
                <p className="text-muted-foreground mb-4">
                  or click to select a file
                </p>
                <Button variant="outline">
                  Select File
                </Button>
              </div>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <div className="flex-1 flex flex-col justify-center items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <p className="font-medium">
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing Resume...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {uploadStatus === 'uploading' 
                      ? 'File is being uploaded' 
                      : ollamaStatus.connected 
                        ? 'Analyzing with local AI model' 
                        : 'Extracting content with fallback parsing'
                    }
                  </p>
                </div>
                <Progress value={processingProgress} className="w-full max-w-sm" />
              </div>
            )}

            {uploadStatus === 'complete' && currentResume && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Resume processed successfully!</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{currentResume.fileName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Processed on {new Date(currentResume.uploadDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={resetUpload} variant="outline" size="sm">
                    Upload Another
                  </Button>
                  {currentScore && (
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  )}
                </div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
                <Button onClick={resetUpload} variant="outline">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Resume analysis and scoring results
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1">
            {!currentResume && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Eye className="h-12 w-12 mb-4" />
                <p>Upload a resume to see analysis results</p>
              </div>
            )}

            {currentResume && (
              <div className="space-y-6">
                {/* Personal Info */}
                {currentResume.personalInfo && (
                  <div>
                    <h3 className="font-semibold mb-3">Candidate Information</h3>
                    <div className="space-y-2 text-sm">
                      {currentResume.personalInfo.name && (
                        <p><span className="font-medium">Name:</span> {currentResume.personalInfo.name}</p>
                      )}
                      {currentResume.personalInfo.email && (
                        <p><span className="font-medium">Email:</span> {currentResume.personalInfo.email}</p>
                      )}
                      {currentResume.personalInfo.phone && (
                        <p><span className="font-medium">Phone:</span> {currentResume.personalInfo.phone}</p>
                      )}
                      {currentResume.personalInfo.location && (
                        <p><span className="font-medium">Location:</span> {currentResume.personalInfo.location}</p>
                      )}
                      {currentResume.totalExperienceYears && (
                        <p><span className="font-medium">Experience:</span> {currentResume.totalExperienceYears} years</p>
                      )}
                      {(!currentResume.personalInfo.name && !currentResume.personalInfo.email) && (
                        <p className="text-muted-foreground italic">
                          {ollamaStatus.connected 
                            ? 'AI parsing in progress...' 
                            : 'Basic text extraction completed'
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h3 className="font-semibold mb-3">Key Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentResume.skills && currentResume.skills.length > 0 ? (
                      currentResume.skills.slice(0, 8).map((skill, index: number) => (
                        <Badge key={index} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))
                    ) : currentResume.keywords && currentResume.keywords.length > 0 ? (
                      currentResume.keywords.slice(0, 8).map((keyword, index: number) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills extracted yet</p>
                    )}
                  </div>
                </div>

                {/* Parse Status */}
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      currentResume.parseStatus === 'completed' ? 'bg-green-500' :
                      currentResume.parseStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="capitalize">{currentResume.parseStatus}</span>
                    {currentResume.parseStatus === 'failed' && currentResume.parseError && (
                      <span className="text-red-600">- {currentResume.parseError}</span>
                    )}
                  </div>
                </div>

                {/* Scoring Results */}
                {currentScore && (
                  <div>
                    <h3 className="font-semibold mb-3">Matching Score</h3>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-primary/5 rounded-lg">
                        <div className="text-3xl font-bold text-primary mb-1">
                          {currentScore.overallScore}%
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Match</div>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(currentScore.breakdown).map(([key, data]: [string, any]) => (
                          <div key={key}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium capitalize">{key}</span>
                              <span className="text-sm text-muted-foreground">{data.score}%</span>
                            </div>
                            <Progress value={data.score} className="h-2" />
                          </div>
                        ))}
                      </div>

                      {currentScore.insights.strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                          <ul className="text-sm space-y-1">
                            {currentScore.insights.strengths.map((strength: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentScore.insights.gaps.length > 0 && (
                        <div>
                          <h4 className="font-medium text-orange-600 mb-2">Areas for Improvement</h4>
                          <ul className="text-sm space-y-1">
                            {currentScore.insights.gaps.map((gap: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <AlertCircle className="h-3 w-3 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};