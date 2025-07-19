// Export Service for conversation data in multiple formats

import type { Message, Chat } from '@/types';

export type ExportFormat = 'json' | 'markdown' | 'pdf' | 'csv' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeVersions?: boolean;
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  data?: string | Blob;
  error?: string;
}

export class ExportService {
  // Export a single conversation
  static async exportConversation(
    chat: Chat,
    messages: Message[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const filename = options.filename || this.generateFilename(chat, options.format);
      
      switch (options.format) {
        case 'json':
          return this.exportAsJSON(chat, messages, options, filename);
        case 'markdown':
          return this.exportAsMarkdown(chat, messages, options, filename);
        case 'pdf':
          return this.exportAsPDF(chat, messages, options, filename);
        case 'csv':
          return this.exportAsCSV(chat, messages, options, filename);
        case 'txt':
          return this.exportAsText(chat, messages, options, filename);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  // Export multiple conversations
  static async exportMultipleConversations(
    conversations: Array<{ chat: Chat; messages: Message[] }>,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const filename = options.filename || `conversations_${this.formatDate(new Date())}.${options.format}`;
      
      switch (options.format) {
        case 'json':
          return this.exportMultipleAsJSON(conversations, options, filename);
        case 'markdown':
          return this.exportMultipleAsMarkdown(conversations, options, filename);
        default:
          throw new Error(`Batch export not supported for format: ${options.format}`);
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Batch export failed',
      };
    }
  }

  // JSON Export
  private static exportAsJSON(
    chat: Chat,
    messages: Message[],
    options: ExportOptions,
    filename: string
  ): ExportResult {
    const exportData = {
      chat: {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        ...(options.includeMetadata && {
          folderId: chat.folderId,
          activeKnowledgeStacks: chat.activeKnowledgeStacks,
          metadata: chat.metadata,
        }),
      },
      messages: messages.map(message => ({
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        ...(options.includeMetadata && {
          isEdited: message.isEdited,
          metadata: message.metadata,
        }),
        ...(options.includeVersions && message.versions && {
          versions: message.versions,
        }),
      })),
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
        options,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    this.downloadBlob(blob, filename);
    
    return {
      success: true,
      filename,
      data: blob,
    };
  }

  // Markdown Export
  private static exportAsMarkdown(
    chat: Chat,
    messages: Message[],
    options: ExportOptions,
    filename: string
  ): ExportResult {
    let markdown = `# ${chat.title}\n\n`;
    
    if (options.includeMetadata) {
      markdown += `**Chat ID:** ${chat.id}\n`;
      markdown += `**Created:** ${this.formatDate(chat.createdAt)}\n`;
      markdown += `**Updated:** ${this.formatDate(chat.updatedAt)}\n\n`;
    }

    markdown += `---\n\n`;

    for (const message of messages) {
      const roleLabel = message.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
      markdown += `## ${roleLabel}\n\n`;
      
      if (options.includeTimestamps) {
        markdown += `*${this.formatDate(message.timestamp)}*\n\n`;
      }

      markdown += `${message.content}\n\n`;

      if (options.includeVersions && message.versions && message.versions.length > 0) {
        markdown += `<details>\n<summary>Edit History (${message.versions.length} versions)</summary>\n\n`;
        for (const version of message.versions) {
          markdown += `### Version ${version.id}\n`;
          markdown += `*${this.formatDate(version.timestamp)}*\n\n`;
          markdown += `${version.content}\n\n`;
          if (version.editReason) {
            markdown += `**Edit Reason:** ${version.editReason}\n\n`;
          }
        }
        markdown += `</details>\n\n`;
      }

      markdown += `---\n\n`;
    }

    if (options.includeMetadata) {
      markdown += `\n---\n\n`;
      markdown += `*Exported from AI Chat Assistant on ${this.formatDate(new Date())}*\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      data: blob,
    };
  }

  // PDF Export (using HTML to PDF conversion)
  private static async exportAsPDF(
    chat: Chat,
    messages: Message[],
    options: ExportOptions,
    filename: string
  ): Promise<ExportResult> {
    // For now, we'll create an HTML version and let the browser handle PDF conversion
    // In a real implementation, you might use libraries like jsPDF or puppeteer
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${chat.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .message { margin-bottom: 30px; page-break-inside: avoid; }
        .message-header { font-weight: bold; color: #374151; margin-bottom: 10px; }
        .user { color: #2563eb; }
        .assistant { color: #059669; }
        .timestamp { font-size: 0.875rem; color: #6b7280; margin-bottom: 10px; }
        .content { background: #f9fafb; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
        .versions { margin-top: 15px; font-size: 0.875rem; }
        .version { background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.875rem; color: #6b7280; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${chat.title}</h1>
        ${options.includeMetadata ? `
        <p><strong>Chat ID:</strong> ${chat.id}</p>
        <p><strong>Created:</strong> ${this.formatDate(chat.createdAt)}</p>
        <p><strong>Updated:</strong> ${this.formatDate(chat.updatedAt)}</p>
        ` : ''}
    </div>
`;

    for (const message of messages) {
      html += `
    <div class="message">
        <div class="message-header ${message.role}">
            ${message.role === 'user' ? '👤 User' : '🤖 Assistant'}
        </div>
        ${options.includeTimestamps ? `
        <div class="timestamp">${this.formatDate(message.timestamp)}</div>
        ` : ''}
        <div class="content">${this.escapeHtml(message.content)}</div>
        ${options.includeVersions && message.versions && message.versions.length > 0 ? `
        <div class="versions">
            <strong>Edit History (${message.versions.length} versions):</strong>
            ${message.versions.map(version => `
            <div class="version">
                <strong>Version ${version.id}</strong> - ${this.formatDate(version.timestamp)}<br>
                ${version.editReason ? `<em>Reason: ${this.escapeHtml(version.editReason)}</em><br>` : ''}
                ${this.escapeHtml(version.content)}
            </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
`;
    }

    if (options.includeMetadata) {
      html += `
    <div class="footer">
        Exported from AI Chat Assistant on ${this.formatDate(new Date())}
    </div>
`;
    }

    html += `
</body>
</html>
`;

    // Create a new window with the HTML content for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      // Trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 100);
    }

    return {
      success: true,
      filename: filename.replace('.pdf', '.html'), // Browser will handle PDF conversion
      data: html,
    };
  }

  // CSV Export
  private static exportAsCSV(
    chat: Chat,
    messages: Message[],
    options: ExportOptions,
    filename: string
  ): ExportResult {
    const headers = ['Message ID', 'Role', 'Content', 'Timestamp'];
    if (options.includeMetadata) {
      headers.push('Is Edited', 'Metadata');
    }

    let csv = headers.join(',') + '\n';

    for (const message of messages) {
      const row = [
        `"${message.id}"`,
        `"${message.role}"`,
        `"${this.escapeCsv(message.content)}"`,
        `"${message.timestamp.toISOString()}"`,
      ];

      if (options.includeMetadata) {
        row.push(`"${message.isEdited}"`);
        row.push(`"${message.metadata ? JSON.stringify(message.metadata) : ''}"`);
      }

      csv += row.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      data: blob,
    };
  }

  // Text Export
  private static exportAsText(
    chat: Chat,
    messages: Message[],
    options: ExportOptions,
    filename: string
  ): ExportResult {
    let text = `${chat.title}\n${'='.repeat(chat.title.length)}\n\n`;

    if (options.includeMetadata) {
      text += `Chat ID: ${chat.id}\n`;
      text += `Created: ${this.formatDate(chat.createdAt)}\n`;
      text += `Updated: ${this.formatDate(chat.updatedAt)}\n\n`;
    }

    for (const message of messages) {
      text += `${message.role.toUpperCase()}:\n`;
      
      if (options.includeTimestamps) {
        text += `[${this.formatDate(message.timestamp)}]\n`;
      }

      text += `${message.content}\n\n`;
      text += `${'-'.repeat(50)}\n\n`;
    }

    if (options.includeMetadata) {
      text += `\nExported from AI Chat Assistant on ${this.formatDate(new Date())}\n`;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      data: blob,
    };
  }

  // Multiple conversations JSON export
  private static exportMultipleAsJSON(
    conversations: Array<{ chat: Chat; messages: Message[] }>,
    options: ExportOptions,
    filename: string
  ): ExportResult {
    const exportData = {
      conversations: conversations.map(({ chat, messages }) => ({
        chat: {
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          ...(options.includeMetadata && {
            folderId: chat.folderId,
            activeKnowledgeStacks: chat.activeKnowledgeStacks,
            metadata: chat.metadata,
          }),
        },
        messages: messages.map(message => ({
          id: message.id,
          content: message.content,
          role: message.role,
          timestamp: message.timestamp,
          ...(options.includeMetadata && {
            isEdited: message.isEdited,
            metadata: message.metadata,
          }),
          ...(options.includeVersions && message.versions && {
            versions: message.versions,
          }),
        })),
      })),
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
        conversationCount: conversations.length,
        options,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    this.downloadBlob(blob, filename);
    
    return {
      success: true,
      filename,
      data: blob,
    };
  }

  // Multiple conversations Markdown export
  private static exportMultipleAsMarkdown(
    conversations: Array<{ chat: Chat; messages: Message[] }>,
    options: ExportOptions,
    filename: string
  ): ExportResult {
    let markdown = `# AI Chat Assistant Conversations\n\n`;
    markdown += `*Exported on ${this.formatDate(new Date())}*\n\n`;
    markdown += `**Total Conversations:** ${conversations.length}\n\n`;
    markdown += `---\n\n`;

    for (let i = 0; i < conversations.length; i++) {
      const { chat, messages } = conversations[i];
      
      markdown += `# ${i + 1}. ${chat.title}\n\n`;
      
      if (options.includeMetadata) {
        markdown += `**Chat ID:** ${chat.id}\n`;
        markdown += `**Created:** ${this.formatDate(chat.createdAt)}\n`;
        markdown += `**Updated:** ${this.formatDate(chat.updatedAt)}\n\n`;
      }

      for (const message of messages) {
        const roleLabel = message.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
        markdown += `## ${roleLabel}\n\n`;
        
        if (options.includeTimestamps) {
          markdown += `*${this.formatDate(message.timestamp)}*\n\n`;
        }

        markdown += `${message.content}\n\n`;
        markdown += `---\n\n`;
      }

      if (i < conversations.length - 1) {
        markdown += `\n${'='.repeat(80)}\n\n`;
      }
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    this.downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      data: blob,
    };
  }

  // Utility methods
  private static generateFilename(chat: Chat, format: ExportFormat): string {
    const safeTitle = chat.title.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 50);
    const timestamp = this.formatDate(new Date(), true);
    return `${safeTitle}_${timestamp}.${format}`;
  }

  private static formatDate(date: Date, forFilename = false): string {
    if (forFilename) {
      return date.toISOString().slice(0, 19).replace(/[:-]/g, '');
    }
    return date.toLocaleString();
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private static escapeCsv(text: string): string {
    return text.replace(/"/g, '""');
  }
}