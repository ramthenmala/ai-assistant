import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Code, 
  TestTube, 
  Palette, 
  BookOpen, 
  Rocket, 
  Shield,
  Brain,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

interface SDLCCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  preferredModels: {
    primary: string;
    secondary: string[];
    description: string;
  };
  examples: string[];
}

const SDLC_CATEGORIES: SDLCCategory[] = [
  {
    id: 'planning',
    name: 'Planning & Analysis',
    description: 'Requirements gathering, architecture design, project planning',
    icon: <FileText className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600',
    preferredModels: {
      primary: 'Claude 3.5 Sonnet',
      secondary: ['GPT-4', 'GPT-4 Turbo'],
      description: 'Claude excels at analytical thinking and structured planning'
    },
    examples: [
      'Define project requirements',
      'Create system architecture',
      'Analyze feasibility',
      'Plan development phases'
    ]
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Coding, debugging, code reviews, refactoring',
    icon: <Code className="h-5 w-5" />,
    color: 'from-green-500 to-green-600',
    preferredModels: {
      primary: 'GPT-4',
      secondary: ['Claude 3.5 Sonnet', 'GPT-4 Turbo'],
      description: 'GPT-4 has excellent coding capabilities and debugging skills'
    },
    examples: [
      'Write functions and classes',
      'Debug code issues',
      'Refactor existing code',
      'Code reviews'
    ]
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Unit tests, integration tests, performance testing',
    icon: <TestTube className="h-5 w-5" />,
    color: 'from-purple-500 to-purple-600',
    preferredModels: {
      primary: 'GPT-4',
      secondary: ['Claude 3.5 Sonnet', 'GPT-3.5 Turbo'],
      description: 'GPT-4 creates comprehensive test suites and edge cases'
    },
    examples: [
      'Write unit tests',
      'Create integration tests',
      'Performance testing',
      'Test automation'
    ]
  },
  {
    id: 'ui-ux',
    name: 'UI/UX Design',
    description: 'Interface design, user experience, accessibility',
    icon: <Palette className="h-5 w-5" />,
    color: 'from-pink-500 to-pink-600',
    preferredModels: {
      primary: 'Claude 3.5 Sonnet',
      secondary: ['GPT-4', 'GPT-4 Turbo'],
      description: 'Claude has strong design thinking and user experience insights'
    },
    examples: [
      'Design user interfaces',
      'Improve user experience',
      'Accessibility features',
      'Design systems'
    ]
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Technical docs, API documentation, user guides',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'from-orange-500 to-orange-600',
    preferredModels: {
      primary: 'Claude 3.5 Sonnet',
      secondary: ['GPT-4', 'GPT-3.5 Turbo'],
      description: 'Claude excels at clear, structured technical writing'
    },
    examples: [
      'Write technical documentation',
      'Create API docs',
      'User guides',
      'Code comments'
    ]
  },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'DevOps, CI/CD, monitoring, infrastructure',
    icon: <Rocket className="h-5 w-5" />,
    color: 'from-indigo-500 to-indigo-600',
    preferredModels: {
      primary: 'GPT-4',
      secondary: ['Claude 3.5 Sonnet', 'GPT-4 Turbo'],
      description: 'GPT-4 has strong DevOps and infrastructure knowledge'
    },
    examples: [
      'Setup CI/CD pipelines',
      'Docker containers',
      'Cloud deployment',
      'Monitoring setup'
    ]
  },
  {
    id: 'quality-assurance',
    name: 'Quality Assurance',
    description: 'Code quality, security audits, performance optimization',
    icon: <Shield className="h-5 w-5" />,
    color: 'from-red-500 to-red-600',
    preferredModels: {
      primary: 'Claude 3.5 Sonnet',
      secondary: ['GPT-4', 'GPT-4 Turbo'],
      description: 'Claude provides thorough analysis and security insights'
    },
    examples: [
      'Code quality review',
      'Security audits',
      'Performance optimization',
      'Best practices'
    ]
  }
];

interface SDLCNavigationMenuProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
  className?: string;
}

export function SDLCNavigationMenu({ 
  selectedCategory, 
  onCategorySelect, 
  className 
}: SDLCNavigationMenuProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="h-6 w-6 text-blue-600" />
          AI-Powered SDLC Assistant
        </h2>
        <p className="text-muted-foreground">
          Choose your development focus area for optimized AI model selection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SDLC_CATEGORIES.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onHoverStart={() => setHoveredCategory(category.id)}
            onHoverEnd={() => setHoveredCategory(null)}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-lg",
                selectedCategory === category.id 
                  ? "ring-2 ring-blue-500 shadow-lg" 
                  : "hover:shadow-md"
              )}
              onClick={() => onCategorySelect(category.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-r",
                    category.color
                  )}>
                    <div className="text-white">
                      {category.icon}
                    </div>
                  </div>
                  {selectedCategory === category.id && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
                
                {/* Preferred Models */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      Primary: {category.preferredModels.primary}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {category.preferredModels.description}
                  </p>
                </div>

                {/* Examples - show on hover or selection */}
                {(hoveredCategory === category.id || selectedCategory === category.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t pt-3"
                  >
                    <div className="text-xs text-muted-foreground mb-2">
                      Example tasks:
                    </div>
                    <ul className="text-xs space-y-1">
                      {category.examples.slice(0, 3).map((example, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Selected Category Summary */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Active Category: {SDLC_CATEGORIES.find(c => c.id === selectedCategory)?.name}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Optimized Models:</h4>
              <div className="flex flex-wrap gap-1">
                {SDLC_CATEGORIES.find(c => c.id === selectedCategory)?.preferredModels.secondary.map((model) => (
                  <Badge key={model} variant="outline" className="text-xs">
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Ready for:</h4>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  {SDLC_CATEGORIES.find(c => c.id === selectedCategory)?.description}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}