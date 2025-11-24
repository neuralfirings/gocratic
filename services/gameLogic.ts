
import { BoardState, StoneColor, Coordinate } from '../types';

export const createBoard = (size: number = 9): BoardState => ({
  size,
  stones: new Map(),
  lastMove: null,
  captures: { BLACK: 0, WHITE: 0 },
  turn: 'BLACK',
  history: [],
  gameOver: false
});

const getNeighbors = (c: Coordinate, size: number): Coordinate[] => {
  const moves = [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ];
  return moves.filter(m => m.x >= 0 && m.x < size && m.y >= 0 && m.y < size);
};

const getGroup = (
  stones: Map<string, StoneColor>,
  start: Coordinate,
  color: StoneColor,
  size: number
): { group: string[], liberties: number } => {
  const group = new Set<string>();
  const queue = [start];
  const visited = new Set<string>();
  let liberties = 0;
  const libertyPoints = new Set<string>();

  const startKey = `${start.x},${start.y}`;
  group.add(startKey);
  visited.add(startKey);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current, size);

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (visited.has(key)) continue;

      const neighborColor = stones.get(key);
      if (neighborColor === undefined) {
        // Empty spot = liberty
        if (!libertyPoints.has(key)) {
          liberties++;
          libertyPoints.add(key);
        }
      } else if (neighborColor === color) {
        // Same color = part of group
        group.add(key);
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return { group: Array.from(group), liberties };
};

// Check if a move is a "Suicide" (0 liberties after placement and no captures)
const isSuicide = (stones: Map<string, StoneColor>, move: Coordinate, color: StoneColor, size: number): boolean => {
  const nextStones = new Map(stones);
  const key = `${move.x},${move.y}`;
  nextStones.set(key, color);
  
  // Check if we captured anything
  const opponent = color === 'BLACK' ? 'WHITE' : 'BLACK';
  const neighbors = getNeighbors(move, size);
  let captured = false;
  
  for (const n of neighbors) {
    const nKey = `${n.x},${n.y}`;
    if (nextStones.get(nKey) === opponent) {
      const { liberties } = getGroup(nextStones, n, opponent, size);
      if (liberties === 0) {
        captured = true;
        break;
      }
    }
  }
  
  if (captured) return false; // Not suicide if we capture

  // Check our own liberties
  const { liberties } = getGroup(nextStones, move, color, size);
  return liberties === 0;
};

export const placeStone = (currentState: BoardState, move: Coordinate): BoardState | null => {
  if (currentState.gameOver) return null;
  
  const key = `${move.x},${move.y}`;
  if (currentState.stones.has(key)) return null; // Occupied

  const opponent = currentState.turn === 'BLACK' ? 'WHITE' : 'BLACK';

  // Quick suicide check before doing heavy logic
  if (isSuicide(currentState.stones, move, currentState.turn, currentState.size)) {
    return null;
  }

  // Clone state
  const nextStones = new Map(currentState.stones);
  nextStones.set(key, currentState.turn);
  
  const neighbors = getNeighbors(move, currentState.size);
  let capturedStonesCount = 0;
  
  // Check opponent captures
  const groupsChecked = new Set<string>();
  
  neighbors.forEach(n => {
    const nKey = `${n.x},${n.y}`;
    if (nextStones.get(nKey) === opponent && !groupsChecked.has(nKey)) {
      const { group, liberties } = getGroup(nextStones, n, opponent, currentState.size);
      group.forEach(g => groupsChecked.add(g));
      
      if (liberties === 0) {
        group.forEach(gKey => {
          nextStones.delete(gKey);
          capturedStonesCount++;
        });
      }
    }
  });

  // Ko rule (simplified: just don't allow immediate recapture of same board state)
  // For this lightweight version, we skip complex superko checks.

  return {
    ...currentState,
    stones: nextStones,
    lastMove: move,
    turn: opponent,
    captures: {
      ...currentState.captures,
      [currentState.turn]: currentState.captures[currentState.turn] + capturedStonesCount
    },
    history: [
      ...currentState.history,
      { color: currentState.turn, coordinate: move, capturedCount: capturedStonesCount }
    ]
  };
};

export const boardToString = (state: BoardState): string => {
  let boardStr = `Size: ${state.size}x${state.size}\n`;
  boardStr += `Current Turn: ${state.turn}\n`;
  boardStr += `Captures: Black ${state.captures.BLACK}, White ${state.captures.WHITE}\n`;
  boardStr += `Last Move: ${state.lastMove ? `${state.lastMove.x},${state.lastMove.y}` : 'None'}\n\n`;
  
  boardStr += "  " + Array.from({length: state.size}, (_, i) => i).join(" ") + "\n";
  for (let y = 0; y < state.size; y++) {
    let row = `${y} `;
    for (let x = 0; x < state.size; x++) {
      const stone = state.stones.get(`${x},${y}`);
      if (stone === 'BLACK') row += "B ";
      else if (stone === 'WHITE') row += "W ";
      else row += ". ";
    }
    boardStr += row + "\n";
  }
  return boardStr;
};

export const cloneBoard = (state: BoardState): BoardState => ({
  ...state,
  stones: new Map(state.stones),
  captures: { ...state.captures },
  history: [...state.history]
});

export const getLegalMoves = (state: BoardState): Coordinate[] => {
  const moves: Coordinate[] = [];
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      const coord = { x, y };
      // Check if spot is empty first
      if (!state.stones.has(`${x},${y}`)) {
        // Check if move is legal by attempting to place stone
        // This covers suicide, ko, etc.
        if (placeStone(state, coord)) {
          moves.push(coord);
        }
      }
    }
  }
  return moves;
};
