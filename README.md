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
    *   *Note: The architecture supports swapping this out for a WebAssembly implementation of GnuGo, but currently defaults to the JS MCTS engine for ease of deployment.*

---

## Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd gocratic
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    To enable the Socratic AI features (Panda Sensei), you need a **Google Gemini API Key**.
    
    1.  Get a free key from [Google AI Studio](https://aistudio.google.com/).
    2.  Create a `.env` file in the root directory (or set it in your environment variables).
    3.  Add the key:
        ```
        API_KEY=your_actual_api_key_here
        ```
    *Note: Ensure your build system (Vite/Webpack) is configured to expose this key to `process.env`.*

4.  **Run the Application**
    ```bash
    npm start
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Game Engine Setup
*   **No WASM installation required**: This version uses a pure JavaScript engine (`services/simpleAi.ts`) by default. This ensures the game runs immediately after `npm install` without needing to compile binaries or manage CORS headers for WebAssembly files.
*   **No Python/Backend required**: The logic is entirely client-side.

---

## Dependencies

### Runtime
*   **React 19**: UI Framework.
*   **@google/genai**: SDK for interacting with the Gemini 2.5 Flash model.
*   **Tailwind CSS**: Utility-first CSS framework.

### Dev/Build
*   **TypeScript**: Application logic is strictly typed.
