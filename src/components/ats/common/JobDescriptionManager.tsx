import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useATSStore } from '@/stores/useATSStore';
import { 
  Briefcase, 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  DollarSign,
  Edit,
  Trash2,
  Target
} from 'lucide-react';

export const JobDescriptionManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    jobDescriptions, 
    selectedJobId, 
    setSelectedJobId,
    deleteJobDescription 
  } = useATSStore();

  // Mock job descriptions for demo
  const mockJobs = jobDescriptions.length === 0 ? [
    {
      id: 'job-1',
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      type: 'full-time' as const,
      remote: 'hybrid' as const,
      salary: { min: 120000, max: 180000, currency: 'USD' },
      description: 'Join our team to build cutting-edge web applications using React and TypeScript.',
      experienceRange: { min: 5, max: 10 },
      requirements: [
        { skill: 'React', required: true, importance: 'critical' as const },
        { skill: 'TypeScript', required: true, importance: 'critical' as const },
        { skill: 'Node.js', required: false, importance: 'important' as const },
      ],
      active: true,
      createdDate: new Date().toISOString(),
      responsibilities: [],
      preferredQualifications: [],
    },
    {
      id: 'job-2',
      title: 'Full Stack Engineer',
      company: 'StartupXYZ',
      location: 'Austin, TX',
      type: 'full-time' as const,
      remote: 'remote' as const,
      salary: { min: 100000, max: 150000, currency: 'USD' },
      description: 'Looking for a versatile engineer to work on both frontend and backend systems.',
      experienceRange: { min: 3, max: 7 },
      requirements: [
        { skill: 'JavaScript', required: true, importance: 'critical' as const },
        { skill: 'Python', required: true, importance: 'critical' as const },
        { skill: 'AWS', required: false, importance: 'nice-to-have' as const },
      ],
      active: true,
      createdDate: new Date().toISOString(),
      responsibilities: [],
      preferredQualifications: [],
    },
  ] : jobDescriptions;

  const filteredJobs = mockJobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full space-y-6">
      {/* Header with Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Job Description
        </Button>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <Card 
            key={job.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedJobId === job.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {job.company}
                  </CardDescription>
                </div>
                {selectedJobId === job.id && (
                  <Badge variant="default">
                    <Target className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Location and Type */}
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {job.type}
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Experience Range */}
                <div className="text-sm">
                  <span className="font-medium">Experience: </span>
                  {job.experienceRange.min}-{job.experienceRange.max} years
                </div>

                {/* Key Requirements */}
                <div>
                  <div className="text-sm font-medium mb-2">Key Requirements:</div>
                  <div className="flex flex-wrap gap-1">
                    {job.requirements.slice(0, 4).map((req, index) => (
                      <Badge 
                        key={index} 
                        variant={req.importance === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {req.skill}
                      </Badge>
                    ))}
                    {job.requirements.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{job.requirements.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Remote Status */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {job.remote === 'remote' ? 'Remote' : 
                     job.remote === 'hybrid' ? 'Hybrid' : 'On-site'}
                  </Badge>
                  
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteJobDescription(job.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card className="py-12">
          <CardContent>
            <div className="text-center text-muted-foreground">
              <Briefcase className="mx-auto h-12 w-12 mb-4" />
              <p className="mb-2">No job descriptions found</p>
              <p className="text-sm">Create your first job description to start analyzing resumes</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};