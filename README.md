# GoCratic

GoCratic is a web-based Go (Baduk/Weiqi) learning platform designed for children and beginners. Unlike traditional engines that simply tell you the best move, GoCratic features **GoBot**, an AI tutor powered by Google Gemini that uses the Socratic method to guide players toward finding the solution themselves.

I made this primarily to test Google’s AI studio and how good the vibe coding features are. I figure this was something complex enough to stress test it. Secondary, as a Go Tutor.

The only big snag the AI ran into was initially trying to install and use GNU Go. I am not 100% sure AI Studio can run GNU Go (or KataGo, other engines). But then, through some good old fashion web search and Gemini back and forths, I got GNU Go installed through Docker + Google Cloud Run as a separate thing. So that unblocked the rest of the development. So yeah, most of this was Vibe Coded with Google AI Studio 👀

## Features

### 🤖 GoBot AI Mentor
*   **Socratic Guidance**: The AI monitors your game in real-time. Instead of solving the puzzle for you, it asks guiding questions to help you spot "ataris", "cuts", or "big points" yourself.
*   **Real-time Mentor Banner**: A non-intrusive notification bar that appears when you play a suboptimal move. It offers a gentle nudge or a quick observation without blocking the board.
*   **3-Level Hint System**:
    1.  **Guiding Question**: Highlights key areas and prompts thinking.
    2.  **Options Analysis**: Suggests 2-3 plausible moves and explains the pros and cons.
    3.  **Direct Suggestion**: Shows the best move when requested.
*   **Interactive Chat**: A friendly chat interface where the AI explains Go concepts in simple English, using emojis and encouragement.
*   **Model Selection**: Toggle between different Gemini models (Flash Lite, 2.5 Flash, 3.0 Pro) to balance speed vs. reasoning depth.

### 🎮 Gameplay & Opponents
*   **Dual Engine Support**:
    *   **Gemini AI (Online)**: Play against Google's Gemini models. These models play distinctively "human-like" moves and can explain their reasoning.
    *   **Monte Carlo (Offline)**: A pure JavaScript engine that runs entirely in your browser for offline practice.
    *   **GNU Go (Cloud)**: Connects to a cloud-hosted GNU Go instance for traditional engine analysis and accurate scoring.
*   **Controls**:
    *   **Undo/Redo**: Navigate through game history.
    *   **Force AI**: Make the AI play immediately.
    *   **Pass/Resign**: Standard game controls.

### 🛠️ Tools & Modes
*   **Setup Mode**: Create custom board positions to test scenarios (Black/White/Clear stones).
*   **Save/Load**: Export your game state to `.sgf` files and resume later.
*   **Puzzle Mode**: Practice specific scenarios.

### 🎨 User Interface
*   **Responsive Design**: Optimized for both Desktop (sidebar chat) and Mobile (floating widgets).
*   **Smart Hints**: Visual cues (markers) that adapt to the stone color (Black/White) for better visibility on the wood texture.
*   **Visuals**: SVG-based board with wood textures, drop shadows, and clear coordinate labels.

---

## Architecture

The application is built as a Single Page Application (SPA) using React 19.

### Key Components
*   **`App.tsx`**: Main entry point. Manages high-level layout, game state, and the "Mentor Banner".
*   **`components/GoBoard.tsx`**: Interactive Go board rendered with SVG/CSS Grid. Handles pointer events for touch/mouse interaction.
*   **`components/SenseiChat.tsx`**: The chat interface for the AI tutor.
*   **`components/MobileChatWidget.tsx`**: Handles the floating chat bubble and modal overlay for mobile devices.

### Custom Hooks
State logic is separated into specialized hooks for cleaner code:
*   **`useGoGame.ts`**: Manages the core game rules (liberties, captures, ko, suicide), history (Undo/Redo), and scoring.
*   **`useAiCoach.ts`**: Coordinates the AI interactions, including the Chat interface, Opponent Move generation, and the "Bad Move" feedback loop.
*   **`useAnalysis.ts`**: Manages background communication with the analysis engine (GNU Go) to provide real-time hints.

### Services
*   **`gameLogic.ts`**: Pure TypeScript implementation of Go rules.
*   **`aiService.ts`**: Interface for the Google Gemini API (`@google/genai`) used by GoBot for chat and guidance.
*   **`geminiEngine.ts`**: Interface for using Gemini as a competitive Go opponent.
*   **`gnugoService.ts`**: Interface for the GNU Go API (running on Cloud Run) for scoring and analysis.
*   **`simpleAi.ts`**: A custom Monte Carlo Tree Search implementation in pure JavaScript for offline play.

---

## Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI**: Google GenAI SDK (`@google/genai`), Gemini 2.5 Flash / 3.0 Pro models
*   **Engine**: GNU Go (Cloud Run), Custom Monte Carlo (Browser)

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
    To enable the AI features (GoBot) and Gemini Opponents, you need a **Google Gemini API Key**.
    1.  Get a free key from [Google AI Studio](https://aistudio.google.com/).
    2.  Create a `.env` file in the root directory.
    3.  Add the key:
        ```
        API_KEY=your_actual_api_key_here
        ```

4.  **Run the Application**
    ```bash
    npm start
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
