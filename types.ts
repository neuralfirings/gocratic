
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
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'sensei';
  text: string;
  markers?: Marker[]; // Markers associated with this message
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  initialStones: Stone[];
  targetSolution?: Coordinate; // Simplified for demo
  difficulty: 'Beginner' | 'Intermediate';
}
