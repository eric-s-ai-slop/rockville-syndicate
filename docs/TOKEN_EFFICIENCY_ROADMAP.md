# Coding-Agent Token Efficiency Roadmap

## Purpose

This document proposes the highest-return repository changes for reducing **Codex and Claude Code usage while developing the game**.

Gemini playtesting usage is intentionally excluded from the optimization target. The goal is not to minimize every model call in the repository; it is to maximize completed coding work per scarce coding-agent token.

The recommendations are deliberately conservative. A change belongs in the high-ROI package only when:

1. It should pay for itself within a realistic number of future development tasks.
2. It scales as chapters, modes, and source files are added.
3. It does not require rewriting the CLI for each new game unit.
4. It reduces repeated exploration, retries, cleanup tasks, or irrelevant context.
5. It builds on existing repository conventions rather than introducing a second architecture.

## Estimated baseline

Compared with the same codebase stripped of its agent-oriented structure, the repository is estimated to use roughly **30–40% fewer coding-agent tokens today**, with **~35%** as the central estimate.

That estimate is architectural rather than telemetry-derived. It reflects the current value of:

- `agent:map` routing before broad search.
- Compact focused validation through `agent:check`.
- Root and scoped agent guides.
- Chapter and mode scaffolders/templates.
- Data-driven chapter and mode architecture.
- Narrow scene subsystem contracts.
- Mechanized invariants and drift tests.

After the high-ROI package below, the expected range is approximately **40–50% fewer coding-agent tokens than a raw repository**, with **~45%** as the central target.

These percentages overlap and must not be added mechanically.

---

# Design requirements

## 1. New chapters and modes must have near-zero routing maintenance

Adding a chapter or mode must not require editing the context CLI itself.

The intended model is:

```text
Static architectural domains
  audio, combat, persistence, map, React bridge, validation, etc.

Dynamic game-unit resolvers
  chapter <id>
  mode <id>
  path <file>
```

The static context map remains useful for stable architectural domains. Chapter and mode routing should be derived from canonical registries and filesystem conventions.

## 2. One source of truth

Do not introduce an additional metadata file when the repository already contains the required information.

Prefer deriving context from:

- `CHAPTERS` and chapter imports.
- `listModeIds()` and the mode registry.
- Directory layout.
- Sibling test files.
- Nearest scoped `AGENTS.md`.
- Existing context-map domain data.

Only add adjacent machine-readable metadata after automatic discovery proves insufficient.

## 3. Fail closed through drift tests

Every registered chapter and mode should be resolvable automatically. A new registration that cannot be routed should fail a test rather than silently falling back to broad search.

## 4. Optimize repeated work, not theoretical minimum context

Preventing one entire cleanup or rediscovery task is more valuable than shaving a few hundred tokens from every instruction file.

---

# High-ROI package

## Priority 1 — Generic chapter, mode, and path context resolution

### Estimated incremental impact

**4–9 percentage points** of repo-wide savings.

### Why it matters

The existing context map is strong for architectural domains, but a generic `mode` or `chapter` target can still expose broader context than a localized task needs.

A task changing `doubleCall` should not begin from the entire mode registry, every registered mode, the generic template, and broad documentation. A task changing Chapter 11 should resolve directly to that chapter, its asset manifest, shared chapter contract, scoped instructions, and validation commands.

### Proposed CLI

```bash
npm run agent:map -- --target=chapter --id=cabin_from_hell_2025
npm run agent:map -- --target=mode --id=doubleCall
npm run agent:map -- --path=src/game/scene/AudioController.ts
```

### Chapter resolver behavior

Given a chapter ID, return:

- The exact chapter source file.
- `src/data/chapters/types.ts`.
- The nearest scoped agent guide.
- The shared chapter validation test.
- The matching chapter asset manifest, when present.
- Exact focused verification commands.
- Any mode IDs referenced by the chapter only as names, not all mode source files by default.

The resolver should derive the chapter source from the canonical chapter registry/imports. Registering a future chapter should automatically make it resolvable.

### Mode resolver behavior

Given a mode ID, return:

- The mode directory and primary entrypoint.
- Local sibling test files.
- `src/game/modes/types.ts`.
- The nearest scoped agent guide.
- Focused verification commands.
- Shared helpers imported by that mode only when they are direct local dependencies.

The resolver should derive supported IDs from `listModeIds()` and resolve source paths through registration imports and directory conventions.

### Path resolver behavior

Given a source path, return:

- The file itself.
- Nearest scoped `AGENTS.md`.
- Sibling or same-domain tests.
- A matching architectural context-map domain when one exists.
- Direct local contract files based on a small set of repository conventions.
- Focused verification commands.

This path mode serves ordinary files that are neither chapters nor modes.

### Scalability requirements

- No `switch` statement containing individual chapter IDs.
- No CLI changes when Chapter 13 or a new mode is registered.
- No hand-maintained context entry per chapter or mode.
- Unknown IDs fail with a compact list of valid IDs.
- Resolver output is deterministic JSON.
- Full repository search is never the normal fallback.

### Required tests

```typescript
describe('dynamic agent context discovery', () => {
  it('resolves every registered chapter', () => {
    for (const chapter of CHAPTERS) {
      expect(resolveChapterContext(chapter.id)).toBeTruthy();
    }
  });

  it('resolves every registered mode', () => {
    for (const modeId of listModeIds()) {
      expect(resolveModeContext(modeId)).toBeTruthy();
    }
  });
});
```

Also test:

- Unknown chapter and mode IDs.
- Fixture exclusion/handling.
- Missing local tests.
- Nearest scoped guide selection.
- Paths outside supported source roots.

### Expected cost

Approximately **3–8 focused development hours** if implemented conventionally, without AST dependency analysis.

### Explicit non-goal

Do not turn this into a full AST context compiler, embedding service, vector database, or MCP server.

---

## Priority 2 — Reject newly introduced warnings

### Estimated incremental impact

**2–5 percentage points** overall, mostly by eliminating separate cleanup tasks.

### Why it matters

An unused import or avoidable warning is cheap to fix in the session that introduced it. It is expensive when it becomes a separate agent task with a fresh startup, instruction load, repository inspection, validation cycle, and PR.

### Preferred implementation

If the current tree is warning-clean:

```json
{
  "scripts": {
    "lint:es": "eslint . --max-warnings=0"
  }
}
```

If pre-existing warnings remain, use a stable committed baseline or clean them once. Do not rely on an ignored per-checkout baseline as the long-term enforcement mechanism.

### Acceptance criteria

- A newly introduced unused import fails validation.
- A newly introduced warning fails CI or the compact agent check.
- Existing intentional warning exceptions remain narrowly scoped.
- The failure receipt points directly to the warning without dumping full logs.

### Expected cost

**15–60 minutes** if the tree is already clean.

---

## Priority 3 — Separate coding instructions from free playtesting instructions

### Estimated incremental impact

**2–4 percentage points** overall.

### Why it matters

The root guide is loaded broadly, while many commands and rules apply only to the playtesting harness. Since Gemini playtesting usage is not scarce, coding sessions should not carry detailed QA-harness procedure unless they are working in that area.

### Proposed instruction structure

```text
AGENTS.md                         universal coding guidance
CLAUDE.md                         Claude-compatible mirror/import
src/data/chapters/AGENTS.md       chapter authoring and validation
src/game/modes/AGENTS.md          mode contract and lifecycle
src/game/scene/AGENTS.md          subsystem ownership and contracts
src/components/AGENTS.md          React/Phaser bridge rules
e2e_tests/agent/AGENTS.md         playtesting and QA harness procedures
```

### Root guide should retain

- Stack and critical runtime versions.
- `agent:map` as the first routing step.
- Compact coding validation commands.
- Cross-cutting permanent invariants.
- Major directory ownership.
- Rules against broad exploration and unrelated refactors.

### Move out of root

- Detailed playtesting commands.
- Transcript/report workflow.
- Checkpoint and evidence procedures.
- Gauntlet-specific instructions.
- Session protocol details.

### New scene guide should emphasize

- New cohesive behavior belongs in a focused subsystem, not `ChapterScene`.
- Subsystems depend on narrow structural interfaces in `scene/contracts.ts`.
- Agents initially read the target subsystem, contract, and tests only.
- Generic map behavior and one-off hardcoded maps should remain separated.

### New components guide should emphasize

- `GameLayout` is a lifecycle host, not the default location for new logic.
- Callback-bearing state belongs in focused hooks.
- Never invoke Phaser callbacks inside React state updaters.
- Begin with the exact component/hook and focused tests.

### Maintenance requirement

Keep Codex and Claude instruction surfaces synchronized through imports where supported or a drift test. Do not manually maintain divergent copies.

### Expected cost

Approximately **1–3 hours**.

---

## Priority 4 — Replace blanket documentation updates with contract-based updates

### Estimated incremental impact

**1–3 percentage points** overall.

### Why it matters

A blanket requirement to consider several living documents can cause routine bug-fix agents to inspect long files that do not need to change.

### Proposed policy

Update only documentation whose contract changed:

- `AGENTS.md` / `CLAUDE.md`: agent operating rule or invariant changed.
- `ARCHITECTURE.md`: ownership, system boundary, or major data flow changed.
- `CONTRIBUTING.md`: contributor workflow or required checks changed.
- `README.md`: user-facing behavior, setup, or public inventory changed.
- `ROADMAP.md`: project priorities or planned work changed.
- Scoped guide: that directory's supported contract, registry, or recipe changed.

Ordinary bug fixes and internal refactors do not require blanket documentation edits.

### Keep the existing useful guards

- Every registered mode appears in the mode guide.
- Every Beat type appears in the chapter guide.
- Every registered chapter appears in the public chapter inventory.

### Expected cost

Under **1 hour**.

---

## Priority 5 — Reduce failed validation output

### Estimated incremental impact

**1–2 percentage points** overall, with larger savings during debugging-heavy tasks.

### Why it matters

The validation wrapper is already compact on success, but failures can still return a relatively large tail. Most failures are understandable from a much smaller stage-specific excerpt.

### Initial implementation

Use stage-specific limits before building parsers:

```typescript
const FAILURE_LIMITS = {
  typecheck: 20,
  eslint: 20,
  tests: 35,
  build: 25,
};
```

Always include:

- Stage name.
- Number of omitted lines/errors.
- Full log path.
- Exit code.

Example:

```text
stage=typecheck ok=false
TS2339 src/game/modes/example/index.ts:184:12 Property ...
7 additional errors omitted
full-log=agent-artifacts/check/typecheck.log
```

### Later enhancement condition

Only build structured TypeScript/ESLint/Vitest parsers after telemetry shows that failure output remains a meaningful cost.

### Expected cost

**15–45 minutes** for the first version.

---

## Priority 6 — Remove cheap dependency paths into giant host files

### Estimated incremental impact

**0.5–1.5 percentage points** overall.

### Why it matters

Small shared types currently owned by giant host files cause UI and mode tasks to navigate into those hosts even when no lifecycle behavior is relevant.

### First extraction

Move `StoryDialoguePayload` out of `ChapterScene.ts` into a small story bridge contract, for example:

```text
src/game/story/types.ts
```

Update React hooks, mode contracts, and the scene to import from that module.

### Second extraction

Move playtest-only snapshot interfaces out of `ChapterScene.ts` into a playtest contract module.

This is not intended to optimize free Gemini usage. It reduces irrelevant coding-agent navigation when editing the runtime host or consumers of those types.

### Expected cost

Approximately **1–2 hours**, including focused validation.

---

# Combined expected result

The high-ROI package is expected to move the repository from approximately:

```text
Current central estimate: ~35% savings versus a raw repo
```

To approximately:

```text
Post-package central estimate: ~45% savings versus a raw repo
Likely range: 40–50%
```

Equivalent development multiplier:

| Savings versus raw | Tokens needed for raw 100-token task | Development per fixed budget |
|---:|---:|---:|
| 40% | 60 | 1.67x |
| 45% | 55 | 1.82x |
| 50% | 50 | 2.00x |

This should be treated as an engineering hypothesis until measured.

---

# Measurement plan

Do not block the high-ROI changes on perfect telemetry, but add lightweight measurement before attempting lower-ROI infrastructure.

For each coding session, record where available:

- Provider/model.
- Input and output tokens.
- Cache-read/cache-write tokens.
- Tool output characters.
- Files and ranges read.
- Validation runs and failure-output size.
- Number of retries.
- Whether the task completed successfully.
- Task category: chapter, mode, scene, UI, tests, cross-cutting.

Benchmark several comparable real tasks before and after the package. Avoid synthetic microbenchmarks as the only evidence.

---

# Next tier: implement only during related work

These changes may have good long-term value, but they should not be standalone token-optimization projects unless the relevant code remains active.

## Narrow `BeatEngineContext`

Replace the concrete `ChapterScene` dependency with a focused structural interface. This should reduce context and make accidental coupling compiler-visible.

Do it when beat routing is next being modified.

## Extract the one-off neighborhood implementation from `MapBuilder`

Separate the generic map interpreter from bespoke neighborhood geometry. Do it during the next substantial map-system change.

## Extract cohesive `ChapterScene` sections

Best candidates:

- Asset loading and boot preparation.
- Player damage and status handling.
- Scene transitions and teardown.

Never create a mega-task whose goal is only to reduce the file to an arbitrary line count.

## Extract `GameLayout` lifecycle hooks

Potential hooks:

- `usePhaserChapterHost`.
- `useChapterCompletion`.

Do this during future React/Phaser bridge work.

## Split giant modes or chapters only while active

A large completed chapter has little ongoing token cost. A large actively edited mode may benefit substantially from variant-local files.

---

# Explicitly rejected for now

## MCP server for local repository development

The repository already has useful CLI interfaces. Wrapping them in MCP does not inherently compress context and may add tool-schema overhead.

## Full AST context compiler

The dynamic convention-based resolver should be implemented and measured first. A full compiler is justified only if agents continue reading broad files despite precise routing.

## Embeddings or vector database

The codebase has strong canonical registries and directory conventions. Semantic retrieval infrastructure is excessive for the current problem.

## Declarative boss/behavior engine solely for token savings

This may be valuable as a game-design feature, but its implementation cost is too high to justify only as an agent-context optimization.

## Global strict-mode migration solely for token savings

Potential correctness benefits do not make it a high-ROI context project.

## Splitting every medium-sized file

Cohesion matters more than line count. Focused 200–300 line subsystems are already good agent boundaries.

---

# Recommended implementation order

## Phase 1 — Same-day safeguards

1. Reject newly introduced warnings.
2. Reduce failure-output tails.
3. Adopt contract-based documentation updates.
4. Move shared story/playtest types out of `ChapterScene`.

## Phase 2 — Instruction scoping

5. Make root instructions coding-focused.
6. Move playtesting procedure under `e2e_tests/agent/`.
7. Add focused scene and components guides.
8. Add synchronization/drift protection for Codex and Claude guides.

## Phase 3 — Scalable context resolution

9. Add dynamic chapter resolution.
10. Add dynamic mode resolution.
11. Add generic path resolution.
12. Add coverage proving every registered chapter and mode resolves automatically.

## Stop condition

After Phase 3, measure real tasks before building any additional context infrastructure.

The target is not the smallest theoretically possible prompt. The target is the highest amount of correct game development per unit of scarce Codex/Claude usage.
