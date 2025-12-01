
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat, ChatAction } from './components/SenseiChat';
import { GameOverModal } from './components/GameOverModal';
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
      moveNumber: board.history.length 
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

  // --- CUSTOM HOOKS ---
  const { analysisData, setAnalysisData } = useAnalysis(board);
  
  const {
      engineStatus,
      isSenseiThinking,
      setIsSenseiThinking,
      activeMarkers,
      setActiveMarkers,
      sessionCost,
      isWaitingForCorrection,
      setIsWaitingForCorrection,
      triggerAiMove,
      cancelAiMove,
      handleSendMessage,
      checkBadMove,
      resetCoach,
      stopFeedback
  } = useAiCoach({ addMessage, setPreviewDismissed });


  // Show Modal when Game Result is set
  useEffect(() => {
    setShowGameOverModal(!!gameResult);
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

  const handleForceAi = () => {
      if (board.turn === 'WHITE' && engineStatus !== 'THINKING' && !board.gameOver) {
          triggerAiMove(board, opponentModel, { applyMove, passTurn, endGameWithScore });
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
            setTimeout(() => {
                triggerAiMove(nextState, opponentModel, { applyMove, passTurn, endGameWithScore });
            }, 50);
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

    // Check Bad Move (Uses the *old* board state and analysis data for context)
    const isBadMove = await checkBadMove(board, c, analysisData);

    const nextState = result.newState;

    // AI Turn Trigger - ONLY if not blocking for correction
    if (gamePhase === 'PLAY' && gameMode === 'FREE' && nextState && !nextState.gameOver && !isBadMove) {
        // Slight delay to allow UI to update first
        setTimeout(() => {
            if (nextState.turn === 'WHITE') {
                triggerAiMove(nextState, opponentModel, { applyMove, passTurn, endGameWithScore });
            }
        }, 50);
    }
  }, [playMove, gameMode, gamePhase, triggerAiMove, analysisData, board, checkBadMove, opponentModel, applyMove, passTurn, endGameWithScore, addMessage]);

  const handleReset = () => {
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
      stopFeedback();
      setIsWaitingForCorrection(false); // Reset waiting state on undo
      setUnreadSenseiMsg(null); // Clear bubble

      undo();
      cancelAiMove();
      setAnalysisData([]); 
      setShowBestMoves(false); 
      setActiveMarkers([]);
  };

  const handleContinueAfterBadMove = () => {
      stopFeedback();
      setIsWaitingForCorrection(false);
      setUnreadSenseiMsg(null); // Clear bubble

      // Trigger the AI move that was blocked
      if (board.turn === 'WHITE') {
          triggerAiMove(board, opponentModel, { applyMove, passTurn, endGameWithScore });
      }
  };

  const onSendMessageWrapper = (text: string) => {
      handleSendMessage(text, board, messages, senseiModel, analysisData);
  };

  const handleDismissPreview = () => {
      setPreviewDismissed(true);
      setUnreadSenseiMsg(null);
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
            label: m.score.toFixed(1)
        }));
        
        baseMarkers = baseMarkers.filter(bm => 
            !analysisMarkers.some(am => am.x === bm.x && am.y === bm.y)
        );
        return [...baseMarkers, ...analysisMarkers];
    }
    return baseMarkers;
  };

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
         
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center gap-4">
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
                     onCancelAi={cancelAiMove}
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
             />

             <ScoreBar board={board} gameResult={gameResult} />             
         </div>

         <div className="hidden lg:flex w-[400px] bg-white border-l border-slate-200 p-0 shadow-sm z-10 flex-col h-full">
             <SenseiChat 
                 messages={messages}
                 loading={isSenseiThinking}
                 onSendMessage={onSendMessageWrapper}
                 senseiModel={senseiModel}
                 onModelChange={setSenseiModel}
                 className="h-full rounded-none border-none shadow-none"
                 actions={chatActions}
                 isActive={isWaitingForCorrection}
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
        isWaitingForCorrection={isWaitingForCorrection}
        messages={messages}
        onSendMessage={onSendMessageWrapper}
        senseiModel={senseiModel}
        onModelChange={setSenseiModel}
        chatActions={chatActions}
      />
      
      <GameOverModal 
          isOpen={showGameOverModal} 
          result={gameResult} 
          onClose={() => setShowGameOverModal(false)}
          onNewGame={handleReset}
      />
    </div>
  );
}
