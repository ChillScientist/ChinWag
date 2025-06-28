import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Trash2, Pencil, RotateCw, Square } from 'lucide-react';
import { Ollama } from 'ollama'; // Direct Ollama usage remains for now
import ReactMarkdown from 'react-markdown';
import type { Message, ChatSession } from './types';
import { useSessionStore } from '@/stores/sessionStore';

const DEFAULT_SESSION_NAME = 'New Chat'; // From ChatLayout, for checking if metadata should be generated

interface ChatProps {
  session: ChatSession;
  // onUpdateSession prop is removed; Chat component will use store actions directly
}

export function Chat({ session }: ChatProps) {
  // Store actions and relevant state
  const updateSessionMessages = useSessionStore(state => state.updateSessionMessages);
  const setIsStreamingResponse = useSessionStore(state => state.setIsStreamingResponse);
  const isStreamingResponse = useSessionStore(state => state.isStreamingResponse);
  const generateSessionName = useSessionStore(state => state.generateSessionName);
  const generateSessionTags = useSessionStore(state => state.generateSessionTags);
  const generateSessionNotes = useSessionStore(state => state.generateSessionNotes);

  // Local UI State
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [message, setMessage] = useState('');
  // const [loading, setLoading] = useState(false); // Replaced by isStreamingResponse from store
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  useEffect(() => {
    if (!isStreamingResponse) {
      inputRef.current?.focus();
    }
  }, [isStreamingResponse]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (!isStreamingResponse && session.messages.some(msg => msg.role === 'assistant')) {
          handleRegenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreamingResponse, session.messages, session.id]); // Added session.id for stable deps

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreamingResponse(false); // Ensure streaming state is reset
  };

  const isLastAssistantMessage = (index: number) => {
    const lastAssistantIndex = [...session.messages].reverse().findIndex(msg => msg.role === 'assistant');
    const actualIndex = lastAssistantIndex === -1 ? -1 : session.messages.length - 1 - lastAssistantIndex;
    return index === actualIndex;
  };

  const handleDelete = (indexToDelete: number) => {
    const newMessages = session.messages.filter((_, index) => index !== indexToDelete);
    updateSessionMessages(session.id, newMessages);
    if (editingIndex === indexToDelete) {
      setEditingIndex(null);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditContent(session.messages[index].content);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditContent('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const newMessages = [...session.messages];
    newMessages[editingIndex] = { ...newMessages[editingIndex], content: editContent };
    updateSessionMessages(session.id, newMessages);
    setEditingIndex(null);
    setEditContent('');
  };

  const triggerMetadataGeneration = async () => {
    if (session.name === DEFAULT_SESSION_NAME) {
      // Use Promise.allSettled if you don't want one failure to stop others
      await Promise.all([
        generateSessionName(session.id),
        generateSessionTags(session.id),
        generateSessionNotes(session.id),
      ]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !session.model) return;

    setIsStreamingResponse(true);
    abortControllerRef.current = new AbortController();

    const userMessage: Message = { role: 'user', content: message };
    let newMessages = [...session.messages, userMessage];
    updateSessionMessages(session.id, newMessages); // Update with user message
    setMessage('');

    // Add empty assistant message for streaming
    newMessages = [...newMessages, { role: 'assistant', content: '' }];
    updateSessionMessages(session.id, newMessages);

    try {
      const messagesToApi = [
        { role: 'system', content: session.systemPrompt },
        ...newMessages.slice(0, -1) // Exclude the empty assistant message placeholder for API call
      ];

      const client = new Ollama({ host: 'http://127.0.0.1:11434' });
      const streamEnabled = session.options?.stream !== false;

      if (streamEnabled) {
        const response = await client.chat({
          model: session.model,
          messages: messagesToApi,
          stream: true,
          options: session.options,
          signal: abortControllerRef.current.signal,
        });
        let streamedContent = '';
        for await (const chunk of response) {
          // Check abort signal here if not handled by ollama client
          if (abortControllerRef.current === null || abortControllerRef.current.signal.aborted) break;
          streamedContent += chunk.message.content;
          const currentMessages = useSessionStore.getState().sessions.find(s => s.id === session.id)?.messages || [];
          const updatedAssistantMessages = [...currentMessages.slice(0, -1), { role: 'assistant', content: streamedContent }];
          updateSessionMessages(session.id, updatedAssistantMessages);
        }
      } else {
        const response = await client.chat({
          model: session.model,
          messages: messagesToApi,
          stream: false,
          options: session.options,
          signal: abortControllerRef.current.signal,
        });
        const currentMessages = useSessionStore.getState().sessions.find(s => s.id === session.id)?.messages || [];
        const finalMessages = [...currentMessages.slice(0, -1), { role: 'assistant', content: response.message.content }];
        updateSessionMessages(session.id, finalMessages);
      }
      await triggerMetadataGeneration(); // Generate metadata after successful response
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Chat error:', error);
        const currentMessages = useSessionStore.getState().sessions.find(s => s.id === session.id)?.messages || [];
        const errorMessages = [...currentMessages.slice(0,-1), { role: 'assistant', content: 'Error: Failed to get response' }];
        updateSessionMessages(session.id, errorMessages);
      }
    } finally {
      setIsStreamingResponse(false);
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
         abortControllerRef.current = null;
      }
    }
  };

  const handleRegenerate = async () => {
    if (isStreamingResponse) return;

    const lastAssistantIndex = session.messages.map(m => m.role).lastIndexOf('assistant');
    if (lastAssistantIndex === -1) return;

    setIsStreamingResponse(true);
    abortControllerRef.current = new AbortController();

    // Messages up to the one before the last assistant message
    const messagesForApi = [
      { role: 'system', content: session.systemPrompt },
      ...session.messages.slice(0, lastAssistantIndex)
    ];

    // Update UI: set last assistant message to empty for streaming
    let currentSessionMessages = [...session.messages];
    currentSessionMessages[lastAssistantIndex] = { role: 'assistant', content: '' };
    updateSessionMessages(session.id, currentSessionMessages);

    try {
      const client = new Ollama({ host: 'http://127.0.0.1:11434' });
      const streamEnabled = session.options?.stream !== false;

      if (streamEnabled) {
        const response = await client.chat({
          model: session.model,
          messages: messagesForApi,
          stream: true,
          options: session.options,
          signal: abortControllerRef.current.signal,
        });
        let streamedContent = '';
        for await (const chunk of response) {
          if (abortControllerRef.current === null || abortControllerRef.current.signal.aborted) break;
          streamedContent += chunk.message.content;
          // Get the latest messages from store before updating
          const latestMessages = useSessionStore.getState().sessions.find(s => s.id === session.id)?.messages || [];
          const updatedMessages = [...latestMessages];
          updatedMessages[lastAssistantIndex] = { role: 'assistant', content: streamedContent };
          updateSessionMessages(session.id, updatedMessages);
        }
      } else {
        const response = await client.chat({
          model: session.model,
          messages: messagesForApi,
          stream: false,
          options: session.options,
          signal: abortControllerRef.current.signal,
        });
        const latestMessages = useSessionStore.getState().sessions.find(s => s.id === session.id)?.messages || [];
        const updatedMessages = [...latestMessages];
        updatedMessages[lastAssistantIndex] = { role: 'assistant', content: response.message.content };
        updateSessionMessages(session.id, updatedMessages);
      }
      await triggerMetadataGeneration(); // Generate metadata after successful response
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Regeneration error:', error);
        const latestMessages = useSessionStore.getState().sessions.find(s => s.id === session.id)?.messages || [];
        const updatedMessages = [...latestMessages];
        updatedMessages[lastAssistantIndex] = { role: 'assistant', content: 'Error: Failed to regenerate response' };
        updateSessionMessages(session.id, updatedMessages);
      }
    } finally {
      setIsStreamingResponse(false);
       if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
         abortControllerRef.current = null;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="space-y-4">
            {session.messages.map((msg, index) => (
              <div
                key={`${session.id}-msg-${index}`} // More robust key
                className={`flex items-start gap-2 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="flex flex-none gap-1">
                  {isLastAssistantMessage(index) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleRegenerate}
                      disabled={isStreamingResponse}
                      title="Regenerate response (Ctrl+Space)"
                    >
                      <RotateCw className={`h-4 w-4 text-gray-500 hover:text-blue-500 ${isStreamingResponse && msg.role === 'assistant' ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => startEditing(index)}
                    title="Edit message"
                  >
                    <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleDelete(index)}
                    title="Delete message"
                  >
                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </Button>
                </div>

                <div className={`flex-grow max-w-[80%] ${
                  msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                } rounded-lg p-3`}>
                  {editingIndex === index ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={handleEditKeyPress}
                        className="min-h-[60px] resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          title="Cancel editing"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={saveEdit}
                          title="Save changes"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => (
                              <a 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800" 
                                {...props} 
                              />
                            ),
                            code: ({ className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return (
                                <code
                                  className={`${
                                    typeof children === 'string' && !/\n/.test(children)
                                      ? 'bg-gray-200 px-1 py-0.5 rounded text-sm' // Inline code
                                      : 'block bg-gray-800 text-gray-100 p-3 rounded-md text-sm overflow-x-auto' // Code block
                                    } ${match ? `language-${match[1]}` : ''}`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ node, children, ...props }) => (
                              <pre className="bg-transparent p-0" {...props}>
                                {children}
                              </pre>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              disabled={isStreamingResponse}
              className="min-h-[60px] resize-none"
              rows={3}
            />
            {isStreamingResponse ? (
              <Button 
                onClick={handleStop}
                variant="destructive"
                className="sm:self-end"
                title="Stop generating response"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button 
                onClick={handleSend} 
                disabled={!session.model || isStreamingResponse}
                className="sm:self-end"
                title={!session.model ? "Select a model to begin" : "Send message"}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}