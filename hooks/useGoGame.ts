
import { useState, useCallback, useEffect } from 'react';
import { BoardState, Coordinate, GameResult, GamePhase, SetupTool, StoneColor } from '../types';
import { createBoard, placeStone, setStone, calculateAreaScore } from '../services/gameLogic';

export const useGoGame = (size: number = 9) => {
    const [board, setBoard] = useState<BoardState>(createBoard(size));
    const [historyStack, setHistoryStack] = useState<BoardState[]>([]);
    const [redoStack, setRedoStack] = useState<BoardState[]>([]);
    const [gameResult, setGameResult] = useState<GameResult | null>(null);
    const [gamePhase, setGamePhase] = useState<GamePhase>('PLAY');
    const [setupTool, setSetupTool] = useState<SetupTool>('ALTERNATE');
    const [confirmationPending, setConfirmationPending] = useState<'RESET' | 'RESIGN' | null>(null);

    // Auto-clear confirmation
    useEffect(() => {
        if (confirmationPending) {
            const timer = setTimeout(() => setConfirmationPending(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [confirmationPending]);

    const pushHistory = (currentState: BoardState) => {
        setHistoryStack(prev => [...prev, currentState]);
        setRedoStack([]);
    };

    const playMove = useCallback((c: Coordinate): { success: boolean, newState?: BoardState, message?: string } => {
        if (board.gameOver) return { success: false };

        // Setup Mode
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
             return { success: true, newState: nextState };
        }

        // Play Mode
        if (board.stones.has(`${c.x},${c.y}`)) return { success: false };

        const nextState = placeStone(board, c);
        
        // Suicide check
        if (!nextState) {
            return { success: false, message: "That move isn't allowed (Suicide rule)." };
        }

        pushHistory(board);
        setBoard(nextState);
        return { success: true, newState: nextState };
    }, [board, gamePhase, setupTool]);

    // Apply an external move (e.g. AI). 
    // `fromState` allows passing the board state explicitly to fix stale closure issues in async calls.
    const applyMove = useCallback((newState: BoardState, fromState?: BoardState) => {
        pushHistory(fromState || board);
        setBoard(newState);
    }, [board]);

    const passTurn = useCallback(async (): Promise<{ nextState: BoardState, gameOver: boolean, result: GameResult | null }> => {
         const lastWasPass = board.history.length > 0 && board.lastMove === null; 
         
         const nextState: BoardState = {
             ...board,
             turn: board.turn === 'BLACK' ? 'WHITE' : 'BLACK',
             lastMove: null,
             history: [...board.history, { color: board.turn, coordinate: { x: -1, y: -1 }, capturedCount: 0 }]
         };

         pushHistory(board);
         setBoard(nextState);
         
         let result = null;
         if (lastWasPass) {
             const score = await calculateAreaScore(nextState);
             result = { winner: score.winner, reason: 'SCORING', score } as GameResult;
             setGameResult(result);
             setBoard(prev => ({ ...prev, gameOver: true }));
         }
         return { nextState, gameOver: !!result, result };
    }, [board]);

    const resign = useCallback(async (winner: StoneColor) => {
        const score = await calculateAreaScore(board);
        const result = { winner, reason: 'RESIGNATION', score } as GameResult;
        setGameResult(result);
        setBoard(prev => ({ ...prev, gameOver: true }));
        setConfirmationPending(null);
        return result;
    }, [board]);

    const undo = useCallback(() => {
        if (historyStack.length === 0) return;
        const previous = historyStack[historyStack.length - 1];
        setRedoStack(prev => [...prev, board]);
        setBoard(previous);
        setHistoryStack(prev => prev.slice(0, -1));
        setGameResult(null); 
    }, [historyStack, board]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistoryStack(prev => [...prev, board]);
        setBoard(next);
        setRedoStack(prev => prev.slice(0, -1));
    }, [redoStack, board]);

    const reset = useCallback(() => {
        setBoard(createBoard(size));
        setHistoryStack([]);
        setRedoStack([]);
        setGameResult(null);
        setConfirmationPending(null);
    }, [size]);

    const loadGame = useCallback((newBoard: BoardState, newHistory: BoardState[]) => {
        setBoard(newBoard);
        setHistoryStack(newHistory);
        setRedoStack([]);
        setGameResult(null);
        setConfirmationPending(null);
    }, []);

    const endGameWithScore = useCallback(async (finalBoard: BoardState) => {
        const result = await calculateAreaScore(finalBoard);
        const resObj = {
            winner: result.winner,
            reason: 'SCORING',
            score: result
        } as GameResult;
        setGameResult(resObj);
        setBoard(prev => ({ ...prev, gameOver: true }));
        return resObj;
    }, []);

    return {
        board, setBoard,
        historyStack,
        redoStack,
        gameResult, setGameResult,
        gamePhase, setGamePhase,
        setupTool, setSetupTool,
        confirmationPending, setConfirmationPending,
        playMove, applyMove, passTurn, resign, undo, redo, reset, loadGame, endGameWithScore
    };
};
