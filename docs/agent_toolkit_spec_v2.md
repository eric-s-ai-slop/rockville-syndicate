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

> **Primary consumer: an LLM agent (Antigravity), not a human.** The toolkit is
> driven by an AI agent piping commands in and reading JSONL out. This makes
> **token efficiency a hard design requirement**, on par with correctness:
> - Prefer **one composite round-trip** over many small ones (`observe`).
> - Prefer **deltas** over full snapshots when state is mostly unchanged (E5 `diff`).
> - Prefer **blocking waits with conditions** over poll loops the agent must
>   drive itself (E6 `watch`).
> - Output keys are short, flat, and stable so downstream prompts can rely on them.

Tools are grouped by theme and tagged with a priority tier:

- **P0** — closes the observation loop; build first.
- **P1** — big iteration-speed or determinism win.
- **P2** — valuable, build when the need bites.

## Implementation status at a glance

| Tier | Shipped | Partial | Not started |
| --- | --- | --- | --- |
| A (observation) | A1 A2 A3 A4 A5 | — | — |
| B (control) | B1 B4 B7 | B2 B3 B5 B6 | — |
| C (regression) | C1 C2 C3 C4 C7 | C5 C6 | — |
| D (v3 backlog) | — | — | D1–D6 (see revisions below) |
| E–I (v2.1 additions) | — | — | all |

---

## Lessons learned in implementation (read before building anything new)

Hard-won notes from building and live-testing batches 1–2. New tools MUST
respect these.

1. **Never import game modules into the CLI's Node process.** `cli.ts` runs
   under plain `tsx`/Node. Importing anything that transitively pulls in Phaser
   (e.g. `src/game/modes/index.ts` for `listModeIds()`) crashes at module load
   with `ReferenceError: window is not defined` — Phaser touches `window` at
   import time. Chapter *data* (`src/data/chapters`) is safe; game *engine* code
   is not. Anything that needs the mode registry, scene classes, etc. must go
   through `page.evaluate` against the live game.
2. **`endChapter` is a terminal beat that never advances `beatIndex`.**
   `runEndChapter()` plays victory FX and hands off to React via
   `onLevelCompleted` — the beat index stays parked on the `endChapter` beat
   forever. Any "did the chapter complete?" condition must treat
   `beats[beatIndex].type === 'endChapter'` (or game unmount) as completion;
   `beatIndex >= beats.length` alone can never fire. This bug shipped once
   (gauntlet reported every finishing chapter as `stalled`).
3. **Reuse `advanceUntil`, never hand-roll a beat-advance loop.** Calling
   `beatEngine.advanceBeat()` out from under the React dialogue overlay desyncs
   UI from engine state (the StrictMode double-invoke trap in CLAUDE.md).
   `advanceUntil` dismisses dialogue with a trusted Space press, clicks choice
   buttons, and auto-wins modes — through the same paths a player uses.
   `skipModes: ['*']` is the supported wildcard for "auto-win any mode" (added
   precisely because of lesson 1 — the CLI can't enumerate mode ids statically).
4. **Guard every scene-dependent bridge call for readiness.** `warpScene`
   crashed on `undefined` physics groups when called before `create()` finished.
   Pattern: `if (!scene.levelStarted || !scene.walls) throw new Error('Scene not
   ready — run "advance" first')`. Every new mutating command that touches scene
   internals needs an equivalent guard with an *actionable* error message.
5. **Mutating force-advances need cleanup.** `skipbeat` must clear story
   dialogue, unfreeze the engine, and clear the walk target before each advance,
   or it leaves stale UI contradicting the engine's beat index.
6. **Console interception needs `requestfailed` too.** A missing Phaser texture
   renders as a green box with no exception; the failed network request is the
   only signal. `page.on('console'/'pageerror')` alone is not enough.

---

## A. Observation — let the agent "see" without computer vision

### A1. Console & Error Interceptor — **P0** — **implemented** *(always on, not a command)*

**Problem.** A game can look fine while a silent error, memory leak, or missing
asset fires in the background. Phaser renders a missing texture as a plain green
box with no exception — the *network* failure is the only signal.

**As shipped** (deviates slightly from the original spec, deliberately):
- `page.on('console')` (warn/error), `page.on('pageerror')`, and
  `page.on('requestfailed')` are attached in the `GameAgent` constructor.
- Events are **buffered**, not interleaved into stdout — interleaving broke
  line-oriented parsing for the driving agent. Read the buffer any time with
  the `logs` (alias `console`) command; `logs clear` resets it.
- On session exit the CLI emits a final
  `{"cmd":"session_summary","ok":true,"errors":N,"warnings":N}` line, so a
  scripted run asserts "zero console errors" from the last line alone.
- `observe` folds in `errorsSinceLastObserve` / `warningsSinceLastObserve`
  deltas (see A5).

**Proven in practice:** this interceptor surfaced a real, reproducible React
"mixing shorthand/non-shorthand background" warning firing ~11×/playthrough.

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

---

### A3. Interactable & Walk-Target Dump — **P0** — **implemented**

**Problem.** The agent guesses coordinates. The scene already knows exactly where
the player is supposed to go and what can be interacted with.

**Spec.**
- CLI command: `targets`
- Bridge reads, from the live `ChapterScene`: `scene.walkTarget`
  (`{x, y, radius, markerLabel}` or null), NPC actors, and DOM choice buttons
  currently clickable.
- Each entry includes both world and viewport coordinates (same camera math as A2).

---

### A4. Beat Inspector — **P0** — **implemented**

**Problem.** "The game looks stuck" usually means "a beat is waiting on a
condition that can't fire." Diagnosing that from pixels is hopeless.

**Spec.**
- CLI command: `beat` — current beat index/type/total, active flag, current beat
  payload, and upcoming beats.
- Companion command: `skipbeat [n]` — force-advance 1 (or n) beats, with the
  cleanup sequence from lesson 5 before each advance.

**Known gap (carry into next batch):** `skipbeat` bypasses beat side effects
(ledger deltas, flags, spawns) but does not yet emit the `"warning":
"skipped-state: …"` field that B1's `goto` was spec'd to carry. Add the same
warning field to both so transcripts are honest about state validity.

---

### A5. `observe` — Composite Frame Snapshot — **P0** — **implemented**

**Problem.** One agent decision should not cost five round-trips.

**As shipped:** one JSON object aggregating `state`, canvas/DOM text, walk
target, NPCs, and console error/warning counts **since the last observe**
(delta, not cumulative — this matters for the LLM consumer: unchanged ≠
re-reported).

**Validated:** an LLM agent given only `observe` + v1 input commands completed
walk-and-talk beats with no image input.

---

## B. Control — get to the bug in seconds, not minutes

### B1. Scene Jumper / Fast Travel — **P1** — **implemented (core)**

- CLI command: `goto <sceneIndex>` — jump to a scene index instantly. Guarded
  per lesson 4 (clear error if the scene hasn't booted).
- **Not yet built:** `--scene <n>` / `--pos <x>,<y>` boot flags, a `teleport <x>
  <y>` command, and the `"warning":"skipped-state"` field on forward jumps.
  These remain spec'd; the warning field is the priority (see A4 gap).

### B2. Save-State Snapshot / Restore — **P1** — **partial**

- **As shipped:** `savestate` / `loadstate` are **in-memory within one session**
  — quick-save/quick-restore of live scene state.
- **Not yet built (the bigger half):** file-based persistence
  (`savestate <file>` / `loadstate <file>`) that survives across sessions:
  dump `{saveBlob, chapterId, sceneIndex, beatIndex, player, hp}` where the blob
  is the `omega-save-v2` localStorage value (via `settings.ts` semantics —
  never a parallel persistence path), then on load: write blob → reload →
  re-navigate → `goto` → `skipbeat` → teleport. Emulator-style ergonomics:
  capture once right before a bug, restore in every subsequent run.

### B3. Minigame Launcher — **P1** — **partial**

- **As shipped:** `mode <id> [configJson]` launches a registered mode with the
  real `ModeContext` via `ChapterScene.launchMode()`.
- **Not yet built:** `modes` (list ids), `winmode` / `losemode` (complete the
  foreground mode via `activeMode.onCompleteCallback({outcome})` — the exact
  mechanism `advanceUntil` uses). **Implementation constraint from lesson 1:**
  `modes` must enumerate ids inside the browser via `page.evaluate` against the
  live registry — importing `listModeIds()` into the CLI crashes Node.
- Output should include the mode's `ModeResult` on completion.

### B4. Audio Inspector — **P1** — **implemented**

- CLI command: `audio` — playing sounds `{key, isPlaying, volume, loop, seek,
  duration}`, stage-track key, master volume.
- **Follow-up spec'd in G3:** `audio assert …` to turn QA checklist lines
  ("Scene 0 opens in silence") into one-line scriptable assertions.

### B5. Camera Commands — **P1** — **partial**

- **As shipped:** `camera` (inspect), `camera zoom <z>`, `camera center <x> <y>`.
- **Not yet built:** `cam fit` (stop follow, zoom to fit the whole map rect —
  the `qa_capture.cjs` recipe that found the collision-rect bugs) and
  `cam follow` (restore `startFollow(player)` at `chapter.cameraZoom ?? 2.0`).
  These are the two highest-value camera verbs; the shipped primitives are
  their building blocks.
- **Hard rule:** never call `cameras.main.setBounds(…)` (lint-enforced project
  gotcha); fit is achieved purely via zoom + centerOn.

### B6. World↔Viewport Converter — **P1** — **partial**

- **As shipped:** the `worldToViewport()` helper on `GameAgent`, reused by
  A2/A3 `screen` fields.
- **Not yet built:** the CLI verbs `clickworld <x> <y>` (convert + click) and
  `where <x> <y>` (print both conversions). Cheap — the helper exists; wire it.

### B7. Time Scale / Fast-Forward — **P2** — **implemented**

- CLI command: `speed <multiplier>` (alias `timescale`). `speed 1` restores.
- Interaction note: prefer v1 `stepFrames` for determinism; `speed` is for
  wall-clock-bound waits.

---

## C. Determinism & Regression — catch bugs without looking

### C1. Physics Debug Toggle — **P1** — **implemented**

- `debug on` / `debug off` — Arcade debug graphic, fully cleaned up on `off`.
- Typical use: `debug on; camera zoom 0.5; screenshot hitboxes.png; debug off`.

### C2. Seeded RNG — **P1** — **implemented**

- `--seed <n>` flag (Mulberry32 via `page.addInitScript`, replaces
  `Math.random` before first script execution) + `reseed <n>` command.
- The `ready` line echoes the seed. No flag = native `Math.random`.
- **Non-goal:** determinism of timing (that's v1 `stepFrames`); this covers
  value randomness only. Full determinism = `--seed` + `stepFrames`.

### C3. Input Record & Replay — **P2** — **implemented**

- `--record <file>` flag + `replay <file>` command, honoring original
  inter-command delays. Format is the same command grammar as `--script`, so a
  recording is also a human-editable script. Combined with `--seed`, a committed
  deterministic repro script.

### C4. Perf & Leak Telemetry — **P2** — **implemented**

- `perf` — FPS, used JS heap, active tweens/children/sounds/textures, flat JSON
  so successive samples diff trivially.
- **Follow-up spec'd in G2:** assertable budgets.

### C5. Golden-Frame Screenshot Diffing — **P2** — **implemented, needs hardening**

- **As shipped:** `golden save <name> [threshold]` / `golden check <name>
  [threshold]` — Jimp pixel-diff against
  `e2e_tests/agent/goldens/<chapter>/<name>.png` (directory is gitignored;
  commit baselines deliberately, not accidentally).
- **Known gap — build next:** the stabilization requirements (pause loop, fixed
  viewport, seed set, animations settled) are documented but **not enforced**.
  `golden` should *itself* pause → step ~5 frames → capture → resume, every
  time, rather than trusting the caller. Unstabilized goldens flap and erode
  trust in the whole mechanism.

### C6. Static Asset Audit — **P2** — **implemented (shallow)**

- **As shipped:** `npm run agent:audit` (tsx, no Playwright) — verifies audio
  imports exist on disk, stage-music keys referenced by chapters/scenes/beats
  are registered, and `ChapterScene` image imports exist.
- **Known gap:** the original spec covered sprite/texture/prop keys too, and the
  current implementation regex-parses TS, which is brittle. The honest fix is a
  small `ts-morph`/AST pass (see H1) — do that rather than growing the regexes.

### C7. Chapter Gauntlet — **P2** — **implemented**

- `npm run agent -- --gauntlet [--chapters "name,name"]` — for each chapter:
  navigate, drive with `advanceUntil` (auto-win any mode via the `'*'`
  wildcard), record completed/stalled + stall beat info (A4) + console error
  count (A1) + duration. Summary table + nonzero exit on any stall.
- Completion condition implements lesson 2 (`endChapter` beat = done).

---

## Cross-cutting requirements

1. **Output contract.** Every new command speaks the v1 JSONL protocol. No bare
   `console.log` prose on stdout; human chatter goes to stderr.
2. **Read-only by default.** Observation tools must not mutate game state.
   Control tools that mutate must say so in their result line (`"mutates":true`)
   so a transcript is auditable.
3. **Dev-build only.** Everything rides on `window.__OMEGA_GAME__`
   (`import.meta.env.DEV`). Tools must fail soft with a clear
   `{"ok":false,"error":"__OMEGA_GAME__ unavailable (production build?)"}`.
4. **No parallel persistence.** Any save-state work goes through the
   `omega-save-v2` blob via `settings.ts` semantics (project hard rule).
5. **No new React↔Phaser bridge foot-guns.** Anything that force-advances beats
   must reuse the engine's own advance path (lesson 3).
6. **Docs.** Each shipped tier updates `AGENT_TOOLKIT.md` (user-facing commands)
   and `e2e_tests/agent/README.md` (API); `--help` stays the single source of
   truth for syntax.
7. **Token efficiency (new).** The consumer is an LLM agent. Composite > many
   round-trips; deltas > full snapshots; blocking condition-waits > agent-driven
   poll loops; compact stable keys > verbose prose. When adding a field to
   `observe`, ask whether it belongs in every observation or behind a flag.
8. **Readiness guards (new).** Every scene-dependent command guards per lesson 4
   and returns an actionable error naming the command to run first.
9. **State-validity warnings (new).** Every command that skips normal
   progression (`goto`, `skipbeat`, future `modify`) carries a `warning` field
   describing what state may be invalid.

---

## D. v3 Backlog — revised after v2 field experience

Statuses and designs updated; several items are re-scoped based on what testing
actually showed.

### D1. Pathfinding Auto-Walk (`walkto <x> <y>`) — **P2, descoped**
Build the *cheap* version first: hold the dominant direction key toward the
target, re-evaluate every ~10 frames, stop inside the radius, give up after N
seconds with `ok:false` and the final position. No A*/navmesh — current maps
are open rooms with perimeter walls; full pathfinding is over-engineering until
a maze-like map exists. Emits `mutates:true`.

### D2. Settings Controller (`settings <key> <value>`) — **promoted to P1**
Trivial via the bridge + `settings.ts` setters, and the only way to make "text
speed = fast" or "SFX muted" a scriptable test precondition. Respects
cross-cutting rule 4 (goes through `settings.ts`, never raw localStorage).

### D3. Narrative Decision Injector (`choose <index|text>`) — **promoted to P1, design revised**
**Original design rejected:** injecting the selection directly into `BeatEngine`
"bypassing the UI layer" is exactly the React↔Phaser desync pattern lesson 3
exists to prevent. **Revised design:** locate the
`[data-testid="dialogue-choice"]` button by index or fuzzy text match and click
it with the trusted mouse. Same ergonomics (no coordinates needed), none of the
risk. Fails with the list of available choice texts when no match.

### D4. Economy & State Editor (`modify <stat> <value>`) — **promoted to P1**
`modify hp 1`, `modify ledger 5000`, `modify shards 3`. Each is one guarded
scene-field write; unlocks whole test categories (low-HP barks, game-over
screens, ledger-threshold endings) that currently require grinding. Emits
`mutates:true` + a state-validity `warning` (rule 9).

### D5. AST Context-Mapping CLI — **P2, descoped**
Instead of a general AST dependency mapper: ship `npm run agent:map
--target=weapon|boss|mode|chapter` as a **curated, hand-maintained JSON** of
registration points per domain, **validated by a unit test that checks the
listed files/symbols still exist** (so it can't silently rot). 90% of the value,
10% of the machinery. If/when C6's audit moves to `ts-morph` (H1), revisit
generating this from the AST.

### D6. Telemetry Summarizer — **superseded**
The vague "semantic YAML summary" is replaced by two concrete tools that
together serve the same goal (token-cheap situational awareness over time):
E5 `diff` (per-observation deltas) and G6 coverage tracking (per-run aggregate).

---

## E. Observation v2.1 — closing the remaining blind spots

### E1. `anim` — Animation State Dump — **P1**
Per visible actor sprite: `{name, animKey, frameIndex, isPlaying, flipX}`.
Catches "sprite frozen on frame 0", "understudy playing the wrong hero's walk
cycle", and flip-direction bugs — invisible to `state`, currently only
detectable by eye. Read-only; fold a compact form into `observe` behind a flag.

### E2. `depth [x y]` — Render-Order Inspector — **P1**
Without args: visible objects sorted by depth (type, texture/text, depth,
scrollFactor, world+screen pos). With a screen point: only objects whose bounds
contain it, top-first. Makes z-fighting and "text painted onto the floor"
(v1 QA finding #7) queryable instead of visual.

### E3. `hitreport <x> <y>` — What's Under This Pixel — **P1**
Composite of E2 at a point + physics bodies overlapping the world position +
whether any interactive zone/DOM element is there. Answers "I clicked and
nothing happened" in one command: either nothing interactive was there, or
something invisible is covering it.

### E4. `fx` — Active Visual-Effects Dump — **P2**
Camera tint/flash/shake/fade state plus any screen-tint overlay objects and
their **effective** rendered alpha (`fillAlpha * alpha`). This codebase has been
bitten twice by silently no-op'd tints (the `fillAlpha:0` trap in CLAUDE.md) —
`fx` makes "is the tint actually rendering" assertable.

### E5. `diff` / `observe --diff` — Observation Delta — **P0 of this tier**
Emit only what changed since the last observation: position/HP/velocity deltas,
beat advanced or not, text lines added/removed, new errors, mode
entered/exited. Unchanged fields are omitted entirely. **This is the single
biggest token-efficiency win available** — an LLM driver's per-step cost drops
from a full world snapshot to a few lines. Implementation: keep the last
composite in `GameAgent`, structural-diff in Node (not in the page).

### E6. `watch <jsExpr> [timeoutMs]` — Condition Breakpoint — **P0 of this tier**
Block until a predicate on the live scene is true, then emit
`{"cmd":"watch","ok":true,"waitedMs":…}` (or `ok:false` on timeout **with a
final observation attached** so the agent sees the stuck state without a
follow-up call). Example: `watch "scene.activeHp < 50" 10000`. Replaces
agent-driven `wait 500; state` poll loops — one round-trip instead of dozens.
Implementation: loop `page.evaluate` at ~100ms inside one CLI command.

### E7. `vision [question]` — LLM Screenshot Summary — **P2, flag-gated**
Screenshot → send to a vision model (`@google/genai` is already a dependency) →
return a text description or an answer to a specific question ("is any sprite
visibly mis-scaled?"). The escape hatch for the one bug class JSON observation
can't express: *it looks wrong*. Costs money per call — never part of
`observe`, requires an explicit API key env var, fails soft without it.

---

## F. Control v2.1

### F1. Finish B3 (`modes`, `winmode`, `losemode`) — **P0 of this tier**
Highest-value unbuilt control item; design and constraints under B3 above.

### F2. `chapterflag` — Progress/Unlock Editor — **P2**
Set Hall-of-Records and chapter unlock state in the `omega-save-v2` blob (via
`settings.ts` semantics) so "chapter N unlocked but not completed" is
constructable without playing N−1 chapters. Pairs with B2's file-based
save-state.

### F3. `injectbeat <json>` — One-Off Beat Executor — **P2**
Execute a single beat object (a `dialogue`, `sfx`, `screenTint`, …) in the live
scene through the engine's own dispatch (lesson 3). Lets a chapter author
preview a beat *before* writing it into a chapter file — bridges playtesting
and authoring (section H).

---

## G. Regression & CI v2.1

### G1. `npm run agent:ci` — The One-Command Nightly — **P0 of this tier**
Wrapper that runs: static audit (C6) → gauntlet across all chapters (C7) →
Playwright smoke specs → a `perf` sample per chapter, and merges everything
into one JSONL report + one human summary table, nonzero exit on any failure.
**All the pieces already exist; only the wrapper doesn't.** Cheapest
high-value item in this document.

### G2. Perf Budgets (`perf --assert "fps>50,heap<300000000"`) — **P1**
Turn C4 samples into pass/fail lines. A leak becomes a red CI line instead of a
number someone must eyeball. Gauntlet gains `--perf-budget` to apply per
chapter.

### G3. Audio Assertions (`audio assert silent|playing <key>|stopped <key>`) — **P1**
B4 provides the data; this makes QA checklist lines ("Scene 0 plays in
silence", "BGM never returns post-snap") one-line script assertions with
`ok:false` on violation.

### G4. Golden Auto-Stabilization — **P1 (fix, not feature)**
Per C5's known gap: `golden save`/`check` internally pause → step ~5 frames →
capture → restore loop state. Refuse to capture (`ok:false`) if the viewport
size differs from the baseline's recorded size.

### G5. `transcript <chapter>` — Static Narrative Dump — **P1** *(no browser)*
Walk a chapter's beat list statically and emit every dialogue line, speaker,
choice, and reaction in play order. Enables prose review (typos, tone, broken
speaker refs) and **narrative diffing between commits** — "did this refactor
change any player-visible text?" becomes `transcript | git diff`. Safe to
import chapter data per lesson 1.

### G6. Coverage Tracker — **P2**
During a gauntlet run, record which beats, modes, and choice branches were
actually exercised; emit `"chapter 8: choice branch 2/3 never taken"`.
Branch-specific stalls (the historical Ch8 endings bug) live exactly in
never-taken branches.

### G7. Choice-Matrix Gauntlet (`--gauntlet --branches all`) — **P2**
Replay chapters taking each choice permutation, bounded (e.g. vary the first
divergence only, or cap total runs). Expensive; the only automated way to catch
branch-specific breakage. Requires G6 to know what the branches are.

### G8. Parallel Gauntlet (`--gauntlet --parallel <n>`) — **P2**
Chapters are independent; run N headless sessions concurrently. Only worth
building once the gauntlet runs in CI and its wall-clock time actually annoys
someone.

---

## H. Authoring & Development Tools *(no browser needed)*

### H1. `agent:validate-chapter <file>` — Chapter Schema Linter — **P1**
Typed, AST-or-import-based (not regex) static validation of a chapter config:
unknown speakers, `walkTo` coordinates outside the map rect, unregistered mode
ids, `changeMusic` keys not in the manifest, `endChapter` not last, theme/scene
mismatches (indoor theme on a void scene — a CLAUDE.md gotcha). Subsumes and
deepens C6; runs in CI via G1.

### H2. `agent:scaffold mode <id>` — Minigame Scaffolder — **P2**
Copy `_template/`, rename symbols, register in `modes/index.ts`, update the doc
table (which `modesDoc.test.ts` already guards). Removes every manual step in
`ADDING_A_MINIGAME.md`.

### H3. Dialogue Overflow Linter — **P2**
Static check flagging dialogue lines that will overflow the dialogue box
(measurable: character count vs. box width at the pixel font's metrics).
Attach to H1.

---

## I. Autonomous Testing *(the payoff tier)*

### I1. Autonomous Playtest Loop — **P1**
A wrapper (`npm run agent:auto -- --chapter …`) that feeds `observe`/`diff`
output to an LLM (`@google/genai` is present) which picks the next CLI command,
in a loop, until chapter end / stall / budget exhaustion; emits an annotated
session log. This is the toolkit's founding thesis ("an LLM agent given only
observe + input commands can complete a chapter") made runnable, and it finds
what scripted gauntlets can't: soft-locks that require *wrong* play to trigger.
**Prerequisites: E5 `diff` and E6 `watch`** — they are what make an LLM driver
token-affordable. Antigravity can drive the CLI directly today; this tool is
for unattended runs.

### I2. Fuzz Mode (`--fuzz <seconds>`) — **P2**
Seeded random key-mashing, clicking, and mode launches with A1 watching for
exceptions and A4 watching for stalls. Crash-finding for the cost of an
overnight run. Pairs with `--record`: every crash yields a committed repro
script (C3 + C2 = deterministic).

### I3. Session-to-GIF (`--gif <file>`) — **P2**
Capture frames during a scripted run, assemble a GIF/webm artifact. Turns "the
boss fight feels wrong" into shareable evidence without a human screen
recording.

### I4. Transition-Graph Extraction — **P2**
Instrument a run to record the observed beat/scene/mode transition graph; diff
it against the graph implied by the chapter config. Divergence = routing bug
(the `routeOnMinigame` gotcha is exactly this class). Builds on G6's
instrumentation.

---

## Suggested build order (updated)

| Batch | Tools | Rationale |
| --- | --- | --- |
| ~~1~~ | ~~A1–A5~~ | **done** — observation loop closed |
| ~~2~~ | ~~B1, B4, B5(core), B7, C1–C4, C5(core), C6(core), C7~~ | **done** — debugging + repro + CI kit cores |
| 3 | F1 (finish B3), E5 `diff`, E6 `watch`, D4 `modify`, G1 `agent:ci` | small builds, each multiplies existing tools; unblocks I1 |
| 4 | D3 `choose`, D2 `settings`, G4 golden fix, B5 `cam fit/follow`, B6 CLI verbs, A4/B1 warning fields, G3 audio asserts | ergonomics + hardening + honest transcripts |
| 5 | B2 file-based save-state, D1 `walkto` (cheap), G5 `transcript`, H1 validate-chapter, E1–E3 | repro depth + authoring + render-order observability |
| 6 | I1 autonomous loop, G2 perf budgets, G6 coverage, F2, F3 | unattended testing |
| 7 | I2 fuzz, I3 gif, G7/G8 gauntlet variants, E4, E7, H2, H3, I4, D5 map | build when the need bites |
