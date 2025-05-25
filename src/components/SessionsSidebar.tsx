import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MessageSquare, Pencil, Trash2, Wand2, ChevronLeft, Loader2, Check, X, Bookmark, Star } from 'lucide-react';
import { ResizableBox } from 'react-resizable';
import { SearchBox } from './Search';
import type { SessionsSidebarProps } from './types';
import { cn } from '@/lib/utils';

import 'react-resizable/css/styles.css';

interface EditState {
  type: 'name' | 'tags' | 'notes';
  sessionId: string;
  content: string;
}

export function SessionsSidebar({
  sessions,
  currentSessionId,
  isGeneratingName,
  isGeneratingTags,
  isGeneratingNotes,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onGenerateSessionName,
  onUpdateSessionTags,
  onGenerateSessionTags,
  onUpdateSessionNotes,
  onGenerateSessionNotes,
  onToggleBookmark,
  onToggleFavorite,
  onExportSessions,
  onImportSessions,
}: SessionsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Persist sidebar width in localStorage
  const SIDEBAR_WIDTH_KEY = 'sessionsSidebarWidth';
  const getInitialWidth = () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(SIDEBAR_WIDTH_KEY) : null;
    return stored ? parseInt(stored, 10) : 350;
  };
  const [expandedWidth, setExpandedWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [filteredSessions, setFilteredSessions] = useState(sessions);
  const [filter, setFilter] = useState<'all' | 'bookmarked' | 'favorites'>('all');
  const currentWidth = isCollapsed ? 50 : expandedWidth;

  // Import file input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Update filtered sessions when sessions prop or filter changes
  React.useEffect(() => {
    let filtered = [...sessions];
    
    switch (filter) {
      case 'bookmarked':
        filtered = filtered.filter(session => session.isBookmarked);
        break;
      case 'favorites':
        filtered = filtered.filter(session => session.isFavorite);
        break;
    }
    
    setFilteredSessions(filtered);
  }, [sessions, filter]);

  const startEditing = (type: 'name' | 'tags' | 'notes', sessionId: string, content: string) => {
    setEditState({ type, sessionId, content });
  };

  const cancelEditing = () => {
    setEditState(null);
  };

  const handleSave = () => {
    if (!editState) return;

    const { type, sessionId, content } = editState;
    switch (type) {
      case 'name':
        if (content.trim()) {
          onRenameSession(sessionId, content.trim());
        }
        break;
      case 'tags':
        const tags = content.split(',').map(tag => tag.trim()).filter(Boolean);
        onUpdateSessionTags(sessionId, tags);
        break;
      case 'notes':
        onUpdateSessionNotes(sessionId, content.trim());
        break;
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editState) return;

    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleClear = (sessionId: string, type: 'tags' | 'notes') => {
    if (type === 'tags') {
      onUpdateSessionTags(sessionId, []);
    } else {
      onUpdateSessionNotes(sessionId, '');
    }
  };

  // Handle import button click
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && typeof onImportSessions === 'function') {
          onImportSessions(json);
        } else {
          alert('Invalid session backup file.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported if needed
    e.target.value = '';
  };

  return (
    <ResizableBox
      width={currentWidth}
      height={Infinity}
      minConstraints={[250, Infinity]}
      maxConstraints={[600, Infinity]}
      axis="x"
      resizeHandles={['e']}
      className={cn(
        "relative flex flex-col border-r",
        !isResizing && "transition-[width] duration-200"
      )}
      onResizeStart={() => setIsResizing(true)}
      onResizeStop={(_, { size }) => {
        setIsResizing(false);
        if (!isCollapsed) {
          setExpandedWidth(size.width);
          if (typeof window !== 'undefined') {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, String(size.width));
          }
        }
      }}
      handle={
        <div
          className={cn(
            "absolute right-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/50",
            isCollapsed && "hidden"
          )}
        />
      }
    >
      <Button
        variant="secondary"
        size="sm"
        className="absolute -right-3 top-1/2 z-10 h-12 w-6 -translate-y-1/2 rounded-none border"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand conversations panel" : "Collapse conversations panel"}
      >
        <ChevronLeft className={cn(
          "h-4 w-4 transition-transform",
          isCollapsed && "rotate-180"
        )} />
      </Button>

      <div className="p-4 border-b space-y-2">
        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={onExportSessions} title="Export sessions as JSON">
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportClick} title="Import sessions from JSON">
            Import
          </Button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        {!isCollapsed ? (
          <>
            <Button onClick={onNewSession} className="w-full" title="Start a new conversation">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2 py-1 overflow-hidden"
                onClick={() => setFilter('all')}
                title="Show all conversations"
              >
                <span
                  className={
                    expandedWidth < 180
                      ? 'hidden'
                      : 'block truncate max-w-[60px]'
                  }
                >All</span>
              </Button>
              <Button
                variant={filter === 'bookmarked' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2 py-1 overflow-hidden"
                onClick={() => setFilter('bookmarked')}
                title="Show bookmarked conversations"
              >
                <Bookmark className="h-4 w-4" />
                <span
                  className={
                    expandedWidth < 220
                      ? 'hidden'
                      : 'block truncate max-w-[80px]'
                  }
                >Bookmarked</span>
              </Button>
              <Button
                variant={filter === 'favorites' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2 py-1 overflow-hidden"
                onClick={() => setFilter('favorites')}
                title="Show favorite conversations"
              >
                <Star className="h-4 w-4" />
                <span
                  className={
                    expandedWidth < 200
                      ? 'hidden'
                      : 'block truncate max-w-[70px]'
                  }
                >Favorites</span>
              </Button>
            </div>
            <SearchBox
              sessions={filteredSessions}
              onFilter={setFilteredSessions}
              placeholder="Search conversations..."
              className="w-full"
            />
          </>
        ) : (
          <Button size="icon" onClick={onNewSession}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
        {filteredSessions.map((session) => {
          const isActive = session.id === currentSessionId;
          const showDetails = isActive;

          return (
            <div
              key={session.id}
              className={cn(
                "group rounded-lg transition-all duration-200",
                isActive ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              {/* Session Header - Always Visible */}
              <div className="flex items-center min-w-0 w-full">
                {editState?.type === 'name' && editState.sessionId === session.id ? (
                  <div className="flex flex-1 items-center gap-2 p-2 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <Input
                      value={editState.content}
                      onChange={(e) => setEditState(prev => ({ ...prev!, content: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="h-8"
                      autoFocus
                    />
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEditing}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 overflow-hidden justify-start w-0"
                      onClick={() => onSelectSession(session.id)}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate">{session.name}</span>
                      )}
                    </Button>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onToggleBookmark(session.id)}
                          title={session.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                        >
                          <Bookmark 
                            className={cn(
                              "h-4 w-4 transition-colors",
                              session.isBookmarked ? "fill-blue-500 text-blue-500" : "text-gray-500 hover:text-blue-500"
                            )} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onToggleFavorite(session.id)}
                          title={session.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star 
                            className={cn(
                              "h-4 w-4 transition-colors",
                              session.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-500 hover:text-yellow-400"
                            )} 
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditing('name', session.id, session.name)}
                          title="Rename conversation"
                        >
                          <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isGeneratingName === session.id}
                          onClick={() => onGenerateSessionName(session.id)}
                          title="Generate name from content"
                        >
                          {isGeneratingName === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          ) : (
                            <Wand2 className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDeleteSession(session.id)}
                          title="Delete conversation"
                        >
                          <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expandable Content */}
              {showDetails && !isCollapsed && (
                <>
                  {/* Tags Section */}
                  <div className="px-2 py-1">
                    {editState?.type === 'tags' && editState.sessionId === session.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editState.content}
                          onChange={(e) => setEditState(prev => ({ ...prev!, content: e.target.value }))}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter tags separated by commas"
                          className="h-8"
                          autoFocus
                        />
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEditing}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-h-[24px] text-xs text-muted-foreground line-clamp-2">
                          {session.tags.length > 0 ? (
                            session.tags.join(', ')
                          ) : (
                            'No tags'
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditing('tags', session.id, session.tags.join(', '))}
                          title="Edit tags"
                        >
                          <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isGeneratingTags === session.id}
                          onClick={() => onGenerateSessionTags(session.id)}
                          title="Generate tags from content"
                        >
                          {isGeneratingTags === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          ) : (
                            <Wand2 className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                          )}
                        </Button>
                        {session.tags.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleClear(session.id, 'tags')}
                            title="Clear all tags"
                          >
                            <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  <div className="px-2 py-1">
                    {editState?.type === 'notes' && editState.sessionId === session.id ? (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={editState.content}
                          onChange={(e) => setEditState(prev => ({ ...prev!, content: e.target.value }))}
                          onKeyDown={handleKeyDown}
                          placeholder="Enter notes"
                          className="min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEditing}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1 text-xs text-muted-foreground line-clamp-4">
                          {session.notes || 'No notes'}
                        </div>
                        <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditing('notes', session.id, session.notes)}
                          title="Edit notes"
                        >
                          <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isGeneratingNotes === session.id}
                          onClick={() => onGenerateSessionNotes(session.id)}
                          title="Generate notes from content"
                        >
                          {isGeneratingNotes === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          ) : (
                            <Wand2 className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                          )}
                        </Button>
                        {session.notes && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleClear(session.id, 'notes')}
                            title="Clear notes"
                          >
                            <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>
      </ScrollArea>
    </ResizableBox>
  );
}