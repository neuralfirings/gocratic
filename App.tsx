
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat, ChatAction } from './components/SenseiChat';
import { GameOverModal } from './components/GameOverModal';
import { HelpModal } from './components/HelpModal';
import { Navbar } from './components/Navbar';
import { GameControls } from './components/GameControls';
import { ScoreBar } from './components/ScoreBar';
import { MobileChatWidget } from './components/MobileChatWidget';

import { createBoard, placeStone } from './services/gameLogic';
import { generateSgf, parseSgf } from './services/sgfService';
import { BoardState, Coordinate, ChatMessage, Marker, StoneColor } from './types';

// Hooks
import { useGoGame } from './hooks/useGoGame';
import { useAnalysis } from './hooks/useAnalysis';
import { useAiCoach } from './hooks/useAiCoach';

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
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'sensei',
    text: "Welcome! I'm GoBot. Let's play Go! Ask me anything about the game.",
    moveNumber: 0
  }]);

  const addMessage = useCallback((sender: 'user' | 'sensei', text: string) => {
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      sender, 
      text,
      // Use +1 to show the Current Turn Number (e.g., 2 stones placed = Move 3 is next)
      // Note: Feedback messages generated in the same render cycle as a move will capture 
      // the old length, correctly labeling the move just played.
      moveNumber: board.history.length + 1
    }]);
  }, [board.history.length]);

  // Mobile Chat UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadSenseiMsg, setUnreadSenseiMsg] = useState<string | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);

  // Config State
  const [opponentModel, setOpponentModel] = useState<string | number>("gnugo_1"); 
  const [senseiModel, setSenseiModel] = useState<string>("gemini-3-pro-preview");
  const [showBestMoves, setShowBestMoves] = useState(false);
  const [highlightedMoveIndex, setHighlightedMoveIndex] = useState<number | null>(null);

  // AI Scheduling State
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isAiPending, setIsAiPending] = useState(false);
  
  // Track unique ID for each AI turn to handle race conditions vs cancellations
  const activeTurnIdRef = useRef<number>(0);

  // --- CUSTOM HOOKS ---
  const { analysisData, setAnalysisData } = useAnalysis(board);
  
  const {
      engineStatus,
      isSenseiThinking,
      setIsSenseiThinking,
      activeMarkers,
      setActiveMarkers,
      sessionCost,
      isBadMoveBannerVisible,
      setIsBadMoveBannerVisible,
      autoCoachEnabled,
      setAutoCoachEnabled,
      triggerAiMove,
      cancelAiMove,
      handleSendMessage,
      isMoveSuboptimal,
      generateBadMoveFeedback,
      resetCoach,
      stopFeedback,
      setLastMoveQuestionable,
      setPreviewDismissed: setCoachPreviewDismissed,
      mentorMessage,
      setMentorMessage
  } = useAiCoach({ addMessage, setPreviewDismissed });


  // Show Modal when Game Result is set
  useEffect(() => {
    setShowGameOverModal(!!gameResult);
    // Cancel any pending AI moves if game over
    if (gameResult) {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        setIsAiPending(false);
        activeTurnIdRef.current++; // Invalidate pending turns
    }
  }, [gameResult]);

  // Mobile Notification Logic
  const lastNotifiedMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'sensei') {
          if (lastNotifiedMsgIdRef.current !== lastMsg.id) {
              lastNotifiedMsgIdRef.current = lastMsg.id;
              if (!isChatOpen) {
                  setUnreadSenseiMsg(lastMsg.text);
                  setPreviewDismissed(false);
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


  const getGhostColor = (): StoneColor | 'ERASER' => {
      if (gamePhase === 'SETUP') {
          if (setupTool === 'WHITE_ONLY') return 'WHITE';
          if (setupTool === 'BLACK_ONLY') return 'BLACK';
          if (setupTool === 'CLEAR') return 'ERASER';
      }
      return board.turn;
  };

  // --- HANDLERS ---

  // Wrapper to reset hints when AI plays
  const handleAiApplyMove = useCallback((newState: BoardState, fromState?: BoardState) => {
      applyMove(newState, fromState);
      setShowBestMoves(false); // Reset hints for the new turn
  }, [applyMove]);

  const scheduleAiMove = useCallback((delayMs: number = 2000) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      
      setIsAiPending(true);
      activeTurnIdRef.current++; 
      const currentTurnId = activeTurnIdRef.current;

      aiTimerRef.current = setTimeout(() => {
          if (activeTurnIdRef.current === currentTurnId) {
             triggerAiMove(board, opponentModel, { applyMove: handleAiApplyMove, passTurn, endGameWithScore });
             setIsAiPending(false);
             // Note: We DO NOT hide the banner here. Banner stays until user moves.
          }
      }, delayMs);
  }, [board, opponentModel, handleAiApplyMove, passTurn, endGameWithScore, triggerAiMove]);

  const handlePauseAutoPlay = () => {
      if (aiTimerRef.current) {
          clearTimeout(aiTimerRef.current);
      }
      setIsAiPending(false);
      activeTurnIdRef.current++; // Invalidate pending turn to stop race result
  };

  const handleForceAi = () => {
      if (board.turn === 'WHITE' && engineStatus !== 'THINKING' && !board.gameOver) {
          triggerAiMove(board, opponentModel, { applyMove: handleAiApplyMove, passTurn, endGameWithScore });
      }
  };

  const handleUserResign = async () => {
      handlePauseAutoPlay();
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
            scheduleAiMove(2000);
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
    setHighlightedMoveIndex(null); // Clear any highlighting on play
    setShowBestMoves(false); // Disable hints after move

    // Check Bad Move (Passive - runs in background)
    const isBad = isMoveSuboptimal(board, c, analysisData);

    // AI Turn Trigger Logic
    if (gamePhase === 'PLAY' && gameMode === 'FREE' && nextState && !nextState.gameOver && nextState.turn === 'WHITE') {
        
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        
        activeTurnIdRef.current++;
        const turnId = activeTurnIdRef.current;
        setIsAiPending(true);

        if (isBad) {
            // --- BAD MOVE FLOW (PASSIVE) ---
            setLastMoveQuestionable(true);
            setIsBadMoveBannerVisible(true); // Show persistent banner
            setCoachPreviewDismissed(false);
            setMentorMessage(null); // Clear old message

            // 1. Fetch Feedback (Promise 1)
            const feedbackPromise = generateBadMoveFeedback(board, c, analysisData);
            
            // 2. Wait 5 seconds max (Promise 2)
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
            
            // 3. Race condition
            Promise.race([feedbackPromise, timeoutPromise]).then(() => {
                // If user hasn't clicked "Pause Game" (turn ID is still valid)
                if (activeTurnIdRef.current === turnId) {
                    triggerAiMove(nextState, opponentModel, { applyMove: handleAiApplyMove, passTurn, endGameWithScore });
                    setIsAiPending(false); 
                    // Do NOT set isBadMoveBannerVisible to false. Banner persists.
                }
            });

        } else {
            // --- GOOD/NORMAL MOVE FLOW ---
            setLastMoveQuestionable(false);
            setIsBadMoveBannerVisible(false); // Hide banner on good moves
            stopFeedback();

            aiTimerRef.current = setTimeout(() => {
                if (activeTurnIdRef.current === turnId) {
                    triggerAiMove(nextState, opponentModel, { applyMove: handleAiApplyMove, passTurn, endGameWithScore });
                    setIsAiPending(false);
                }
            }, 1000); // 1s delay for natural pacing
        }
    }
  }, [
      playMove, gameMode, gamePhase, triggerAiMove, analysisData, board, opponentModel, 
      handleAiApplyMove, passTurn, endGameWithScore, addMessage, setIsBadMoveBannerVisible, 
      isMoveSuboptimal, generateBadMoveFeedback, setLastMoveQuestionable, 
      setCoachPreviewDismissed, stopFeedback, setMentorMessage
  ]);

  const handleReset = () => {
        handlePauseAutoPlay();
        reset();
        setMessages([{
            id: Date.now().toString(),
            sender: 'sensei',
            text: "Ready for a new game! Good luck!",
            moveNumber: 0
        }]);
        resetCoach();
        setAnalysisData([]);
        setShowBestMoves(false);
        setUnreadSenseiMsg(null);
        setPreviewDismissed(true);
        setIsAiPending(false);
        setHighlightedMoveIndex(null);
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

                  handlePauseAutoPlay();
                  resetCoach();
                  setGamePhase('PLAY');

                  for (const move of result.moves) {
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
      handlePauseAutoPlay();
      undo();
      
      // We manually clear transient UI but PRESERVE the Mentor Banner state
      // This allows the user to undo a move but still see the advice if they wish
      setAnalysisData([]); 
      setShowBestMoves(false); 
      setUnreadSenseiMsg(null);
      setHighlightedMoveIndex(null);
      
      setActiveMarkers([]); 
      stopFeedback();
      cancelAiMove();
      // NOTE: We do NOT call resetCoach() here because it clears the mentorMessage
  };

  const handleRedo = () => {
      handlePauseAutoPlay();
      redo();
      
      // Same logic as Undo: Clear hints but preserve Dialogue/Banner
      setAnalysisData([]);
      setShowBestMoves(false);
      setUnreadSenseiMsg(null);
      setHighlightedMoveIndex(null);

      setActiveMarkers([]);
      stopFeedback();
      cancelAiMove();
  };

  const onSendMessageWrapper = (text: string) => {
      handleSendMessage(text, board, messages, senseiModel, analysisData);
  };

  const handleDismissPreview = () => {
      setPreviewDismissed(true);
      setUnreadSenseiMsg(null);
  };

  const handleChatClick = (moveNum: number) => {
      if (highlightedMoveIndex === moveNum) {
          setHighlightedMoveIndex(null); // Toggle off
      } else {
          setHighlightedMoveIndex(moveNum);
      }
  };

  const handleOpenChat = () => {
      // On mobile, this opens the modal
      if (window.innerWidth < 1024) {
          setIsChatOpen(true);
      }
      // On desktop, the chat is always open, so we might just focus it or do nothing
      // Optional: Add a visual cue to the chat window
  };

  // Combine Sensei markers with "Best Moves" if enabled
  const getCombinedMarkers = (): Marker[] => {
    let baseMarkers = [...activeMarkers];
    if (showBestMoves && analysisData.length > 0) {
        const maxHints = 5;
        const analysisMarkers: Marker[] = analysisData.slice(0, maxHints).map(m => ({
            x: m.coordinate.x,
            y: m.coordinate.y,
            type: 'CIRCLE',
            label: m.score.toFixed(1),
            // Black stone for Black turn, White for White
            color: board.turn === 'BLACK' ? '#0f172a' : '#ffffff' 
        }));
        
        baseMarkers = baseMarkers.filter(bm => 
            !analysisMarkers.some(am => am.x === bm.x && am.y === bm.y)
        );
        return [...baseMarkers, ...analysisMarkers];
    }
    return baseMarkers;
  };

  // Determine which banner to show
  const showMentorBanner = isBadMoveBannerVisible;

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
          onHelp={() => setShowHelpModal(true)}
      />

      <div className="flex-1 flex flex-row overflow-hidden relative">
         
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center gap-4">
             
             {/* MENTOR BANNER: Now renders ABOVE controls. Replaces controls when visible on ALL screens. */}
             {showMentorBanner && (
                 <div className="w-full bg-amber-50 px-2 sm:px-4 py-2 rounded-xl shadow-sm border border-amber-200 flex flex-row items-center justify-between gap-2 h-auto min-h-[4rem] animate-in fade-in slide-in-from-top-1 transition-all z-10 relative box-border shrink-0">
                     <div 
                        className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer group py-1"
                        onClick={handleOpenChat}
                        title="Click to discuss with AI"
                     >
                         <div className="text-lg sm:text-xl shrink-0 group-hover:scale-110 transition-transform self-start mt-0.5">🤔</div>
                         <div className="flex flex-col min-w-0">
                             <span className="font-bold text-xs sm:text-sm text-amber-900 pr-1 group-hover:text-amber-700 underline decoration-dotted decoration-amber-400 underline-offset-2 whitespace-normal line-clamp-2 lg:line-clamp-1 leading-tight">
                                 {mentorMessage || "A better move might be available."}
                             </span>
                             {!mentorMessage && (
                                <span className="text-[10px] text-amber-700 opacity-80 truncate hidden sm:inline">
                                    Check hints or wait for AI...
                                </span>
                             )}
                         </div>
                     </div>
                     <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-start mt-0.5">
                          <button
                             onClick={() => setShowBestMoves(prev => !prev)}
                             className={`px-2 py-1.5 sm:px-3 rounded-lg text-xs font-bold border transition-colors shadow-sm whitespace-nowrap ${
                                showBestMoves 
                                ? 'bg-amber-200 text-amber-800 border-amber-300' 
                                : 'bg-white hover:bg-amber-100 text-amber-700 border-amber-200'
                             }`}
                          >
                             Hints
                          </button>

                          <button
                             onClick={handleUndo}
                             disabled={historyStack.length === 0}
                             className="px-2 py-1.5 sm:px-3 rounded-lg text-xs font-bold border transition-colors shadow-sm whitespace-nowrap bg-white hover:bg-amber-100 text-amber-700 border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                             Undo
                          </button>

                          <button
                             onClick={handleRedo}
                             disabled={redoStack.length === 0}
                             className="px-2 py-1.5 sm:px-3 rounded-lg text-xs font-bold border transition-colors shadow-sm whitespace-nowrap bg-white hover:bg-amber-100 text-amber-700 border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                             Redo
                          </button>

                          <div className="w-px h-6 bg-amber-200 mx-0.5 sm:mx-1"></div>

                          <button
                             onClick={() => {
                                 setIsBadMoveBannerVisible(false);
                                 // Force AI to play if dismissed manually and it was user's turn
                                 if (board.turn === 'WHITE' && !board.gameOver) {
                                     triggerAiMove(board, opponentModel, { applyMove: handleAiApplyMove, passTurn, endGameWithScore });
                                 }
                             }}
                             className="p-1.5 sm:p-2 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                             title="Dismiss"
                          >
                             ✕
                          </button>
                     </div>
                 </div>
             )}

             <div className={`w-full ${showMentorBanner ? 'hidden' : 'block'}`}>
                <GameControls 
                        opponentModel={opponentModel}
                        setOpponentModel={setOpponentModel}
                        gamePhase={gamePhase}
                        setGamePhase={setGamePhase}
                        engineStatus={engineStatus}
                        board={board}
                        onCancelAi={cancelAiMove}
                        onForceAi={handleForceAi}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
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
                        autoCoachEnabled={autoCoachEnabled}
                        onToggleAutoCoach={() => setAutoCoachEnabled(prev => !prev)}
                />
             </div>

             <GoBoard 
                 board={board}
                 onPlay={handlePlay}
                 interactive={gamePhase === 'SETUP' || (!board.gameOver && engineStatus !== 'THINKING' && !isAiPending)} 
                 markers={getCombinedMarkers()}
                 ghostColor={getGhostColor()}
                 isWaitingForCorrection={false}
                 onContinue={() => {}} // Legacy
                 highlightedMoveIndex={highlightedMoveIndex}
             />

             <ScoreBar board={board} gameResult={gameResult} />             
         </div>

         <div className="hidden lg:flex w-[400px] bg-slate-50 border-l border-slate-200 p-4 shadow-sm z-10 flex-col h-full justify-center">
             <SenseiChat 
                 messages={messages}
                 loading={isSenseiThinking}
                 onSendMessage={onSendMessageWrapper}
                 senseiModel={senseiModel}
                 onModelChange={setSenseiModel}
                 className="h-full max-h-[700px]"
                 actions={[]}
                 isActive={isBadMoveBannerVisible}
                 onMessageClick={handleChatClick}
             />
         </div>
      </div>

      <MobileChatWidget 
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        unreadMsg={unreadSenseiMsg}
        previewDismissed={previewDismissed}
        onDismissPreview={handleDismissPreview}
        isSenseiThinking={isSenseiThinking}
        isWaitingForCorrection={isBadMoveBannerVisible}
        messages={messages}
        onSendMessage={onSendMessageWrapper}
        senseiModel={senseiModel}
        onModelChange={setSenseiModel}
        chatActions={[]}
      />
      
      <GameOverModal 
          isOpen={showGameOverModal} 
          result={gameResult} 
          onClose={() => setShowGameOverModal(false)}
          onNewGame={handleReset}
      />

      <HelpModal 
          isOpen={showHelpModal} 
          onClose={() => setShowHelpModal(false)} 
      />

    </div>
  );
}
