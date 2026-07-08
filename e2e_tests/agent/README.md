# `GameAgent` — stateful playtesting toolkit

Implements the interaction capabilities in
[`docs/browser_subagent_spec.md`](../../docs/browser_subagent_spec.md) for the
AI/scripted browser subagent that playtests this Phaser 3 game.

The existing QA helpers (`e2e_tests/helpers.ts`, `qa_capture.cjs`) only do
**discrete** input — one synthetic Space keydown, a click, a teleport. That
skips dialogue fine but can't hold `W` to walk, click-drag a slider, or charge a
mouse-held attack. `GameAgent` wraps Playwright's **trusted** input primitives
(`page.keyboard.down/up`, `page.mouse.down/move/up`) so Phaser's Keyboard/Pointer
plugins see continuous input exactly like a human's.

> **Just want to drive the game from the terminal?** Use the CLI —
> `npm run agent -- --help`. Full walkthrough in
> [`docs/AGENT_TOOLKIT.md`](../../docs/AGENT_TOOLKIT.md). The rest of this file is
> for calling `GameAgent` directly from Playwright specs.

## Spec → API map

| Spec capability | Method |
| --- | --- |
| §1 `hold_key(key)` | `holdKey(key)` |
| §1 `release_key(key)` | `releaseKey(key)` |
| §1 `press_key(key, duration_ms)` | `pressKey(key, durationMs?)` |
| §2 `mouse_down(x, y, button)` | `mouseDown(x, y, button?)` |
| §2 `mouse_move(x, y)` | `mouseMove(x, y)` |
| §2 `mouse_up(x, y, button)` | `mouseUp(x?, y?, button?)` |
| §2 `drag_mouse(sx, sy, ex, ey, duration_ms)` | `dragMouse(sx, sy, ex, ey, durationMs?, steps?)` |
| §3 `execute_javascript(code)` | `executeJavascript(code)` |
| §3 state inspection | `snapshotGameState()` |
| §4 pause loop | `pauseLoop()` / `resumeLoop()` / `isLoopRunning()` |
| §4 step N frames | `stepFrames(frames, fps?)` |
| — teardown (release stuck holds) | `dispose()` |
| — focus canvas before typing | `focusCanvas()` |

## Usage (Playwright test)

```ts
import { test, expect } from '@playwright/test';
import { GameAgent } from './agent';
import { navigateToChapter } from './helpers';

test('player walks right when W-equivalent is held', async ({ page }) => {
  const agent = new GameAgent(page);
  try {
    await navigateToChapter(page, 'Some Chapter');
    await agent.focusCanvas();

    const before = await agent.snapshotGameState();
    await agent.pressKey('d', 600);              // walk right for 600ms
    const after = await agent.snapshotGameState();

    expect(after.player!.x).toBeGreaterThan(before.player!.x);
  } finally {
    await agent.dispose();                        // never leave a key stuck down
  }
});
```

## Deterministic stepping (§4)

Freeze real time, decide, then advance an exact number of frames — no drift from
the agent's thinking latency:

```ts
await agent.holdKey('d');
await agent.stepFrames(30);          // advance exactly 30 fixed-timestep frames
const s = await agent.snapshotGameState();
await agent.releaseKey('d');
```

## Notes / gotchas

- **Trusted events only.** We never `dispatchEvent(new KeyboardEvent(...))` —
  synthetic events are `isTrusted: false` and skip the mouse/pointer pairing.
- **Focus first.** Call `focusCanvas()` once after boot; CDP key events need the
  page focused.
- **Coordinates are viewport CSS pixels** (what Playwright's mouse uses), not
  Phaser world coordinates. Convert with `snapshotGameState()` + camera math if
  you need to click a world-space object.
- **Always `dispose()`** in `finally`/`afterEach`; a held key leaking into the
  next test is a classic flake.
- **`stepFrames`/`pauseLoop` are dev-build only** — they rely on
  `window.__OMEGA_GAME__`, which `GameLayout.tsx` exposes under
  `import.meta.env.DEV`.
