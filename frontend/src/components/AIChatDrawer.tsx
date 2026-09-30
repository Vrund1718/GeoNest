import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  X,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Mic,
  MicOff,
  AlertCircle,
  Globe,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useVoiceAssistant, VoiceLanguage } from '../hooks/useVoiceAssistant';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

const STORAGE_KEY = 'geonest_chat_history_v2';

const INITIAL_WELCOME: ChatMessageItem = {
  id: 'welcome-1',
  role: 'assistant',
  content: "Hi! I'm GeoNest AI Assistant 🤖. Ask me anything about PG accommodations, rents, locations, or amenities near your college!",
  timestamp: Date.now(),
};

const getFriendlyErrorMessage = (err: any): string => {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return 'Check your internet connection and try again.';
  }

  const status = err.response?.status;
  const errorType = err.response?.data?.error;
  const serverMsg = err.response?.data?.message || err.response?.data?.error;

  if (
    status === 503 ||
    errorType === 'overloaded' ||
    serverMsg?.toLowerCase().includes('high demand') ||
    serverMsg?.toLowerCase().includes('unavailable')
  ) {
    return 'The AI is very busy right now. Please try again in a moment.';
  }

  if (
    status === 429 ||
    errorType === 'rate_limit' ||
    serverMsg?.toLowerCase().includes('too many requests')
  ) {
    return 'Too many requests. Please wait a minute and try again.';
  }

  if (
    status === 401 ||
    errorType === 'unauthorized' ||
    serverMsg?.toLowerCase().includes('gemini_api_key')
  ) {
    return 'API key error. Please check server configuration.';
  }

  if (!err.response) {
    return 'Check your internet connection and try again.';
  }

  return 'Something went wrong. Please try again.';
};

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1" />;

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const isNumbered = /^\d+\.\s/.test(trimmed);

        const textToFormat = isBullet
          ? trimmed.slice(2)
          : isNumbered
          ? trimmed.replace(/^\d+\.\s/, '')
          : trimmed;

        const parts = textToFormat.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

        const renderedText = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-slate-900 dark:text-amber-200">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={pIdx} className="px-1 py-0.5 rounded bg-sand-200 dark:bg-slate-700 text-xs font-mono">
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} className="flex gap-2 items-start pl-1">
              <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1">{renderedText}</span>
            </div>
          );
        }

        if (isNumbered) {
          const numMatch = trimmed.match(/^(\d+)\./);
          const num = numMatch ? numMatch[1] : '';
          return (
            <div key={lIdx} className="flex gap-2 items-start pl-1">
              <span className="text-indigo-500 font-semibold shrink-0 mt-0.5">{num}.</span>
              <span className="flex-1">{renderedText}</span>
            </div>
          );
        }

        return <p key={lIdx}>{renderedText}</p>;
      })}
    </div>
  );
};

export const AIChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [INITIAL_WELCOME];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

  // Voice Assistant Hook
  const {
    isSupported: isVoiceSupported,
    isListening,
    interimTranscript,
    error: voiceError,
    selectedLanguage,
    setSelectedLanguage,
    voiceReplies,
    setVoiceReplies,
    isPlayingTts,
    activeSpeakingId,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError: clearVoiceError,
  } = useVoiceAssistant({
    onSpeechEnd: (finalSpeechText) => {
      if (finalSpeechText.trim()) {
        setInput(finalSpeechText.trim());
        handleSendMessage(finalSpeechText.trim(), true);
      }
    },
  });

  // Display interim transcript while speaking
  useEffect(() => {
    if (isListening && interimTranscript) {
      setInput(interimTranscript);
    }
  }, [isListening, interimTranscript]);

  const handleSendMessage = async (textToSend?: string, isSpoken: boolean = false) => {
    const userText = (textToSend || input).trim();
    if (!userText || loading) return;

    stopSpeaking();
    if (isListening) stopListening();

    // Filter out previous error items before adding new message
    let baseMessages = messages.filter((m) => !m.isError);

    // If user text is already the last user message, don't duplicate it
    const lastUserMsg = baseMessages.filter((m) => m.role === 'user').slice(-1)[0];
    let updatedMessages = baseMessages;

    if (!lastUserMsg || lastUserMsg.content !== userText) {
      const userMessage: ChatMessageItem = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };
      updatedMessages = [...baseMessages, userMessage];
    }

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const appContext = {
      currentPath: window.location.pathname,
      pageTitle: document.title,
      userAgent: navigator.userAgent.slice(0, 100),
    };

    try {
      const { data } = await api.post('/ai/chat', {
        messages: updatedMessages
          .filter((m) => !m.isError)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content })),
        context: appContext,
      });

      const replyText = data.reply || "I couldn't generate an answer right now.";
      const assistantMessageId = `ast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const assistantMessage: ChatMessageItem = {
        id: assistantMessageId,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev.filter((m) => !m.isError), assistantMessage]);
      setLastFailedText(null);

      if (voiceReplies || isSpoken) {
        speak(replyText, assistantMessageId);
      }
    } catch (err: any) {
      console.error('[AI Chat Error]', err);
      const friendlyMsg = getFriendlyErrorMessage(err);
      setLastFailedText(userText);

      setMessages((prev) => [
        ...prev.filter((m) => !m.isError),
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: friendlyMsg,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedText && !loading) {
      setIsRetrying(true);
      handleSendMessage(lastFailedText);
    }
  };

  const handleClearChat = () => {
    stopSpeaking();
    if (isListening) stopListening();
    const reset = [INITIAL_WELCOME];
    setMessages(reset);
    sessionStorage.removeItem(STORAGE_KEY);
    setLastFailedText(null);
    toast.success('Chat history cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 text-white rounded-2xl shadow-2xl hover:scale-105 transition-all flex items-center gap-2 group min-w-[52px] min-h-[52px] border-2 border-white/20 active:scale-95"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline font-semibold text-xs pr-1">AI Assist</span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          </span>
        </button>
      )}

      {/* Chat Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 z-50 w-full sm:w-[410px] h-full sm:h-[580px] bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-2xl rounded-none sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  GeoNest AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <span className="text-[10px] text-white/80 font-medium">Powered by Gemini AI</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Language Selector */}
              {isVoiceSupported && (
                <div className="relative flex items-center bg-white/10 rounded-lg px-1.5 py-1 text-[11px] border border-white/20">
                  <Globe className="w-3 h-3 mr-1 text-white/80" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as VoiceLanguage)}
                    className="bg-transparent text-white focus:outline-none cursor-pointer text-[11px] font-medium"
                    title="Select Voice Language"
                  >
                    <option value="en-IN" className="text-slate-900">EN</option>
                    <option value="hi-IN" className="text-slate-900">HI (हिंदी)</option>
                    <option value="gu-IN" className="text-slate-900">GU (ગુજરાતી)</option>
                  </select>
                </div>
              )}

              {/* Voice Replies Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (voiceReplies) stopSpeaking();
                  setVoiceReplies(!voiceReplies);
                }}
                className={`p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition ${
                  voiceReplies ? 'bg-white/20 text-amber-300' : ''
                }`}
                title={voiceReplies ? 'Voice Replies: ON' : 'Voice Replies: OFF'}
              >
                {voiceReplies ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4 text-white/60" />}
              </button>

              {/* Clear Chat */}
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close Panel */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  if (isListening) stopListening();
                  setIsOpen(false);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Voice Error Notification Banner */}
          {voiceError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-3 py-1.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
              <span className="truncate pr-2">{voiceError}</span>
              <button
                onClick={clearVoiceError}
                className="text-amber-900 dark:text-amber-200 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/70 dark:bg-slate-900/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs">
                    🤖
                  </div>
                )}

                <div
                  className={`relative p-3 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : m.isError
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 rounded-bl-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  {m.isError ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Notice</span>
                      </div>
                      <p>{m.content}</p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={loading}
                        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition shadow-xs cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>{isRetrying || loading ? 'Trying again...' : 'Retry'}</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <FormattedMessage content={m.content} />
                      {m.role === 'assistant' && (
                        <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isPlayingTts && activeSpeakingId === m.id) {
                                stopSpeaking();
                              } else {
                                speak(m.content, m.id);
                              }
                            }}
                            className={`p-1 rounded hover:bg-sand-100 dark:hover:bg-slate-700 transition flex items-center gap-1 ${
                              isPlayingTts && activeSpeakingId === m.id ? 'text-indigo-600 dark:text-amber-300 font-bold' : 'text-slate-400'
                            }`}
                            title="Read Aloud"
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${isPlayingTts && activeSpeakingId === m.id ? 'animate-pulse text-indigo-600 dark:text-amber-300' : ''}`} />
                            <span>{isPlayingTts && activeSpeakingId === m.id ? 'Stop' : 'Listen'}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                    👤
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs">
                  🤖
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border dark:border-slate-700 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shadow-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>{isRetrying ? 'Trying again...' : 'Thinking & searching listings...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
            {[
              'Best PGs under 10k',
              'Girls PGs near Nirma',
              'Compare top PGs',
              'PGs with Wi-Fi & Mess',
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInput(s);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 shrink-0 transition"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Listening Overlay Status */}
          {isListening && (
            <div className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 shrink-0 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span className="font-medium">Listening ({selectedLanguage})... Speak now</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="text-xs text-indigo-600 dark:text-indigo-300 underline font-semibold"
              >
                Stop
              </button>
            </div>
          )}

          {/* Input Footer Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-end gap-2 shrink-0"
          >
            {/* Mic Button */}
            {isVoiceSupported && (
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                className={`h-10 w-10 p-0 rounded-xl shrink-0 flex items-center justify-center transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg ring-4 ring-rose-200 dark:ring-rose-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600'
                }`}
                title={isListening ? 'Stop Listening' : 'Speak Message'}
                aria-label="Voice Input"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 min-h-[40px] max-h-[100px] p-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 resize-none"
              placeholder={isListening ? 'Listening...' : 'Ask AI about PGs, rents, amenities...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 w-10 p-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shrink-0 flex items-center justify-center transition shadow-xs"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Voice Service Notice */}
          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-[10px] text-slate-600 dark:text-slate-400 text-center shrink-0 border-t border-slate-200/50 dark:border-slate-800">
            Voice features powered by browser Web Speech API.
          </div>
        </div>
      )}
    </>
  );
};
