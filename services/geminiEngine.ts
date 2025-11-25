import { GoogleGenAI } from "@google/genai";
import { BoardState, Coordinate } from "../types";
import { boardToString, getLegalMoves } from "./gameLogic";
import { fromGtpCoordinate } from "./gtpUtils";

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
- Format: { "coordinate": "D4", "reason": "One sentence explanation." }
- Coordinates: Standard Go coordinates (e.g. A1, D4, J9).
- If passing, return { "coordinate": "PASS", "reason": "Pass" }.

RULES:
1. Do NOT provide explanations outside the JSON. ONLY the JSON object.
2. Ensure the move is legal (not on top of an existing stone).
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
    
    Return the RAW JSON object with "coordinate" (e.g. C3) and "reason". No Markdown.
  `;

  // Define full payload
  const requestPayload = {
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1, 
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
    
    // 3. Calculate Cost
    const inputTokens = (prompt.length + SYSTEM_INSTRUCTION.length) / 4;
    const outputTokens = responseText.length / 4;
    
    let inputPrice = 0.075;
    let outputPrice = 0.30;

    if (modelName.includes('pro')) {
        inputPrice = 1.25;
        outputPrice = 5.00;
    } else if (modelName.includes('lite')) {
        inputPrice = 0.075; // Estimate
        outputPrice = 0.30;
    }
    
    const estimatedCost = (inputTokens / 1000000 * inputPrice) + (outputTokens / 1000000 * outputPrice);

    // 4. Parse Response
    let cleanJson = responseText
        .replace(/```json/gi, '') 
        .replace(/```/g, '')
        .trim();

    let parsed;
    try {
        parsed = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gemini Engine JSON Parse Error", e);
        return null;
    }

    console.log("🤖 [Gemini Engine] Parsed Move Object:", parsed);
    
    // Check for Pass
    if (!parsed.coordinate || parsed.coordinate.toUpperCase() === 'PASS') {
      return null;
    }

    // 5. Convert & Validation
    const proposedMove = fromGtpCoordinate(parsed.coordinate, board.size);
    
    if (!proposedMove) {
        console.warn("Gemini suggested invalid coordinate:", parsed.coordinate);
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