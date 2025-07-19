// Search modal component with comprehensive search functionality

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import { SearchService, type SearchFilters, type SearchResult, type SearchStats } from '@/services/SearchService';
import { useChatStore } from '@/stores/useChatStore';
import { useToastActions } from '@/components/ui/toast';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultSelect?: (result: SearchResult) => void;
  onChatOpen?: (chatId: string) => void;
  initialQuery?: string;
  initialFilters?: SearchFilters;
}

export function SearchModal({
  isOpen,
  onClose,
  onResultSelect,
  onChatOpen,
  initialQuery = '',
  initialFilters = {}
}: SearchModalProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStats, setSearchStats] = useState<SearchStats>({
    totalResults: 0,
    searchTime: 0,
    queryTokens: [],
    resultsByChat: {},
    resultsByModel: {},
    resultsByRole: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('search');

  const { success, error } = useToastActions();
  const { chats, getAllChats } = useChatStore();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('search-recent-queries');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
      localStorage.setItem('search-recent-queries', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get search suggestions
  const updateSuggestions = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const allChats = getAllChats();
    const suggestions = SearchService.getSearchSuggestions(allChats, query, 5);
    setSuggestions(suggestions);
  }, [getAllChats]);

  // Debounced suggestion update
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSuggestions(initialQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [initialQuery, updateSuggestions]);

  // Perform search
  const handleSearch = useCallback(async (query: string, filters: SearchFilters) => {
    setIsLoading(true);
    
    try {
      const allChats = getAllChats();
      const { results, stats } = await SearchService.search(allChats, { ...filters, query }, {
        maxResults: 100,
        sortBy: 'relevance',
        sortOrder: 'desc',
        includeMetadata: true
      });

      setSearchResults(results);
      setSearchStats(stats);
      
      if (query.trim()) {
        saveRecentSearch(query);
      }
      
      if (results.length > 0) {
        success(`Found ${results.length} result${results.length !== 1 ? 's' : ''}`);
      } else {
        error('No results found. Try adjusting your search terms or filters.');
      }
    } catch (err) {
      console.error('Search error:', err);
      error('Search failed. Please try again.');
      setSearchResults([]);
      setSearchStats({
        totalResults: 0,
        searchTime: 0,
        queryTokens: [],
        resultsByChat: {},
        resultsByModel: {},
        resultsByRole: {}
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAllChats, saveRecentSearch, success, error]);

  // Clear search results
  const handleClear = useCallback(() => {
    setSearchResults([]);
    setSearchStats({
      totalResults: 0,
      searchTime: 0,
      queryTokens: [],
      resultsByChat: {},
      resultsByModel: {},
      resultsByRole: {}
    });
  }, []);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    onResultSelect?.(result);
    onClose();
  }, [onResultSelect, onClose]);

  // Handle chat opening
  const handleChatOpen = useCallback((chatId: string) => {
    onChatOpen?.(chatId);
    onClose();
  }, [onChatOpen, onClose]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((query: string) => {
    handleSearch(query, initialFilters);
  }, [handleSearch, initialFilters]);

  // Bookmarked messages
  const bookmarkedMessages = useMemo(() => {
    const allChats = getAllChats();
    const bookmarked: SearchResult[] = [];
    
    for (const chat of allChats) {
      for (const message of chat.messages) {
        if (message.isBookmarked) {
          bookmarked.push({
            message,
            chat,
            highlights: [{ text: message.content, isHighlighted: false, start: 0, end: message.content.length }],
            relevanceScore: 0,
            matchType: 'content'
          });
        }
      }
    }
    
    return bookmarked.sort((a, b) => b.message.timestamp.getTime() - a.message.timestamp.getTime());
  }, [getAllChats]);

  // Recent conversations
  const recentConversations = useMemo(() => {
    const allChats = getAllChats();
    return allChats
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 20);
  }, [getAllChats]);

  // Popular searches based on recent activity
  const popularSearches = useMemo(() => {
    const searches = recentSearches.slice(0, 5);
    return searches.map(search => ({
      query: search,
      count: Math.floor(Math.random() * 10) + 1 // Mock popularity for now
    }));
  }, [recentSearches]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Search Conversations
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full max-h-[calc(90vh-80px)]">
          {/* Search bar */}
          <div className="p-6 border-b">
            <SearchBar
              onSearch={handleSearch}
              onClear={handleClear}
              suggestions={suggestions}
              isLoading={isLoading}
              placeholder="Search messages, conversations, or content..."
              initialQuery={initialQuery}
              initialFilters={initialFilters}
              recentSearches={recentSearches}
              onRecentSearchSelect={handleRecentSearchSelect}
            />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
                <TabsTrigger value="search">
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Search Results
                  {searchResults.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {searchResults.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="bookmarks">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Bookmarks
                  {bookmarkedMessages.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {bookmarkedMessages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recent">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="trending">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Trending
                </TabsTrigger>
              </TabsList>

              <div className="overflow-auto p-6 h-full">
                {/* Search results */}
                <TabsContent value="search" className="mt-0">
                  <SearchResults
                    results={searchResults}
                    stats={searchStats}
                    isLoading={isLoading}
                    onResultClick={handleResultSelect}
                    onChatOpen={handleChatOpen}
                  />
                </TabsContent>

                {/* Bookmarked messages */}
                <TabsContent value="bookmarks" className="mt-0">
                  <SearchResults
                    results={bookmarkedMessages}
                    stats={{
                      totalResults: bookmarkedMessages.length,
                      searchTime: 0,
                      queryTokens: [],
                      resultsByChat: {},
                      resultsByModel: {},
                      resultsByRole: {}
                    }}
                    onResultClick={handleResultSelect}
                    onChatOpen={handleChatOpen}
                  />
                </TabsContent>

                {/* Recent conversations */}
                <TabsContent value="recent" className="mt-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recent Conversations</h3>
                    <div className="space-y-2">
                      {recentConversations.map((chat) => (
                        <div
                          key={chat.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => handleChatOpen(chat.id)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{chat.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {chat.messages.length} messages • Updated {chat.updatedAt.toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {chat.messages.length}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Trending/Popular searches */}
                <TabsContent value="trending" className="mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Popular Searches</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {popularSearches.map((search, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                            onClick={() => handleRecentSearchSelect(search.query)}
                          >
                            <span className="font-medium">{search.query}</span>
                            <Badge variant="secondary">{search.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Quick Filters</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { label: 'Bookmarked', filter: { isBookmarked: true } },
                          { label: 'Edited', filter: { isEdited: true } },
                          { label: 'User Messages', filter: { roles: ['user'] } },
                          { label: 'AI Responses', filter: { roles: ['assistant'] } },
                          { label: 'This Week', filter: { dateRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
                          { label: 'This Month', filter: { dateRange: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                          { label: 'Long Messages', filter: { minLength: 1000 } },
                          { label: 'Short Messages', filter: { maxLength: 100 } }
                        ].map((quick, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSearch('', quick.filter)}
                            className="justify-start"
                          >
                            {quick.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}