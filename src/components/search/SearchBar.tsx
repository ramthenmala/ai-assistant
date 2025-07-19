// Search bar component with autocomplete and advanced filters

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToastActions } from '@/components/ui/toast';
import type { SearchFilters } from '@/services/SearchService';

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => Promise<void>;
  onClear: () => void;
  suggestions?: string[];
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  recentSearches?: string[];
  onRecentSearchSelect?: (query: string) => void;
}

export function SearchBar({
  onSearch,
  onClear,
  suggestions = [],
  isLoading = false,
  placeholder = "Search conversations...",
  className,
  initialQuery = '',
  initialFilters = {},
  recentSearches = [],
  onRecentSearchSelect
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { error } = useToastActions();

  // Handle search submission
  const handleSearch = useCallback(async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      error('Please enter a search query or apply filters');
      return;
    }

    try {
      await onSearch(query.trim(), filters);
      setShowSuggestions(false);
    } catch (err) {
      error('Search failed. Please try again.');
    }
  }, [query, filters, onSearch, error]);

  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    setFilters({});
    setShowSuggestions(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        setQuery(suggestions[selectedSuggestion]);
        setShowSuggestions(false);
        setTimeout(() => handleSearch(), 0);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
    }
  }, [selectedSuggestion, suggestions, handleSearch]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestion(-1);
    
    // Show suggestions if there's a query and we have suggestions
    if (value.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setTimeout(() => handleSearch(), 0);
  }, [handleSearch]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    setShowSuggestions(false);
    onRecentSearchSelect?.(recentQuery);
  }, [onRecentSearchSelect]);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof SearchFilters];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true);
  });

  return (
    <div className={cn("relative w-full max-w-2xl", className)}>
      <div className="relative">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={() => {
              if (query.trim() && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            className="pl-10 pr-20"
            disabled={isLoading}
          />
          
          {/* Action buttons */}
          <div className="absolute right-2 flex items-center gap-1">
            {/* Advanced filters toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "h-6 w-6 p-0",
                (showAdvanced || hasActiveFilters) && "text-primary"
              )}
              title="Advanced filters"
            >
              <Filter className="h-3 w-3" />
            </Button>
            
            {/* Clear button */}
            {(query || hasActiveFilters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 w-6 p-0"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="h-6 w-6 flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.roles && filters.roles.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Role: {filters.roles.join(', ')}
              </Badge>
            )}
            {filters.isBookmarked && (
              <Badge variant="secondary" className="text-xs">
                Bookmarked
              </Badge>
            )}
            {filters.isEdited && (
              <Badge variant="secondary" className="text-xs">
                Edited
              </Badge>
            )}
            {filters.dateRange && (
              <Badge variant="secondary" className="text-xs">
                Date: {filters.dateRange.start ? filters.dateRange.start.toLocaleDateString() : 'Any'} - {filters.dateRange.end ? filters.dateRange.end.toLocaleDateString() : 'Any'}
              </Badge>
            )}
            {filters.models && filters.models.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Model: {filters.models.join(', ')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          >
            {/* Recent searches */}
            {recentSearches.length > 0 && !query.trim() && (
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" />
                  Recent searches
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 5).map((recentQuery, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchSelect(recentQuery)}
                      className="w-full text-left px-2 py-1 text-sm hover:bg-accent rounded transition-colors"
                    >
                      {recentQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && query.trim() && (
              <div className="p-2">
                <div className="text-xs text-muted-foreground mb-2">
                  Suggestions
                </div>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={cn(
                        "w-full text-left px-2 py-1 text-sm hover:bg-accent rounded transition-colors",
                        selectedSuggestion === index && "bg-accent"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced search filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 p-4 bg-card border border-border rounded-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <div className="flex gap-2">
                  {(['user', 'assistant'] as const).map((role) => (
                    <Button
                      key={role}
                      variant={filters.roles?.includes(role) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentRoles = filters.roles || [];
                        const newRoles = currentRoles.includes(role)
                          ? currentRoles.filter(r => r !== role)
                          : [...currentRoles, role];
                        setFilters(prev => ({ ...prev, roles: newRoles.length > 0 ? newRoles : undefined }));
                      }}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.isBookmarked ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      isBookmarked: prev.isBookmarked ? undefined : true 
                    }))}
                  >
                    Bookmarked
                  </Button>
                  <Button
                    variant={filters.isEdited ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      isEdited: prev.isEdited ? undefined : true 
                    }))}
                  >
                    Edited
                  </Button>
                </div>
              </div>

              {/* Date range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const start = e.target.value ? new Date(e.target.value) : undefined;
                      setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start }
                      }));
                    }}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.dateRange?.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const end = e.target.value ? new Date(e.target.value) : undefined;
                      setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end }
                      }));
                    }}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Length filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Message Length</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minLength || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minLength: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxLength || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxLength: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
              >
                Clear Filters
              </Button>
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  'Apply Filters'
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}