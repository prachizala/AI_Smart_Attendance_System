import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, X, Send, User, Loader2 } from 'lucide-react';

export default function ChatbotWidget({ adminUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello Admin! I am your AI Workforce & Attendance Assistant. Ask me anything about today\'s check-ins, punctuality scores, or leave requests.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chips, setChips] = useState([
    'Today\'s Attendance Count',
    'Who is late today?',
    'Shift Policy & Rules',
    'Leave Summary',
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText = null) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: adminUser?.id || 1,
          message: text,
          language: 'en',
        }),
      });

      if (!response.ok) throw new Error('Assistant unreachable');
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      if (Array.isArray(data.chips) && data.chips.length > 0) {
        setChips(data.chips);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: 'Unable to connect to the AI engine. Please ensure the backend server is running.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-full shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-300 transform hover:scale-105"
            aria-label="Open AI Assistant"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            </div>
            <span className="text-sm font-bold tracking-wide">AI Assistant</span>
          </button>
        )}

        {/* Chatbot Window */}
        {isOpen && (
          <div className="w-[360px] sm:w-[400px] h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">AI Assistant</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-[11px] text-slate-400">Workforce & Policy Intelligence</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      m.sender === 'user'
                        ? 'bg-sky-500 text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/50 rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed text-[13px]">{m.text}</p>
                    <span
                      className={`block text-[10px] mt-1 text-right ${
                        m.sender === 'user' ? 'text-sky-100' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {m.time}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span>AI assistant is querying records...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            {chips.length > 0 && !isLoading && (
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex gap-1.5 overflow-x-auto no-scrollbar">
                {chips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
                  >
                    ✨ {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about attendance, shifts, leaves..."
                className="flex-1 text-xs bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white flex items-center justify-center transition shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
