# Agent Toolkit Spec v2 — Observation, Control & Regression Tools

Successor to [`browser_subagent_spec.md`](browser_subagent_spec.md) (v1: stateful
keyboard/mouse, engine bridge, tick control — **implemented** in
[`e2e_tests/agent/`](../e2e_tests/agent/), driven via `npm run agent`, documented
in [`AGENT_TOOLKIT.md`](AGENT_TOOLKIT.md)).

v2 assumes v1's infrastructure and extends it. Every tool below is a new **CLI
command or flag** on `e2e_tests/agent/cli.ts`, backed where needed by a helper on
`GameAgent`. All output follows the established contract: **one JSON line per
command on stdout** (`{"cmd":"…","ok":true,…}`), errors as `ok:false` without
crashing the session.

Tools are grouped by theme and tagged with a priority tier:

- **P0** — closes the observation loop; build first.
- **P1** — big iteration-speed or determinism win.
- **P2** — valuable, build when the need bites.

---

## A. Observation — let the agent "see" without computer vision

### A1. Console & Error Interceptor — **P0** *(always on, not a command)*

**Problem.** A game can look fine while a silent error, memory leak, or missing
asset fires in the background. Phaser renders a missing texture as a plain green
box with no exception — the *network* failure is the only signal.

**Spec.**
- On session boot, the CLI attaches:
  - `page.on('console')` — forward `warn`/`error` (and `log` with `--verbose`),
  - `page.on('pageerror')` — uncaught exceptions with stack,
  - `page.on('requestfailed')` — failed asset/network requests (URL + failure reason).
- Each event is emitted as its own JSONL line, interleaved with command output:
  `{"cmd":"console","level":"error","text":"…","location":"file:line"}`
  `{"cmd":"pageerror","message":"…","stack":"…"}`
  `{"cmd":"requestfailed","url":"…","failure":"…"}`
- A `--quiet-console` flag suppresses them; default is **on**.
- On session exit, emit a summary line: total errors/warnings/failed requests, so
  a scripted run can assert "zero console errors" from the last line alone.

**Notes.** Zero game-side code. Pure Playwright event wiring in `cli.ts`.

---

### A2. Canvas Text Extractor — **P0** — **implemented**

**Problem.** Dialogue and UI text render into the Phaser canvas (bubble text, HUD
labels, mode overlays) or into React DOM (the `p.font-pixel` dialogue line,
choice buttons). OCR on screenshots is slow and unreliable; the agent needs text
as data.

**Spec.**
- CLI command: `text`
- Bridge: walk `scene.children.list` of every **active** scene (recursing into
  `Container`s), collect every `Phaser.GameObjects.Text` and `BitmapText` that is
  `visible`, `alpha > 0`, and non-empty. All canvas text goes through the
  `label()` helper, so objects are well-formed.
- Also scrape the DOM layer: the active dialogue line (`p.font-pixel`), any
  `[data-testid="dialogue-choice"]` buttons, and top-HUD text.
- Output, per entry:
  ```jsonc
  {"source":"canvas"|"dom", "text":"…", "x":123, "y":456,          // world coords (canvas)
   "screen":{"x":…,"y":…},                                          // viewport px (both)
   "scene":"ChapterScene", "depth":…, "scrollFactor":0|1}
  ```
- `screen` for canvas objects is computed through the camera (scroll + zoom) so
  the agent can immediately `click` what it reads.

**Acceptance.** During a dialogue beat, `text` returns the visible line and the
speaker name; during `doubleCall`, it returns the dialer UI labels. Regression
value: v1 QA finding #7 (intro text painted onto the floor) is detectable from
the JSON alone — world-anchored text with `scrollFactor:1` where screen-space UI
is expected.

---

### A3. Interactable & Walk-Target Dump — **P0** — **implemented**

**Problem.** The agent guesses coordinates. The scene already knows exactly where
the player is supposed to go and what can be interacted with.

**Spec.**
- CLI command: `targets`
- Bridge reads, from the live `ChapterScene`:
  - `scene.walkTarget` — `{x, y, radius, markerLabel}` or null,
  - interactive props / trigger zones registered by `MapBuilder` (expose a
    read-only list; add a tiny registry in `MapBuilder` if one doesn't exist),
  - DOM choice buttons currently clickable.
- Each entry includes both world and viewport coordinates (same camera math as A2).
- Output: `{"cmd":"targets","ok":true,"walkTarget":{…}|null,"props":[…],"choices":[…]}`

**Acceptance.** After `advance`, `targets` names the active walk marker; the
agent can complete a walk beat with `press`/`hold` toward `walkTarget` (or the
existing teleport) without ever taking a screenshot.

---

### A4. Beat Inspector — **P0**

**Problem.** "The game looks stuck" usually means "a beat is waiting on a
condition that can't fire." Diagnosing that from pixels is hopeless.

**Spec.**
- CLI command: `beat`
- Bridge reads `BeatEngine` state: current beat index, beat `type`, total beats
  in the scene, and **what it is waiting on** (dialogue dismiss / choice / walk
  target reached / mode completion / timer), plus the active scene index within
  the chapter.
- Output: `{"cmd":"beat","ok":true,"sceneIndex":4,"beatIndex":12,"of":31,"type":"dialogue","waitingOn":"dismiss","speaker":"eric"}`
- Companion command: `skipbeat [n]` — force-advance 1 (or n) beats using the
  engine's own advance path (never a hand-rolled duplicate — StrictMode
  double-fire history applies to any new bridge into React).

**Acceptance.** In a stalled playthrough, `beat` immediately distinguishes
"waiting for walk target the player can't reach" (level-design bug) from "beat
never registered its completion callback" (engine bug).

---

### A5. `observe` — Composite Frame Snapshot — **P0** *(build last of the P0s)*

**Problem.** One agent decision should not cost five round-trips.

**Spec.**
- CLI command: `observe`
- Returns one JSON object aggregating: `state` (v1 snapshot), `text` (A2),
  `targets` (A3), `beat` (A4), audio summary (B4), perf sample (C4), and a count
  of console errors since the last `observe`.
- Optional flag `observe --shot` also saves a screenshot and includes its path.
- This is the primary playtesting primitive: *screenshot-free* full situational
  awareness in a single line.

**Acceptance.** An LLM agent given only `observe` + v1 input commands can
complete a chapter's walk-and-talk beats with no image input at all.

---

## B. Control — get to the bug in seconds, not minutes

### B1. Scene Jumper / Fast Travel — **P1** — **implemented**

**Problem.** Reproducing a Scene 10 bug should not require playing Scenes 1–9.

**Spec.**
- CLI flags: `--scene <n>` (jump after chapter boot) and `--pos <x>,<y>`
  (teleport player after the jump).
- CLI commands: `goto <sceneIndex>` and `teleport <x> <y>` for mid-session use.
- Implementation: the existing `scene.transitionToScene(n, …)` path (already
  proven in `qa_capture.cjs`) + setting `player.x/y`. Use a short transition
  duration; wait for the transition callback before emitting `ok`.
- **Must emit a warning field** when jumping forward: beats in skipped scenes may
  set state (flags, spawned actors, HP changes) that the target scene assumes.
  `{"cmd":"goto","ok":true,"scene":10,"warning":"skipped-state: scenes 1-9 not executed"}`
- Pairs with B2 for a *correct*-state jump.

### B2. Save-State Snapshot / Restore — **P1** — **implemented**

**Problem.** Some bugs only manifest with specific accumulated state. Recreating
that state manually every run is the single biggest time sink; B1 alone boots
scenes in a possibly-impossible state.

**Spec.**
- CLI commands:
  - `savestate <file>` — dump `{saveBlob, chapterId, sceneIndex, beatIndex, player:{x,y}, hp}` to a JSON file. The blob is the `omega-save-v2` localStorage value — read via the bridge, **never** a parallel persistence path (CLAUDE.md rule: all persisted state goes through `settings.ts`).
  - `loadstate <file>` — write the blob back into localStorage, reload the page,
    re-navigate to the chapter, `goto` the scene, `skipbeat` to the beat index,
    teleport the player. Emit `ok` only when the full restore completes.
- Emulator-style ergonomics: capture once right before a bug, restore in every
  subsequent run.

**Acceptance.** `savestate s.json` → kill session → new session `loadstate s.json`
→ `observe` shows identical scene/beat/position/hp.

### B3. Minigame Launcher — **P1**

**Problem.** Testing one of the 15 registered modes means walking a chapter until
its trigger beat fires.

**Spec.**
- CLI commands:
  - `modes` — list registered mode ids via `listModeIds()`.
  - `mode <id>` — launch mode `<id>` immediately in the current scene with the
    real `ModeContext` (launch through the same code path the beat uses, so
    lifecycle/teardown match production — see `modes/CLAUDE.md` traps).
  - `winmode` / `losemode` — complete the foreground mode via
    `activeMode.onCompleteCallback({outcome})` (the exact mechanism `advanceUntil`
    already uses).
- Output includes the mode's `ModeResult` on completion.

**Acceptance.** `mode benTrivia; observe` shows the trivia UI's text (A2) with no
chapter navigation. `winmode` tears it down cleanly (no orphaned HUD objects —
check via A2 that its labels are gone).

### B4. Audio Inspector — **P1**

**Problem.** QA checklists contain audio assertions ("Scene 0 plays in silence",
"BGM never returns post-snap") that currently require human ears.

**Spec.**
- CLI command: `audio`
- Bridge reads `game.sound.sounds` → for each: `{key, isPlaying, volume, loop, seek, duration}`, plus the AudioController's current stage-track key.
- Output: `{"cmd":"audio","ok":true,"playing":[…],"stageTrack":"music_ch6"|null,"muted":false}`
- Folded into `observe` as a compact summary (`playing` keys only).

**Acceptance.** In Chapter 12 Scene 0, `audio` shows `playing: []` (the verified
silent-open behavior becomes a scriptable assertion).

### B5. Camera Commands — **P1**

**Problem.** The full-map zoom-out in `qa_capture.cjs` is how the visible-collision-
rect bugs were found; it should be a first-class command, not a bespoke script.

**Spec.**
- CLI commands:
  - `cam fit` — stop follow, zoom to fit the whole `map` rect, center it (the
    `qa_capture.cjs` recipe).
  - `cam follow` — restore `startFollow(player)` at the chapter's normal zoom
    (`chapter.cameraZoom ?? 2.0`).
  - `cam zoom <z>`, `cam center <x> <y>` — manual control.
- **Hard rule:** never call `cameras.main.setBounds(…)` (lint-enforced project
  gotcha); fit is achieved purely via zoom + centerOn.

### B6. World↔Viewport Converter — **P1** — **implemented**

**Problem.** v1 documents the "coordinates are viewport pixels, not world units"
gotcha; this deletes it.

**Spec.**
- CLI commands:
  - `clickworld <x> <y>` — convert world → viewport through the active camera
    (scroll, zoom, canvas offset within the page) and click there.
  - `where <x> <y>` — print both conversions without clicking.
- The conversion helper lives on `GameAgent` and is reused by A2/A3 `screen` fields.

### B7. Time Scale / Fast-Forward — **P2**

**Problem.** Intentional slow content (e.g. Chapter 12 Scene 11's ~25-second
hold) makes every test run pay real-time cost.

**Spec.**
- CLI command: `speed <multiplier>` — sets `scene.time.timeScale`,
  `scene.tweens.timeScale`, `physics.world.timeScale` (note: Arcade's timeScale
  semantics are inverse — encapsulate so `speed 10` always means 10× faster),
  and `anims.globalTimeScale`.
- `speed 1` restores. `observe` reports the current multiplier so a forgotten
  fast-forward can't silently invalidate timing-sensitive findings.
- Interaction note: prefer v1 `stepFrames` for determinism; `speed` is for
  wall-clock-bound waits.

---

## C. Determinism & Regression — catch bugs without looking

### C1. Physics Debug Toggle — **P1** — **implemented**

**Problem.** Invisible walls and non-firing overlap zones are undiagnosable from
normal screenshots.

**Spec.**
- CLI commands: `debug on` / `debug off`
- Bridge: `scene.physics.world.createDebugGraphic()` (once) +
  `drawDebug = true/false`; also toggle the debug graphic's visibility so `off`
  fully cleans up.
- Typical use: `debug on; cam fit; screenshot hitboxes.png; debug off`.

### C2. Seeded RNG — **P1**

**Problem.** `Math.random` gates gameplay — e.g. Nick F's dash has a literal 5%
random failure, bosses randomize attacks, barks are sampled. Every test touching
these is flaky.

**Spec.**
- CLI flag: `--seed <n>` — before the game loads (`page.addInitScript`), replace
  `Math.random` with a seeded PRNG (mulberry32 or similar). Applies to the whole
  page from first script execution, so Phaser and game code inherit it.
- CLI command: `reseed <n>` — reset the sequence mid-session.
- The `ready` line echoes the seed. No seed flag = native `Math.random`
  (production behavior).
- **Non-goal:** determinism of timing (that's v1 `stepFrames`); this covers value
  randomness only. Full determinism = `--seed` + `stepFrames`.

### C3. Input Record & Replay — **P2**

**Problem.** A bug reproduced interactively is lost when the session ends.

**Spec.**
- CLI flag: `--record <file>` — append every executed command with a timestamp
  delta to a JSONL file.
- CLI command: `replay <file>` — re-execute a recorded file, honoring the
  original inter-command delays (flag `--fast` to ignore delays where safe).
- Combined with C2 (`--seed`) this yields true deterministic repro scripts that
  can be committed next to bug reports.
- Format is the same command grammar as `--script`, so a recording is also a
  human-editable script.

### C4. Perf & Leak Telemetry — **P2**

**Problem.** Leaks (undestroyed tweens, orphaned sounds, texture growth) are
invisible until the game stutters.

**Spec.**
- CLI command: `perf`
- Bridge samples: `game.loop.actualFps`, `renderer` texture count,
  `sound.sounds.length`, `scene.children.list.length`, `tweens` active count,
  `performance.memory.usedJSHeapSize` (Chromium-only, best-effort).
- `perf` output is a flat JSON object so successive samples diff trivially; a
  monotonic climb across a playthrough = leak. Compact version included in
  `observe`.

### C5. Golden-Frame Screenshot Diffing — **P2**

**Problem.** The entire v1 QA report §1–3 (visible collision rects, mis-scaled
Chris Rivas sprite, corner-floating actor) is "screenshot differs from intent" —
detectable mechanically.

**Spec.**
- CLI commands:
  - `golden save <name>` — capture the canonical `cam fit` screenshot of the
    current scene into `e2e_tests/agent/goldens/<chapter>/<name>.png`.
  - `golden check <name> [threshold]` — re-capture, pixelmatch against the
    golden, emit `{"cmd":"golden","ok":true,"diffPct":0.3,"pass":true,"diffPath":"…"}`
    and write a diff image on failure.
- Stabilization requirements before capture: `pause` the loop (v1), fixed
  viewport size, `--seed` set, animations settled (step a few frames after
  pause). Without these, goldens flap.
- Dependency: `pixelmatch` + `pngjs` (dev-only).

### C6. Static Asset Audit — **P2** *(no browser needed)*

**Problem.** A texture/audio key referenced by a chapter config but absent from
the loader manifest = silent green box or silent missing sound at runtime.

**Spec.**
- Standalone script: `npm run agent:audit` (tsx, no Playwright).
- Cross-references every asset key referenced in `src/data/chapters/*.ts`
  (sprites, music keys, prop textures) against what `SpriteLoader` /
  `AudioController` register and what exists under `src/assets/`.
- Output: JSONL of `{"chapter":"…","key":"…","kind":"texture|audio","status":"missing|unused"}` and a nonzero exit code on `missing`.
- Complements A1: A1 catches missing assets at runtime on the path you happened
  to test; the audit catches all of them statically.

### C7. Chapter Gauntlet — **P2**

**Problem.** "Does every chapter still complete end-to-end?" is currently answered
one chapter at a time.

**Spec.**
- CLI mode: `npm run agent -- --gauntlet [--chapters 1,3b,9]`
- For each chapter in `CHAPTERS`: navigate, drive with the `advanceUntil` loop
  (auto-win `skipModes` for all registered modes), record per-chapter:
  completed/stalled, stall scene+beat (A4), console error count (A1), duration,
  final `observe`.
- Emits one summary JSON line per chapter + a final table; nonzero exit if any
  chapter stalls. Designed to run nightly / in CI (extends the existing
  `chapters_smoke` spec rather than duplicating its logic where practical).

---

## Cross-cutting requirements

1. **Output contract.** Every new command speaks the v1 JSONL protocol. No bare
   `console.log` prose on stdout; human chatter goes to stderr.
2. **Read-only by default.** Observation tools (A*) must not mutate game state.
   Control tools that mutate (B*, C1, C2) must say so in their result line
   (`"mutates":true`) so a transcript is auditable.
3. **Dev-build only.** Everything rides on `window.__OMEGA_GAME__`
   (`import.meta.env.DEV`). Tools must fail soft with a clear
   `{"ok":false,"error":"__OMEGA_GAME__ unavailable (production build?)"}`.
4. **No parallel persistence.** Any save-state work goes through the
   `omega-save-v2` blob via `settings.ts` semantics (project hard rule).
5. **No new React↔Phaser bridge foot-guns.** Anything that force-advances beats
   (`skipbeat`, gauntlet) must reuse the engine's own advance path — StrictMode
   double-invocation has bitten this project before (see CLAUDE.md).
6. **Docs.** Each shipped tier updates `AGENT_TOOLKIT.md` (user-facing commands)
   and `e2e_tests/agent/README.md` (API); `--help` stays the single source of
   truth for syntax.

## Suggested build order

| Batch | Tools | Rationale |
| --- | --- | --- |
| 1 | A1, A2, A3, A4, then A5 | Closes the observation loop; agent becomes screenshot-optional |
| 2 | B1, B6, B5, C1 | Fast travel + coordinates + camera + hitboxes: the debugging kit |
| 3 | B3, B4, B2, C2 | Minigame/audio/state/determinism: the repro kit |
| 4 | B7, C3, C4, C5, C6, C7 | Regression automation: the CI kit |

---

## D. Future Considerations — v3 Backlog (Advanced Automation)

These are advanced tools to be built after the v2 core is completed, focusing on autopilot navigation and economy/state manipulation.

### D1. Pathfinding Auto-Walk (`walkto <x> <y>`) — **P2**
**Problem.** Navigating complex map geometry using discrete or stateful keyboard inputs requires the agent to calculate angles and avoid obstacles manually, which is highly error-prone.
**Spec.** 
- CLI command: `walkto <x> <y>`
- Bridge: Calculate path using the map's navigation mesh or an A* pathfinder. Autonomously simulate keyboard hold/release cycles to walk the player along the path nodes until they arrive at the destination, then emit `ok`.

### D2. Settings Controller (`settings <key> <value>`) — **P2**
**Problem.** Verifying game behaviors under different user settings (e.g. fast text speed, audio muted, screen shake off) currently requires clicking through the settings UI.
**Spec.**
- CLI command: `settings <key> <value>`
- Bridge: Mutate the settings state directly in `settings.ts` (e.g., `settings.textSpeed = 'fast'`), updating the active game configuration dynamically.

### D3. Narrative Decision Injector (`choose <index|text>`) — **P2**
**Problem.** Click targets for dialogue choices can be flaky during complex camera pans or UI animations.
**Spec.**
- CLI command: `choose <index|text>`
- Bridge: Programmatically inject the choice selection directly into the `BeatEngine` (similar to clicking the choice button), bypassing the UI layer entirely.

### D4. Economy & State Editor (`modify <stat> <value>`) — **P2**
**Problem.** Testing low-HP bark sequences, game-over screens, or inventory/shop purchases requires playing long enough to lose HP or grind currency.
**Spec.**
- CLI command: `modify <stat> <value>` (e.g. `modify hp 1` or `modify ledger 5000`)
- Bridge: Programmatically edit the player's active stats in the `ChapterScene` or save blob.
