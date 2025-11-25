
import { GoogleGenAI } from "@google/genai";
import { BoardState, Coordinate } from "../types";
import { boardToString, getLegalMoves } from "./gameLogic";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are a competitive Go (Baduk/Weiqi) engine. 
Your goal is to win the game. 
You must play the strongest possible move based on the provided board state.

INPUT:
- ASCII representation of the board.
- Current turn color.

OUTPUT:
- Strictly a JSON object containing the coordinates of your move and a short reason.
- Format: { "x": number, "y": number, "reason": "One sentence explanation of why this move is good." }
- Coordinate System: 0-indexed. (0,0) is the TOP-LEFT corner. x is column, y is row.

RULES:
1. Do NOT provide explanations outside the JSON. ONLY the JSON object.
2. Ensure the move is legal (not on top of an existing stone).
3. If passing is the best move (or no moves left), return { "x": -1, "y": -1, "reason": "Pass" }.
`;

export interface GeminiMoveResult {
  move: Coordinate;
  reason: string;
}

export const getGeminiMove = async (board: BoardState): Promise<GeminiMoveResult | null> => {
  if (!process.env.API_KEY) {
    console.error("No API Key found for Gemini Engine");
    return null;
  }

  // 1. generate prompt
  const boardAscii = boardToString(board);
  const prompt = `
    Current Game State:
    ${boardAscii}
    
    You are playing: ${board.turn}
    Board Size: ${board.size}x${board.size}
    
    Return the JSON object with move coordinates and reasoning.
  `;

  // --- LOGGING REQUEST ---
  console.log("🤖 [Gemini Engine] Request:", { model: "gemini-2.5-flash", prompt });

  try {
    // 2. Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Lower temperature for more deterministic/logical play
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    
    // --- LOGGING RESPONSE ---
    console.log("🤖 [Gemini Engine] Raw Response:", responseText);
    
    // 3. Parse Response
    const parsed = JSON.parse(responseText);
    console.log("🤖 [Gemini Engine] Parsed Move Object:", parsed);
    
    // Check for Pass
    if (parsed.x === -1 && parsed.y === -1) {
      return null;
    }

    // 4. Validation
    // AI can sometimes hallucinate or misread coordinates. 
    // We double-check against the gameLogic to ensure the spot is valid.
    const proposedMove: Coordinate = { x: parsed.x, y: parsed.y };
    
    // Basic bounds check
    if (proposedMove.x < 0 || proposedMove.x >= board.size || proposedMove.y < 0 || proposedMove.y >= board.size) {
        console.warn("Gemini suggested out-of-bounds move:", proposedMove);
        return null; // Treat as pass or handle fallback
    }

    // Occupied check
    const key = `${proposedMove.x},${proposedMove.y}`;
    if (board.stones.has(key)) {
         console.warn("Gemini tried to play on an existing stone:", proposedMove);
         // Fallback: Return null (pass) or you could retry.
         return null; 
    }

    return {
      move: proposedMove,
      reason: parsed.reason || "Strategic placement."
    };

  } catch (error) {
    console.error("Gemini Engine Error:", error);
    return null;
  }
};
