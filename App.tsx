
import React, { useState, useCallback } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat } from './components/SenseiChat';
import { createBoard, placeStone } from './services/gameLogic';
import { getSenseiResponse } from './services/aiService';
import { generateMove, getLevelSimulations } from './services/simpleAi';
import { getGeminiMove } from './services/geminiEngine';
import { BoardState, Coordinate, ChatMessage, Marker, DifficultyLevel, EngineStatus } from './types';

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
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'sensei',
    text: "Welcome! I'm Panda Sensei. Let's play Go! Ask me anything about the game."
  }]);
  
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Engine State
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('READY');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  // Cost Tracking
  const [sessionCost, setSessionCost] = useState<number>(0);

  const addMessage = (sender: 'user' | 'sensei', text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender, text }]);
  };

  const handlePlay = useCallback(async (c: Coordinate) => {
    if (engineStatus === 'THINKING') return;

    // Human Move
    const nextState = placeStone(board, c);
    if (nextState) {
      setBoard(nextState);
      setActiveMarkers([]);
      setLastExplanation(null);
      
      // Opponent Response
      if (!nextState.gameOver && gameMode === 'FREE') {
        setEngineStatus('THINKING');
        
        // Use a simplified delay to ensure UI renders "Thinking..." state
        setTimeout(async () => {
            try {
                let move: Coordinate | null = null;
                let explanation: string | null = null;
                let moveCost = 0;

                if (difficulty === 11) {
                    // Level 11: Gemini 2.5 Flash
                    const result = await getGeminiMove(nextState, "gemini-2.5-flash");
                    if (result) {
                      move = result.move;
                      explanation = result.reason;
                      moveCost = result.cost;
                    }
                } else if (difficulty === 12) {
                    // Level 12: Gemini 3 Pro
                    const result = await getGeminiMove(nextState, "gemini-3-pro-preview");
                    if (result) {
                      move = result.move;
                      explanation = result.reason;
                      moveCost = result.cost;
                    }
                } else {
                    // Levels 1-10: Monte Carlo Engine
                    const simCount = getLevelSimulations(difficulty);
                    move = await generateMove(nextState, simCount);
                }
                
                setEngineStatus('READY');
                if (moveCost > 0) {
                    setSessionCost(prev => prev + moveCost);
                }

                if (move) {
                    const aiState = placeStone(nextState, move);
                    if (aiState) {
                        setBoard(aiState);
                        setLastExplanation(explanation);
                    }
                } else {
                    addMessage('sensei', "White passes.");
                }
            } catch (e) {
                console.error("Engine Generate Error", e);
                setEngineStatus('ERROR');
                addMessage('sensei', "The engine is confused.");
            }
        }, 50);
      }
    }
  }, [board, gameMode, engineStatus, difficulty]);

  const handleSendMessage = async (text: string) => {
    setLoadingAi(true);
    // Optimistically update UI
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text }]);
    setActiveMarkers([]);

    // Call Sensei AI with board context + full history
    const response = await getSenseiResponse(board, messages, text);
    
    addMessage('sensei', response.text);
    
    if (response.cost > 0) {
      setSessionCost(prev => prev + response.cost);
    }
    
    if (response.markers) {
      setActiveMarkers(response.markers);
    }
    
    setLoadingAi(false);
  };

  const startPuzzle = (puzzleIndex: number) => {
    setGameMode('PUZZLE');
    setBoard(PUZZLES[puzzleIndex].setup(createBoard(9)));
    setMessages([{
      id: Date.now().toString(),
      sender: 'sensei',
      text: `Let's try: ${PUZZLES[puzzleIndex].name}. Good luck!`
    }]);
    setActiveMarkers([]);
    setEngineStatus('READY'); 
    setLastExplanation(null);
    setSessionCost(0);
  };

  const resetGame = () => {
    setGameMode('FREE');
    setBoard(createBoard(9));
    setMessages([{
      id: Date.now().toString(),
      sender: 'sensei',
      text: "New game started! You are Black."
    }]);
    setActiveMarkers([]);
    setLastExplanation(null);
    setSessionCost(0);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏁</div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Go Sensei</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={resetGame} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-600 transition">
            New Game
          </button>
          <div className="hidden md:flex gap-2">
            {PUZZLES.map((p, i) => (
              <button 
                key={p.id} 
                onClick={() => startPuzzle(i)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Board & Stats */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            {/* Stats Row */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${board.turn === 'BLACK' ? 'bg-slate-900 text-white ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-600"></div>
                  Black {board.captures.BLACK > 0 && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">+{board.captures.BLACK}</span>}
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${board.turn === 'WHITE' ? 'bg-white border border-slate-300 text-slate-900 ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                  <div className="w-3 h-3 rounded-full bg-white border border-slate-300"></div>
                  White {board.captures.WHITE > 0 && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">+{board.captures.WHITE}</span>}
                  {engineStatus === 'THINKING' && <span className="ml-2 text-xs text-indigo-600 animate-pulse">Thinking...</span>}
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
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value) as DifficultyLevel)}
                    disabled={engineStatus === 'THINKING'}
                    className="p-2 rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none max-w-[200px]"
                  >
                    <option value={11}>🤖 Gemini 2.5 Flash</option>
                    <option value={12}>🧠 Gemini 3 Pro (Smart)</option>
                    <option disabled>──────────</option>
                    {[...Array(10)].map((_, i) => (
                      <option key={i+1} value={i+1}>Level {i+1} {i === 0 ? '(Beginner)' : i === 9 ? '(Sensei)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Engine Status Bar */}
            {gameMode === 'FREE' && (
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
              interactive={board.turn === 'BLACK' && engineStatus !== 'THINKING'} 
              markers={activeMarkers}
            />
            {/* Cost Estimate Display */}
            {sessionCost > 0 && (
              <div className="mt-3 text-xs text-slate-400 font-mono tracking-wide bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                Est. Session Cost: <span className="text-slate-600 font-semibold">${sessionCost.toFixed(6)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:hidden">
             {PUZZLES.map((p, i) => (
              <button 
                key={p.id} 
                onClick={() => startPuzzle(i)}
                className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-center"
              >
                {p.name}
              </button>
            ))}
          </div>

        </section>

        {/* Right Column: Chat / Sensei */}
        <section className="lg:col-span-5 xl:col-span-4 sticky top-24">
          <SenseiChat 
            messages={messages} 
            loading={loadingAi} 
            onSendMessage={handleSendMessage}
          />
          
          <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-100">
            <h3 className="font-bold text-amber-800 mb-2 text-sm uppercase tracking-wider">How to Learn</h3>
            <ul className="text-sm text-amber-900 space-y-2">
              <li className="flex gap-2">
                <span>1️⃣</span> Try to surround opponent stones to capture them.
              </li>
              <li className="flex gap-2">
                <span>2️⃣</span> If you get stuck, ask Sensei!
              </li>
              <li className="flex gap-2">
                <span>3️⃣</span> Sensei will show you symbols like △ or ○ to guide you.
              </li>
            </ul>
          </div>
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
