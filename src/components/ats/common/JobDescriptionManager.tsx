import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Search, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobDescription } from '@/types/ats';

interface JobDescriptionManagerProps {
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const JobDescriptionManager: React.FC<JobDescriptionManagerProps> = ({
  selectedId,
  onSelect
}) => {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobDescription | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'full-time' as JobDescription['type'],
    description: '',
    requirements: '',
    preferredQualifications: '',
    responsibilities: '',
    benefits: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD'
  });

  useEffect(() => {
    // Load mock job descriptions
    const mockJobs: JobDescription[] = [
      {
        id: '1',
        title: 'Senior Frontend Developer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        type: 'full-time',
        description: 'We are looking for a Senior Frontend Developer to join our team and help build amazing user experiences.',
        requirements: [
          '5+ years of React experience',
          'Strong TypeScript skills',
          'Experience with modern CSS frameworks',
          'Knowledge of state management (Redux, Zustand)',
          'Bachelor\'s degree in Computer Science or related field'
        ],
        preferredQualifications: [
          'Next.js experience',
          'Testing frameworks (Jest, Cypress)',
          'Design system experience',
          'AWS knowledge'
        ],
        responsibilities: [
          'Develop and maintain React applications',
          'Collaborate with design team',
          'Mentor junior developers',
          'Participate in code reviews'
        ],
        benefits: [
          'Competitive salary',
          'Health insurance',
          'Remote work options',
          '401k matching'
        ],
        salary: {
          min: 120000,
          max: 180000,
          currency: 'USD'
        },
        keywords: ['React', 'TypeScript', 'CSS', 'Redux', 'Zustand', 'Frontend'],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '2',
        title: 'Full Stack Engineer',
        company: 'StartupXYZ',
        location: 'Remote',
        type: 'full-time',
        description: 'Join our fast-growing startup as a Full Stack Engineer and help build the next generation of SaaS products.',
        requirements: [
          '3+ years of full-stack development',
          'Node.js and Express experience',
          'React or Vue.js frontend experience',
          'Database design experience (PostgreSQL, MongoDB)',
          'RESTful API development'
        ],
        preferredQualifications: [
          'GraphQL experience',
          'Docker and Kubernetes',
          'AWS or GCP experience',
          'Startup experience'
        ],
        responsibilities: [
          'Build full-stack features',
          'Design and implement APIs',
          'Optimize application performance',
          'Deploy and maintain services'
        ],
        benefits: [
          'Equity participation',
          'Flexible hours',
          'Learning budget',
          'Health insurance'
        ],
        salary: {
          min: 90000,
          max: 140000,
          currency: 'USD'
        },
        keywords: ['Full Stack', 'Node.js', 'React', 'Vue.js', 'PostgreSQL', 'MongoDB', 'APIs'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-12')
      }
    ];
    setJobDescriptions(mockJobs);
  }, []);

  const filteredJobs = jobDescriptions.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateEdit = () => {
    if (editingJob) {
      // Update existing job
      setJobDescriptions(prev => prev.map(job => 
        job.id === editingJob.id 
          ? {
              ...job,
              title: formData.title,
              company: formData.company,
              location: formData.location,
              type: formData.type,
              description: formData.description,
              requirements: formData.requirements.split('\n').filter(r => r.trim()),
              preferredQualifications: formData.preferredQualifications.split('\n').filter(q => q.trim()),
              responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
              benefits: formData.benefits.split('\n').filter(b => b.trim()),
              salary: {
                min: parseInt(formData.salaryMin) || undefined,
                max: parseInt(formData.salaryMax) || undefined,
                currency: formData.currency
              },
              updatedAt: new Date()
            }
          : job
      ));
    } else {
      // Create new job
      const newJob: JobDescription = {
        id: crypto.randomUUID(),
        title: formData.title,
        company: formData.company,
        location: formData.location,
        type: formData.type,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        preferredQualifications: formData.preferredQualifications.split('\n').filter(q => q.trim()),
        responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
        benefits: formData.benefits.split('\n').filter(b => b.trim()),
        salary: {
          min: parseInt(formData.salaryMin) || undefined,
          max: parseInt(formData.salaryMax) || undefined,
          currency: formData.currency
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setJobDescriptions(prev => [newJob, ...prev]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (job: JobDescription) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company: job.company || '',
      location: job.location || '',
      type: job.type || 'full-time',
      description: job.description,
      requirements: job.requirements?.join('\n') || '',
      preferredQualifications: job.preferredQualifications?.join('\n') || '',
      responsibilities: job.responsibilities?.join('\n') || '',
      benefits: job.benefits?.join('\n') || '',
      salaryMin: job.salary?.min?.toString() || '',
      salaryMax: job.salary?.max?.toString() || '',
      currency: job.salary?.currency || 'USD'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setJobDescriptions(prev => prev.filter(job => job.id !== id));
    if (selectedId === id) {
      onSelect('');
    }
  };

  const resetForm = () => {
    setEditingJob(null);
    setFormData({
      title: '',
      company: '',
      location: '',
      type: 'full-time',
      description: '',
      requirements: '',
      preferredQualifications: '',
      responsibilities: '',
      benefits: '',
      salaryMin: '',
      salaryMax: '',
      currency: 'USD'
    });
  };

  const formatSalary = (job: JobDescription) => {
    if (!job.salary?.min && !job.salary?.max) return null;
    const { min, max, currency = 'USD' } = job.salary;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `${formatter.format(min)}+`;
    } else if (max) {
      return `Up to ${formatter.format(max)}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Descriptions</h2>
          <p className="text-muted-foreground">Manage job descriptions for accurate resume scoring</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Job Description
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingJob ? 'Edit Job Description' : 'Create Job Description'}
              </DialogTitle>
              <DialogDescription>
                {editingJob ? 'Update the job description details' : 'Create a new job description for resume scoring'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Senior Frontend Developer"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Tech Corp"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="San Francisco, CA"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Job Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as JobDescription['type'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="salaryMin">Min Salary</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: e.target.value }))}
                      placeholder="120000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Max Salary</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: e.target.value }))}
                      placeholder="180000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the role..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="requirements">Requirements (one per line) *</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                    placeholder="5+ years of React experience&#10;Strong TypeScript skills&#10;Bachelor's degree in Computer Science"
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="preferredQualifications">Preferred Qualifications (one per line)</Label>
                  <Textarea
                    id="preferredQualifications"
                    value={formData.preferredQualifications}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredQualifications: e.target.value }))}
                    placeholder="Next.js experience&#10;Testing frameworks&#10;AWS knowledge"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
                  <Textarea
                    id="responsibilities"
                    value={formData.responsibilities}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value }))}
                    placeholder="Develop React applications&#10;Mentor junior developers&#10;Code reviews"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEdit}>
                {editingJob ? 'Update' : 'Create'} Job Description
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search job descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredJobs.map((job) => (
          <Card 
            key={job.id} 
            className={`cursor-pointer transition-colors ${
              selectedId === job.id ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
            }`}
            onClick={() => onSelect(job.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {job.title}
                    {selectedId === job.id && <Badge variant="default">Selected</Badge>}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-1">
                    {job.company && <span>{job.company}</span>}
                    {job.location && <span>• {job.location}</span>}
                    {job.type && <Badge variant="outline">{job.type}</Badge>}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(job);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(job.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {job.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {job.createdAt.toLocaleDateString()}
                  </span>
                  {formatSalary(job) && (
                    <span className="font-medium text-foreground">
                      {formatSalary(job)}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {job.keywords?.slice(0, 3).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {job.keywords && job.keywords.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{job.keywords.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No job descriptions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No results match your search.' : 'Create your first job description to get started.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Job Description
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};