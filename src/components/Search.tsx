import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
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
  };
  
  let text = input;

  // Match operator patterns like "operator:value" or operator:"value with spaces"
  const operatorPattern = /(system|name|tag|note|in):("([^"]+)"|(\S+))/g;
  let match;

  while ((match = operatorPattern.exec(input)) !== null) {
    const [fullMatch, operator, _, quotedValue, unquotedValue] = match;
    operators[operator] = quotedValue || unquotedValue;
    text = text.replace(fullMatch, '').trim();
  }

  return {
    raw: input,
    text,
    operators: Object.fromEntries(
      Object.entries(operators).filter(([_, value]) => value !== '')
    ),
  };
};

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
    if (query.operators.tag && !session.tags.some(tag => tag.toLowerCase().includes(query.operators.tag.toLowerCase()))) {
      return false;
    }
    if (query.operators.note && !session.notes.toLowerCase().includes(query.operators.note.toLowerCase())) {
      return false;
    }
    if (query.operators.in && !searchMessages(session.messages, query.operators.in)) {
      return false;
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchText(newValue);
        const query = parseSearchQuery(newValue);
        onFilter(filterSessions(sessions, query));
    };

    const handleClear = () => {
        setSearchText('');
        onFilter(sessions);
    };

    return (
        <div className={cn("relative flex items-center", className)}>
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
            >
            <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </Button>
        )}
        </div>
    );
}