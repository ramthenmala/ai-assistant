import type { ParsedResume, PersonalInfo, Experience, Education, Project, Skill, Certification } from '@/types/ats';
import { ATSDocumentProcessor } from './ATSDocumentProcessor';

export class ATSParsingService {
  private documentProcessor: ATSDocumentProcessor;
  
  constructor() {
    this.documentProcessor = new ATSDocumentProcessor();
  }

  async parseResume(file: File, useLocalLLM: boolean = true): Promise<ParsedResume> {
    const resumeId = this.generateResumeId();
    
    try {
      // Extract text from the document
      const { text, chunks } = await this.documentProcessor.processResume(file);
      
      // Extract keywords for quick matching
      const keywords = this.documentProcessor.extractKeywords(text);
      
      // Use AI to parse structured data
      const parsedData = await this.parseWithAI(text, file.name, useLocalLLM);
      
      return {
        id: resumeId,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        parseStatus: 'completed',
        ...parsedData,
        keywords,
        rawText: text,
      };
    } catch (error) {
      return {
        id: resumeId,
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        parseStatus: 'failed',
        parseError: error instanceof Error ? error.message : 'Unknown error',
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        keywords: [],
      };
    }
  }

  private async parseWithAI(
    resumeText: string,
    fileName: string,
    useLocalLLM: boolean
  ): Promise<Partial<ParsedResume>> {
    if (useLocalLLM) {
      try {
        // Try direct Ollama API call
        return await this.parseWithOllamaAPI(resumeText);
      } catch (error) {
        console.warn('Ollama API failed, falling back to rule-based parsing:', error);
        return this.fallbackParsing(resumeText);
      }
    } else {
      // Fallback to rule-based parsing if no local LLM
      return this.fallbackParsing(resumeText);
    }
  }

  private async parseWithOllamaAPI(resumeText: string): Promise<Partial<ParsedResume>> {
    const prompt = this.createParsingPrompt(resumeText);
    
    try {
      // Check what models are available
      const modelsResponse = await fetch('http://localhost:11434/api/tags');
      if (!modelsResponse.ok) {
        throw new Error('Ollama not available');
      }
      
      const modelsData = await modelsResponse.json();
      const models = modelsData.models || [];
      
      if (models.length === 0) {
        throw new Error('No Ollama models found');
      }
      
      // Use the first available model (prefer mistral)
      const selectedModel = models.find((m: any) => m.name.includes('mistral')) || models[0];
      
      console.log('Using Ollama model:', selectedModel.name);
      
      // Make API call to Ollama
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel.name,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            num_predict: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Ollama response:', data.response);
      
      // Parse the AI response
      return this.parseAIResponse(data.response);
    } catch (error) {
      console.error('Ollama parsing failed:', error);
      throw error;
    }
  }

  private createParsingPrompt(resumeText: string): string {
    return `Please parse the following resume and extract structured information. Return the data in JSON format with the following structure:

{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedIn": "",
    "github": "",
    "portfolio": ""
  },
  "summary": "",
  "experience": [
    {
      "company": "",
      "position": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "description": "",
      "achievements": [],
      "technologies": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "gpa": null,
      "achievements": []
    }
  ],
  "skills": [
    {
      "name": "",
      "category": "technical|soft|language|tool",
      "proficiency": "beginner|intermediate|advanced|expert",
      "yearsOfExperience": null
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "role": "",
      "startDate": "",
      "endDate": "",
      "technologies": [],
      "link": "",
      "achievements": []
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "issueDate": "",
      "expiryDate": "",
      "credentialId": "",
      "link": ""
    }
  ],
  "languages": [
    {
      "name": "",
      "proficiency": ""
    }
  ],
  "totalExperienceYears": null
}

Important instructions:
1. Extract all dates in YYYY-MM format or YYYY format
2. For current positions, set "current": true and "endDate": "Present"
3. Categorize skills appropriately
4. Calculate total years of experience based on work history
5. Extract all achievements and quantifiable results
6. Identify all technologies, tools, and frameworks mentioned
7. If information is not found, use empty strings or null as appropriate

Resume text:
${resumeText}`;
  }

  private parseAIResponse(response: string): Partial<ParsedResume> {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Transform the parsed data to match our types
      return {
        personalInfo: this.validatePersonalInfo(parsed.personalInfo),
        summary: parsed.summary || '',
        experience: this.validateExperiences(parsed.experience || []),
        education: this.validateEducation(parsed.education || []),
        skills: this.validateSkills(parsed.skills || []),
        projects: this.validateProjects(parsed.projects || []),
        certifications: this.validateCertifications(parsed.certifications || []),
        languages: parsed.languages || [],
        totalExperienceYears: parsed.totalExperienceYears || this.calculateTotalExperience(parsed.experience || []),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  private validatePersonalInfo(info: any): PersonalInfo {
    return {
      name: info?.name || '',
      email: info?.email || '',
      phone: info?.phone || '',
      location: info?.location || '',
      linkedIn: info?.linkedIn,
      github: info?.github,
      portfolio: info?.portfolio,
    };
  }

  private validateExperiences(experiences: any[]): Experience[] {
    return experiences.map((exp, index) => ({
      id: `exp-${index}`,
      company: exp.company || '',
      position: exp.position || '',
      location: exp.location,
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      current: exp.current || false,
      description: exp.description || '',
      achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
      technologies: Array.isArray(exp.technologies) ? exp.technologies : [],
    }));
  }

  private validateEducation(education: any[]): Education[] {
    return education.map((edu, index) => ({
      id: `edu-${index}`,
      institution: edu.institution || '',
      degree: edu.degree || '',
      field: edu.field || '',
      location: edu.location,
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      gpa: edu.gpa,
      achievements: Array.isArray(edu.achievements) ? edu.achievements : [],
    }));
  }

  private validateSkills(skills: any[]): Skill[] {
    return skills.map(skill => ({
      name: skill.name || '',
      category: skill.category || 'technical',
      proficiency: skill.proficiency,
      yearsOfExperience: skill.yearsOfExperience,
    }));
  }

  private validateProjects(projects: any[]): Project[] {
    return projects.map((proj, index) => ({
      id: `proj-${index}`,
      name: proj.name || '',
      description: proj.description || '',
      role: proj.role,
      startDate: proj.startDate,
      endDate: proj.endDate,
      technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
      link: proj.link,
      achievements: Array.isArray(proj.achievements) ? proj.achievements : [],
    }));
  }

  private validateCertifications(certs: any[]): Certification[] {
    return certs.map((cert, index) => ({
      id: `cert-${index}`,
      name: cert.name || '',
      issuer: cert.issuer || '',
      issueDate: cert.issueDate || '',
      expiryDate: cert.expiryDate,
      credentialId: cert.credentialId,
      link: cert.link,
    }));
  }

  private calculateTotalExperience(experiences: any[]): number {
    let totalMonths = 0;
    
    experiences.forEach(exp => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.current ? new Date() : new Date(exp.endDate || new Date());
        const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, months);
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal place
  }

  private fallbackParsing(resumeText: string): Partial<ParsedResume> {
    // Basic rule-based parsing as fallback
    const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = resumeText.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}/);
    const linkedInMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
    const githubMatch = resumeText.match(/github\.com\/[\w-]+/i);
    
    return {
      personalInfo: {
        name: this.extractName(resumeText),
        email: emailMatch?.[0] || '',
        phone: phoneMatch?.[0] || '',
        location: '',
        linkedIn: linkedInMatch?.[0],
        github: githubMatch?.[0],
      },
      summary: this.extractSummary(resumeText),
      experience: [],
      education: [],
      skills: this.extractBasicSkills(resumeText),
      projects: [],
      certifications: [],
      languages: [],
    };
  }

  private extractName(text: string): string {
    // Simple heuristic: first line that's not an email or phone
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) {
      if (!line.includes('@') && !line.match(/\d{3,}/) && line.length < 50) {
        return line.trim();
      }
    }
    return '';
  }

  private extractSummary(text: string): string {
    // Look for summary/objective section
    const summaryMatch = text.match(/(?:summary|objective|profile|about)\s*:?\s*\n([^\n]+(?:\n[^\n]+)*)/i);
    return summaryMatch?.[1]?.trim() || '';
  }

  private extractBasicSkills(text: string): Skill[] {
    const skills: Skill[] = [];
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Angular', 'Vue',
      'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'AWS', 'Azure', 'Docker',
      'Kubernetes', 'SQL', 'MongoDB', 'Git', 'Agile', 'Scrum'
    ];
    
    commonSkills.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        skills.push({
          name: skill,
          category: 'technical',
        });
      }
    });
    
    return skills;
  }

  private generateResumeId(): string {
    return `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}