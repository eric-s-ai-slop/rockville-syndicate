# Agent Tooling Implementation Specification

Implementation-ready improvements for making repository tasks faster, cheaper,
and easier to verify. This document is a backlog and contract, not evidence that
an item has shipped.

## Goals

- Reproduce localized defects without replaying an entire chapter.
- Keep diagnostic evidence visibly and mechanically distinct from natural
  full-chapter playtest evidence.
- Make visual evidence self-describing and auditable from disk.
- Keep terminal output compact without hiding actionable failures.
- Prefer focused validation during iteration and a compact final receipt at
  handoff.
- Catch invalid chapter/map configuration before runtime.

## Non-goals and safety boundary

- Do not weaken `--playtest`. It continues to block `goto`, direct mode launch,
  injected beats, arbitrary state mutation, and multi-beat skips.
- A diagnostic run cannot produce `completion_status: "verified"`, natural
  playtest completion, or full-chapter coverage.
- A screenshot alone is not proof that a behavior completed correctly. Evidence
  must retain the command, runtime location, and review verdict that produced it.
- Do not add another persistence mechanism. Runtime and reusable save behavior
  must continue through the existing playtest snapshot bridge and
  `src/game/settings.ts` contracts.
- Do not edit `battleiq/` or `public/minigames/battleiq/` as part of this work.

## Existing baseline (do not rebuild)

The repository already has the following capabilities:

- The `omega-agent-v1` JSONL command envelope with `cmd_id`, `accepted`, and one
  correlated `completed` or `failed` receipt.
- Serial command handling documented in `docs/AGENT_TOOLKIT.md`.
- `goto <sceneIndex>` in normal debug sessions and a central `--playtest` policy
  that rejects it.
- Stabilized screenshots for automatic scene/mode checkpoints.
- Passive-source frames and bounded contact sheets for passive visual events.
- Checkpoint review receipts and explicit `clear`, `issue-found`, and
  `inconclusive` review verdicts.
- File saves containing `branchSafe` and `unsafeReasons`, with unsafe restores
  rejected.
- `advance`, `walkto`, checkpoint review, restart, and report write/verify
  commands.
- Focused `npm run agent:check -- <changed-file...>` selection and the compact
  full `npm run check:agent` gate.

New work must extend these contracts instead of introducing parallel command,
evidence, save, or report systems.

## Terminology

- **Natural playtest**: a run started with `--playtest` that reaches the terminal
  beat through allowed gameplay and satisfies the current integrity, coverage,
  and visual-QA gates.
- **Targeted diagnostic**: a non-completion run that may use controlled scene or
  beat navigation to investigate a named defect.
- **Checkpoint**: one captured rendered state plus its manifest metadata.
- **Settled**: the capture was taken after the runtime met the stabilization
  contract below; it does not mean the reviewed state is correct.
- **Finding status**:
  - `bug-reproduced`: observed behavior matches the defect being investigated.
  - `not-reproduced`: the defined reproduction was executed, but the defect was
    not observed.
  - `not-verified`: required reproduction steps or evidence were not completed.
  - `inconclusive`: evidence was collected, but it cannot distinguish correct
    behavior from the defect.

`not-reproduced` must never be inferred from a missing screenshot, timeout,
failed command, or incomplete reproduction; those are `not-verified` or
`inconclusive`.

## 1. Targeted diagnostic mode

### CLI contract

Add a `--diagnostic` session flag. It is mutually exclusive with `--playtest`
and `--playtest-smoke`. Starting it requires `--chapter <id-or-title>`.

Supported navigation commands:

```text
goto scene <sceneIndex>
goto beat <beatIndex>
goto beat <beatId>
goto scene <sceneIndex> beat <beatIndex-or-id>
```

Keep legacy `goto <sceneIndex>` as an alias for `goto scene <sceneIndex>` and
mark the alias in help text; do not silently change its meaning.

Navigation rules:

1. Scene and beat indexes are zero-based, matching runtime state.
2. A beat ID resolves only against the selected chapter's canonical beat list.
3. An ambiguous or missing ID fails without changing runtime state.
4. `goto beat` starts the target beat through the existing chapter/beat engine;
   it must not duplicate beat side-effect logic in the CLI.
5. The command receipt returns the resolved chapter ID, scene index, beat index,
   beat ID when present, beat type, and any prerequisite-state warning.
6. Navigation clears stale checkpoint transition state before the next capture.
7. Direct mode launch and arbitrary mutation remain debug-only and are not made
   part of the diagnostic workflow.

If a beat depends on earlier mutations that cannot be reconstructed safely, the
command must either restore a compatible branch-safe snapshot or fail with
`DIAGNOSTIC_PREREQUISITE_UNAVAILABLE`. It must not pretend that a bare jump is a
faithful reproduction.

### Session and evidence labeling

Every diagnostic lifecycle receipt, checkpoint manifest, finding, transcript,
and generated report must contain:

```ts
evidenceClass: 'targeted-diagnostic';
completionEligible: false;
```

Diagnostic session summaries use:

```ts
completion_status: 'targeted-diagnostic';
playtest_integrity: 'not-applicable';
```

The playtest report verifier must reject a report that claims `COMPLETED` or
embeds natural-playtest evidence while its transcript or referenced checkpoints
are diagnostic.

### Acceptance criteria

- Scene and beat navigation resolve valid targets and reject invalid targets
  without partial mutation.
- `--diagnostic --playtest` fails during argument parsing.
- All diagnostic screenshots and reports are mechanically identifiable.
- No diagnostic run can satisfy the existing playtest completion verdict.
- Unit tests cover numeric targets, ID targets, ambiguity, missing targets,
  unsafe prerequisites, and the playtest policy boundary.

## 2. Checkpoint manifest and settled capture

### One manifest per checkpoint

Write `<checkpoint-basename>.json` beside every automatic checkpoint PNG and
passive contact sheet. Use a versioned schema:

```ts
interface CheckpointManifestV1 {
  schema: 'omega-checkpoint-v1';
  checkpointId: number;
  evidenceClass: 'natural-playtest' | 'targeted-diagnostic' | 'debug';
  completionEligible: boolean;
  commandId: string | null;
  imagePath: string; // absolute, normalized path
  sourceFramePaths: string[]; // absolute paths; empty for a single image
  capturedAt: string; // ISO-8601 UTC
  chapter: { id: string; title: string };
  scene: { index: number; name: string | null; key: string | null };
  beat: { index: number | null; id: string | null; type: string | null };
  player: { x: number; y: number } | null;
  camera: {
    scrollX: number;
    scrollY: number;
    zoom: number;
    width: number;
    height: number;
    followTarget: { kind: 'player' | 'actor' | 'other'; id: string | null } | null;
  } | null;
  map: { theme: string | null; noNatureScatter: boolean; bounds: Rect | null };
  mode: { id: string; kind: 'foreground' | 'background'; beatIndex: number | null } | null;
  trigger: { reason: string; reasons: string[]; transitions: unknown[] };
  settling: {
    strategy: 'phaser-stable-frames-v1';
    framesObserved: number;
    elapsedMs: number;
    timedOut: boolean;
  };
}

interface Rect { x: number; y: number; width: number; height: number }
```

Use canonical scene names from chapter configuration. If no configured name
exists, store `null`; do not invent a human-readable name from report prose.

### Stabilization contract

Replace the implicit “step five frames” meaning with one shared capture helper:

1. Wait at least two animation frames after the transition is detected.
2. Sample player position, camera scroll/zoom, active mode identity, and active
   tween count on each frame.
3. Capture after two consecutive samples are equal within documented numeric
   tolerances and the active tween count is zero.
4. Stop waiting after 750 ms by default.
5. On timeout, still capture, set `settling.timedOut: true`, and make the receipt
   visually reviewable but `inconclusive` by default.

Camera pans, chases, and intentionally continuous animation must use an explicit
effect-specific capture point or passive-source strategy; they must not wait
forever for a globally motionless scene.

### Contact sheets

- Retain every full-resolution source image.
- Limit sheets to six tiles, preserving current behavior.
- Label each tile with checkpoint ID or source-frame label, scene/beat indexes,
  and capture time.
- Emit a manifest for the sheet and retain all `sourceFramePaths`.
- Add a checkpoint contact sheet for a completed session in addition to the
  existing passive-source sheets.

### Acceptance criteria

- Every successful automatic checkpoint points to an existing PNG and manifest.
- Every manifest validates against the versioned schema.
- Scene, beat, player, camera, map, and mode values match a same-frame runtime
  probe.
- Settling timeouts are explicit and cannot silently support a `clear` verdict.
- Tests cover normal settling, timeout, continuous motion, and missing player or
  camera state.

## 3. Report audit and finding verdicts

### Command

Add:

```bash
npm run agent:qa-audit -- <report.md> [session.jsonl]
```

If the transcript path is omitted, resolve it only from the report's canonical
evidence block. Never search the filesystem heuristically.

This command extends `agent:verify-report`; share parsing and validation code.
`agent:verify-report` may remain as a compatibility alias or narrower wrapper.

### Audit checks

The audit exits nonzero if any of the following is true:

- The report, transcript, checkpoint, manifest, or source-frame path is missing.
- A referenced artifact path differs after absolute-path normalization.
- A checkpoint ID is missing, duplicated with conflicting content, or reviewed
  without having been captured.
- A command ID referenced by evidence has no correlated terminal receipt.
- Chapter ID, scene index/name, beat index/type, or mode differs between report,
  transcript, and manifest.
- A report claims a finding verdict not supported by command/evidence state.
- `issue-found` lacks a linked open finding.
- A settled capture timed out but is reported as conclusively clear without
  later conclusive evidence.
- Diagnostic evidence is used to claim natural completion.

The compact success receipt is one JSON object:

```json
{"cmd":"qa-audit","ok":true,"report":"/abs/report.md","transcript":"/abs/session.jsonl","checkpoints":8,"findings":1,"warnings":0}
```

Failure output includes a bounded `errors` array of structured entries with
`code`, `message`, and relevant paths/IDs. Default output shows at most 20
errors; `--verbose` shows all.

Reports must state one investigation verdict: `bug-reproduced`,
`not-reproduced`, `not-verified`, or `inconclusive`. This investigation verdict
is separate from checkpoint review verdicts and playtest completion status.

## 4. Command ergonomics and diagnostics

### Compact output

- JSONL remains the default machine-readable format.
- Human-oriented scripts emit one compact summary by default.
- `--verbose` adds raw logs and full error collections; it never changes
  validation behavior.
- Bound arrays included in receipts and add `{shown,total,truncated}` metadata
  whenever entries are omitted.
- Preserve full raw execution in `--transcript`; output compaction must not
  truncate the durable trace.

The protocol already serializes commands. Add an integration test that writes a
second JSON command before the first terminal receipt and expects a stable
`COMMAND_IN_FLIGHT` rejection. Legacy interactive input may queue at most one
line or use the same rejection policy; document the selected behavior.

### Reusable navigation helper

Add a diagnostic-only command:

```text
advance-to scene <sceneIndex> [beat <beatIndex-or-id>]
```

It reuses `advance`, choice stopping, real key-driven `walkto`, checkpoint
review blocking, and named terminal statuses. It must:

- stop before selecting a choice unless an explicit option is supplied;
- stop before bypassing a failed walk target or foreground mode;
- stop at the requested canonical target and emit a final state receipt;
- include every internally executed command/result in the transcript;
- never be enabled in `--playtest` until its natural-input behavior independently
  satisfies all existing policy and coverage rules.

### Camera diagnostics

Extend `state`, `observe`, `advance` timeout diagnostics, and checkpoint manifests
with:

```ts
camera: {
  followActive: boolean;
  followTarget: { kind: string; id: string | null } | null;
  scrollX: number;
  scrollY: number;
  zoom: number;
  viewport: { width: number; height: number };
  worldView: Rect;
  effectiveViewport: Rect; // world-space visible rectangle after zoom
}
```

Do not set camera bounds to obtain these values.

### Screenshot failures

Screenshot/evidence failures return structured fields:

```ts
{
  code: 'SCREENSHOT_WRITE_FAILED' | 'SCREENSHOT_DECODE_FAILED' | 'MIME_MISMATCH' | 'ARTIFACT_NOT_FOUND';
  message: string;
  path: string | null;
  expectedMime: 'image/png';
  actualMime: string | null;
  remediation: string;
}
```

Error messages must distinguish browser capture failure, filesystem write
failure, missing file, decode failure, and wrong content type.

## 5. Validation workflow

### AGENTS.md recipe

Add this compact workflow after the tooling exists:

```text
Localized defect:
1. Map the affected domain with agent:map.
2. Start --diagnostic for the named chapter.
3. Navigate to the nearest safe scene/beat boundary.
4. Execute the exact reproduction and assign one investigation verdict.
5. Run agent:qa-audit on the report.
6. Run agent:check for changed files.

Full chapter claim:
Use --playtest --repl --checkpoints from chapter start. Diagnostic evidence
cannot replace this run.
```

### Branch-safe save reuse

Automatic reuse is opt-in with `--reuse-safe-save <file-or-directory>`.

A save is reusable only when all of these match:

- schema version and game build fingerprint;
- chapter ID and chapter-content fingerprint;
- selected scene and beat boundary;
- viewport dimensions and deterministic seed when relevant;
- `branchSafe: true` and an empty `unsafeReasons` array.

On any mismatch, reject reuse with `SAVE_INCOMPATIBLE` and list the mismatched
fields. Never fall back to loading an incompatible save. File saves remain
audited in playtest mode and do not erase earlier coverage obligations.

### Final compact validation receipt

Add a wrapper, or extend `agent:check`, to emit:

```ts
interface ValidationReceiptV1 {
  schema: 'omega-validation-receipt-v1';
  ok: boolean;
  changedFiles: string[];
  checks: Array<{
    name: 'typecheck' | 'eslint' | 'boundaries' | 'focused-tests' | 'build' | 'report-audit' | 'visual-evidence';
    status: 'passed' | 'failed' | 'skipped';
    durationMs: number;
    reason?: string;
  }>;
  warnings: {
    preExisting: string[];
    introduced: string[];
  };
}
```

`skipped` requires a reason and must not be rendered as success. Warning
classification requires a stored baseline from the start of the command; do
not classify warnings from memory or prose.

### Vite restart/check

Add `npm run agent:restart-check` that:

1. verifies whether port 3324 belongs to this workspace's server;
2. stops only that verified process;
3. starts `npm run dev` with a bounded log file;
4. waits for the health URL and dev bridge;
5. reports PID, URL, elapsed time, and a compact failure tail.

It must refuse to kill an unverified process on port 3324.

## 6. Content and map authoring validation

Add pure declarative tests or validation rules for every chapter scene:

- `map.theme` is a known theme.
- Indoor and void themes do not receive procedural outdoor nature scatter.
- `noNatureScatter` is respected and intentionally set on exceptional maps.
- Player spawn, walk targets, and camera-pan targets are finite and inside the
  declared map bounds unless explicitly marked as an allowed exterior target.
- Room bounds have positive dimensions and intersect the map.
- Canonical scene names are unique within a chapter and match names used by
  checkpoint/report validation.

Do not encode “indoor” by guessing from chapter prose. Define one canonical
theme-capability table near map construction, for example:

```ts
themeCapabilities[theme] = {
  environment: 'outdoor' | 'indoor' | 'void';
  allowsNatureScatter: boolean;
};
```

`MapBuilder` and validation tests must consume the same table.

For intentional exterior composition, add declarative metadata rather than a
test-name allowlist:

```ts
composition?: {
  allowPlayerOutsideRoom?: boolean;
  focusRect?: Rect;
};
```

A focused composition test should compute the configured camera's effective
world-space viewport and assert that the player plus `focusRect`/landmark are
visible at scene entry. It must not introduce main-camera bounds.

## 7. Implementation slices

Implement in independently reviewable slices:

1. **Evidence schema and audit foundation** — manifest types/writer, same-frame
   runtime probe, `qa-audit`, and compatibility with existing report commands.
2. **Diagnostic mode** — flag boundary, scene/beat target resolver, labeling,
   summaries, and policy tests.
3. **Settled visual evidence** — shared stabilization helper, checkpoint and
   passive manifests, checkpoint contact sheet, structured capture failures.
4. **Runtime ergonomics** — camera diagnostics, in-flight rejection, compact
   output limits, and `advance-to`.
5. **Validation orchestration** — save compatibility, final receipt,
   pre-existing warning baseline, restart/check command, and AGENTS.md recipe.
6. **Declarative map validation** — shared theme capabilities, bounds/target
   checks, and intentional composition metadata/tests.

Each slice should update `docs/AGENT_TOOLKIT.md`, CLI `--help`, relevant tests,
and `npm run agent:map -- --target=playtesting|validation` routing when its
entrypoints change.

## 8. Definition of done

An item is complete only when:

- Its public TypeScript/JSONL contract is versioned or backward compatible.
- Unit tests cover success, invalid input, and policy boundary cases.
- At least one integration test exercises the real CLI receipt path.
- Help and `docs/AGENT_TOOLKIT.md` agree with runtime behavior.
- `npm run agent:check -- <changed-files...>` passes during iteration.
- `npm test -- e2e_tests/agent`, `npm run lint`, and `npm run lint:es` pass for
  final handoff; run the production build when the selected validation map or
  touched code requires it.
- Generated QA artifacts and unrelated worktree changes are excluded from
  default diagnostic output.
- A diagnostic artifact cannot be mistaken for natural completion evidence by
  either a human reader or the automated report audit.
