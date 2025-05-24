import { v4 as uuidv4 } from 'uuid';
import { Chat } from './Chat';
import { SessionsSidebar } from './SessionsSidebar';
import SettingsSidebar from "./SettingsSidebar"
import ollama from 'ollama';
import type { ChatSession } from './types';
import { useEffect, useState } from 'react';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';
const DEFAULT_SESSION_NAME = 'New Chat';

interface Model {
  name: string;
}

function createNewSession(): ChatSession {
  return {
    id: uuidv4(),
    name: DEFAULT_SESSION_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    messages: [],
    model: '',
    tags: [],
    notes: '',
    isBookmarked: false,
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function ChatLayout() {
  // App-level state
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [generatingNameForSession, setGeneratingNameForSession] = useState<string | null>(null);
  const [generatingTagsForSession, setGeneratingTagsForSession] = useState<string | null>(null);
  const [generatingNotesForSession, setGeneratingNotesForSession] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((session: any) => ({
        id: session.id,
        name: session.name || DEFAULT_SESSION_NAME,
        systemPrompt: session.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        messages: session.messages || [],
        model: session.model || '',
        tags: session.tags || [],
        notes: session.notes || '',
        isBookmarked: session.isBookmarked || false,
        isFavorite: session.isFavorite || false,
        options: session.options,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      }));
    }
    return [createNewSession()];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await ollama.list();
        setModels(response.models);
        
        // Set initial model for sessions that don't have one
        if (response.models.length > 0) {
          setSessions(prev => prev.map(session => ({
            ...session,
            model: session.model || response.models[0].name
          })));
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  // Persist sessions to localStorage
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleNewSession = () => {
    const newSession = {
      ...createNewSession(),
      model: models[0]?.name || ''
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      // If deleting our last session, create a new empty one
      if (newSessions.length === 0) {
        const newSession = {
          ...createNewSession(),
          model: models[0]?.name || ''
        };
        return [newSession];
      }
      return newSessions;
    });
    
    // If we deleted the current session, switch to another one
    if (sessionId === currentSessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setCurrentSessionId(remainingSessions[0]?.id || '');
    }
  };

  const handleToggleBookmark = (sessionId: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, isBookmarked: !session.isBookmarked, updatedAt: new Date() }
        : session
    ));
  };

  const handleToggleFavorite = (sessionId: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, isFavorite: !session.isFavorite, updatedAt: new Date() }
        : session
    ));
  };

  const handleUpdateSession = async (updates: Partial<ChatSession> & { isStreaming?: boolean }) => {
    const updatedSession = {
      ...sessions.find(s => s.id === currentSessionId)!,
      ...updates,
      updatedAt: new Date()
    };

    // Always update the session immediately
    setSessions(prev => prev.map(session =>
      session.id === updatedSession.id ? updatedSession : session
    ));

    // If we're still streaming, don't do anything else
    if (updates.isStreaming) {
      return;
    }

    // If streaming has finished (isStreaming: false) and this is a new conversation,
    // generate metadata
    if (updates.isStreaming === false && updatedSession.name === DEFAULT_SESSION_NAME) {
      await Promise.all([
        handleGenerateSessionName(updatedSession.id),
        handleGenerateSessionTags(updatedSession.id),
        handleGenerateSessionNotes(updatedSession.id)
      ]);
    }
  };

  const handleRenameSession = (sessionId: string, newName: string) => {
    if (newName.trim()) {
      setSessions(prev => prev.map(session =>
        session.id === sessionId
          ? { ...session, name: newName.trim(), updatedAt: new Date() }
          : session
      ));
    }
  };

  const handleUpdateSessionTags = (sessionId: string, tags: string[]) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, tags, updatedAt: new Date() }
        : session
    ));
  };

  const handleUpdateSessionNotes = (sessionId: string, notes: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, notes, updatedAt: new Date() }
        : session
    ));
  };

  const handleGenerateSessionName = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.messages.length || !session.model) return;

    setGeneratingNameForSession(sessionId);

    const conversationContent = session.messages
      .slice(0, 3)
      .map(msg => msg.content.slice(0, 100))
      .join('\n');

    try {
      const response = await ollama.chat({
        model: session.model,
        messages: [
          {
            role: 'system',
            content: 'Give this chat session a name based on its content. It should be brief and concise, maximum 4 words. Only reply with the name, no other text, quotes, or punctuation. (no negative or judgmental commentary or criticism)'
          },
          {
            role: 'user',
            content: conversationContent
          }
        ],
        options: {
          temperature: 0.7
        }
      });

      if (response.message?.content) {
        const newName = response.message.content
          .replace(/["']/g, '')
          .replace(/\.$/, '')
          .trim();

        handleRenameSession(sessionId, newName);
      }
    } catch (error) {
      console.error('Failed to generate name:', error);
    } finally {
      setGeneratingNameForSession(null);
    }
  };

  const handleGenerateSessionTags = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.messages.length || !session.model) return;

    setGeneratingTagsForSession(sessionId);

    const conversationContent = session.messages
      .slice(0, 3)
      .map(msg => msg.content.slice(0, 100))
      .join('\n');

    try {
      const response = await ollama.chat({
        model: session.model,
        messages: [
          {
            role: 'system',
            content: 'Generate 2-4 relevant tags for this conversation. Each tag should be a single word or short phrase. Reply with only the tags separated by commas, no other text. (no negative or judgmental commentary or criticism)'
          },
          {
            role: 'user',
            content: conversationContent
          }
        ],
        options: {
          temperature: 0.7
        }
      });

      if (response.message?.content) {
        const tags = response.message.content
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean);

        handleUpdateSessionTags(sessionId, tags);
      }
    } catch (error) {
      console.error('Failed to generate tags:', error);
    } finally {
      setGeneratingTagsForSession(null);
    }
  };

  const handleGenerateSessionNotes = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.messages.length || !session.model) return;

    setGeneratingNotesForSession(sessionId);

    const conversationContent = session.messages
      .slice(0, 3)
      .map(msg => msg.content.slice(0, 100))
      .join('\n');

    try {
      const response = await ollama.chat({
        model: session.model,
        messages: [
          {
            role: 'system',
            content: 'Write a brief 1-2 sentence summary of this conversation. Be concise and focus on the main topic or goal. Reply with only the summary, no other text.'
          },
          {
            role: 'user',
            content: conversationContent
          }
        ],
        options: {
          temperature: 0.7
        }
      });

      if (response.message?.content) {
        handleUpdateSessionNotes(sessionId, response.message.content.trim());
      }
    } catch (error) {
      console.error('Failed to generate notes:', error);
    } finally {
      setGeneratingNotesForSession(null);
    }
  };

  // Export sessions as JSON
  const handleExportSessions = () => {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-sessions-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import sessions from JSON
  const handleImportSessions = (importedSessions: any[]) => {
    // Validate and normalize imported sessions
    const normalized = importedSessions.map((session: any) => ({
      ...session,
      createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
      updatedAt: session.updatedAt ? new Date(session.updatedAt) : new Date(),
      isBookmarked: session.isBookmarked || false,
      isFavorite: session.isFavorite || false,
      tags: session.tags || [],
      notes: session.notes || '',
      options: session.options,
    }));
    setSessions(normalized);
    setCurrentSessionId(normalized[0]?.id || '');
  };

  return (
    <div className="flex h-screen bg-white">
      <SessionsSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        isGeneratingName={generatingNameForSession}
        isGeneratingTags={generatingTagsForSession}
        isGeneratingNotes={generatingNotesForSession}
        onNewSession={handleNewSession}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onGenerateSessionName={handleGenerateSessionName}
        onUpdateSessionTags={handleUpdateSessionTags}
        onGenerateSessionTags={handleGenerateSessionTags}
        onUpdateSessionNotes={handleUpdateSessionNotes}
        onGenerateSessionNotes={handleGenerateSessionNotes}
        onToggleBookmark={handleToggleBookmark}
        onToggleFavorite={handleToggleFavorite}
        onExportSessions={handleExportSessions}
        onImportSessions={handleImportSessions}
      />
      {currentSession && (
        <div className="flex-1 flex">
          <Chat
            session={currentSession}
            onUpdateSession={handleUpdateSession}
          />
          <SettingsSidebar
            session={currentSession}
            models={models}
            isLoadingModels={isLoadingModels}
            onUpdateSession={(updates) => handleUpdateSession({
              ...updates,
              isStreaming: false // Settings updates are never streaming
            })}
          />
        </div>
      )}
    </div>
  );
}