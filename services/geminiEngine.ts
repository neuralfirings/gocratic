
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
- Strictly a RAW JSON object. 
- DO NOT wrap in markdown code blocks.
- Format: { "x": number, "y": number, "reason": "One sentence explanation." }
- Coordinate System: 0-indexed. (0,0) is the TOP-LEFT corner. x is column, y is row.

RULES:
1. Do NOT provide explanations outside the JSON. ONLY the JSON object.
2. Ensure the move is legal (not on top of an existing stone).
3. If passing is the best move (or no moves left), return { "x": -1, "y": -1, "reason": "Pass" }.
`;

export interface GeminiMoveResult {
  move: Coordinate;
  reason: string;
  cost: number;
}

export const getGeminiMove = async (board: BoardState, modelName: string = "gemini-2.5-flash"): Promise<GeminiMoveResult | null> => {
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
    
    Return the RAW JSON object with move coordinates and reasoning. No Markdown.
  `;

  // Define full payload
  const requestPayload = {
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1, // Even lower temp for Pro models to be precise
      responseMimeType: "application/json"
    }
  };

  // --- LOGGING REQUEST ---
  console.log("🤖 [Gemini Engine] FULL API PAYLOAD:", requestPayload);

  try {
    // 2. Call Gemini
    const response = await ai.models.generateContent(requestPayload);

    const responseText = response.text || "{}";
    
    // --- LOGGING RESPONSE ---
    console.log("🤖 [Gemini Engine] Raw Response:", responseText);
    
    // 3. Calculate Cost (Estimate: 1 token ~= 4 chars)
    const inputTokens = (prompt.length + SYSTEM_INSTRUCTION.length) / 4;
    const outputTokens = responseText.length / 4;
    
    // Pricing (Approximate per 1M tokens)
    const isPro = modelName.includes('pro');
    const inputPrice = isPro ? 1.25 : 0.075; 
    const outputPrice = isPro ? 5.00 : 0.30;
    
    const estimatedCost = (inputTokens / 1000000 * inputPrice) + (outputTokens / 1000000 * outputPrice);

    // 4. Parse Response (Strip Markdown first)
    let cleanJson = responseText
        .replace(/```json/gi, '') 
        .replace(/```/g, '')
        .trim();

    // Try-catch block for parsing
    let parsed;
    try {
        parsed = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gemini Engine JSON Parse Error", e);
        console.log("Failed JSON content:", cleanJson);
        return null;
    }

    console.log("🤖 [Gemini Engine] Parsed Move Object:", parsed);
    
    // Check for Pass
    if (parsed.x === -1 && parsed.y === -1) {
      return null;
    }

    // 5. Validation
    const proposedMove: Coordinate = { x: parsed.x, y: parsed.y };
    
    // Basic bounds check
    if (proposedMove.x < 0 || proposedMove.x >= board.size || proposedMove.y < 0 || proposedMove.y >= board.size) {
        console.warn("Gemini suggested out-of-bounds move:", proposedMove);
        return null;
    }

    // Occupied check
    const key = `${proposedMove.x},${proposedMove.y}`;
    if (board.stones.has(key)) {
         console.warn("Gemini tried to play on an existing stone:", proposedMove);
         return null; 
    }

    return {
      move: proposedMove,
      reason: parsed.reason || "Strategic placement.",
      cost: estimatedCost
    };

  } catch (error) {
    console.error("Gemini Engine Error:", error);
    return null;
  }
};
