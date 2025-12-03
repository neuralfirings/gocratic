
import { GoogleGenAI } from "@google/genai";
import { BoardState, ChatMessage, Marker, AnalysisMove, Coordinate } from "../types";
import { boardToString } from "./gameLogic";
import { toGtpCoordinate, fromGtpCoordinate } from "./gtpUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are "GoBot", a kind, wise, and patient Go (Baduk/Weiqi) teacher for children.

GOAL:
Teach the user through the Socratic method. 
**DO NOT** simply tell the user the best move unless they are visibly frustrated or explicitly ask for the "answer" after trying to find it themselves.
Instead, guide them to the solution by asking questions about the board state.

CONTEXT AWARENESS & CONTINUITY:
- Check the [CHAT AND PLAY HISTORY] carefully.
- **CRITICAL**: If the user asks for a hint (or says "Give me a hint") multiple times for the **SAME board state** (meaning no moves have been played since your last message):
    1. **DO NOT** greet them again (no "Hello", "Hi there", "Welcome back").
    2. **DO NOT** repeat the same observation you just made.
    3. **CONTINUE** the thought naturally. Treat it as one long conversation.
       - *Example*: If you previously said "White is threatening D4", and they ask for a hint again, say: "If you ignore that threat, White might cut you off. Can you find a move to connect?"
    4. **BECOME MORE SPECIFIC** with each request:
       - **1st Request**: Broad observation. Point out the opponent's last move (△). "What is White trying to do?"
       - **2nd Request**: Specific suggestion. Mark a candidate move for the student (○). "What happens if you play at ○ (C3)?"
       - **3rd Request**: Explanation/Answer. "Playing at ○ (C3) protects your territory."

ENGINE ANALYSIS & GUIDANCE:
- You may be provided with [ENGINE BEST MOVES]. These are the mathematically best moves, sorted by score.
- **Evaluate the Options**: If multiple moves are suggested, think about *why* they are good. 
  - Does one move protect a cut?
  - Does another move expand territory?
  - Does a third move attack a weak group?
- **Compare and Contrast**: Instead of picking just one, guide the user to consider the different goals.
  - "I see a few good options here. You could protect your corner, or maybe try to reduce White's space. Which feels more important right now?"
- **Targeted Questions**: Use the engine moves to formulate your questions.
  - If the best move is D4 (connecting): "Is your group connected safely? What if White plays here?"
  - If the best move is F3 (attacking): "White's group looks a bit floating. Can you put pressure on it?"
- **DO NOT** say "The engine says..." or "The computer thinks...". Make it sound like your own wisdom.
- Use the engine's best moves as the "Target" you are guiding the student towards.

INPUT:
1. Current Board State (ASCII with Move History).
2. Chat and Play History (Interleaved timeline of what happened).
3. User's new message/question.
4. Engine Analysis (Optional).

OUTPUT FORMAT:
You MUST return a RAW JSON object.
DO NOT wrap the output in markdown code blocks (like \`\`\`json).
Format:
{
  "text": "Your helpful response here including coordinates like △ (D4)...",
  "markers": [
    { "coordinates": "D4", "type": "TRIANGLE" },
    { "coordinates": "C3", "type": "CIRCLE" }
  ]
}

MARKER USAGE:
- Use markers to illustrate your point visually on the board.
- Types: "TRIANGLE" (△) for opponent moves/threats, "CIRCLE" (○) for suggestions, "SQUARE" (□) for territory/key points, "X" (✕) for bad moves.
- **IMPORTANT**: In your "text", ALWAYS include the specific coordinate in parentheses when you mention a symbol. 
  - CORRECT: "Look at the stone marked with △ (D4)."
  - INCORRECT: "Look at the stone marked with △."
  - INCORRECT: "Look at D4." (Better to include the symbol too).

TONE:
- Encouraging, simple English, friendly.
- Use emojis.
`;

export const getSenseiResponse = async (
  board: BoardState, 
  history: ChatMessage[],
  userMessage: string,
  modelName: string = "gemini-2.5-flash",
  analysisData: AnalysisMove[] = []
): Promise<{ text: string; markers?: Marker[], cost: number }> => {
  
  if (!process.env.API_KEY) {
    return { text: "I need an API Key to see the board! (Check metadata.json configuration)", cost: 0 };
  }

  const boardAscii = boardToString(board);
  
  // --- Build Interleaved History ---
  let interleavedHistory = "";
  const maxMoves = board.history.length;

  for (let t = 0; t <= maxMoves; t++) {
      // 1. Add Chat Messages that happened at this state
      const chatsAtThisTurn = history.filter(m => m.moveNumber === t);
      chatsAtThisTurn.forEach(msg => {
          const prefix = msg.sender === 'user' ? 'Student' : 'GoBot';
          interleavedHistory += `    ${prefix}: ${msg.text}\n`;
      });

      // 2. Add the Move that happened
      if (t < maxMoves) {
          const move = board.history[t];
          const coord = toGtpCoordinate(move.coordinate, board.size);
          const color = move.color === 'BLACK' ? 'B' : 'W';
          interleavedHistory += `    (${color}@${coord})\n`;
      }
  }

  // Truncate history
  const historyLines = interleavedHistory.split('\n');
  if (historyLines.length > 50) {
      interleavedHistory = "...(older history truncated)...\n" + historyLines.slice(-50).join('\n');
  }

  // Format analysis for prompt
  let analysisPrompt = "Not available.";
  if (analysisData.length > 0) {
    analysisPrompt = analysisData.map(m => {
        const coord = toGtpCoordinate(m.coordinate, board.size);
        return `${coord} (Score: ${m.score})`;
    }).join(", ");
  }

  const prompt = `
    [CURRENT BOARD STATE]
    ${boardAscii}
    
    [ENGINE BEST MOVES]
    ${analysisPrompt}

    [CHAT AND PLAY HISTORY]
    ${interleavedHistory}
    
    [STUDENT'S NEW MESSAGE]
    "${userMessage}"
    
    Response (JSON):
  `;

  // Define full payload
  const requestPayload = {
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, 
      responseMimeType: "application/json"
    }
  };

  // --- LOGGING REQUEST ---
  // Only log if not in production (Cloud Run)
  if (!window.location.hostname.includes('run.app')) {
    console.log("🤖 [GoBot] FULL API PAYLOAD:", requestPayload);
  }

  try {
    const response = await ai.models.generateContent(requestPayload);

    const responseText = response.text || "{}";
    
    // --- LOGGING RESPONSE ---
    if (!window.location.hostname.includes('run.app')) {
      console.log("🤖 [GoBot] Raw Response:", responseText);
    }

    // Calculate Cost
    const inputTokens = (prompt.length + SYSTEM_INSTRUCTION.length) / 4;
    const outputTokens = responseText.length / 4;
    
    let inputPrice = 0.075;
    let outputPrice = 0.30;

    if (modelName.includes('pro')) {
        inputPrice = 1.25;
        outputPrice = 5.00;
    } else if (modelName.includes('lite')) {
        inputPrice = 0.075; // Estimate similar to Flash but typically cheaper/faster
        outputPrice = 0.30;
    }

    const estimatedCost = (inputTokens / 1000000 * inputPrice) + (outputTokens / 1000000 * outputPrice);
    
    try {
      // 1. Strip Markdown
      let cleanJson = responseText
        .replace(/```json/gi, '') 
        .replace(/```/g, '')
        .trim();

      // 2. Parse
      const parsed = JSON.parse(cleanJson);
      
      // 3. Convert Markers (GTP String -> {x,y})
      const markers: Marker[] = [];
      if (Array.isArray(parsed.markers)) {
          parsed.markers.forEach((m: any) => {
              if (m.coordinates && m.type) {
                  const coord = fromGtpCoordinate(m.coordinates, board.size);
                  if (coord) {
                      markers.push({ ...coord, type: m.type });
                  }
              }
          });
      }

      return {
        text: parsed.text || "I'm listening...",
        markers: markers,
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


const BAD_MOVE_SYSTEM_INSTRUCTION = `
You are "GoBot", a Go teacher.
The student has just played a move that is likely suboptimal.
Your goal is to be helpful and retrospective, like a commentator or a gentle coach.
**IMPORTANT**: The game is continuing. The opponent is about to play.
Do NOT tell them to "Stop" or "Undo".

1. Briefly mention a downside (e.g. "That leaves a cut at D4", "A bit slow").
2. Suggest there might have been a bigger point.
3. Keep it VERY short (1 sentence ideally).
4. Use a friendly, "by the way" tone.
`;

export const getBadMoveFeedback = async (
  board: BoardState,
  playedMove: Coordinate,
  hints: AnalysisMove[],
  modelName: string = "gemini-2.5-flash"
): Promise<{ text: string, cost: number }> => {
    
    if (!process.env.API_KEY || hints.length === 0) return { text: "", cost: 0 };

    const boardAscii = boardToString(board);
    const playedGtp = toGtpCoordinate(playedMove, board.size);
    const hintsGtp = hints.slice(0, 3).map(h => toGtpCoordinate(h.coordinate, board.size)).join(", ");

    const prompt = `
      [BOARD STATE BEFORE MOVE]
      ${boardAscii}

      The student just played at: ${playedGtp}
      
      The engine suggests these are better moves: ${hintsGtp}

      Provide a brief, non-intrusive comment about the move ${playedGtp} compared to the better options. 
    `;

    const requestPayload = {
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: BAD_MOVE_SYSTEM_INSTRUCTION,
        temperature: 0.5,
      }
    };

    try {
        const response = await ai.models.generateContent(requestPayload);
        const responseText = response.text || "";

        // Simple cost est
        const inputTokens = (prompt.length + BAD_MOVE_SYSTEM_INSTRUCTION.length) / 4;
        const outputTokens = responseText.length / 4;
        const estimatedCost = (inputTokens / 1000000 * 0.075) + (outputTokens / 1000000 * 0.30);

        return { text: responseText, cost: estimatedCost };

    } catch (error) {
        console.error("Bad Move Feedback Error", error);
        return { text: "", cost: 0 };
    }
};
