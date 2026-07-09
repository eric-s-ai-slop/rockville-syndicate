---
name: Playtesting Game Agent
description: How to do a full, honest, visual end-to-end playthrough of a chapter using the Agent Toolkit CLI — without faking it, guessing APIs, or writing custom scripts when blocked.
---

# Playtesting with the Agent Toolkit

When asked to playtest, QA, or "play through" a chapter, you drive the **real
running game** and **look at what renders**. You are hunting two things:

1. **Visual bugs** — mis-scaled/misplaced sprites, wrong depth, actors in the
   floor, overlapping UI, black bars, missing sprites, blurry text.
2. **Friction points** — walks that soft-lock, dialogue that never advances,
   choices with no effect, minigames that can't be won, dead scene transitions.

Both require *looking at screenshots*. JSON state cannot express either class of
bug. A transcript that is all-green JSON with zero images looked at is a failed
playtest, not an efficient one.

---

## The one interface: the CLI. Nothing else.

The **only** sanctioned way to drive the game is the toolkit CLI:

```bash
npm run agent -- [flags] --chapter "<Title>" --keep-open --checkpoints
```

This exists specifically so you never have to touch Playwright or `GameAgent`
internals. Three hard rules, each corresponds to a past failure:

- **NEVER write a custom Node.js / Playwright / `page.evaluate` script** to
  "teleport the player" or "loop through beats." The CLI already does all of it
  (`goto`, `skipbeat`, `walkto`, `choose`, `winmode`). A custom script is
  always the wrong tool here — it desyncs, it crashes, and it isn't how this
  game is meant to be driven. *(Past failure: writing ad-hoc Playwright teleport
  scripts instead of typing `goto`/`skipbeat`.)*
- **NEVER call `GameAgent.*` methods directly and NEVER guess a command or
  method name.** The REPL commands are a curated, stable surface; the
  `GameAgent` class methods are not the same names and are not for you. If you
  don't know a command, run `npm run agent -- --help` and read the list — do
  **not** infer a name from a method you saw. *(Past failure: guessing
  `getBeats()` when the method was `inspectBeats()`, then crashing repeatedly.)*
- **NEVER read `src/data/chapters/chapter*.ts` and describe it as if you played
  it.** Reading the config is not playtesting. If you report a bug, it must come
  from something you *observed at runtime* (a screenshot, an `observe` line, a
  console error) — never from static config inspection. *(Past failure:
  scraping the config for bugs and presenting them as playthrough findings.)*

Reading source to *understand* or *diagnose* a bug you already observed is fine.
Reading source *in place of* playing is the failure.

---

## The canonical command set

These are the REPL commands you'll actually use. This is the whole toolbox —
if you want something not here, it's `--help`, not a guess.

| Need | Command |
| --- | --- |
| Skip dialogue/intro until you have walk control | `advance [maxSeconds]` |
| Read what changed since last look (cheap) | `diff` |
| Full observation snapshot | `observe` / `obs` |
| **Snapshot + screenshot** (look at the PNG!) | `observe --shot` |
| Read a dialogue choice and pick it | `text` then `choose <index\|text>` |
| Walk to a point | `walkto <x> <y>` |
| Hold / release / tap a key | `hold w` / `release w` / `tap Space` |
| Current & upcoming beats | `beats` |
| **A beat is soft-locked — force past it** | `skipbeat [n]` |
| **A whole scene is broken — jump scenes** | `goto <sceneIndex>` |
| **A minigame is blocking — force-complete** | `winmode` / `losemode` |
| Annotated screenshot (bounding boxes + names + depth) | `screenshot --annotate` |
| Record motion for flicker/stutter bugs | `gifstart` … `gifstop [file]` |
| Wait for a condition in one round-trip | `watch <jsExpr> [timeoutMs]` |
| Live console errors/warnings so far | `logs` |
| End session (prints `session_summary`) | `quit` |

Startup flags worth knowing: `--checkpoints` (auto-screenshots every
chapter/scene/mode boundary — **look at every one**), `--headed --slowmo <ms>`
(watch it live), `--classified` (**required** to enter the Rose and UMBC
chapters), `--gif <file>` (record the whole session).

Output is JSONL on stdout, one object per command; `session_summary` is the last
line and reports total console errors/warnings. Add `2>/dev/null` to keep stdout
clean for parsing.

---

## The playthrough loop

**IMPORTANT FOR AGENTS**: When launching the REPL as a background task, do **not** stop and wait for asynchronous system notifications. Because the REPL is an interactive process that waits indefinitely for stdin, it will not trigger a completion notification. You must actively send commands using `manage_task` (`send_input`) and then manually read the task logs (e.g. via `view_file`) to check its output.

1. Confirm `npm run dev` is up (port 3324).
2. Launch **interactively** with checkpoints:
   `npm run agent -- --chapter "<Title>" --keep-open --checkpoints`
   (add `--classified` for Rose / UMBC).
3. `advance` to clear the intro, then loop: `diff` → decide → act. Read the
   state; **do not** fire a rigid pre-planned macro of `advance; choose; wait` —
   this game has non-blocking dialogue and will desync a blind script instantly.
4. At every scene, run `observe --shot` and **actually look at the PNG.** Look
   at every `visual_checkpoint` image `--checkpoints` emits. This is where
   visual bugs live.
5. When a sprite looks off, `screenshot --annotate` to turn "something's wrong"
   into "chris_rivas is mis-scaled at depth 12."
6. For motion bugs (walk-cycle stutter, flipX flicker), `gifstart` → do the
   motion → `gifstop`, and look at the GIF. A single frame can't show it.
7. At choice beats, take each meaningful branch (re-run the chapter, or
   `savestate`/`loadstate` around the choice) — a choice with no observable
   effect is itself a finding.

Full reference: [`docs/AGENT_TOOLKIT.md`](../../docs/AGENT_TOOLKIT.md) §4.

---

## When you get blocked — you have tools, use them, then say so

Getting physically stuck (an NPC body blocking a `walkTo`, a beat that never
completes, a minigame you can't beat) is **expected**. It is not a reason to
give up or to fabricate the rest of the run. Escalate in this order:

1. `skipbeat 1` — force past a single stuck beat, then keep playing.
2. `winmode` / `losemode` — force-complete a blocking minigame.
3. `goto <sceneIndex>` — jump past a totally broken scene.

Each of these **is a finding**: if you had to `skipbeat` past a soft-locked
walk, that soft-lock is a friction-point bug to report.

---

## Golden rule: report only what you observed, and be exact about blocks

Every run ends with an honest report. Never smooth over a block, never present
config-reading as gameplay, never claim a scene "looked fine" you didn't
screenshot.

Required end-of-run report format:

```
## Playthrough: <Chapter Title>
Reached: <scene/beat you got to> of <total> — <COMPLETED | BLOCKED at scene N>

### What I observed (with evidence)
- <finding> — evidence: <screenshot path / observe line / console error>
- ...

### Blocks I hit and how I bypassed them
- Scene N, beat "<...>": <what blocked> → bypassed with `skipbeat`/`goto`/`winmode`
  (this itself is a friction bug: <yes/no + why>)

### Not verified
- <anything I could NOT reach or confirm, and why>
```

If you got stuck and couldn't finish, the report says exactly that. "I reached
scene 3, the walk to the desk soft-locked, I `skipbeat`'d past it and continued
to scene 5, and I could not verify scene 4's cutscene" is a good report.
Silently inventing scene 4 from the config is the one unforgivable failure.
