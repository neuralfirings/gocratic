import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface SenseiChatProps {
  messages: ChatMessage[];
  loading: boolean;
  onAskHelp: () => void;
  hintCount: number;
}

export const SenseiChat: React.FC<SenseiChatProps> = ({ messages, loading, onAskHelp, hintCount }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[500px] w-full lg:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-2xl border-2 border-white">
          🐼
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Panda Sensei</h2>
          <p className="text-indigo-200 text-xs">Always here to help!</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <p>Start playing!</p>
            <p className="text-sm">Tap "Ask Sensei" if you get stuck.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                ${msg.sender === 'user' 
                  ? 'bg-indigo-500 text-white rounded-br-none' 
                  : 'bg-white text-slate-700 shadow-sm border border-slate-200 rounded-bl-none'}
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

      {/* Actions */}
      <div className="p-4 bg-white border-t border-slate-100">
        <button
          onClick={onAskHelp}
          disabled={loading}
          className={`
            w-full py-3 px-4 rounded-xl font-bold text-white shadow-md transition-all
            flex items-center justify-center gap-2
            ${loading 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-amber-500 hover:bg-amber-600 hover:scale-[1.02] active:scale-95'}
          `}
        >
          <span>💡</span>
          {hintCount === 0 ? "I'm stuck, help!" : hintCount === 1 ? "Can you be more specific?" : "Just tell me where!"}
        </button>
      </div>
    </div>
  );
};