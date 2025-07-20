import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { FileInfo, ParsedResume, CandidateScore } from '@/types/ats';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface SingleResumeAnalysisProps {
  jobDescription?: string;
}

export const SingleResumeAnalysis: React.FC<SingleResumeAnalysisProps> = ({
  jobDescription
}) => {
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [candidateScore, setCandidateScore] = useState<CandidateScore | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const fileInfo: FileInfo = {
        id: crypto.randomUUID(),
        name: file.name,
        type: getFileType(file.name),
        size: file.size,
        parseStatus: 'pending',
        file
      };
      
      setUploadedFile(fileInfo);
      setError(null);
      processFile(fileInfo);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/rtf': ['.rtf'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    },
    maxFiles: 1,
    multiple: false
  });

  const getFileType = (fileName: string): FileInfo['type'] => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'doc': return 'doc';
      case 'txt': return 'txt';
      case 'rtf': return 'rtf';
      case 'md': return 'md';
      case 'html': return 'html';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'bmp':
      case 'tiff':
        return 'image';
      default: return 'unknown';
    }
  };

  const processFile = async (fileInfo: FileInfo) => {
    setIsProcessing(true);
    setUploadedFile(prev => prev ? { ...prev, parseStatus: 'processing' as const } : null);

    try {
      // Simulate file processing (replace with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock parsed resume data
      const mockParsedResume: ParsedResume = {
        id: crypto.randomUUID(),
        fileName: fileInfo.name,
        fileType: fileInfo.type,
        rawContent: 'Mock content...',
        parsedData: {
          personal: {
            name: 'John Doe',
            email: 'john.doe@email.com',
            phone: '+1 (555) 123-4567',
            location: 'San Francisco, CA',
            linkedin: 'linkedin.com/in/johndoe'
          },
          summary: 'Experienced software engineer with 5+ years in React and Node.js development.',
          experience: [
            {
              title: 'Senior Software Engineer',
              company: 'Tech Corp',
              duration: '2022 - Present',
              description: 'Led development of React applications',
              achievements: ['Improved performance by 40%', 'Led team of 4 developers']
            }
          ],
          education: [
            {
              degree: 'Bachelor of Science in Computer Science',
              institution: 'UC Berkeley',
              graduationDate: '2018'
            }
          ],
          skills: {
            technical: ['React', 'Node.js', 'TypeScript', 'Python'],
            soft: ['Leadership', 'Communication', 'Problem Solving'],
            languages: ['English', 'Spanish'],
            tools: ['Git', 'Docker', 'AWS']
          },
          certifications: ['AWS Solutions Architect'],
          projects: [
            {
              name: 'E-commerce Platform',
              description: 'Built a full-stack e-commerce solution',
              technologies: ['React', 'Node.js', 'MongoDB']
            }
          ]
        },
        parseQuality: 92,
        parsedAt: new Date()
      };

      // Mock candidate scoring
      const mockScore: CandidateScore = {
        candidateId: crypto.randomUUID(),
        resumeId: mockParsedResume.id,
        fileName: fileInfo.name,
        candidateName: mockParsedResume.parsedData.personal.name,
        email: mockParsedResume.parsedData.personal.email,
        phone: mockParsedResume.parsedData.personal.phone,
        overallScore: 85,
        scores: {
          keywordMatch: 88,
          experienceRelevance: 90,
          skillsAlignment: 85,
          educationMatch: 80,
          certifications: 75,
          projectRelevance: 88,
          industryFit: 82
        },
        highlights: [
          'Strong React and TypeScript experience',
          'Leadership experience with team management',
          'Relevant AWS certification'
        ],
        gaps: [
          'No Python experience mentioned',
          'Limited testing framework knowledge'
        ],
        recommendations: [
          'Consider highlighting any Python projects',
          'Add unit testing experience if available'
        ],
        scoredAt: new Date()
      };

      setParsedResume(mockParsedResume);
      setCandidateScore(mockScore);
      setUploadedFile(prev => prev ? { ...prev, parseStatus: 'success' as const } : null);
      
    } catch (err) {
      setError('Failed to process resume. Please try again.');
      setUploadedFile(prev => prev ? { ...prev, parseStatus: 'error' as const } : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAnalysis = () => {
    setUploadedFile(null);
    setParsedResume(null);
    setCandidateScore(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {!jobDescription && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No job description selected. Go to the Job Descriptions tab to create one for more accurate scoring.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      {!uploadedFile && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>
              Upload a single resume for detailed analysis and scoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? "Drop the resume here" : "Drop resume here or click to browse"}
              </h3>
              <p className="text-muted-foreground mb-4">
                Supports PDF, DOCX, DOC, TXT, RTF, MD, HTML, and images
              </p>
              <p className="text-sm text-muted-foreground">
                Maximum file size: 10MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {uploadedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {uploadedFile.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={
                uploadedFile.parseStatus === 'success' ? 'default' :
                uploadedFile.parseStatus === 'error' ? 'destructive' :
                uploadedFile.parseStatus === 'processing' ? 'secondary' : 'outline'
              }>
                {uploadedFile.parseStatus === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {uploadedFile.parseStatus === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                {uploadedFile.parseStatus === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                {uploadedFile.parseStatus.charAt(0).toUpperCase() + uploadedFile.parseStatus.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={66} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Parsing resume content and extracting information...
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={resetAnalysis} variant="outline" size="sm">
                Upload Different Resume
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {candidateScore && parsedResume && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Card */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>AI-powered analysis results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {candidateScore.overallScore}%
                </div>
                <p className="text-muted-foreground">Overall Match</p>
              </div>

              <div className="space-y-3">
                {Object.entries(candidateScore.scores).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span>{value}%</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">Strengths</h4>
                <ul className="space-y-1">
                  {candidateScore.highlights.map((highlight, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-orange-600 mb-2">Areas for Improvement</h4>
                <ul className="space-y-1">
                  {candidateScore.gaps.map((gap, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {candidateScore.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};