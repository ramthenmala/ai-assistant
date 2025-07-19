// Search service for full-text search across conversations with advanced filtering

import type { Chat, Message } from '@/types';

export interface SearchFilters {
  query?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  models?: string[];
  roles?: ('user' | 'assistant')[];
  tags?: string[];
  isBookmarked?: boolean;
  isEdited?: boolean;
  chatIds?: string[];
  minLength?: number;
  maxLength?: number;
}

export interface SearchResult {
  message: Message;
  chat: Chat;
  highlights: SearchHighlight[];
  relevanceScore: number;
  matchType: 'content' | 'metadata' | 'title';
}

export interface SearchHighlight {
  text: string;
  isHighlighted: boolean;
  start: number;
  end: number;
}

export interface SearchOptions {
  maxResults?: number;
  fuzzySearch?: boolean;
  caseSensitive?: boolean;
  wholeWords?: boolean;
  includeMetadata?: boolean;
  sortBy?: 'relevance' | 'date' | 'length';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchStats {
  totalResults: number;
  searchTime: number;
  queryTokens: string[];
  resultsByChat: Record<string, number>;
  resultsByModel: Record<string, number>;
  resultsByRole: Record<string, number>;
}

export class SearchService {
  private static searchIndex: Map<string, SearchIndexEntry> = new Map();
  private static indexVersion: number = 0;

  // Build search index for fast lookups
  static buildIndex(chats: Chat[]): void {
    const startTime = performance.now();
    this.searchIndex.clear();
    
    for (const chat of chats) {
      // Index chat title
      this.addToIndex(chat.id, 'title', chat.title, {
        chatId: chat.id,
        messageId: null,
        type: 'title',
        timestamp: chat.createdAt
      });

      // Index all messages
      for (const message of chat.messages) {
        this.addToIndex(
          `${chat.id}-${message.id}`,
          'content',
          message.content,
          {
            chatId: chat.id,
            messageId: message.id,
            type: 'message',
            timestamp: message.timestamp,
            role: message.role,
            isBookmarked: message.isBookmarked,
            isEdited: message.isEdited
          }
        );

        // Index message versions if they exist
        if (message.versions) {
          for (const version of message.versions) {
            this.addToIndex(
              `${chat.id}-${message.id}-${version.id}`,
              'version',
              version.content,
              {
                chatId: chat.id,
                messageId: message.id,
                versionId: version.id,
                type: 'version',
                timestamp: version.timestamp,
                role: message.role
              }
            );
          }
        }
      }
    }

    this.indexVersion++;
    const endTime = performance.now();
    console.log(`Search index built in ${endTime - startTime}ms with ${this.searchIndex.size} entries`);
  }

  // Add entry to search index
  private static addToIndex(
    id: string,
    field: string,
    content: string,
    metadata: SearchIndexMetadata
  ): void {
    const tokens = this.tokenize(content);
    const entry: SearchIndexEntry = {
      id,
      field,
      content,
      tokens,
      metadata,
      wordCount: tokens.length,
      charCount: content.length
    };

    this.searchIndex.set(id, entry);
  }

  // Tokenize text for search
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  // Main search function
  static async search(
    chats: Chat[],
    filters: SearchFilters,
    options: SearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    stats: SearchStats;
  }> {
    const startTime = performance.now();
    const {
      maxResults = 100,
      fuzzySearch = false,
      caseSensitive = false,
      wholeWords = false,
      includeMetadata = true,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;

    // Build or rebuild index if needed
    if (this.searchIndex.size === 0) {
      this.buildIndex(chats);
    }

    const results: SearchResult[] = [];
    const chatMap = new Map(chats.map(chat => [chat.id, chat]));
    const queryTokens = filters.query ? this.tokenize(filters.query) : [];

    // Search through index
    for (const [id, entry] of this.searchIndex) {
      const chat = chatMap.get(entry.metadata.chatId);
      if (!chat) continue;

      // Apply filters
      if (!this.matchesFilters(entry, filters, chat)) continue;

      // Calculate relevance score
      const relevanceScore = this.calculateRelevance(entry, queryTokens, options);
      if (relevanceScore === 0 && filters.query) continue;

      // Find the message
      let message: Message | undefined;
      if (entry.metadata.type === 'message') {
        message = chat.messages.find(m => m.id === entry.metadata.messageId);
      } else if (entry.metadata.type === 'version') {
        const parentMessage = chat.messages.find(m => m.id === entry.metadata.messageId);
        if (parentMessage?.versions) {
          const version = parentMessage.versions.find(v => v.id === entry.metadata.versionId);
          if (version) {
            // Create a pseudo-message for version search results
            message = {
              ...parentMessage,
              content: version.content,
              timestamp: version.timestamp,
              id: `${parentMessage.id}-${version.id}`
            };
          }
        }
      }

      if (!message && entry.metadata.type !== 'title') continue;

      // Generate highlights
      const highlights = this.generateHighlights(entry.content, queryTokens, options);

      results.push({
        message: message || {} as Message,
        chat,
        highlights,
        relevanceScore,
        matchType: entry.metadata.type as 'content' | 'metadata' | 'title'
      });
    }

    // Sort results
    this.sortResults(results, sortBy, sortOrder);

    // Limit results
    const limitedResults = results.slice(0, maxResults);

    // Calculate stats
    const endTime = performance.now();
    const stats: SearchStats = {
      totalResults: results.length,
      searchTime: endTime - startTime,
      queryTokens,
      resultsByChat: this.calculateChatStats(limitedResults),
      resultsByModel: this.calculateModelStats(limitedResults),
      resultsByRole: this.calculateRoleStats(limitedResults)
    };

    return { results: limitedResults, stats };
  }

  // Check if entry matches filters
  private static matchesFilters(
    entry: SearchIndexEntry,
    filters: SearchFilters,
    chat: Chat
  ): boolean {
    // Date range filter
    if (filters.dateRange) {
      const timestamp = entry.metadata.timestamp;
      if (filters.dateRange.start && timestamp < filters.dateRange.start) return false;
      if (filters.dateRange.end && timestamp > filters.dateRange.end) return false;
    }

    // Role filter
    if (filters.roles && filters.roles.length > 0) {
      if (!entry.metadata.role || !filters.roles.includes(entry.metadata.role)) {
        return false;
      }
    }

    // Bookmark filter
    if (filters.isBookmarked !== undefined) {
      if (entry.metadata.isBookmarked !== filters.isBookmarked) return false;
    }

    // Edited filter
    if (filters.isEdited !== undefined) {
      if (entry.metadata.isEdited !== filters.isEdited) return false;
    }

    // Chat IDs filter
    if (filters.chatIds && filters.chatIds.length > 0) {
      if (!filters.chatIds.includes(entry.metadata.chatId)) return false;
    }

    // Length filters
    if (filters.minLength !== undefined && entry.charCount < filters.minLength) return false;
    if (filters.maxLength !== undefined && entry.charCount > filters.maxLength) return false;

    // Model filter (check chat metadata)
    if (filters.models && filters.models.length > 0) {
      const chatModel = chat.metadata?.model || 'unknown';
      if (!filters.models.includes(chatModel)) return false;
    }

    // Tags filter (check chat metadata)
    if (filters.tags && filters.tags.length > 0) {
      const chatTags = chat.metadata?.tags || [];
      if (!filters.tags.some(tag => chatTags.includes(tag))) return false;
    }

    return true;
  }

  // Calculate relevance score
  private static calculateRelevance(
    entry: SearchIndexEntry,
    queryTokens: string[],
    options: SearchOptions
  ): number {
    if (queryTokens.length === 0) return 1; // No query means all results are relevant

    let score = 0;
    const { fuzzySearch = false, wholeWords = false } = options;

    // Exact phrase matching (highest score)
    const fullQuery = queryTokens.join(' ');
    if (entry.content.toLowerCase().includes(fullQuery)) {
      score += 100;
    }

    // Individual token matching
    for (const token of queryTokens) {
      if (wholeWords) {
        // Word boundary matching
        const regex = new RegExp(`\\b${token}\\b`, 'i');
        if (regex.test(entry.content)) {
          score += 10;
        }
      } else {
        // Substring matching
        if (entry.tokens.some(entryToken => entryToken.includes(token))) {
          score += 5;
        }
      }

      // Fuzzy matching (lower score)
      if (fuzzySearch) {
        const fuzzyMatches = entry.tokens.filter(entryToken => 
          this.fuzzyMatch(entryToken, token, 0.8)
        );
        score += fuzzyMatches.length * 2;
      }
    }

    // Boost score based on field type
    switch (entry.metadata.type) {
      case 'title':
        score *= 2;
        break;
      case 'message':
        score *= 1;
        break;
      case 'version':
        score *= 0.8;
        break;
    }

    // Boost bookmarked messages
    if (entry.metadata.isBookmarked) {
      score *= 1.2;
    }

    // Penalize very long messages (they might be less relevant)
    if (entry.charCount > 2000) {
      score *= 0.9;
    }

    return score;
  }

  // Generate search highlights
  private static generateHighlights(
    content: string,
    queryTokens: string[],
    options: SearchOptions
  ): SearchHighlight[] {
    if (queryTokens.length === 0) {
      return [{ text: content, isHighlighted: false, start: 0, end: content.length }];
    }

    const highlights: SearchHighlight[] = [];
    const { wholeWords = false, caseSensitive = false } = options;
    let lastIndex = 0;

    // Find all matches
    const matches: { start: number; end: number; token: string }[] = [];
    
    for (const token of queryTokens) {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = wholeWords ? `\\b${token}\\b` : token;
      const regex = new RegExp(pattern, flags);
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          token: match[0]
        });
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Merge overlapping matches and create highlights
    const mergedMatches: { start: number; end: number }[] = [];
    for (const match of matches) {
      const last = mergedMatches[mergedMatches.length - 1];
      if (last && match.start <= last.end) {
        last.end = Math.max(last.end, match.end);
      } else {
        mergedMatches.push({ start: match.start, end: match.end });
      }
    }

    // Create highlight segments
    for (const match of mergedMatches) {
      // Add text before highlight
      if (match.start > lastIndex) {
        highlights.push({
          text: content.slice(lastIndex, match.start),
          isHighlighted: false,
          start: lastIndex,
          end: match.start
        });
      }

      // Add highlighted text
      highlights.push({
        text: content.slice(match.start, match.end),
        isHighlighted: true,
        start: match.start,
        end: match.end
      });

      lastIndex = match.end;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      highlights.push({
        text: content.slice(lastIndex),
        isHighlighted: false,
        start: lastIndex,
        end: content.length
      });
    }

    return highlights;
  }

  // Fuzzy string matching
  private static fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return true;
    
    const similarity = (longer.length - this.levenshteinDistance(str1, str2)) / longer.length;
    return similarity >= threshold;
  }

  // Calculate Levenshtein distance
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Sort search results
  private static sortResults(
    results: SearchResult[],
    sortBy: 'relevance' | 'date' | 'length',
    sortOrder: 'asc' | 'desc'
  ): void {
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'date':
          comparison = a.message.timestamp.getTime() - b.message.timestamp.getTime();
          break;
        case 'length':
          comparison = a.message.content.length - b.message.content.length;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // Calculate statistics
  private static calculateChatStats(results: SearchResult[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const result of results) {
      stats[result.chat.id] = (stats[result.chat.id] || 0) + 1;
    }
    return stats;
  }

  private static calculateModelStats(results: SearchResult[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const result of results) {
      const model = result.chat.metadata?.model || 'unknown';
      stats[model] = (stats[model] || 0) + 1;
    }
    return stats;
  }

  private static calculateRoleStats(results: SearchResult[]): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const result of results) {
      const role = result.message.role;
      stats[role] = (stats[role] || 0) + 1;
    }
    return stats;
  }

  // Get search suggestions
  static getSearchSuggestions(
    chats: Chat[],
    query: string,
    maxSuggestions = 5
  ): string[] {
    const suggestions: Set<string> = new Set();
    const queryLower = query.toLowerCase();

    // Build index if needed
    if (this.searchIndex.size === 0) {
      this.buildIndex(chats);
    }

    // Find matching words from index
    for (const [, entry] of this.searchIndex) {
      for (const token of entry.tokens) {
        if (token.startsWith(queryLower) && token !== queryLower) {
          suggestions.add(token);
          if (suggestions.size >= maxSuggestions) break;
        }
      }
      if (suggestions.size >= maxSuggestions) break;
    }

    return Array.from(suggestions);
  }

  // Clear search index
  static clearIndex(): void {
    this.searchIndex.clear();
    this.indexVersion = 0;
  }

  // Get index statistics
  static getIndexStats(): {
    size: number;
    version: number;
    memory: number;
  } {
    const memory = JSON.stringify(Array.from(this.searchIndex.entries())).length;
    return {
      size: this.searchIndex.size,
      version: this.indexVersion,
      memory
    };
  }
}

// Search index types
interface SearchIndexEntry {
  id: string;
  field: string;
  content: string;
  tokens: string[];
  metadata: SearchIndexMetadata;
  wordCount: number;
  charCount: number;
}

interface SearchIndexMetadata {
  chatId: string;
  messageId: string | null;
  versionId?: string;
  type: 'title' | 'message' | 'version';
  timestamp: Date;
  role?: 'user' | 'assistant';
  isBookmarked?: boolean;
  isEdited?: boolean;
}