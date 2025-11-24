
import { GoogleGenAI } from "@google/genai";
import { BoardState, HintLevel, Coordinate, Marker, MarkerType } from "../types";
import { boardToString } from "./gameLogic";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are "Sensei", a kind, wise, and patient Go (Baduk/Weiqi) teacher for children.
Your goal is NOT to tell the child where to play immediately. 
Your goal is to use the Socratic method to help them find the move themselves.

INPUT:
You will receive the board state, the current player, and a "Hint Level".

OUTPUT FORMAT:
You MUST return a JSON object. Do not include markdown code blocks.
Format:
{
  "text": "Your helpful message here...",
  "markers": [
    { "x": 4, "y": 4, "type": "TRIANGLE" },
    { "x": 3, "y": 3, "type": "CIRCLE" }
  ]
}

MARKER TYPES: "TRIANGLE", "CIRCLE", "SQUARE", "X".

BEHAVIOR:
Level 1 (First ask): Observe the opponent's last move. Mark the opponent's last move (or key stones) with a TRIANGLE. Ask a guiding question referring to it.
Level 2 (Second ask): Suggest 2 plausible moves. Mark them with CIRCLE and SQUARE. Explain the choice.
Level 3 (Third ask): Suggest the best move. Mark it with X.

IMPORTANT VISUAL RULES:
- In your "text", NEVER use coordinates like "4,4" or "D4".
- Instead, refer to the locations by their shape symbols: "Look at the stone marked with △" or "Try playing at ○".
- Use these unicode symbols in text: △ (TRIANGLE), ○ (CIRCLE), □ (SQUARE), ✕ (X).

Tone: Encouraging, simple English, use emojis.
`;

export const getSocraticHint = async (
  board: BoardState, 
  hintLevel: HintLevel
): Promise<{ text: string; markers?: Marker[] }> => {
  
  if (!process.env.API_KEY) {
    return { text: "I need an API Key to see the board! (Check metadata.json configuration)" };
  }

  const model = "gemini-2.5-flash";
  const boardAscii = boardToString(board);
  
  const prompt = `
    Current Game State:
    ${boardAscii}
    
    The child (user) is playing: ${board.turn}
    Current Hint Request Level: ${hintLevel} (1=Question, 2=Options, 3=Answer)
    
    Response (JSON):
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "{}";
    
    try {
      // Clean up any potential markdown formatting just in case
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        text: parsed.text || "I'm thinking...",
        markers: parsed.markers || []
      };
    } catch (e) {
      console.error("JSON Parse Error", e);
      return { text: "Sensei is a bit confused right now. Try asking again!" };
    }
    
  } catch (error) {
    console.error("AI Error", error);
    return { text: "Oh no! I lost my connection to the Go server in the clouds. ☁️" };
  }
};
