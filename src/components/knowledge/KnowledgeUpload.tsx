import React, { useState, useCallback } from 'react';
import { Upload, FileText, Globe, Database, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeSource } from '@/types';
import { DocumentProcessingService } from '@/services/DocumentProcessingService';
import { KnowledgeService } from '@/services/KnowledgeService';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useKnowledgeStore } from '@/stores/useKnowledgeStore';

interface ProcessingStatus {
  file: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  chunks: number;
  error?: string;
}

interface KnowledgeUploadProps {
  stackId: string;
  onComplete?: (sources: KnowledgeSource[]) => void;
  className?: string;
}

export const KnowledgeUpload: React.FC<KnowledgeUploadProps> = ({
  stackId,
  onComplete,
  className = ''
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const settings = useSettingsStore(state => state.settings);
  const { indexKnowledgeSource } = useKnowledgeStore();

  const documentService = new DocumentProcessingService();
  const knowledgeService = new KnowledgeService(settings);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      documentService.isFileTypeSupported(file)
    );
    
    setFiles(prev => [...prev, ...droppedFiles]);
  }, [documentService]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file =>
        documentService.isFileTypeSupported(file)
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, [documentService]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = useCallback(async () => {
    if (files.length === 0 && !url.trim()) return;

    setProcessing(true);
    setProcessingStatus([]);

    try {
      const sourcesToProcess: { file?: File; url?: string; name: string }[] = [];

      // Add files
      files.forEach(file => {
        sourcesToProcess.push({ file, name: file.name });
      });

      // Add URL
      if (url.trim()) {
        sourcesToProcess.push({ url: url.trim(), name: new URL(url.trim()).hostname });
      }

      const createdSources: KnowledgeSource[] = [];

      for (const source of sourcesToProcess) {
        const fileName = source.name;
        
        setProcessingStatus(prev => [...prev, {
          file: fileName,
          status: 'processing',
          progress: 0,
          chunks: 0
        }]);

        try {
          let processingResult;
          
          if (source.file) {
            processingResult = await documentService.processDocument(
              source.file,
              `${stackId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            );
          } else if (source.url) {
            processingResult = await documentService.processUrl(
              source.url,
              `${stackId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            );
          } else {
            continue;
          }

          // Update progress
          setProcessingStatus(prev => prev.map(item =>
            item.file === fileName
              ? { ...item, progress: 50, chunks: processingResult.totalChunks }
              : item
          ));

          // Create knowledge source
          const knowledgeSource: KnowledgeSource = {
            id: processingResult.chunks[0]?.sourceId || Math.random().toString(36),
            name: fileName,
            type: source.url ? 'url' : 'file',
            path: source.url || source.file?.name || '',
            stackId,
            status: 'indexing',
            size: source.file?.size || 0,
            chunkCount: processingResult.totalChunks,
            metadata: {
              processingTime: processingResult.processingTime,
              totalTokens: processingResult.totalTokens,
              fileType: source.file?.type || 'text/html'
            }
          };

          // Index the knowledge source
          const indexResult = await knowledgeService.indexKnowledgeSource(
            knowledgeSource,
            stackId,
            { forceReindex: false }
          );

          if (indexResult.success) {
            knowledgeSource.status = 'ready';
            knowledgeSource.indexedAt = new Date();
            createdSources.push(knowledgeSource);

            // Add to store
            await indexKnowledgeSource(knowledgeSource);

            setProcessingStatus(prev => prev.map(item =>
              item.file === fileName
                ? { ...item, status: 'completed', progress: 100 }
                : item
            ));
          } else {
            throw new Error(indexResult.error || 'Indexing failed');
          }

        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          setProcessingStatus(prev => prev.map(item =>
            item.file === fileName
              ? {
                  ...item,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Processing failed'
                }
              : item
          ));
        }
      }

      // Clear inputs on success
      setFiles([]);
      setUrl('');

      if (onComplete && createdSources.length > 0) {
        onComplete(createdSources);
      }

    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setProcessing(false);
    }
  }, [files, url, stackId, documentService, knowledgeService, indexKnowledgeSource, onComplete]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Files</span>
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>URL</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload Documents</span>
              </CardTitle>
              <CardDescription>
                Upload text files, HTML, JSON, or Markdown files to add to your knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${dragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }
                `}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Drop files here or click to upload
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Supported: TXT, MD, JSON, HTML files
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".txt,.md,.json,.html,.htm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Selected Files ({files.length})
                  </h4>
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={processing}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Add Web Content</span>
              </CardTitle>
              <CardDescription>
                Add content from web pages to your knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={processing}
                />
                {url && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {url}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Web content will be extracted and indexed
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Processing Status */}
      {processingStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Processing Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {processingStatus.map((status, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {status.status === 'processing' && (
                      <Loader className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {status.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {status.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{status.file}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status.chunks > 0 && (
                      <Badge variant="secondary">{status.chunks} chunks</Badge>
                    )}
                    <Badge 
                      variant={
                        status.status === 'completed' ? 'default' :
                        status.status === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {status.status}
                    </Badge>
                  </div>
                </div>
                {status.status === 'processing' && (
                  <Progress value={status.progress} className="w-full" />
                )}
                {status.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {status.error}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      <div className="flex justify-end">
        <Button
          onClick={processFiles}
          disabled={processing || (files.length === 0 && !url.trim())}
          className="flex items-center space-x-2"
        >
          {processing ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>
            {processing ? 'Processing...' : 'Add to Knowledge Base'}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default KnowledgeUpload;