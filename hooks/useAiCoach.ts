
import { useState, useRef, useCallback } from 'react';
import { BoardState, ChatMessage, Coordinate, EngineStatus, Marker, AnalysisMove, StoneColor } from '../types';
import { getGeminiMove } from '../services/geminiEngine';
import { fetchGnuGoMove } from '../services/gnugoService';
import { generateMove, getLevelSimulations } from '../services/simpleAi';
import { getSenseiResponse, getBadMoveFeedback } from '../services/aiService';
import { placeStone } from '../services/gameLogic';

interface AiCoachProps {
    addMessage: (sender: 'user' | 'sensei', text: string) => void;
    setPreviewDismissed: (d: boolean) => void;
}

export const useAiCoach = ({ addMessage, setPreviewDismissed }: AiCoachProps) => {
    const [engineStatus, setEngineStatus] = useState<EngineStatus>('READY');
    const [isSenseiThinking, setIsSenseiThinking] = useState(false);
    const [activeMarkers, setActiveMarkers] = useState<Marker[]>([]);
    const [sessionCost, setSessionCost] = useState<number>(0);
    const [lastMoveQuestionable, setLastMoveQuestionable] = useState(false);
    
    // Auto-Coach Feature State
    const [autoCoachEnabled, setAutoCoachEnabled] = useState(true);
    const [isBadMoveBannerVisible, setIsBadMoveBannerVisible] = useState(false);
    const [mentorMessage, setMentorMessage] = useState<string | null>(null);
    
    // Refs for aborting async operations
    const abortControllerRef = useRef<AbortController | null>(null);
    const feedbackAbortController = useRef<AbortController | null>(null);

    const cancelAiMove = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setEngineStatus('READY');
    }, []);

    const stopFeedback = useCallback(() => {
        if (feedbackAbortController.current) {
            feedbackAbortController.current.abort();
            feedbackAbortController.current = null;
        }
        setIsSenseiThinking(false);
    }, []);

    const resetCoach = useCallback(() => {
        setEngineStatus('READY');
        setActiveMarkers([]);
        setLastMoveQuestionable(false);
        setIsBadMoveBannerVisible(false);
        setMentorMessage(null);
        stopFeedback();
        cancelAiMove();
    }, [stopFeedback, cancelAiMove]);

    // --- OPPONENT AI LOGIC ---
    const triggerAiMove = useCallback(async (
        currentBoard: BoardState,
        opponentModel: string | number,
        callbacks: {
            applyMove: (newState: BoardState, fromState?: BoardState) => void,
            passTurn: () => Promise<any>,
            endGameWithScore: (board: BoardState) => Promise<any>
        }
    ) => {
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
                    // GNU Go
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
                    // Gemini
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
                // Monte Carlo
                const simCount = getLevelSimulations(opponentModel);
                move = await generateMove(currentBoard, simCount, controller.signal);
                if (!move) aiPassed = true;
            }
            
            if (controller.signal.aborted) return;

            setEngineStatus('READY');
            if (moveCost > 0) setSessionCost(prev => prev + moveCost);

            if (aiResigned) {
                addMessage('sensei', `White Resigns. ${explanation || ''} Calculating final score...`);
                const res = await callbacks.endGameWithScore(currentBoard);
                addMessage('sensei', `Game Over! Black wins. (Score: +${res.score?.diff ?? 0}, Chinese Rules, Komi 0)`);
            } else if (aiPassed) {
                addMessage('sensei', "White passes.");
                const { gameOver, result } = await callbacks.passTurn();
                if (gameOver && result) {
                    addMessage('sensei', `Game Over! ${result.winner === 'BLACK' ? 'Black' : 'White'} wins by ${result.score?.diff ?? 0} points.`);
                }
            } else if (move) {
                const aiState = placeStone(currentBoard, move!);
                if (aiState) {
                    callbacks.applyMove(aiState, currentBoard); 
                }
            }
        } catch (e: any) {
            if (e.message !== 'Aborted' && e.name !== 'AbortError') {
                console.error("Engine Generate Error", e);
                addMessage('sensei', "I'm having trouble connecting to the game server. Please try again.");
            }
            setEngineStatus('READY');
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [addMessage]);

    // --- SENSEI CHAT LOGIC ---
    const handleSendMessage = async (
        text: string,
        board: BoardState,
        history: ChatMessage[],
        senseiModel: string,
        analysisData: AnalysisMove[]
    ) => {
        addMessage('user', text);
        setIsSenseiThinking(true);

        const response = await getSenseiResponse(
            board, 
            history, 
            text, 
            senseiModel,
            analysisData
        );

        setIsSenseiThinking(false);
        
        if (response.cost > 0) setSessionCost(prev => prev + response.cost);
        
        addMessage('sensei', response.text);
        
        if (response.markers) {
            setActiveMarkers(response.markers);
        }
    };

    // Helper: Determine if a move is suboptimal
    const isMoveSuboptimal = (
        boardBeforeMove: BoardState,
        playedMove: Coordinate,
        analysisData: AnalysisMove[]
    ): boolean => {
        if (!autoCoachEnabled || analysisData.length === 0 || boardBeforeMove.history.length === 0) return false;

        // Check if the played move matches ANY move in the analysis data (hints)
        const match = analysisData.find(h => h.coordinate.x === playedMove.x && h.coordinate.y === playedMove.y);
        
        // If the move is in the list of suggestions, it's considered good enough.
        // If not in the list, it is considered suboptimal.
        return !match;
    };

    // Async Feedback Generator (returns promise)
    const generateBadMoveFeedback = async (
        boardBeforeMove: BoardState,
        playedMove: Coordinate,
        analysisData: AnalysisMove[]
    ) => {
        if (feedbackAbortController.current) feedbackAbortController.current.abort();
        const controller = new AbortController();
        feedbackAbortController.current = controller;
        
        setMentorMessage(null); // Clear previous message while loading
        setIsSenseiThinking(true);

        try {
            const feedback = await getBadMoveFeedback(boardBeforeMove, playedMove, analysisData);
            
            if (!controller.signal.aborted && feedback.text) {
                addMessage('sensei', feedback.text);
                setMentorMessage(feedback.text);
                if (feedback.cost > 0) setSessionCost(prev => prev + feedback.cost);
            }
            return feedback;
        } catch (e) {
            console.error("Feedback error", e);
            throw e;
        } finally {
            if (feedbackAbortController.current === controller) {
                setIsSenseiThinking(false);
            }
        }
    };

    return {
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
        setPreviewDismissed,
        mentorMessage,
        setMentorMessage
    };
};
