
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat } from './components/SenseiChat';
import { GameOverModal } from './components/GameOverModal';
import { Navbar } from './components/Navbar';
import { GameControls } from './components/GameControls';
import { ScoreBar } from './components/ScoreBar';

import { createBoard, placeStone } from './services/gameLogic'; // still used for parsing SGF replay
import { useGoGame } from './hooks/useGoGame';

import { generateMove, getLevelSimulations } from './services/simpleAi';
import { getGeminiMove } from './services/geminiEngine';
import { fetchGnuGoMove } from './services/gnugoService';
import { getSenseiResponse } from './services/aiService';
import { generateSgf, parseSgf } from './services/sgfService';
import { BoardState, Coordinate, ChatMessage, Marker, EngineStatus, StoneColor } from './types';

export default function App() {
  const [gameMode, setGameMode] = useState<'FREE' | 'PUZZLE'>('FREE');
  
  // --- Game State Hook ---
  const {
      board,
      historyStack,
      redoStack,
      gameResult,
      gamePhase, setGamePhase,
      setupTool, setSetupTool,
      confirmationPending, setConfirmationPending,
      playMove, applyMove, passTurn, resign, undo, redo, reset, loadGame, endGameWithScore
  } = useGoGame(9);

  const [showGameOverModal, setShowGameOverModal] = useState(false);

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

  // Show Modal when Game Result is set
  useEffect(() => {
    setShowGameOverModal(!!gameResult);
  }, [gameResult]);

  const addMessage = (sender: 'user' | 'sensei', text: string) => {
    const moveNumber = board.history.length;
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      sender, 
      text,
      moveNumber
    }]);
  };

  const getGhostColor = (): StoneColor | 'ERASER' => {
      if (gamePhase === 'SETUP') {
          if (setupTool === 'WHITE_ONLY') return 'WHITE';
          if (setupTool === 'BLACK_ONLY') return 'BLACK';
          if (setupTool === 'CLEAR') return 'ERASER';
      }
      return board.turn;
  };

  // --- AI LOGIC ---

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
            addMessage('sensei', `White Resigns. ${explanation || ''} Calculating final score...`);
            const res = await endGameWithScore(currentBoard);
            addMessage('sensei', `Game Over! Black wins. (Score: +${res.score?.diff ?? 0}, Chinese Rules, Komi 0)`);
        } else if (aiPassed) {
             addMessage('sensei', "White passes.");
             
             // Double pass check is handled inside passTurn usually, 
             // but here we are calling it from AI context.
             // We reuse passTurn logic or manually apply.
             // But passTurn in hook updates state.
             const { gameOver, result } = await passTurn();
             if (gameOver && result) {
                addMessage('sensei', `Game Over! ${result.winner === 'BLACK' ? 'Black' : 'White'} wins by ${result.score?.diff ?? 0} points.`);
             }

        } else if (move) {
            // Apply Move logic
            // We use placeStone from gameLogic to get the newState, then use applyMove from hook
            const aiState = placeStone(currentBoard, move!);
            if (aiState) {
                applyMove(aiState, explanation || undefined);
                if (explanation) setLastExplanation(explanation);
            }
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
  }, [opponentModel, applyMove, endGameWithScore, passTurn]);

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

  const handleUserResign = async () => {
      const result = await resign('WHITE');
      addMessage('sensei', "Black Resigns. White wins. (Chinese Rules, Komi 0)");
  };

  const handleUserPass = async () => {
      addMessage('sensei', "Black passes.");
      const { gameOver, result, nextState } = await passTurn();

      if (gameOver && result) {
         addMessage('sensei', `Game Over! ${result.winner === 'BLACK' ? 'Black' : 'White'} wins by ${result.score?.diff ?? 0} points.`);
      } else {
          // Trigger AI to play
          if (gameMode === 'FREE') {
            setTimeout(() => triggerAiMove(nextState), 50);
          }
      }
  };

  const handlePlay = useCallback(async (c: Coordinate) => {
    // Attempt move
    const result = playMove(c);
    
    if (!result.success) {
        if (result.message) addMessage('sensei', result.message);
        return;
    }

    const nextState = result.newState;

    // AI Turn Trigger
    if (gamePhase === 'PLAY' && gameMode === 'FREE' && nextState && !nextState.gameOver) {
        setTimeout(() => {
            if (nextState.turn === 'WHITE') {
                triggerAiMove(nextState);
            }
        }, 50);
    }
  }, [playMove, gameMode, gamePhase, triggerAiMove]);

  const handleReset = () => {
        reset();
        setMessages([{
            id: Date.now().toString(),
            sender: 'sensei',
            text: "Ready for a new game! Good luck!",
            moveNumber: 0
        }]);
        setEngineStatus('READY');
  };

  const handleSaveGame = () => {
    const sgf = generateSgf(board);
    const blob = new Blob([sgf], { type: 'application/x-go-sgf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gocratic_game_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.sgf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadGameFile = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const result = parseSgf(content);

              if (result.isValid) {
                  // Reconstruct board by replaying moves
                  let newBoard = createBoard(result.size);
                  const newHistoryStack: BoardState[] = [];

                  // Replay logic
                  for (const move of result.moves) {
                      if (move.coordinate.x === -1) {
                          // Pass
                          const nextState: BoardState = {
                              ...newBoard,
                              turn: (move.color === 'BLACK' ? 'WHITE' : 'BLACK') as StoneColor,
                              lastMove: null,
                              history: [...newBoard.history, { color: move.color, coordinate: move.coordinate, capturedCount: 0 }]
                          };
                          newHistoryStack.push(newBoard);
                          newBoard = nextState;
                      } else {
                          const nextState = placeStone(newBoard, move.coordinate);
                          if (nextState) {
                              newHistoryStack.push(newBoard);
                              newBoard = nextState;
                          } else {
                              console.warn("Invalid move during replay:", move);
                          }
                      }
                  }

                  loadGame(newBoard, newHistoryStack);
                  
                  setMessages([{
                      id: Date.now().toString(),
                      sender: 'sensei',
                      text: "SGF Game loaded successfully!",
                      moveNumber: newBoard.history.length
                  }]);
                  setEngineStatus('READY');
              } else {
                  addMessage('sensei', "Could not parse SGF file.");
              }
          } catch (err) {
              console.error("Error parsing SGF file", err);
              addMessage('sensei', "I couldn't read that SGF file. It might be corrupted.");
          }
          // Reset input to allow reloading same file
          event.target.value = '';
      };
      reader.readAsText(file);
  };

  const handleUndo = () => {
      undo();
      setEngineStatus('READY');
      if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      <Navbar 
          board={board}
          gameMode={gameMode}
          sessionCost={sessionCost}
          confirmationPending={confirmationPending}
          setConfirmationPending={setConfirmationPending}
          onReset={handleReset}
          onSave={handleSaveGame}
          onLoadFile={handleLoadGameFile}
          onCopyGnu={(msg) => addMessage('sensei', msg)}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
         
         {/* Left: Game Area */}
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center gap-4">
            
            <GameControls 
                opponentModel={opponentModel}
                setOpponentModel={setOpponentModel}
                gamePhase={gamePhase}
                setGamePhase={setGamePhase}
                engineStatus={engineStatus}
                board={board}
                onCancelAi={handleCancel}
                onForceAi={handleMakeMove}
                onUndo={handleUndo}
                onRedo={redo}
                onPass={handleUserPass}
                onResign={handleUserResign}
                historyLength={historyStack.length}
                redoLength={redoStack.length}
                confirmationPending={confirmationPending}
                setConfirmationPending={setConfirmationPending}
                setupTool={setupTool}
                setSetupTool={setSetupTool}
            />

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

            <ScoreBar board={board} gameResult={gameResult} />

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

         <GameOverModal 
            isOpen={showGameOverModal}
            result={gameResult}
            onClose={() => setShowGameOverModal(false)}
            onNewGame={handleReset}
         />

      </div>

    </div>
  );
}
