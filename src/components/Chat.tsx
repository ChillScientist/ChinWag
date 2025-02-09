import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Trash2, Pencil, RotateCw, Square } from 'lucide-react';
import { Ollama } from 'ollama';
import ReactMarkdown from 'react-markdown';
import type { Message, ChatSession } from './types';

interface ChatProps {
  session: ChatSession;
  onUpdateSession: (updates: Partial<ChatSession> & { isStreaming?: boolean }) => void;
}

export function Chat({ session, onUpdateSession }: ChatProps) {
  // UI State
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  // Auto-focus effect
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // Keyboard shortcut for regeneration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (!loading && session.messages.some(msg => msg.role === 'assistant')) {
          handleRegenerate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, session.messages]);

  // Cleanup effect
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
    setLoading(false);
  };

  const isLastAssistantMessage = (index: number) => {
    const lastAssistantIndex = [...session.messages].reverse().findIndex(msg => msg.role === 'assistant');
    const actualIndex = lastAssistantIndex === -1 ? -1 : session.messages.length - 1 - lastAssistantIndex;
    return index === actualIndex;
  };

  const handleDelete = (indexToDelete: number) => {
    const newMessages = session.messages.filter((_, index) => index !== indexToDelete);
    onUpdateSession({ messages: newMessages });
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
    newMessages[editingIndex] = {
      ...newMessages[editingIndex],
      content: editContent
    };
    onUpdateSession({ messages: newMessages });
    setEditingIndex(null);
    setEditContent('');
  };

  const handleSend = async () => {
    if (!message.trim() || !session.model) return;

    setLoading(true);
    abortControllerRef.current = new AbortController();

    const userMessage: Message = { role: 'user', content: message };
    const newMessages = [...session.messages, userMessage];
    // Mark start of streaming
    onUpdateSession({ 
      messages: newMessages,
      isStreaming: true 
    });
    setMessage('');

    try {
      const messages = [
        { role: 'system', content: session.systemPrompt },
        ...newMessages
      ];

      // Add empty assistant message
      onUpdateSession({ 
        messages: [...newMessages, { role: 'assistant', content: '' }],
        isStreaming: true
      });

      const client = new Ollama({
        host: 'http://127.0.0.1:11434'
      });

      const response = await client.chat({
        model: session.model,
        messages,
        stream: true,
        options: session.options
      });

      let streamedContent = '';
      for await (const chunk of response) {
        if (abortControllerRef.current === null) break;
        streamedContent += chunk.message.content;
        onUpdateSession({ 
          messages: [
            ...newMessages, 
            { role: 'assistant', content: streamedContent }
          ],
          isStreaming: true
        });
      }

      // Mark end of streaming with final content
      onUpdateSession({ 
        messages: [
          ...newMessages, 
          { role: 'assistant', content: streamedContent }
        ],
        isStreaming: false
      });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Chat error:', error);
        onUpdateSession({ 
          messages: [
            ...newMessages, 
            { role: 'assistant', content: 'Error: Failed to get response' }
          ],
          isStreaming: false
        });
      }
    }

    setLoading(false);
    abortControllerRef.current = null;
  };

  const handleRegenerate = async () => {
    if (loading) return;

    const lastAssistantIndex = session.messages.findIndex((_, index) => isLastAssistantMessage(index));
    if (lastAssistantIndex === -1) return;

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const messages = [
        { role: 'system', content: session.systemPrompt },
        ...session.messages.slice(0, lastAssistantIndex)
      ];

      const newMessages = [...session.messages];
      newMessages[lastAssistantIndex] = { role: 'assistant', content: '' };
      onUpdateSession({ 
        messages: newMessages,
        isStreaming: true 
      });

      const client = new Ollama({
        host: 'http://127.0.0.1:11434'
      });

      const response = await client.chat({
        model: session.model,
        messages,
        stream: true,
        options: session.options
      });

      let streamedContent = '';
      for await (const chunk of response) {
        if (abortControllerRef.current === null) break;
        streamedContent += chunk.message.content;
        newMessages[lastAssistantIndex] = {
          role: 'assistant',
          content: streamedContent
        };
        onUpdateSession({ 
          messages: newMessages,
          isStreaming: true 
        });
      }

      // Mark end of streaming with final content
      newMessages[lastAssistantIndex] = {
        role: 'assistant',
        content: streamedContent
      };
      onUpdateSession({ 
        messages: newMessages,
        isStreaming: false 
      });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Regeneration error:', error);
        const newMessages = [...session.messages];
        newMessages[lastAssistantIndex] = {
          role: 'assistant',
          content: 'Error: Failed to regenerate response'
        };
        onUpdateSession({ 
          messages: newMessages,
          isStreaming: false
        });
      }
    }

    setLoading(false);
    abortControllerRef.current = null;
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
                key={index}
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
                      disabled={loading}
                    >
                      <RotateCw className={`h-4 w-4 text-gray-500 hover:text-blue-500 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => startEditing(index)}
                  >
                    <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleDelete(index)}
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
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={saveEdit}
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
                            code: ({ node, inline, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return (
                                <code
                                  className={`${
                                    inline
                                      ? 'bg-gray-200 px-1 py-0.5 rounded text-sm'
                                      : 'block bg-gray-800 text-gray-100 p-3 rounded-md text-sm overflow-x-auto'
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
              disabled={loading}
              className="min-h-[60px] resize-none"
              rows={3}
            />
            {loading ? (
              <Button 
                onClick={handleStop}
                variant="destructive"
                className="sm:self-end"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button 
                onClick={handleSend} 
                disabled={!session.model}
                className="sm:self-end"
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