

import { BoardState, Coordinate, AnalysisMove } from '../types';
import { toGtpCoordinate, fromGtpCoordinate } from './gtpUtils';

const API_URL = "https://gnugo-bot-5ci3ymbqfa-uw.a.run.app/action";

export interface GnuGoResult {
  move: Coordinate | null;
  isPass: boolean;
  isResign: boolean;
}

export const fetchGnuGoMove = async (board: BoardState, level: number): Promise<GnuGoResult> => {
  // Construct moves list in GTP format (e.g. "B C3", "W D4")
  const moves = board.history.map(h => {
    const c = h.color === 'BLACK' ? 'B' : 'W';
    const coordStr = toGtpCoordinate(h.coordinate, board.size);
    return `${c} ${coordStr}`;
  });

  const payload = {
    mode: "move",
    color: board.turn === 'BLACK' ? 'B' : 'W',
    size: board.size,
    level: level,
    moves: moves
  };

  try {
    if (!window.location.hostname.includes('run.app')) {
      console.log("⚪️ [GNUGo] Requesty Body", payload);
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`GNU Go API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!window.location.hostname.includes('run.app')) {
      console.log("⚪️ [GNUGo] Raw Response", data);
    }
    const resultString = data.result; 

    if (!resultString) {
        throw new Error("No result from GNU Go API");
    }

    const upperRes = resultString.toUpperCase();

    if (upperRes === 'PASS') {
        return { move: null, isPass: true, isResign: false };
    }

    if (upperRes.includes('RESIGN')) {
        return { move: null, isPass: false, isResign: true };
    }

    const coord = fromGtpCoordinate(resultString, board.size);
    if (!coord) {
         throw new Error(`Invalid coordinate received from GNU Go: ${resultString}`);
    }

    return { move: coord, isPass: false, isResign: false };
  } catch (error) {
    console.error("GnuGo Service Error:", error);
    throw error;
  }
};

export const fetchGnuGoHints = async (board: BoardState): Promise<AnalysisMove[]> => {
  const moves = board.history.map(h => {
    const c = h.color === 'BLACK' ? 'B' : 'W';
    const coordStr = toGtpCoordinate(h.coordinate, board.size);
    return `${c} ${coordStr}`;
  });

  // Hints are for the CURRENT turn player
  const color = board.turn === 'BLACK' ? 'B' : 'W';

  const payload = {
    mode: "hint",
    color: color,
    size: board.size,
    moves: moves
  };
  if (!window.location.hostname.includes('run.app')) {
    console.log("⚪️ [GNUGo] Requesty Body", payload);
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors'
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!window.location.hostname.includes('run.app')) {
      console.log("⚪️ [GNUGo] Response", data);
    }
    // Expected format: "H4 13.82 G9 6.68 E3 0.41"
    const resultStr = data.result; 
    
    if (!resultStr || typeof resultStr !== 'string') return [];

    const parts = resultStr.split(' ');
    const results: AnalysisMove[] = [];

    // Parse pairs
    for (let i = 0; i < parts.length; i += 2) {
      const coordStr = parts[i];
      const scoreStr = parts[i + 1];

      if (coordStr && scoreStr) {
        const coord = fromGtpCoordinate(coordStr, board.size);
        const score = parseFloat(scoreStr);
        if (coord && !isNaN(score)) {
          results.push({ coordinate: coord, score });
        }
      }
    }

    return results;

  } catch (error) {
    console.error("GnuGo Hint Error:", error);
    return [];
  }
};
