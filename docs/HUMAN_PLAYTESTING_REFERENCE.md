# Human Reference: How Chapter Playtesting Works

This document explains the autonomous one-chapter playtest system for maintainers. It is not part of the playtesting agent's operating prompt; the concise agent contract lives in `.agents/skills/playtesting/SKILL.md`.

## System flow

```mermaid
flowchart TD
    A["Agent sends one omega-agent-v1 command"] --> B["CLI validates syntax and playtest policy"]
    B --> C["GameAgent drives the live Chromium game"]
    C --> D["CLI returns a named status and compact state"]
    D --> Q{"Issue or friction confirmed?"}
    Q -- Yes --> R["Agent records one structured finding"]
    R --> P["Harness atomically refreshes progress.md and progress.json"]
    Q -- No --> P
    P --> E{"Visual checkpoint emitted?"}
    E -- Yes --> F["Agent opens the PNG and reviews the checkpoint"]
    F --> A
    E -- No --> G{"Interactive boundary?"}
    G -- "Choice" --> H["Save once, test branch-unique content, restore if safe"]
    G -- "Walk" --> I["Resolve target and perform real key-driven walk"]
    G -- "Foreground mode" --> J["Inspect and attempt the visible core interaction"]
    G -- "Chapter end" --> K["Verify terminal UI and quit"]
    G -- "No" --> A
    H --> A
    I --> A
    J --> A
    K --> L["CLI emits authoritative session_summary"]
    L --> M["Agent generates report once and runs report verifier"]
```

## Components

| Component | Responsibility |
| --- | --- |
| `e2e_tests/agent/cli.ts` | Owns the persistent session, command routing, checkpoints, evidence, coverage, integrity, and final summary. |
| `e2e_tests/agent/GameAgent.ts` | Converts high-level commands into browser, keyboard, pointer, state, and screenshot operations. |
| `e2e_tests/agent/protocol.ts` | Parses newline-delimited `omega-agent-v1` commands and preserves `cmd_id` correlation. |
| `e2e_tests/agent/playtestPolicy.ts` | Blocks state-changing shortcuts and audits exceptional commands in `--playtest`. |
| `e2e_tests/agent/playtestCompliance.ts` | Enforces checkpoint review and meaningful foreground-mode input before a bypass. |
| `e2e_tests/agent/playtestCoverage.ts` | Records scenes, choices, walks, modes, passive evidence, and terminal observation. |
| `e2e_tests/agent/playtestFindings.ts` | Maintains the append-only structured finding ledger during play. |
| `e2e_tests/agent/playtestProgress.ts` | Atomically writes token-free machine and human progress indicators. |
| `e2e_tests/agent/playtestReport.ts` | Generates and verifies the human-readable report against the transcript's final summary. |

## Session lifecycle

Start one live browser and keep it open for the chapter:

```bash
npm run agent -- --chapter <chapter-index> --repl --checkpoints --playtest \
  --out "qa/<chapter-id>" \
  --transcript "qa/<chapter-id>/session.jsonl"
```

The driving agent sends one newline-terminated JSON command, waits for the correlated terminal receipt, then decides the next action:

```json
{"protocol":"omega-agent-v1","cmd_id":"advance-001","action":"advance","args":[]}
```

The CLI emits an `accepted` receipt followed by `completed` or `failed`. Automatic events such as `visual_checkpoint` are also written to the transcript.

## The `advance` control loop

`advance` dismisses routine story dialogue and stops at a named state:

| Status | Meaning |
| --- | --- |
| `walk-control` | The player has ordinary movement control. |
| `choice-present` | A visible choice needs deliberate branch coverage. |
| `walk-target-present` | A story movement objective is active. |
| `mode-active` | A foreground mode is blocking story progression. |
| `ambient-dialogue` | Dialogue is occurring over free control; this is not a soft-lock. |
| `chapter-ended` | The terminal chapter beat has been observed. |

The receipt also carries the live beat identity and compact game state. Agents should not request a second full observation when the receipt already answers the routing question.

## How much input does walking require?

Walking does not require frame-by-frame commands. For a story objective, the normal sequence is:

1. `advance` returns `walk-target-present`.
2. `targets` resolves the destination.
3. `walkto <x> <y>` holds and releases real movement keys internally until arrival or failure.
4. The agent continues with `advance`.

A checkpoint can add one required review, so a walking transition normally costs three or four commands. Free movement can be a single timed command such as `press w 1000`.

## Visual evidence

Automatic checkpoints cover scene and mode boundaries. DEV-only beat tracing also captures visually risky passive beats such as camera pans, actor movement, actor visibility changes, chases, screen tints, and ledger effects.

Every checkpoint blocks progression until the agent opens its original PNG and submits:

```text
reviewcheckpoint <id> clear|issue-found|inconclusive <concrete note>
```

The note must describe visible evidence. A coalesced checkpoint can represent several simultaneous transitions. `captureMissed:true` means the effect was not visually verified.

## Choices and modes

At a choice, the agent creates one quick state and checks `branchSafe`. Safe branches are restored without replaying common content. Unsafe branches require a fresh natural run because an inaccurate restore would be worse than the additional time.

Foreground modes must receive normal keyboard or pointer input before the harness permits `winmode` or `losemode`. Background modes run alongside the story, never produce `mode-active`, and must be observed through their start, coexistence, and teardown.

## Integrity and completion

The harness records `skipbeat`, `winmode`, and `losemode` as bypasses. Any bypass changes `playtest_integrity` to `partially-bypassed`; the run can continue for downstream diagnosis but cannot claim verified natural completion.

At `chapter-ended`, the agent reviews the terminal presentation, waits once for the completion handoff, clears any new checkpoint, and quits. Verification requires:

- Complete visual QA with no pending checkpoints.
- Natural integrity with no bypass.
- Runtime terminal observation.

Failure produces `incomplete-visual-qa`, `incomplete-integrity`, or `incomplete-coverage` and a nonzero exit.

## Live findings, progress, transcript, and report

Confirmed issues are written during play with `recordfinding`, so the agent does not have to retain every detail until the end or repeatedly rewrite Markdown. Each record contains severity, category, title, location, reproduction, expected and actual behavior, and evidence. Visual issues link to their checkpoint ID. A disproven record is dismissed with an audit reason rather than deleted.

The harness also refreshes two files under `qa/<chapter-id>/` after every completed command:

- `progress.json` is the machine-readable status for dashboards or supervising agents.
- `progress.md` is a human-readable percentage bar.

The bar is a monotonic estimate weighted 65% by farthest story beat, 25% by static coverage obligations (scenes, choice options, walk objectives, foreground/background modes, and terminal observation), and 10% by checkpoint review. The files show those components separately. A run is capped at 99% until both the terminal summary is verified and every measured obligation is complete. This avoids the misleading claim that reaching a late beat means branch and visual coverage are complete.

The transcript remains the authoritative execution record. Its final `session_summary` contains console counts, integrity, bypasses, audit entries, visual reviews, coverage, findings, and final progress.

After the session, the agent generates the report once from the structured ledger and authoritative summary, then verifies it:

```bash
npm run agent:write-report -- qa/<chapter-id>/report.md qa/<chapter-id>/session.jsonl
npm run agent:verify-report -- qa/<chapter-id>/report.md qa/<chapter-id>/session.jsonl
```

The verifier rejects edited canonical evidence, omitted open findings, unlinked `issue-found` checkpoints, missing pending-checkpoint status, or a completion claim unsupported by the transcript.

## Token-efficiency profile

The system is designed to spend tokens on evidence and decisions rather than polling:

- `advance` collapses routine dialogue.
- `walkto` performs a complete key-driven walk in one command.
- Checkpoints replace duplicate screenshots.
- Simultaneous transitions share one checkpoint.
- Passive effects are captured without agent polling.
- Branches replay only unique content when restoration is safe.
- Annotation, telemetry, and GIFs are requested only for a specific suspected problem.

The main remaining command overhead in dialogue-heavy chapters is repeated `ambient-dialogue` exits. Checkpoint reviews remain intentionally separate because they are the enforceable proof that the rendered game was inspected.
