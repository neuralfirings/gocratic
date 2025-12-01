# GoCratic - Socratic Go Tutor

GoCratic is a web-based Go (Baduk/Weiqi) learning platform designed for children and beginners. Unlike traditional engines that simply tell you the best move, GoCratic features **GoBot**, an AI tutor powered by Google Gemini that uses the Socratic method to guide players toward finding the solution themselves.

## Features

### 🤖 Socratic AI Tutor (GoBot)
*   **Smart Intervention**: The AI monitors your game in real-time. If you play a move that is significantly worse than the best option (based on engine analysis), the game "Pauses" and a notification appears. The AI then gently asks a guiding question to help you realize why the move might be a mistake before you commit to it.
*   **3-Level Hint System**:
    1.  **Guiding Question**: Highlights key areas (e.g., opponent's last move) and prompts thinking.
    2.  **Options Analysis**: Suggests 2-3 plausible moves and explains the pros and cons.
    3.  **Direct Suggestion**: Shows the best move when the player is stuck.
*   **Visual Annotation**: The AI draws symbols (△, ○, □, ✕) directly on the board to illustrate concepts like "cutting points" or "territory boundaries."
*   **Interactive Chat**: A friendly chat interface where the AI explains Go concepts in simple English.
*   **Model Selection**: Toggle between different Gemini models (Flash Lite, 2.5 Flash, 3.0 Pro) to balance speed vs. reasoning depth.

### 🎮 Gameplay & Opponents
*   **Dual Engine Support**:
    *   **Gemini AI (Online)**: Play against Google's Gemini models. These models play distinctively "human-like" moves and can explain their reasoning.
    *   **Monte Carlo (Offline)**: A pure JavaScript engine that runs entirely in your browser for offline practice.
    *   **GNU Go (Cloud)**: Connects to a cloud-hosted GNU Go instance for traditional engine analysis and scoring.
*   **Controls**:
    *   **Undo/Redo**: Navigate through game history.
    *   **Force AI**: Make the AI play immediately.
    *   **Pass/Resign**: Standard game controls.

### 🛠️ Tools & Modes
*   **Setup Mode**: Create custom board positions to test scenarios (Black/White/Clear stones).
*   **Save/Load**: Export your game state to `.sgf` files and resume later.
*   **Puzzle Mode**: Practice specific scenarios.

### 🎨 User Interface
*   **Responsive Design**: Optimized for both Desktop and Mobile.
*   **Mobile Experience**: Features a collapsible chat widget, floating action buttons, and notification bubbles to maximize board space on small screens.
*   **Visuals**: SVG-based board with wood textures, clean stone rendering, and clear coordinate labels.

---

## Architecture

The application is built as a Single Page Application (SPA) using React.

### Key Components
*   **`App.tsx`**: Main entry point. Manages high-level layout and state orchestration.
*   **`components/GoBoard.tsx`**: Interactive Go board rendered with SVG/CSS Grid. Handles pointer events for touch/mouse interaction.
*   **`components/SenseiChat.tsx`**: The chat interface for the AI tutor.
*   **`components/MobileChatWidget.tsx`**: Handles the floating chat bubble, notifications, and modal overlay for mobile devices.

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
    To enable the Socratic AI features (GoBot) and Gemini Opponents, you need a **Google Gemini API Key**.
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

---

## Dependencies

### Runtime
*   **React 19**: UI Framework.
*   **@google/genai**: SDK for interacting with Gemini models.
*   **Tailwind CSS**: Utility-first CSS framework.

### Dev/Build
*   **TypeScript**: Application logic is strictly typed.
