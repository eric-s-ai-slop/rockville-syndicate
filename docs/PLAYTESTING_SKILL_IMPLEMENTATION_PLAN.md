# Playtesting Skill Implementation Plan

Status: PR 4 complete; PR 5 intentionally not started
Date: 2026-07-12  
Source review: `docs/PLAYTESTING_SKILL_REVIEW.md`

## Current implementation note

The implementation now has a structured in-memory snapshot path for
scene/beat/player/scalar state, rendered actor state, unified progress, and all
Maria Brooke stats. `savestate` reports `branchSafe` and `unsafeReasons`, while
`loadstate` refuses unsafe in-memory restores with a fresh-run instruction. The
fixture and focused Playwright coverage now verify choice save/restore returns to
the exact choice beat without delayed beat-0 rewind, restores actor/scalar/
Maria/progress state, preserves the existing file save/load contract, and rejects
unsafe in-memory saves at an active background mode. No gameplay timing or mode
behavior has been changed in production; the DEV fixture's passive beats are
intentionally sustained for live evidence. The checkpoint harness now keeps foreground and
background mode identity/beat indexes separate, emits deduplicated lifecycle
receipts for both, counts background receipts in visual QA, and keeps them out
of foreground bypass gates. Compact state also reports whether the active mode
is background. No arbitrary mode internals or additional storage keys are used.
PR3 adds a bounded DEV-only structural beat trace and passive visual-risk
evidence batching; production builds do not record the trace. PR4 adds a
compact runtime coverage summary, per-mode input categories, canonical report
coverage integrity, and fail-closed completion requiring terminal observation,
complete visual QA, and natural integrity. The final skill rewrite remains
intentionally deferred.

## Objective

Make one-chapter autonomous playtests by Gemini 3.1 Pro faster and more token-efficient without weakening runtime, visual, branch, mode, or report accuracy.

The finished workflow must:

- Use `advance` as the main control loop.
- Avoid duplicate screenshots and routine full observations.
- Preserve accurate state while testing choice branches.
- Cover foreground and background modes according to their real lifecycle.
- Capture visually risky passive beats without requiring Gemini to poll.
- Verify the delayed `endChapter` completion handoff.
- Keep the skill concise and keep fragile timing logic in the harness.

## Non-goals

- Do not change story content or chapter configs except the DEV-only playtest fixture.
- Do not alter gameplay timing, routing, mode outcomes, or production rendering.
- Do not add a second persistence mechanism or a new `localStorage` key.
- Do not edit either BattleIQ directory.
- Do not make audio, accessibility, performance, responsive-layout, or chapter-select QA part of this pass unless separately approved.
- Do not build automatic whole-session GIF capture or generic AI image analysis into the CLI.
- Do not weaken `--playtest` mutation policy or checkpoint review requirements.

## Required reading before editing

Read these files in order:

1. `CLAUDE.md`
2. `.agents/skills/playtesting/SKILL.md`
3. `.agents/skills/playtesting/prompt.md`
4. `docs/PLAYTESTING_SKILL_REVIEW.md`
5. `src/data/chapters/CLAUDE.md`
6. `src/game/modes/CLAUDE.md`
7. `docs/AGENT_TOOLKIT.md`, especially sections 2–4
8. `e2e_tests/agent/DevBridge.ts`
9. `e2e_tests/helpers.ts`, especially `advanceUntil`
10. `e2e_tests/agent/cli.ts`, especially `reachWalkControl`, checkpoint emission, `advance`, and `session_summary`

Before changing anything, run `git status --short`. This repository may already contain in-progress playtest-harness changes. Do not overwrite or revert them. If the same lines are already modified, rebase or coordinate before proceeding.

## Architecture decisions

These decisions are fixed for this implementation:

1. Keep the core skill below roughly 200 lines if practical. Move deterministic behavior into code, not more prose.
2. Preserve the existing CLI and `omega-agent-v1` envelope as the only autonomous control surface.
3. Use one long-lived browser/REPL session per chapter.
4. Treat automatic checkpoints as the default visual evidence. Additional images must represent a distinct state.
5. Track background modes separately from foreground modes. A background mode must never satisfy or trigger foreground bypass logic.
6. Do not claim branch coverage until quick-save restore is known to preserve the relevant state.
7. Keep browser-bridge types structural. Never import Phaser or game runtime modules into the Node CLI.
8. Use the existing `omega-save-v2` settings/progress path for persisted choice effects.
9. Keep transient evidence collection observational. It must not freeze, skip, speed up, or otherwise alter the beat being tested.
10. Prefer compact summaries and contact sheets over many model-visible images.

## Delivery sequence

Implement this as five reviewable pull requests or commits. Do not combine them into one large change.

---

## PR 1 — Make branch save/restore trustworthy

### Why this comes first

The skill tells agents to `savestate`, test every choice, and `loadstate` between options. The current quick save restores scene/beat/player/HP/ledger, but it rebuilds actors from initial scene config and does not restore all chapter side effects. This can contaminate later branch tests or replay them against the wrong visual state.

Known examples:

- `rose_silence` is persisted through the unified progress store.
- `maria_lookup` and mode results mutate the `mariaBrookeStats` singleton.
- Earlier `hideActor`, `showActor`, or `moveActor` beats can change the correct visual state at a later choice.
- An active background mode cannot be reconstructed generically from the current quick-save payload.

### Files

- `e2e_tests/agent/GameAgent.ts`
- `e2e_tests/agent/DevBridge.ts`
- `src/game/ChapterScene.ts`
- `src/game/scene/Actors.ts`
- `src/game/modes/mariaBrookeStats.ts`
- `src/game/progress.ts` only if a missing facade is required
- `e2e_tests/agent/GameAgent.smoke.spec.ts`
- `src/data/chapters/chapterFixture.playtest.ts`, DEV fixture only

### Implementation

1. Replace `GameAgent.quickSaveState: any` with an explicit structural type.
2. Add snapshot/restore methods to `MariaBrookeStats`. Snapshot every field; restore must replace every field, not merge selectively.
3. Add a ChapterScene playtest snapshot containing:
   - Scene index and beat index
   - Player position and velocity reset target
   - HP, shards, and ledger
   - Per-actor rendered state: actor id, primary sprite position, visibility, flip state, and frame where applicable
   - Current progress object obtained through the existing settings/progress facade
   - Maria Brooke stats snapshot
   - Safety flags for active foreground/background mode, external iframe, chase, QTE, and other runtime state that cannot be reconstructed safely
4. Add a matching restore path on `ChapterScene`:
   - Tear down active modes/overlays first.
   - Warp to the saved scene.
   - Restore player and scalar state.
   - Restore actor position/visibility/facing consistently across sprite, nameplate, and shadow. Put this synchronization in `Actors`, not duplicated in `GameAgent`.
   - Restore progress through `settings.ts`/`progress.ts`; never write a new key directly.
   - Restore Maria stats.
   - Restore the exact beat through `restoreBeat` after cancelling the initial beat timer.
5. Return `branchSafe` and `unsafeReasons` from `savestate`.
6. In `--playtest`, refuse to claim an in-memory branch save is safe when an unsnapshottable active mode, iframe, chase, or QTE exists. Keep the session alive and return an actionable error telling the agent to use a fresh natural run for that branch.
7. Do not attempt generic serialization of arbitrary mode internals in this PR.

### Tests

Add tests proving that save → mutate → load restores:

- Actor position and visibility after `moveActor`/`hideActor`/`showActor`.
- Player position, HP, shards, and ledger.
- `rose_silence` progress state.
- Every Maria stats field.
- Exact beat index without the delayed beat-0 timer rewinding it.
- `branchSafe: false` when a background mode or other unsupported runtime is active.
- No new local-storage key is introduced.

Use the DEV fixture for actor and branch behavior. Add fixture beats only when needed, and update fixture coverage expectations in the same change.

### Acceptance criteria

- Two options tested from the same safe save begin from identical visible/runtime state.
- An unsafe save is reported honestly rather than silently restored incompletely.
- Existing file save/load behavior is unchanged unless explicitly covered by new tests.
- `npm run lint` and the relevant Playwright smoke test pass.

---

## PR 2 — Track background-mode checkpoints correctly

### Why

Foreground modes stop beat flow; background modes continue alongside it. Current checkpoint identity intentionally exposes only foreground modes, so background-mode visuals and lifecycle can be missed.

### Files

- New: `e2e_tests/agent/visualCheckpoint.ts`
- New: `e2e_tests/agent/visualCheckpoint.test.ts`
- `e2e_tests/agent/cli.ts`
- `e2e_tests/agent/DevBridge.ts`
- `e2e_tests/agent/GameAgent.ts`
- `e2e_tests/agent/playtestCompliance.ts`
- `e2e_tests/agent/playtestCompliance.test.ts`
- `docs/AGENT_TOOLKIT.md`

### Implementation

1. Extract checkpoint identity/reason calculation from `cli.ts` into pure functions.
2. Define checkpoint identity with separate fields:
   - Phaser scene key
   - Chapter scene index
   - Foreground mode id and beat index
   - Background mode id and beat index
3. Emit checkpoints for background-mode start and end/replacement.
4. Include `modeKind: "foreground" | "background" | null` and the relevant mode id in the checkpoint receipt.
5. Keep background checkpoints in visual QA review counts.
6. Pass only the foreground mode id into bypass-attempt tracking. A background checkpoint must not:
   - Mark a foreground mode active
   - Reset/fulfill a foreground input attempt
   - Permit `winmode`, `losemode`, or `skipbeat`
7. Add `activeModeBackground` to compact game state/observation output so Gemini can distinguish concurrent presentation from a blocking mode without another query.
8. Deduplicate unchanged identity. One background mode should not emit a checkpoint after every command.

### Tests

- Pure identity transitions: no mode → background start → background end.
- Foreground start/end remains unchanged.
- A background checkpoint requires visual review but never satisfies foreground bypass gates.
- Repeated observation of the same background mode emits no duplicate checkpoint.
- Fixture live run emits a background start checkpoint for `poolParty` and continues story flow.
- `changeScene` emits the expected background teardown/end transition.

### Acceptance criteria

- Background mode visual state is observable once without adding polling commands.
- `advance` still never returns `mode-active` solely because a background mode exists.
- Existing foreground-mode policy tests remain green.

---

## PR 3 — Capture passive visual-risk beats efficiently

### Why

`advance` can traverse camera pans, actor movement, chases, screen tints, actor visibility changes, and ledger feedback without stopping. Asking Gemini to poll `beats` before every `advance` would be slow and token-heavy.

### Files

- `src/game/ChapterScene.ts`
- `src/game/scene/BeatEngine.ts`
- `e2e_tests/agent/DevBridge.ts`
- `e2e_tests/helpers.ts`
- `e2e_tests/agent/cli.ts`
- `e2e_tests/agent/visualCheckpoint.ts`
- `e2e_tests/agent/visualCheckpoint.test.ts`
- `e2e_tests/agent/GameAgent.smoke.spec.ts`
- `docs/AGENT_TOOLKIT.md`

### Implementation, part A: lossless compact beat trace

1. Add a DEV-only, bounded beat-transition trace to `ChapterScene`.
2. Append `{sequence, beatIndex, beatType, sceneIndex, timestamp}` at the beginning of `BeatEngine.startBeat`.
3. Bound the buffer so a long chapter cannot grow it indefinitely; 256 entries is sufficient.
4. Expose only the structural trace fields through `DevBridge.ts`.
5. Have `advance` return a compact `visual_events` array containing only traversed risk types:
   - `cameraPan`
   - `moveActor`
   - `hideActor`
   - `showActor`
   - `chase`
   - `screenTint`
   - `ledger`
6. Do not include dialogue lines, minigame configs, or unrelated beat fields in this array.

### Implementation, part B: targeted frames

1. Extend `advanceUntil.onTick` info with beat type, background flag, and active-mode kind.
2. Let `reachWalkControl` accept an optional observational callback from `case "advance"`.
3. Capture at most one live frame per sustained visual-risk beat:
   - `cameraPan`
   - `moveActor`
   - `chase`
   - `screenTint`
4. Do not use frame stepping or timescale changes for these captures. They document the live transient state and must not perturb timing.
5. For instantaneous persistent changes (`hideActor`, `showActor`) and ledger feedback, take at most one post-advance frame if no scene/mode boundary checkpoint already covers the final state.
6. Collect multiple frames from the same `advance` into a contact sheet using the existing Jimp dependency:
   - Label each tile with beat index and type.
   - Use at most six tiles per sheet; create another sheet if needed.
   - Keep individual full-resolution source frames on disk for follow-up.
   - Emit one reviewable checkpoint per contact sheet, not one model-visible checkpoint per frame.
7. Store capture dedupe keys as `sceneIndex:beatIndex:beatType`.
8. If a beat is shorter than the polling interval and no live frame is captured, keep it in `visual_events` and mark the sheet/receipt `captureMissed: true`; do not claim it was visually verified.
9. Do not automatically create GIFs. The skill should request a scoped GIF only when a contact-sheet frame suggests a motion defect or when the chapter contains the Ch6 chase.

### Tests

- Beat trace preserves synchronous beats such as hide/show even when polling cannot see them.
- Trace buffer remains bounded.
- Only risk types appear in `visual_events`.
- Contact sheets are labeled, capped, and cite their source images.
- Duplicate ticks for the same beat produce one source frame.
- A scene/mode boundary suppresses a redundant post-advance frame.
- A missed short transient is reported as missed, not silently counted as reviewed.
- Fixture captures camera pan, tint, actor movement, hide/show, and ledger evidence.
- Ch6 smoke test captures chase evidence without changing chase duration or outcome.

### Acceptance criteria

- Gemini receives one compact image batch instead of several individual images for a passive sequence.
- No extra `beats`, `observe`, or screenshot commands are needed for ordinary passive-risk coverage.
- The game behaves identically with `--checkpoints` off.
- Production build contains no active playtest trace behavior.

---

## PR 4 — Track interaction and coverage honestly

### Why

The harness can prove that input happened, but it cannot know that Gemini understood a mechanic. It should expose compact facts and enforce only facts it can verify.

### Files

- `e2e_tests/agent/playtestCompliance.ts`
- `e2e_tests/agent/playtestCompliance.test.ts`
- `e2e_tests/agent/cli.ts`
- `e2e_tests/agent/playtestReport.ts`
- `e2e_tests/agent/playtestReport.test.ts`
- `e2e_tests/agent/verify-playtest-report.ts`

### Implementation

1. Add compact per-mode attempt summaries:
   - Mode id
   - Beat index
   - Foreground/background kind
   - Successful input command count
   - Distinct input categories (`keyboard`, `pointer`, `drag`)
   - Whether the mode ended naturally or was bypassed
2. Keep the existing generic bypass gate conservative. Do not invent a universal duration or input-count threshold that would misclassify one-drag or pointer-only modes.
3. Require at least one successful normal input before a foreground bypass, as today, and preserve the attempt summary in `session_summary`.
4. Track compact interactive coverage from runtime commands:
   - Unique scenes checkpointed/reviewed
   - Choice beat index and matched option text/index
   - Walk-target attempts and successes
   - Foreground/background modes observed
   - Natural mode ends versus bypasses
   - Terminal beat observed
   - Passive visual events captured/missed
5. Add this as `session_summary.coverage`; do not duplicate full transcript events.
6. Extend report verification to require the canonical coverage block to match the transcript.
7. Do not make `visual_qa.status: complete` mean semantic coverage. Preserve separate `visual_qa` and `coverage` fields.

### Tests

- Keyboard, pointer, and drag commands are categorized correctly.
- Background input never unlocks a foreground bypass.
- Natural and bypassed mode endings are distinct.
- Choice selections are attributed to the live choice beat.
- Coverage remains compact and deterministic.
- Hand-edited coverage in a report fails verification.
- A report cannot claim natural completion when a bypass occurred.

### Acceptance criteria

- A reviewer can tell what was exercised without rereading the full transcript.
- The session summary does not claim semantic understanding that the harness cannot prove.
- Added summary size remains small relative to the transcript.

---

## PR 5 — Rewrite the Gemini-facing skill and prompt

### Why this is last

Documentation must describe shipped behavior, not planned behavior.

### Files

- `.agents/skills/playtesting/SKILL.md`
- `.agents/skills/playtesting/prompt.md`
- `docs/AGENT_TOOLKIT.md`
- `e2e_tests/agent/skillDocSync.test.ts`
- `e2e_tests/agent/playtestReport.test.ts`

Do not add a README, changelog, or extra skill-side guide. Keep essential instructions in `SKILL.md`; keep the reusable assignment in `prompt.md`; keep full command details in `AGENT_TOOLKIT.md`.

### Required skill content

1. Replace “Three hard rules” with “Hard rules.”
2. Replace “whole toolbox” with “canonical playtest toolbox.”
3. Make `advance` the explicit control plane.
4. Remove the mandatory per-scene `observe --shot`; the automatic scene checkpoint is the scene-entry image.
5. Tell Gemini not to call `observe`/`diff` after a normal `advance` unless state is ambiguous or evidence is needed.
6. Add the selective evidence policy:
   - Checkpoint by default
   - `text` at choices/instruction ambiguity
   - `targets` at walk objectives
   - Annotation only after a suspected sprite/depth issue
   - Telemetry only after a suspected performance issue
   - Scoped GIF only for suspected motion bugs or the chase
   - No whole-session GIF by default
7. Define a meaningful mode attempt by core-loop/feedback coverage, not a universal time limit.
8. Distinguish foreground, background, `loseGoto`, boss, and external iframe lifecycle checks.
9. Use `savestate.branchSafe`; require a fresh run when branch restore is unsafe.
10. Define bounded choice coverage: follow unique content until convergence, a new interactive boundary, unique scene/mode, or termination; do not replay verified common content.
11. Define the bypass continuation policy: natural run blocked, optional downstream diagnostic continuation, never a natural completion claim.
12. Define terminal verification: terminal visual, one approximately 2.3-second wait, then completion transition.
13. Add the compact visual and friction checklists from the review.
14. Define P0–P3 severity.
15. Keep clear checkpoint notes to one concrete sentence. Longer clean-state narration is discouraged.
16. Keep the report as an index into evidence, not a narrative transcript.
17. Explicitly state which adjacent QA domains are out of scope.

### Prompt requirements

The reusable prompt should remain short. It should specify:

- Chapter title/id placeholders
- Canonical launch command and artifact paths
- One-command-at-a-time JSONL contract
- `advance` status lookup behavior
- Checkpoint review requirement
- Branch-safe behavior
- Honest bypass/blocked behavior
- Canonical report and verifier command

Do not copy the entire skill into the prompt.

### Documentation tests

Update `skillDocSync.test.ts` so it asserts:

- Every `ADVANCE_STATUS` remains documented.
- Background modes are described as non-blocking.
- Scene checkpoints replace duplicate per-scene `observe --shot`.
- `branchSafe`, compact mode attempt requirements, terminal wait, and coverage fields are documented.
- The prompt still uses canonical report/artifact paths.
- The prompt does not prescribe forbidden commands.

### Acceptance criteria

- `SKILL.md` is materially shorter or no longer than the current version despite the stronger guarantees.
- The prompt does not duplicate reference documentation.
- A Gemini run can route entirely from named receipts without guessing APIs.

---

## Validation matrix

Run validation after every PR; run the full matrix after PR 5.

### Static and unit validation

```bash
npm run lint
npm run lint:es
npm test
npm run agent:audit
npm run build
```

### Harness smoke validation

Start a fresh dev server on port 3324. After code changes, restart it rather than trusting hot reload.

```bash
npm run dev
```

In another terminal:

```bash
npm run agent -- --gauntlet --playtest-smoke
```

Also run the normal Playwright smoke suite relevant to `GameAgent` and the CLI.

### Required live chapters

1. **Playtest Fixture**
   - Choice branch and converge pattern
   - Walk target
   - Camera pan/tint/ledger/hide/show/move evidence
   - Foreground mode
   - Background mode
   - Scene transition
   - Boss fight
   - Natural terminal handoff
2. **Rockville Syndicate: Origins**
   - Multi-scene cinematic chapter
   - Many camera pans and tints
   - Repeated foreground/background `doubleCall`
   - Actor movement
   - Quiet ending
   - Confirms evidence batching actually saves model-visible images
3. **Cabin From Hell**
   - Re-registered background `cabinCollapse`
   - Multiple choices and speaker hunts
   - Screen tints
   - `loseGoto` survival mode
4. **Operation Ding Dong Ditch Ben**
   - Chase/motion evidence
   - Boss lifecycle

Do not use direct `mode`, `goto`, `eval`, or settings writes for these acceptance runs.

### Gemini 3.1 Pro forward test

Run one real Gemini 3.1 Pro session against the fixture and one against Origins using only the final reusable prompt and skill. Do not show Gemini this implementation plan or the expected results.

Record:

- Completion/integrity status
- Pending checkpoints
- Total commands
- Full `observe`/`diff` calls
- Model-visible image/contact-sheet count
- Duplicate scene-image count
- Transcript byte size as a rough token-cost proxy
- Findings with valid evidence
- Any guessed or rejected commands

Success targets:

- Zero guessed/unknown commands.
- Zero duplicate scene-entry screenshots.
- No routine `observe`/`diff` after successful `advance` receipts.
- Every emitted checkpoint reviewed.
- Every background mode represented in coverage.
- Fixture branch restores are identical when `branchSafe: true`.
- No natural completion claim after a bypass.
- Origins uses contact sheets/batched evidence rather than one model-visible image per passive visual beat.

If Gemini fails only because the skill was unclear, fix the skill. If it fails because the receipt lacks information or timing is fragile, fix the harness rather than adding polling instructions.

## Junior implementation guardrails

- Use `rg`/`rg --files` for discovery.
- Use `apply_patch` for edits.
- Do not import `src/game` or Phaser modules into Node-side CLI files.
- Avoid named helper functions inside `page.evaluate`; the esbuild `__name` transform can break them in the browser.
- Keep `syncCanvasToParent()` running every frame.
- Do not add camera bounds.
- Keep React side effects outside `setState` updater callbacks.
- Use `label()` for Phaser text.
- Use `screenSpace()` for fixed HUD layout; do not hand-roll zoom compensation.
- Identify collider objects by group membership, never callback argument position.
- Preserve user changes in the dirty worktree.
- Do not “fix” an observed chapter bug as part of the harness work. File it separately with evidence.

## Stop and ask for help when

- A required edit overlaps unexplained uncommitted work.
- Restoring branch state appears to require serializing arbitrary mode internals.
- A checkpoint capture changes game timing or outcome.
- The implementation needs a new persistent storage key.
- Background and foreground modes appear active simultaneously in a way the current single `activeMode` field cannot represent.
- A contact sheet is unreadable at Gemini’s supplied image resolution.
- The fixture passes but a real chapter exposes a new lifecycle not covered by the mode contract.

## Definition of done

This project is complete when:

- All five PRs/commits meet their acceptance criteria.
- The full validation matrix passes.
- The final skill and prompt describe only behavior that exists in the harness.
- The Gemini forward test completes the fixture and Origins without command guessing or duplicate routine evidence.
- `npm run agent:verify-report` passes for both forward-test reports.
- The review document’s high-priority issues are implemented or explicitly deferred with a reason and owner.
