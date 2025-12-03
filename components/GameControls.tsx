
import React, { useState } from 'react';
import { BoardState, EngineStatus, GamePhase, SetupTool } from '../types';

interface GameControlsProps {
    opponentModel: string | number;
    setOpponentModel: (val: string | number) => void;
    gamePhase: GamePhase;
    setGamePhase: (p: GamePhase) => void;
    engineStatus: EngineStatus;
    board: BoardState;
    onCancelAi: () => void;
    onForceAi: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onPass: () => void;
    onResign: () => void;
    historyLength: number;
    redoLength: number;
    confirmationPending: 'RESET' | 'RESIGN' | null;
    setConfirmationPending: (val: 'RESET' | 'RESIGN' | null) => void;
    setupTool: SetupTool;
    setSetupTool: (t: SetupTool) => void;
    onToggleBestMoves: () => void;
    onClearMarks: () => void;
    showBestMoves: boolean;
    autoCoachEnabled: boolean;
    onToggleAutoCoach: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
    opponentModel,
    setOpponentModel,
    gamePhase,
    setGamePhase,
    engineStatus,
    board,
    onCancelAi,
    onForceAi,
    onUndo,
    onRedo,
    onPass,
    onResign,
    historyLength,
    redoLength,
    confirmationPending,
    setConfirmationPending,
    setupTool,
    setSetupTool,
    onToggleBestMoves,
    onClearMarks,
    showBestMoves,
    autoCoachEnabled,
    onToggleAutoCoach
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="w-full bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 min-h-[4rem] justify-center transition-all relative z-10 box-border">
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                
                {/* Left: Opponent & Mode Toggle & Thinking Status */}
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">

                    {/* Auto-Coach Toggle */}
                    <div className="flex items-center gap-2 mr-2 cursor-pointer" onClick={onToggleAutoCoach}>
                        <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap select-none">Coach</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ease-in-out shrink-0 ${autoCoachEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${autoCoachEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    </div>


                    <select 
                        value={opponentModel}
                        onChange={(e) => setOpponentModel(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium truncate max-w-[120px] md:max-w-[180px]"
                    >
                            <option value="gnugo_-5">GNU Go Lvl -5</option>
                            <option value="gnugo_-4">GNU Go Lvl -4</option>
                            <option value="gnugo_-3">GNU Go Lvl -3</option>
                            <option value="gnugo_-2">GNU Go Lvl -2</option>
                            <option value="gnugo_-1">GNU Go Lvl -1</option>
                            <option value="gnugo_1">GNU Go Lvl 1</option>
                            <option value="gnugo_2">GNU Go Lvl 2</option>
                            <option value="gnugo_3">GNU Go Lvl 3</option>
                            <option value="gnugo_4">GNU Go Lvl 4</option>
                            <option value="gnugo_5">GNU Go Lvl 5</option>
                            <option value="gnugo_6">GNU Go Lvl 6</option>
                            <option value="gnugo_7">GNU Go Lvl 7</option>
                            <option value="gnugo_8">GNU Go Lvl 8</option>
                            <option value="gnugo_9">GNU Go Lvl 9</option>
                            <option value="gnugo_10">GNU Go Lvl 10</option>
                    </select>

                    {/* Inline Thinking Indicator */}
                    {engineStatus === 'THINKING' ? (
                        <div className="hidden sm:flex items-center gap-2 ml-2 text-xs font-bold text-indigo-600 animate-pulse whitespace-nowrap">
                            <span>⏳ Thinking...</span>
                            <button onClick={onCancelAi} className="text-red-500 hover:text-red-700 underline text-[10px]">
                                Cancel
                            </button>
                        </div>
                    ) : (board.turn === 'WHITE' && !board.gameOver) ? (
                            <button onClick={onForceAi} className="ml-2 hidden sm:block text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase whitespace-nowrap">
                            Force AI
                            </button>
                    ) : null}
                </div>

                {/* Right: Actions (Desktop) - Hidden on md- */}
                <div className="hidden md:flex items-center gap-2">

                    {/* Setup Toggle */}
                    <button 
                        onClick={() => setGamePhase(gamePhase === 'PLAY' ? 'SETUP' : 'PLAY')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${gamePhase === 'SETUP' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}`}
                    >
                        Setup
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button 
                        onClick={onToggleBestMoves} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${showBestMoves ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}`}>
                        Hints
                    </button>
                    
                    <button 
                        onClick={onClearMarks}
                        className="text-xs p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg"
                        title="Clear Marks"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button onClick={onUndo} disabled={historyLength === 0} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50" title="Undo">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={onRedo} disabled={redoLength === 0} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50" title="Redo">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75h2.875a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <button onClick={onPass} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300">
                        Pass
                    </button>
                    <button 
                        onClick={() => confirmationPending === 'RESIGN' ? onResign() : setConfirmationPending('RESIGN')} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            confirmationPending === 'RESIGN'
                            ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                        }`}
                    >
                        {confirmationPending === 'RESIGN' ? 'Confirm?' : 'Resign'}
                    </button>
                </div>

                {/* Mobile Menu Button (md:hidden) */}
                <button 
                   onClick={() => setIsMenuOpen(!isMenuOpen)}
                   className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                   aria-label="Menu"
                >
                   {isMenuOpen ? (
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                       </svg>
                   ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                       </svg>
                   )}
                </button>
            </div>

            {/* Mobile Expanded Menu */}
            {isMenuOpen && (
                <div className="md:hidden mt-2 pt-3 border-t border-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1">
                    
                    {/* Status if thinking */}
                    {engineStatus === 'THINKING' && (
                        <div className="flex items-center justify-between text-xs font-bold text-indigo-600 animate-pulse bg-indigo-50 p-2 rounded-lg">
                            <span>⏳ AI Thinking...</span>
                            <button onClick={onCancelAi} className="text-red-500 underline">Cancel</button>
                        </div>
                    )}

                    {/* Toggles Row */}
                    <div className="flex items-center justify-between gap-2">

                        {/* Setup Toggle */}
                        <button 
                            onClick={() => setGamePhase(gamePhase === 'PLAY' ? 'SETUP' : 'PLAY')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${gamePhase === 'SETUP' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            Setup
                        </button>

                        {/* Hints */}
                        <button 
                            onClick={onToggleBestMoves}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${showBestMoves ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            Hints {showBestMoves ? 'ON' : 'OFF'}
                        </button>

                        {/* Force AI */}
                        {(board.turn === 'WHITE' && !board.gameOver && engineStatus !== 'THINKING') && (
                             <button onClick={onForceAi} className="flex-1 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 text-indigo-600 bg-white">
                                Force AI
                             </button>
                        )}
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-5 gap-2">
                        <button onClick={onClearMarks} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500" title="Clear Marks">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                        </button>
                        <button onClick={onUndo} disabled={historyLength === 0} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 disabled:opacity-50" title="Undo">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={onRedo} disabled={redoLength === 0} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 disabled:opacity-50" title="Redo">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75h2.875a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={onPass} className="px-1 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                            Pass
                        </button>
                        <button 
                            onClick={() => confirmationPending === 'RESIGN' ? onResign() : setConfirmationPending('RESIGN')} 
                            className={`px-1 py-1 rounded-lg text-xs font-bold border ${confirmationPending === 'RESIGN' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-100'}`}
                        >
                            {confirmationPending === 'RESIGN' ? '??' : 'Resign'}
                        </button>
                    </div>
                </div>
            )}

            {/* Setup Tools */}
            {gamePhase === 'SETUP' && (
                <div className="flex gap-1 p-1 bg-slate-50 rounded-lg animate-in fade-in slide-in-from-top-1">
                    {(['ALTERNATE', 'BLACK_ONLY', 'WHITE_ONLY', 'CLEAR'] as SetupTool[]).map(tool => (
                        <button
                            key={tool}
                            onClick={() => setSetupTool(tool)}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded shadow-sm border ${setupTool === tool ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {tool.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
