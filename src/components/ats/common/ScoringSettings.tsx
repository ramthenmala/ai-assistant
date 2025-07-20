import React, { useState } from 'react';
import { Settings, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import type { ATSSettings, ScoringWeights } from '@/types/ats';

export const ScoringSettings: React.FC = () => {
  const [settings, setSettings] = useState<ATSSettings>({
    scoringWeights: {
      keywordMatch: 25,
      experienceRelevance: 25,
      skillsAlignment: 20,
      educationMatch: 10,
      certifications: 5,
      projectRelevance: 10,
      industryFit: 5
    },
    minimumScore: 60,
    parseOptions: {
      extractEmail: true,
      extractPhone: true,
      extractLinkedIn: true,
      extractGitHub: true,
      performOCR: false
    },
    rankingOptions: {
      showTopN: 50,
      highlightThreshold: 80
    }
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateScoringWeight = (key: keyof ScoringWeights, value: number) => {
    setSettings(prev => ({
      ...prev,
      scoringWeights: {
        ...prev.scoringWeights,
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateParseOption = (key: keyof ATSSettings['parseOptions'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      parseOptions: {
        ...prev.parseOptions,
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateRankingOption = (key: keyof ATSSettings['rankingOptions'], value: number) => {
    setSettings(prev => ({
      ...prev,
      rankingOptions: {
        ...prev.rankingOptions,
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const updateMinimumScore = (value: number) => {
    setSettings(prev => ({ ...prev, minimumScore: value }));
    setHasUnsavedChanges(true);
  };

  const getTotalWeight = () => {
    return Object.values(settings.scoringWeights).reduce((sum, weight) => sum + weight, 0);
  };

  const saveSettings = () => {
    // In a real app, this would save to backend/localStorage
    console.log('Saving settings:', settings);
    setHasUnsavedChanges(false);
    // You could add a toast notification here
  };

  const resetToDefaults = () => {
    setSettings({
      scoringWeights: {
        keywordMatch: 25,
        experienceRelevance: 25,
        skillsAlignment: 20,
        educationMatch: 10,
        certifications: 5,
        projectRelevance: 10,
        industryFit: 5
      },
      minimumScore: 60,
      parseOptions: {
        extractEmail: true,
        extractPhone: true,
        extractLinkedIn: true,
        extractGitHub: true,
        performOCR: false
      },
      rankingOptions: {
        showTopN: 50,
        highlightThreshold: 80
      }
    });
    setHasUnsavedChanges(true);
  };

  const totalWeight = getTotalWeight();
  const isWeightValid = totalWeight === 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Scoring Settings
          </h2>
          <p className="text-muted-foreground">Configure how resumes are scored and ranked</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveSettings} disabled={!hasUnsavedChanges || !isWeightValid}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your settings.
          </AlertDescription>
        </Alert>
      )}

      {!isWeightValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Scoring weights must total exactly 100%. Current total: {totalWeight}%
          </AlertDescription>
        </Alert>
      )}

      {/* Scoring Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Weights</CardTitle>
          <CardDescription>
            Adjust how much each factor contributes to the overall score. Total must equal 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Keyword Match</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.keywordMatch}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.keywordMatch]}
                  onValueChange={([value]) => updateScoringWeight('keywordMatch', value)}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How well resume keywords match job description
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Experience Relevance</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.experienceRelevance}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.experienceRelevance]}
                  onValueChange={([value]) => updateScoringWeight('experienceRelevance', value)}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Years and relevance of work experience
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Skills Alignment</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.skillsAlignment}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.skillsAlignment]}
                  onValueChange={([value]) => updateScoringWeight('skillsAlignment', value)}
                  max={40}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Technical and soft skills match
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Education Match</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.educationMatch}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.educationMatch]}
                  onValueChange={([value]) => updateScoringWeight('educationMatch', value)}
                  max={25}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Educational background relevance
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Certifications</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.certifications}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.certifications]}
                  onValueChange={([value]) => updateScoringWeight('certifications', value)}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Professional certifications and licenses
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Project Relevance</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.projectRelevance}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.projectRelevance]}
                  onValueChange={([value]) => updateScoringWeight('projectRelevance', value)}
                  max={25}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Personal and professional projects
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Industry Fit</Label>
                  <span className="text-sm font-medium">{settings.scoringWeights.industryFit}%</span>
                </div>
                <Slider
                  value={[settings.scoringWeights.industryFit]}
                  onValueChange={([value]) => updateScoringWeight('industryFit', value)}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Previous industry experience alignment
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <span className="font-medium">Total Weight:</span>
            <span className={`text-lg font-bold ${
              isWeightValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {totalWeight}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure minimum score thresholds and ranking options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Minimum Score Threshold</Label>
              <span className="text-sm font-medium">{settings.minimumScore}%</span>
            </div>
            <Slider
              value={[settings.minimumScore]}
              onValueChange={([value]) => updateMinimumScore(value)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Candidates below this score are considered poor fits
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="showTopN">Show Top N Candidates</Label>
              <Input
                id="showTopN"
                type="number"
                value={settings.rankingOptions.showTopN}
                onChange={(e) => updateRankingOption('showTopN', parseInt(e.target.value) || 0)}
                min={1}
                max={100}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of candidates to display in rankings
              </p>
            </div>

            <div>
              <Label htmlFor="highlightThreshold">Highlight Threshold</Label>
              <Input
                id="highlightThreshold"
                type="number"
                value={settings.rankingOptions.highlightThreshold}
                onChange={(e) => updateRankingOption('highlightThreshold', parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Score above which candidates are highlighted as top performers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parsing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Resume Parsing Options</CardTitle>
          <CardDescription>
            Configure what information to extract from resumes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Extract Email Addresses</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect and extract email addresses
                  </p>
                </div>
                <Switch
                  checked={settings.parseOptions.extractEmail}
                  onCheckedChange={(checked) => updateParseOption('extractEmail', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Extract Phone Numbers</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect and extract phone numbers
                  </p>
                </div>
                <Switch
                  checked={settings.parseOptions.extractPhone}
                  onCheckedChange={(checked) => updateParseOption('extractPhone', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Extract LinkedIn Profiles</Label>
                  <p className="text-xs text-muted-foreground">
                    Look for LinkedIn profile URLs
                  </p>
                </div>
                <Switch
                  checked={settings.parseOptions.extractLinkedIn}
                  onCheckedChange={(checked) => updateParseOption('extractLinkedIn', checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Extract GitHub Profiles</Label>
                  <p className="text-xs text-muted-foreground">
                    Look for GitHub profile URLs and usernames
                  </p>
                </div>
                <Switch
                  checked={settings.parseOptions.extractGitHub}
                  onCheckedChange={(checked) => updateParseOption('extractGitHub', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Perform OCR on Images</Label>
                  <p className="text-xs text-muted-foreground">
                    Extract text from resume images (slower)
                  </p>
                </div>
                <Switch
                  checked={settings.parseOptions.performOCR}
                  onCheckedChange={(checked) => updateParseOption('performOCR', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};