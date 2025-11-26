
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat } from './components/SenseiChat';
import { createBoard, placeStone, setStone, calculateAreaScore } from './services/gameLogic';
import { generateMove, getLevelSimulations } from './services/simpleAi';
import { getGeminiMove } from './services/geminiEngine';
import { fetchGnuGoMove } from './services/gnugoService';
import { getSenseiResponse } from './services/aiService';
import { toGtpCoordinate, fromGtpCoordinate } from './services/gtpUtils';
import { BoardState, Coordinate, ChatMessage, Marker, EngineStatus, GamePhase, SetupTool, StoneColor, GameResult } from './types';

export default function App() {
  const [gameMode, setGameMode] = useState<'FREE' | 'PUZZLE'>('FREE');
  const [board, setBoard] = useState<BoardState>(createBoard(9));
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  // Messages now include moveNumber to track context
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'sensei',
    text: "Welcome! I'm Panda Sensei. Let's play Go! Ask me anything about the game.",
    moveNumber: 0
  }]);
  
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  
  // Engine State
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('READY');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Opponent Config
  const [opponentModel, setOpponentModel] = useState<string | number>("gnugo-1"); 

  // Sensei Config
  const [senseiModel, setSenseiModel] = useState<string>("gemini-3-pro-preview");
  const [isSenseiThinking, setIsSenseiThinking] = useState(false);

  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  // Cost Tracking
  const [sessionCost, setSessionCost] = useState<number>(0);

  // Undo/Redo Stacks
  const [historyStack, setHistoryStack] = useState<BoardState[]>([]);
  const [redoStack, setRedoStack] = useState<BoardState[]>([]);

  // Setup Mode State
  const [gamePhase, setGamePhase] = useState<GamePhase>('PLAY');
  const [setupTool, setSetupTool] = useState<SetupTool>('ALTERNATE');

  // Confirmation State (replaces window.confirm)
  const [confirmationPending, setConfirmationPending] = useState<'RESET' | 'RESIGN' | null>(null);

  // File Input Ref for Load Game
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-clear confirmation state after 3 seconds
  useEffect(() => {
    if (confirmationPending) {
        const timer = setTimeout(() => setConfirmationPending(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [confirmationPending]);

  const addMessage = (sender: 'user' | 'sensei', text: string) => {
    const moveNumber = board.history.length;
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      sender, 
      text,
      moveNumber
    }]);
  };

  const pushHistory = (currentState: BoardState) => {
      setHistoryStack(prev => [...prev, currentState]);
      setRedoStack([]); // Clear redo stack on new action
  };

  const getGhostColor = (): StoneColor | 'ERASER' => {
      if (gamePhase === 'SETUP') {
          if (setupTool === 'WHITE_ONLY') return 'WHITE';
          if (setupTool === 'BLACK_ONLY') return 'BLACK';
          if (setupTool === 'CLEAR') return 'ERASER';
      }
      return board.turn;
  };

  const endGameWithScore = (finalBoard: BoardState) => {
      const result = calculateAreaScore(finalBoard);
      setGameResult({
          winner: result.winner,
          reason: 'SCORING',
          score: result
      });
      setBoard(prev => ({ ...prev, gameOver: true }));
      addMessage('sensei', `Game Over! ${result.winner === 'BLACK' ? 'Black' : 'White'} wins by ${result.diff.toFixed(1)} points.`);
  };

  const triggerAiMove = useCallback(async (currentBoard: BoardState) => {
    if (currentBoard.gameOver) return;
    
    setEngineStatus('THINKING');
    
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        let move: Coordinate | null = null;
        let explanation: string | null = null;
        let moveCost = 0;
        let aiResigned = false;
        let aiPassed = false;

        if (typeof opponentModel === 'string') {
            if (opponentModel.startsWith('gnugo-')) {
                // GNU Go Handler
                const level = parseInt(opponentModel.split('-')[1], 10) || 10;
                const result = await fetchGnuGoMove(currentBoard, level);
                if (controller.signal.aborted) return;
                
                if (result.isResign) {
                    aiResigned = true;
                    explanation = "GNU Go resigns.";
                } else if (result.isPass) {
                    aiPassed = true;
                    explanation = "GNU Go passes.";
                } else {
                    move = result.move;
                    explanation = `GNU Go (Level ${level}) plays.`;
                }
            } else {
                // Gemini Handler
                const result = await getGeminiMove(currentBoard, opponentModel);
                if (controller.signal.aborted) return;

                if (result) {
                  if (result.isResign) {
                      aiResigned = true;
                      explanation = result.reason;
                      moveCost = result.cost;
                  } else if (result.isPass) {
                      aiPassed = true;
                      explanation = result.reason;
                      moveCost = result.cost;
                  } else {
                      move = result.move;
                      explanation = result.reason;
                      moveCost = result.cost;
                  }
                }
            }
        } else {
            // Monte Carlo (Local) Handler
            const simCount = getLevelSimulations(opponentModel);
            move = await generateMove(currentBoard, simCount, controller.signal);
            // Simple AI passes if no move found (null)
            if (!move) aiPassed = true;
        }
        
        if (controller.signal.aborted) return;

        setEngineStatus('READY');
        if (moveCost > 0) setSessionCost(prev => prev + moveCost);

        if (aiResigned) {
            const score = calculateAreaScore(currentBoard);
            setGameResult({ winner: 'BLACK', reason: 'RESIGNATION', score });
            setBoard(prev => ({ ...prev, gameOver: true }));
            addMessage('sensei', `White Resigns. ${explanation || ''}`);
        } else if (aiPassed) {
             addMessage('sensei', "White passes.");
             
             // Check for double pass (Game Over)
             const lastWasPass = currentBoard.history.length > 0 && currentBoard.lastMove === null;
             if (lastWasPass) {
                 endGameWithScore(currentBoard);
                 return;
             }

             // Record Pass
             setBoard(prev => {
                const nextState: BoardState = {
                    ...prev,
                    turn: 'BLACK',
                    lastMove: null, // Pass represented as null coordinate in history context usually, but here handled by just switching turn
                    history: [...prev.history, { color: 'WHITE', coordinate: { x: -1, y: -1 }, capturedCount: 0 }] 
                };
                pushHistory(prev);
                return nextState;
             });

        } else if (move) {
            setBoard(prev => {
                if (prev.history.length !== currentBoard.history.length) return prev;
                const aiState = placeStone(prev, move!);
                if (aiState) {
                    pushHistory(prev); 
                    if (explanation) setLastExplanation(explanation);
                    return aiState;
                }
                return prev;
            });
        }
    } catch (e: any) {
        if (e.message === 'Aborted' || e.name === 'AbortError') {
            if (!window.location.hostname.includes('run.app')) {
              console.log("AI Cancelled");
            }
        } else {
            console.error("Engine Generate Error", e);
            addMessage('sensei', "I'm having trouble connecting to the game server. Please try again.");
        }
        setEngineStatus('READY');
    } finally {
        if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
        }
    }
  }, [opponentModel]);

  const handleCancel = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      setEngineStatus('READY');
  };

  const handleMakeMove = () => {
      if (board.turn === 'WHITE' && engineStatus !== 'THINKING' && !board.gameOver) {
          triggerAiMove(board);
      }
  };

  const handleUserResign = () => {
        // Direct resignation without blocking confirm
        const score = calculateAreaScore(board);
        setGameResult({ winner: 'WHITE', reason: 'RESIGNATION', score });
        setBoard(prev => ({ ...prev, gameOver: true }));
        addMessage('sensei', "Black Resigns. White wins.");
        setConfirmationPending(null);
  };

  const handleUserPass = () => {
      // Check for double pass
      const lastWasPass = board.history.length > 0 && board.lastMove === null; 
      
      const nextState: BoardState = {
          ...board,
          turn: 'WHITE',
          lastMove: null,
          history: [...board.history, { color: 'BLACK', coordinate: { x: -1, y: -1 }, capturedCount: 0 }] 
      };

      pushHistory(board);
      setBoard(nextState);
      addMessage('sensei', "Black passes.");

      if (lastWasPass) {
          endGameWithScore(nextState);
      } else {
          // Trigger AI to play (or pass back)
          if (gameMode === 'FREE') {
            setTimeout(() => triggerAiMove(nextState), 50);
          }
      }
  };

  const handlePlay = useCallback(async (c: Coordinate) => {
    if (board.gameOver) return;

    // Phase 1: Setup Mode
    if (gamePhase === 'SETUP') {
        let nextState = board;
        if (setupTool === 'ALTERNATE') {
            const res = placeStone(board, c);
            if (res) nextState = res;
        } else if (setupTool === 'BLACK_ONLY') {
            nextState = setStone(board, c, 'BLACK');
        } else if (setupTool === 'WHITE_ONLY') {
            nextState = setStone(board, c, 'WHITE');
        } else if (setupTool === 'CLEAR') {
            nextState = setStone(board, c, null);
        }
        setBoard(nextState);
        return;
    }

    // Phase 2: Game Mode
    if (board.stones.has(`${c.x},${c.y}`)) return;

    const nextState = placeStone(board, c);
    
    if (!nextState) {
        // Illegal move (suicide or other rules)
        addMessage('sensei', "That move isn't allowed (Suicide rule).");
        return;
    }

    pushHistory(board);
    setBoard(nextState);

    // AI Turn Trigger
    if (gameMode === 'FREE' && !nextState.gameOver) {
        setTimeout(() => {
            if (nextState.turn === 'WHITE') {
                triggerAiMove(nextState);
            }
        }, 50);
    }
  }, [board, gameMode, gamePhase, setupTool, triggerAiMove]);

  const handleUndo = () => {
      if (historyStack.length === 0) return;
      
      const previous = historyStack[historyStack.length - 1];
      const newHistory = historyStack.slice(0, -1);
      
      setRedoStack(prev => [...prev, board]);
      setBoard(previous);
      setHistoryStack(newHistory);
      
      // If playing against AI, undo twice to get back to user turn
      // But only if the last move was indeed AI (WHITE)
      // For simplicity in this demo, strict single undo
      setEngineStatus('READY');
      if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const handleRedo = () => {
      if (redoStack.length === 0) return;

      const next = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, -1);

      setHistoryStack(prev => [...prev, board]);
      setBoard(next);
      setRedoStack(newRedo);
  };

  const handleReset = () => {
        setBoard(createBoard(board.size));
        setHistoryStack([]);
        setRedoStack([]);
        setMessages([{
        id: Date.now().toString(),
        sender: 'sensei',
        text: "Ready for a new game! Good luck!",
        moveNumber: 0
        }]);
        setGameResult(null);
        setEngineStatus('READY');
        setConfirmationPending(null);
  };

  const handleSaveGame = () => {
    // Helper to convert internal board state to the JSON schema format (GTP coordinates)
    const serializeBoard = (b: BoardState) => ({
        ...b,
        stones: Object.fromEntries(
            Array.from(b.stones.entries()).map(([key, color]) => {
                const [x, y] = key.split(',').map(Number);
                const gtp = toGtpCoordinate({x, y}, b.size);
                return [gtp, color];
            })
        ),
        lastMove: b.lastMove ? toGtpCoordinate(b.lastMove, b.size) : null,
        history: b.history.map(h => ({
            ...h,
            coordinate: toGtpCoordinate(h.coordinate, b.size)
        }))
    });

    const gameState = {
        board: serializeBoard(board),
        historyStack: historyStack.map(serializeBoard),
        redoStack: redoStack.map(serializeBoard),
        messages,
        gameMode,
        sessionCost,
        activeMarkers,
        gameResult,
        timestamp: Date.now()
    };

    const json = JSON.stringify(gameState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gocratic_save_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadGameTrigger = () => {
      fileInputRef.current?.click();
  };

  const handleLoadGameFile = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const parsed = JSON.parse(content);

              // Helper to convert JSON schema format back to internal BoardState
              const deserializeBoard = (b: any): BoardState => {
                  const newStones = new Map<string, StoneColor>();
                  if (b.stones) {
                      Object.entries(b.stones).forEach(([gtp, color]) => {
                          const coord = fromGtpCoordinate(gtp, b.size);
                          if (coord) {
                              newStones.set(`${coord.x},${coord.y}`, color as StoneColor);
                          }
                      });
                  }
                  
                  return {
                      ...b,
                      stones: newStones,
                      lastMove: b.lastMove ? fromGtpCoordinate(b.lastMove, b.size) : null,
                      history: (b.history || []).map((h: any) => ({
                          ...h,
                          // Handle passes (which might be "PASS" or null coming from GTP util)
                          coordinate: fromGtpCoordinate(h.coordinate, b.size) || { x: -1, y: -1 } 
                      }))
                  };
              };

              if (parsed.board && parsed.messages) {
                  setBoard(deserializeBoard(parsed.board));
                  setHistoryStack((parsed.historyStack || []).map(deserializeBoard));
                  setRedoStack((parsed.redoStack || []).map(deserializeBoard));
                  setMessages(parsed.messages);
                  setGameMode(parsed.gameMode || 'FREE');
                  setSessionCost(parsed.sessionCost || 0);
                  setActiveMarkers(parsed.activeMarkers || []);
                  setGameResult(parsed.gameResult || null);
                  setEngineStatus('READY');
                  addMessage('sensei', "Game loaded! Welcome back.");
              } else {
                  console.error("Invalid save file structure");
                  addMessage('sensei', "That file doesn't look like a valid GoCratic save.");
              }
          } catch (err) {
              console.error("Error parsing save file", err);
              addMessage('sensei', "I couldn't read that save file. It might be corrupted.");
          }
          // Reset input to allow reloading same file
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Navbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="text-3xl">🐼</div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">GoCratic</h1>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => {
                        if (board.history.length === 0 && !board.gameOver) {
                            handleReset(); 
                        } else {
                            confirmationPending === 'RESET' ? handleReset() : setConfirmationPending('RESET');
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
                    onClick={handleSaveGame} 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                    Save Game
                </button>
                <button 
                    onClick={handleLoadGameTrigger} 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                    Load Game
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleLoadGameFile} 
                    accept=".json" 
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

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
         
         {/* Left: Game Area */}
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center gap-4">
            
            {/* Controls (Above Board) - Compressed Vertical Height */}
            <div className="w-full bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
                
                {/* Row 2: Controls & Tools */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    
                    {/* Left: Opponent & Mode Toggle & Thinking Status */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] overflow-hidden">
                        <select 
                            value={opponentModel}
                            onChange={(e) => {
                                const val = e.target.value;
                                setOpponentModel(val);
                            }}
                            className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium truncate max-w-[120px] md:max-w-[180px]"
                        >
                            <optgroup label="Gemini AI (Cloud)">
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.5-pro-preview">Gemini 2.5 Pro</option>
                                <option value="gemini-3-pro-preview">Gemini 3.0 Pro</option>
                            </optgroup>
                            <optgroup label="GNU Go (API)">
                                <option value="gnugo-1">GNU Go Lvl 1</option>
                                <option value="gnugo-2">GNU Go Lvl 2</option>
                                <option value="gnugo-3">GNU Go Lvl 3</option>
                                <option value="gnugo-4">GNU Go Lvl 4</option>
                                <option value="gnugo-5">GNU Go Lvl 5 (Mid)</option>
                                <option value="gnugo-6">GNU Go Lvl 6</option>
                                <option value="gnugo-7">GNU Go Lvl 7</option>
                                <option value="gnugo-8">GNU Go Lvl 8</option>
                                <option value="gnugo-9">GNU Go Lvl 9</option>
                                <option value="gnugo-10">GNU Go Lvl 10 (High)</option>
                            </optgroup>
                        </select>

                        <div className="flex bg-slate-100 p-0.5 rounded-md shrink-0">
                            <button 
                                onClick={() => setGamePhase('PLAY')}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gamePhase === 'PLAY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                PLAY
                            </button>
                            <button 
                                onClick={() => setGamePhase('SETUP')}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${gamePhase === 'SETUP' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                SETUP
                            </button>
                        </div>

                        {/* Inline Thinking Indicator */}
                        {engineStatus === 'THINKING' ? (
                            <div className="flex items-center gap-2 ml-2 text-xs font-bold text-indigo-600 animate-pulse whitespace-nowrap">
                                <span>⏳ Thinking...</span>
                                <button onClick={handleCancel} className="text-red-500 hover:text-red-700 underline text-[10px]">
                                    Cancel
                                </button>
                            </div>
                        ) : (board.turn === 'WHITE' && !board.gameOver) ? (
                             <button onClick={handleMakeMove} className="ml-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase whitespace-nowrap">
                                Force AI
                             </button>
                        ) : null}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                         <button onClick={handleUndo} disabled={historyStack.length === 0} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50" title="Undo">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-50" title="Redo">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75h2.875a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.085l5.5-5.25a.75.75 0 000-1.085l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button onClick={handleUserPass} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300">
                            Pass
                        </button>
                        <button 
                            onClick={() => confirmationPending === 'RESIGN' ? handleUserResign() : setConfirmationPending('RESIGN')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                confirmationPending === 'RESIGN'
                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                                : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                            }`}
                        >
                            {confirmationPending === 'RESIGN' ? 'Confirm?' : 'Resign'}
                        </button>
                    </div>
                </div>

                {/* Setup Tools (Conditional - Compact) */}
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

            {/* Board */}
            <div className="relative w-full">
                <GoBoard 
                    board={board} 
                    onPlay={handlePlay} 
                    interactive={!board.gameOver && (gamePhase === 'SETUP' || (gamePhase === 'PLAY' && engineStatus !== 'THINKING'))} 
                    markers={activeMarkers}
                    ghostColor={getGhostColor()}
                />
            </div>

            {/* Score Bar (Moved Below Board) */}
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

         </div>

         {/* Right: Chat */}
         <div className="w-full lg:w-96 border-l border-slate-200 bg-white p-4 lg:p-6 shadow-xl z-10">
            <SenseiChat 
                messages={messages} 
                loading={isSenseiThinking} 
                onSendMessage={async (text) => {
                    addMessage('user', text);
                    setIsSenseiThinking(true);
                    const response = await getSenseiResponse(board, messages, text, senseiModel);
                    setIsSenseiThinking(false);
                    addMessage('sensei', response.text);
                    if (response.markers) setActiveMarkers(response.markers);
                    if (response.cost) setSessionCost(prev => prev + response.cost);
                }}
                senseiModel={senseiModel}
                onModelChange={setSenseiModel}
            />
         </div>
      </div>

    </div>
  );
}
