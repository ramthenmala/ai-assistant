import { ATSParsingService } from './ATSParsingService';
import { ATSScoringService } from './ATSScoringService';
import type { ParsedResume, JobDescription, ATSScore, ATSSettings } from '@/types/ats';

export class ATSManager {
  private parsingService: ATSParsingService;
  private scoringService: ATSScoringService;

  constructor() {
    this.parsingService = new ATSParsingService();
    this.scoringService = new ATSScoringService();
  }

  async checkOllamaAvailability(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const models = data.models || [];
      
      return models.length > 0;
    } catch (error) {
      return false;
    }
  }

  async parseResume(file: File): Promise<ParsedResume> {
    // Check if Ollama is available
    const useLocalLLM = await this.checkOllamaAvailability();

    console.log('Parsing resume with', useLocalLLM ? 'Ollama' : 'fallback parsing');
    
    return await this.parsingService.parseResume(file, useLocalLLM);
  }

  async scoreResume(
    resume: ParsedResume,
    job: JobDescription,
    settings?: ATSSettings
  ): Promise<ATSScore> {
    // Check if Ollama is available
    const useAI = await this.checkOllamaAvailability();

    return await this.scoringService.scoreResume(resume, job, settings, useAI);
  }

  async testOllamaConnection(): Promise<{ connected: boolean; models: string[] }> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        return { connected: false, models: [] };
      }

      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      
      return { connected: true, models };
    } catch (error) {
      return { connected: false, models: [] };
    }
  }
}