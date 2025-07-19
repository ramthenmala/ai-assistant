// Validation utilities for forms and API responses

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

export interface ValidationRule<T = any> {
  test: (value: T) => boolean;
  message: string;
  severity?: 'error' | 'warning';
}

export class Validator<T = any> {
  private rules: Record<string, ValidationRule<any>[]> = {};

  // Add validation rule for a field
  addRule(field: keyof T, rule: ValidationRule): this {
    if (!this.rules[field as string]) {
      this.rules[field as string] = [];
    }
    this.rules[field as string].push(rule);
    return this;
  }

  // Add multiple rules for a field
  addRules(field: keyof T, rules: ValidationRule[]): this {
    rules.forEach(rule => this.addRule(field, rule));
    return this;
  }

  // Validate an object
  validate(data: T): ValidationResult {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    for (const [field, rules] of Object.entries(this.rules)) {
      const value = (data as any)[field];
      
      for (const rule of rules) {
        if (!rule.test(value)) {
          const severity = rule.severity || 'error';
          const target = severity === 'warning' ? warnings : errors;
          
          if (!target[field]) {
            target[field] = [];
          }
          target[field].push(rule.message);
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
    };
  }
}

// Common validation rules
export const ValidationRules = {
  // Required field
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value) => value !== null && value !== undefined && value !== '',
    message,
  }),

  // String length validation
  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => typeof value === 'string' && value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => typeof value === 'string' && value.length <= max,
    message: message || `Must be no more than ${max} characters`,
  }),

  // Email validation
  email: (message = 'Invalid email address'): ValidationRule => ({
    test: (value) => {
      if (!value) return true; // Allow empty for optional fields
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  // URL validation
  url: (message = 'Invalid URL'): ValidationRule => ({
    test: (value) => {
      if (!value) return true; // Allow empty for optional fields
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  // API key validation (basic format check)
  apiKey: (provider: 'openai' | 'anthropic', message?: string): ValidationRule => ({
    test: (value) => {
      if (!value) return false;
      
      switch (provider) {
        case 'openai':
          return /^sk-[a-zA-Z0-9]{48}$/.test(value);
        case 'anthropic':
          return /^sk-ant-[a-zA-Z0-9\-_]{95}$/.test(value);
        default:
          return value.length > 10; // Basic check
      }
    },
    message: message || `Invalid ${provider} API key format`,
  }),

  // Number validation
  isNumber: (message = 'Must be a number'): ValidationRule => ({
    test: (value) => !isNaN(Number(value)),
    message,
  }),

  min: (minimum: number, message?: string): ValidationRule => ({
    test: (value) => Number(value) >= minimum,
    message: message || `Must be at least ${minimum}`,
  }),

  max: (maximum: number, message?: string): ValidationRule => ({
    test: (value) => Number(value) <= maximum,
    message: message || `Must be no more than ${maximum}`,
  }),

  // File validation
  fileSize: (maxSizeBytes: number, message?: string): ValidationRule => ({
    test: (file: File) => file && file.size <= maxSizeBytes,
    message: message || `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
  }),

  fileType: (allowedTypes: string[], message?: string): ValidationRule => ({
    test: (file: File) => file && allowedTypes.includes(file.type),
    message: message || `File type must be one of: ${allowedTypes.join(', ')}`,
  }),

  // Custom validation
  custom: (test: (value: any) => boolean, message: string): ValidationRule => ({
    test,
    message,
  }),
};

// Specific validators for our app

// Chat message validation
export const messageValidator = new Validator<{ content: string; role: string }>()
  .addRule('content', ValidationRules.required('Message content is required'))
  .addRule('content', ValidationRules.minLength(1, 'Message cannot be empty'))
  .addRule('content', ValidationRules.maxLength(10000, 'Message too long (max 10,000 characters)'))
  .addRule('role', ValidationRules.required('Message role is required'))
  .addRule('role', ValidationRules.custom(
    (role) => ['user', 'assistant', 'system'].includes(role),
    'Invalid message role'
  ));

// API key validation
export const apiKeyValidator = new Validator<{ service: string; key: string }>()
  .addRule('service', ValidationRules.required('Service is required'))
  .addRule('key', ValidationRules.required('API key is required'))
  .addRule('key', ValidationRules.minLength(10, 'API key seems too short'));

// Model configuration validation
export const modelConfigValidator = new Validator<{
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}>()
  .addRule('temperature', ValidationRules.min(0, 'Temperature must be >= 0'))
  .addRule('temperature', ValidationRules.max(2, 'Temperature must be <= 2'))
  .addRule('maxTokens', ValidationRules.min(1, 'Max tokens must be >= 1'))
  .addRule('maxTokens', ValidationRules.max(32000, 'Max tokens must be <= 32,000'))
  .addRule('topP', ValidationRules.min(0, 'Top P must be >= 0'))
  .addRule('topP', ValidationRules.max(1, 'Top P must be <= 1'))
  .addRule('frequencyPenalty', ValidationRules.min(-2, 'Frequency penalty must be >= -2'))
  .addRule('frequencyPenalty', ValidationRules.max(2, 'Frequency penalty must be <= 2'))
  .addRule('presencePenalty', ValidationRules.min(-2, 'Presence penalty must be >= -2'))
  .addRule('presencePenalty', ValidationRules.max(2, 'Presence penalty must be <= 2'));

// File upload validation
export const fileUploadValidator = new Validator<{ file: File }>()
  .addRule('file', ValidationRules.required('File is required'))
  .addRule('file', ValidationRules.fileSize(50 * 1024 * 1024, 'File size must be less than 50MB'))
  .addRule('file', ValidationRules.fileType(
    ['text/plain', 'text/markdown', 'application/pdf', 'text/csv'],
    'File must be a text, markdown, PDF, or CSV file'
  ));

// Prompt validation
export const promptValidator = new Validator<{
  title: string;
  content: string;
  tags?: string[];
}>()
  .addRule('title', ValidationRules.required('Title is required'))
  .addRule('title', ValidationRules.minLength(3, 'Title must be at least 3 characters'))
  .addRule('title', ValidationRules.maxLength(100, 'Title must be no more than 100 characters'))
  .addRule('content', ValidationRules.required('Content is required'))
  .addRule('content', ValidationRules.minLength(10, 'Content must be at least 10 characters'))
  .addRule('content', ValidationRules.maxLength(5000, 'Content must be no more than 5,000 characters'));

// API response validation
export function validateApiResponse<T>(
  response: any,
  expectedFields: string[],
  validator?: Validator<T>
): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Check if response exists
  if (!response) {
    errors.response = ['Response is missing'];
    return { isValid: false, errors };
  }

  // Check required fields
  for (const field of expectedFields) {
    if (!(field in response)) {
      if (!errors.response) errors.response = [];
      errors.response.push(`Missing required field: ${field}`);
    }
  }

  // Run custom validation if provided
  if (validator && Object.keys(errors).length === 0) {
    const validationResult = validator.validate(response);
    Object.assign(errors, validationResult.errors);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Network error validation
export function validateNetworkResponse(response: Response): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!response.ok) {
    errors.network = [`HTTP ${response.status}: ${response.statusText}`];
    
    // Add specific error messages for common status codes
    switch (response.status) {
      case 401:
        errors.auth = ['Authentication failed. Please check your API key.'];
        break;
      case 403:
        errors.auth = ['Access forbidden. Please check your permissions.'];
        break;
      case 429:
        errors.rateLimit = ['Rate limit exceeded. Please try again later.'];
        break;
      case 500:
        errors.server = ['Server error. Please try again later.'];
        break;
      case 503:
        errors.server = ['Service unavailable. Please try again later.'];
        break;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Sanitization utilities
export const Sanitizer = {
  // Sanitize user input for display
  text: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 10000); // Limit length
  },

  // Sanitize API key for display (show only first/last few characters)
  apiKey: (key: string): string => {
    if (!key || key.length < 8) return key;
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  },

  // Sanitize filename
  filename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .slice(0, 255);
  },

  // Sanitize URL
  url: (url: string): string => {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsed.toString();
    } catch {
      return '';
    }
  },
};