
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat, ChatAction } from './components/SenseiChat';
import { GameOverModal } from './components/GameOverModal';
import { Navbar } from './components/Navbar';
import { GameControls } from './components/GameControls';
import { ScoreBar } from './components/ScoreBar';

import { createBoard, placeStone } from './services/gameLogic';
import { useGoGame } from './hooks/useGoGame';

import { generateMove, getLevelSimulations } from './services/simpleAi';
import { getGeminiMove } from './services/geminiEngine';
import { fetchGnuGoMove, fetchGnuGoHints } from './services/gnugoService';
import { getSenseiResponse, getBadMoveFeedback } from './services/aiService';
import { generateSgf, parseSgf } from './services/sgfService';
import { BoardState, Coordinate, ChatMessage, Marker, EngineStatus, StoneColor, AnalysisMove } from './types';

const GOOD_MOVE_PHRASES = [
    "That's a better choice!",
    "Much stronger move.",
    "Good correction.",
    "That looks solid.",
    "Excellent choice."
];

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

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

  // Chat & UI State
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'sensei',
    text: "Welcome! I'm GoBot. Let's play Go! Ask me anything about the game.",
    moveNumber: 0
  }]);

  // Mobile Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadSenseiMsg, setUnreadSenseiMsg] = useState<string | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);

  const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
  
  // Analysis State
  const [analysisData, setAnalysisData] = useState<AnalysisMove[]>([]);
  const [showBestMoves, setShowBestMoves] = useState(false);

  // Engine State
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('READY');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Feedback State
  const feedbackAbortController = useRef<AbortController | null>(null);
  const [lastMoveQuestionable, setLastMoveQuestionable] = useState(false);
  const [isWaitingForCorrection, setIsWaitingForCorrection] = useState(false);

  // Opponent Config
  const [opponentModel, setOpponentModel] = useState<string | number>("gnugo_1"); 

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

  // --- ANALYSIS LOOP ---
  // Fetch hints whenever the board history changes and the game is active
  useEffect(() => {
    let ignore = false; // Flag to handle race conditions

    // Clear Sensei's transient markers and Best Moves toggle whenever a new move occurs
    setActiveMarkers([]);
    setShowBestMoves(false);

    const fetchHints = async () => {
        // Only fetch if game is active.
        if (board.gameOver) {
            if (!ignore) setAnalysisData([]);
            return;
        }
        
        // Fetch hints for the current state (helps the current player)
        const hints = await fetchGnuGoHints(board);
        
        // Only update state if this effect hasn't been cleaned up (overridden by a newer move)
        if (!ignore) {
            setAnalysisData(hints);
        }
    };

    fetchHints();

    return () => {
        ignore = true;
    };
  }, [board.history.length, board.gameOver, board.turn, board]);

  // Mobile Notification Logic
  const lastNotifiedMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'sensei') {
          // Only notify if we haven't processed this message ID yet
          if (lastNotifiedMsgIdRef.current !== lastMsg.id) {
              lastNotifiedMsgIdRef.current = lastMsg.id;
              if (!isChatOpen) {
                  setUnreadSenseiMsg(lastMsg.text);
                  setPreviewDismissed(false); // Reset dismissal on new message
              }
          }
      }
  }, [messages, isChatOpen]);

  // Clear unread on open
  useEffect(() => {
      if (isChatOpen) {
          setUnreadSenseiMsg(null);
      }
  }, [isChatOpen]);

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
            if (opponentModel.startsWith('gnugo')) {
                // GNU Go Handler
                const parts = opponentModel.split('_');
                const level = parts.length > 1 ? parseInt(parts[1], 10) : 10;
                
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
             const { gameOver, result } = await passTurn();
             if (gameOver && result) {
                addMessage('sensei', `Game Over! ${result.winner === 'BLACK' ? 'Black' : 'White'} wins by ${result.score?.diff ?? 0} points.`);
             }
        } else if (move) {
            // Apply Move logic
            const aiState = placeStone(currentBoard, move!);
            if (aiState) {
                applyMove(aiState, currentBoard); 
                if (explanation) setLastExplanation(explanation);
            }
        }
    } catch (e: any) {
        if (e.message === 'Aborted' || e.name === 'AbortError') {
            // ignore
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

  const handleForceAi = () => {
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
    // Capture hints before move (hints are for the current state)
    const currentHints = [...analysisData];
    
    // Attempt move
    const result = playMove(c);
    
    if (!result.success) {
        if (result.message) addMessage('sensei', result.message);
        return;
    }

    // CHECK FOR HINTS AND FEEDBACK
    const isInHints = currentHints.some(h => h.coordinate.x === c.x && h.coordinate.y === c.y);
    let shouldBlockAi = false;

    // Only trigger feedback if we have enough confidence (at least 3 suggested moves)
    // AND it is not the first move of the game (allow creative opening)
    if (currentHints.length >= 3 && !isInHints && board.history.length > 0) {
        // BAD MOVE FLOW
        shouldBlockAi = true;
        setLastMoveQuestionable(true);
        setIsWaitingForCorrection(true);
        setPreviewDismissed(false); // Ensure the preview bubble shows up to indicate thinking/advice
        
        // Abort previous feedback request if any
        if (feedbackAbortController.current) feedbackAbortController.current.abort();
        const controller = new AbortController();
        feedbackAbortController.current = controller;

        setIsSenseiThinking(true);
        try {
            // We pass the OLD board (board) because that's what the hints are based on.
            const feedback = await getBadMoveFeedback(board, c, currentHints);
            if (!controller.signal.aborted) {
                if (feedback.text) {
                    addMessage('sensei', feedback.text);
                    if (feedback.cost > 0) setSessionCost(prev => prev + feedback.cost);
                }
            }
        } catch (e) {
            console.error("Feedback error", e);
        } finally {
            if (feedbackAbortController.current === controller) {
                setIsSenseiThinking(false);
            }
        }

    } else if (isInHints) {
        // GOOD MOVE FLOW
        if (lastMoveQuestionable) {
            addMessage('sensei', getRandom(GOOD_MOVE_PHRASES));
            setLastMoveQuestionable(false);
        }
        // Cancel any pending "Bad Move" feedback if they corrected themselves quickly
        if (feedbackAbortController.current) {
            feedbackAbortController.current.abort();
            feedbackAbortController.current = null;
        }
        setIsSenseiThinking(false);
        setIsWaitingForCorrection(false);
    }

    const nextState = result.newState;

    // AI Turn Trigger - ONLY if not blocking for correction
    if (gamePhase === 'PLAY' && gameMode === 'FREE' && nextState && !nextState.gameOver && !shouldBlockAi) {
        setTimeout(() => {
            if (nextState.turn === 'WHITE') {
                triggerAiMove(nextState);
            }
        }, 50);
    }
  }, [playMove, gameMode, gamePhase, triggerAiMove, analysisData, board, lastMoveQuestionable]);

  const handleReset = () => {
        reset();
        setMessages([{
            id: Date.now().toString(),
            sender: 'sensei',
            text: "Ready for a new game! Good luck!",
            moveNumber: 0
        }]);
        setEngineStatus('READY');
        setAnalysisData([]);
        setShowBestMoves(false);
        setActiveMarkers([]);
        setLastMoveQuestionable(false);
        setIsWaitingForCorrection(false);
        if (feedbackAbortController.current) feedbackAbortController.current.abort();
        setIsSenseiThinking(false);
        setUnreadSenseiMsg(null);
        setPreviewDismissed(true);
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
                  let newBoard = createBoard(result.size);
                  const newHistoryStack: BoardState[] = [];

                  // RESET BLOCKING STATES
                  setLastMoveQuestionable(false);
                  setIsWaitingForCorrection(false);
                  if (feedbackAbortController.current) {
                      feedbackAbortController.current.abort();
                      feedbackAbortController.current = null;
                  }
                  setIsSenseiThinking(false);
                  setGamePhase('PLAY');

                  for (const move of result.moves) {
                      // Synchronize turn to SGF move color to avoid sync issues
                      if (newBoard.turn !== move.color) {
                           newBoard = { ...newBoard, turn: move.color };
                      }

                      if (move.coordinate.x === -1) {
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
          event.target.value = '';
      };
      reader.readAsText(file);
  };

  const handleUndo = () => {
      // Abort feedback if any to prevent delayed scolding after undo
      if (feedbackAbortController.current) {
          feedbackAbortController.current.abort();
          feedbackAbortController.current = null;
      }
      setIsSenseiThinking(false);
      setIsWaitingForCorrection(false); // Reset waiting state on undo
      setUnreadSenseiMsg(null); // Clear bubble

      undo();
      setEngineStatus('READY');
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setAnalysisData([]); // Clear old analysis
      setShowBestMoves(false); // Hide markers
      setActiveMarkers([]);
  };

  const handleContinueAfterBadMove = () => {
      // Cancel pending feedback to stop loading indicator
      if (feedbackAbortController.current) {
          feedbackAbortController.current.abort();
          feedbackAbortController.current = null;
      }
      setIsSenseiThinking(false);
      
      setIsWaitingForCorrection(false);
      setUnreadSenseiMsg(null); // Clear bubble

      // Trigger the AI move that was blocked
      if (board.turn === 'WHITE') {
          triggerAiMove(board);
      }
  };

  const handleSendMessage = async (text: string) => {
    addMessage('user', text);
    setIsSenseiThinking(true);

    const response = await getSenseiResponse(
        board, 
        messages, 
        text, 
        senseiModel,
        analysisData // Pass analysis data to Sensei
    );

    setIsSenseiThinking(false);
    
    if (response.cost > 0) setSessionCost(prev => prev + response.cost);
    
    addMessage('sensei', response.text);
    
    if (response.markers) {
        setActiveMarkers(response.markers);
    }
  };

  // Combine Sensei markers with "Best Moves" if enabled
  const getCombinedMarkers = (): Marker[] => {
    let baseMarkers = [...activeMarkers];
    
    if (showBestMoves && analysisData.length > 0) {
        // Map top {maxHints} analysis moves to Markers
        const maxHints = 5;
        const analysisMarkers: Marker[] = analysisData.slice(0, maxHints).map(m => ({
            x: m.coordinate.x,
            y: m.coordinate.y,
            type: 'CIRCLE',
            label: m.score.toFixed(1)
        }));
        
        baseMarkers = baseMarkers.filter(bm => 
            !analysisMarkers.some(am => am.x === bm.x && am.y === bm.y)
        );
        return [...baseMarkers, ...analysisMarkers];
    }

    return baseMarkers;
  };

  // Define chat actions
  const chatActions: ChatAction[] = isWaitingForCorrection ? [
      { 
          label: "Try Again (Undo)", 
          onClick: handleUndo, 
          variant: 'secondary' 
      },
      { 
          label: "Ask White to Continue", 
          onClick: handleContinueAfterBadMove, 
          variant: 'primary' 
      }
  ] : [];

  const shouldShowBubble = !isChatOpen && !previewDismissed && (unreadSenseiMsg || (isWaitingForCorrection && isSenseiThinking));

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

      <div className="flex-1 flex flex-row overflow-hidden relative">
         
         {/* Left: Game Area (Full width on Mobile) */}
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center gap-4">
             {/* REPLACEMENT: Pause Bar or Game Controls */}
             {isWaitingForCorrection ? (
                 <div className="w-full bg-amber-500 text-white px-4 py-3 rounded-xl shadow-sm border border-amber-600 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 min-h-[3.8rem]">
                     <div className="flex items-center gap-3">
                         <div className="text-xl bg-white/20 rounded-full w-9 h-9 flex items-center justify-center shrink-0">🛑</div>
                         <div className="flex flex-col">
                             <span className="font-bold text-sm leading-tight">Paused • Check Chat</span>
                             <span className="text-[10px] text-amber-100 opacity-90">GoBot has some advice for you.</span>
                         </div>
                     </div>
                     <div className="flex gap-2 ml-auto">
                          <button
                             onClick={handleUndo}
                             className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold border border-white/20 transition-all active:scale-95 flex items-center gap-1"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                             </svg>
                             Undo
                          </button>
                          <button
                             onClick={handleContinueAfterBadMove}
                             className="px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                          >
                             Continue Game
                          </button>
                     </div>
                 </div>
             ) : (
                <GameControls 
                     opponentModel={opponentModel}
                     setOpponentModel={setOpponentModel}
                     gamePhase={gamePhase}
                     setGamePhase={setGamePhase}
                     engineStatus={engineStatus}
                     board={board}
                     onCancelAi={handleCancel}
                     onForceAi={handleForceAi}
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
                     onToggleBestMoves={() => setShowBestMoves(prev => !prev)}
                     onClearMarks={() => { setActiveMarkers([]); setShowBestMoves(false); }}
                     showBestMoves={showBestMoves}
                 />
             )}

             <GoBoard 
                 board={board}
                 onPlay={handlePlay}
                 interactive={gamePhase === 'SETUP' || (!board.gameOver && engineStatus !== 'THINKING' && !isWaitingForCorrection)} 
                 markers={getCombinedMarkers()}
                 ghostColor={getGhostColor()}
                 isWaitingForCorrection={isWaitingForCorrection}
                 // onContinue is now handled in the replaced GameControls bar, so strictly not needed inside Board anymore, but removing prop is safer in GoBoard.tsx
             />

             <ScoreBar board={board} gameResult={gameResult} />             
         </div>

         {/* Desktop Chat Sidebar (Hidden on Mobile) */}
         <div className="hidden lg:flex w-[400px] bg-white border-l border-slate-200 p-0 shadow-sm z-10 flex-col h-full">
             <SenseiChat 
                 messages={messages}
                 loading={isSenseiThinking}
                 onSendMessage={handleSendMessage}
                 senseiModel={senseiModel}
                 onModelChange={setSenseiModel}
                 className="h-full rounded-none border-none shadow-none"
                 actions={chatActions}
                 isActive={isWaitingForCorrection}
             />
         </div>
      </div>

      {/* --- MOBILE CHAT WIDGETS --- */}

      {/* Floating Notification Bubble */}
      {shouldShowBubble && (
          <div 
            className="lg:hidden fixed bottom-24 right-4 z-40 max-w-[280px] bg-white rounded-2xl rounded-br-sm shadow-xl border border-indigo-100 animate-in slide-in-from-bottom-4 duration-300 transition-colors"
          >
              <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDismissed(true);
                      setUnreadSenseiMsg(null);
                  }}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-50"
                  aria-label="Close notification"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
              </button>
              
              <div 
                  onClick={() => setIsChatOpen(true)}
                  className="p-4 pr-8 cursor-pointer hover:bg-slate-50 rounded-2xl rounded-br-sm min-h-[3rem] flex items-center"
              >
                  <div className="flex items-start gap-3 w-full">
                      <div className="text-2xl shrink-0">🤖</div>
                      
                      {isWaitingForCorrection && isSenseiThinking ? (
                         <div className="flex space-x-1 py-1">
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                         </div>
                      ) : (
                         <div className="text-sm text-slate-700 line-clamp-2">
                             {unreadSenseiMsg}
                         </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Floating Action Button (FAB) */}
      {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center text-white hover:bg-indigo-700 transition-transform active:scale-95"
            aria-label="Open Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            {/* Unread indicator dot */}
            {(unreadSenseiMsg || (isWaitingForCorrection && isSenseiThinking)) && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>
      )}

      {/* Mobile Modal Overlay */}
      {isChatOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
              {/* Tap backdrop to close */}
              <div className="absolute inset-0" onClick={() => setIsChatOpen(false)}></div>
              
              <div className="relative w-full h-[85vh] sm:h-[600px] sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 flex flex-col">
                  <SenseiChat 
                      messages={messages}
                      loading={isSenseiThinking}
                      onSendMessage={handleSendMessage}
                      senseiModel={senseiModel}
                      onModelChange={setSenseiModel}
                      className="h-full border-none rounded-none shadow-none"
                      onClose={() => setIsChatOpen(false)}
                      actions={chatActions}
                      isActive={isWaitingForCorrection}
                  />
              </div>
          </div>
      )}
      
      <GameOverModal 
          isOpen={showGameOverModal} 
          result={gameResult} 
          onClose={() => setShowGameOverModal(false)}
          onNewGame={handleReset}
      />
    </div>
  );
}
