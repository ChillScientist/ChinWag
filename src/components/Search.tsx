import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Bookmark, Star } from 'lucide-react';
import type { ChatSession, Message } from './types';
import { cn } from '@/lib/utils';

export interface SearchQuery {
  raw: string;
  text: string;
  operators: {
    system?: string;
    name?: string;
    tag?: string;
    note?: string;
    in?: string;
    type?: 'bookmarked' | 'favorite';
  };
}

interface SearchProps {
  /** Sessions to search through */
  sessions: ChatSession[];
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Called with filtered sessions when search changes */
  onFilter: (sessions: ChatSession[]) => void;
  /** Optional CSS class name */
  className?: string;
}

const parseSearchQuery = (input: string): SearchQuery => {
  const operators = {
    system: '',
    name: '',
    tag: '',
    note: '',
    in: '',
    type: undefined as 'bookmarked' | 'favorite' | undefined,
  };
  
  let text = input;

  // Match operator patterns like "operator:value" or operator:"value with spaces"
  const operatorPattern = /(system|name|tag|note|in|type):("([^"]+)"|(\S+))/g;
  let match;

  while ((match = operatorPattern.exec(input)) !== null) {
    const [fullMatch, operator, _, quotedValue, unquotedValue] = match;
    const value = quotedValue || unquotedValue;
    
    if (isValidOperator(operator)) {
      if (operator === 'type') {
        if (value.toLowerCase() === 'bookmarked' || value.toLowerCase() === 'favorite') {
          operators.type = value.toLowerCase() as 'bookmarked' | 'favorite';
        }
      } else {
        (operators as any)[operator] = value;
      }
    }
    
    text = text.replace(fullMatch, '').trim();
  }

  return {
    raw: input,
    text,
    operators: Object.fromEntries(
      Object.entries(operators).filter(([_, value]) => value !== '')
    ) as Partial<typeof operators>,
  };
};

// Type guard function
function isValidOperator(key: string): key is 'system' | 'name' | 'tag' | 'note' | 'in' | 'type' {
  return ['system', 'name', 'tag', 'note', 'in', 'type'].includes(key);
}

const searchMessages = (messages: Message[], searchText: string): boolean => {
  const lowerText = searchText.toLowerCase();
  return messages.some(msg => msg.content.toLowerCase().includes(lowerText));
};

const filterSessions = (sessions: ChatSession[], query: SearchQuery): ChatSession[] => {
  if (!query.raw) return sessions;

  return sessions.filter(session => {
    // Handle operator searches first
    if (query.operators.system && !session.systemPrompt.toLowerCase().includes(query.operators.system.toLowerCase())) {
      return false;
    }
    if (query.operators.name && !session.name.toLowerCase().includes(query.operators.name.toLowerCase())) {
      return false;
    }
    if (query.operators.tag && !session.tags.some(tag => tag.toLowerCase().includes(query.operators.tag!.toLowerCase()))) {
      return false;
    }
    if (query.operators.note && !session.notes.toLowerCase().includes(query.operators.note.toLowerCase())) {
      return false;
    }
    if (query.operators.in && !searchMessages(session.messages, query.operators.in)) {
      return false;
    }
    if (query.operators.type) {
      if (query.operators.type === 'bookmarked' && !session.isBookmarked) {
        return false;
      }
      if (query.operators.type === 'favorite' && !session.isFavorite) {
        return false;
      }
    }

    // If we have no general search text, we matched all operators
    if (!query.text) return true;

    // Handle general search with weighted priority
    const searchText = query.text.toLowerCase();
    
    // Name match (highest priority)
    if (session.name.toLowerCase().includes(searchText)) return true;
    
    // Tags match (high priority)
    if (session.tags.some(tag => tag.toLowerCase().includes(searchText))) return true;
    
    // Notes match (medium priority)
    if (session.notes.toLowerCase().includes(searchText)) return true;
    
    // Messages match (lowest priority)
    return searchMessages(session.messages, query.text);
  });
};

export function SearchBox({ sessions, placeholder = 'Search...', onFilter, className }: SearchProps) {
  const [searchText, setSearchText] = React.useState('');
  const [isBookmarkFilter, setIsBookmarkFilter] = React.useState(false);
  const [isFavoriteFilter, setIsFavoriteFilter] = React.useState(false);

  const handleSearchChange = (newText: string, bookmarked: boolean, favorite: boolean) => {
    let finalText = newText;
    
    // Add or remove type:bookmarked operator
    if (bookmarked) {
      if (!finalText.includes('type:bookmarked')) {
        finalText = `${finalText.trim()} type:bookmarked`.trim();
      }
    } else {
      finalText = finalText.replace(/\s*type:bookmarked\s*/, ' ').trim();
    }
    
    // Add or remove type:favorite operator
    if (favorite) {
      if (!finalText.includes('type:favorite')) {
        finalText = `${finalText.trim()} type:favorite`.trim();
      }
    } else {
      finalText = finalText.replace(/\s*type:favorite\s*/, ' ').trim();
    }
    
    setSearchText(finalText);
    const query = parseSearchQuery(finalText);
    onFilter(filterSessions(sessions, query));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchText(newValue);
    
    // Parse the new value to check if it contains type operators
    const query = parseSearchQuery(newValue);
    setIsBookmarkFilter(query.operators.type === 'bookmarked');
    setIsFavoriteFilter(query.operators.type === 'favorite');
    
    onFilter(filterSessions(sessions, query));
  };

  const handleClear = () => {
    setSearchText('');
    setIsBookmarkFilter(false);
    setIsFavoriteFilter(false);
    onFilter(sessions);
  };

  const toggleBookmarkFilter = () => {
    const newState = !isBookmarkFilter;
    setIsBookmarkFilter(newState);
    handleSearchChange(searchText.replace(/\s*type:(bookmarked|favorite)\s*/g, ' '), newState, isFavoriteFilter);
  };

  const toggleFavoriteFilter = () => {
    const newState = !isFavoriteFilter;
    setIsFavoriteFilter(newState);
    handleSearchChange(searchText.replace(/\s*type:(bookmarked|favorite)\s*/g, ' '), isBookmarkFilter, newState);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchText}
          onChange={handleChange}
          className="pl-8 pr-8"
          placeholder={placeholder}
        />
        {searchText && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 h-8 w-8"
            onClick={handleClear}
            title="Clear search"
          >
            <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant={isBookmarkFilter ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleBookmarkFilter}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2 py-1 overflow-hidden"
        >
          <Bookmark className={cn(
            "h-4 w-4 mr-2 shrink-0",
            isBookmarkFilter && "fill-blue-500 text-blue-500"
          )} />
          <span className="truncate max-w-[80px] hidden sm:inline">Bookmarked</span>
        </Button>
        <Button
          variant={isFavoriteFilter ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleFavoriteFilter}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2 py-1 overflow-hidden"
        >
          <Star className={cn(
            "h-4 w-4 mr-2 shrink-0",
            isFavoriteFilter && "fill-yellow-400 text-yellow-400"
          )} />
          <span className="truncate max-w-[80px] hidden sm:inline">Favorites</span>
        </Button>
      </div>
    </div>
  );
}