import type { DocumentChunk } from '../DocumentProcessingService';
import type { ParsedResume } from '@/types/ats';

export interface ResumeProcessingOptions {
  extractStructuredData: boolean;
  performOCR: boolean;
  extractKeywords: boolean;
  chunkSize?: number;
}

export class ATSDocumentProcessor {
  // PDF.js will be loaded dynamically
  private pdfjs: any;
  
  constructor() {
    this.initializePdfJs();
  }

  private async initializePdfJs() {
    // Dynamically import PDF.js to avoid build issues
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      this.pdfjs = pdfjsLib;
    } catch (error) {
      console.warn('PDF.js not available, PDF processing will be limited');
    }
  }

  async processResume(
    file: File,
    options: Partial<ResumeProcessingOptions> = {}
  ): Promise<{ text: string; chunks: DocumentChunk[] }> {
    const defaultOptions: ResumeProcessingOptions = {
      extractStructuredData: true,
      performOCR: false,
      extractKeywords: true,
      chunkSize: 2000, // Larger chunks for resumes
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    // Extract text based on file type
    const text = await this.extractResumeText(file);
    
    // Create simple chunks for the resume text
    const chunks = this.createSimpleChunks(text, file.name, finalOptions.chunkSize!);

    return { text, chunks };
  }

  private async extractResumeText(file: File): Promise<string> {
    const fileType = file.type || this.getFileTypeFromName(file.name);
    const fileName = file.name.toLowerCase();

    // Handle DOCX files
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')) {
      return await this.extractDocxText(file);
    }

    // Handle DOC files (legacy Word)
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      return await this.extractDocText(file);
    }

    // Handle PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await this.extractEnhancedPdfText(file);
    }

    // Handle RTF files
    if (fileType === 'application/rtf' || fileName.endsWith('.rtf')) {
      return await this.extractRtfText(file);
    }

    // Fall back to basic text extraction for other file types
    return await this.extractTextFile(file);
  }

  private async extractDocxText(file: File): Promise<string> {
    try {
      // Use mammoth.js for DOCX extraction
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.warn('DOCX extraction warnings:', result.messages);
      }
      
      return result.value;
    } catch (error) {
      console.error('Failed to extract DOCX text:', error);
      throw new Error('Failed to process DOCX file. Please ensure the file is not corrupted.');
    }
  }

  private async extractDocText(file: File): Promise<string> {
    // For legacy .doc files, we'll need a more complex solution
    // For now, throw an informative error
    throw new Error(
      'Legacy .doc files are not yet supported. Please save the document as .docx format.'
    );
  }

  private async extractEnhancedPdfText(file: File): Promise<string> {
    if (!this.pdfjs) {
      throw new Error('PDF processing is not available. Please try another file format.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await this.pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Reconstruct text with proper spacing
        const pageText = textContent.items
          .map((item: any) => {
            // Add space after items that likely end a word
            if (item.str && item.hasEOL) {
              return item.str + '\n';
            }
            return item.str;
          })
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Failed to extract PDF text:', error);
      throw new Error('Failed to process PDF file. The file may be corrupted or password-protected.');
    }
  }

  private async extractRtfText(file: File): Promise<string> {
    // For RTF files, we'll need to implement or use an RTF parser
    // For now, we'll do basic extraction
    const text = await this.extractTextFile(file);
    
    // Remove RTF control codes (basic implementation)
    return text
      .replace(/\\[a-z]+\d*\s?/gi, '') // Remove control words
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\\\'/g, "'") // Handle escaped quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Enhanced method to extract keywords from resume
  extractKeywords(text: string): string[] {
    const keywords: Set<string> = new Set();
    
    // Common technical skills patterns
    const techPatterns = [
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|Swift|Kotlin|PHP|React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET|AWS|Azure|GCP|Docker|Kubernetes|Git|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|GraphQL|REST|API|CI\/CD|DevOps|Agile|Scrum)\b/gi,
      /\b(HTML5?|CSS3?|SASS|LESS|Bootstrap|Tailwind|Material.UI|Webpack|Babel|npm|yarn|pip|Maven|Gradle)\b/gi,
      /\b(Machine Learning|Deep Learning|AI|NLP|Computer Vision|TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy)\b/gi,
    ];

    // Soft skills patterns
    const softSkillsPatterns = [
      /\b(leadership|communication|teamwork|problem-solving|analytical|creative|organized|detail-oriented|self-motivated|collaborative)\b/gi,
    ];

    // Extract technical skills
    techPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => keywords.add(match.toLowerCase()));
      }
    });

    // Extract soft skills
    softSkillsPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => keywords.add(match.toLowerCase()));
      }
    });

    // Extract years of experience mentions
    const expPattern = /(\d+)\+?\s*years?\s*(of\s*)?(experience|working|developing)/gi;
    const expMatches = text.match(expPattern);
    if (expMatches) {
      expMatches.forEach(match => keywords.add(match.toLowerCase()));
    }

    // Extract education degrees
    const degreePattern = /\b(Bachelor'?s?|Master'?s?|PhD|Ph\.D|MBA|B\.S\.?|M\.S\.?|B\.A\.?|M\.A\.?|Associate'?s?)\b/gi;
    const degreeMatches = text.match(degreePattern);
    if (degreeMatches) {
      degreeMatches.forEach(match => keywords.add(match.toLowerCase()));
    }

    return Array.from(keywords);
  }

  private getFileTypeFromName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'html': 'text/html',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'rtf': 'application/rtf',
    };

    return mimeTypes[extension || ''] || 'text/plain';
  }

  private async extractTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        resolve(text || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private createSimpleChunks(text: string, fileName: string, chunkSize: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startIndex = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        // Create chunk
        chunks.push({
          id: `chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          sourceId: fileName,
          chunkIndex,
          startIndex,
          endIndex: startIndex + currentChunk.length,
          metadata: {
            fileName,
            fileType: 'resume',
            size: currentChunk.length,
            chunkSize,
            overlap: 0,
            timestamp: new Date(),
          },
        });
        
        startIndex += currentChunk.length;
        chunkIndex++;
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        sourceId: fileName,
        chunkIndex,
        startIndex,
        endIndex: startIndex + currentChunk.length,
        metadata: {
          fileName,
          fileType: 'resume',
          size: currentChunk.length,
          chunkSize,
          overlap: 0,
          timestamp: new Date(),
        },
      });
    }
    
    return chunks;
  }
}