import { Chat } from './Chat';
import { SessionsSidebar } from './SessionsSidebar';
import SettingsSidebar from "./SettingsSidebar";
import { useSessionStore, useCurrentSession } from '@/stores/sessionStore';
import { useModelStore } from '@/stores/modelStore'; // Import useModelStore
import type { ChatSession, Message as MessageType } from './types';
// useEffect is removed as model fetching logic is no longer here

const DEFAULT_SESSION_NAME = 'New Chat';

export function ChatLayout() {
  // Session store data
  const sessions = useSessionStore(state => state.sessions);
  const currentSessionId = useSessionStore(state => state.currentSessionId);
  const currentSession = useCurrentSession();

  // Model store data
  const models = useModelStore(state => state.models); // Get models from modelStore
  const isLoadingModels = useModelStore(state => state.isLoadingModels); // Get loading state from modelStore

  // Actions from sessionStore (unchanged, ChatLayout still orchestrates some calls or passes actions down)
  // Note: many of these props for SessionsSidebar are now sourced directly by SessionsSidebar from the store
  const isGeneratingNameForSessionId = useSessionStore(state => state.isGeneratingNameForSessionId);
  const isGeneratingTagsForSessionId = useSessionStore(state => state.isGeneratingTagsForSessionId);
  const isGeneratingNotesForSessionId = useSessionStore(state => state.isGeneratingNotesForSessionId);
  const addSession = useSessionStore(state => state.addSession);
  const setCurrentSessionId = useSessionStore(state => state.setCurrentSessionId);
  const deleteSession = useSessionStore(state => state.deleteSession);
  const renameSession = useSessionStore(state => state.renameSession);
  const generateSessionName = useSessionStore(state => state.generateSessionName);
  const setSessionTags = useSessionStore(state => state.setSessionTags);
  const generateSessionTags = useSessionStore(state => state.generateSessionTags);
  const setSessionNotes = useSessionStore(state => state.setSessionNotes);
  const generateSessionNotes = useSessionStore(state => state.generateSessionNotes);
  const toggleBookmark = useSessionStore(state => state.toggleBookmark);
  const toggleFavorite = useSessionStore(state => state.toggleFavorite);
  const exportSessions = useSessionStore(state => state.exportSessions);
  const importSessions = useSessionStore(state => state.importSessions);
  // const updateSession = useSessionStore(state => state.updateSession); // Not used directly by ChatLayout anymore
  // const setIsStreamingResponse = useSessionStore(state => state.setIsStreamingResponse); // Not used directly

  // The useEffect for fetching models is removed because modelStore handles its own fetching.

  // The handleUpdateSessionAndMetadata is removed as Chat.tsx and SettingsSidebar.tsx
  // now interact with the store more directly or through more focused props if necessary.
  // Chat.tsx handles its own metadata generation triggers.
  // SettingsSidebar.tsx calls specific update actions from its props (which come from store).

  // Initial loading state: Check if models are loading AND there are no sessions yet.
  // This helps show a loading screen on the very first app start.
  if (isLoadingModels && sessions.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div>Loading application...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <SessionsSidebar
        // Props for SessionsSidebar are now minimal as it connects to the store directly
        // We might not even need to pass sessions or currentSessionId if it fully relies on its own store connection.
        // For now, keeping them as they were in the previous refactor of ChatLayout.
        // These props below are largely sourced by SessionsSidebar from its own store connection.
        // This part can be further cleaned up if SessionsSidebar is confirmed to not need them.
        sessions={sessions}
        currentSessionId={currentSessionId}
        isGeneratingName={isGeneratingNameForSessionId}
        isGeneratingTags={isGeneratingTagsForSessionId}
        isGeneratingNotes={isGeneratingNotesForSessionId}
        onNewSession={addSession}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onGenerateSessionName={generateSessionName}
        onUpdateSessionTags={setSessionTags}
        onGenerateSessionTags={generateSessionTags}
        onUpdateSessionNotes={setSessionNotes}
        onGenerateSessionNotes={generateSessionNotes}
        onToggleBookmark={toggleBookmark}
        onToggleFavorite={toggleFavorite}
        onExportSessions={exportSessions}
        onImportSessions={importSessions}
      />
      {currentSession && currentSessionId && (
        <div className="flex-1 flex">
          <Chat
            key={currentSessionId}
            session={currentSession}
            // onUpdateSession prop removed; Chat.tsx now uses store actions.
          />
          <SettingsSidebar
            key={`settings-${currentSessionId}`}
            session={currentSession}
            // models and isLoadingModels are no longer passed; SettingsSidebar will use useModelStore.
            // onUpdateSession prop removed; SettingsSidebar.tsx now uses store actions.
          />
        </div>
      )}
      {!currentSession && sessions.length > 0 && !isLoadingModels && (
        <div className="flex-1 flex items-center justify-center">
          <p>Select a session to start chatting.</p>
        </div>
      )}
       {!currentSession && sessions.length === 0 && !isLoadingModels && (
        <div className="flex-1 flex items-center justify-center">
          <p>No sessions available. Create a new one to begin!</p>
        </div>
      )}
    </div>
  );
}