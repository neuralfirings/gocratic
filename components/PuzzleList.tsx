
import React from 'react';
import { Puzzle } from '../types';

interface PuzzleListProps {
    puzzles: Puzzle[];
    onSelect: (puzzle: Puzzle) => void;
}

export const PuzzleList: React.FC<PuzzleListProps> = ({ puzzles, onSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {puzzles.map((puzzle) => (
                <div 
                    key={puzzle.id} 
                    className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-4"
                    onClick={() => onSelect(puzzle)}
                >
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                            {puzzle.category === 'Capture' ? '🎯' : puzzle.category === 'Life & Death' ? '💀' : '🧩'}
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            puzzle.difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                            {puzzle.difficulty}
                        </span>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{puzzle.title}</h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{puzzle.description}</p>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                        <span className="text-xs font-semibold text-slate-400">{puzzle.category}</span>
                        <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs">
                            Start Puzzle
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
