# Agent Toolkit — driving the game from the terminal

A CLI for playtesting the Phaser game with continuous, stateful input (hold to
walk, click-drag, charge-hold) plus a state bridge and deterministic frame
stepping. It's a terminal front-end over the `GameAgent` class
([`e2e_tests/agent/GameAgent.ts`](../e2e_tests/agent/GameAgent.ts)), which wraps
Playwright's trusted keyboard/mouse events and the `window.__OMEGA_GAME__` bridge.

Implements every capability in
[`docs/browser_subagent_spec.md`](browser_subagent_spec.md).

---

## 0. Prerequisite: the game must be running

The CLI drives a browser pointed at your dev server. In one terminal:

```bash
npm run dev            # serves the game at http://localhost:3324
```

One-time, if you've never run Playwright here: `npx playwright install chromium`.

---

## 1. How to run it

```bash
npm run agent -- [flags] ["command; command; ..."]
```

`npm run agent --` forwards everything after `--` to the CLI. (Equivalent to
`npx tsx e2e_tests/agent/cli.ts …` if you prefer.)

There are three ways to feed it commands — pick whichever fits:

| Mode | How | Best for |
| --- | --- | --- |
| **Inline** | `npm run agent -- --chapter "…" "advance; press w 2000; state"` | quick one-liners |
| **Script file** | `npm run agent -- --chapter "…" --script moves.txt` | repeatable sequences (`#` comments allowed) |
| **Stdin / REPL** | `npm run agent -- --chapter "…"` (then type, or pipe) | interactive poking, or piping from another program |

All commands in one invocation share **one** browser session, so stateful
sequences like `hold d` → `step 30` → `release d` work across lines.

Print the full menu any time:

```bash
npm run agent -- --help
```

### Getting to the game

The landing page has no canvas — you have to enter a chapter. The `--chapter`
flag does the whole hero-select → Free Play → chapter-card flow for you:

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" "state"
```

Chapters behind a CLASSIFIED seal are auto-detected from their config
(`classified: true` in `src/data/chapters/`) and the seal is broken during
navigation; `--classified` only matters for raw `--url` sessions. Without
`--chapter` the CLI just loads the URL and leaves you on the menu (drive it
yourself with `click`/`eval`).

---

## 2. What arguments / commands it accepts

### Flags (before the command string)

| Flag | Meaning |
| --- | --- |
| `--chapter "<title>"` | Navigate into this chapter after boot |
| `--classified` | Break the chapter's CLASSIFIED seal while navigating. Auto-detected from chapter config (`classified: true`) when `--chapter` is used — only needed for raw `--url` sessions |
| `--url <url>` | Base URL (default `http://localhost:3324`) |
| `--out <dir>` | Folder for screenshots (default `./agent-artifacts`) |
| `--script <file>` | Read commands from a file instead of args/stdin |
| `--headed` | Show the browser window (default headless) |
| `--slowmo <ms>` | Delay every action by `<ms>` — watch it happen |
| `--keep-open` | After inline/script commands, stay open and read stdin |
| `--repl` | Alias for `--keep-open` that also emits `{"repl":"ready"}` once the stdin loop is actually listening, so a process piping commands in line-by-line knows exactly when it's safe to start writing (C3). Same `runCommand`/JSONL/`--record` behavior as `--keep-open` underneath — this only adds the ready signal and the name. `exit`/`quit`/EOF closes the browser; an incomplete `--playtest` exits nonzero. |
| `--playtest` | Autonomous-QA safety mode. Blocks `eval`, `injectbeat`, `modify`, direct `mode` launch, `goto`, `chapterflag` writes, `settings` writes, and any `watch` expression that isn't read-only; rejects multi-beat `skipbeat`; records `skipbeat`/`winmode`/`losemode` as a bypass and every `watch`/`loadstate <file>`/`speed` use in `session_summary.audit`. Every `visual_checkpoint` requires a concrete `reviewcheckpoint` receipt. While any checkpoint is pending, progression/state-changing commands are blocked; vague review notes are rejected. `quit`/EOF fails closed with `session_summary.ok:false` and a nonzero exit unless completion is verified: visual QA complete, natural `playtest_integrity`, and terminal coverage observed. `skipbeat` cannot bypass an active foreground mode, and `winmode`/`losemode` require a successful normal keyboard/mouse attempt first. The policy gate lives in `e2e_tests/agent/playtestPolicy.ts`; stateful compliance lives in `e2e_tests/agent/playtestCompliance.ts`. Use with `--repl --checkpoints`. |
| `--playtest-smoke` | (requires `--gauntlet`) Chapter-agnostic sweep proving the playtest-mode `advance` classification never dead-ends: for every chapter (enumerated from `CHAPTERS` at runtime — a new chapter is swept automatically), it loops `advance` and resolves each named status generically (choice 0, **real key-driven** `walkTo` with teleport-recovery fallback, `harnessForceComplete` for foreground modes) until `chapter-ended`. Emits one `playtest_smoke` JSONL line per chapter with `statusCounts` plus a `coverage` diff of exercised interactions vs. the config-derived manifest (`e2e_tests/agent/coverageManifest.ts`), then a `playtest_smoke_summary`; exits non-zero if any chapter fails. Run it after changing any beat type, mode lifecycle, or the harness itself. |
| `--speed <n>` | Set Phaser's `scene.time` / `scene.tweens` / arcade-physics `timeScale` to `<n>` via `GameAgent.setTimeScale()`, once the chapter scene has booted. Works for both normal sessions and `--gauntlet` runs; for the gauntlet it's re-applied whenever `advanceUntil`'s `onTick` observes a scene-index change, since a scene restart resets a fresh `ChapterScene`'s `timeScale` back to 1 (H2). **Only speeds up Phaser tweens/waits** — `cameraPan` and `wait` beats run faster, but `advanceUntil`'s own ~150ms poll loop and React-side timers (the dialogue typewriter) are untouched, so wall-clock savings are real but sub-linear, not proportional to `<n>`. Tested against `Rockville Syndicate: Origins` (37 cameraPan/wait beats, the heaviest in the repo) across repeated `--gauntlet` runs: `--speed 1`/`3`/`4` always completed (durations ranged 16s–278s run-to-run — this machine's background load dominates wall-clock noise more than `<n>` does), but `--speed 5` **crashed on one of two runs** (`page.evaluate: Execution context was destroyed, most likely because of a navigation`) even though the other run completed. That correctness flip (not the noisy timings) is the real signal. **Recommended max: 3** — the highest factor that was stable across every run tried. |
| `--seed <number>` | Initialize the page with a specific random seed for determinism |
| `--record <file>` | Record all executed commands and their timings into a file |
| `--transcript <file>` | Mirror every public JSONL receipt to a durable raw trace, including protocol lifecycle receipts, `visual_checkpoint` events, failures, and the final `session_summary`. Use this for autonomous QA; unlike a retrospective agent summary, it preserves the exact commands and errors that occurred |
| `--replay <file>` | Replay a recorded command log file with original timing delays |
| `--gauntlet` | Run the full test gauntlet skipping minigame modes to verify all chapters. Each chapter attempt gets a **per-chapter timeout budget** computed from that chapter's own config — `45s + 0.75s × beats.length + 20s × (# minigame/bossFight beats) + 10s × (# scenes)`, capped at 300s — instead of one flat number, so a one-scene dialogue chapter fails fast and a multi-scene finale isn't falsely killed halfway through (H5). The computed budget is reported as `timeoutBudget` in the chapter's JSONL result. On a timeout, the failure is classified `stall: "soft-lock"` (beatIndex frozen ≥10s at the moment of failure — likely an engine bug; JSONL also includes `stuckBeatIndex` and, when available, `stuckBeatType`) or `stall: "global-timeout"` (beats were still advancing — the chapter needs a bigger budget, not a bug fix) (H1). A stalled result also carries a `diagnostics` dump straight from `advanceUntil` — player vs `walkTarget` position/distance, `movementFrozen`, `activeMode`, dialogue/choice visibility (H3) |
| `--gauntlet-max <seconds>` | (with `--gauntlet`) hard override for the per-chapter timeout budget — bypasses the computed budget and its 300s cap entirely (H5) |
| `--chapters <list>` | Run the gauntlet on a comma-separated list of chapters |
| `--shots` | (with `--gauntlet`) capture a stabilized screenshot per scene + generate a contact-sheet `index.html` (N1) |
| `--max-errors <n>` | (with `--gauntlet`) fail the run if any chapter's console error count exceeds `<n>` |
| `--checkpoints` | Auto-capture a stabilized screenshot + emit `visual_checkpoint` on every chapter/scene/mode transition during a normal session (N3) |
| `--coverage` | (with `--gauntlet`) record which beats/modes/choice branches were exercised; emit a `coverage` line per chapter + write `coverage.json` (G6). Without `--branches`, choice beats only ever have their first option auto-clicked, so every other branch reports as never-taken |
| `--transitions` | (with `--gauntlet`) record the observed beat-index jump graph and diff it against the graph implied by the chapter config; `unexpectedTransitions` is a routing-bug signal (e.g. the `routeOnMinigame` gotcha), `neverTakenEdges` is graph-level coverage; writes `transitions.json` (I4) |
| `--branches all\|<n>` | (with `--gauntlet`) replay each chapter once per option of its **first** choice beat (capped at `<n>` options if given instead of `all`) — the only automated way to catch branch-specific breakage (G7) |
| `--parallel <n>` | (with `--gauntlet`) run up to `<n>` chapter/branch attempts concurrently, each in its own browser context — wall-clock only, doesn't change what's tested (G8) |
| `--fuzz <seconds>` | Seeded random key/click/mode-launch mashing for `<seconds>`, stopping and reporting on the first new console error. Pair with `--record` for a committed, deterministic repro script of exactly what crashed it (I2) |
| `--gif <file>` | Capture raw frames for the whole session and assemble them into a GIF at `<file>` via a system `ffmpeg` (must be on PATH; soft-fails with frames kept if missing) (I3). This is expensive evidence: autonomous chapter playtests should prefer `gifstart`/`gifstop [file]` around a suspected motion, chase, flicker, or animation defect. Do not combine the two forms; they share one capture slot. |
| `-h`, `--help` | Print the usage menu |

### Commands (one per line; `;` also separates them inline)

**Keyboard (spec §1 — continuous input)**

| Command | Does |
| --- | --- |
| `hold <key>` | keydown, stays pressed until `release` — e.g. `hold w` |
| `release <key>` | keyup |
| `press <key> [ms]` | **hold for `<ms>` then release** — e.g. `press w 2000` = walk forward 2s. Omit `ms` for a tap |
| `tap <key>` (alias `key`) | discrete down+up |
| `releaseall` | release every held key |

Keys use Playwright names: `w` `a` `s` `d`, `ArrowUp`, `Space`, `Shift`, `Enter`.
Prefer lowercase movement keys.

**Mouse / pointer (spec §2 — drag & hold). X/Y are viewport CSS pixels.**

| Command | Does |
| --- | --- |
| `mousedown <x> <y> [left\|right]` | press and hold a button at (x,y) |
| `mousemove <x> <y>` | move — a **drag step** if a button is held, else a hover |
| `mouseup [x] [y] [left\|right]` | release (optionally move there first) |
| `click <x> <y> [left\|right] [--world]` | down+up at one point. `--world` treats `x`/`y` as **world coordinates** (the same ones `state`/`targets` report) instead of viewport pixels, translated via the same camera math as `clickworld`/`where` (C2) |
| `drag <sx> <sy> <ex> <ey> [ms] [--world]` | smooth click-drag — e.g. `drag 200 300 500 300 400`. `--world` treats both endpoints as world coordinates (C2) |

**State / bridge (spec §3)**

| Command | Does |
| --- | --- |
| `state` | print the game-state snapshot (see §3 below) |
| `restart` / `refresh` | reload the page and re-enter the `--chapter` session, if one was supplied; use after a React/Phaser unmount |
| `text` | extract visible text from Phaser canvas and DOM (A2) |
| `targets` | dump active walk target and NPCs with screen/world coordinates (A3) |
| `observe` / `obs` [`--shot`] | print composite observation snapshot, including console errors/warnings seen since the last `observe` (A5); `--shot` attaches a stabilized screenshot path as `"shot"` (N3) |
| `reviewcheckpoint <id> clear\|issue-found\|inconclusive <observation-note>` | record that an emitted `visual_checkpoint` PNG was inspected. Every verdict requires a concrete visual note of at least 20 characters; placeholders such as `skip`, `looks fine`, or `scene entered` are rejected. In `--playtest`, progression stays blocked until every pending checkpoint is reviewed; scene review facts are included in `session_summary.coverage` alongside the separate `visual_qa` block. |
| `diff` | like `observe`, but omits any field unchanged since the last `diff`/`observe` call — the cheap per-step read for a driving agent (N4/E5) |
| `watch <jsExpr> [timeoutMs]` | block until a predicate on the live scene is true (`scene`/`game` in scope), e.g. `watch scene.activeHp < 50 10000`; polls ~100ms inside one round-trip and attaches a final observation on timeout (N4/E6) |
| `beat` / `beats` | print current and upcoming narrative beats (A4) |
| `skipbeat [n]` | force-advance `n` beats (default 1) past one that can never complete normally — such as an unreachable walk target (A4). In `--playtest`, only `skipbeat 1` is permitted, it cannot bypass an active foreground mode, and the session is marked partially bypassed. Use `winmode`/`losemode` for a blocking mode after reviewing its checkpoint and attempting normal input. |
| `logs` / `console [clear]` | print buffered console errors/warnings/failed asset requests captured since boot (or the last `clear`) (A1) |
| `audio` | print playing audio state and master volume (B4) |
| `camera` | print camera zoom, center, and dimensions (B5) |
| `camera zoom <num>` | set camera zoom factor (B5) |
| `camera center <x> <y>` | center camera on world coordinates (B5) |
| `goto <sceneIndex>` | jump to a specific scene index instantly (B1) |
| `savestate` | quick-save current game state in-memory (B2) |
| `loadstate` | quick-restore saved game state (B2) |
| `eval <js>` | run JS in the page and print the result — e.g. `eval window.__OMEGA_GAME__.scene.keys.length` |
| `screenshot [name] [--annotate]` | save a PNG to `--out`, print its path; `--annotate` draws each visible actor's bounding box + name + depth, plus the active walk target, onto the image (N3). Each box is drawn as a 3px black outline with a 1-2px accent-color (red for actors, yellow for the walk target) inline inside it, so boxes stay legible against both dark and light pixel art (C5) |
| `gifstart` | begin a scoped GIF capture mid-session (H6) — same frame-capture plumbing as `--gif` below, just started/stopped on demand instead of for the whole session. Errors instead of crashing if `--gif` is already capturing, or a `gifstart` capture is already running |
| `gifstop [file]` | stop a `gifstart` capture, assemble it into a GIF, and print the path. `file` resolves under `--out`; omitted defaults to a timestamped `gif-<timestamp>.gif`. Errors if no `gifstart` capture is running |
| `reseed <seed>` | reseeds the Mulberry32 pseudo-random number generator on the fly |
| `perf` | collect engine telemetry: FPS, memory (used JS heap), active tweens/children/sounds/textures |
| `mode <modeId> [configJson]` | launch a registered minigame mode directly under ChapterScene context |

**Visual Regression Tests (Golden Screenshots)**

| Command | Does |
| --- | --- |
| `golden save <name> [threshold]` | take a **stabilized** screenshot (pause → step 5 frames → capture → restore, N2) and save it as the gold baseline for this chapter, plus a `<name>.meta.json` sidecar recording `{width, height, seed}` |
| `golden check <name> [threshold]` | stabilized screenshot + pixel-diff against baseline. Fails if diff percent exceeds threshold (default 0.01), or immediately (`ok:false`) if the current viewport size doesn't match the baseline's recorded size — a mismatch always produces a meaningless diff |

**Time (spec §4 — deterministic stepping)**

| Command | Does |
| --- | --- |
| `pause` / `resume` | sleep / wake the Phaser loop |
| `loop` | print whether the loop is running |
| `step <frames> [fps]` | advance exactly `<frames>` fixed-timestep frames (auto-pauses the loop first) |
| `speed` / `timescale <num>` | set timescale multiplier for physics/tweens/timers (B7) |

**Debugging (spec C1)**

| Command | Does |
| --- | --- |
| `debug on` / `debug off` | toggle Arcade physics debug rendering (draws hitboxes) |

**Flow / misc**

| Command | Does |
| --- | --- |
| `advance [maxSeconds]` | dismiss ordinary dialogue until something classified happens (default 60s). Always exits with a named `status`: `walk-control` (free play reached), `choice-present` (stops **before** selecting), `walk-target-present` (stops **before** teleporting — inspect `targets`, then real key-driven `walkto`), `mode-active` + `modeId` (a foreground minigame/bossFight beat holds the flow; `background: true` modes never trigger this), `ambient-dialogue` (looping dialogue over free walk control — not a block), or `chapter-ended` (the `endChapter` beat is live). Each result carries the live beat's `{index, type, expectation}`, where `expectation` comes from the exhaustive per-beat-type classification in `e2e_tests/agent/beatClassification.ts` — adding a new beat type to `types.ts` fails `npm run lint` until that map is taught how the playtest loop should treat it. Waits for the first story beat so the chapter boot window isn't mistaken for free play (with a ~5s escape for chapters that genuinely boot into free play). Slow dialogue is not permission to skip beats. On a timeout, the failure JSONL includes a `diagnostics` dump collected from the live scene (`beatIndex`/`beatType`, player vs `walkTarget` position + distance, `movementFrozen`, `activeMode`, and dialogue/choice visibility) so you don't have to guess whether it's a physics, UI, or mode problem (H3) |
| `replay <file>` | execute commands recorded in `<file>` recreating original timing delays |
| `wait <ms>` | sleep `<ms>` of real time |
| `help` | print the menu |
| `quit` / `exit` | close the browser and end. In `--playtest`, any non-verified result returns a failed command receipt, `session_summary.ok:false`, and a nonzero process exit: incomplete visual QA, bypassed integrity, or missing terminal coverage. |

---

## 3. How it returns data to you

**stdout is JSONL** — exactly one newline-terminated JSON object per command,
sent one at a time. Wait for the correlated terminal receipt before sending the
next command. Concatenated objects are rejected with `INVALID_JSON`; the parser
does not guess record boundaries. On startup you get a `ready` line; every
command then prints its own result.

```jsonc
{"cmd":"ready","ok":true,"url":"http://localhost:3324","chapter":"The Spotify Family Insurgency"}
{"cmd":"advance","ok":true,"state":{ ...snapshot... }}
{"cmd":"press","ok":true,"key":"w","durationMs":2000}
{"cmd":"state","ok":true,"state":{"scene":"ChapterScene","player":{"x":559.2,"y":560},"velocity":{"x":0,"y":0},"hp":120,"activeMode":null,"loopRunning":true}}
{"cmd":"screenshot","ok":true,"path":"/abs/path/agent-artifacts/walked.png"}
{"cmd":"eval","ok":true,"result":120}
{"cmd":"visual_checkpoint","ok":true,"checkpointId":2,"path":"/abs/path/agent-artifacts/checkpoint-002.png","reason":"chapter scene 1 entered","sceneIndex":1,"mode":null}
{"cmd":"diff","ok":true,"state":{"player":{"x":580.1,"y":560}},"errorsSinceLastObserve":0,"warningsSinceLastObserve":0}
{"cmd":"watch","ok":true,"waitedMs":420}
{"cmd":"session_summary","ok":true,"errors":0,"warnings":0,"playtest_integrity":"natural","bypasses":[],"audit":[],"completion_status":"verified","visual_qa":{"status":"complete","captured":1,"reviewed":1,"pending":[],"reviews":[],"reasons":[]},"coverage":{"scenes":{"checkpointed":[0],"reviewed":[0]},"choices":[],"walks":[],"modes":[],"terminalObserved":true,"passive":{"captured":[],"missed":[]}}}
```

- **Errors never crash the session.** A bad command prints
  `{"cmd":"…","ok":false,"error":"…"}` and the run continues.
- **`session_summary`** is the last line printed on exit (`quit`/`exit`, EOF on
  stdin, or the process ending) — total console errors/warnings/failed asset
  requests captured for the whole session (A1). A scripted run can assert "zero
  console errors" by checking this one line instead of scanning the whole log.
  In `--playtest` mode it also records `playtest_integrity` as `natural` or
  `partially-bypassed`, every permitted bypass, and an `audit` array of every
  `watch`/`loadstate <file>`/`speed` use; a bypassed run cannot support a
  natural full-chapter completion claim. It also emits `visual_qa` with every
  checkpoint review and any pending checkpoint IDs, plus compact runtime
  `coverage` for scenes, choices, walks, foreground/background mode attempts,
  terminal observation, and passive captures/misses. `verified` requires
  natural integrity, complete visual QA, and `coverage.terminalObserved:true`;
  mid-chapter runs report `incomplete-coverage`, bypassed runs report
  `incomplete-integrity`, and incomplete visual QA reports
  `incomplete-visual-qa`. These statuses make `ok` false and exit nonzero.
  Verify the final Markdown report against this line with
  `npm run agent:verify-report -- <report.md> <session.jsonl>`.
  Read the full list any time mid-session with `logs`.
- **`state` payload** (`snapshotGameState`): read straight off the live scene, no
  computer vision needed —
  - `scene` — key of the top active Scene (`"ChapterScene"`, or `null` mid-transition)
  - `player` — `{x, y}` world position (or `null` before spawn)
  - `velocity` — `{x, y}` — proves a held key is actually moving them
  - `hp` — current player HP (`ChapterScene.activeHp`)
  - `activeMode` — id of the active minigame, or `null` when walking
  - `activeModeBackground` — `true` when `activeMode` is a concurrent background mode; background modes do not block `advance`
  - `loopRunning` — `false` after `pause`/`step`
- **Screenshots** are PNGs written to `--out` (default `./agent-artifacts/`,
  auto-created). Named `shot-001.png`, `shot-002.png`, … unless you pass a name.
  The absolute path is echoed in the `screenshot` result line.
- **`visual_checkpoint` lines** appear whenever `--checkpoints` (or the
  gauntlet's `--shots`) captures a screenshot on its own initiative — chapter
  load, scene transition, mode start/end. `path` is where the PNG landed;
  `checkpointId` is a monotonically increasing id for report citations, and
  `reason` says why it fired. Each receipt includes `modeKind` (`foreground`,
  `background`, or `null`), the relevant `mode`/`modeBeatIndex`, and separate
  foreground/background mode identity fields. Background start/end/replacement
  receipts require visual review but never satisfy foreground-mode bypass
  gates. Look at these; they're where "the game looks wrong" bugs actually
  surface (N3).
- **Passive visual-risk evidence** is attached to `advance` as compact
  `visual_events` for camera pans, actor movement/visibility, chases, tints,
  and ledger feedback. Sustained effects use one raw live frame; instantaneous
  effects use at most one post-advance frame unless a scene/mode checkpoint
  already covers the final state. Multiple frames are batched into labeled
  contact sheets of at most six tiles, while full-resolution source frames are
  retained. `captureMissed: true` explicitly marks a short effect that polling
  did not catch; it is not visually verified. GIF recording remains manual.
- The DEV-only beat trace behind these events is structural and bounded to 256
  entries; production builds do not record it.
- **`diff`** is `observe`'s cheaper sibling — same fields, but only the ones
  that changed since the last `diff`/`observe` call. The first call in a
  session has no baseline to compare against, so it returns everything with
  `"full":true` (N4).

> Tip: keep stdout clean for parsing by adding `2>/dev/null` — npm's banner and
> the interactive `agent> ` prompt go to stderr, the JSONL goes to stdout.

### JSON command envelope for external agents

Human operators can keep typing legacy commands (`walkto 100 200`, `observe
--shot`, etc.). External agents should prefer the versioned JSON envelope so
each result can be correlated with the command that caused it:

```json
{"protocol":"omega-agent-v1","cmd_id":"walk-001","action":"walkto","args":[100,200],"options":{"snapshot":"after","telemetry":true,"console_delta":true}}
```

The CLI immediately validates the line and emits either `accepted` or
`rejected`. After the existing command handler finishes, it emits a correlated
`completed` or `failed` receipt. Commands remain serial; there is no
`executing` state in V1.

```jsonc
{"protocol":"omega-agent-v1","cmd_id":"walk-001","status":"accepted","timestamp":1760000000000}
{"protocol":"omega-agent-v1","cmd_id":"walk-001","status":"completed","action":"walkto","duration_ms":812,"result":{"cmd":"walkto","ok":true},"artifact":{"type":"image","path":"/abs/path/agent-artifacts/protocol-walk-001-shot-001.png"},"telemetry":{"fps":60},"console_delta":{"errors":0,"warnings":0,"entries":[]}}
```

Supported options:

| Option | Meaning |
| --- | --- |
| `snapshot: "after"` | Attach a stabilized PNG after the command completes |
| `annotate: true` | Attach an annotated screenshot instead of a plain stabilized PNG |
| `telemetry: true` | Attach the same engine metrics returned by `perf` |
| `console_delta: true` | Attach browser errors/warnings produced during the command |

JSON `args` preserve structured values and strings with spaces. Object args are
serialized into the same JSON text existing commands like `mode` and
`injectbeat` already expect, so the JSON path remains a thin envelope over the
same command handlers rather than a parallel command implementation.

---

## 4. Recommended playtest loop (for a multimodal driving agent)

The toolkit is designed for an adaptive multimodal agent. Use the smallest
runtime receipt that supports the next decision, while still inspecting the
rendered game at every required checkpoint:

1. Start one long-lived `--repl --checkpoints --playtest` session and use
   `advance` as the control plane. Route from its named status:
   `walk-control`, `choice-present`, `walk-target-present`, `mode-active`,
   `ambient-dialogue`, or `chapter-ended`.
2. Treat automatic checkpoints as the default visual evidence for chapter,
   scene, and foreground/background mode transitions. Open each original PNG
   and submit one concrete `reviewcheckpoint` note. A coalesced checkpoint can
   carry several `transitions`; inspect every listed transition against the
   same image instead of requesting duplicate screenshots.
3. Do not routinely call `state`, `observe`, or `diff` after a successful
   `advance`; its compact observation already supports routing. Use `text` for
   choice wording or ambiguous instructions, `targets` for a walk objective,
   `observe --shot` when no adequate checkpoint exists, annotation for a
   suspected placement/depth issue, and telemetry for suspected performance.
4. Read `advance.visual_events` and the generated passive-evidence contact
   sheets. They cover `cameraPan`, `moveActor`, `hideActor`, `showActor`,
   `chase`, `screenTint`, and `ledger` without pausing or stepping the game.
   `captureMissed:true` means the effect is not verified; never infer that it
   looked correct.
5. At a choice, `savestate` once and restore between options only when
   `branchSafe:true`; otherwise make fresh natural runs. Follow branch-unique
   content only until convergence or another interactive boundary. For a
   foreground mode, exercise its core input and visible feedback through a
   coherent normal attempt. Background modes do not return `mode-active`:
   continue the story and verify coexistence and teardown.
6. At `chapter-ended`, inspect the terminal presentation, run `wait 2300` once
   for the completion handoff, clear any new checkpoint, and confirm stale story/mode
   UI is gone before `quit`. A verified summary requires complete visual QA,
   natural `playtest_integrity`, and terminal observation coverage.

Avoid blind command macros. Read each correlated receipt and choose the next
input from live state; long timing-dependent sequences desynchronize easily.

### Verifying animation / motion

A static PNG cannot show flicker, a stalled walk cycle, or frames that become
misaligned only while moving. When motion is specifically at risk, run
`gifstart`, exercise only that moment, then `gifstop [file]`. Inspect the short
clip frame-by-frame for the suspected defect. Reserve `--gif <file>` for an
explicit whole-session motion investigation; it is not the default chapter
playtest evidence and cannot run alongside a scoped capture.

## 5. Copy-paste examples

Walk right for 2s, then snapshot + screenshot:

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" \
  "advance; press d 2000; state; screenshot walked.png"
```

Deterministic hold (no dependence on your typing speed): hold `d`, step exactly
30 frames, read state, release:

```bash
printf 'advance\nhold d\nstep 30\nstate\nrelease d\n' \
  | npm run agent -- --chapter "The Spotify Family Insurgency" 2>/dev/null
```

Click-drag a slider/gesture at pixel coordinates:

```bash
npm run agent -- --chapter "Some Minigame Chapter" "advance; drag 300 400 620 400 500; state"
```

Watch it live and poke interactively:

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" --headed --keep-open --slowmo 150
# then type: advance ⏎  hold w ⏎  state ⏎  release w ⏎  quit ⏎
```

Drive one long-lived session line-by-line from a script/agent process (C3) —
pipe commands into stdin instead of chaining everything into one CLI string.
`--repl` is `--keep-open` plus a `{"repl":"ready"}` line emitted once the stdin
loop is actually listening, so the driving process knows exactly when to start
writing:

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" --repl <<'EOF'
advance
state
press w 500
state
exit
EOF
```

Fast-forward a chapter's cameraPan/wait beats for a quick manual smoke check
(H2 — see the `--speed` flag table entry for what it does and doesn't speed up):

```bash
npm run agent -- --chapter "Rockville Syndicate: Origins" --speed 3 "advance; wait 30000; state"
```

Capture just a walk cycle as a GIF instead of the whole session (H6):

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" --repl <<'EOF'
advance
gifstart
press w 1500
gifstop walk-cycle.gif
exit
EOF
```

Parse just the player position with `jq`:

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" "advance; press d 1000; state" 2>/dev/null \
  | grep '"cmd":"state"' | tail -1 | jq '.state.player'
```

---

## 6. Notes & gotchas

- **Trusted events.** Input goes through Playwright's real CDP keyboard/mouse, so
  Phaser sees `key.isDown`/`pointerdown` exactly like a human — not `isTrusted:false`
  synthetic events.
- **`step`/`pause` are dev-build only.** They rely on `window.__OMEGA_GAME__`,
  which `GameLayout.tsx` exposes under `import.meta.env.DEV`. `npm run dev` is dev.
- **Coordinates are viewport pixels**, not Phaser world units, unless you pass
  `--world` to `click`/`drag` (C2) — that translates world coordinates through
  the same camera math as `clickworld`/`where`/`targets` for you. Without
  `--world`, read `state`/`eval` and convert with the camera (or use the
  `targets` command, which automatically includes pre-calculated page viewport
  coordinates).
- **No stuck keys.** The CLI calls `GameAgent.dispose()` on exit, releasing any
  held key/button — a held `w` never leaks between runs.
- The underlying class is also usable directly in Playwright specs; see
  [`e2e_tests/agent/README.md`](../e2e_tests/agent/README.md) and the integration
  test `e2e_tests/agent/GameAgent.smoke.spec.ts`.
- **Typed bridge accesses (H4).** [`e2e_tests/agent/DevBridge.ts`](../e2e_tests/agent/DevBridge.ts)
  declares structural types for the subset of `window.__OMEGA_GAME__` /
  `window.__OMEGA_DEV_BRIDGE__` the toolkit actually reads (no Phaser imports —
  importing Phaser into the Node CLI crashes at import time). Adopted so far in
  `helpers.ts`'s `advanceUntil` and a couple of the most-read `page.evaluate`
  blocks in `cli.ts`/`GameAgent.ts`; the remaining `(window as any)
  .__OMEGA_GAME__` sites are expected to migrate incrementally. These types
  document the accesses and catch typos at compile time — they cannot catch
  runtime drift if the game-side shape changes; the `GameAgent.smoke.spec.ts`
  integration test remains the real guard against that.
- **Deterministic Seeded RNG.** Using the `--seed <number>` flag mock-replaces `Math.random` in the browser with a seedable Mulberry32 generator before the game boots. You can also reseed on the fly using the `reseed <seed>` command mid-session.
- **Timing-Preserved Playbacks.** By combining `--record <file>` with the `replay <file>` command, you can record a manual interaction path and replay it deterministic-style. The replayer parses the delay times between your commands and replicates them exactly.
- **Visual Regression Checks.** The `golden save <name>` and `golden check <name>` commands let you capture PNG baselines and compare them on the fly. Diffing uses Jimp and fails if the pixel delta exceeds the specified threshold.
- **Chapter Gauntlet Runner.** Running `npm run agent -- --gauntlet` runs a background gauntlet where dialogue is clicked through, and complex minigames are mocked out, verifying that all chapters run successfully to completion without stalling.
  > **WARNING:** The gauntlet validates logic, NOT visuals. Agents MUST still use `screenshot` to manually verify rendering, sprite scaling, and UI layout.
- **Static Asset Audit.** Running `npm run agent:audit` statically parses and audits all chapters to ensure that all speakers and audio assets mentioned in chapter definitions are correctly defined and exist as static files in the repository.
- **Compact code validation.** `npm run agent:check -- <changed-file...>` runs typecheck, ESLint, and a safe focused unit set; `npm run check:agent` adds the full unit suite and production build while keeping successful output to one line per stage. Detailed logs stay under ignored `agent-artifacts/check/`.
- **Chapter scaffolding.** `npm run agent:scaffold-chapter -- <index> <slug>` creates the smallest typed chapter config without registering incomplete content. Finish its assets/music/README entries before adding it to `CHAPTERS`.
- **Gauntlet runs in CI on every push to main** (the `gauntlet` job in
  `.github/workflows/ci.yml`) via `npm run agent -- --gauntlet --shots`. It
  starts and health-checks `npm run dev` itself (unlike the `e2e` job, this
  isn't a Playwright test, so `webServer` config doesn't apply), runs
  `npm run agent:audit` first, then uploads the contact sheet + per-scene
  screenshots as the `gauntlet-shots` artifact. A stall or `--max-errors`
  budget breach fails the job.
- **Stabilized screenshots.** Anything meant for comparison or review —
  `golden save`/`check`, the gauntlet's `--shots`, `observe --shot`,
  `screenshot --annotate`, and `--checkpoints` — captures from a settled frame
  (pause the loop → step 5 frames → capture → restore) rather than a raw
  `page.screenshot()`. Unstabilized captures land mid-animation and flap
  between runs. Plain `screenshot` (no flags) stays unstabilized on purpose —
  it documents "what does the live game look like right now."
- **Golden viewport guard.** `golden save` writes a `<name>.meta.json` sidecar
  next to the baseline PNG recording `{width, height, seed}`. `golden check`
  refuses to diff (`ok:false`) if the current viewport doesn't match the
  baseline's recorded size, instead of producing a meaningless diff percentage.
