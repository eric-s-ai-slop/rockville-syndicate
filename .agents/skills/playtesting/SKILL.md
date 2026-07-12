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
npm run agent -- [flags] --chapter "<Title>" --repl --checkpoints --playtest
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
- **NEVER use the CLI `eval` command, custom browser automation, `injectbeat`,
  `modify`, `goto`, direct `mode` launch, or `chapterflag`/`settings` writes in
  an autonomous playtest.** `--playtest` blocks all of them, and audits every
  `watch`, `loadstate <file>`, and `speed` use into `session_summary.audit`.
  They change the thing being tested instead of testing it. The one safe
  automation boundary is the documented CLI command set.

Reading source to *understand* or *diagnose* a bug you already observed is fine.
Reading source *in place of* playing is the failure.

---

## The canonical command set

These are the REPL commands you'll actually use. This is the whole toolbox —
if you want something not here, it's `--help`, not a guess.

| Need | Command |
| --- | --- |
| Safely dismiss dialogue; exits with a named `status` (see table below) | `advance [maxSeconds]` |
| Read what changed since last look (cheap) | `diff` |
| Full observation snapshot | `observe` / `obs` |
| **Snapshot + screenshot** (look at the PNG!) | `observe --shot` |
| Acknowledge a checkpoint after looking at its PNG | `reviewcheckpoint <id> clear\|issue-found\|inconclusive <observation-note>` |
| Read a dialogue choice and pick it | `text` then `choose <index\|text>` |
| Walk to a point (real key-driven walking) | `walkto <x> <y>` |
| Hold / release / tap a key | `hold w` / `release w` / `tap Space` |
| Current & upcoming beats | `beats` |
| Quick-save / restore state (branch testing at choices) | `savestate` / `loadstate` |
| **A proven soft-lock — force past one beat** (recorded as a bypass) | `skipbeat 1` |
| **A minigame is blocking — force-complete** (recorded as a bypass) | `winmode` / `losemode` |
| Jump scenes — **blocked in `--playtest`**; report instead | `goto <sceneIndex>` |
| Annotated screenshot (bounding boxes + names + depth) | `screenshot --annotate` |
| Record motion for flicker/stutter bugs | `gifstart` … `gifstop [file]` |
| Wait for a **read-only** condition in one round-trip (audited) | `watch <jsExpr> [timeoutMs]` |
| Live console errors/warnings so far | `logs` |
| Recover after a React/Phaser unmount | `restart` / `refresh` |
| End session (prints `session_summary`) | `quit` |

Startup flags worth knowing: `--checkpoints` (auto-screenshots every
chapter/scene/mode boundary — **look at every one**), `--headed --slowmo <ms>`
(watch it live), `--gif <file>` (record the whole session). CLASSIFIED
chapters are auto-detected from chapter config and their seal is broken during
navigation; `--classified` is only needed for raw `--url` sessions.

## The `advance` status table — respond by lookup, never by improvising

Every `advance` exits with a `status` plus the live beat's
`{index, type, expectation}`. There is no unnamed outcome, so "the pacing
feels slow, I must be blocked" is never a valid read:

| `status` | What it means | Your move |
| --- | --- | --- |
| `walk-control` | Free play, nothing pending | Explore / follow objectives; `observe --shot` |
| `choice-present` | A dialogue choice is on screen | `savestate`, `text`, then take **every** option (`loadstate` between branches) |
| `walk-target-present` | A movement objective is active | `targets`, then `walkto` or held keys — real input, never a teleport |
| `mode-active` | A foreground minigame/boss holds the flow (`modeId` says which) | Inspect its UI, attempt it normally; `winmode`/`losemode` only after a real attempt |
| `ambient-dialogue` | Dialogue keeps re-appearing over free walk control | **Not a block.** Observe, screenshot, continue playing |
| `chapter-ended` | The `endChapter` beat is live | Verify the end state renders, then write the report |

Background minigames (`background: true`) never produce `mode-active` — they
run alongside the story and are not yours to force-complete.

Output is JSONL on stdout, one object per command; `session_summary` is the last
line and reports total console errors/warnings. Add `2>/dev/null` to keep stdout
clean for parsing.

External agents **must** use the JSON command envelope for autonomous QA so
every action and artifact has a stable report citation:

```json
{"protocol":"omega-agent-v1","cmd_id":"scene1-walk","action":"walkto","args":[100,200],"options":{"snapshot":"after","telemetry":true,"console_delta":true}}
```

The CLI emits a correlated `accepted` line, then a `completed` or `failed` line
with the same `cmd_id`. Use `snapshot:"after"` / `annotate:true` / `telemetry:true`
/ `console_delta:true` to bind evidence to a command without extra round trips.
Legacy string commands are still fine for quick manual poking, but not for an
autonomous QA report.

---

## The playthrough loop

**IMPORTANT FOR AGENTS**: Keep the REPL process alive using the environment's
supported terminal-session mechanism. Send one JSONL command at a time and read
stdout until the terminal receipt with the same `cmd_id` arrives. Do not assume
specific task-management tools exist.

1. Confirm `npm run dev` is up (port 3324).
2. Launch **interactively** with checkpoints and QA safeguards:
   `npm run agent -- --chapter "<Title>" --repl --checkpoints --playtest --out "agent-artifacts/<chapter-id>" --transcript "agent-artifacts/<chapter-id>/session.jsonl"`
   (CLASSIFIED chapters are handled automatically).
3. Use `advance` to dismiss dialogue, then respond to its exit `status` per
   the status table above — every exit is named, none of them is a block.
   Never skip beats because pacing feels slow.
4. At every scene, run `observe --shot` and **actually look at the PNG.** Look
   at every `visual_checkpoint` image `--checkpoints` emits, then immediately
   send `reviewcheckpoint <id> clear|issue-found|inconclusive <observation-note>`.
   Every verdict requires a concrete note about what was visible. A scene
   is not visually verified until its image has both been inspected and given
   a review receipt; `session_summary.visual_qa.pending` must be empty.
   The CLI blocks progression commands while any checkpoint is pending and
   rejects placeholder notes such as `skip`, `looks fine`, or `scene entered`.
5. When a sprite looks off, `screenshot --annotate` to turn "something's wrong"
   into "chris_rivas is mis-scaled at depth 12."
6. For motion bugs (walk-cycle stutter, flipX flicker), `gifstart` → do the
   motion → `gifstop`, and look at the GIF. A single frame can't show it.
7. At choice beats, `savestate`, inspect the visible choices, then take every
   option deliberately. `loadstate` before each alternate branch. A choice with
   no observable effect is itself a finding.
8. For each minigame, inspect its starting UI and attempt normal play before
   any bypass. After it ends, keep playing until the post-mode sequence and
   `endChapter` state are runtime-observed.

Full reference: [`docs/AGENT_TOOLKIT.md`](../../docs/AGENT_TOOLKIT.md) §4.

---

## When you get blocked — you have tools, use them, then say so

Getting physically stuck (an NPC body blocking a `walkTo`, a beat that never
completes, a minigame you can't beat) is a finding, not an excuse to skip ahead.
Before any bypass, capture `observe --shot`, `beats`, and visible text. Review
the latest checkpoint first. Slow or looping dialogue is not a proven block.

1. `skipbeat 1` — force past one proven stuck non-mode beat only. Never chain it
   through a foreground minigame.
2. `winmode` / `losemode` — force-complete a minigame only after reviewing its
   checkpoint and attempting its visible UI with normal keyboard/mouse input.
3. Stop and report the run as blocked. Do not use `goto` in an autonomous QA run.

Each permitted bypass is both a finding and a run-integrity downgrade. The CLI
will report `session_summary.playtest_integrity: "partially-bypassed"`; that run
cannot claim natural full-chapter completion. Re-run the affected content from
a saved state or fresh chapter before claiming it was verified.

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
- [P0/P1/P2/P3] <finding>
  Reproduction: <cmd_id sequence>
  Expected: <...>
  Observed: <...>
  Evidence: <checkpoint ID, screenshot/GIF path, observe line, console error>
  Reproducibility: <reproducible | intermittent | unconfirmed>
- ...

### Blocks I hit and how I bypassed them
- Scene N, beat "<...>": <what blocked> → bypassed with `skipbeat 1`/`winmode`/`losemode`
  (this itself is a friction bug: <yes/no + why>)

### Not verified
- <anything I could NOT reach or confirm, and why>

### Coverage
- Scenes reached: <X/Y>; checkpoint IDs inspected: <...>
- Choices: <options tested per choice>; minigames: <normally attempted / bypassed>
- Run integrity: <natural | partially-bypassed>, plus `bypasses` and `audit`,
  and `visual_qa` quoted from the `session_summary` line — never self-tallied
- Raw execution trace: `agent-artifacts/<chapter-id>/session.jsonl`
```

Write the report to `qa/<chapter-id>/report.md` (the chapter's `id` from its
config), with artifacts in the matching `agent-artifacts/<chapter-id>/` folder.

Then verify the report against the authoritative trace:

```bash
npm run agent:verify-report -- qa/<chapter-id>/report.md agent-artifacts/<chapter-id>/session.jsonl
```

In `--playtest`, incomplete visual QA at `quit`/EOF emits
`session_summary.ok: false`, sets `completion_status: "incomplete-visual-qa"`,
and exits nonzero. It is an incomplete run even if the terminal beat was reached.

If you got stuck and couldn't finish, the report says exactly that. "I reached
scene 3, the walk to the desk soft-locked, I `skipbeat`'d past it and continued
to scene 5, and I could not verify scene 4's cutscene" is a good report.
Silently inventing scene 4 from the config is the one unforgivable failure.
