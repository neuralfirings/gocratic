
import { BoardState, StoneColor, Coordinate } from '../types';
import { toGtpCoordinate, COLS } from './gtpUtils';

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

/**
 * For Setup Mode: Places or removes a stone directly without game rules (capture/suicide).
 * If color is null, it removes the stone.
 * Resets history if used for non-alternate setup.
 */
export const setStone = (currentState: BoardState, move: Coordinate, color: StoneColor | null): BoardState => {
    const nextStones = new Map(currentState.stones);
    const key = `${move.x},${move.y}`;

    if (color === null) {
        nextStones.delete(key);
    } else {
        nextStones.set(key, color);
    }

    // When forcibly setting stones in setup mode (not alternate play), we generally don't record it as a "move"
    // However, if we are in "Alternate" mode in the app, we use placeStone instead.
    // This function is for Black Only / White Only mode.

    return {
        ...currentState,
        stones: nextStones,
        // In static setup, we usually don't change turn or history until play starts
        history: [], // Reset history because we are redefining the "Start" state
        lastMove: null
    };
};

export const boardToString = (state: BoardState): string => {
  let boardStr = `Size: ${state.size}x${state.size}\n`;
  boardStr += `Current Turn: ${state.turn}\n`;
  boardStr += `Captures: Black ${state.captures.BLACK}, White ${state.captures.WHITE}\n`;
  
  // Add list of previous moves in GTP format
  const movesStr = state.history.map(h => {
    const color = h.color === 'BLACK' ? 'B' : 'W';
    const coord = toGtpCoordinate(h.coordinate, state.size);
    return `${color}@${coord}`;
  }).join(', ');
  boardStr += `Previous Moves: ${movesStr}\n`;

  const lastMoveGtp = state.lastMove ? toGtpCoordinate(state.lastMove, state.size) : 'None';
  const lastMoveColor = state.turn === 'WHITE' ? 'B' : 'W'; // If it's White's turn, Black moved last
  boardStr += `Last Move: ${state.lastMove ? `${lastMoveColor}@${lastMoveGtp}` : 'None'}\n\n`;
  
  // Use GTP Columns (A, B, C... excluding I)
  boardStr += "   " + Array.from({length: state.size}, (_, i) => COLS[i]).join(" ") + "\n";
  
  for (let y = 0; y < state.size; y++) {
    // Row Labels (9 down to 1)
    const rowLabel = (state.size - y).toString().padStart(2, ' ');
    let row = `${rowLabel} `;
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
      if (!state.stones.has(`${x},${y}`)) {
        if (placeStone(state, coord)) {
          moves.push(coord);
        }
      }
    }
  }
  return moves;
};
