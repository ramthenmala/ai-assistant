import type { SavedPrompt, PromptVariable, PromptVersion } from '@/types';
import { generateId, getCurrentTimestamp } from '@/utils';

export class PromptService {
  /**
   * Extract variables from prompt content
   * Supports {{variable}} and {variable} syntax
   */
  static extractVariables(content: string): string[] {
    const variablePattern = /\{\{?([^}]+)\}?\}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = variablePattern.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (variableName) {
        variables.add(variableName);
      }
    }
    
    return Array.from(variables);
  }

  /**
   * Substitute variables in prompt content
   */
  static substituteVariables(
    content: string, 
    variables: Record<string, string>
  ): string {
    let result = content;
    
    // Replace {{variable}} and {variable} patterns
    for (const [key, value] of Object.entries(variables)) {
      const patterns = [
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
        new RegExp(`\\{\\s*${key}\\s*\\}`, 'g')
      ];
      
      patterns.forEach(pattern => {
        result = result.replace(pattern, value);
      });
    }
    
    return result;
  }

  /**
   * Validate variable values against definitions
   */
  static validateVariables(
    variables: PromptVariable[],
    values: Record<string, string>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const variable of variables) {
      const value = values[variable.name];
      
      // Check required variables
      if (variable.required && (!value || value.trim() === '')) {
        errors.push(`Variable "${variable.name}" is required`);
        continue;
      }
      
      // Skip validation if value is empty and not required
      if (!value || value.trim() === '') {
        continue;
      }
      
      // Validate based on type
      switch (variable.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`Variable "${variable.name}" must be a number`);
          } else {
            const numValue = Number(value);
            if (variable.validation?.min !== undefined && numValue < variable.validation.min) {
              errors.push(`Variable "${variable.name}" must be at least ${variable.validation.min}`);
            }
            if (variable.validation?.max !== undefined && numValue > variable.validation.max) {
              errors.push(`Variable "${variable.name}" must be at most ${variable.validation.max}`);
            }
          }
          break;
        case 'select':
          if (variable.options && !variable.options.includes(value)) {
            errors.push(`Variable "${variable.name}" must be one of: ${variable.options.join(', ')}`);
          }
          break;
        case 'text':
        case 'textarea':
          if (variable.validation?.pattern) {
            const regex = new RegExp(variable.validation.pattern);
            if (!regex.test(value)) {
              errors.push(`Variable "${variable.name}" format is invalid`);
            }
          }
          if (variable.validation?.min !== undefined && value.length < variable.validation.min) {
            errors.push(`Variable "${variable.name}" must be at least ${variable.validation.min} characters`);
          }
          if (variable.validation?.max !== undefined && value.length > variable.validation.max) {
            errors.push(`Variable "${variable.name}" must be at most ${variable.validation.max} characters`);
          }
          break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new version of a prompt
   */
  static createVersion(
    prompt: SavedPrompt,
    updates: Partial<Pick<SavedPrompt, 'title' | 'description' | 'content' | 'tags'>>,
    changelog?: string
  ): PromptVersion {
    const currentVersion = prompt.currentVersion || 1;
    const newVersion = currentVersion + 1;
    
    return {
      id: generateId(),
      version: newVersion,
      title: updates.title || prompt.title,
      description: updates.description || prompt.description,
      content: updates.content || prompt.content,
      tags: updates.tags || prompt.tags,
      createdAt: getCurrentTimestamp(),
      changelog
    };
  }

  /**
   * Get version history for a prompt
   */
  static getVersionHistory(prompt: SavedPrompt): PromptVersion[] {
    const versions = prompt.versions || [];
    
    // Add current version if not in history
    const currentVersion = prompt.currentVersion || 1;
    const hasCurrentVersion = versions.some(v => v.version === currentVersion);
    
    if (!hasCurrentVersion) {
      versions.push({
        id: generateId(),
        version: currentVersion,
        title: prompt.title,
        description: prompt.description,
        content: prompt.content,
        tags: prompt.tags,
        createdAt: prompt.updatedAt || prompt.createdAt
      });
    }
    
    return versions.sort((a, b) => b.version - a.version);
  }

  /**
   * Revert to a specific version
   */
  static revertToVersion(
    prompt: SavedPrompt,
    version: number
  ): Partial<SavedPrompt> | null {
    const versions = this.getVersionHistory(prompt);
    const targetVersion = versions.find(v => v.version === version);
    
    if (!targetVersion) {
      return null;
    }
    
    return {
      title: targetVersion.title,
      description: targetVersion.description,
      content: targetVersion.content,
      tags: targetVersion.tags,
      currentVersion: version,
      updatedAt: getCurrentTimestamp()
    };
  }

  /**
   * Generate automatic variable definitions from content
   */
  static generateVariableDefinitions(content: string): PromptVariable[] {
    const variableNames = this.extractVariables(content);
    
    return variableNames.map(name => ({
      name,
      type: 'text' as const,
      description: `Variable: ${name}`,
      required: true
    }));
  }

  /**
   * Estimate token count for a prompt
   */
  static estimateTokenCount(content: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Generate prompt suggestions based on context
   */
  static generateSuggestions(
    context: string,
    prompts: SavedPrompt[],
    limit: number = 5
  ): SavedPrompt[] {
    const contextWords = context.toLowerCase().split(/\s+/);
    
    // Score prompts based on relevance to context
    const scored = prompts.map(prompt => {
      let score = 0;
      const promptText = `${prompt.title} ${prompt.description || ''} ${prompt.content}`.toLowerCase();
      
      // Score based on word matches
      contextWords.forEach(word => {
        if (promptText.includes(word)) {
          score += 1;
        }
      });
      
      // Score based on tag matches
      prompt.tags.forEach(tag => {
        if (contextWords.some(word => tag.toLowerCase().includes(word))) {
          score += 2;
        }
      });
      
      // Boost score for frequently used prompts
      score += Math.min(prompt.usageCount * 0.1, 2);
      
      // Boost score for favorites
      if (prompt.isFavorite) {
        score += 1;
      }
      
      return { prompt, score };
    });
    
    // Sort by score and return top results
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.prompt);
  }

  /**
   * Export prompts to various formats
   */
  static exportPrompts(prompts: SavedPrompt[], format: 'json' | 'csv' | 'markdown'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(prompts, null, 2);
      
      case 'csv':
        const headers = ['Title', 'Description', 'Content', 'Tags', 'Category', 'Usage Count', 'Created At'];
        const rows = prompts.map(prompt => [
          prompt.title,
          prompt.description || '',
          prompt.content.replace(/"/g, '""'),
          prompt.tags.join('; '),
          prompt.category || '',
          prompt.usageCount.toString(),
          prompt.createdAt.toISOString()
        ]);
        
        return [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
      
      case 'markdown':
        return prompts.map(prompt => {
          const lines = [
            `# ${prompt.title}`,
            '',
            ...(prompt.description ? [`${prompt.description}`, ''] : []),
            '## Content',
            '',
            '```',
            prompt.content,
            '```',
            '',
            '## Metadata',
            '',
            `- **Tags**: ${prompt.tags.join(', ')}`,
            `- **Category**: ${prompt.category || 'None'}`,
            `- **Usage Count**: ${prompt.usageCount}`,
            `- **Created**: ${prompt.createdAt.toLocaleDateString()}`,
            ...(prompt.isFavorite ? ['- **Favorite**: Yes'] : []),
            ''
          ];
          
          return lines.join('\n');
        }).join('\n---\n\n');
      
      default:
        return JSON.stringify(prompts, null, 2);
    }
  }

  /**
   * Import prompts from various formats
   */
  static importPrompts(data: string, format: 'json' | 'csv'): SavedPrompt[] {
    switch (format) {
      case 'json':
        try {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
          throw new Error('Invalid JSON format');
        }
      
      case 'csv':
        const lines = data.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('CSV must have at least a header and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
        const prompts: SavedPrompt[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, ''));
          const prompt: SavedPrompt = {
            id: generateId(),
            title: values[0] || `Imported Prompt ${i}`,
            description: values[1] || undefined,
            content: values[2] || '',
            tags: values[3] ? values[3].split('; ') : [],
            category: values[4] || undefined,
            usageCount: parseInt(values[5]) || 0,
            createdAt: values[6] ? new Date(values[6]) : getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            isFavorite: false
          };
          
          prompts.push(prompt);
        }
        
        return prompts;
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}