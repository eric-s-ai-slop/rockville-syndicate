# Agent Toolkit Complaints & Improvements

While the `AGENT_TOOLKIT` is incredibly powerful for driving the game and grabbing visual checkpoints, I did run into a few friction points and annoyances while using it. Here are my complaints and suggestions for improvement:

## 1. `advance` Command Behavior is Misleading
The documentation states that `advance` skips dialogue until the player has free walk control. However, when I ran it, the command gave me walk control but the *very first* dialogue box (`act1_start`: "Summer 2025...") immediately began typing out on the screen while I was walking. 
* **Complaint:** It's unclear if `advance` is accidentally triggering the dialogue again on its way out, or if it doesn't properly wait for the dialogue queue to flush if walk control happens to be natively enabled at the same time.

## 2. World Coordinates vs. Viewport Coordinates
The `state` command returns the player and actor positions in **world coordinates** (e.g., `x: 350, y: 590`). However, the `click` and `drag` commands expect **viewport CSS pixels**. 
* **Complaint:** To click on a specific actor or map object, I have to mentally calculate the camera zoom (`2.0`) and camera center offset to translate the world coordinates to screen coordinates. Even though the `targets` command provides pre-calculated screen coordinates for targets, it would be a huge quality-of-life improvement if `click` and `drag` accepted a `--world` flag to just click directly on world coordinates!

## 3. Session Persistence Across CLI Calls
Running `npm run agent -- --chapter "Cabin From Hell" "screenshot; state"` boots up a completely fresh, headless browser session every time. 
* **Complaint:** If I want to do a stateful, step-by-step investigation, I either have to chain a massive, unwieldy string of commands in a single CLI invocation (e.g. `"advance; wait 1000; click 350 350; press w 1000; state"`), or write a script file. It would be much easier if the toolkit had a "daemon" mode where it stays open on a port, and subsequent `npm run agent` terminal commands could just attach to the already-running browser session.

## 4. `goto` Command is Brittle
The `goto <sceneIndex>` command is useful, but the toolkit itself admits it skips all side effects (ledger deltas, flags, spawns) from earlier beats. 
* **Complaint:** Because it skips the normal beat sequence, using `goto` to skip straight to Scene 1 actually caused the game's audio engine to crash (`Cannot set properties of null (setting 'volume')`) when it tried to crossfade the music. This makes `goto` a bit too fragile for testing mid-chapter scenes unless the scenes are completely decoupled.

## 5. Bounding Box Visibility (`--annotate`)
* **Complaint:** The `--annotate` flag draws red bounding boxes with very thin strokes. On dark backgrounds (like the nighttime dirt/wood in the Cabin chapter), these thin red lines can be extremely hard to see. Using a thicker stroke, or a high-contrast inverted color (like a white outline with a black shadow), would make the boxes pop much better against the game's pixel art.

---

## Further GameAgent Harness Improvements
Here is a list of improvements for the GameAgent test harness that would drastically improve the developer (and AI agent!) experience when building and testing chapters:

### 1. Differentiate "Soft-Locks" from "Timeouts"
Right now, if the gauntlet hits its maxSeconds limit, it throws a generic timeout error and prints whatever beat it happened to be on. The CLI should track why it stalled:
* **True Soft-Lock:** If the `scene.beatIndex` hasn't changed for ~10 seconds, report: "Game soft-locked at Beat X (engine failed to advance)".
* **Global Timeout:** If the beats are successfully advancing but the global timer runs out, report: "Chapter execution timed out (chapter exceeds maxSeconds limit)".

### 2. Time-Travel / Clock Mocking (Fast-Forwarding)
The biggest bottleneck for E2E testing a cinematic game is real-world waiting. Because the harness waits in real-time, a 5-minute chapter takes 5 minutes to test.
* **The Fix:** Expose a hook in `__OMEGA_DEV_BRIDGE__` to override the Phaser engine clock (`Phaser.Core.TimeStep`). When the agent encounters a `cameraPan` or `wait` beat, it should be able to command the engine to simulate 3000ms instantly. This would allow a 5-minute narrative chapter to be fully validated in just 2 or 3 seconds.

### 3. "Stall" Diagnostics Dump
When a test fails, developers (and agents) have to guess why. If `advanceUntil` fails, the CLI should automatically execute a `page.evaluate()` diagnostic dump and print it to the console:
* What are the player's exact x, y coordinates vs. the walkTarget coordinates?
* Is the React `<DialogueOverlay />` currently mounted and visible?
* Is there an activeMode minigame currently blocking the UI?

This prevents developers from having to blindly guess if it's a physics collision issue or a UI rendering issue.

### 4. Shared TypeScript Bridge Interface
Currently, the Playwright CLI operates in a Node context and has to use `(window as any).__OMEGA_GAME__` to peek into the game state, which is brittle and untyped.
* **The Fix:** Create a shared `types/DevBridge.ts` interface that doesn't import any Phaser code directly. Both the React/Phaser app (which implements it) and the Playwright CLI (which consumes it) can import this interface. This gives the CLI strict type-safety and autocomplete when querying game state inside `page.evaluate()`.

### 5. Dynamic Timeout Scaling
Instead of hardcoding `maxSeconds: 45` (which sometimes needs to be manually increased to 180 to get long chapters to pass), the gauntlet should dynamically calculate the timeout budget based on the length of the chapter it is testing.
* **Example:** `maxSeconds = Math.max(60, scene.chapter.beats.length * 0.75)`. This ensures short scenes fail fast, but massive finales don't get falsely killed halfway through.

### 6. Animation / Motion Capture (Video/GIF Support)
To catch animation bugs (e.g., flickering, stalled walk cycles, misaligned frames), static `screenshot` PNGs are not enough. 
* **The Fix:** The toolkit needs a way to record short `.webm` clips or capture rapid sequential frames that an AI tester can analyze over time to verify motion and animation states.

---

## Triage / Blessing (2026-07-08, verified against `e2e_tests/agent/cli.ts` + `GameAgent.ts` @ HEAD)

> **STATUS: all items below SHIPPED 2026-07-08** (C1–C5, H1–H5, H6 follow-up incl. `gifstart`/`gifstop`).
> Implemented in 5 audited waves; C4 was reproduced live (rapid `goto` cycles on Cabin From Hell) and
> root-caused to a still-ticking crossfade tween, fixed via `killTweensOf` + a crossfade token in
> `AudioController.ts`. Known not-verified-live: the `soft-lock` classification branch (H1) and the
> looping-dialogue bail-out note (C1) — both code-reviewed only, no natural repro existed.

Each complaint was checked against the current source. Verdicts: **BLESSED** (implement as
described, notes below), **BLESSED-AMENDED** (real problem, but implement the cheaper fix
described here instead), **ALREADY SHIPPED** (exists; doc/discoverability problem only).

### CLI complaints

**C1. `advance` behavior — BLESSED (doc + condition fix).** Confirmed in code:
`reachWalkControl` (cli.ts ~L261) returns as soon as `levelStarted && player &&
!movementFrozen`. Chapters whose opening dialogue does NOT freeze movement satisfy that
condition while the first line is still typing — `advance` isn't re-triggering dialogue,
it's exiting early. Fix: strengthen the condition to also require no visible dialogue line
(the same `p.font-pixel` + `offsetParent` check `advanceUntil` already uses to decide
whether to press Space), with a bail-out: if walk control is held but a line survives ~3
consecutive Space dismissals (ambient/looping dialogue), return anyway and include
`note: 'dialogue-still-visible'` in the emitted JSON. Update the `--help` text either way.

**C2. `--world` flag for `click`/`drag` — BLESSED.** The world→viewport math already
exists in `GameAgent.getActorBoundingBoxes()` / `dumpWalkAndNpcTargets()` (`screenX = cx +
(wx - cam.scrollX - cx) * cam.zoom`, then `+ rect.left`). Extract it into one
`worldToViewport(x, y)` helper on GameAgent (single `page.evaluate`) and have the `click`
and `drag` cases in cli.ts translate their args through it when `--world` is present.
Cheap, high value. Keep default viewport semantics unchanged.

**C3. Daemon / attach mode — BLESSED-AMENDED.** Real pain, but skip the port-daemon:
implement it as a **stdin REPL** first — `npm run agent -- --chapter X --repl` keeps the
browser open and reads command lines from stdin, emitting the same JSONL per line. That's
~30 lines (readline over the existing `runCommand`) and gives an agent a stateful session
via a single long-running Bash process. A socket daemon (`--listen <port>` + `agent attach`)
is fine as a follow-up if REPL proves insufficient, but it adds lifecycle problems (stale
sessions after dev-server restarts, orphaned browsers) that the REPL sidesteps.

**C4. `goto` audio crash — BLESSED (bug fix, not redesign).** The skipped-side-effects
warning is by design and already emitted (cli.ts `goto` case). The actionable part is the
crash: `warpScene()` (GameAgent.ts ~L580) tears down mode/dialogue but does NOT touch
audio, and `AudioController.crossfadeToMusic()` schedules a `delayedCall`/tween against
`this.scene.stageMusic` that can be destroyed/nulled by the time it fires → `Cannot set
properties of null (setting 'volume')`. Fix in `AudioController.ts`: null-guard the
delayed-call body and tween targets (bail if the sound object was destroyed), and have
`warpScene` call the controller's stop/crossfade path instead of leaving stale tweens
running. Reproduce first via `goto 1` on a multi-scene chapter with per-scene `music:`.

**C5. Annotate stroke visibility — BLESSED.** Confirmed: `annotateScreenshot()`
(GameAgent.ts ~L1335) draws 1-px `drawRect` outlines in flat red. Fix: draw each box twice
— a 3-px black outer rect then a 1–2-px inner rect in the accent color (red/yellow as
today) — so boxes read on both dark and light art. Keep the label print as is (already
black-on-whatever; optionally give it the same halo treatment later).

### Harness improvements

**H1. Soft-lock vs timeout classification — BLESSED.** The gauntlet already receives
`beatIndex` every tick via `advanceUntil`'s `onTick` (added for G6). Track
`lastBeatChangeAt`; on failure report `stall: 'soft-lock'` (beatIndex frozen ≥ ~10s, include
the stuck beat index/type) vs `stall: 'global-timeout'` (beats still advancing when the
budget ran out). Pairs naturally with H5 — implement together.

**H2. Clock mocking — BLESSED-AMENDED.** Don't override `Phaser.Core.TimeStep`; the
toolkit already has `speed <factor>` → `GameAgent.setTimeScale()` (GameAgent.ts ~L1026),
which scales `scene.time`, `scene.tweens`, and arcade physics — exactly what `cameraPan`
tweens and `wait` beats run on. The gap is that the gauntlet never uses it. Fix: add
`--speed <n>` (gauntlet + normal sessions) that calls `setTimeScale` after boot and after
every `changeScene`/mode teardown (scene-level timeScale can be reset by restarts — verify).
Caveat to verify while implementing: React-side timers (dialogue typewriter) are not on the
Phaser clock, but `advanceUntil` Space-skips those anyway, so wall-clock wins should still
be large. A true TimeStep override is only worth revisiting if `--speed 5+` destabilizes
physics-dependent beats (walkTo, chase).

**H3. Stall diagnostics dump — BLESSED.** On `advanceUntil` timeout (and gauntlet
failure), run one `page.evaluate` dumping: `beatIndex` + beat type, player `(x, y)` vs
`walkTarget` `(x, y, radius)` and the distance, `movementFrozen`, `activeMode?.id`, whether
a dialogue line / choice buttons are in the DOM and visible, and the last few console
errors. Emit as a `diagnostics` field on the failure JSONL line. Implement inside the
helper (or a small shared function) so both the gauntlet and plain `advance` get it.

**H4. Shared DevBridge interface — BLESSED (low priority).** Legit; keep scope tight:
`e2e_tests/agent/DevBridge.d.ts` (or `src/types/DevBridge.ts`) declaring the *subset*
actually consumed — `__OMEGA_GAME__` scene fields (`beatIndex`, `currentSceneIndex`,
`activeMode.id`, `player.x/y`, `walkTarget`, `movementFrozen`, `levelStarted`) and the
`__OMEGA_DEV_BRIDGE__` surface. **No Phaser imports** (lesson 1: pulling Phaser into the
Node CLI crashes at import time) — use structural types only. Note honestly: this types the
accesses but cannot catch drift at runtime; the existing smoke test remains the real guard.

**H5. Dynamic timeout scaling — BLESSED.** Replace the flat gauntlet `maxSeconds` with a
per-chapter budget computed from the config the CLI already loads for I4/G7:
`base 45s + 0.75s × beats.length + 20s × (# minigame/bossFight beats) + 10s × (# scenes)`,
capped at the current `--gauntlet-max` style ceiling (keep a flag override). Short chapters
fail fast, finales stop needing hand-raised limits.

**H6. Motion capture — ALREADY SHIPPED (I3), minor follow-up.** `--gif <file>` records the
whole session and assembles via system ffmpeg (soft-fails with frames kept). The complaint
predates or missed it — this is a discoverability issue: make sure AGENT_TOOLKIT.md's
workflow section mentions it as the animation-bug tool. Optional follow-up if per-moment
clips are wanted: a `gifstart`/`gifstop [file]` command pair scoping capture to a window
instead of the whole session, reusing the existing frame-capture plumbing.

### Suggested implementation order
Quick wins first: **C5, C2, H5, H1** (small, isolated) → **C1, H3** (touch
`advanceUntil`/advance semantics — test the gauntlet after) → **C4** (needs a repro; touches
game code, not just tooling) → **H2, C3** (new flags/modes) → **H4, H6-follow-up** (polish).
