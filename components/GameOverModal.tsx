
import React from 'react';
import { GameResult } from '../types';

interface GameOverModalProps {
  isOpen: boolean;
  result: GameResult | null;
  onClose: () => void;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, result, onClose, onNewGame }) => {
  if (!isOpen || !result) return null;

  const { winner, reason, score } = result;
  const winnerName = winner === 'BLACK' ? 'Black' : 'White';
  const loserName = winner === 'BLACK' ? 'White' : 'Black';
  
  let title = "Game Over!";
  let emoji = "🏁";
  let reasonText = "";
  let scoreArea = null;

  if (reason === 'SCORING') {
    reasonText = "Both sides passed.";
    scoreArea = (
        <div className="py-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-2xl font-bold text-indigo-700">
            {winnerName} wins
            </p>
            <p className="text-indigo-600 font-medium">
            by {score?.diff ?? 0} points
            </p>
            <div className="mt-2 pt-2 border-t border-indigo-200/50">
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                Chinese Area Scoring
            </p>
            </div>
        </div>
    );
  } else if (reason === 'RESIGNATION') {
    reasonText = `${loserName} Resigns.`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
       <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
         <div className="text-center space-y-5">
           <div className="text-5xl mb-2">{emoji}</div>
           
           <div className="space-y-1">
             <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
             <p className="text-lg text-slate-600 font-medium">
               {reasonText}
             </p>
           </div>
           
           {scoreArea}

           <div className="flex flex-col gap-3 pt-2">
             <button 
               onClick={onNewGame}
               className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
             >
               Start New Game
             </button>
             <button 
               onClick={onClose}
               className="w-full px-4 py-2 text-slate-500 font-bold hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
             >
               Back
             </button>
           </div>
         </div>
       </div>
    </div>
  );
};
