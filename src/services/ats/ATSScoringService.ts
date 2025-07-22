import type { 
  ParsedResume, 
  JobDescription, 
  ATSScore, 
  ScoreBreakdown,
  ATSSettings 
} from '@/types/ats';

export class ATSScoringService {
  private defaultSettings: ATSSettings = {
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

  constructor() {
    // No dependencies needed
  }

  async scoreResume(
    resume: ParsedResume,
    job: JobDescription,
    settings: ATSSettings = this.defaultSettings,
    useAI: boolean = true
  ): Promise<ATSScore> {
    const breakdown = await this.calculateScoreBreakdown(resume, job, useAI);
    const overallScore = this.calculateOverallScore(breakdown, settings.scoring);
    const insights = await this.generateInsights(resume, job, breakdown, useAI);

    return {
      resumeId: resume.id,
      jobId: job.id,
      overallScore,
      breakdown,
      insights,
      scoredDate: new Date().toISOString(),
    };
  }

  private async calculateScoreBreakdown(
    resume: ParsedResume,
    job: JobDescription,
    useAI: boolean
  ): Promise<ScoreBreakdown> {
    const [experienceScore, skillsScore, educationScore, keywordsScore] = await Promise.all([
      this.scoreExperience(resume, job, useAI),
      this.scoreSkills(resume, job, useAI),
      this.scoreEducation(resume, job),
      this.scoreKeywords(resume, job),
    ]);

    return {
      experience: experienceScore,
      skills: skillsScore,
      education: educationScore,
      keywords: keywordsScore,
    };
  }

  private async scoreExperience(
    resume: ParsedResume,
    job: JobDescription,
    useAI: boolean
  ): Promise<ScoreBreakdown['experience']> {
    const totalYears = resume.totalExperienceYears || 0;
    const requiredMin = job.experienceRange.min;
    const requiredMax = job.experienceRange.max;
    
    // Calculate years-based score
    let score = 0;
    if (totalYears >= requiredMin && totalYears <= requiredMax) {
      score = 100;
    } else if (totalYears < requiredMin) {
      // Penalize for less experience
      const shortage = requiredMin - totalYears;
      score = Math.max(0, 100 - (shortage * 20));
    } else {
      // Slight penalty for overqualification
      const excess = totalYears - requiredMax;
      score = Math.max(70, 100 - (excess * 5));
    }

    // Find relevant experience matches
    const matchedRoles: string[] = [];
    
    if (useAI) {
      // Use AI for semantic matching of roles
      const relevantExp = await this.findRelevantExperience(resume, job);
      matchedRoles.push(...relevantExp);
      
      // Boost score based on relevance
      if (relevantExp.length > 0) {
        score = Math.min(100, score + (relevantExp.length * 10));
      }
    } else {
      // Simple keyword matching
      resume.experience.forEach(exp => {
        const expText = `${exp.position} ${exp.description} ${exp.achievements.join(' ')}`.toLowerCase();
        const jobText = `${job.title} ${job.description} ${job.responsibilities.join(' ')}`.toLowerCase();
        
        // Check for role similarity
        const jobKeywords = job.title.toLowerCase().split(/\s+/);
        const hasMatch = jobKeywords.some(keyword => 
          expText.includes(keyword) || this.calculateSimilarity(exp.position, job.title) > 0.7
        );
        
        if (hasMatch) {
          matchedRoles.push(exp.position);
        }
      });
    }

    return {
      score: Math.round(score),
      weight: 30,
      details: {
        relevantYears: Math.min(totalYears, requiredMax),
        totalYears,
        matchedRoles,
      },
    };
  }

  private async scoreSkills(
    resume: ParsedResume,
    job: JobDescription,
    useAI: boolean
  ): Promise<ScoreBreakdown['skills']> {
    const requiredSkills = job.requirements.map(req => req.skill.toLowerCase());
    const candidateSkills = [
      ...resume.skills.map(s => s.name.toLowerCase()),
      ...resume.keywords.filter(k => !k.includes(' years')),
    ];

    const matched: string[] = [];
    const missing: string[] = [];

    for (const requirement of job.requirements) {
      const skill = requirement.skill.toLowerCase();
      let found = false;

      if (useAI) {
        // Use semantic matching
        found = await this.hasSemanticSkillMatch(candidateSkills, skill);
      } else {
        // Direct matching or simple variations
        found = candidateSkills.some(cs => 
          cs === skill || 
          cs.includes(skill) || 
          skill.includes(cs) ||
          this.areSkillsSimilar(cs, skill)
        );
      }

      if (found) {
        matched.push(requirement.skill);
      } else if (requirement.required) {
        missing.push(requirement.skill);
      }
    }

    // Calculate coverage and score
    const criticalSkills = job.requirements.filter(r => r.importance === 'critical');
    const criticalMatched = criticalSkills.filter(cs => 
      matched.some(m => m.toLowerCase() === cs.skill.toLowerCase())
    ).length;

    const coverage = requiredSkills.length > 0 
      ? matched.length / requiredSkills.length 
      : 0;

    let score = coverage * 100;

    // Heavily penalize missing critical skills
    if (criticalSkills.length > 0) {
      const criticalCoverage = criticalMatched / criticalSkills.length;
      score = score * 0.3 + (criticalCoverage * 100 * 0.7);
    }

    return {
      score: Math.round(score),
      weight: 40,
      details: {
        matched,
        missing,
        coverage: Math.round(coverage * 100) / 100,
      },
    };
  }

  private scoreEducation(
    resume: ParsedResume,
    job: JobDescription
  ): ScoreBreakdown['education'] {
    if (!job.educationRequirement) {
      return {
        score: 100,
        weight: 20,
        details: {
          meetsRequirement: true,
          relevantDegree: true,
        },
      };
    }

    const required = job.educationRequirement;
    let score = 0;
    let meetsRequirement = false;
    let relevantDegree = false;

    // Check education level
    const educationLevels = ['high-school', 'bachelors', 'masters', 'phd'];
    const requiredLevel = educationLevels.indexOf(required.level);
    
    for (const edu of resume.education) {
      const candidateLevel = this.detectEducationLevel(edu.degree);
      const candidateLevelIndex = educationLevels.indexOf(candidateLevel);
      
      if (candidateLevelIndex >= requiredLevel) {
        meetsRequirement = true;
        score = Math.max(score, 80);
        
        // Check field relevance
        if (required.fields.length > 0) {
          const fieldMatch = required.fields.some(field => 
            edu.field.toLowerCase().includes(field.toLowerCase()) ||
            field.toLowerCase().includes(edu.field.toLowerCase())
          );
          
          if (fieldMatch) {
            relevantDegree = true;
            score = 100;
            break;
          }
        } else {
          score = 100;
          relevantDegree = true;
          break;
        }
      }
    }

    // If education is not required but candidate has it, give bonus
    if (!required.required && meetsRequirement) {
      score = Math.max(score, 90);
    }

    // If education is required but missing, heavily penalize
    if (required.required && !meetsRequirement) {
      score = 0;
    }

    return {
      score: Math.round(score),
      weight: 20,
      details: {
        meetsRequirement,
        relevantDegree,
      },
    };
  }

  private scoreKeywords(
    resume: ParsedResume,
    job: JobDescription
  ): ScoreBreakdown['keywords'] {
    // Extract keywords from job description
    const jobText = `${job.title} ${job.description} ${job.responsibilities.join(' ')} ${job.requirements.map(r => r.skill).join(' ')}`;
    const jobKeywords = this.extractImportantKeywords(jobText);
    
    // Count keyword matches in resume
    const resumeText = resume.rawText || '';
    const matched: string[] = [];
    
    jobKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = resumeText.match(regex);
      if (matches && matches.length > 0) {
        matched.push(keyword);
      }
    });

    const density = matched.length / Math.max(jobKeywords.length, 1);
    const score = Math.min(100, density * 100);

    return {
      score: Math.round(score),
      weight: 10,
      details: {
        matched,
        density: Math.round(density * 100) / 100,
      },
    };
  }

  private calculateOverallScore(
    breakdown: ScoreBreakdown,
    weights: ATSSettings['scoring']
  ): number {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    
    const weightedScore = 
      (breakdown.experience.score * weights.experienceWeight +
       breakdown.skills.score * weights.skillsWeight +
       breakdown.education.score * weights.educationWeight +
       breakdown.keywords.score * weights.keywordsWeight) / totalWeight;

    return Math.round(weightedScore);
  }

  private async generateInsights(
    resume: ParsedResume,
    job: JobDescription,
    breakdown: ScoreBreakdown,
    useAI: boolean
  ): Promise<ATSScore['insights']> {
    const strengths: string[] = [];
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // Analyze experience
    if (breakdown.experience.score >= 80) {
      strengths.push(`Strong experience match with ${breakdown.experience.details.totalYears} years in relevant roles`);
    } else if (breakdown.experience.details.totalYears < job.experienceRange.min) {
      gaps.push(`Lacks required experience (has ${breakdown.experience.details.totalYears} years, needs ${job.experienceRange.min}+)`);
      recommendations.push('Highlight transferable skills and relevant projects to compensate for experience gap');
    }

    // Analyze skills
    if (breakdown.skills.score >= 80) {
      strengths.push(`Excellent skills match (${breakdown.skills.details.matched.length} out of ${job.requirements.length} requirements)`);
    } else {
      if (breakdown.skills.details.missing.length > 0) {
        gaps.push(`Missing critical skills: ${breakdown.skills.details.missing.slice(0, 3).join(', ')}`);
        recommendations.push(`Consider acquiring skills in: ${breakdown.skills.details.missing.slice(0, 3).join(', ')}`);
      }
    }

    // Analyze education
    if (breakdown.education.score === 100) {
      strengths.push('Education requirements fully met');
    } else if (breakdown.education.score < 50) {
      gaps.push('Does not meet education requirements');
      recommendations.push('Consider highlighting relevant certifications or continuous learning');
    }

    // AI-powered insights
    if (useAI && (strengths.length > 0 || gaps.length > 0)) {
      const additionalInsights = await this.generateAIInsights(resume, job, breakdown);
      recommendations.push(...additionalInsights);
    }

    return { strengths, gaps, recommendations };
  }

  // Helper methods
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    
    // Simple word overlap similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private areSkillsSimilar(skill1: string, skill2: string): boolean {
    const synonyms: Record<string, string[]> = {
      'javascript': ['js', 'node.js', 'nodejs'],
      'typescript': ['ts'],
      'react': ['reactjs', 'react.js'],
      'angular': ['angularjs', 'angular.js'],
      'vue': ['vuejs', 'vue.js'],
      'python': ['py'],
      'kubernetes': ['k8s'],
      'docker': ['containerization', 'containers'],
      'ci/cd': ['continuous integration', 'continuous deployment', 'jenkins', 'github actions'],
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if ((skill1.includes(key) || values.some(v => skill1.includes(v))) &&
          (skill2.includes(key) || values.some(v => skill2.includes(v)))) {
        return true;
      }
    }

    return false;
  }

  private detectEducationLevel(degree: string): 'high-school' | 'bachelors' | 'masters' | 'phd' {
    const d = degree.toLowerCase();
    
    if (d.includes('phd') || d.includes('ph.d') || d.includes('doctorate')) {
      return 'phd';
    }
    if (d.includes('master') || d.includes('m.s') || d.includes('m.a') || d.includes('mba')) {
      return 'masters';
    }
    if (d.includes('bachelor') || d.includes('b.s') || d.includes('b.a') || d.includes('undergraduate')) {
      return 'bachelors';
    }
    
    return 'high-school';
  }

  private extractImportantKeywords(text: string): string[] {
    // Remove common words and extract important terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s+#]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Count frequency
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  // AI-powered methods
  private async findRelevantExperience(resume: ParsedResume, job: JobDescription): Promise<string[]> {
    // This would use the AI model to find semantically similar experience
    // For now, return empty array
    return [];
  }

  private async hasSemanticSkillMatch(candidateSkills: string[], requiredSkill: string): Promise<boolean> {
    // This would use embeddings or AI to check semantic similarity
    // For now, use simple matching
    return candidateSkills.some(skill => 
      skill.includes(requiredSkill) || requiredSkill.includes(skill)
    );
  }

  private async generateAIInsights(
    resume: ParsedResume,
    job: JobDescription,
    breakdown: ScoreBreakdown
  ): Promise<string[]> {
    // This would use AI to generate personalized recommendations
    // For now, return generic insights
    return [];
  }
}