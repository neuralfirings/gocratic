
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';

export interface ChatAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface SenseiChatProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  senseiModel: string;
  onModelChange: (model: string) => void;
  className?: string; // Allow external styling
  onClose?: () => void; // Optional close handler for mobile modal
  actions?: ChatAction[]; // New prop for contextual buttons
  isActive?: boolean; // New prop to highlight the chat window
  onMessageClick?: (moveNumber: number) => void; // New prop for history interaction
}

export const SenseiChat: React.FC<SenseiChatProps> = ({ 
  messages, 
  loading, 
  onSendMessage,
  senseiModel,
  onModelChange,
  className = "",
  onClose,
  actions = [],
  isActive = false,
  onMessageClick
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, actions]);

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

  // Dynamic classes for the container
  const containerClasses = `flex flex-col h-full w-full bg-white rounded-xl overflow-hidden transition-all duration-300 ${className} ${
    isActive 
      ? "ring-4 ring-amber-300 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" 
      : "shadow-xl border border-slate-200"
  }`;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className={`p-3 sm:p-4 flex items-center justify-between shrink-0 transition-colors duration-300 ${isActive ? 'bg-amber-500' : 'bg-indigo-600'}`}>
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xl sm:text-2xl border-2 border-white ${isActive ? 'bg-amber-100' : 'bg-indigo-100'}`}>
            🤖
            </div>
            <div>
            <h2 className="text-white font-bold text-base sm:text-lg leading-tight">GoBot</h2>
            <p className={`text-[10px] sm:text-xs ${isActive ? 'text-amber-100 font-bold animate-pulse' : 'text-indigo-200'}`}>
                {isActive ? "Needs your attention!" : "AI Tutor"}
            </p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Model Selector */}
            <select 
                value={senseiModel}
                onChange={(e) => onModelChange(e.target.value)}
                className={`text-xs text-white border rounded px-2 py-1 outline-none focus:ring-1 transition max-w-[100px] sm:max-w-none ${
                    isActive 
                    ? 'bg-amber-600 border-amber-400 focus:ring-amber-200 hover:bg-amber-50' 
                    : 'bg-indigo-700 border-indigo-500 focus:ring-indigo-300 hover:bg-indigo-600'
                }`}
            >
                <option value="gemini-flash-lite-latest">2.0 Flash Lite</option>
                <option value="gemini-2.5-flash">2.5 Flash</option>
                <option value="gemini-3-pro-preview">3.0 Pro</option>
            </select>

            {/* Mobile Close Button */}
            {onClose && (
                <button 
                    onClick={onClose}
                    className={`lg:hidden w-8 h-8 flex items-center justify-center text-white rounded-full transition-colors ${
                        isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-700 hover:bg-indigo-800'
                    }`}
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
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Message Bubble */}
            <div 
              onClick={() => onMessageClick && msg.moveNumber > 0 && onMessageClick(msg.moveNumber)}
              className={`
                max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm relative group
                ${msg.sender === 'user' 
                  ? 'bg-indigo-500 text-white rounded-br-none' 
                  : isActive 
                    ? 'bg-amber-50 text-slate-800 border-l-4 border-amber-400 rounded-bl-none shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
                ${onMessageClick && msg.moveNumber > 0 ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}
              `}
            >
              <div className="flex flex-col gap-1">
                  {/* Move Indicator Header */}
                  {msg.moveNumber > 0 && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          (Move {msg.moveNumber})
                      </span>
                  )}
                  <span>{msg.text}</span>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className={`p-3 rounded-2xl rounded-bl-none shadow-sm border ${isActive ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="flex space-x-1">
                <div className={`w-2 h-2 rounded-full animate-bounce ${isActive ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ animationDelay: '0ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${isActive ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ animationDelay: '150ms' }} />
                <div className={`w-2 h-2 rounded-full animate-bounce ${isActive ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area / Action Area */}
      <div className="bg-white border-t border-slate-100 shrink-0 pb-safe">
        
        {/* Contextual Actions (Top priority) */}
        {actions && actions.length > 0 && (
          <div className="px-4 pt-4 pb-2 flex flex-wrap gap-2 justify-center bg-indigo-50/50 animate-in slide-in-from-bottom-2 fade-in">
             {actions.map((action, idx) => (
                <button 
                  key={idx}
                  onClick={action.onClick}
                  // Removed disabled={loading} here to allow interruption (Undo/Continue) while thinking
                  className={`
                    px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95
                    ${action.variant === 'secondary' 
                      ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50' 
                      : action.variant === 'danger'
                      ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent'}
                  `}
                >
                  {action.label}
                </button>
             ))}
          </div>
        )}

        {/* Quick Actions (Only show if no contextual actions preventing play) */}
        {(!actions || actions.length === 0) && (
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
        )}

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
}
