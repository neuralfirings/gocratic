
import { GoogleGenAI } from "@google/genai";
import { BoardState, ChatMessage, Marker } from "../types";
import { boardToString } from "./gameLogic";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are "Panda Sensei", a kind, wise, and patient Go (Baduk/Weiqi) teacher for children.

GOAL:
Teach the user through the Socratic method. 
**DO NOT** simply tell the user the best move unless they are visibly frustrated or explicitly ask for the "answer" after trying to find it themselves.
Instead, guide them to the solution by asking questions about the board state.

STRATEGY:
1. **Analyze** the opponent's last move. What are they threatening?
2. **Highlight** key areas using markers (weak groups, cutting points, big open spaces).
3. **Ask** the user questions like:
   - "What do you think White is trying to do here (marked with △)?"
   - "Is your group safe if you play elsewhere?"
   - "Which direction looks biggest to you, ○ or □?"

INPUT:
1. Current Board State (ASCII).
2. Chat History (Previous conversation).
3. User's new message/question.

OUTPUT FORMAT:
You MUST return a RAW JSON object.
DO NOT wrap the output in markdown code blocks (like \`\`\`json).
Format:
{
  "text": "Your helpful response here...",
  "markers": [
    { "x": 4, "y": 4, "type": "TRIANGLE" },
    { "x": 3, "y": 3, "type": "CIRCLE" }
  ]
}

MARKER USAGE:
- Use markers to illustrate your point visually on the board.
- Types: "TRIANGLE" (△) for opponent moves/threats, "CIRCLE" (○) for suggestions, "SQUARE" (□) for territory/key points, "X" (✕) for bad moves.
- In your "text", refer to these locations using the unicode symbols (△, ○, □, ✕) so the user knows what you are talking about. DO NOT use coordinates like "D4" in the text.

TONE:
- Encouraging, simple English, friendly.
- Use emojis.
`;

export const getSenseiResponse = async (
  board: BoardState, 
  history: ChatMessage[],
  userMessage: string
): Promise<{ text: string; markers?: Marker[], cost: number }> => {
  
  if (!process.env.API_KEY) {
    return { text: "I need an API Key to see the board! (Check metadata.json configuration)", cost: 0 };
  }

  const model = "gemini-2.5-flash";
  const boardAscii = boardToString(board);
  
  // Serialize history (limit to last 10 messages to save context window/cost)
  const recentHistory = history.slice(-10).map(msg => 
    `${msg.sender === 'user' ? 'Student' : 'Sensei'}: ${msg.text}`
  ).join('\n');

  const prompt = `
    [CURRENT BOARD STATE]
    ${boardAscii}
    
    [CHAT HISTORY]
    ${recentHistory}
    
    [STUDENT'S NEW MESSAGE]
    "${userMessage}"
    
    Response (JSON):
  `;

  // Define full payload
  const requestPayload = {
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, // Slightly higher for more natural conversation
      responseMimeType: "application/json"
    }
  };

  // --- LOGGING REQUEST ---
  console.log("🐼 [Sensei] FULL API PAYLOAD:", requestPayload);

  try {
    const response = await ai.models.generateContent(requestPayload);

    const responseText = response.text || "{}";
    
    // --- LOGGING RESPONSE ---
    console.log("🐼 [Sensei] Raw Response:", responseText);

    // Calculate Cost (Flash Pricing Estimate)
    const inputTokens = (prompt.length + SYSTEM_INSTRUCTION.length) / 4;
    const outputTokens = responseText.length / 4;
    const estimatedCost = (inputTokens / 1000000 * 0.075) + (outputTokens / 1000000 * 0.30);
    
    try {
      // 1. Strip Markdown
      let cleanJson = responseText
        .replace(/```json/gi, '') 
        .replace(/```/g, '')
        .trim();

      // 2. Fix bad control characters (unescaped newlines inside strings)
      // This regex looks for newlines that are NOT followed by a control char like ", }, or ]
      // It's a heuristic, but often helps with "bad control character" errors.
      // cleanJson = cleanJson.replace(/(?<=:|")\n(?=")/g, "\\n"); 
      
      const parsed = JSON.parse(cleanJson);
      
      return {
        text: parsed.text || "I'm listening...",
        markers: parsed.markers || [],
        cost: estimatedCost
      };
    } catch (e) {
      console.error("JSON Parse Error", e);
      return { text: "I'm having a little trouble thinking clearly. Could you ask that again?", cost: estimatedCost };
    }
    
  } catch (error) {
    console.error("AI Error", error);
    return { text: "My connection to the cloud is a bit fuzzy right now. ☁️", cost: 0 };
  }
};
