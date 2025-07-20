export interface FileInfo {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'doc' | 'txt' | 'rtf' | 'md' | 'html' | 'image' | 'unknown';
  size: number;
  content?: string;
  parseStatus: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  file: File;
}

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  duration: string;
  description: string;
  achievements: string[];
}

export interface Education {
  degree: string;
  field?: string;
  institution: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
  honors?: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  achievements?: string[];
}

export interface Skills {
  technical: string[];
  soft: string[];
  languages: string[];
  tools: string[];
  frameworks?: string[];
  databases?: string[];
}

export interface ParsedResume {
  id: string;
  fileName: string;
  fileType: string;
  rawContent: string;
  parsedData: {
    personal: PersonalInfo;
    summary?: string;
    experience: Experience[];
    education: Education[];
    skills: Skills;
    certifications: string[];
    projects: Project[];
    awards?: string[];
    publications?: string[];
  };
  parseQuality: number; // 0-100 confidence score
  parsedAt: Date;
}

export interface ScoreBreakdown {
  keywordMatch: number;
  experienceRelevance: number;
  skillsAlignment: number;
  educationMatch: number;
  certifications: number;
  projectRelevance: number;
  industryFit: number;
}

export interface CandidateScore {
  candidateId: string;
  resumeId: string;
  fileName: string;
  candidateName: string;
  email: string;
  phone: string;
  overallScore: number; // 0-100
  rank?: number; // Position in ranking
  scores: ScoreBreakdown;
  highlights: string[]; // Top matching points
  gaps: string[]; // Missing requirements
  recommendations: string[]; // Suggestions for improvement
  aiInsights?: string[]; // RAG-generated insights
  scoredAt: Date;
}

export interface JobDescription {
  id: string;
  title: string;
  company?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  description: string;
  requirements: string[];
  preferredQualifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  keywords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkSession {
  id: string;
  jobDescriptionId: string;
  jobDescription?: JobDescription;
  uploadedFiles: FileInfo[];
  processedResumes: ParsedResume[];
  rankings: CandidateScore[];
  sessionDate: Date;
  processingStats: {
    total: number;
    processed: number;
    failed: number;
    duration: number; // in ms
  };
  status: 'idle' | 'processing' | 'completed' | 'error';
}

export interface ScoringWeights {
  keywordMatch: number;
  experienceRelevance: number;
  skillsAlignment: number;
  educationMatch: number;
  certifications: number;
  projectRelevance: number;
  industryFit: number;
}

export interface ATSSettings {
  scoringWeights: ScoringWeights;
  minimumScore: number; // Threshold for considering a candidate
  parseOptions: {
    extractEmail: boolean;
    extractPhone: boolean;
    extractLinkedIn: boolean;
    extractGitHub: boolean;
    performOCR: boolean;
  };
  rankingOptions: {
    showTopN: number;
    highlightThreshold: number;
  };
}