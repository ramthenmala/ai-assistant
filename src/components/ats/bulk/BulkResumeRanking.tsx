import React, { useState, useCallback } from 'react';
import { Upload, Users, Download, Eye, ArrowUpDown, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { FileInfo, CandidateScore, BulkSession } from '@/types/ats';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface BulkResumeRankingProps {
  jobDescription?: string;
}

export const BulkResumeRanking: React.FC<BulkResumeRankingProps> = ({
  jobDescription
}) => {
  const [bulkSession, setBulkSession] = useState<BulkSession | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const files: FileInfo[] = acceptedFiles.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: getFileType(file.name),
        size: file.size,
        parseStatus: 'pending',
        file
      }));

      const session: BulkSession = {
        id: crypto.randomUUID(),
        jobDescriptionId: '',
        uploadedFiles: files,
        processedResumes: [],
        rankings: [],
        sessionDate: new Date(),
        processingStats: {
          total: files.length,
          processed: 0,
          failed: 0,
          duration: 0
        },
        status: 'idle'
      };

      setBulkSession(session);
      processBulkFiles(session);
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
    multiple: true
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

  const processBulkFiles = async (session: BulkSession) => {
    setBulkSession(prev => prev ? { ...prev, status: 'processing' } : null);
    
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;

    // Simulate processing files
    for (const file of session.uploadedFiles) {
      try {
        // Update file status
        setBulkSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            uploadedFiles: prev.uploadedFiles.map(f => 
              f.id === file.id ? { ...f, parseStatus: 'processing' as const } : f
            )
          };
        });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Mock candidate score
        const score: CandidateScore = {
          candidateId: crypto.randomUUID(),
          resumeId: file.id,
          fileName: file.name,
          candidateName: generateMockName(),
          email: generateMockEmail(),
          phone: generateMockPhone(),
          overallScore: Math.floor(60 + Math.random() * 40), // 60-100
          scores: {
            keywordMatch: Math.floor(50 + Math.random() * 50),
            experienceRelevance: Math.floor(50 + Math.random() * 50),
            skillsAlignment: Math.floor(50 + Math.random() * 50),
            educationMatch: Math.floor(50 + Math.random() * 50),
            certifications: Math.floor(40 + Math.random() * 60),
            projectRelevance: Math.floor(50 + Math.random() * 50),
            industryFit: Math.floor(50 + Math.random() * 50)
          },
          highlights: [
            'Strong technical skills',
            'Relevant experience',
            'Good education background'
          ],
          gaps: [
            'Limited specific technology experience',
            'Could use more certifications'
          ],
          recommendations: [
            'Consider for technical interview',
            'Review portfolio projects'
          ],
          scoredAt: new Date()
        };

        processed++;
        
        // Update session with successful processing
        setBulkSession(prev => {
          if (!prev) return null;
          const updatedFiles = prev.uploadedFiles.map(f => 
            f.id === file.id ? { ...f, parseStatus: 'success' as const } : f
          );
          const updatedRankings = [...prev.rankings, score]
            .sort((a, b) => b.overallScore - a.overallScore)
            .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

          return {
            ...prev,
            uploadedFiles: updatedFiles,
            rankings: updatedRankings,
            processingStats: {
              ...prev.processingStats,
              processed
            }
          };
        });

      } catch (error) {
        failed++;
        setBulkSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            uploadedFiles: prev.uploadedFiles.map(f => 
              f.id === file.id ? { ...f, parseStatus: 'error' as const } : f
            ),
            processingStats: {
              ...prev.processingStats,
              failed
            }
          };
        });
      }
    }

    const duration = Date.now() - startTime;
    setBulkSession(prev => prev ? { 
      ...prev, 
      status: 'completed',
      processingStats: { ...prev.processingStats, duration }
    } : null);
  };

  const generateMockName = () => {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  };

  const generateMockEmail = () => {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    const prefix = Math.random().toString(36).substring(2, 8);
    return `${prefix}@${domains[Math.floor(Math.random() * domains.length)]}`;
  };

  const generateMockPhone = () => {
    return `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  };

  const resetSession = () => {
    setBulkSession(null);
    setSelectedCandidates(new Set());
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const selectAllCandidates = () => {
    if (!bulkSession) return;
    const allIds = new Set(bulkSession.rankings.map(r => r.candidateId));
    setSelectedCandidates(allIds);
  };

  const deselectAllCandidates = () => {
    setSelectedCandidates(new Set());
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 font-semibold';
    if (score >= 80) return 'text-blue-600 font-semibold';
    if (score >= 70) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {!jobDescription && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No job description selected. Rankings will be less accurate without a specific job description.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      {!bulkSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Resume Upload
            </CardTitle>
            <CardDescription>
              Upload multiple resumes to automatically rank candidates
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
                {isDragActive ? "Drop resumes here" : "Drop multiple resumes here or click to browse"}
              </h3>
              <p className="text-muted-foreground mb-4">
                Supports PDF, DOCX, DOC, TXT, RTF, MD, HTML, and images
              </p>
              <p className="text-sm text-muted-foreground">
                Upload up to 50 resumes at once • Maximum 10MB per file
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {bulkSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bulk Processing Session
              </span>
              <Button onClick={resetSession} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                New Session
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{bulkSession.processingStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{bulkSession.processingStats.processed}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{bulkSession.processingStats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {bulkSession.processingStats.duration > 0 
                    ? `${Math.round(bulkSession.processingStats.duration / 1000)}s`
                    : '---'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
            </div>

            {bulkSession.status === 'processing' && (
              <div className="space-y-2">
                <Progress 
                  value={(bulkSession.processingStats.processed / bulkSession.processingStats.total) * 100} 
                  className="h-2" 
                />
                <p className="text-sm text-muted-foreground text-center">
                  Processing resumes and generating rankings...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rankings Table */}
      {bulkSession && bulkSession.rankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Candidate Rankings</span>
              <div className="flex items-center gap-2">
                {selectedCandidates.size > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedCandidates.size} selected
                    </span>
                    <Button size="sm" variant="outline">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Compare
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Candidates ranked by overall score (higher is better)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCandidates.size === bulkSession.rankings.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAllCandidates();
                    } else {
                      deselectAllCandidates();
                    }
                  }}
                />
                <span className="text-sm">Select All</span>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Overall Score</TableHead>
                    <TableHead className="text-center">Skills</TableHead>
                    <TableHead className="text-center">Experience</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkSession.rankings.map((candidate) => (
                    <TableRow key={candidate.candidateId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCandidates.has(candidate.candidateId)}
                          onCheckedChange={() => toggleCandidateSelection(candidate.candidateId)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{candidate.rank}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{candidate.candidateName}</div>
                          <div className="text-sm text-muted-foreground">{candidate.fileName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{candidate.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getScoreBadgeVariant(candidate.overallScore)}>
                          {candidate.overallScore}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getScoreColor(candidate.scores.skillsAlignment)}>
                          {candidate.scores.skillsAlignment}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getScoreColor(candidate.scores.experienceRelevance)}>
                          {candidate.scores.experienceRelevance}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};