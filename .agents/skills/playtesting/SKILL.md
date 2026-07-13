---
name: Playtesting Game Agent
description: Play one chapter end to end with the Agent Toolkit CLI, exercising branches and modes while producing honest visual, friction, and completion evidence.
---

# Playtest one chapter

Play the assigned chapter in one live CLI session. Find player-facing friction and visual defects, cover meaningful branches and modes, and report only what runtime evidence supports.

## Non-negotiable rules

1. Drive the game only through `npm run agent` and its documented commands. Do not write scripts, call internal methods, or treat source inspection as playtest evidence.
2. In `--playtest`, never use `eval`, `injectbeat`, `modify`, `goto`, direct `mode`, `chapterflag`, or `settings`. Do not invent commands.
3. Inspect every emitted visual checkpoint and immediately submit a concrete review. The CLI blocks progression while a checkpoint is pending.
4. Report bypasses, missed captures, failures, and incomplete coverage exactly as recorded. Never claim completion from an edited summary.

## Start the session

Use the chapter config's `id` for paths:

```bash
npm run agent -- --chapter <chapter-index> --repl --checkpoints --playtest \
  --out "agent-artifacts/<chapter-id>" \
  --transcript "agent-artifacts/<chapter-id>/session.jsonl"
```

Send one newline-terminated `omega-agent-v1` JSON command at a time with a unique `cmd_id`. Wait for its correlated `completed` or `failed` receipt before sending another command:

```json
{"protocol":"omega-agent-v1","cmd_id":"advance-001","action":"advance","args":[]}
```

Use `advance` as the primary control loop. Act on its named status:

| Status | Action |
| --- | --- |
| `walk-control` | Continue normal movement or use `walkto` for the current objective. |
| `choice-present` | Read the choices, then branch-test them as described below. |
| `walk-target-present` | Use `targets`, then `walkto <target>`; do not guess coordinates. |
| `mode-active` | Play the foreground mode through normal input. |
| `ambient-dialogue` | Continue with `advance`; do not wait for ambient text to vanish. |
| `chapter-ended` | Perform terminal verification before quitting. |

If `advance` fails or returns an unfamiliar status, quote it exactly and diagnose with the least expensive targeted command. Use `restart` only when a fresh natural run is required.

## Spend evidence efficiently

An automatic checkpoint is the default visual evidence for a scene or mode transition. Open its original PNG, inspect it once, and review it with:

```text
reviewcheckpoint <id> clear|issue-found|inconclusive <observation-note>
```

Every verdict, including `clear`, needs one concrete visible observation. Do not take a second `observe --shot` merely to duplicate an adequate checkpoint.

Use targeted evidence only when it can answer a specific question:

- `text` for choice wording or unclear instructions.
- `targets` only for a `walk-target-present` objective.
- `observe --shot` before a bypass or when no adequate checkpoint exists.
- `screenshot --annotate` for suspected sprite bounds, placement, or depth issues.
- `telemetry` for a suspected performance problem.
- `gifstart` / `gifstop` for a short motion, chase, or animation defect. Do not record a whole-session GIF by default.

Read `advance.visual_events` and passive-evidence contact sheets. One coalesced checkpoint may contain several transitions; review all transition metadata against the same image. A `captureMissed:true` event is not verified visual evidence: record it as not verified instead of guessing.

Avoid routine `state`, `observe`, or `diff` calls after a successful `advance`; its receipt already contains the compact observation needed for routing.

While reviewing images, check actor scale/position/depth/facing, animation state, missing assets, black bars, and UI/text clipping, overlap, contrast, or stale elements. While interacting, check instruction clarity, control feedback, objective reachability, choice consequences, mode win/loss/return flow, and scene-transition continuity.

## Cover choices without replaying common content

At each `choice-present` boundary:

1. Run `savestate <name>` once and inspect `branchSafe` and `unsafeReasons`.
2. If `branchSafe:true`, choose one option, follow its unique content until convergence, a new choice/walk/mode boundary, a unique scene, or a terminal state. Then `loadstate <name>` and test the next option.
3. If `branchSafe:false`, do not force restoration. Use `restart` and a fresh natural run for each required branch.
4. Do not replay shared downstream content after convergence. Ensure every displayed option is represented in final coverage.

## Exercise modes meaningfully

For a foreground `mode-active` checkpoint, read the visible objective, exercise the core input, observe responsive feedback, and retain an active-play image. Make at least one coherent normal attempt before resolving it. For boss fights, exercise movement, an attack or hazard, and HP feedback. For external iframe modes, verify ready/start, interaction, completion, return to the chapter, and restored audio.

A background mode does not block story flow and must not produce `mode-active`. Do not use `winmode` or `losemode` on it. Continue the foreground story and verify that the background activity coexists and tears down at the correct boundary.

Where a distinct loss route such as `loseGoto` is reasonably reachable, exercise it naturally. Do not burn excessive attempts on a probabilistic or inaccessible outcome; report the uncovered route.

## Bypass only a proven blocker

Before bypassing, capture `observe --shot`, `beats`, and `text`, then quote the exact failure.

- Use exactly `skipbeat 1` for a proven stuck non-mode beat.
- Use `winmode` or `losemode` only for a blocking foreground mode after a successful normal keyboard or mouse attempt.
- Never chain `skipbeat 1` through a minigame.

Any bypass makes `playtest_integrity` `partially-bypassed`. Continue only to diagnose downstream content; never label that run verified or `COMPLETED`. Preserve the bypass entry and `audit` trail.

## Verify the ending

On `chapter-ended`, capture the terminal presentation, run `wait 2300` once for the completion transition, inspect any new checkpoint, and confirm stale dialogue, prompts, and mode UI are gone. Then send `quit` and retain the final `session_summary`.

Completion is `verified` only when all three are true:

- `visual_qa.pending` is empty.
- `playtest_integrity` is natural.
- coverage records terminal observation.

Treat `incomplete-visual-qa`, `incomplete-integrity`, and `incomplete-coverage` as failures. `quit`/EOF exits nonzero for an incomplete visual QA or any other non-verified completion status.

## Write and verify the report

Write `qa/<chapter-id>/report.md`. Keep artifacts under `agent-artifacts/<chapter-id>/`. Include:

- `Reached: <terminal state> — COMPLETED` only for `completion_status: verified`; otherwise state the exact incomplete status.
- `Pending checkpoints: none` only when the summary says none.
- `Run integrity: natural` or `Run integrity: partially-bypassed`.
- `Raw execution trace: ` followed by the exact `agent-artifacts/<chapter-id>/session.jsonl` path in backticks.
- A compact coverage summary and only actionable findings, each with severity, runtime location, reproduction, expected/actual behavior, and evidence path or command ID.
- The exact canonical `omega-playtest-session` evidence block copied from `session_summary`, including `ok`, `completion_status`, `errors`, `warnings`, `playtest_integrity`, `bypasses`, `audit`, `visual_qa`, and `coverage`. Do not edit or reconstruct it.

Use severity consistently: P0 is a crash, data loss, or unavoidable chapter blocker; P1 breaks a required interaction or obscures critical information; P2 is reproducible friction or a visible defect with a workaround; P3 is cosmetic polish. Mark passive effects with `captureMissed:true` as **Not verified**, not as bugs without corroboration.

Run:

```bash
npm run agent:verify-report -- qa/<chapter-id>/report.md agent-artifacts/<chapter-id>/session.jsonl
```

Do not claim success unless verification passes. Audio quality, accessibility, responsive-layout sweeps, menu UX, and performance profiling are out of scope unless explicitly requested or visibly implicated during the chapter run.
