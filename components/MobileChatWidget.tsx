
import React from 'react';
import { SenseiChat, ChatAction } from './SenseiChat';
import { ChatMessage } from '../types';

interface MobileChatWidgetProps {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  unreadMsg: string | null;
  previewDismissed: boolean;
  onDismissPreview: () => void;
  isSenseiThinking: boolean;
  isWaitingForCorrection: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  senseiModel: string;
  onModelChange: (model: string) => void;
  chatActions: ChatAction[];
}

export const MobileChatWidget: React.FC<MobileChatWidgetProps> = ({
  isChatOpen,
  setIsChatOpen,
  unreadMsg,
  previewDismissed,
  onDismissPreview,
  isSenseiThinking,
  isWaitingForCorrection,
  messages,
  onSendMessage,
  senseiModel,
  onModelChange,
  chatActions
}) => {
  const shouldShowBubble = !isChatOpen && !previewDismissed && (unreadMsg || (isWaitingForCorrection && isSenseiThinking));

  return (
    <>
      {/* Floating Notification Bubble */}
      {shouldShowBubble && (
          <div 
            className="lg:hidden fixed bottom-24 right-4 z-40 max-w-[280px] bg-white rounded-2xl rounded-br-sm shadow-xl border border-indigo-100 animate-in slide-in-from-bottom-4 duration-300 transition-colors"
          >
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onDismissPreview();
                  }}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-50"
                  aria-label="Close notification"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
              </button>
              
              <div 
                  onClick={() => setIsChatOpen(true)}
                  className="p-4 pr-8 cursor-pointer hover:bg-slate-50 rounded-2xl rounded-br-sm min-h-[3rem] flex items-center"
              >
                  <div className="flex items-start gap-3 w-full">
                      <div className="text-2xl shrink-0">🤖</div>
                      
                      {isWaitingForCorrection && isSenseiThinking ? (
                         <div className="flex space-x-1 py-1">
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                         </div>
                      ) : (
                         <div className="text-sm text-slate-700 line-clamp-2">
                             {unreadMsg}
                         </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Floating Action Button (FAB) */}
      {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center text-white hover:bg-indigo-700 transition-transform active:scale-95"
            aria-label="Open Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            {/* Unread indicator dot */}
            {(unreadMsg || (isWaitingForCorrection && isSenseiThinking)) && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>
      )}

      {/* Mobile Modal Overlay */}
      {isChatOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
              {/* Tap backdrop to close */}
              <div className="absolute inset-0" onClick={() => setIsChatOpen(false)}></div>
              
              <div className="relative w-full h-[85vh] sm:h-[600px] sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 flex flex-col">
                  <SenseiChat 
                      messages={messages}
                      loading={isSenseiThinking}
                      onSendMessage={onSendMessage}
                      senseiModel={senseiModel}
                      onModelChange={onModelChange}
                      className="h-full border-none rounded-none shadow-none"
                      onClose={() => setIsChatOpen(false)}
                      actions={chatActions}
                      isActive={isWaitingForCorrection}
                  />
              </div>
          </div>
      )}
    </>
  );
};
