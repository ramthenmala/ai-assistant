import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SDLC_CATEGORIES } from '@/config/sdlcConfig';
import { 
  FileText, 
  Code, 
  TestTube, 
  Palette, 
  BookOpen, 
  Rocket, 
  Shield,
  Brain
} from 'lucide-react';

interface SDLCCategoryUI {
  id: string;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  color: string;
  primaryModel: string;
  secondaryModels: string[];
  description: string;
}

const SDLC_CATEGORIES_UI: SDLCCategoryUI[] = [
  {
    id: 'planning',
    name: 'Planning & Analysis',
    shortName: 'Planning',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600',
    primaryModel: SDLC_CATEGORIES.planning.primaryModels[0]?.name || 'Claude 3 Opus',
    secondaryModels: SDLC_CATEGORIES.planning.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'Requirements, architecture, feasibility'
  },
  {
    id: 'coding',
    name: 'Development',
    shortName: 'Coding',
    icon: <Code className="h-4 w-4" />,
    color: 'text-green-600',
    primaryModel: SDLC_CATEGORIES.coding.primaryModels[0]?.name || 'DeepSeek Coder V2',
    secondaryModels: SDLC_CATEGORIES.coding.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'Coding, debugging, refactoring'
  },
  {
    id: 'testing',
    name: 'Testing',
    shortName: 'Testing',
    icon: <TestTube className="h-4 w-4" />,
    color: 'text-purple-600',
    primaryModel: SDLC_CATEGORIES.testing.primaryModels[0]?.name || 'GPT-4 Turbo',
    secondaryModels: SDLC_CATEGORIES.testing.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'Unit, integration, performance testing'
  },
  {
    id: 'uiux',
    name: 'UI/UX Design',
    shortName: 'UI/UX',
    icon: <Palette className="h-4 w-4" />,
    color: 'text-pink-600',
    primaryModel: SDLC_CATEGORIES.uiux.primaryModels[0]?.name || 'GPT-4 Turbo',
    secondaryModels: SDLC_CATEGORIES.uiux.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'Interface design, user experience'
  },
  {
    id: 'docs',
    name: 'Documentation',
    shortName: 'Docs',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'text-orange-600',
    primaryModel: SDLC_CATEGORIES.docs.primaryModels[0]?.name || 'Claude 3 Sonnet',
    secondaryModels: SDLC_CATEGORIES.docs.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'Technical docs, API docs, guides'
  },
  {
    id: 'deploy',
    name: 'Deployment',
    shortName: 'Deploy',
    icon: <Rocket className="h-4 w-4" />,
    color: 'text-indigo-600',
    primaryModel: SDLC_CATEGORIES.deploy.primaryModels[0]?.name || 'GPT-4 Turbo',
    secondaryModels: SDLC_CATEGORIES.deploy.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'DevOps, CI/CD, monitoring'
  },
  {
    id: 'qa',
    name: 'Quality Assurance',
    shortName: 'QA',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-red-600',
    primaryModel: SDLC_CATEGORIES.qa.primaryModels[0]?.name || 'Claude 3 Opus',
    secondaryModels: SDLC_CATEGORIES.qa.secondaryModels.map(m => m.name).slice(0, 2),
    description: 'Code quality, security, performance'
  }
];

interface SDLCHeaderNavProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
  className?: string;
}

export function SDLCHeaderNav({ 
  selectedCategory, 
  onCategorySelect, 
  className 
}: SDLCHeaderNavProps) {
  const selectedCategoryData = SDLC_CATEGORIES_UI.find(c => c.id === selectedCategory);

  return (
    <div className={cn("border-b bg-white", className)}>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">AI-Powered SDLC Assistant</h2>
            </div>
            
            {/* SDLC Category Buttons */}
            <div className="flex items-center gap-1">
              {SDLC_CATEGORIES_UI.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onCategorySelect(category.id)}
                  className={cn(
                    "flex items-center gap-2 transition-all h-8",
                    selectedCategory === category.id && "shadow-sm"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center",
                    selectedCategory === category.id ? "text-white" : category.color
                  )}>
                    {category.icon}
                  </div>
                  <span className="font-medium text-sm">{category.shortName}</span>
                </Button>
              ))}
            </div>
          </div>
          
          {selectedCategoryData && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full bg-current", selectedCategoryData.color)} />
              Active: {selectedCategoryData.name}
            </Badge>
          )}
        </div>

        {selectedCategoryData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{selectedCategoryData.name}</span>
                  <Badge variant="outline" className="text-xs">
                    Optimized for {selectedCategoryData.description}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Primary: {selectedCategoryData.primaryModel} • 
                  Secondary: {selectedCategoryData.secondaryModels.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full bg-current", selectedCategoryData.color)} />
                <span className="text-xs text-muted-foreground">Ready</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export { SDLC_CATEGORIES_UI };
export type { SDLCCategoryUI };