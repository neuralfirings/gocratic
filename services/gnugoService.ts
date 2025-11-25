
import { Coordinate, DifficultyLevel, BoardState } from '../types';
import { createBoard, placeStone } from './gameLogic';
import { generateMove } from './simpleAi';

// Map Levels 1-10 to Simulation Counts
// More simulations = Smarter but Slower
const LEVEL_TO_SIMULATIONS = [
    50,    // Level 0 (Default fallback)
    10,    // Level 1: Beginner (Very fast, basically random)
    25,    // Level 2
    50,    // Level 3: Easy
    100,   // Level 4
    200,   // Level 5: Medium
    400,   // Level 6
    800,   // Level 7: Hard
    1500,  // Level 8
    2500,  // Level 9
    4000   // Level 10: Sensei (Very slow, deepest search)
];

class LocalEngineService {
  private board: BoardState | null = null;
  private level: DifficultyLevel = 1;

  async init(size: number, level: DifficultyLevel): Promise<void> {
    this.board = createBoard(size);
    this.level = level;
    return Promise.resolve();
  }

  async play(color: 'BLACK' | 'WHITE', coord: Coordinate, size: number): Promise<void> {
    if (!this.board) this.board = createBoard(size);
    
    const nextState = placeStone(this.board, coord);
    if (nextState) {
      this.board = nextState;
    }
    return Promise.resolve();
  }

  async genMove(color: 'BLACK' | 'WHITE', size: number): Promise<Coordinate | null> {
    if (!this.board) this.board = createBoard(size);

    // Get simulation count based on Level (1-10)
    // Ensure we don't go out of bounds array
    // this.level might be 0 (Monte Carlo option) or 1-10
    const levelIndex = Math.min(Math.max(this.level, 0), 10);
    const simulationCount = LEVEL_TO_SIMULATIONS[levelIndex];

    // Only log if not in production (Cloud Run)
    if (!window.location.hostname.includes('run.app')) {
      console.log(`AI Thinking... Level: ${this.level}, Simulations: ${simulationCount}`);
    }

    // Pass the raw number to generateMove
    const move = await generateMove(this.board, simulationCount);
    
    if (move) {
        const nextState = placeStone(this.board, move);
        if (nextState) {
            this.board = nextState;
        }
    }
    
    return move;
  }
}

export const gnugo = new LocalEngineService();
