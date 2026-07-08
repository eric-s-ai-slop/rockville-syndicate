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

Add `--classified` for a chapter behind a CLASSIFIED seal. Without `--chapter`
the CLI just loads the URL and leaves you on the menu (drive it yourself with
`click`/`eval`).

---

## 2. What arguments / commands it accepts

### Flags (before the command string)

| Flag | Meaning |
| --- | --- |
| `--chapter "<title>"` | Navigate into this chapter after boot |
| `--classified` | Break the chapter's CLASSIFIED seal while navigating |
| `--url <url>` | Base URL (default `http://localhost:3324`) |
| `--out <dir>` | Folder for screenshots (default `./agent-artifacts`) |
| `--script <file>` | Read commands from a file instead of args/stdin |
| `--headed` | Show the browser window (default headless) |
| `--slowmo <ms>` | Delay every action by `<ms>` — watch it happen |
| `--keep-open` | After inline/script commands, stay open and read stdin |
| `--seed <number>` | Initialize the page with a specific random seed for determinism |
| `--record <file>` | Record all executed commands and their timings into a file |
| `--replay <file>` | Replay a recorded command log file with original timing delays |
| `--gauntlet` | Run the full test gauntlet skipping minigame modes to verify all chapters |
| `--chapters <list>` | Run the gauntlet on a comma-separated list of chapters |
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
| `click <x> <y> [left\|right]` | down+up at one point |
| `drag <sx> <sy> <ex> <ey> [ms]` | smooth click-drag — e.g. `drag 200 300 500 300 400` |

**State / bridge (spec §3)**

| Command | Does |
| --- | --- |
| `state` | print the game-state snapshot (see §3 below) |
| `text` | extract visible text from Phaser canvas and DOM (A2) |
| `targets` | dump active walk target and NPCs with screen/world coordinates (A3) |
| `observe` / `obs` | print composite observation snapshot, including console errors/warnings seen since the last `observe` (A5) |
| `beat` / `beats` | print current and upcoming narrative beats (A4) |
| `skipbeat [n]` | force-advance `n` beats (default 1) past one that can never complete normally — a walk target that can't be reached, a mode stuck without calling `onComplete` (A4) |
| `logs` / `console [clear]` | print buffered console errors/warnings/failed asset requests captured since boot (or the last `clear`) (A1) |
| `audio` | print playing audio state and master volume (B4) |
| `camera` | print camera zoom, center, and dimensions (B5) |
| `camera zoom <num>` | set camera zoom factor (B5) |
| `camera center <x> <y>` | center camera on world coordinates (B5) |
| `goto <sceneIndex>` | jump to a specific scene index instantly (B1) |
| `savestate` | quick-save current game state in-memory (B2) |
| `loadstate` | quick-restore saved game state (B2) |
| `eval <js>` | run JS in the page and print the result — e.g. `eval window.__OMEGA_GAME__.scene.keys.length` |
| `screenshot [name]` | save a PNG to `--out`, print its path |
| `reseed <seed>` | reseeds the Mulberry32 pseudo-random number generator on the fly |
| `perf` | collect engine telemetry: FPS, memory (used JS heap), active tweens/children/sounds/textures |
| `mode <modeId> [configJson]` | launch a registered minigame mode directly under ChapterScene context |

**Visual Regression Tests (Golden Screenshots)**

| Command | Does |
| --- | --- |
| `golden save <name> [threshold]` | take a screenshot and save it as the gold baseline for this chapter |
| `golden check <name> [threshold]` | screenshot and pixel-diff against baseline. Fails if diff percent exceeds threshold (default 0.01) |

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
| `advance [maxSeconds]` | skip dialogue/intro until the player has free walk control (default 60) |
| `replay <file>` | execute commands recorded in `<file>` recreating original timing delays |
| `wait <ms>` | sleep `<ms>` of real time |
| `help` | print the menu |
| `quit` / `exit` | close the browser and end |

---

## 3. How it returns data to you

**stdout is JSONL** — exactly one JSON object per command, so you can read it by
eye or pipe it into `jq`/a script. On startup you get a `ready` line; every
command then prints its own result.

```jsonc
{"cmd":"ready","ok":true,"url":"http://localhost:3324","chapter":"The Spotify Family Insurgency"}
{"cmd":"advance","ok":true,"state":{ ...snapshot... }}
{"cmd":"press","ok":true,"key":"w","durationMs":2000}
{"cmd":"state","ok":true,"state":{"scene":"ChapterScene","player":{"x":559.2,"y":560},"velocity":{"x":0,"y":0},"hp":120,"activeMode":null,"loopRunning":true}}
{"cmd":"screenshot","ok":true,"path":"/abs/path/agent-artifacts/walked.png"}
{"cmd":"eval","ok":true,"result":120}
{"cmd":"session_summary","ok":true,"errors":0,"warnings":0}
```

- **Errors never crash the session.** A bad command prints
  `{"cmd":"…","ok":false,"error":"…"}` and the run continues.
- **`session_summary`** is the last line printed on exit (`quit`/`exit`, EOF on
  stdin, or the process ending) — total console errors/warnings/failed asset
  requests captured for the whole session (A1). A scripted run can assert "zero
  console errors" by checking this one line instead of scanning the whole log.
  Read the full list any time mid-session with `logs`.
- **`state` payload** (`snapshotGameState`): read straight off the live scene, no
  computer vision needed —
  - `scene` — key of the top active Scene (`"ChapterScene"`, or `null` mid-transition)
  - `player` — `{x, y}` world position (or `null` before spawn)
  - `velocity` — `{x, y}` — proves a held key is actually moving them
  - `hp` — current player HP (`ChapterScene.activeHp`)
  - `activeMode` — id of the foreground minigame, or `null` when walking
  - `loopRunning` — `false` after `pause`/`step`
- **Screenshots** are PNGs written to `--out` (default `./agent-artifacts/`,
  auto-created). Named `shot-001.png`, `shot-002.png`, … unless you pass a name.
  The absolute path is echoed in the `screenshot` result line.

> Tip: keep stdout clean for parsing by adding `2>/dev/null` — npm's banner and
> the interactive `agent> ` prompt go to stderr, the JSONL goes to stdout.

---

## 4. Copy-paste examples

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

Parse just the player position with `jq`:

```bash
npm run agent -- --chapter "The Spotify Family Insurgency" "advance; press d 1000; state" 2>/dev/null \
  | grep '"cmd":"state"' | tail -1 | jq '.state.player'
```

---

## 5. Notes & gotchas

- **Trusted events.** Input goes through Playwright's real CDP keyboard/mouse, so
  Phaser sees `key.isDown`/`pointerdown` exactly like a human — not `isTrusted:false`
  synthetic events.
- **`step`/`pause` are dev-build only.** They rely on `window.__OMEGA_GAME__`,
  which `GameLayout.tsx` exposes under `import.meta.env.DEV`. `npm run dev` is dev.
- **Coordinates are viewport pixels**, not Phaser world units. To click a
  world-space object, read `state`/`eval` and convert with the camera (or use the `targets` command, which automatically includes pre-calculated page viewport coordinates).
- **No stuck keys.** The CLI calls `GameAgent.dispose()` on exit, releasing any
  held key/button — a held `w` never leaks between runs.
- The underlying class is also usable directly in Playwright specs; see
  [`e2e_tests/agent/README.md`](../e2e_tests/agent/README.md) and the integration
  test `e2e_tests/agent/GameAgent.smoke.spec.ts`.
- **Deterministic Seeded RNG.** Using the `--seed <number>` flag mock-replaces `Math.random` in the browser with a seedable Mulberry32 generator before the game boots. You can also reseed on the fly using the `reseed <seed>` command mid-session.
- **Timing-Preserved Playbacks.** By combining `--record <file>` with the `replay <file>` command, you can record a manual interaction path and replay it deterministic-style. The replayer parses the delay times between your commands and replicates them exactly.
- **Visual Regression Checks.** The `golden save <name>` and `golden check <name>` commands let you capture PNG baselines and compare them on the fly. Diffing uses Jimp and fails if the pixel delta exceeds the specified threshold.
- **Chapter Gauntlet Runner.** Running `npm run agent -- --gauntlet` runs a background gauntlet where dialogue is clicked through, and complex minigames are mocked out, verifying that all chapters run successfully to completion without stalling.
- **Static Asset Audit.** Running `npm run agent:audit` statically parses and audits all chapters to ensure that all speakers and audio assets mentioned in chapter definitions are correctly defined and exist as static files in the repository.
