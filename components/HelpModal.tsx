
import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎓</div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">How to use GoBot</h2>
              <p className="text-sm text-slate-500">Your AI-powered Go tutor</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: The Coach */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl border border-amber-200">
              🤔
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">The Socratic Coach</h3>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                GoBot isn't just an opponent; it's a teacher. If you play a move that loses points or misses a big opportunity, 
                the <strong>Mentor Banner</strong> will appear at the top of the board.
              </p>
              <div className="mt-3 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 font-medium">
                Tip: Click the banner or the robot icon to open the chat and discuss <em>why</em> the move was bad!
              </div>
            </div>
          </div>

          {/* Section 2: Chat & hints */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl border border-indigo-200">
              💡
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Chat & Hints</h3>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                Stuck? You can ask GoBot anything in the chat.
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">Hints Button</span>
                  <span>Shows the top AI-suggested moves on the board as circles.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">Explain Move</span>
                  <span>Ask GoBot to analyze the last move played.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3: Opponents */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl border border-emerald-200">
              ⚔️
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Adjustable Difficulty</h3>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                You can adjust the engine strength to match your skill level using the dropdown menu.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="font-bold text-slate-700 text-sm mb-1">Standard (Level 1-10)</div>
                  <p className="text-xs text-slate-500">
                    Traditional strength settings. Level 10 is the strongest.
                  </p>
                </div>
                
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                   <div className="font-bold text-slate-700 text-sm mb-1">Beginner (Level -1 to -5)</div>
                   <p className="text-xs text-slate-500">
                     Special "soft" modes for learning.
                     <br/>
                     <span className="font-semibold text-slate-600">• Level -1:</span> Plays 2nd best move.
                     <br/>
                     <span className="font-semibold text-slate-600">• Level -2:</span> Plays 3rd best move.
                     <br/>
                     (And so on, making the opponent easier without playing randomly).
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Controls */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200">
              🛠️
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Tools & Modes</h3>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <li><strong>Undo/Redo:</strong> Navigate history freely.</li>
                <li><strong>Setup Mode:</strong> Place stones freely to create puzzles or "what-if" scenarios.</li>
                <li><strong>Force AI:</strong> Make the AI play immediately if it's waiting.</li>
                <li><strong>Save/Load:</strong> Export games to SGF files to review later.</li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            Got it, let's play!
          </button>
        </div>

      </div>
    </div>
  );
};
