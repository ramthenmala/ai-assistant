import type { SavedPrompt } from '@/types';
import { getCurrentTimestamp } from '@/utils';

export const defaultPrompts: SavedPrompt[] = [
  {
    id: 'code-review',
    title: 'Code Review Assistant',
    description: 'Comprehensive code review with focus on best practices, performance, and security',
    content: `Please review the following {{language}} code and provide feedback on:

1. **Code Quality**: Are there any issues with readability, maintainability, or structure?
2. **Performance**: Are there any performance bottlenecks or optimization opportunities?
3. **Security**: Are there any security vulnerabilities or concerns?
4. **Best Practices**: Does the code follow {{language}} best practices and conventions?
5. **Testing**: Are there areas that need better test coverage?

Code to review:
{{code}}

Please provide specific, actionable feedback with examples where possible.`,
    tags: ['code', 'review', 'development', 'quality'],
    category: 'coding',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: false,
    isTemplate: true,
    variables: [
      {
        name: 'language',
        type: 'select',
        description: 'Programming language',
        required: true,
        options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'PHP', 'Ruby']
      },
      {
        name: 'code',
        type: 'textarea',
        description: 'Code to review',
        required: true
      }
    ]
  },
  {
    id: 'blog-writer',
    title: 'Blog Post Writer',
    description: 'Create engaging blog posts with SEO optimization',
    content: `Write a comprehensive blog post about {{topic}} for {{audience}}. 

Requirements:
- **Title**: Create an engaging, SEO-friendly title
- **Length**: Approximately {{word_count}} words
- **Tone**: {{tone}}
- **Structure**: Include introduction, main sections with subheadings, and conclusion
- **SEO**: Include relevant keywords naturally throughout
- **Engagement**: Add actionable tips and examples
- **Call to Action**: End with a compelling CTA

Additional context: {{context}}

Please format the output with proper markdown headings and structure.`,
    tags: ['writing', 'blog', 'content', 'seo', 'marketing'],
    category: 'writing',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: false,
    isTemplate: true,
    variables: [
      {
        name: 'topic',
        type: 'text',
        description: 'Blog post topic',
        required: true
      },
      {
        name: 'audience',
        type: 'text',
        description: 'Target audience',
        required: true,
        defaultValue: 'general readers'
      },
      {
        name: 'word_count',
        type: 'select',
        description: 'Approximate word count',
        required: true,
        options: ['800-1000', '1000-1500', '1500-2000', '2000+'],
        defaultValue: '1000-1500'
      },
      {
        name: 'tone',
        type: 'select',
        description: 'Writing tone',
        required: true,
        options: ['Professional', 'Casual', 'Conversational', 'Authoritative', 'Friendly'],
        defaultValue: 'Professional'
      },
      {
        name: 'context',
        type: 'textarea',
        description: 'Additional context or requirements',
        required: false
      }
    ]
  },
  {
    id: 'data-analyst',
    title: 'Data Analysis Report',
    description: 'Generate comprehensive data analysis reports with insights and recommendations',
    content: `Analyze the following {{data_type}} data and provide a comprehensive report:

**Data Overview:**
{{data_description}}

**Analysis Requirements:**
1. **Summary Statistics**: Provide key metrics and distributions
2. **Trends**: Identify patterns and trends over time
3. **Insights**: Extract meaningful insights and correlations
4. **Recommendations**: Suggest actionable next steps
5. **Visualizations**: Recommend appropriate charts and graphs

**Focus Areas:**
{{focus_areas}}

**Business Context:**
{{business_context}}

Please structure the analysis with clear sections and provide specific, data-driven recommendations.`,
    tags: ['data', 'analysis', 'insights', 'reporting', 'business'],
    category: 'analysis',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: false,
    isTemplate: true,
    variables: [
      {
        name: 'data_type',
        type: 'select',
        description: 'Type of data to analyze',
        required: true,
        options: ['Sales', 'Marketing', 'User Behavior', 'Financial', 'Operational', 'Survey', 'Performance']
      },
      {
        name: 'data_description',
        type: 'textarea',
        description: 'Description of the data or dataset',
        required: true
      },
      {
        name: 'focus_areas',
        type: 'textarea',
        description: 'Specific areas to focus on in the analysis',
        required: false
      },
      {
        name: 'business_context',
        type: 'textarea',
        description: 'Business context and objectives',
        required: false
      }
    ]
  },
  {
    id: 'creative-storyteller',
    title: 'Creative Story Generator',
    description: 'Generate creative stories with customizable elements',
    content: `Create a {{genre}} story with the following elements:

**Setting**: {{setting}}
**Main Character**: {{protagonist}}
**Conflict/Challenge**: {{conflict}}
**Tone**: {{tone}}
**Length**: {{length}}

**Additional Elements:**
{{additional_elements}}

**Special Requirements:**
{{special_requirements}}

Please craft an engaging story that incorporates all these elements naturally. Focus on character development, vivid descriptions, and a satisfying resolution.`,
    tags: ['creative', 'storytelling', 'fiction', 'narrative', 'writing'],
    category: 'creative',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: false,
    isTemplate: true,
    variables: [
      {
        name: 'genre',
        type: 'select',
        description: 'Story genre',
        required: true,
        options: ['Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Adventure', 'Horror', 'Drama', 'Comedy']
      },
      {
        name: 'setting',
        type: 'text',
        description: 'Story setting (time and place)',
        required: true
      },
      {
        name: 'protagonist',
        type: 'text',
        description: 'Main character description',
        required: true
      },
      {
        name: 'conflict',
        type: 'text',
        description: 'Central conflict or challenge',
        required: true
      },
      {
        name: 'tone',
        type: 'select',
        description: 'Story tone',
        required: true,
        options: ['Light-hearted', 'Dark', 'Mysterious', 'Uplifting', 'Dramatic', 'Humorous'],
        defaultValue: 'Dramatic'
      },
      {
        name: 'length',
        type: 'select',
        description: 'Story length',
        required: true,
        options: ['Short (500-800 words)', 'Medium (800-1500 words)', 'Long (1500+ words)'],
        defaultValue: 'Medium (800-1500 words)'
      },
      {
        name: 'additional_elements',
        type: 'textarea',
        description: 'Additional elements to include',
        required: false
      },
      {
        name: 'special_requirements',
        type: 'textarea',
        description: 'Special requirements or constraints',
        required: false
      }
    ]
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes Summarizer',
    description: 'Transform meeting notes into structured summaries with action items',
    content: `Please analyze the following meeting notes and create a structured summary:

**Meeting Details:**
- Date: {{date}}
- Attendees: {{attendees}}
- Duration: {{duration}}
- Purpose: {{purpose}}

**Raw Notes:**
{{raw_notes}}

**Required Output Format:**
1. **Executive Summary** (2-3 sentences)
2. **Key Discussion Points**
3. **Decisions Made**
4. **Action Items** (with owners and deadlines)
5. **Next Steps**
6. **Follow-up Required**

Please ensure all action items are clearly identified with responsible parties and timelines where mentioned.`,
    tags: ['meetings', 'notes', 'summary', 'action-items', 'business'],
    category: 'general',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: false,
    isTemplate: true,
    variables: [
      {
        name: 'date',
        type: 'text',
        description: 'Meeting date',
        required: true
      },
      {
        name: 'attendees',
        type: 'text',
        description: 'Meeting attendees',
        required: true
      },
      {
        name: 'duration',
        type: 'text',
        description: 'Meeting duration',
        required: false
      },
      {
        name: 'purpose',
        type: 'text',
        description: 'Meeting purpose',
        required: true
      },
      {
        name: 'raw_notes',
        type: 'textarea',
        description: 'Raw meeting notes',
        required: true
      }
    ]
  },
  {
    id: 'email-composer',
    title: 'Professional Email Composer',
    description: 'Compose professional emails for various purposes',
    content: `Compose a professional email with the following details:

**Email Type**: {{email_type}}
**Recipient**: {{recipient}}
**Purpose**: {{purpose}}
**Tone**: {{tone}}
**Key Points**: {{key_points}}

**Additional Context**: {{context}}

Please ensure the email is:
- Professional and appropriate for the context
- Clear and concise
- Properly structured with greeting, body, and closing
- Action-oriented if applicable
- Polite and respectful`,
    tags: ['email', 'communication', 'professional', 'business'],
    category: 'writing',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: false,
    isTemplate: true,
    variables: [
      {
        name: 'email_type',
        type: 'select',
        description: 'Type of email',
        required: true,
        options: ['Request', 'Follow-up', 'Inquiry', 'Proposal', 'Thank you', 'Apology', 'Invitation', 'Announcement']
      },
      {
        name: 'recipient',
        type: 'text',
        description: 'Email recipient (name/role)',
        required: true
      },
      {
        name: 'purpose',
        type: 'text',
        description: 'Main purpose of the email',
        required: true
      },
      {
        name: 'tone',
        type: 'select',
        description: 'Email tone',
        required: true,
        options: ['Formal', 'Semi-formal', 'Friendly', 'Urgent', 'Apologetic'],
        defaultValue: 'Semi-formal'
      },
      {
        name: 'key_points',
        type: 'textarea',
        description: 'Key points to include',
        required: true
      },
      {
        name: 'context',
        type: 'textarea',
        description: 'Additional context or background',
        required: false
      }
    ]
  },
  {
    id: 'simple-explain',
    title: 'Simple Explanation Generator',
    description: 'Explain complex topics in simple terms',
    content: `Please explain {{topic}} in simple terms for {{audience_level}}.

Requirements:
- Use clear, everyday language
- Avoid jargon and technical terms (or explain them when necessary)
- Include relevant examples and analogies
- Structure the explanation logically
- Keep it engaging and easy to understand

Focus on making it accessible to someone with {{prior_knowledge}} knowledge of the subject.`,
    tags: ['explanation', 'education', 'simple', 'learning'],
    category: 'general',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    usageCount: 0,
    isFavorite: true,
    isTemplate: true,
    variables: [
      {
        name: 'topic',
        type: 'text',
        description: 'Topic to explain',
        required: true
      },
      {
        name: 'audience_level',
        type: 'select',
        description: 'Audience level',
        required: true,
        options: ['Elementary student', 'Middle school student', 'High school student', 'College student', 'Adult learner'],
        defaultValue: 'Adult learner'
      },
      {
        name: 'prior_knowledge',
        type: 'select',
        description: 'Assumed prior knowledge',
        required: true,
        options: ['No prior knowledge', 'Basic understanding', 'Some background', 'Intermediate knowledge'],
        defaultValue: 'Basic understanding'
      }
    ]
  }
];

export function initializeDefaultPrompts() {
  return defaultPrompts;
}