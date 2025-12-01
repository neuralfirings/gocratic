

import React, { useRef } from 'react';
import { BoardState } from '../types';
import { toGtpCoordinate } from '../services/gtpUtils';

interface NavbarProps {
  board: BoardState;
  gameMode: string;
  sessionCost: number;
  confirmationPending: 'RESET' | 'RESIGN' | null;
  setConfirmationPending: (val: 'RESET' | 'RESIGN' | null) => void;
  onReset: () => void;
  onSave: () => void;
  onLoadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCopyGnu: (msg: string) => void; // Pass a callback to show success message
}

export const Navbar: React.FC<NavbarProps> = ({
  board,
  gameMode,
  sessionCost,
  confirmationPending,
  setConfirmationPending,
  onReset,
  onSave,
  onLoadFile,
  onCopyGnu
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadGameTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleCopyGnuArray = () => {
    const moves = board.history.map(h => {
        const color = h.color === 'BLACK' ? 'B' : 'W';
        const coord = toGtpCoordinate(h.coordinate, board.size);
        return `${color} ${coord}`;
    });
    
    const output = JSON.stringify(moves, null, 2);
    navigator.clipboard.writeText(output);
    onCopyGnu("Copied game array to clipboard!");
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="text-3xl">🤖</div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">GoCratic</h1>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => {
                        if (board.history.length === 0 && !board.gameOver) {
                            onReset(); 
                        } else {
                            confirmationPending === 'RESET' ? onReset() : setConfirmationPending('RESET');
                        }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        confirmationPending === 'RESET' 
                        ? 'bg-red-600 text-white border-red-600 animate-pulse' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {confirmationPending === 'RESET' ? 'Confirm Reset?' : 'New Game'}
                </button>
                <button 
                    onClick={onSave} 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                    Save SGF
                </button>
                <button 
                    onClick={handleLoadGameTrigger} 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                    Load SGF
                </button>
                <button 
                    onClick={handleCopyGnuArray} 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                    Copy GNUGo
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={onLoadFile} 
                    accept=".sgf" 
                    className="hidden" 
                />
            </div>
         </div>

         <div className="flex items-center gap-4 text-sm">
            <div className="hidden md:block px-3 py-1 bg-slate-100 rounded-full text-slate-600 font-medium text-xs">
                {gameMode === 'FREE' ? 'Free Play' : 'Puzzle Mode'}
            </div>
            {sessionCost > 0 && (
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold border border-emerald-100 text-xs">
                    ${sessionCost.toFixed(4)}
                </div>
            )}
         </div>
    </div>
  );
};