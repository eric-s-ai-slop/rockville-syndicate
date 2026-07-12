# Playtesting Skill Review

Date: 2026-07-12

Scope: `.agents/skills/playtesting/SKILL.md` and `prompt.md`, assessed as instructions for Gemini 3.1 Pro to playtest one chapter for visual bugs and player friction.

## Verdict

The current skill is a strong foundation. It is especially good at preventing fake QA: the agent must drive the live game, inspect images, acknowledge checkpoints, preserve a transcript, and disclose bypasses.

The main opportunity is to make it more selective. Maximum accuracy does not require maximum observation volume. The chapter engine already classifies flow into passive beats and a small number of interactive stops. The fastest accurate agent should let `advance` collapse routine dialogue, inspect every automatically generated boundary image once, and spend extra image/tool calls only on interactive or visually risky states.

The highest-value changes are:

1. Add automatic or explicitly required evidence for transient visual beats and background modes.
2. Remove duplicate scene screenshots and routine full observations.
3. Define a meaningful mode attempt in terms of mechanic coverage, not elapsed time or one input.
4. Define efficient choice coverage using the chapter’s converge/jump structure.
5. Make terminal verification account for the delayed React–Phaser completion handoff.

## Relevant game structure

The instructions should be designed around these facts from the live implementation:

- A chapter is one ordered `beats[]` program over either one map or multiple `scenes[]`. `scenes[]`, when present, overrides the top-level map and actors.
- `dialogue` is dismissable. `choice`, `walkTo`, foreground `minigame`, and `bossFight` require agent input. Most other beats resolve passively.
- `advance` already understands this distinction and stops with a named status at interactive boundaries. It should be the primary loop.
- `cameraPan`, `moveActor`, `hideActor`, `showActor`, `chase`, `screenTint`, `ledger`, and audio beats can resolve inside one `advance` call. Some are visually important even though they need no input.
- Choices can react inline, jump with `goto`, mutate the ledger or a side effect, or enter a goto-only branch block that later converges.
- Foreground modes freeze story flow. A loss may jump through `loseGoto`; a win falls through.
- Background modes run concurrently with the story and do not produce `mode-active`. They can react to dialogue and must not freeze the player.
- `changeScene` tears down the current map and active mode, rebuilds actors and props, moves the player to the new spawn, and may crossfade scene music.
- External modes mount an iframe, suspend or overlay Omega, use a ready/start/complete handshake, and duck music.
- `endChapter` remains the live beat while victory effects run. The completion callback occurs after approximately 2.2 seconds of delayed animation/fades.
- The camera normally uses zoom 2.0. Screen-fixed HUD elements are therefore a known risk area.
- Map theme drives procedural decoration, while `propKey`, `spriteKey`, `spriteScale`, understudies, and invisible colliders create chapter-specific visual/collision risks.

These facts favor event-driven, risk-based inspection instead of repeated polling.

## Recommended token-efficient execution policy

### Primary loop

1. Start one long-lived `--repl --checkpoints --playtest` session with a transcript.
2. Review each emitted checkpoint immediately with one short, concrete sentence.
3. Send `advance` and act only on its returned status.
4. Do not call `observe` or `diff` after a successful `advance` unless the result is ambiguous or a finding needs evidence. The `advance` receipt already contains the live beat and status needed for routing.
5. Use `text` only at choices, unclear instructions, or suspected text defects.
6. Use `targets` only for `walk-target-present`.
7. Use `beats` only for a suspected stall, branch tracking, or preparing to capture an upcoming transient visual beat.
8. Request screenshots, annotations, GIFs, telemetry, and console deltas selectively as described below.

### Evidence budget

| State | Required evidence | Avoid by default |
| --- | --- | --- |
| Scene entry | Existing automatic checkpoint | Duplicate `observe --shot` of the same settled frame |
| Choice | `text`, one screenshot, then branch actions | Re-scraping unchanged text after each option |
| Walk target | `targets`; screenshot only if placement/UI is unclear or wrong | Full `observe` before and after a routine successful walk |
| Foreground mode start | Existing mode checkpoint and visible instructions | Immediate annotated screenshot when nothing looks wrong |
| Foreground mode play | One representative mid-play image after the mechanic is exercised | Per-input screenshots or telemetry on every action |
| Mode result/teardown | Mode-end checkpoint plus post-mode `advance` | Ending the run at mode completion |
| Background mode | One start-state image and one interaction/lifecycle check | Treating `activeMode` alone as a story block |
| Transient motion/effect | Short scoped GIF only when the beat is known or a defect is suspected | Whole-session GIF |
| Suspected sprite/depth bug | `screenshot --annotate` | Annotating every clean scene |
| Suspected performance bug | `perf` or command telemetry | Telemetry on every protocol command |
| Console | `console_delta` on meaningful state-changing actions; full `logs` only if nonzero or at the end | Repeated full log dumps |
| Chapter ending | One terminal-effects image, then observe the completion transition | Treating the `chapter-ended` status alone as visual proof |

For Gemini 3.1 Pro, give the original PNG directly at normal/high visual detail. Ask it to inspect a fixed shortlist—framing, actors, text/UI, props/targets, and obvious missing assets—then return one compact checkpoint note. Repeatedly describing the image in the prompt wastes tokens and can bias the visual judgment.

### Protocol options

Do not attach `snapshot`, `annotate`, `telemetry`, and `console_delta` to every command merely because the envelope supports them.

- Use `console_delta: true` for meaningful mutations such as walking, choosing, mode interaction, and advancing across a major boundary.
- Use `snapshot: "after"` when it replaces a separate screenshot call, not when an automatic checkpoint will capture the same state.
- Use `annotate: true` only after a visual anomaly is suspected.
- Use `telemetry: true` only for stutter, slowdown, runaway-object, or memory concerns.

This preserves correlated evidence without inflating every receipt.

## High-priority improvements

### 1. Cover passive visual beats without making Gemini poll

Current checkpoints are based on Phaser scene index and foreground-mode identity. They do not automatically capture many visually risky beat types that can begin and end inside `advance`:

- `cameraPan`
- `moveActor`, `hideActor`, and `showActor`
- `chase`
- `screenTint`
- `ledger`
- `changeMusic` and `stopAllAudio`, when audiovisual coverage is in scope

Do not solve this by telling the agent to run `beats` and screenshot around every passive beat. That adds tokens, timing races, and agent complexity.

Preferred harness improvement: emit a stabilized checkpoint or short targeted capture at the start/end of designated visual-risk beats. At minimum, surface in the `advance` receipt which visual-risk beat types were traversed so Gemini can request one follow-up artifact only when needed.

For motion-only beats such as `cameraPan` and `chase`, a stabilized PNG may miss the bug. The harness should ideally offer a short automatic clip or a warning that prompts a scoped `gifstart` before replay. Until then, use `beats` lookahead and a short GIF only when one of these beats is immediately upcoming.

### 2. Cover background modes explicitly

Background modes are a real gap. They do not stop `advance`, do not return `mode-active`, and are excluded from the current foreground-mode checkpoint identity. This can miss:

- Background UI placement or animation
- Dialogue-reactive behavior
- Accidental player freezing
- Failure to tear down on `changeScene`
- Stale high-depth UI left over after teardown

Preferred harness improvement: include `backgroundModeId` and its start/end transitions in observations/checkpoints without treating it as blocking.

Skill requirement until then: when a background mode is observed, capture it once, confirm that movement/story flow remains available, and confirm teardown or expected re-registration at the next scene transition. Do not attempt `winmode` or `losemode` merely because `activeMode` is non-null.

### 3. Replace “attempt normally” with mechanic coverage

The current enforcement can consider one successful keyboard or mouse command a mode attempt. The skill should require enough interaction to exercise the mechanic, but not prescribe a universal duration.

A meaningful attempt means:

- Read the visible objective and controls once.
- Perform the core input loop successfully at least once, or make two coherent attempts if success is not immediately possible.
- Observe one feedback cycle: score/progress, damage, success, failure, or rule response.
- Capture one representative active-play image.
- Continue toward natural completion while measurable progress is occurring.
- Bypass only after progress stalls for a concrete reason, with evidence.

Mode-specific checks should follow lifecycle, not arbitrary time:

- Boss fight: exercise movement, one player attack, one enemy attack or hazard, damage/HP feedback, and natural defeat/victory if feasible.
- `loseGoto` mode: verify the natural loss route at least once if loss is realistically reachable, then verify the winning/fall-through path.
- External iframe mode: verify ready/start, visible interaction, completion return, iframe removal, and music restoration.
- Background mode: verify concurrent story/movement and teardown rather than trying to “win” it.

### 4. Make choice coverage branch-aware and bounded

The chapter schema supports inline reactions, `goto`, side effects, and branch blocks after `endChapter`. “Take every option” is correct but needs an efficient stopping rule.

For each choice:

1. `savestate` once and `text` once.
2. Test each option from that same save.
3. Follow an option through its reaction and any unique branch until it rejoins an already observed beat, reaches another interactive stop, enters a unique scene/mode, or terminates.
4. Record only the branch-specific result and evidence; do not replay already verified common dialogue.
5. Restore once more and continue the intended main path naturally.

Nested choices should be tested recursively only while they expose new content. This gives accurate branch coverage without replaying the chapter from the beginning for every option.

The runtime report should ideally expose observed beat-index transitions or branch IDs so the agent can recognize convergence without rereading source. Source may help diagnose an observed routing bug, but it must not substitute for runtime branch traversal.

### 5. Remove duplicate scene screenshots

The skill currently requires both the automatic scene checkpoint and `observe --shot` at every scene. These usually capture the same settled frame.

Change the policy to:

- Automatic checkpoint = required scene-entry visual evidence.
- Plain `observe` only when additional state is needed.
- `observe --shot` only for a materially changed mid-scene state or when checkpoint capture failed.

This is the easiest immediate reduction in wall-clock time and image tokens with no accuracy loss.

### 6. Make terminal verification match `runEndChapter`

`chapter-ended` is returned while the terminal beat is still live. The game then plays victory animation/flash unless `quietEnd`, fades audio, waits 1.2 seconds, fades the camera, waits about 520 ms, and calls the React completion callback.

The efficient accurate sequence is:

1. On `chapter-ended`, capture the victory or quiet-end presentation immediately.
2. Wait approximately 2.3 seconds once; do not poll repeatedly.
3. Inspect the resulting completion transition/unmount or returned UI.
4. Confirm no stale dialogue, foreground/background mode UI, tint, iframe, or frozen overlay remains.

The report must cite both terminal-beat evidence and the post-callback state when the latter is visible.

### 7. Resolve bypass continuation semantics

The skill says both “Stop and report the run as blocked” and, in its example, describes continuing after `skipbeat`. Use one explicit policy:

- The natural run becomes blocked at the first required bypass.
- Capture evidence before bypassing.
- Continue only for downstream diagnostic coverage if the session remains stable.
- Label downstream evidence as partially bypassed and never upgrade it to natural completion.
- Re-run only the affected path or chapter when a natural verification is required.

This avoids wasting the remainder of a long chapter while preserving honest integrity.

## Accuracy rubrics

### Compact visual checklist

Gemini should check these categories in each required image, then mention only relevant specifics in its receipt:

- Framing: backdrop fills viewport, no black bars, correct camera/letterbox/zoom.
- Actors: expected visible cast, sensible scale and floor contact, facing/animation, nameplate placement, depth against props.
- World: theme-appropriate procedural decor, correct backdrop/props, no missing textures or placeholder blobs, target visible and reachable.
- UI/text: sharp and readable, not clipped or overlapping, screen-fixed HUD correctly compensated for zoom.
- State-specific layer: choice, task marker, combat HUD, mode UI, tint, iframe, victory/quiet ending, or other active presentation.

One concrete sentence is sufficient for a clear checkpoint, for example: “Player and three NPCs are grounded at consistent scale; dialogue footer is sharp and unobstructed.” Longer prose does not improve evidence quality.

### Compact friction checklist

Check friction only when the corresponding mechanic appears:

- Next action and controls are discoverable from the rendered game.
- Walk target is visible, reachable, and not blocked by actor/prop collision.
- Input receives timely, understandable feedback.
- Dialogue and choices advance exactly once and consequences are perceptible.
- Mode rules, progress, success, failure, and retry are understandable.
- Waits, walks, repeated dialogue, or retries are not disproportionately long.
- Player can recover from ordinary mistakes without a restart or hidden action.

Separate a reproducible functional defect from subjective pacing feedback.

### Severity

- **P0:** Crash, data loss, or chapter cannot start.
- **P1:** Required progression is blocked or a required mechanic is effectively unusable.
- **P2:** Significant visual/interaction defect with a workaround; strongly harms comprehension or play quality.
- **P3:** Cosmetic issue or minor friction that does not threaten comprehension or completion.

Re-attempt P0/P1 findings when safe. Recheck timing-dependent P2 findings. Do not spend a second run proving a straightforward static P3 unless its cause is uncertain.

## Reporting efficiency

The transcript is the exhaustive record. The Markdown report should be a compact index into it, not a prose replay of the chapter.

- Do not narrate clean dialogue beats.
- For a clean run, summarize visual coverage by checkpoint IDs and interaction counts.
- For a finding, include only severity, minimal `cmd_id` reproduction, expected/observed, evidence path, and reproducibility.
- Quote exact console entries only when errors/warnings are nonzero.
- Include the canonical session evidence required by the verifier without restating the same arrays in prose.
- Record viewport, DPR, seed if set, headed/headless mode, chapter ID, and audited operations once in Coverage.

The report verifier confirms agreement with `session_summary`; it does not prove that Gemini understood every image, meaningfully played every mode, or deeply traversed every branch. The acceptance rules must remain in the skill even if some cannot yet be mechanically enforced.

## Recommended acceptance criteria

A chapter is **verified** only when:

1. It reaches the natural terminal state without a bypass.
2. Every emitted checkpoint is reviewed and `visual_qa.pending` is empty.
3. Every scene entry and foreground-mode boundary is visually inspected once.
4. Every observed background mode is checked for visible state, non-blocking behavior, and teardown.
5. Every choice option’s unique reaction/branch is runtime-observed without replaying common content unnecessarily.
6. Every foreground mode receives a meaningful mechanic attempt; start, active feedback, result, and teardown are observed.
7. Transient high-risk beats encountered by the chapter receive targeted evidence.
8. The terminal effects and delayed completion handoff are both verified.
9. Nonzero console errors, warnings, and failed requests are triaged.
10. The compact report passes `npm run agent:verify-report` and lists anything not verified.

If a bypass is required, the run is a **blocked diagnostic run** even when the agent continues downstream. A later natural run is required for verified status.

## Qualms and editorial fixes

- “Three hard rules” currently introduces four bullets; use “Hard rules.”
- “This is the whole toolbox” is too absolute; “canonical playtest toolbox” is more accurate.
- `visual_qa.status: complete` means every emitted checkpoint was acknowledged, not that all chapter visuals were covered.
- A 20-character note can still be generic; the compact visual checklist should govern note content.
- The current prompt can encourage redundant evidence by combining mandatory checkpoints, per-scene `observe --shot`, and optional protocol snapshots.
- Whole-session GIF, telemetry on every command, and routine full observations should be explicitly discouraged for Gemini because they increase image/token cost without improving ordinary chapter accuracy.
- Audio, accessibility, responsive-layout matrices, performance profiling, and chapter-select progression should be explicitly declared in or out of scope. The current visual/friction pass should not silently imply those were tested.

## Bottom line

The best version of this skill should be strict about evidence but sparse about tool calls. Use `advance` as the control plane, checkpoints as the default visual evidence, one representative image per interactive mechanic state, and targeted artifacts only for risk-bearing passive beats or suspected defects. The two genuine coverage gaps are transient visual beats and background modes; improving the harness there will save more Gemini tokens and produce higher accuracy than adding more general instructions to observe everything.
