
import React from 'react';
import { BoardState, GameResult } from '../types';

interface ScoreBarProps {
    board: BoardState;
    gameResult: GameResult | null;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ board, gameResult }) => {
    return (
        <div className="w-full bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all text-sm ${board.turn === 'BLACK' ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-200' : 'text-slate-700 bg-slate-50'}`}>
                <span>Black</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1 border border-white/10">{board.captures.BLACK}</span>
            </div>

            <div className="text-sm font-bold text-slate-500">
                    {board.gameOver ? (
                    <span className="text-indigo-600 font-bold animate-pulse px-3 py-1 bg-indigo-50 rounded-full">
                        {gameResult?.winner === 'BLACK' ? 'Black Wins!' : 'White Wins!'}
                    </span>
                ) : (
                    <span className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                        {board.turn === 'BLACK' ? "Your Turn" : "AI Turn"}
                    </span>
                )}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all text-sm ${board.turn === 'WHITE' ? 'bg-white text-indigo-600 shadow-md ring-2 ring-indigo-100 border border-indigo-200' : 'text-slate-700 bg-slate-50'}`}>
                <span>White</span>
                <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded ml-1 text-slate-700 border border-slate-300">{board.captures.WHITE}</span>
            </div>
        </div>
    );
};
