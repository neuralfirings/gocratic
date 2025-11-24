
import React, { useState, useCallback } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat } from './components/SenseiChat';
import { createBoard, placeStone } from './services/gameLogic';
import { getSocraticHint } from './services/aiService';
import { BoardState, Coordinate, ChatMessage, HintLevel, Marker } from './types';

// Simple Mock Puzzles
const PUZZLES = [
  {
    id: 'p1',
    name: 'Capture the White Stone',
    setup: (board: BoardState) => {
      const b = createBoard(9);
      // Setup a capture scenario
      b.stones.set('4,4', 'WHITE');
      b.stones.set('3,4', 'BLACK');
      b.stones.set('4,3', 'BLACK');
      b.stones.set('5,4', 'BLACK');
      // Solution is 4,5
      return b;
    }
  },
  {
    id: 'p2',
    name: 'Stop the Invasion',
    setup: (board: BoardState) => {
      const b = createBoard(9);
      // Setup a defense scenario
      b.stones.set('2,2', 'BLACK');
      b.stones.set('6,6', 'WHITE');
      b.stones.set('2,3', 'WHITE'); // Threatening
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
    text: "Welcome! I'm Panda Sensei. Let's play Go! You can ask for help anytime."
  }]);
  const [hintLevel, setHintLevel] = useState<HintLevel>(HintLevel.NONE);
  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const addMessage = (sender: 'user' | 'sensei', text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender, text }]);
  };

  const handlePlay = useCallback((c: Coordinate) => {
    // Human Move
    const nextState = placeStone(board, c);
    if (nextState) {
      setBoard(nextState);
      setHintLevel(HintLevel.NONE); 
      setActiveMarkers([]); // Clear markers on new move
      
      // Simple AI Opponent Response (Random legal move for demo purposes)
      if (!nextState.gameOver) {
        setTimeout(() => {
          let placed = false;
          let attempts = 0;
          while (!placed && attempts < 50) {
            const rx = Math.floor(Math.random() * nextState.size);
            const ry = Math.floor(Math.random() * nextState.size);
            const aiMoveState = placeStone(nextState, { x: rx, y: ry });
            if (aiMoveState) {
              setBoard(aiMoveState);
              placed = true;
            }
            attempts++;
          }
        }, 800);
      }
    }
  }, [board]);

  const handleHelp = async () => {
    // Increment hint level logic
    const nextLevel = hintLevel < HintLevel.DIRECT_SUGGESTION 
      ? hintLevel + 1 
      : HintLevel.DIRECT_SUGGESTION;
    
    setHintLevel(nextLevel as HintLevel);
    setLoadingAi(true);
    setActiveMarkers([]); // Clear previous markers while loading

    // Add user request to chat
    const userText = nextLevel === 1 ? "I'm stuck, can you help?" 
      : nextLevel === 2 ? "I need more specific options." 
      : "Just show me the best move.";
    addMessage('user', userText);

    // Call Gemini
    const hint = await getSocraticHint(board, nextLevel as HintLevel);
    addMessage('sensei', hint.text);
    
    if (hint.markers) {
      setActiveMarkers(hint.markers);
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
    setHintLevel(HintLevel.NONE);
    setActiveMarkers([]);
  };

  const resetGame = () => {
    setGameMode('FREE');
    setBoard(createBoard(9));
    setMessages([{
      id: Date.now().toString(),
      sender: 'sensei',
      text: "New game started! You are Black."
    }]);
    setHintLevel(HintLevel.NONE);
    setActiveMarkers([]);
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
          
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${board.turn === 'BLACK' ? 'bg-slate-900 text-white ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-600"></div>
                Black {board.captures.BLACK > 0 && <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">+{board.captures.BLACK}</span>}
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${board.turn === 'WHITE' ? 'bg-white border border-slate-300 text-slate-900 ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-100 text-slate-400'}`}>
                <div className="w-3 h-3 rounded-full bg-white border border-slate-300"></div>
                White {board.captures.WHITE > 0 && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">+{board.captures.WHITE}</span>}
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-500">
              {gameMode === 'FREE' ? 'Free Play' : 'Puzzle Mode'}
            </div>
          </div>

          <div className="flex justify-center">
            <GoBoard 
              board={board} 
              onPlay={handlePlay} 
              interactive={board.turn === 'BLACK'} // For demo, user is always black vs Random AI
              markers={activeMarkers}
            />
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
            onAskHelp={handleHelp} 
            hintCount={hintLevel}
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
    </div>
  );
}
