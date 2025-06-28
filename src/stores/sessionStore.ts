import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import ollama from 'ollama';
import type { ChatSession, Message, Options as OllamaAppOptions } from '@/components/types';
import { useModelStore } from './modelStore'; // Import the model store

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';
const DEFAULT_SESSION_NAME = 'New Chat';

// Model interface is removed here, it's defined in modelStore.ts
// We'll refer to Model type from modelStore if needed, or assume string for model names.

export interface SessionState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  // models and isLoadingModels are removed
  isGeneratingNameForSessionId: string | null;
  isGeneratingTagsForSessionId: string | null;
  isGeneratingNotesForSessionId: string | null;
  isStreamingResponse: boolean;

  // Actions
  // fetchModels is removed
  createNewSession: () => ChatSession;
  addSession: () => void;
  setCurrentSessionId: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;

  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  renameSession: (sessionId: string, newName: string) => void;
  updateSessionMessages: (sessionId: string, messages: Message[]) => void;
  updateSessionSystemPrompt: (sessionId: string, systemPrompt: string) => void;
  updateSessionModel: (sessionId: string, model: string) => void;
  updateSessionOptions: (sessionId: string, options: Partial<OllamaAppOptions>) => void;
  setSessionTags: (sessionId: string, tags: string[]) => void;
  setSessionNotes: (sessionId: string, notes: string) => void;
  toggleBookmark: (sessionId: string) => void;
  toggleFavorite: (sessionId: string) => void;

  generateSessionName: (sessionId: string) => Promise<void>;
  generateSessionTags: (sessionId: string) => Promise<void>;
  generateSessionNotes: (sessionId: string) => Promise<void>;

  exportSessions: () => void;
  importSessions: (importedSessions: ChatSession[]) => void;

  setIsStreamingResponse: (isStreaming: boolean) => void;
}

// createNewSessionInternal now gets models from useModelStore
const createNewSessionInternal = (): ChatSession => {
  const availableModels = useModelStore.getState().models;
  return {
    id: uuidv4(),
    name: DEFAULT_SESSION_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    messages: [],
    model: availableModels[0]?.name || '', // Default to first available model from modelStore
    tags: [],
    notes: '',
    isBookmarked: false,
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // State
      sessions: [],
      currentSessionId: null,
      // models and isLoadingModels are removed
      isGeneratingNameForSessionId: null,
      isGeneratingTagsForSessionId: null,
      isGeneratingNotesForSessionId: null,
      isStreamingResponse: false,

      // Actions
      // fetchModels is removed

      createNewSession: () => {
        // Models are now fetched from modelStore directly in createNewSessionInternal
        return createNewSessionInternal();
      },

      addSession: () => {
        const newSession = get().createNewSession(); // createNewSessionInternal will use modelStore
        set(state => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: newSession.id,
        }));
      },

      setCurrentSessionId: (sessionId: string) => {
        set({ currentSessionId: sessionId });
      },

      deleteSession: (sessionId: string) => {
        set(state => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId);
          if (newSessions.length === 0) {
            const newFallbackSession = createNewSessionInternal(); // Uses modelStore
            return {
              sessions: [newFallbackSession],
              currentSessionId: newFallbackSession.id,
            };
          }
          if (state.currentSessionId === sessionId) {
            return {
              sessions: newSessions,
              currentSessionId: newSessions[0]?.id || null,
            };
          }
          return { sessions: newSessions };
        });
      },

      updateSession: (sessionId: string, updates: Partial<ChatSession>) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, ...updates, updatedAt: new Date() }
              : session
          ),
        }));
        // If model is updated, ensure it's valid against modelStore (optional, could be a check in UI)
        if (updates.model) {
            const availableModels = useModelStore.getState().models;
            if (!availableModels.some(m => m.name === updates.model)) {
                console.warn(`Session ${sessionId} updated with model ${updates.model} which is not in the available models list.`);
            }
        }
      },

      renameSession: (sessionId: string, newName: string) => {
        if (newName.trim()) {
          get().updateSession(sessionId, { name: newName.trim() });
        }
      },

      updateSessionMessages: (sessionId: string, messages: Message[]) => {
        get().updateSession(sessionId, { messages });
      },

      updateSessionSystemPrompt: (sessionId: string, systemPrompt: string) => {
        get().updateSession(sessionId, { systemPrompt });
      },

      updateSessionModel: (sessionId: string, model: string) => {
        get().updateSession(sessionId, { model });
      },

      updateSessionOptions: (sessionId: string, options: Partial<OllamaAppOptions>) => {
        const currentSession = get().sessions.find(s => s.id === sessionId);
        if (currentSession) {
          get().updateSession(sessionId, { options: {...currentSession.options, ...options }});
        }
      },

      setSessionTags: (sessionId: string, tags: string[]) => {
        get().updateSession(sessionId, { tags });
      },

      setSessionNotes: (sessionId: string, notes: string) => {
        get().updateSession(sessionId, { notes });
      },

      toggleBookmark: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          get().updateSession(sessionId, { isBookmarked: !session.isBookmarked });
        }
      },

      toggleFavorite: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          get().updateSession(sessionId, { isFavorite: !session.isFavorite });
        }
      },

      generateSessionName: async (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session || !session.messages.length || !session.model) return;

        set({ isGeneratingNameForSessionId: sessionId });
        const conversationContent = session.messages
          .slice(0, 3)
          .map(msg => `${msg.role}: ${msg.content.slice(0, 100)}`)
          .join('\n');
        try {
          const response = await ollama.chat({
            model: session.model,
            messages: [
              { role: 'system', content: 'Give this chat session a name based on its content. It should be brief and concise, maximum 4 words. Only reply with the name, no other text, quotes, or punctuation.' },
              { role: 'user', content: conversationContent }
            ],
            options: { temperature: 0.7 }
          });
          if (response.message?.content) {
            const newName = response.message.content.replace(/["']/g, '').replace(/\.$/, '').trim();
            get().renameSession(sessionId, newName);
          }
        } catch (error) {
          console.error('Failed to generate session name:', error);
        } finally {
          set({ isGeneratingNameForSessionId: null });
        }
      },

      generateSessionTags: async (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session || !session.messages.length || !session.model) return;

        set({ isGeneratingTagsForSessionId: sessionId });
        const conversationContent = session.messages
          .slice(0, 3)
          .map(msg => `${msg.role}: ${msg.content.slice(0, 100)}`)
          .join('\n');
        try {
          const response = await ollama.chat({
            model: session.model,
            messages: [
              { role: 'system', content: 'Generate 2-4 relevant tags for this conversation. Each tag should be a single word or short phrase. Reply with only the tags separated by commas, no other text.' },
              { role: 'user', content: conversationContent }
            ],
            options: { temperature: 0.7 }
          });
          if (response.message?.content) {
            const tags = response.message.content.split(',').map(tag => tag.trim()).filter(Boolean);
            get().setSessionTags(sessionId, tags);
          }
        } catch (error) {
          console.error('Failed to generate session tags:', error);
        } finally {
          set({ isGeneratingTagsForSessionId: null });
        }
      },

      generateSessionNotes: async (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (!session || !session.messages.length || !session.model) return;

        set({ isGeneratingNotesForSessionId: sessionId });
        const conversationContent = session.messages
          .slice(0, 3)
          .map(msg => `${msg.role}: ${msg.content.slice(0, 100)}`)
          .join('\n');
        try {
          const response = await ollama.chat({
            model: session.model,
            messages: [
              { role: 'system', content: 'Write a brief 1-2 sentence summary of this conversation. Be concise and focus on the main topic or goal. Reply with only the summary, no other text.' },
              { role: 'user', content: conversationContent }
            ],
            options: { temperature: 0.7 }
          });
          if (response.message?.content) {
            get().setSessionNotes(sessionId, response.message.content.trim());
          }
        } catch (error) {
          console.error('Failed to generate session notes:', error);
        } finally {
          set({ isGeneratingNotesForSessionId: null });
        }
      },

      exportSessions: () => {
        const sessionsToExport = get().sessions;
        const data = JSON.stringify(sessionsToExport, (key, value) => {
          if (key === 'createdAt' || key === 'updatedAt') {
            return new Date(value).toISOString();
          }
          return value;
        }, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-sessions-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },

      importSessions: (importedSessions: ChatSession[]) => {
        try {
          const availableModels = useModelStore.getState().models;
          const defaultModelName = availableModels[0]?.name || '';

          const normalized = importedSessions.map((session: any) => ({
            id: session.id || uuidv4(),
            name: session.name || DEFAULT_SESSION_NAME,
            systemPrompt: session.systemPrompt || DEFAULT_SYSTEM_PROMPT,
            messages: session.messages || [],
            model: session.model || defaultModelName,
            tags: session.tags || [],
            notes: session.notes || '',
            isBookmarked: session.isBookmarked || false,
            isFavorite: session.isFavorite || false,
            options: session.options || {},
            createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
            updatedAt: session.updatedAt ? new Date(session.updatedAt) : new Date(),
          }));
          set({ sessions: normalized, currentSessionId: normalized[0]?.id || null });
        } catch (error) {
            console.error("Error importing sessions:", error);
            alert("Failed to import sessions. The file might be corrupted or in an invalid format.");
        }
      },

      setIsStreamingResponse: (isStreaming: boolean) => {
        set({ isStreamingResponse: isStreaming });
      },

    }),
    {
      name: 'chat-sessions-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          const rehydratedSessions = state.sessions.map(session => ({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
          }));
          state.sessions = rehydratedSessions;

          if (!state.sessions.length) {
            const newSession = createNewSessionInternal(); // Uses modelStore
            state.sessions = [newSession];
            state.currentSessionId = newSession.id;
          } else if (!state.sessions.find(s => s.id === state.currentSessionId)) {
            state.currentSessionId = state.sessions[0].id;
          }
          // Removed the explicit call to fetchModels from here
        } else if (error) {
          console.error("Failed to rehydrate state from localStorage:", error);
          const newSession = createNewSessionInternal(); // Uses modelStore
          set({
            sessions: [newSession],
            currentSessionId: newSession.id,
            // models and isLoadingModels are not part of this store's state anymore
          });
          // Removed the explicit call to fetchModels from here
        }
      },
    }
  )
);

// Subscribe to modelStore to update sessions if their models are missing or invalid
// once the model list is loaded.
useModelStore.subscribe(
  (modelState, prevModelState) => {
    const { models, isLoadingModels } = modelState;
    const { sessions, updateSession } = useSessionStore.getState();

    if (!isLoadingModels && models.length > 0 && prevModelState.isLoadingModels) {
      // Models just finished loading
      const defaultModelName = models[0].name;
      let sessionsUpdated = false;

      const updatedSessions = sessions.map(session => {
        const modelIsValid = models.some(m => m.name === session.model);
        if (!session.model || !modelIsValid) {
          sessionsUpdated = true;
          return { ...session, model: defaultModelName, updatedAt: new Date() };
        }
        return session;
      });

      if (sessionsUpdated) {
        useSessionStore.setState({ sessions: updatedSessions });
      }
    }
  }
);

export default useSessionStore;

export const useCurrentSession = () => {
  return useSessionStore(state => state.sessions.find(s => s.id === state.currentSessionId));
};

export const useIsCurrentSessionMetadataLoading = () => {
  return useSessionStore(state => {
    const currentId = state.currentSessionId;
    if (!currentId) return false;
    return (
      state.isGeneratingNameForSessionId === currentId ||
      state.isGeneratingTagsForSessionId === currentId ||
      state.isGeneratingNotesForSessionId === currentId
    );
  });
};