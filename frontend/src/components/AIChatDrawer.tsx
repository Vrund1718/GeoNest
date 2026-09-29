import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageSquare, X, Send, Trash2, Volume2, VolumeX, Sparkles, User, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm GeoNest AI Assistant 🤖. How can I help you find the perfect PG accommodation near your college?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    if (!userText || loading) return;

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userText },
    ];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const reply = data.reply || "I'm sorry, I couldn't find an answer.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      speakText(reply);
    } catch (err: any) {
      console.error(err);
      const fallbackReply = "I'm having trouble connecting right now. You can use the search bar above to explore PGs!";
      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackReply }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat history cleared! Ask me anything about GeoNest PGs, rents, or amenities.",
      },
    ]);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    toast.success('Chat cleared');
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 p-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl shadow-2xl hover:scale-105 transition-all flex items-center gap-2 group min-w-[52px] min-h-[52px] border-2 border-white/20"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline font-semibold text-xs pr-1">AI Assist</span>
        </button>
      )}

      {/* Chat Drawer / Flyout Panel */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 z-50 w-full sm:w-[380px] h-full sm:h-[520px] bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-2xl rounded-none sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-700 to-indigo-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  GeoNest AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <span className="text-[10px] text-white/70">Powered by Gemini AI</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition ${
                  ttsEnabled ? 'bg-white/20 text-white' : ''
                }`}
                title={ttsEnabled ? 'Disable Voice Readout' : 'Enable Voice Readout'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Clear Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-sand-50/50 dark:bg-slate-900/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs">
                    🤖
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] text-xs sm:text-sm leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-xs">
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
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border dark:border-slate-700 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions pills */}
          <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border-t border-ink/5 dark:border-slate-700/60 overflow-x-auto flex gap-1.5 shrink-0">
            {[
              'Best PGs under 10k',
              'Girls PGs near Nirma',
              'Compare top PGs',
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setInput(s);
                }}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-sand-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 shrink-0 transition"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-800 border-t border-ink/10 dark:border-slate-700 flex gap-2 shrink-0">
            <input
              type="text"
              className="input flex-1 h-10 text-xs sm:text-sm"
              placeholder="Ask AI about PGs, rents, amenities..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary h-10 w-10 p-0 rounded-xl shrink-0 flex items-center justify-center"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
