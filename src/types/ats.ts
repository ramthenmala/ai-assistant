export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string | 'Present';
  current: boolean;
  description: string;
  achievements: string[];
  technologies: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location?: string;
  startDate: string;
  endDate: string;
  gpa?: number;
  achievements?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  technologies: string[];
  link?: string;
  achievements: string[];
}

export interface Skill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'tool';
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  link?: string;
}

export interface ParsedResume {
  id: string;
  fileName: string;
  uploadDate: string;
  parseStatus: 'pending' | 'parsing' | 'completed' | 'failed';
  parseError?: string;
  
  // Extracted Information
  personalInfo?: PersonalInfo;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
  
  // Meta Information
  totalExperienceYears?: number;
  keywords: string[];
  rawText?: string;
}

export interface JobRequirement {
  skill: string;
  required: boolean;
  yearsNeeded?: number;
  importance: 'critical' | 'important' | 'nice-to-have';
}

export interface JobDescription {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: 'onsite' | 'remote' | 'hybrid';
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  
  description: string;
  responsibilities: string[];
  requirements: JobRequirement[];
  preferredQualifications: string[];
  
  experienceRange: {
    min: number;
    max: number;
  };
  
  educationRequirement?: {
    level: 'high-school' | 'bachelors' | 'masters' | 'phd';
    fields: string[];
    required: boolean;
  };
  
  benefits?: string[];
  createdDate: string;
  active: boolean;
}

export interface ScoreBreakdown {
  experience: {
    score: number;
    weight: number;
    details: {
      relevantYears: number;
      totalYears: number;
      matchedRoles: string[];
    };
  };
  skills: {
    score: number;
    weight: number;
    details: {
      matched: string[];
      missing: string[];
      coverage: number;
    };
  };
  education: {
    score: number;
    weight: number;
    details: {
      meetsRequirement: boolean;
      relevantDegree: boolean;
    };
  };
  keywords: {
    score: number;
    weight: number;
    details: {
      matched: string[];
      density: number;
    };
  };
}

export interface ATSScore {
  resumeId: string;
  jobId: string;
  overallScore: number; // 0-100
  breakdown: ScoreBreakdown;
  
  insights: {
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  };
  
  ranking?: number; // Position in bulk ranking
  scoredDate: string;
}

export interface ATSSettings {
  scoring: {
    experienceWeight: number;
    skillsWeight: number;
    educationWeight: number;
    keywordsWeight: number;
  };
  
  parsing: {
    extractEmail: boolean;
    extractPhone: boolean;
    extractLinkedIn: boolean;
    extractGitHub: boolean;
    useOCR: boolean;
  };
  
  minimumScore: number;
  autoRejectBelowMinimum: boolean;
}

export interface BulkScanSession {
  id: string;
  jobId: string;
  startDate: string;
  endDate?: string;
  status: 'processing' | 'completed' | 'failed';
  
  totalResumes: number;
  processedResumes: number;
  failedResumes: number;
  
  results: ATSScore[];
}