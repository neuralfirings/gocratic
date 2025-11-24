# GoCratic - Socratic Go Tutor

GoCratic is a web-based Go (Baduk/Weiqi) learning platform designed for children and beginners. Unlike traditional engines that simply tell you the best move, GoCratic features **Panda Sensei**, an AI tutor powered by Google Gemini that uses the Socratic method to guide players toward finding the solution themselves.

## Features

### 🐼 Socratic AI Tutor (Panda Sensei)
*   **3-Level Hint System**:
    1.  **Guiding Question**: Highlights key areas (e.g., opponent's last move) and asks a question to prompt thinking.
    2.  **Options Analysis**: Suggests 2-3 plausible moves and explains the pros and cons of each.
    3.  **Direct Suggestion**: Shows the best move when the player is completely stuck.
*   **Visual Annotation**: The AI draws symbols (△, ○, □, ✕) directly on the board to illustrate concepts like "cutting points" or "territory boundaries."
*   **Interactive Chat**: A friendly chat interface where the AI explains Go concepts in simple language.

### 🎮 Gameplay & Engine
*   **Adjustable Difficulty**: Select from 10 difficulty levels, ranging from Beginner (~30k) to Sensei level (~12k).
*   **Client-Side Engine**: Runs a lightweight Monte Carlo Tree Search (MCTS) engine directly in the browser. No backend server required for gameplay.
*   **Puzzle Mode**: Includes specific scenarios (e.g., "Capture the Stone", "Stop the Invasion") to practice tactical skills.

### 🎨 User Interface
*   **Responsive Design**: Works on desktop and tablet sizes.
*   **Visuals**: SVG-based board with wood textures and clean, distinct stone rendering.
*   **Real-time Stats**: Tracks captures and turn history.

---

## Architecture

The application is built as a Single Page Application (SPA) using React.

### Core Components
*   **`App.tsx`**: Main controller handling game state, UI layout, and coordinating between the board, engine, and AI services.
*   **`GoBoard.tsx`**: A composite component using SVG for the grid/lines and CSS Grid for interactive stone placement.
*   **`SenseiChat.tsx`**: Handles the message stream between the user and the Gemini AI.

### Services
*   **`gameLogic.ts`**: Pure TypeScript implementation of Go rules. It handles:
    *   Group detection (flood fill algorithm).
    *   Liberty counting.
    *   Capture mechanics.
    *   Suicide move prevention.
*   **`aiService.ts`**: Interface for the Google Gemini API (`@google/genai`).
    *   Constructs prompts converting the board state to ASCII.
    *   Parses JSON responses to extract text and visual markers.
*   **`gnugoService.ts` / `simpleAi.ts`**:
    *   Implements a custom **Monte Carlo Tree Search (MCTS)** engine.
    *   Uses an async loop with `setTimeout` yielding to prevent blocking the main UI thread during calculations.
    *   *Note: The architecture supports swapping this out for a WebAssembly implementation of GnuGo.*

---

## Dependencies

### Runtime Dependencies
*   **React 19**: UI Framework.
*   **@google/genai**: SDK for interacting with the Gemini 2.5 Flash model.
*   **Tailwind CSS**: Utility-first CSS framework (loaded via CDN for lightweight setup).

### External APIs
*   **Google Gemini API**: Required for the Socratic tutoring features. An API Key must be configured in `metadata.json` or environment variables.

### Dev/Build
*   **TypeScript**: Application logic is strictly typed.
*   **Vite/Webpack** (Implicit): Assumed build tool for module bundling.
