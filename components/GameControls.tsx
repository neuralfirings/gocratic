
import React from 'react';
import { BoardState, EngineStatus, GamePhase, SetupTool, StoneColor } from '../types';

interface GameControlsProps {
    opponentModel: string | number;
    setOpponentModel: (val: string | number) => void;
    gamePhase: GamePhase;
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
    showBestMoves: boolean;
    onOpenSettings: () => void;
    onSetTurn?: (color: StoneColor) => void;
    onExitSetup?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
    opponentModel,
    setOpponentModel,
    gamePhase,
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
    showBestMoves,
    onOpenSettings,
    onSetTurn,
    onExitSetup
}) => {
    return (
        <div className="w-full bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 relative z-10 box-border">
            {/* Control Bar Strict Order: Level -> Hints -> Settings -> Undo/Redo -> Force AI -> Actions (Pass/Resign) */}
            <div className="flex flex-wrap items-center gap-2 w-full">
                
                {/* 1. Level Selector */}
                <div className="flex items-center gap-2 min-w-0">
                    <select 
                        value={opponentModel}
                        onChange={(e) => setOpponentModel(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold truncate max-w-[130px] shadow-sm"
                    >
                        <option value="human">👤 Human v. Human</option>
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
                </div>

                <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

                {/* 2. Hints Toggle (styled as clear toggle state) */}
                <button 
                    onClick={onToggleBestMoves}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                        showBestMoves 
                        ? 'bg-amber-500 text-white border-amber-600 shadow-inner' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <div className={`w-3 h-3 rounded-full border-2 ${showBestMoves ? 'bg-white border-white animate-pulse' : 'bg-transparent border-slate-300'}`} />
                    Hints
                </button>

                {/* 3. Settings Button (Text Only) */}
                <button 
                    onClick={onOpenSettings}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                    Settings
                </button>

                {/* 4. History Controls (Undo/Redo) */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 shadow-sm">
                    <button 
                        onClick={onUndo} 
                        disabled={historyLength === 0} 
                        className="p-1.5 hover:bg-white text-slate-600 rounded-md disabled:opacity-30 transition-all active:scale-90" 
                        title="Undo"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button 
                        onClick={onRedo} 
                        disabled={redoLength === 0} 
                        className="p-1.5 hover:bg-white text-slate-600 rounded-md disabled:opacity-30 transition-all active:scale-90" 
                        title="Redo"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75h2.875a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* 5. Force AI (Directly to the right of Undo/Redo) */}
                <div className="flex items-center gap-1.5 min-w-max">
                    {engineStatus === 'THINKING' ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-600 animate-pulse whitespace-nowrap">
                            <span>⏳ thinking...</span>
                            <button onClick={onCancelAi} className="text-red-500 underline ml-1 hover:text-red-700 transition-colors">Cancel</button>
                        </div>
                    ) : (gamePhase === 'PLAY' && board.turn === 'WHITE' && !board.gameOver && opponentModel !== 'human') ? (
                        <button 
                            onClick={onForceAi} 
                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold transition-all active:scale-95 whitespace-nowrap shadow-sm"
                        >
                            Force AI
                        </button>
                    ) : null}
                </div>

                {/* 6. Game Actions (Pass/Resign - Right aligned) */}
                <div className="flex items-center gap-1.5 flex-1 justify-end min-w-[140px]">
                    <button 
                        onClick={onPass} 
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition-all active:scale-95 shadow-sm"
                    >
                        Pass
                    </button>
                    <button 
                        onClick={() => confirmationPending === 'RESIGN' ? onResign() : setConfirmationPending('RESIGN')} 
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all active:scale-95 shadow-sm whitespace-nowrap ${
                            confirmationPending === 'RESIGN'
                            ? 'bg-red-600 text-white border-red-600 animate-pulse'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                        }`}
                    >
                        {confirmationPending === 'RESIGN' ? 'Confirm?' : 'Resign'}
                    </button>
                </div>
            </div>

            {/* Setup Tools (Only visible if Setup Mode is active) */}
            {gamePhase === 'SETUP' && (
                <div className="flex flex-col sm:flex-row gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-1 items-center">
                    {/* Setup Stone Tools */}
                    <div className="flex-1 flex gap-1 p-1 bg-white border border-slate-200 rounded-lg w-full">
                        {(['ALTERNATE', 'BLACK_ONLY', 'WHITE_ONLY', 'CLEAR'] as SetupTool[]).map(tool => (
                            <button
                                key={tool}
                                onClick={() => setSetupTool(tool)}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${setupTool === tool ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                                {tool.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

                    {/* Turn Selector Tool */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-tight whitespace-nowrap">Next Move:</span>
                        <div className="flex flex-1 gap-1">
                          {(['BLACK', 'WHITE'] as StoneColor[]).map(color => (
                              <button
                                  key={color}
                                  onClick={() => onSetTurn?.(color)}
                                  className={`flex-1 px-4 py-1.5 text-[10px] font-bold rounded transition-all flex items-center justify-center gap-2 ${board.turn === color ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                              >
                                  <div className={`w-2.5 h-2.5 rounded-full border ${color === 'BLACK' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`} />
                                  {color}
                              </button>
                          ))}
                        </div>
                    </div>

                    <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

                    {/* Done Button */}
                    <button 
                        onClick={onExitSetup}
                        className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
};
