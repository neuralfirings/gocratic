
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoBoard } from './components/GoBoard';
import { SenseiChat, ChatAction } from './components/SenseiChat';
import { GameOverModal } from './components/GameOverModal';
import { HelpModal } from './components/HelpModal';
import { SettingsModal } from './components/SettingsModal';
import { Navbar } from './components/Navbar';
import { GameControls } from './components/GameControls';
import { ScoreBar } from './components/ScoreBar';
import { MobileChatWidget } from './components/MobileChatWidget';

import { createBoard, placeStone, setStone } from './services/gameLogic';
import { generateSgf, parseSgf } from './services/sgfService';
import { calculateInfluence } from './services/influenceService';
import { BoardState, Coordinate, ChatMessage, Marker, StoneColor, InfluenceMap } from './types';

// Hooks
import { useGoGame } from './hooks/useGoGame';
import { useAnalysis } from './hooks/useAnalysis';
import { useAiCoach } from './hooks/useAiCoach';

export default function App() {
  const [boardSize, setBoardSize] = useState(9);
  const [influenceEnabled, setInfluenceEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // --- Game State Hook ---
  const {
      board, setBoard,
      historyStack,
      redoStack,
      gameResult,
      gamePhase, setGamePhase,
      setupTool, setSetupTool,
      confirmationPending, setConfirmationPending,
      playMove, applyMove, passTurn, resign, undo, redo, reset, loadGame, endGameWithScore
  } = useGoGame(boardSize);

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
      moveNumber: board.history.length + 1
    }]);
  }, [board.history.length]);

  const influenceMap = useMemo(() => influenceEnabled ? calculateInfluence(board) : null, [board, influenceEnabled]);

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
      mentorMessage,
      setMentorMessage
  } = useAiCoach({ addMessage, setPreviewDismissed });

  useEffect(() => {
    setShowGameOverModal(!!gameResult);
    if (gameResult) {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        setIsAiPending(false);
        activeTurnIdRef.current++;
    }
  }, [gameResult]);

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

  useEffect(() => { if (isChatOpen) setUnreadSenseiMsg(null); }, [isChatOpen]);

  const getGhostColor = (): StoneColor | 'ERASER' => {
      if (gamePhase === 'SETUP') {
          if (setupTool === 'WHITE_ONLY') return 'WHITE';
          if (setupTool === 'BLACK_ONLY') return 'BLACK';
          if (setupTool === 'CLEAR') return 'ERASER';
      }
      return board.turn;
  };

  const handlePauseAutoPlay = useCallback(() => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setIsAiPending(false);
      activeTurnIdRef.current++;
  }, []);

  const handleForceAi = useCallback(async () => {
      if (board.gameOver) return;
      handlePauseAutoPlay();
      await triggerAiMove(board, opponentModel, { applyMove, passTurn, endGameWithScore });
      setIsAiPending(false);
  }, [board, opponentModel, triggerAiMove, applyMove, passTurn, endGameWithScore, handlePauseAutoPlay]);

  const handleUserPass = useCallback(async () => {
    handlePauseAutoPlay();
    const { nextState, gameOver, result } = await passTurn();
    
    if (gameOver && result) {
      addMessage('sensei', `Game Over! ${result.winner === 'BLACK' ? 'Black' : 'White'} wins by ${result.score?.diff ?? 0} points.`);
      return;
    }

    if (gamePhase === 'PLAY' && nextState.turn === 'WHITE') {
        setIsAiPending(true);
        activeTurnIdRef.current++;
        const turnId = activeTurnIdRef.current;
        aiTimerRef.current = setTimeout(async () => {
            if (activeTurnIdRef.current === turnId) {
                await triggerAiMove(nextState, opponentModel, { applyMove, passTurn, endGameWithScore });
                if (activeTurnIdRef.current === turnId) setIsAiPending(false);
            }
        }, 1000);
    }
  }, [passTurn, handlePauseAutoPlay, gamePhase, opponentModel, triggerAiMove, applyMove, endGameWithScore, addMessage]);

  const handleUserResign = useCallback(() => {
    handlePauseAutoPlay();
    resign('WHITE'); 
    addMessage('sensei', "You've resigned. It's okay! We learn the most from our losses. 🧠");
  }, [resign, handlePauseAutoPlay, addMessage]);

  const handlePlay = useCallback(async (c: Coordinate) => {
    const result = playMove(c);
    if (!result.success) {
        if (result.message) addMessage('sensei', result.message);
        return;
    }

    const nextState = result.newState;
    if (!nextState) return;

    setHighlightedMoveIndex(null);
    setShowBestMoves(false);

    const isBad = isMoveSuboptimal(board, c, analysisData);

    if (gamePhase === 'PLAY' && !nextState.gameOver && nextState.turn === 'WHITE') {
        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
        activeTurnIdRef.current++;
        const turnId = activeTurnIdRef.current;
        setIsAiPending(true);

        if (isBad) {
            setLastMoveQuestionable(true);
            setIsBadMoveBannerVisible(true);
            setPreviewDismissed(false);
            setMentorMessage(null);
            
            const feedbackPromise = generateBadMoveFeedback(board, c, analysisData);
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
            
            Promise.race([feedbackPromise, timeoutPromise]).then(async () => {
                if (activeTurnIdRef.current === turnId) {
                    await triggerAiMove(nextState, opponentModel, { applyMove, passTurn, endGameWithScore });
                    if (activeTurnIdRef.current === turnId) setIsAiPending(false);
                }
            }).catch(() => {
                if (activeTurnIdRef.current === turnId) setIsAiPending(false);
            });
        } else {
            setLastMoveQuestionable(false);
            setIsBadMoveBannerVisible(false);
            stopFeedback();
            aiTimerRef.current = setTimeout(async () => {
                if (activeTurnIdRef.current === turnId) {
                    await triggerAiMove(nextState, opponentModel, { applyMove, passTurn, endGameWithScore });
                    if (activeTurnIdRef.current === turnId) setIsAiPending(false);
                }
            }, 1000);
        }
    }
  }, [playMove, gamePhase, triggerAiMove, analysisData, board, opponentModel, applyMove, passTurn, endGameWithScore, addMessage, setIsBadMoveBannerVisible, isMoveSuboptimal, generateBadMoveFeedback, setLastMoveQuestionable, setPreviewDismissed, stopFeedback, setMentorMessage, setBoard]);

  const handleReset = useCallback((newSize?: number) => {
        handlePauseAutoPlay();
        reset(newSize);
        setMessages([{ id: Date.now().toString(), sender: 'sensei', text: "Ready for a new game! Good luck!", moveNumber: 0 }]);
        resetCoach();
        setAnalysisData([]);
        setShowBestMoves(false);
        setUnreadSenseiMsg(null);
        setPreviewDismissed(true);
        setIsAiPending(false);
        setHighlightedMoveIndex(null);
  }, [handlePauseAutoPlay, reset, resetCoach, setAnalysisData]);

  const handleUndo = () => {
      handlePauseAutoPlay();
      undo();
      setAnalysisData([]); 
      setShowBestMoves(false); 
      setUnreadSenseiMsg(null);
      setHighlightedMoveIndex(null);
      setActiveMarkers([]); 
      stopFeedback();
      cancelAiMove();
      setIsBadMoveBannerVisible(false); // Hide banner on undo since the "bad" move is gone
  };

  const handleBoardSizeChange = useCallback((newSize: number) => {
      setBoardSize(newSize);
      handleReset(newSize);
  }, [handleReset]);

  const onSendMessageWrapper = (text: string) => {
      handleSendMessage(text, board, messages, senseiModel, analysisData);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar 
          board={board}
          sessionCost={sessionCost}
          confirmationPending={confirmationPending}
          setConfirmationPending={setConfirmationPending}
          onReset={() => handleReset(boardSize)}
          onSave={() => {}} 
          onLoadFile={() => {}} 
          onCopyGnu={() => {}}
          onHelp={() => setShowHelpModal(true)}
      />

      <div className="flex-1 flex flex-row overflow-hidden relative">
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center gap-4">
             
             <div className="w-full relative min-h-[64px] flex items-center justify-center">
                {isBadMoveBannerVisible ? (
                   <div className="w-full bg-amber-50 px-4 py-3 rounded-xl shadow-md border border-amber-300 flex flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 z-20">
                       <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group" onClick={() => setIsChatOpen(true)}>
                           <div className="text-2xl shrink-0 group-hover:scale-110 transition-transform">🤔</div>
                           <div className="flex flex-col min-w-0">
                               <span className="font-bold text-sm text-amber-900 group-hover:text-amber-700 underline decoration-dotted decoration-amber-400 underline-offset-4 whitespace-normal line-clamp-2 leading-tight">
                                   {mentorMessage || "I noticed something about that move. Want to talk about it?"}
                               </span>
                           </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                            <button 
                                onClick={() => setShowBestMoves(prev => !prev)} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showBestMoves ? 'bg-amber-200 text-amber-900 border-amber-400' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                            >
                                Hints
                            </button>
                            <button 
                                onClick={handleUndo} 
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-white text-amber-700 border-amber-200 hover:bg-amber-100 transition-all active:scale-95 shadow-sm"
                            >
                                Undo
                            </button>
                            <button 
                                onClick={() => setIsBadMoveBannerVisible(false)} 
                                className="p-1.5 text-amber-400 hover:text-amber-600 transition-colors"
                                title="Close & Continue"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                       </div>
                   </div>
                ) : (
                   <GameControls 
                       opponentModel={opponentModel} setOpponentModel={setOpponentModel}
                       gamePhase={gamePhase}
                       engineStatus={engineStatus} board={board}
                       onCancelAi={cancelAiMove} onForceAi={handleForceAi}
                       onUndo={handleUndo} onRedo={redo}
                       onPass={handleUserPass} onResign={handleUserResign}
                       historyLength={historyStack.length} redoLength={redoStack.length}
                       confirmationPending={confirmationPending} setConfirmationPending={setConfirmationPending}
                       setupTool={setupTool} setSetupTool={setSetupTool}
                       onToggleBestMoves={() => setShowBestMoves(prev => !prev)}
                       showBestMoves={showBestMoves}
                       onOpenSettings={() => setIsSettingsOpen(true)}
                   />
                )}
             </div>

             <GoBoard 
                 board={board} onPlay={handlePlay}
                 interactive={gamePhase === 'SETUP' || (!board.gameOver && engineStatus !== 'THINKING' && !isAiPending)} 
                 markers={[...activeMarkers, ...(showBestMoves ? analysisData.slice(0, 3).map(m => ({ x: m.coordinate.x, y: m.coordinate.y, type: 'CIRCLE' as const, label: m.score.toFixed(1) })) : [])]}
                 ghostColor={getGhostColor()}
                 highlightedMoveIndex={highlightedMoveIndex}
                 influenceMap={influenceMap}
             />
             <ScoreBar board={board} gameResult={gameResult} />
         </div>

         <div className="hidden lg:flex w-[400px] bg-slate-50 border-l border-slate-200 p-4 shadow-sm z-10 flex-col h-full justify-center">
             <SenseiChat 
                 messages={messages} loading={isSenseiThinking} onSendMessage={onSendMessageWrapper}
                 senseiModel={senseiModel} onModelChange={setSenseiModel}
                 className="h-full max-h-[700px]"
                 isActive={isBadMoveBannerVisible}
                 onMessageClick={num => setHighlightedMoveIndex(num)}
             />
         </div>
      </div>

      <MobileChatWidget 
        isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen}
        unreadMsg={unreadSenseiMsg} previewDismissed={previewDismissed}
        onDismissPreview={() => setPreviewDismissed(true)}
        isSenseiThinking={isSenseiThinking} isWaitingForCorrection={isBadMoveBannerVisible}
        messages={messages} onSendMessage={onSendMessageWrapper}
        senseiModel={senseiModel} onModelChange={setSenseiModel}
        chatActions={[]}
      />
      
      <GameOverModal isOpen={showGameOverModal} result={gameResult} onClose={() => setShowGameOverModal(false)} onNewGame={() => handleReset(boardSize)} />
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        gamePhase={gamePhase}
        onToggleSetup={() => setGamePhase(gamePhase === 'PLAY' ? 'SETUP' : 'PLAY')}
        autoCoachEnabled={autoCoachEnabled}
        onToggleCoach={() => setAutoCoachEnabled(!autoCoachEnabled)}
        influenceEnabled={influenceEnabled}
        onToggleInfluence={() => setInfluenceEnabled(!influenceEnabled)}
        boardSize={boardSize}
        onBoardSizeChange={handleBoardSizeChange}
        hasProgress={board.history.length > 0}
      />
    </div>
  );
}
