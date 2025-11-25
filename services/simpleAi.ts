
import { BoardState, Coordinate } from "../types";
import { placeStone, cloneBoard } from "./gameLogic";

// Map Levels 1-10 to Simulation Counts
// Optimized engine allows for higher counts
const LEVEL_TO_SIMULATIONS = [
    10,    // Level 0 (Fallback)
    10,    // Level 1: Beginner (Instant, random-ish)
    50,    // Level 2
    100,   // Level 3
    200,   // Level 4
    400,   // Level 5: Medium
    800,   // Level 6
    1500,  // Level 7: Hard
    2500,  // Level 8
    3500,  // Level 9
    5000   // Level 10: Sensei (Deep search)
];

export const getLevelSimulations = (level: number): number => {
    const idx = Math.min(Math.max(level, 1), 10);
    return LEVEL_TO_SIMULATIONS[idx] || 50;
};

// Helper: Fisher-Yates shuffle
const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

// Optimized Playout: Avoids calculating ALL legal moves at every step
// Instead, tries random empty spots until one works.
const playout = (startState: BoardState): number => {
    let state = cloneBoard(startState);
    let passes = 0;
    let moves = 0;
    // Cap game length to prevent infinite loops
    const maxMoves = state.size * state.size * 1.5; 

    // Pre-calculate empty spots once per playout to save time? 
    // Actually, just iterating coordinates is fast enough if we shuffle.
    // To make it super fast, we generate a coordinate list once.
    const allCoords: Coordinate[] = [];
    for(let y=0; y<state.size; y++) {
        for(let x=0; x<state.size; x++) {
            allCoords.push({x, y});
        }
    }

    while (passes < 2 && moves < maxMoves) {
        let moved = false;
        
        // Fast Random Move Selection
        // 1. Identify empty spots (cheap)
        const candidates = allCoords.filter(c => !state.stones.has(`${c.x},${c.y}`));
        
        if (candidates.length === 0) {
            passes++;
            state.turn = state.turn === 'BLACK' ? 'WHITE' : 'BLACK';
        } else {
            // 2. Shuffle empty spots
            // Optimization: We don't need a full perfect shuffle, just random pick
            // But shuffling ensures we try others if first fails (suicide)
            shuffleArray(candidates);
            
            // 3. Try placing until valid
            for (const cand of candidates) {
                const nextState = placeStone(state, cand);
                if (nextState) {
                    state = nextState;
                    moved = true;
                    passes = 0;
                    break;
                }
            }

            if (!moved) {
                // No valid moves (all were suicides or ko)
                passes++;
                state.turn = state.turn === 'BLACK' ? 'WHITE' : 'BLACK';
            }
        }
        moves++;
    }

    // Score: Simplified Area Scoring
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

export const generateMove = async (
    board: BoardState, 
    simulations: number = 50
): Promise<Coordinate | null> => {
    
    // For the root node (actual move), we DO need all legal moves to choose from
    const legalCandidates: Coordinate[] = [];
    for (let y = 0; y < board.size; y++) {
        for (let x = 0; x < board.size; x++) {
            const c = {x, y};
            // Check legality by actually placing (this handles suicide/ko)
            if (!board.stones.has(`${x},${y}`) && placeStone(board, c)) {
                legalCandidates.push(c);
            }
        }
    }

    if (legalCandidates.length === 0) return null;
    if (legalCandidates.length === 1) return legalCandidates[0];
    
    const scores = new Map<number, number>(); // index -> total score

    // Run simulations
    const batchSize = 10;
    for (let i = 0; i < legalCandidates.length; i++) {
        let totalScore = 0;
        for (let s = 0; s < simulations; s++) {
            // Yield to event loop to keep UI responsive
            if (s % batchSize === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            const nextState = placeStone(board, legalCandidates[i]);
            if (nextState) {
                totalScore += playout(nextState);
            } else {
                totalScore -= 1000;
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

    return legalCandidates[bestIndex];
};
