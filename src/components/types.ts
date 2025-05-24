import { Options as OllamaOptions } from "ollama";

export interface Options extends OllamaOptions {
  stream?: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSession {
  id: string;
  name: string;
  systemPrompt: string;
  messages: Message[];
  model: string;
  options?: Partial<Options>;
  tags: string[];  // New field for tags
  notes: string;   // New field for notes
  createdAt: Date;
  updatedAt: Date;
  isBookmarked?: boolean;
  isFavorite?: boolean;
}

export interface SessionsSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isGeneratingName?: string | null;
  isGeneratingTags?: string | null;
  isGeneratingNotes?: string | null;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onGenerateSessionName: (sessionId: string) => void;
  onUpdateSessionTags: (sessionId: string, tags: string[]) => void;
  onGenerateSessionTags: (sessionId: string) => void;
  onUpdateSessionNotes: (sessionId: string, notes: string) => void;
  onGenerateSessionNotes: (sessionId: string) => void;
  onToggleBookmark: (sessionId: string) => void;
  onToggleFavorite: (sessionId: string) => void;
  onExportSessions?: () => void;
  onImportSessions?: (sessions: ChatSession[]) => void;
}