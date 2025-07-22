import React, { useCallback, useState, useRef } from 'react';
import { Upload, Image, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { MediaAttachment } from '@/types';

interface MediaUploadProps {
  onUpload: (attachments: MediaAttachment[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

const defaultAcceptedTypes = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onUpload,
  maxFiles = 5,
  maxSize = 10,
  acceptedTypes = defaultAcceptedTypes,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        setError(`File type ${file.type} not supported`);
        return false;
      }
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File ${file.name} is too large (max ${maxSize}MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    if (validFiles.length > maxFiles) {
      setError(`Too many files selected (max ${maxFiles})`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const attachments: MediaAttachment[] = await Promise.all(
        validFiles.map(async (file, index) => {
          // Simulate upload progress
          setUploadProgress(((index + 1) / validFiles.length) * 100);

          const attachment: MediaAttachment = {
            id: Math.random().toString(36).substr(2, 9),
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            size: file.size,
            mimeType: file.type,
            processingStatus: 'processing'
          };

          // Convert to base64 for images
          if (file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            attachment.base64Data = base64;
            
            // Get image dimensions
            const dimensions = await getImageDimensions(file);
            attachment.dimensions = dimensions;
          } else {
            // For non-images, extract text if possible
            const text = await extractTextFromFile(file);
            attachment.extractedText = text;
          }

          attachment.processingStatus = 'ready';
          return attachment;
        })
      );

      onUpload(attachments);
    } catch (err) {
      setError('Failed to process files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [acceptedTypes, maxFiles, maxSize, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center space-y-2">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Processing files...
              </p>
              <Progress value={uploadProgress} className="w-full max-w-xs" />
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Images, PDFs, docs up to {maxSize}MB ({maxFiles} files max)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Utility functions
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const extractTextFromFile = async (file: File): Promise<string> => {
  // Simple text extraction for PDFs and text files
  if (file.type === 'text/plain') {
    return await file.text();
  }
  
  // Basic PDF text extraction (client-side)
  if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractPDFText(arrayBuffer);
      return text || `[PDF: ${file.name} - Text extraction not available]`;
    } catch (error) {
      return `[PDF: ${file.name} - Error extracting text]`;
    }
  }
  
  // For Word documents, return metadata
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return `[Word Document: ${file.name} - ${formatFileSize(file.size)}]`;
  }
  
  // For Excel files, return metadata
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return `[Excel File: ${file.name} - ${formatFileSize(file.size)}]`;
  }
  
  // For other file types, return filename and metadata
  return `[File: ${file.name} - ${formatFileSize(file.size)}]`;
};

// Basic PDF text extraction using PDF.js would go here
// For now, we'll use a placeholder
const extractPDFText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  // This would require PDF.js integration
  // For now, return a placeholder indicating PDF content is available
  return '[PDF content available for analysis]';
};

// File size formatting utility
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default MediaUpload;