
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
*   **Model Selection**: Toggle between different Gemini models (Flash, Flash-Lite, Pro) for the tutor to balance speed vs. reasoning depth.

### 🎮 Gameplay & Opponents
*   **Dual Engine Support**:
    *   **Gemini AI (Online)**: Play against Google's Gemini models (Flash Lite, 2.5 Flash, 3.0 Pro). These models provide strategic, natural-feeling moves.
    *   **Monte Carlo (Offline)**: A pure JavaScript engine that runs entirely in your browser.
        *   **Adjustable Depth**: Configure the strength by setting the number of simulations per spot (e.g., 2 sims/spot for instant moves, 200 sims/spot for stronger play).
*   **Controls**:
    *   **Undo/Redo**: Navigate through game history.
    *   **Cancel**: Stop the AI from thinking if it's taking too long.
    *   **Make Move**: Force the AI to play immediately (or play for the opponent).

### 🛠️ Tools & Modes
*   **Setup Mode**: Create custom board positions to test scenarios.
    *   *Tools*: Alternate colors, Black Only, White Only, Eraser.
*   **Save/Load**: Export your game state to a JSON file and resume it later.
*   **Puzzle Mode**: Includes specific scenarios (e.g., "Capture the Stone", "Stop the Invasion") to practice tactical skills.

### 🎨 User Interface
*   **Responsive Design**: Works on desktop and tablet sizes.
*   **Visuals**: SVG-based board with wood textures and clean, distinct stone rendering.
*   **Real-time Cost Tracking**: Displays estimated API cost for the current session when using Gemini models.

---

## Architecture

The application is built as a Single Page Application (SPA) using React.

### Core Components
*   **`App.tsx`**: Main controller handling game state, UI layout, and coordinating between the board, engine, and AI services.
*   **`GoBoard.tsx`**: A composite component using SVG for the grid/lines and CSS Grid for interactive stone placement.
*   **`SenseiChat.tsx`**: Handles the message stream between the user and the Gemini AI.

### Services
*   **`gameLogic.ts`**: Pure TypeScript implementation of Go rules (liberties, captures, suicide checks).
*   **`aiService.ts`**: Interface for the Google Gemini API (`@google/genai`) used by Panda Sensei.
*   **`geminiEngine.ts`**: Interface for using Gemini as a competitive Go opponent.
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
    To enable the Socratic AI features (Panda Sensei) and Gemini Opponents, you need a **Google Gemini API Key**.
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

## Game Configuration

### Offline Play
By selecting the **Monte Carlo** opponent in the dropdown, the game runs 100% locally.
*   **Speed**: Faster levels (2-10 simulations)， keep in mind each simulation iterates by playing randomly until the game is finished. So this can take a while. 
*   **Strength**: Higher levels (75-200 simulations) take longer (10-30s) 

### Online Play (Gemini)
By selecting a **Gemini** model (e.g., 2.5 Flash), the game sends the board state to Google's API to generate a move.
*   **Reasoning**: The AI also returns a short "reason" for its move, which is displayed in the chat log context if queried (implementation detail).
*   **Cost**: Uses your API quota. Flash models are very cheap/free; Pro models cost more.

---

## Dependencies

### Runtime
*   **React 19**: UI Framework.
*   **@google/genai**: SDK for interacting with Gemini models.
*   **Tailwind CSS**: Utility-first CSS framework.

### Dev/Build
*   **TypeScript**: Application logic is strictly typed.
