
import { BoardState, StoneColor, Coordinate } from '../types';
import { toSgfCoordinate, fromSgfCoordinate, toGtpCoordinate } from './gtpUtils';

// Generates an SGF string from the current board history
export const generateSgf = (board: BoardState): string => {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    let sgf = `(;GM[1]FF[4]CA[UTF-8]AP[GoCratic:1.0]ST[2]\n`;
    sgf += `SZ[${board.size}]KM[0.0]RU[Chinese]DT[${date}]\n`;
    sgf += `PB[Black]PW[White]\n`;

    // Add Setup Stones if board history is empty but stones exist (Setup Mode)
    // Note: A robust implementation would differentiate between setup stones and moves.
    // For this simple app, we primarily save the Move History.
    
    // Moves
    board.history.forEach(move => {
       const color = move.color === 'BLACK' ? 'B' : 'W';
       // Handle Pass
       let coordStr = "";
       if (move.coordinate.x >= 0 && move.coordinate.y >= 0) {
           coordStr = toSgfCoordinate(move.coordinate);
       }
       sgf += `;${color}[${coordStr}]`; 
    });

    sgf += `)`;
    return sgf;
};

interface SgfParseResult {
    size: number;
    moves: { color: StoneColor, coordinate: Coordinate }[];
    isValid: boolean;
}

// Simple SGF Parser (Main Line Only)
export const parseSgf = (sgf: string): SgfParseResult => {
    try {
        // 1. Get Size
        const szMatch = sgf.match(/SZ\[(\d+)\]/);
        const size = szMatch ? parseInt(szMatch[1], 10) : 19; // Default 19 if not found

        // 2. Extract Moves
        const moves: { color: StoneColor, coordinate: Coordinate }[] = [];
        
        // Regex to find nodes like ;B[aa] or ;W[] or ;W[tt]
        // This regex assumes the standard format where properties are inside nodes starting with ;
        // We look for B[...] or W[...]
        const moveRegex = /;([BW])\[([a-zA-Z]*)\]/g;
        
        let match;
        while ((match = moveRegex.exec(sgf)) !== null) {
            const colorChar = match[1];
            const coordStr = match[2];
            const color: StoneColor = colorChar === 'B' ? 'BLACK' : 'WHITE';
            
            if (!coordStr || coordStr === "") {
                // Pass
                moves.push({ color, coordinate: { x: -1, y: -1 } });
            } else {
                const coord = fromSgfCoordinate(coordStr);
                if (coord) {
                    moves.push({ color, coordinate: coord });
                }
            }
        }

        return { size, moves, isValid: true };
    } catch (e) {
        console.error("SGF Parse Error", e);
        return { size: 19, moves: [], isValid: false };
    }
};
