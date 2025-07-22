import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useATSStore } from '@/stores/useATSStore';
import { 
  Settings, 
  Sliders, 
  FileText, 
  Target,
  RotateCcw,
  Download,
  Upload
} from 'lucide-react';

export const ATSSettings: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useATSStore();

  const handleWeightChange = (key: keyof typeof settings.scoring, value: number[]) => {
    const newScoring = { ...settings.scoring, [key]: value[0] };
    
    // Ensure weights add up to 100
    const total = Object.values(newScoring).reduce((sum, val) => sum + val, 0);
    if (total <= 100) {
      updateSettings({ scoring: newScoring });
    }
  };

  const totalWeight = Object.values(settings.scoring).reduce((sum, val) => sum + val, 0);

  return (
    <div className="h-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scoring Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Scoring Weights
            </CardTitle>
            <CardDescription>
              Configure how different factors contribute to the overall score
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 flex items-center justify-between">
                Experience Weight
                <span className="text-muted-foreground">{settings.scoring.experienceWeight}%</span>
              </Label>
              <Slider
                value={[settings.scoring.experienceWeight]}
                onValueChange={(value) => handleWeightChange('experienceWeight', value)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 flex items-center justify-between">
                Skills Weight
                <span className="text-muted-foreground">{settings.scoring.skillsWeight}%</span>
              </Label>
              <Slider
                value={[settings.scoring.skillsWeight]}
                onValueChange={(value) => handleWeightChange('skillsWeight', value)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 flex items-center justify-between">
                Education Weight
                <span className="text-muted-foreground">{settings.scoring.educationWeight}%</span>
              </Label>
              <Slider
                value={[settings.scoring.educationWeight]}
                onValueChange={(value) => handleWeightChange('educationWeight', value)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 flex items-center justify-between">
                Keywords Weight
                <span className="text-muted-foreground">{settings.scoring.keywordsWeight}%</span>
              </Label>
              <Slider
                value={[settings.scoring.keywordsWeight]}
                onValueChange={(value) => handleWeightChange('keywordsWeight', value)}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Weight:</span>
                <span className={`font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalWeight}%
                </span>
              </div>
              {totalWeight !== 100 && (
                <p className="text-xs text-red-600 mt-1">
                  Weights must add up to 100%
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parsing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Parsing Options
            </CardTitle>
            <CardDescription>
              Configure what information to extract from resumes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Extract Email Addresses</Label>
                  <p className="text-xs text-muted-foreground">Automatically find email addresses</p>
                </div>
                <Switch
                  checked={settings.parsing.extractEmail}
                  onCheckedChange={(checked) => 
                    updateSettings({ parsing: { ...settings.parsing, extractEmail: checked } })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Extract Phone Numbers</Label>
                  <p className="text-xs text-muted-foreground">Automatically find phone numbers</p>
                </div>
                <Switch
                  checked={settings.parsing.extractPhone}
                  onCheckedChange={(checked) => 
                    updateSettings({ parsing: { ...settings.parsing, extractPhone: checked } })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Extract LinkedIn Profiles</Label>
                  <p className="text-xs text-muted-foreground">Find LinkedIn profile URLs</p>
                </div>
                <Switch
                  checked={settings.parsing.extractLinkedIn}
                  onCheckedChange={(checked) => 
                    updateSettings({ parsing: { ...settings.parsing, extractLinkedIn: checked } })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Extract GitHub Profiles</Label>
                  <p className="text-xs text-muted-foreground">Find GitHub profile URLs</p>
                </div>
                <Switch
                  checked={settings.parsing.extractGitHub}
                  onCheckedChange={(checked) => 
                    updateSettings({ parsing: { ...settings.parsing, extractGitHub: checked } })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable OCR</Label>
                  <p className="text-xs text-muted-foreground">Extract text from scanned documents</p>
                </div>
                <Switch
                  checked={settings.parsing.useOCR}
                  onCheckedChange={(checked) => 
                    updateSettings({ parsing: { ...settings.parsing, useOCR: checked } })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoring Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Scoring Thresholds
            </CardTitle>
            <CardDescription>
              Set minimum scoring thresholds and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2">
                Minimum Score Threshold ({settings.minimumScore}%)
              </Label>
              <Slider
                value={[settings.minimumScore]}
                onValueChange={(value) => updateSettings({ minimumScore: value[0] })}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Candidates below this score will be flagged
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-reject Below Minimum</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically reject candidates below threshold
                </p>
              </div>
              <Switch
                checked={settings.autoRejectBelowMinimum}
                onCheckedChange={(checked) => 
                  updateSettings({ autoRejectBelowMinimum: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Actions
            </CardTitle>
            <CardDescription>
              Import/export settings and reset to defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full"
              onClick={resetSettings}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};