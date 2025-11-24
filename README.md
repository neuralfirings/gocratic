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
*   **Adjustable Difficulty**: Select from 10 difficulty levels.
*   **Dual Engine Support**:
    *   **Default**: Pure JavaScript Monte Carlo engine (Instant start, no downloads).
    *   **Advanced**: GnuGo WebAssembly engine (Standard strength, requires setup).
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
*   **`gameLogic.ts`**: Pure TypeScript implementation of Go rules (liberties, captures, suicide checks).
*   **`aiService.ts`**: Interface for the Google Gemini API (`@google/genai`).
*   **`gnugoService.ts`**: The bridge to the Go engine. It can be configured to use a local JS implementation or the GnuGo WASM binary.

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

## Game Engine Configuration

### Option 1: Simple Engine (Default - No Setup)
The app comes pre-configured with `services/simpleAi.ts`. This is a custom Monte Carlo engine written in pure JavaScript. 
*   **Pros**: Works immediately, no extra files, very fast.
*   **Cons**: Playing strength tops out around 15k.

### Option 2: GnuGo WASM (Advanced - Recommended for Strength)
If you want to use the standard **GnuGo** engine (which supports official ranking levels 1-10), you must set up the WebAssembly files locally. This fixes the `NetworkError` or `CORS` issues often seen when trying to load WASM from CDNs.

1.  **Download the Engine Files**:
    Download `gnugo.js` and `gnugo.wasm` (version 1.0 or similar) from a source like [js-gnugo](https://github.com/jmaxxo/js-gnugo) or extract them from the npm package.

2.  **Place in Public Folder**:
    Move both files into your project's `public/` folder:
    *   `public/gnugo.js`
    *   `public/gnugo.wasm`

3.  **Update `services/gnugoService.ts`**:
    Modify the `WORKER_SCRIPT` constant to load from your local public folder instead of the CDN:
    
    ```typescript
    // Change this line:
    // importScripts('https://unpkg.com/js-gnugo@1.0.0/gnugo.js');
    
    // To this:
    importScripts('/gnugo.js');
    ```

4.  **Restart**: Refresh your browser. The engine will now load the local WASM file.

---

## Dependencies

### Runtime
*   **React 19**: UI Framework.
*   **@google/genai**: SDK for interacting with the Gemini 2.5 Flash model.
*   **Tailwind CSS**: Utility-first CSS framework.

### Dev/Build
*   **TypeScript**: Application logic is strictly typed.
