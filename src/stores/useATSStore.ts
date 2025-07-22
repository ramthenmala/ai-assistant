import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ParsedResume, 
  JobDescription, 
  ATSScore, 
  ATSSettings,
  BulkScanSession
} from '@/types/ats';

export interface ATSState {
  // Data
  resumes: ParsedResume[];
  jobDescriptions: JobDescription[];
  scores: ATSScore[];
  bulkSessions: BulkScanSession[];
  settings: ATSSettings;

  // UI State
  activeTab: 'single' | 'bulk' | 'jobs' | 'settings';
  selectedJobId: string | null;
  selectedResumeIds: string[];
  isProcessing: boolean;
  processingStatus: string;
  
  // Upload State
  uploadProgress: Record<string, number>; // file name -> progress
  processingQueue: string[]; // resume IDs being processed

  // Actions
  setActiveTab: (tab: ATSState['activeTab']) => void;
  setSelectedJobId: (jobId: string | null) => void;
  setSelectedResumeIds: (resumeIds: string[]) => void;
  
  // Resume Management
  addResume: (resume: ParsedResume) => void;
  updateResume: (resumeId: string, updates: Partial<ParsedResume>) => void;
  deleteResume: (resumeId: string) => void;
  getResumeById: (resumeId: string) => ParsedResume | undefined;
  
  // Job Description Management
  addJobDescription: (job: JobDescription) => void;
  updateJobDescription: (jobId: string, updates: Partial<JobDescription>) => void;
  deleteJobDescription: (jobId: string) => void;
  getJobDescriptionById: (jobId: string) => JobDescription | undefined;
  
  // Scoring
  addScore: (score: ATSScore) => void;
  updateScore: (scoreId: string, updates: Partial<ATSScore>) => void;
  deleteScore: (scoreId: string) => void;
  getScoresForJob: (jobId: string) => ATSScore[];
  getScoreForResume: (resumeId: string, jobId: string) => ATSScore | undefined;
  getRankedScores: (jobId: string) => ATSScore[];
  
  // Bulk Processing
  createBulkSession: (session: BulkScanSession) => void;
  updateBulkSession: (sessionId: string, updates: Partial<BulkScanSession>) => void;
  getBulkSession: (sessionId: string) => BulkScanSession | undefined;
  
  // Processing State
  setProcessing: (processing: boolean) => void;
  setProcessingStatus: (status: string) => void;
  setUploadProgress: (fileName: string, progress: number) => void;
  addToProcessingQueue: (resumeId: string) => void;
  removeFromProcessingQueue: (resumeId: string) => void;
  
  // Settings
  updateSettings: (updates: Partial<ATSSettings>) => void;
  resetSettings: () => void;
  
  // Utilities
  clearAllData: () => void;
  exportData: () => string;
  importData: (data: string) => void;
}

const defaultSettings: ATSSettings = {
  scoring: {
    experienceWeight: 30,
    skillsWeight: 40,
    educationWeight: 20,
    keywordsWeight: 10,
  },
  parsing: {
    extractEmail: true,
    extractPhone: true,
    extractLinkedIn: true,
    extractGitHub: true,
    useOCR: false,
  },
  minimumScore: 70,
  autoRejectBelowMinimum: false,
};

export const useATSStore = create<ATSState>()(
  persist(
    (set, get) => ({
      // Initial State
      resumes: [],
      jobDescriptions: [],
      scores: [],
      bulkSessions: [],
      settings: defaultSettings,
      
      // UI State
      activeTab: 'single',
      selectedJobId: null,
      selectedResumeIds: [],
      isProcessing: false,
      processingStatus: '',
      uploadProgress: {},
      processingQueue: [],

      // UI Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedJobId: (jobId) => set({ selectedJobId: jobId }),
      setSelectedResumeIds: (resumeIds) => set({ selectedResumeIds: resumeIds }),

      // Resume Management
      addResume: (resume) => set((state) => ({
        resumes: [...state.resumes, resume],
      })),

      updateResume: (resumeId, updates) => set((state) => ({
        resumes: state.resumes.map(resume =>
          resume.id === resumeId ? { ...resume, ...updates } : resume
        ),
      })),

      deleteResume: (resumeId) => set((state) => ({
        resumes: state.resumes.filter(resume => resume.id !== resumeId),
        scores: state.scores.filter(score => score.resumeId !== resumeId),
        selectedResumeIds: state.selectedResumeIds.filter(id => id !== resumeId),
      })),

      getResumeById: (resumeId) => {
        return get().resumes.find(resume => resume.id === resumeId);
      },

      // Job Description Management
      addJobDescription: (job) => set((state) => ({
        jobDescriptions: [...state.jobDescriptions, job],
      })),

      updateJobDescription: (jobId, updates) => set((state) => ({
        jobDescriptions: state.jobDescriptions.map(job =>
          job.id === jobId ? { ...job, ...updates } : job
        ),
      })),

      deleteJobDescription: (jobId) => set((state) => ({
        jobDescriptions: state.jobDescriptions.filter(job => job.id !== jobId),
        scores: state.scores.filter(score => score.jobId !== jobId),
        selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId,
      })),

      getJobDescriptionById: (jobId) => {
        return get().jobDescriptions.find(job => job.id === jobId);
      },

      // Scoring
      addScore: (score) => set((state) => {
        // Remove existing score for same resume-job combination
        const filteredScores = state.scores.filter(
          s => !(s.resumeId === score.resumeId && s.jobId === score.jobId)
        );
        return {
          scores: [...filteredScores, score],
        };
      }),

      updateScore: (scoreId, updates) => set((state) => ({
        scores: state.scores.map(score => {
          if (score.resumeId === scoreId.split('-')[0] && 
              score.jobId === scoreId.split('-')[1]) {
            return { ...score, ...updates };
          }
          return score;
        }),
      })),

      deleteScore: (scoreId) => set((state) => ({
        scores: state.scores.filter(score => 
          `${score.resumeId}-${score.jobId}` !== scoreId
        ),
      })),

      getScoresForJob: (jobId) => {
        return get().scores.filter(score => score.jobId === jobId);
      },

      getScoreForResume: (resumeId, jobId) => {
        return get().scores.find(score => 
          score.resumeId === resumeId && score.jobId === jobId
        );
      },

      getRankedScores: (jobId) => {
        const scores = get().scores.filter(score => score.jobId === jobId);
        return scores
          .sort((a, b) => b.overallScore - a.overallScore)
          .map((score, index) => ({ ...score, ranking: index + 1 }));
      },

      // Bulk Processing
      createBulkSession: (session) => set((state) => ({
        bulkSessions: [...state.bulkSessions, session],
      })),

      updateBulkSession: (sessionId, updates) => set((state) => ({
        bulkSessions: state.bulkSessions.map(session =>
          session.id === sessionId ? { ...session, ...updates } : session
        ),
      })),

      getBulkSession: (sessionId) => {
        return get().bulkSessions.find(session => session.id === sessionId);
      },

      // Processing State
      setProcessing: (processing) => set({ isProcessing: processing }),

      setProcessingStatus: (status) => set({ processingStatus: status }),

      setUploadProgress: (fileName, progress) => set((state) => ({
        uploadProgress: {
          ...state.uploadProgress,
          [fileName]: progress,
        },
      })),

      addToProcessingQueue: (resumeId) => set((state) => ({
        processingQueue: [...state.processingQueue, resumeId],
      })),

      removeFromProcessingQueue: (resumeId) => set((state) => ({
        processingQueue: state.processingQueue.filter(id => id !== resumeId),
      })),

      // Settings
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates },
      })),

      resetSettings: () => set({ settings: defaultSettings }),

      // Utilities
      clearAllData: () => set({
        resumes: [],
        jobDescriptions: [],
        scores: [],
        bulkSessions: [],
        selectedJobId: null,
        selectedResumeIds: [],
        uploadProgress: {},
        processingQueue: [],
      }),

      exportData: () => {
        const state = get();
        const exportData = {
          resumes: state.resumes,
          jobDescriptions: state.jobDescriptions,
          scores: state.scores,
          settings: state.settings,
          exportDate: new Date().toISOString(),
          version: '1.0.0',
        };
        return JSON.stringify(exportData, null, 2);
      },

      importData: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.version === '1.0.0') {
            set({
              resumes: parsed.resumes || [],
              jobDescriptions: parsed.jobDescriptions || [],
              scores: parsed.scores || [],
              settings: { ...defaultSettings, ...parsed.settings },
            });
          } else {
            throw new Error('Unsupported data version');
          }
        } catch (error) {
          console.error('Failed to import data:', error);
          throw new Error('Invalid data format');
        }
      },
    }),
    {
      name: 'ats-storage',
      partialize: (state) => ({
        resumes: state.resumes,
        jobDescriptions: state.jobDescriptions,
        scores: state.scores,
        bulkSessions: state.bulkSessions,
        settings: state.settings,
        selectedJobId: state.selectedJobId,
      }),
    }
  )
);

// Selectors for commonly used computed values
export const useATSSelectors = () => {
  const store = useATSStore();
  
  return {
    // Get active job
    getActiveJob: () => {
      if (!store.selectedJobId) return null;
      return store.getJobDescriptionById(store.selectedJobId);
    },
    
    // Get selected resumes
    getSelectedResumes: () => {
      return store.selectedResumeIds
        .map(id => store.getResumeById(id))
        .filter(Boolean) as ParsedResume[];
    },
    
    // Get processing statistics
    getProcessingStats: () => {
      const total = store.processingQueue.length;
      const completed = store.resumes.filter(r => 
        store.processingQueue.includes(r.id) && r.parseStatus === 'completed'
      ).length;
      const failed = store.resumes.filter(r => 
        store.processingQueue.includes(r.id) && r.parseStatus === 'failed'
      ).length;
      
      return { total, completed, failed, inProgress: total - completed - failed };
    },
    
    // Get overall ATS statistics
    getATSStats: () => {
      const totalResumes = store.resumes.length;
      const totalJobs = store.jobDescriptions.length;
      const totalScores = store.scores.length;
      const avgScore = store.scores.length > 0 
        ? Math.round(store.scores.reduce((sum, s) => sum + s.overallScore, 0) / store.scores.length)
        : 0;
      
      return { totalResumes, totalJobs, totalScores, avgScore };
    },
  };
};