
import React, { useState, useEffect } from 'react';
import { GamePhase } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamePhase: GamePhase;
  onToggleSetup: () => void;
  autoCoachEnabled: boolean;
  onToggleCoach: () => void;
  influenceEnabled: boolean;
  onToggleInfluence: () => void;
  stoneFacesEnabled: boolean;
  onToggleStoneFaces: () => void;
  boardSize: number;
  onBoardSizeChange: (size: number) => void;
  hasProgress: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gamePhase,
  onToggleSetup,
  autoCoachEnabled,
  onToggleCoach,
  influenceEnabled,
  onToggleInfluence,
  stoneFacesEnabled,
  onToggleStoneFaces,
  boardSize,
  onBoardSizeChange,
  hasProgress
}) => {
  const [pendingSize, setPendingSize] = useState<number | null>(null);

  // Reset internal state when modal opens/closes
  useEffect(() => {
    setPendingSize(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDisplaySize = pendingSize || boardSize;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚙️</div>
            <h2 className="text-lg font-bold text-slate-800">Game Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Board Size */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">Board Size</span>
              <span className="text-xs text-slate-500">
                {hasProgress ? "Changing size will reset your current game." : "Choose the board dimensions."}
              </span>
            </div>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {[9, 13, 19].map((size) => (
                <button
                  key={size}
                  onClick={() => setPendingSize(size)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    currentDisplaySize === size 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>

            {/* Confirmation Area */}
            {pendingSize !== null && pendingSize !== boardSize && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 animate-in slide-in-from-top-2 flex flex-col gap-2">
                <p className="text-[11px] text-amber-800 font-bold text-center">
                  Changing to {pendingSize}x{pendingSize} will clear your current board!
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPendingSize(null)}
                    className="flex-1 py-2 bg-white border border-amber-200 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                        onBoardSizeChange(pendingSize);
                        setPendingSize(null);
                    }}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors active:scale-95"
                  >
                    Confirm & Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Socratic Coach */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">Socratic Coach</span>
              <span className="text-xs text-slate-500">GoBot will help you learn from mistakes.</span>
            </div>
            <button 
              onClick={onToggleCoach}
              className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${autoCoachEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${autoCoachEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Setup Mode */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">Setup Mode</span>
              <span className="text-xs text-slate-500">Place or remove stones freely.</span>
            </div>
            <button 
              onClick={onToggleSetup}
              className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${gamePhase === 'SETUP' ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${gamePhase === 'SETUP' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Influence Map */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">Influence Heatmap</span>
              <span className="text-xs text-slate-500">Visualize board control.</span>
            </div>
            <button 
              onClick={onToggleInfluence}
              className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${influenceEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${influenceEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Stone Faces */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-700">Show Stone Faces</span>
              <span className="text-xs text-slate-500">See emojis when stones are in danger.</span>
            </div>
            <button 
              onClick={onToggleStoneFaces}
              className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${stoneFacesEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${stoneFacesEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
