import { BoardState, Coordinate } from "../types";
import { placeStone, getLegalMoves, cloneBoard } from "./gameLogic";

// Difficulty settings correspond to number of simulations
export const DIFFICULTIES = {
    BEGINNER: 10,    // ~30k (Basically random but avoids immediate death)
    EASY: 50,        // ~25k
    MEDIUM: 200,     // ~20k
    HARD: 800,       // ~15k
    SENSEI: 2000     // ~12k (Slow in JS)
};

export type DifficultyLevel = keyof typeof DIFFICULTIES;

// Simulation playout: Play random moves until pass or max moves
const playout = (startState: BoardState): number => {
    let state = cloneBoard(startState);
    let passes = 0;
    let moves = 0;
    const maxMoves = state.size * state.size * 2;

    while (passes < 2 && moves < maxMoves) {
        const legalMoves = getLegalMoves(state);
        
        if (legalMoves.length === 0) {
            passes++;
            // Switch turn manually if pass
            state.turn = state.turn === 'BLACK' ? 'WHITE' : 'BLACK';
        } else {
            passes = 0;
            // Pick random move
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            const nextState = placeStone(state, randomMove);
            if (nextState) {
                state = nextState;
            } else {
                // Should not happen if getLegalMoves works, but safety break
                passes++;
            }
        }
        moves++;
    }

    // Score: Simplified Area Scoring (Stones on board + captured prisoners)
    // Real scoring is complex, but for MCTS this heuristic usually works for winning.
    let score = state.captures[startState.turn] - state.captures[startState.turn === 'BLACK' ? 'WHITE' : 'BLACK'];
    
    // Add stone count difference
    let myStones = 0;
    let oppStones = 0;
    state.stones.forEach((color) => {
        if (color === startState.turn) myStones++;
        else oppStones++;
    });

    return score + (myStones - oppStones);
};

// Async function to not freeze UI
export const generateMove = async (
    board: BoardState, 
    difficulty: DifficultyLevel = 'EASY'
): Promise<Coordinate | null> => {
    
    const candidates = getLegalMoves(board);
    if (candidates.length === 0) return null;

    // Optimization: If only 1 move, just take it
    if (candidates.length === 1) return candidates[0];

    // For very low difficulty, add randomness to the top selection
    // so it doesn't always play the "best" move it found.
    const simulations = DIFFICULTIES[difficulty];
    
    const scores = new Map<number, number>(); // index -> wins/score

    // Run simulations
    // We batch them to allow UI updates
    const batchSize = 10;
    for (let i = 0; i < candidates.length; i++) {
        let totalScore = 0;
        for (let s = 0; s < simulations; s++) {
            // Yield to event loop every batch
            if (s % batchSize === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // Do a playout
            // We simulate making the candidate move first
            const nextState = placeStone(board, candidates[i]);
            if (nextState) {
                totalScore += playout(nextState);
            } else {
                totalScore -= 1000; // Invalid move logic fallback
            }
        }
        scores.set(i, totalScore);
    }

    // Find best score
    let bestIndex = 0;
    let bestScore = -Infinity;
    
    scores.forEach((score, index) => {
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return candidates[bestIndex];
};