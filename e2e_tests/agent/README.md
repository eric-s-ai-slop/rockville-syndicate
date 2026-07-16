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

## Token-efficient repository checks

- `npm run agent:check -- <changed-file...>` runs typecheck, ESLint, and the smallest safe Vitest set. Unknown or cross-cutting source files fall back to the full unit suite.
- `npm run check:agent` runs the complete typecheck, ESLint, unit, and build gate through a bounded concurrent worker pool with compact output. It waits for every stage, aggregates one receipt, and streams separate logs under ignored `agent-artifacts/check/`. The default uses the smaller of five workers or the detected CPU allowance; override it with `--concurrency <n>` or `OMEGA_CHECK_CONCURRENCY` when benchmarking a specific machine.
- `npm run agent -- --help walkto` prints only that command's syntax, arguments, and one example; add `--json` for machine-readable help.
- `npm run agent:scaffold-chapter -- <index> <slug>` creates a minimal typed chapter config without registering incomplete content.
- `npm run agent:scaffold-mode -- <id>` creates a mode from the template and updates its typed config/runtime registries atomically.
- `npm run agent:boundaries` checks import direction between content, runtime, modes, and UI.
- `npm run agent:registry` emits the compact machine-readable chapter/mode inventory used by generated documentation and agent briefs.
- Add `--symbols` to `agent:map` or `agent:registry` only when exact AST declaration ranges are needed; the default output stays compact.
- `npm run agent:integration` runs the two live-server CLI protocol tests; the normal Vitest suite intentionally excludes them.

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
| A1 console logs | `getConsoleLogs()` / `clearConsoleLogs()` |
| A2 canvas text extraction | `extractVisibleText()` |
| A3 target/NPC dump | `dumpWalkAndNpcTargets()` |
| A4 beat inspection | `inspectBeats()` |
| A5 composite observe | `observeComposite()` |
| B1 scene warp | `warpScene(sceneIndex)` |
| B2 save-state | `saveQuickState()` / `loadQuickState()` |
| B4 audio state | `inspectAudio()` |
| B5 camera controls | `inspectCamera()` / `setCameraZoom()` / `setCameraCenter()` |
| B7 time scale / fast-forward | `setTimeScale(multiplier)` |
| — coordinate conversion | `worldToViewport(worldX, worldY, scrollFactor?)` |
| §4 pause loop | `pauseLoop()` / `resumeLoop()` / `isLoopRunning()` |
| §4 step N frames | `stepFrames(frames, fps?)` |
| C1 physics debug | `setPhysicsDebug(enabled)` |
| N2 stabilized capture | `stabilizedScreenshot(filePath)` |
| N4/E5 observation delta | `observeDiff()` |
| N4/E6 condition wait | `watch(jsExpr, timeoutMs?)` |
| N3 actor bounding boxes | `getActorBoundingBoxes()` |
| N3 annotated screenshot | `annotateScreenshot(filePath)` |
| — bookkeeping for golden `.meta.json` | `setSeed(seed)` |
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

- **No named helper functions nested inside a `page.evaluate(() => {...})`
  callback.** `const foo = (x) => {...}` (or a `function foo(){}` declaration)
  defined *inside* an evaluate callback in this file trips a
  `ReferenceError: __name is not defined` at runtime in the page — tsx/esbuild
  wraps named function bindings with a `__name(fn, "fn")` call for stack-trace
  fidelity, and that helper only exists in the outer Node bundle, not in the
  string Playwright re-evaluates in the browser. Anonymous callbacks and
  `for`/`while` loops over plain data are fine; a nested *named* function/arrow
  is not. Bit `getActorBoundingBoxes` (N3) — fixed by flattening it into two
  loops (gather candidates, then convert) instead of an inline `pushSprite`
  helper. If you need to factor out logic, do it as data transformation
  (arrays of plain objects), not as a named closure.
- **Trusted events only.** We never `dispatchEvent(new KeyboardEvent(...))` —
  synthetic events are `isTrusted: false` and skip the mouse/pointer pairing.
- **Focus first.** Call `focusCanvas()` once after boot; CDP key events need the
  page focused.
- **Coordinates are viewport CSS pixels** (what Playwright's mouse uses), not
  Phaser world coordinates. Convert with `worldToViewport()` or use `dumpWalkAndNpcTargets()` which pre-calculates viewport coordinates for walk targets and NPCs.
- **Always `dispose()`** in `finally`/`afterEach`; a held key leaking into the
  next test is a classic flake.
- **`stepFrames`/`pauseLoop` are dev-build only** — they rely on
  `window.__OMEGA_GAME__`, which `GameLayout.tsx` exposes under
  `import.meta.env.DEV`.
