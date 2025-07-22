import React, { useState } from 'react';
import { Brain, Upload, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RAGChatWindow } from '@/components/chat/RAGChatWindow';
import { KnowledgeUpload } from '@/components/knowledge/KnowledgeUpload';

export const RAGDemo: React.FC = () => {
  const [step, setStep] = useState(1);
  const [sampleContent, setSampleContent] = useState('');

  const createSampleFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    return new File([blob], filename, { type: 'text/plain' });
  };

  const sampleDocuments = [
    {
      name: 'AI_Basics.txt',
      content: `Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that can think and learn like humans. AI systems can perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.

There are different types of AI:
1. Narrow AI (Weak AI): Designed for specific tasks like chess, image recognition, or language translation
2. General AI (Strong AI): Hypothetical AI that could understand, learn, and apply intelligence across various domains
3. Artificial Superintelligence: AI that surpasses human intelligence in all aspects

Machine Learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed. Deep Learning, a subset of machine learning, uses neural networks with multiple layers to model and understand complex patterns.

Key applications of AI include:
- Healthcare: Medical diagnosis, drug discovery, personalized treatment
- Transportation: Autonomous vehicles, traffic optimization
- Finance: Fraud detection, algorithmic trading, risk assessment
- Entertainment: Content recommendation, game AI, virtual assistants`
    },
    {
      name: 'React_Guide.txt',
      content: `React is a popular JavaScript library for building user interfaces, particularly web applications. It was developed by Facebook and is now maintained by Facebook and the open-source community.

Key Concepts:

Components: React applications are built using components, which are reusable pieces of UI. Components can be functional or class-based.

JSX: JavaScript XML allows you to write HTML-like syntax within JavaScript code. It makes components more readable and easier to write.

Props: Properties that are passed from parent components to child components. Props are read-only and help make components reusable.

State: Local data that belongs to a component. When state changes, the component re-renders to reflect the new state.

Hooks: Functions that let you use state and other React features in functional components. Common hooks include useState, useEffect, and useContext.

Best Practices:
- Keep components small and focused
- Use functional components with hooks
- Implement proper error boundaries
- Optimize performance with React.memo and useMemo
- Follow naming conventions for components and props

React ecosystem includes tools like Create React App for bootstrapping, React Router for navigation, and various state management libraries like Redux or Zustand.`
    },
    {
      name: 'Company_Policy.txt',
      content: `Company Remote Work Policy

Effective Date: January 2024

Overview:
Our company supports flexible work arrangements to promote work-life balance and productivity. This policy outlines the guidelines for remote work arrangements.

Eligibility:
- Full-time employees with at least 6 months tenure
- Part-time employees on case-by-case basis
- Must have demonstrated ability to work independently
- Role must be suitable for remote work

Work Schedule:
- Core hours: 10 AM - 3 PM in company timezone
- Flexible start/end times outside core hours
- Minimum 40 hours per week for full-time employees
- Regular attendance at scheduled meetings required

Equipment and Technology:
- Company-provided laptop and necessary software
- Reliable internet connection (minimum 25 Mbps)
- Quiet, dedicated workspace
- Employee responsible for home office setup costs

Communication Requirements:
- Daily check-ins via Slack or email
- Weekly one-on-one meetings with supervisor
- Participation in video calls and team meetings
- Response time expectations: 4 hours during business hours

Performance Standards:
- Same performance expectations as office-based work
- Regular performance reviews and feedback
- Goal-setting and progress tracking via company tools
- Adherence to company values and culture

Security and Confidentiality:
- VPN usage required for all company system access
- Secure storage of confidential information
- Compliance with data protection policies
- Immediate reporting of security incidents

This policy is subject to review and updates based on business needs and regulatory requirements.`
    }
  ];

  const handleAddSampleDocs = async () => {
    // This would normally use the KnowledgeUpload component
    // For demo purposes, we'll simulate adding documents
    console.log('Adding sample documents to knowledge base...');
    setStep(2);
  };

  const handleTestQuery = (query: string) => {
    setSampleContent(query);
    setStep(3);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Brain className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">RAG System Demo</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Test Retrieval-Augmented Generation with sample documents
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= i
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {i}
            </div>
            {i < 3 && (
              <div
                className={`h-1 w-12 ${
                  step > i ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Step 1: Add Sample Documents</span>
              </CardTitle>
              <CardDescription>
                We'll add some sample documents to demonstrate RAG functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {sampleDocuments.map((doc, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.content.length} characters
                        </p>
                      </div>
                      <Badge variant="secondary">Text</Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button onClick={handleAddSampleDocs} className="w-full">
                Add Sample Documents to Knowledge Base
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Content Preview</CardTitle>
              <CardDescription>
                Here's what will be added to your knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={sampleDocuments[0].content.substring(0, 500) + '...'}
                readOnly
                className="h-64 resize-none text-sm"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Step 2: Test RAG Queries</span>
            </CardTitle>
            <CardDescription>
              Try these sample queries to see how RAG enhances responses with context
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'What are the different types of AI?',
                'How do React hooks work?',
                'What is the remote work policy for core hours?',
                'Explain machine learning and deep learning',
                'What are React best practices?',
                'What equipment does the company provide for remote work?'
              ].map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => handleTestQuery(query)}
                  className="text-left h-auto p-4 justify-start"
                >
                  <div>
                    <p className="font-medium">{query}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Test this query
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: RAG-Enhanced Chat</CardTitle>
              <CardDescription>
                The chat will now use the knowledge base to provide better answers
              </CardDescription>
            </CardHeader>
          </Card>
          
          <div className="h-[600px] border rounded-lg">
            <RAGChatWindow />
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              ← Back to Queries
            </Button>
            <Button variant="outline" onClick={() => setStep(1)}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            How RAG Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <ol className="list-decimal list-inside space-y-2">
            <li>Documents are processed and split into chunks</li>
            <li>Each chunk is converted to vector embeddings using AI</li>
            <li>When you ask a question, similar chunks are found using vector search</li>
            <li>Relevant context is added to your query before sending to the AI</li>
            <li>The AI generates a response informed by your specific knowledge base</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default RAGDemo;