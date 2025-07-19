import type { SDLCCategory, SDLCModelConfiguration, SDLCProjectTemplate } from '@/types/sdlc';

export const SDLC_CATEGORIES = {
  planning: {
    id: 'planning',
    name: 'Planning',
    description: 'Architecture diagrams, user stories, requirements analysis',
    icon: '🏗️',
    color: 'blue',
    tasks: ['Architecture Diagram', 'Write user stories', 'Requirements analysis', 'System design'],
    primaryModels: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'premium', strength: 'Complex reasoning and architecture design' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'System design and requirements analysis' },
      { id: 'command-r-plus', name: 'Command R+', cost: 'premium', strength: 'Strategic planning and analysis' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'premium', strength: 'Multi-modal planning with diagrams' }
    ],
    secondaryModels: [
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'medium', strength: 'Detailed documentation and planning' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', cost: 'free', strength: 'Open-source planning assistant' },
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', cost: 'free', strength: 'Free alternative for planning' }
    ],
    keywords: [
      'requirements', 'analysis', 'planning', 'architecture', 'design',
      'feasibility', 'scope', 'stakeholder', 'business', 'user story',
      'acceptance criteria', 'functional', 'non-functional', 'wireframe',
      'system design', 'technical specification', 'project plan'
    ],
    aiModelPreferences: {
      primary: 'claude-3-opus',
      secondary: ['gpt-4-turbo', 'command-r-plus', 'gemini-1.5-pro'],
      temperature: 0.3,
      maxTokens: 4000,
      specialPrompts: ['strategic_analysis', 'requirements_gathering', 'architecture_review']
    },
    metrics: {
      accuracyScore: 0.92,
      avgResponseTime: 1200,
      userSatisfaction: 4.6,
      totalTasks: 0
    }
  },
  
  coding: {
    id: 'coding',
    name: 'Coding',
    description: 'Code generation, review, debugging, refactoring',
    icon: '💻',
    color: 'green',
    tasks: ['Code generation', 'Code review', 'Debugging', 'Refactoring'],
    primaryModels: [
      { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', cost: 'free', strength: 'Specialized coding model, excellent for generation' },
      { id: 'code-llama-70b', name: 'Code Llama 70B', cost: 'free', strength: 'Meta\'s specialized coding model' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'High-quality code generation and debugging' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'premium', strength: 'Complex code architecture and review' },
      { id: 'starcoder2', name: 'StarCoder2', cost: 'free', strength: 'Open-source code generation' }
    ],
    secondaryModels: [
      { id: 'codestral', name: 'Codestral (Mistral)', cost: 'medium', strength: 'Efficient coding assistant' },
      { id: 'qwen-2.5-coder', name: 'Qwen 2.5-Coder', cost: 'free', strength: 'Chinese-developed coding model' },
      { id: 'deepseek-coder-6.7b', name: 'DeepSeek-Coder-6.7B', cost: 'free', strength: 'Lightweight coding assistant' }
    ],
    keywords: [
      'code', 'programming', 'development', 'implementation', 'coding',
      'debug', 'refactor', 'optimization', 'algorithm', 'data structure',
      'function', 'class', 'method', 'variable', 'loop', 'condition',
      'framework', 'library', 'api', 'database', 'sql', 'orm'
    ],
    aiModelPreferences: {
      primary: 'deepseek-coder-v2',
      secondary: ['code-llama-70b', 'gpt-4-turbo', 'claude-3-opus', 'starcoder2'],
      temperature: 0.1,
      maxTokens: 6000,
      specialPrompts: ['code_generation', 'debugging_assistance', 'code_review']
    },
    metrics: {
      accuracyScore: 0.95,
      avgResponseTime: 800,
      userSatisfaction: 4.8,
      totalTasks: 0
    }
  },
  
  testing: {
    id: 'testing',
    name: 'Testing',
    description: 'Unit testing, integration testing, QA strategies',
    icon: '🧪',
    color: 'orange',
    tasks: ['Unit testing', 'Integration testing', 'Test automation', 'QA strategies'],
    primaryModels: [
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'Comprehensive testing strategies' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'premium', strength: 'Test case design and analysis' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'premium', strength: 'Multi-modal testing scenarios' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', cost: 'free', strength: 'Unit test generation' }
    ],
    secondaryModels: [
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'medium', strength: 'Test documentation and planning' },
      { id: 'code-llama', name: 'Code Llama', cost: 'free', strength: 'Automated test generation' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', cost: 'free', strength: 'Testing strategy analysis' }
    ],
    keywords: [
      'test', 'testing', 'unit test', 'integration test', 'e2e',
      'performance test', 'security test', 'automation', 'qa',
      'mock', 'stub', 'assertion', 'coverage', 'selenium',
      'jest', 'mocha', 'cypress', 'postman', 'load test'
    ],
    aiModelPreferences: {
      primary: 'gpt-4-turbo',
      secondary: ['claude-3-opus', 'gemini-1.5-pro', 'deepseek-coder'],
      temperature: 0.2,
      maxTokens: 4000,
      specialPrompts: ['test_generation', 'test_strategy', 'qa_automation']
    },
    metrics: {
      accuracyScore: 0.89,
      avgResponseTime: 1000,
      userSatisfaction: 4.5,
      totalTasks: 0
    }
  },
  
  uiux: {
    id: 'uiux',
    name: 'UI/UX',
    description: 'Interface design, user experience, accessibility',
    icon: '🎨',
    color: 'purple',
    tasks: ['Interface design', 'User experience', 'Accessibility', 'Responsive design'],
    primaryModels: [
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'UI/UX design principles and accessibility' },
      { id: 'claude-3', name: 'Claude 3', cost: 'premium', strength: 'User experience analysis and design' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'premium', strength: 'Visual design and multi-modal UI' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'medium', strength: 'Detailed UX documentation' }
    ],
    secondaryModels: [
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', cost: 'free', strength: 'Free UI/UX consulting' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', cost: 'free', strength: 'Design pattern analysis' },
      { id: 'command-r', name: 'Command R', cost: 'medium', strength: 'User research analysis' }
    ],
    keywords: [
      'ui', 'ux', 'design', 'interface', 'user experience', 'usability',
      'accessibility', 'responsive', 'mobile', 'wireframe', 'prototype',
      'css', 'html', 'react', 'vue', 'angular', 'tailwind', 'bootstrap',
      'figma', 'sketch', 'adobe', 'color', 'typography', 'layout'
    ],
    aiModelPreferences: {
      primary: 'gpt-4-turbo',
      secondary: ['claude-3', 'gemini-1.5-pro', 'claude-3-sonnet'],
      temperature: 0.4,
      maxTokens: 4000,
      specialPrompts: ['ui_design', 'ux_analysis', 'accessibility_review']
    },
    metrics: {
      accuracyScore: 0.87,
      avgResponseTime: 1100,
      userSatisfaction: 4.4,
      totalTasks: 0
    }
  },
  
  docs: {
    id: 'docs',
    name: 'Docs',
    description: 'Technical documentation, API docs, user guides',
    icon: '📚',
    color: 'indigo',
    tasks: ['Technical documentation', 'API documentation', 'User guides', 'Code comments'],
    primaryModels: [
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'medium', strength: 'Exceptional technical writing' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'Comprehensive documentation' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'premium', strength: 'Complex technical documentation' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'premium', strength: 'Multi-format documentation' }
    ],
    secondaryModels: [
      { id: 'mistral-7b', name: 'Mistral 7B', cost: 'free', strength: 'Basic documentation tasks' },
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', cost: 'free', strength: 'Free documentation assistant' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', cost: 'free', strength: 'Technical writing support' }
    ],
    keywords: [
      'documentation', 'docs', 'readme', 'api docs', 'technical writing',
      'user guide', 'tutorial', 'manual', 'specification', 'changelog',
      'markdown', 'wiki', 'confluence', 'notion', 'jsdoc', 'swagger',
      'openapi', 'postman', 'github', 'gitlab', 'bitbucket'
    ],
    aiModelPreferences: {
      primary: 'claude-3-sonnet',
      secondary: ['gpt-4-turbo', 'claude-3-opus', 'gemini-1.5-pro'],
      temperature: 0.3,
      maxTokens: 6000,
      specialPrompts: ['technical_writing', 'api_documentation', 'user_guides']
    },
    metrics: {
      accuracyScore: 0.93,
      avgResponseTime: 1300,
      userSatisfaction: 4.7,
      totalTasks: 0
    }
  },
  
  deploy: {
    id: 'deploy',
    name: 'Deploy',
    description: 'DevOps, CI/CD, infrastructure, monitoring',
    icon: '🚀',
    color: 'red',
    tasks: ['DevOps', 'CI/CD', 'Infrastructure', 'Monitoring'],
    primaryModels: [
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'DevOps and infrastructure expertise' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'premium', strength: 'Complex deployment strategies' },
      { id: 'command-r-plus', name: 'Command R+', cost: 'premium', strength: 'Infrastructure planning' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', cost: 'premium', strength: 'Multi-cloud deployment' }
    ],
    secondaryModels: [
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'medium', strength: 'Deployment documentation' },
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', cost: 'free', strength: 'Free DevOps assistance' },
      { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', cost: 'free', strength: 'Open-source deployment help' }
    ],
    keywords: [
      'deployment', 'devops', 'ci/cd', 'docker', 'kubernetes', 'aws',
      'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'github actions',
      'gitlab ci', 'monitoring', 'logging', 'infrastructure', 'cloud',
      'serverless', 'microservices', 'containers', 'orchestration'
    ],
    aiModelPreferences: {
      primary: 'gpt-4-turbo',
      secondary: ['claude-3-opus', 'command-r-plus', 'gemini-1.5-pro'],
      temperature: 0.2,
      maxTokens: 4000,
      specialPrompts: ['devops_automation', 'infrastructure_design', 'deployment_strategy']
    },
    metrics: {
      accuracyScore: 0.91,
      avgResponseTime: 1100,
      userSatisfaction: 4.6,
      totalTasks: 0
    }
  },
  
  qa: {
    id: 'qa',
    name: 'QA',
    description: 'Quality assurance, performance, security audit',
    icon: '🔍',
    color: 'yellow',
    tasks: ['Quality assurance', 'Code quality', 'Performance optimization', 'Security audit'],
    primaryModels: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus', cost: 'premium', strength: 'Quality analysis and code review' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'premium', strength: 'Comprehensive quality assurance' },
      { id: 'stablecode', name: 'StableCode', cost: 'free', strength: 'Security-focused code analysis' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', cost: 'free', strength: 'Code quality metrics' }
    ],
    secondaryModels: [
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', cost: 'medium', strength: 'Quality documentation' },
      { id: 'command-r', name: 'Command R', cost: 'medium', strength: 'Performance analysis' },
      { id: 'code-llama', name: 'Code Llama', cost: 'free', strength: 'Automated quality checks' }
    ],
    keywords: [
      'quality', 'audit', 'review', 'standards', 'compliance', 'metrics',
      'code quality', 'performance audit', 'security audit', 'best practices',
      'sonarqube', 'eslint', 'prettier', 'code coverage', 'technical debt',
      'maintainability', 'reliability', 'scalability', 'efficiency'
    ],
    aiModelPreferences: {
      primary: 'claude-3-opus',
      secondary: ['gpt-4-turbo', 'stablecode', 'deepseek-coder'],
      temperature: 0.2,
      maxTokens: 5000,
      specialPrompts: ['quality_audit', 'code_standards', 'performance_review']
    },
    metrics: {
      accuracyScore: 0.88,
      avgResponseTime: 1400,
      userSatisfaction: 4.3,
      totalTasks: 0
    }
  }
};

export const SDLC_MODEL_CONFIGURATIONS: SDLCModelConfiguration[] = [
  {
    modelId: 'claude-3-sonnet',
    categoryId: 'planning',
    systemPrompt: `You are a senior software architect and business analyst. Your expertise lies in strategic planning, requirements analysis, and system design. Focus on:
- Gathering comprehensive requirements
- Analyzing business needs and technical constraints
- Designing scalable and maintainable architectures
- Identifying risks and mitigation strategies
- Creating clear specifications and documentation
Always consider long-term implications and provide strategic insights.`,
    temperature: 0.3,
    maxTokens: 4000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    stopSequences: [],
    customInstructions: [
      'Always ask clarifying questions for requirements',
      'Consider scalability and maintainability',
      'Provide multiple architectural options with trade-offs',
      'Include risk assessment and mitigation strategies'
    ]
  },
  {
    modelId: 'gpt-4-turbo',
    categoryId: 'development',
    systemPrompt: `You are an expert software developer with deep knowledge across multiple programming languages and frameworks. Your strengths include:
- Writing clean, efficient, and maintainable code
- Following best practices and design patterns
- Debugging complex issues
- Code optimization and refactoring
- Staying current with latest technologies
Focus on practical solutions and include code examples with explanations.`,
    temperature: 0.1,
    maxTokens: 6000,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    stopSequences: [],
    customInstructions: [
      'Always provide working code examples',
      'Explain the reasoning behind code decisions',
      'Include error handling and edge cases',
      'Suggest optimizations and improvements'
    ]
  },
  {
    modelId: 'claude-3-sonnet',
    categoryId: 'testing',
    systemPrompt: `You are a QA automation expert and testing specialist. Your expertise covers:
- Test strategy and planning
- Test automation frameworks
- Performance and security testing
- Quality assurance best practices
- Test case design and execution
Emphasize comprehensive testing approaches and automation wherever possible.`,
    temperature: 0.2,
    maxTokens: 4000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    stopSequences: [],
    customInstructions: [
      'Include both positive and negative test cases',
      'Suggest automation strategies',
      'Consider edge cases and error conditions',
      'Provide test data examples'
    ]
  },
  {
    modelId: 'claude-3-opus',
    categoryId: 'ui-ux',
    systemPrompt: `You are a UI/UX design expert with strong technical implementation skills. Your focus areas include:
- User-centered design principles
- Accessibility and inclusive design
- Modern UI frameworks and technologies
- Responsive and mobile-first design
- Design systems and component libraries
Balance aesthetic appeal with usability and technical feasibility.`,
    temperature: 0.4,
    maxTokens: 4000,
    presencePenalty: 0.2,
    frequencyPenalty: 0.1,
    stopSequences: [],
    customInstructions: [
      'Always consider accessibility requirements',
      'Provide responsive design solutions',
      'Include implementation guidance',
      'Consider user experience implications'
    ]
  },
  {
    modelId: 'claude-3-sonnet',
    categoryId: 'documentation',
    systemPrompt: `You are a technical writing expert specializing in developer documentation. Your strengths include:
- Creating clear, comprehensive documentation
- API documentation and specifications
- User guides and tutorials
- Technical communication
- Information architecture
Focus on clarity, completeness, and user-friendly presentation.`,
    temperature: 0.3,
    maxTokens: 6000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    stopSequences: [],
    customInstructions: [
      'Use clear, concise language',
      'Include practical examples',
      'Structure content logically',
      'Consider different audience levels'
    ]
  },
  {
    modelId: 'claude-3-sonnet',
    categoryId: 'deployment',
    systemPrompt: `You are a DevOps engineer and cloud infrastructure expert. Your expertise covers:
- CI/CD pipeline design and implementation
- Cloud platforms (AWS, Azure, GCP)
- Containerization and orchestration
- Infrastructure as Code
- Monitoring and observability
Focus on reliable, scalable, and automated solutions.`,
    temperature: 0.2,
    maxTokens: 4000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    stopSequences: [],
    customInstructions: [
      'Emphasize automation and reliability',
      'Include security considerations',
      'Provide infrastructure as code examples',
      'Consider cost optimization'
    ]
  },
  {
    modelId: 'claude-3-opus',
    categoryId: 'quality-assurance',
    systemPrompt: `You are a software quality assurance expert and code auditor. Your focus areas include:
- Code quality assessment and metrics
- Performance analysis and optimization
- Security auditing and compliance
- Technical debt identification
- Best practices enforcement
Provide thorough analysis with actionable recommendations.`,
    temperature: 0.2,
    maxTokens: 5000,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    stopSequences: [],
    customInstructions: [
      'Provide detailed quality metrics',
      'Include improvement recommendations',
      'Prioritize issues by impact',
      'Suggest preventive measures'
    ]
  }
];

export const SDLC_PROJECT_TEMPLATES: SDLCProjectTemplate[] = [
  {
    id: 'web-app',
    name: 'Web Application',
    description: 'Full-stack web application development',
    type: 'web',
    workflow: [
      {
        id: 'requirements',
        name: 'Requirements Analysis',
        description: 'Gather and document requirements',
        category: 'planning',
        prerequisites: [],
        deliverables: ['Requirements Document', 'User Stories', 'Acceptance Criteria'],
        estimatedTime: 480,
        skillLevel: 'intermediate',
        automationLevel: 'assisted'
      },
      {
        id: 'design',
        name: 'UI/UX Design',
        description: 'Design user interface and experience',
        category: 'ui-ux',
        prerequisites: ['requirements'],
        deliverables: ['Wireframes', 'Mockups', 'Design System'],
        estimatedTime: 720,
        skillLevel: 'intermediate',
        automationLevel: 'assisted'
      },
      {
        id: 'development',
        name: 'Development',
        description: 'Implement application features',
        category: 'development',
        prerequisites: ['design'],
        deliverables: ['Frontend Code', 'Backend API', 'Database Schema'],
        estimatedTime: 1440,
        skillLevel: 'advanced',
        automationLevel: 'assisted'
      },
      {
        id: 'testing',
        name: 'Testing',
        description: 'Comprehensive testing',
        category: 'testing',
        prerequisites: ['development'],
        deliverables: ['Test Suite', 'Test Reports', 'Bug Reports'],
        estimatedTime: 480,
        skillLevel: 'intermediate',
        automationLevel: 'automated'
      },
      {
        id: 'deployment',
        name: 'Deployment',
        description: 'Deploy to production',
        category: 'deployment',
        prerequisites: ['testing'],
        deliverables: ['Deployment Pipeline', 'Monitoring Setup', 'Documentation'],
        estimatedTime: 360,
        skillLevel: 'advanced',
        automationLevel: 'automated'
      }
    ],
    recommendedModels: {
      'planning': 'claude-3-sonnet',
      'development': 'gpt-4-turbo',
      'testing': 'claude-3-sonnet',
      'ui-ux': 'claude-3-opus',
      'documentation': 'claude-3-sonnet',
      'deployment': 'claude-3-sonnet',
      'quality-assurance': 'claude-3-opus'
    },
    estimatedDuration: 3480,
    complexity: 'moderate',
    requiredSkills: ['Frontend Development', 'Backend Development', 'Database Design', 'Testing', 'DevOps']
  }
];

export const DEFAULT_SDLC_SETTINGS = {
  autoClassification: true,
  confidenceThreshold: 0.7,
  enableModelRouting: true,
  learningMode: true,
  collectMetrics: true,
  showAlternatives: true,
  enableInsights: true,
  maxHistorySize: 1000
};