# Browser Subagent Capabilities Spec: Canvas & WebGL Game Playtesting

> **Status: implemented.** All four capability groups below are provided by the
> `GameAgent` toolkit at [`e2e_tests/agent/`](../e2e_tests/agent/) (wrapping
> Playwright's trusted keyboard/mouse primitives + the `window.__OMEGA_GAME__`
> bridge). See [`e2e_tests/agent/README.md`](../e2e_tests/agent/README.md) for the
> spec→API map, and `GameAgent.smoke.spec.ts` for the integration test proving
> continuous key-hold movement, deterministic frame stepping, and loop control
> against the live build.

To effectively playtest real-time web games (like Phaser 3 / Canvas based games), the browser subagent requires enhancements to its interaction tools. The current discrete, stateless interaction model (`press_key`, `click`) is insufficient for continuous movement or real-time action mechanics.

Here are the specific tools and capabilities your engineering team needs to implement for the subagent:

## 1. Stateful Keyboard Controls (Continuous Input)
**The Problem:** The subagent currently relies on discrete key presses. Games require continuous key holds (e.g., holding 'W' to walk forward) over multiple animation frames.

**Required Tool Additions:**
- **`hold_key(key: string)`**: Fires a native `keydown` event without a corresponding `keyup`. The key must remain in the pressed state in the browser.
- **`release_key(key: string)`**: Fires the corresponding `keyup` event to stop the input.
- **Alternative (Duration-based):** `press_key(key: string, duration_ms: number)` - A single tool that holds a key down, waits asynchronously for `duration_ms`, and then releases it.

## 2. Stateful Mouse & Pointer Controls (Drag & Drop)
**The Problem:** Many mini-games require click-and-drag mechanics, swipe gestures, or holding down a mouse button to charge an attack.

**Required Tool Additions:**
- **`mouse_down(x: number, y: number, button: 'left' | 'right' = 'left')`**: Fires a `mousedown` / `pointerdown` event at the specified viewport coordinates and maintains the pressed state.
- **`mouse_move(x: number, y: number)`**: Fires a `mousemove` / `pointermove` event. If the mouse is down, this simulates dragging.
- **`mouse_up(x: number, y: number, button: 'left' | 'right' = 'left')`**: Fires a `mouseup` / `pointerup` event.
- **Alternative (Duration-based):** `drag_mouse(start_x, start_y, end_x, end_y, duration_ms)` - Smoothly interpolates mouse movement from start to end over a specified duration while holding the left click.

## 3. Game Engine Bridge (State Inspection)
**The Problem:** Real-time games run at 60 FPS. Visually parsing a game state from screenshots is computationally expensive, prone to timing errors, and often misses split-second UI affordances. 

**Required Capability:**
- **`execute_javascript(code: string)`**: The subagent needs the ability to evaluate arbitrary JavaScript in the browser context and return the result.
- **Why this matters for testing:** By exposing the game instance to the window (e.g., `window.__OMEGA_GAME__` which is already exposed in your dev environment), the agent can run JS to instantly query the player's exact X/Y coordinates, active scene, or current HP without relying on computer vision. This turns a brittle visual test into a robust state-based integration test.

## 4. Tick / Time Manipulation (Optional but Recommended)
**The Problem:** Real-time physics and animations can desynchronize with an agent's thinking speed (LLMs take seconds to process a frame that lasts 16ms).

**Required Capability:**
- If the testing environment permits, the subagent should be able to inject a mock timer or pause the Phaser game loop (`game.loop.sleep()`), take a screenshot, decide on the next input, apply the input, and step the game forward by exactly `N` frames. This ensures deterministic playtesting without being bottlenecked by the agent's inference latency.
