# Pull Request: Architectural Overview & Performance Analysis

## Architecture Overview

Project Omega: The Rockville Syndicate is built on a hybrid architecture combining a modern web UI framework with a dedicated HTML5 game engine, backed by a lightweight Node.js Express server.

### Core Components:
1.  **UI & State Layer (React 19 + TypeScript + Vite)**
    *   Manages the HUD, Main Menu, Dialogue Trees, and overall application state.
    *   Uses Tailwind CSS for styling and lightweight layout.
    *   Persists user progress and settings locally using `localStorage` (e.g., `omega-progress-v1`).
2.  **Game Engine (Phaser 3)**
    *   Handles rendering, camera, physics, and gameplay logic inside `ChapterScene.ts`.
    *   Uses a multi-directional animation system (`SpritePreprocessor.ts`) to dynamically slice and register character sprite sheets at runtime.
    *   Maps and environments are constructed dynamically through procedural rects and loaded assets.
3.  **Backend & Serving (Express)**
    *   `server.ts` provides a lightweight backend.
    *   In development, it integrates Vite's middleware for Hot Module Replacement (HMR). In production, it serves the static built assets.
4.  **Data Storage (File-based JSON)**
    *   A simple JSON file (`db_data/leaderboard.json`) acts as the database for the leaderboard.
    *   Reads and writes are done via `fs.promises`.

---

## Architectural Performance Bottlenecks & Potential Issues

Based on the current architecture, several structural choices may lead to performance degradation at scale:

### 1. File-Based JSON Database (`server.ts`)
*   **O(N) Operations on Read/Write:** The leaderboard API (`/api/leaderboard`) reads, parses, modifies, and stringifies the *entire* `leaderboard.json` file on every update. As the leaderboard grows, this will cause significant memory spikes and CPU usage.
*   **Concurrency Queuing:** Concurrent writes are serialized through a single promise chain (`leaderboardUpdatePromise`). High traffic will cause this queue to back up indefinitely, resulting in extremely slow POST response times and potential memory bloat.
*   **Unpaginated Reads:** The GET endpoint returns the entire sorted array. A large leaderboard will result in large payloads, slowing down client load times and consuming bandwidth.

### 2. Runtime Asset Processing (`Phaser 3`)
*   **Procedural Texture Atlas Generation:** `ChapterScene.ts` dynamically packs texture atlases at runtime using fixed canvas dimensions. Processing numerous or overly large assets can lead to heavy CPU blocking on the main thread during scene initialization, causing noticeable load stutter.
*   **Dynamic Sprite Slicing:** Slicing sprite sheets at runtime via `SpritePreprocessor.ts` adds to the initialization overhead compared to using pre-compiled, optimized sprite atlases (like TexturePacker JSON hash).

### 3. Engine & UI Synchronization
*   **React + Phaser Integration:** Communicating between the Phaser event loop (which runs at 60FPS) and React's state management requires careful throttling. Firing React state updates (e.g., for HUD changes or dialogue progress) directly from the Phaser update loop without debouncing/throttling can trigger excessive React re-renders, dropping framerates.

### 4. Asset Load Management
*   **Memory Leaks with Texture Creation:** Dynamically creating canvases for prop extraction (`PropExtractor.ts`) and texture atlases leaves potential memory leaks if old textures are not explicitly destroyed when scenes transition or reset.
