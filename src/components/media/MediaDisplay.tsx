import React, { useState } from 'react';
import { X, Download, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MediaAttachment } from '@/types';

interface MediaDisplayProps {
  attachments: MediaAttachment[];
  onRemove?: (attachmentId: string) => void;
  readonly?: boolean;
  compact?: boolean;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  attachments,
  onRemove,
  readonly = false,
  compact = false
}) => {
  const [previewImage, setPreviewImage] = useState<MediaAttachment | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAttachment = (attachment: MediaAttachment) => {
    if (attachment.base64Data) {
      const link = document.createElement('a');
      link.href = attachment.base64Data;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderAttachment = (attachment: MediaAttachment) => {
    const isImage = attachment.type === 'image';
    
    if (compact) {
      return (
        <div
          key={attachment.id}
          className="inline-flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-xs"
        >
          {isImage ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          <span className="truncate max-w-20">{attachment.name}</span>
          {!readonly && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(attachment.id)}
              className="h-4 w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900"
            >
              <X className="h-2 w-2" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div
        key={attachment.id}
        className="relative group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        {isImage && attachment.base64Data ? (
          <div className="relative">
            <img
              src={attachment.base64Data}
              alt={attachment.name}
              className="w-full h-32 object-cover cursor-pointer"
              onClick={() => setPreviewImage(attachment)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setPreviewImage(attachment)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        <div className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {attachment.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(attachment.size)}
                {attachment.dimensions && (
                  <span> • {attachment.dimensions.width}x{attachment.dimensions.height}</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadAttachment(attachment)}
                className="h-6 w-6 p-0"
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
              
              {!readonly && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(attachment.id)}
                  className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {attachment.processingStatus === 'processing' && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                <span className="text-xs text-gray-500">Processing...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (attachments.length === 0) return null;

  return (
    <>
      <div className={`
        ${compact 
          ? 'flex flex-wrap gap-1 mt-1' 
          : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3'
        }
      `}>
        {attachments.map(renderAttachment)}
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          {previewImage && (
            <>
              <DialogHeader>
                <DialogTitle>{previewImage.name}</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={previewImage.base64Data}
                  alt={previewImage.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="flex justify-center space-x-2 mt-4">
                <Button onClick={() => downloadAttachment(previewImage)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => setPreviewImage(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaDisplay;