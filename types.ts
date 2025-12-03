

export type StoneColor = 'BLACK' | 'WHITE';

export interface Coordinate {
  x: number;
  y: number;
}

export interface Stone extends Coordinate {
  color: StoneColor;
}

export interface MoveHistory {
  color: StoneColor;
  coordinate: Coordinate;
  capturedCount: number;
}

export interface BoardState {
  size: number;
  stones: Map<string, StoneColor>; // Key is "x,y"
  lastMove: Coordinate | null;
  captures: {
    BLACK: number;
    WHITE: number;
  };
  turn: StoneColor;
  history: MoveHistory[];
  gameOver: boolean;
}

export enum HintLevel {
  NONE = 0,
  GUIDING_QUESTION = 1,
  OPTIONS_ANALYSIS = 2,
  DIRECT_SUGGESTION = 3
}

export type MarkerType = 'TRIANGLE' | 'CIRCLE' | 'SQUARE' | 'X';

export interface Marker extends Coordinate {
  type: MarkerType;
  label?: string;
  color?: string; // Optional hex color override
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'sensei';
  text: string;
  markers?: Marker[]; // Markers associated with this message
  moveNumber: number; // The turn count when this message was sent (for context interleaving)
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  initialStones: Stone[];
  targetSolution?: Coordinate; // Simplified for demo
  difficulty: 'Beginner' | 'Intermediate';
}

export type DifficultyLevel = number; // 1-10

export type EngineStatus = 'INITIALIZING' | 'READY' | 'THINKING' | 'ERROR';

export type GamePhase = 'PLAY' | 'SETUP';

export type SetupTool = 'ALTERNATE' | 'BLACK_ONLY' | 'WHITE_ONLY' | 'CLEAR';

export interface ScoreResult {
  blackStones: number;
  blackTerritory: number;
  blackTotal: number;
  whiteStones: number;
  whiteTerritory: number;
  komi: number;
  whiteTotal: number;
  winner: 'BLACK' | 'WHITE';
  diff: number;
}

export interface GameResult {
  winner: 'BLACK' | 'WHITE';
  reason: 'RESIGNATION' | 'SCORING';
  score?: ScoreResult;
}

export interface AnalysisMove {
  coordinate: Coordinate;
  score: number;
}