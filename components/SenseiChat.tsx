

import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

interface SenseiChatProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  senseiModel: string;
  onModelChange: (model: string) => void;
  className?: string; // Allow external styling
  onClose?: () => void; // Optional close handler for mobile modal
}

export const SenseiChat: React.FC<SenseiChatProps> = ({ 
  messages, 
  loading, 
  onSendMessage,
  senseiModel,
  onModelChange,
  className = "",
  onClose
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleQuickAction = (text: string) => {
    if (!loading) {
      onSendMessage(text);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-indigo-600 p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl sm:text-2xl border-2 border-white">
            🤖
            </div>
            <div>
            <h2 className="text-white font-bold text-base sm:text-lg leading-tight">GoBot</h2>
            <p className="text-indigo-200 text-[10px] sm:text-xs">AI Tutor</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Model Selector */}
            <select 
                value={senseiModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="text-xs bg-indigo-700 text-white border border-indigo-500 rounded px-2 py-1 outline-none hover:bg-indigo-600 focus:ring-1 focus:ring-indigo-300 transition max-w-[100px] sm:max-w-none"
            >
                <option value="gemini-flash-lite-latest">2.0 Flash Lite</option>
                <option value="gemini-2.5-flash">2.5 Flash</option>
                <option value="gemini-3-pro-preview">3.0 Pro</option>
            </select>

            {/* Mobile Close Button */}
            {onClose && (
                <button 
                    onClick={onClose}
                    className="lg:hidden w-8 h-8 flex items-center justify-center bg-indigo-700 hover:bg-indigo-800 text-white rounded-full transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <p>Start playing!</p>
            <p className="text-sm">Type below if you have questions.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                ${msg.sender === 'user' 
                  ? 'bg-indigo-500 text-white rounded-br-none' 
                  : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-100 shrink-0 pb-safe">
        
        {/* Quick Actions */}
        <div className="px-3 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => handleQuickAction("Give me a hint")}
            disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full transition-colors border border-indigo-200 disabled:opacity-50"
          >
            💡 Give me a hint
          </button>
          <button 
            onClick={() => handleQuickAction("Explain your last move")}
            disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-full transition-colors border border-amber-200 disabled:opacity-50"
          >
            🤔 Explain last move
          </button>
        </div>

        <div className="p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask specific questions..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md shrink-0
                ${!input.trim() || loading 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 pl-0.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};