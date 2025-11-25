
import React, { useState, useCallback, useRef } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat } from './components/SenseiChat';
import { createBoard, placeStone, setStone } from './services/gameLogic';
import { getSenseiResponse } from './services/aiService';
import { generateMove, getLevelSimulations } from './services/simpleAi';
import { getGeminiMove } from './services/geminiEngine';
import { BoardState, Coordinate, ChatMessage, Marker, DifficultyLevel, EngineStatus, GamePhase, SetupTool, StoneColor } from './types';

// Simple Mock Puzzles
const PUZZLES = [
  {
    id: 'p1',
    name: 'Capture the White Stone',
    setup: (board: BoardState) => {
      const b = createBoard(9);
      b.stones.set('4,4', 'WHITE');
      b.stones.set('3,4', 'BLACK');
      b.stones.set('4,3', 'BLACK');
      b.stones.set('5,4', 'BLACK');
      return b;
    }
  },
  {
    id: 'p2',
    name: 'Stop the Invasion',
    setup: (board: BoardState) => {
      const b = createBoard(9);
      b.stones.set('2,2', 'BLACK');
      b.stones.set('6,6', 'WHITE');
      b.stones.set('2,3', 'WHITE');
      return b;
    }
  }
];

export default function App() {
  const [gameMode, setGameMode] = useState<'FREE' | 'PUZZLE'>('FREE');
  const [board, setBoard] = useState<BoardState>(createBoard(9));
  // Messages now include moveNumber to track context
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'sensei',
    text: "Welcome! I'm Panda Sensei. Let's play Go! Ask me anything about the game.",
    moveNumber: 0
  }]);
  
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Engine State
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('READY');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Opponent Config
  const [opponentModel, setOpponentModel] = useState<string | number>("gemini-2.5-flash"); 

  // Sensei Config
  const [senseiModel, setSenseiModel] = useState<string>("gemini-3-pro-preview");

  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  // Cost Tracking
  const [sessionCost, setSessionCost] = useState<number>(0);

  // Undo/Redo Stacks
  const [historyStack, setHistoryStack] = useState<BoardState[]>([]);
  const [redoStack, setRedoStack] = useState<BoardState[]>([]);

  // Setup Mode State
  const [gamePhase, setGamePhase] = useState<GamePhase>('PLAY');
  const [setupTool, setSetupTool] = useState<SetupTool>('ALTERNATE');

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (typeof opponentModel === 'string') {
            const result = await getGeminiMove(currentBoard, opponentModel);
            if (controller.signal.aborted) return;

            if (result) {
              move = result.move;
              explanation = result.reason;
              moveCost = result.cost;
            }
        } else {
            const simCount = getLevelSimulations(opponentModel);
            move = await generateMove(currentBoard, simCount, controller.signal);
        }
        
        if (controller.signal.aborted) return;

        setEngineStatus('READY');
        if (moveCost > 0) setSessionCost(prev => prev + moveCost);

        if (move) {
            setBoard(prev => {
                // Validate if state is consistent (simple check if history length grew, meaning user played while thinking)
                // Although UI usually blocks this, keeping it safe.
                if (prev.history.length !== currentBoard.history.length) return prev;

                const aiState = placeStone(prev, move!);
                if (aiState) {
                    pushHistory(prev); 
                    if (explanation) setLastExplanation(explanation);
                    return aiState;
                }
                return prev;
            });
        } else {
            addMessage('sensei', "White passes.");
        }
    } catch (e: any) {
        if (e.message === 'Aborted' || e.name === 'AbortError') {
            if (process.env.NODE_ENV !== 'production') {
              console.log("AI Cancelled");
            }
            setEngineStatus('READY');
        } else {
            console.error("Engine Generate Error", e);
            setEngineStatus('ERROR');
        }
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
      if (board.turn === 'WHITE' && engineStatus !== 'THINKING') {
          triggerAiMove(board);
      }
  };

  const handlePlay = useCallback(async (c: Coordinate) => {
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
        
        if (nextState !== board) {
            setBoard(nextState);
        }
        return;
    }

    // Phase 2: Normal Play Mode
    if (engineStatus === 'THINKING') return;

    // Human Move
    const nextState = placeStone(board, c);
    if (nextState) {
      pushHistory(board);
      setBoard(nextState);
      setActiveMarkers([]);
      setLastExplanation(null);
      
      // Opponent Response
      if (!nextState.gameOver && gameMode === 'FREE') {
        // Delay to allow UI update
        setTimeout(() => triggerAiMove(nextState), 50);
      }
    }
  }, [board, gameMode, engineStatus, gamePhase, setupTool, triggerAiMove]);

  const handleUndo = () => {
      if (historyStack.length === 0) return;
      if (engineStatus === 'THINKING') return; 

      const previousState = historyStack[historyStack.length - 1];
      const newHistory = historyStack.slice(0, -1);
      
      setRedoStack(prev => [board, ...prev]);
      setBoard(previousState);
      setHistoryStack(newHistory);
      setActiveMarkers([]);
  };

  const handleRedo = () => {
      if (redoStack.length === 0) return;
      
      const nextState = redoStack[0];
      const newRedo = redoStack.slice(1);
      
      setHistoryStack(prev => [...prev, board]);
      setBoard(nextState);
      setRedoStack(newRedo);
  };

  const handleSaveGame = () => {
      const gameState = {
          board: { ...board, stones: Array.from(board.stones.entries()) },
          historyStack: historyStack.map(b => ({ ...b, stones: Array.from(b.stones.entries()) })),
          timestamp: Date.now()
      };
      
      const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gocratic-save-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleLoadGame = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              const loadedBoard: BoardState = {
                  ...json.board,
                  stones: new Map(json.board.stones)
              };
              const loadedHistory = json.historyStack.map((h: any) => ({
                  ...h,
                  stones: new Map(h.stones)
              }));
              setBoard(loadedBoard);
              setHistoryStack(loadedHistory);
              setRedoStack([]);
              setGamePhase('PLAY');
              addMessage('sensei', "Game loaded successfully!");
          } catch (err) {
              console.error(err);
              alert("Failed to load game file.");
          }
      };
      reader.readAsText(file);
  };

  const handleSendMessage = async (text: string) => {
    setLoadingAi(true);
    const currentMoveCount = board.history.length;
    setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'user', 
        text,
        moveNumber: currentMoveCount
    }]);
    setActiveMarkers([]);

    const response = await getSenseiResponse(board, messages, text, senseiModel);
    addMessage('sensei', response.text);
    if (response.cost > 0) setSessionCost(prev => prev + response.cost);
    if (response.markers) setActiveMarkers(response.markers);
    setLoadingAi(false);
  };

  const startPuzzle = (puzzleIndex: number) => {
    setGameMode('PUZZLE');
    setBoard(PUZZLES[puzzleIndex].setup(createBoard(9)));
    setMessages([{
      id: Date.now().toString(),
      sender: 'sensei',
      text: `Let's try: ${PUZZLES[puzzleIndex].name}. Good luck!`,
      moveNumber: 0
    }]);
    setActiveMarkers([]);
    setEngineStatus('READY'); 
    setLastExplanation(null);
    setSessionCost(0);
    setHistoryStack([]);
    setRedoStack([]);
  };

  const resetGame = () => {
    setGameMode('FREE');
    setBoard(createBoard(9));
    setMessages([{
      id: Date.now().toString(),
      sender: 'sensei',
      text: "New game started! You are Black.",
      moveNumber: 0
    }]);
    setActiveMarkers([]);
    setLastExplanation(null);
    setSessionCost(0);
    setHistoryStack([]);
    setRedoStack([]);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 py-3 px-6 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏁</div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight hidden sm:block">Panda Sensei</h1>
        </div>
        
        <div className="flex items-center gap-2">
            {gamePhase === 'PLAY' && (
                <>
                    <div className="flex bg-slate-100 rounded-lg p-1 mr-2">
                        <button onClick={handleUndo} disabled={historyStack.length === 0} className="p-2 hover:bg-white rounded-md text-slate-600 disabled:opacity-30 transition" title="Undo">
                            ↩️
                        </button>
                        <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 hover:bg-white rounded-md text-slate-600 disabled:opacity-30 transition" title="Redo">
                            ↪️
                        </button>
                    </div>

                    <button onClick={handleSaveGame} className="hidden sm:block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold transition">
                        💾 Save
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="hidden sm:block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold transition">
                        📂 Load
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleLoadGame} className="hidden" accept=".json" />
                    
                    <div className="w-px h-6 bg-slate-300 mx-2" />

                    <button 
                        onClick={() => setGamePhase('SETUP')} 
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-semibold transition flex gap-1"
                    >
                        🛠️ Setup Board
                    </button>
                </>
            )}

            {gamePhase === 'SETUP' && (
                <button 
                    onClick={() => {
                        setGamePhase('PLAY');
                        if (setupTool !== 'ALTERNATE') {
                            setHistoryStack([]);
                            setRedoStack([]);
                            addMessage('sensei', "Custom board set up. Ready to play!");
                        }
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md animate-pulse"
                >
                    ▶️ Start Playing
                </button>
            )}

            <button onClick={resetGame} className="ml-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition text-sm">
                New Game
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Board & Stats */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {gamePhase === 'SETUP' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-900 uppercase text-xs tracking-wider">Setup Mode</span>
                  </div>
                  <div className="flex gap-2 bg-white p-1 rounded-lg border border-amber-100">
                      <button 
                        onClick={() => setSetupTool('ALTERNATE')}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${setupTool === 'ALTERNATE' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        Alternate
                      </button>
                      <button 
                        onClick={() => setSetupTool('BLACK_ONLY')}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${setupTool === 'BLACK_ONLY' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        ⚫ Black Only
                      </button>
                      <button 
                        onClick={() => setSetupTool('WHITE_ONLY')}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${setupTool === 'WHITE_ONLY' ? 'bg-slate-200 text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        ⚪ White Only
                      </button>
                      <button 
                        onClick={() => setSetupTool('CLEAR')}
                        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${setupTool === 'CLEAR' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        🗑️ Eraser
                      </button>
                  </div>
                  <div className="text-xs text-amber-700 italic">
                      {setupTool === 'ALTERNATE' ? 'Moves are recorded in history.' : 'Sets the starting board state.'}
                  </div>
              </div>
          )}

          <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            {/* Stats Row */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`px-4 h-12 rounded-lg font-bold flex items-center gap-2 ${board.turn === 'BLACK' ? 'bg-slate-900 text-white ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-600"></div>
                  Black {board.captures.BLACK > 0 && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">+{board.captures.BLACK}</span>}
                </div>
                <div className={`px-4 h-12 rounded-lg font-bold flex items-center gap-2 ${board.turn === 'WHITE' ? 'bg-white border border-slate-300 text-slate-900 ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                  <div className="w-3 h-3 rounded-full bg-white border border-slate-300"></div>
                  White {board.captures.WHITE > 0 && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">+{board.captures.WHITE}</span>}
                  
                  {engineStatus === 'THINKING' && (
                    <button onClick={handleCancel} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded border border-red-200 transition">
                        Cancel
                    </button>
                  )}

                  {engineStatus !== 'THINKING' && board.turn === 'WHITE' && gameMode === 'FREE' && (
                     <button onClick={handleMakeMove} className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold rounded border border-indigo-200 transition">
                        Make Move
                     </button>
                  )}
                </div>
              </div>
              
              {gameMode === 'PUZZLE' ? (
                 <div className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    Puzzle Mode
                 </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-slate-600">Opponent:</label>
                  <select 
                    value={opponentModel}
                    onChange={(e) => {
                         const val = e.target.value;
                         if (!isNaN(Number(val)) && val.length < 3) {
                             setOpponentModel(Number(val));
                         } else {
                             setOpponentModel(val);
                         }
                    }}
                    disabled={engineStatus === 'THINKING' || gamePhase === 'SETUP'}
                    className="p-2 rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none max-w-[200px]"
                  >
                    <optgroup label="Gemini AI">
                        <option value="gemini-2.5-flash">⚡ 2.5 Flash</option>
                        <option value="gemini-flash-lite-latest">🐇 2.5 Flash-Lite</option>
                        <option value="gemini-2.5-pro-preview">🔷 2.5 Pro</option>
                        <option value="gemini-3-pro-preview">🧠 3.0 Pro</option>
                    </optgroup>
                    <optgroup label="Monte Carlo (Offline)">
                        <option value={1}>2 Simulations/Spot</option>
                        <option value={2}>10 Simulations/Spot</option>
                        <option value={3}>30 Simulations/Spot</option>
                        <option value={4}>75 Simulations/Spot</option>
                        <option value={5}>200 Simulations/Spot</option>
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
            
            {/* Engine Status Bar */}
            {gameMode === 'FREE' && gamePhase === 'PLAY' && (
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                {engineStatus === 'INITIALIZING' && <div className="h-full bg-amber-400 w-full animate-pulse" />}
                {engineStatus === 'THINKING' && <div className="h-full bg-indigo-500 w-1/3 animate-[loading_1s_ease-in-out_infinite]" />}
                {engineStatus === 'READY' && <div className="h-full bg-emerald-400 w-full" />}
                {engineStatus === 'ERROR' && <div className="h-full bg-red-400 w-full" />}
              </div>
            )}
          </div>

          <div className="flex justify-center flex-col items-center">
            <GoBoard 
              board={board} 
              onPlay={handlePlay} 
              interactive={(board.turn === 'BLACK' && engineStatus !== 'THINKING') || gamePhase === 'SETUP'} 
              markers={activeMarkers}
              ghostColor={getGhostColor()}
            />
            {sessionCost > 0 && (
              <div className="mt-3 text-xs text-slate-400 font-mono tracking-wide bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                Est. Session Cost: <span className="text-slate-600 font-semibold">${sessionCost.toFixed(6)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Chat / Sensei */}
        <section className="lg:col-span-5 xl:col-span-4 sticky top-24">
          <SenseiChat 
            messages={messages} 
            loading={loadingAi} 
            onSendMessage={handleSendMessage}
            senseiModel={senseiModel}
            onModelChange={setSenseiModel}
          />
        </section>

      </main>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
