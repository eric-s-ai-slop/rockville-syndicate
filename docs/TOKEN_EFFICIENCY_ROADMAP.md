# Maintainable Coding-Agent Token Efficiency Roadmap

## Purpose

This document proposes the highest-return repository changes for reducing **Codex and Claude Code usage while developing the game** without turning the repository into an agent-infrastructure project.

Gemini playtesting usage is intentionally excluded from the optimization target. The goal is to maximize correct coding work per scarce coding-agent token while keeping the game understandable to a human developer.

## Core rule

> Every token-efficiency change must reduce or reuse existing complexity. A change that introduces a new source of truth, framework, service, or per-unit maintenance burden is rejected unless measured usage data proves that simpler options are insufficient.

A human who does not understand the token-efficiency tooling must still be able to add a chapter, add a mode, debug the game, and run validation through the ordinary repository workflow.

---

# Expected result

Compared with the same codebase stripped of its existing agent-oriented structure, the repository is estimated to use approximately:

```text
Current central estimate: ~35% fewer coding-agent tokens
Current likely range:     30–40%
```

After the maintainable high-ROI package in this document:

```text
Expected central result: ~45% fewer coding-agent tokens
Expected likely range:   42–47%
Strong result:           approximately 50%
```

Equivalent development multiplier:

| Savings versus raw repo | Tokens needed for a raw 100-token task | Development per fixed budget |
|---:|---:|---:|
| 42% | 58 | 1.72x |
| 45% | 55 | 1.82x |
| 47% | 53 | 1.89x |
| 50% | 50 | 2.00x |

These are architecture-based estimates, not measured telemetry. The effects overlap and must not be added mechanically.

Relative to the repository today, the package is expected to provide roughly:

- **12–18% fewer coding-agent tokens** for comparable work.
- **15–22% more completed development** from the same coding-agent budget.

The package deliberately gives up speculative savings that would require AST infrastructure, vector retrieval, MCP wrappers, per-unit metadata, or broad rewrites.

---

# Admission criteria

A proposed optimization belongs in this roadmap only when all of the following are true:

1. It should pay for itself within a realistic number of future development tasks.
2. It scales automatically when chapters, modes, and source files are added.
3. It does not require rewriting the CLI for each new game unit.
4. It reduces repeated exploration, retries, cleanup tasks, or irrelevant context.
5. It builds on canonical registries, directory structure, tests, and existing commands.
6. It remains useful to a human developer rather than existing only for an agent.
7. It has a clear deletion path if measurement shows no benefit.

---

# Maintainability constraints

## One source of truth

Do not create agent metadata that duplicates information already present in:

- `CHAPTERS` and chapter imports.
- `listModeIds()` and the mode registry.
- Directory layout.
- Sibling tests.
- Nearest scoped `AGENTS.md`.
- Existing context-map domain data.

Adjacent metadata files are a last resort, not the default design.

## No hidden intelligence

Routing must be deterministic and inspectable. Do not use:

- AI-generated summaries.
- Confidence scores.
- Embeddings or vector search.
- Hidden broad-search fallback.
- Network services.
- A background daemon.
- Generated caches that become another source of truth.

## Small complexity budget

The dynamic resolver must remain a small repository utility, not a framework.

Expected shape:

```text
e2e_tests/agent/context-map.ts
e2e_tests/agent/context-map-data.ts
e2e_tests/agent/context-map.json
e2e_tests/agent/context-resolvers/
  chapter.ts
  mode.ts
  path.ts
src/agentContextMap.test.ts
```

Requirements:

- No new runtime dependency.
- No database.
- No plugin framework.
- No chapter-specific or mode-specific branches.
- One deterministic JSON output format.
- Explicit failure when discovery is impossible.
- A human should be able to read the resolver implementation in one sitting.

## Instruction-file budget

Do not add `AGENTS.md` files everywhere.

A scoped guide is justified only when a directory has at least three durable rules that cannot be cheaply enforced through types, tests, lint, or code structure.

Keep scoped guides concise. They should state ownership, invariants, and validation—not narrate every file or method.

## Cohesion before file size

Do not split a file merely because it is large. Extract only when a section has:

- A clear responsibility.
- A narrow input/output contract.
- Minimal shared mutable state.
- Independent or focused tests.
- A name a human would naturally search for.

Avoid tiny forwarding classes, wrapper-only interfaces, and five files that must always be read together.

---

# Maintainable high-ROI package

## Priority 1 — Generic chapter, mode, and path context resolution

### Expected incremental impact

**Approximately 4–7 percentage points** of repo-wide savings.

The upper estimate is lower than a generalized retrieval system because maintainability is a hard constraint. Most of the practical value should still be retained.

### Proposed interface

```bash
npm run agent:map -- --target=chapter --id=<chapter-id>
npm run agent:map -- --target=mode --id=<mode-id>
npm run agent:map -- --path=<source-file>
```

### Chapter resolution

Given a chapter ID, return only:

- Exact chapter source file.
- Shared chapter contract.
- Nearest scoped guide.
- Shared chapter validation test.
- Matching asset manifest when discoverable by convention.
- Exact focused verification commands.
- Referenced mode IDs as names, without loading every mode implementation.

The chapter must be discovered from the canonical registry and imports. Adding a registered future chapter must automatically make it resolvable.

### Mode resolution

Given a mode ID, return only:

- Mode directory and primary entrypoint.
- Local sibling tests.
- Shared mode contract.
- Nearest scoped guide.
- Focused verification commands.
- Direct local helpers when discoverable without generalized dependency analysis.

Supported IDs must come from the existing mode registry.

### Path resolution

Given a source path, return only:

- The requested file.
- Nearest scoped guide.
- Sibling or same-domain tests discovered by convention.
- Matching static architectural domain, when one exists.
- Focused verification commands.

Do not build a general dependency graph. When conventions are insufficient, return a compact explicit limitation rather than silently reading the repository broadly.

### Acceptance criteria

- Adding a registered chapter requires no resolver code change.
- Adding a registered mode requires no resolver code change.
- No per-chapter or per-mode context-map entry exists.
- No `switch` contains individual game-unit IDs.
- Every registered chapter and mode is covered by a drift test.
- Unknown IDs fail with a compact valid-ID list.
- Output is deterministic JSON.
- No new dependency or service is introduced.

### Stop condition

If the maintainable implementation begins requiring AST traversal, metadata schemas, caching, ranking, or plugin abstractions, stop and ship the simpler resolver first.

---

## Priority 2 — Reject newly introduced warnings

### Expected incremental impact

**Approximately 2–4 percentage points**, mostly by eliminating entire future cleanup sessions.

### Implementation

When the tree is warning-clean:

```bash
eslint . --max-warnings=0
```

If legacy warnings remain, use a deterministic committed baseline or clean them once. Do not use an ignored checkout-local baseline as the permanent design.

### Acceptance criteria

- New unused imports fail the task that introduces them.
- New warnings fail compact validation and CI.
- Intentional exceptions are narrowly scoped.
- Failure output points directly to the warning.

This is a quality gate, not new architecture.

---

## Priority 3 — Separate coding instructions from playtesting instructions

### Expected incremental impact

**Approximately 1–3 percentage points**.

### Intended structure

```text
AGENTS.md                         universal coding rules
CLAUDE.md                         synchronized Claude surface
src/data/chapters/AGENTS.md       chapter contract
src/game/modes/AGENTS.md          mode contract
src/game/scene/AGENTS.md          scene ownership and boundaries
src/components/AGENTS.md          React/Phaser bridge rules
e2e_tests/agent/AGENTS.md         playtesting and QA procedure
```

### Constraints

- Move content; do not duplicate it.
- Add no more scoped guides without the durable-rule test.
- Keep Codex and Claude surfaces synchronized through an import mechanism where supported or a drift test.
- Prefer types and tests over prose whenever a rule can be mechanized.

The root guide should retain only stack facts, routing, coding validation, cross-cutting invariants, directory ownership, and rules against broad unrelated work.

---

## Priority 4 — Contract-based documentation updates

### Expected incremental impact

**Approximately 1–2 percentage points** while reducing maintenance burden.

Update only the document whose contract changed:

- `AGENTS.md` / `CLAUDE.md`: agent rule or invariant.
- `ARCHITECTURE.md`: ownership, boundary, or major data flow.
- `CONTRIBUTING.md`: contributor workflow or required checks.
- `README.md`: user-facing behavior, setup, or public inventory.
- `ROADMAP.md`: future priorities.
- Scoped guide: that directory's durable contract.

Routine bug fixes and internal refactors do not require blanket documentation inspection or edits.

Keep automated drift tests for machine-checkable inventories.

---

## Priority 5 — Reduce failed validation output

### Expected incremental impact

**Approximately 0.5–1.5 percentage points**, with larger local savings during failure-heavy tasks.

Start with simple stage-specific line caps:

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
- Exit code.
- Omitted-line or omitted-error count.
- Full log path.

Do not build tool-specific parsers until measurement proves line caps insufficient.

---

## Priority 6 — Move cheap shared contracts out of giant hosts

### Expected incremental impact

**Approximately 0.5–1 percentage point**.

Move shared bridge types such as `StoryDialoguePayload` out of `ChapterScene.ts` into a small domain-owned contract, for example:

```text
src/game/story/types.ts
```

Move playtest-only snapshot interfaces into a playtest contract module.

This is ordinary dependency cleanup. Do not use it as an excuse for a broad `ChapterScene` rewrite.

---

# Combined expected result

The maintainable package is expected to move the repository from:

```text
Current: approximately 30–40% savings
Central estimate: approximately 35%
```

To:

```text
Maintainable optimized range: approximately 42–47%
Central target: approximately 45%
Strong measured result: approximately 50%
```

Expected task-level savings versus a raw equivalent repository:

| Task type | Expected savings after package |
|---|---:|
| Add or modify a chapter | 50–65% |
| Add or modify a mode | 40–55% |
| Local subsystem change | 35–50% |
| Add focused tests | 30–45% |
| React/Phaser cross-cutting work | 15–30% |
| Unknown architecture-wide bug | 10–25% |

These ranges are directional and should be replaced by measured data when available.

---

# Secondary work: only during related feature development

These changes can improve local context and maintainability, but should not become standalone token-optimization projects.

## Narrow `BeatEngineContext`

Replace the concrete `ChapterScene` dependency with a focused structural interface when beat routing is next modified. Reject the extraction if the interface simply mirrors most of `ChapterScene`.

## Separate bespoke neighborhood construction

Move one-off neighborhood geometry out of the generic map builder during the next substantial map-system change.

## Extract cohesive `ChapterScene` responsibilities

Potential candidates:

- Asset loading and boot preparation.
- Player damage and status handling.
- Scene transitions and teardown.

Each extraction must have real ownership and reduce coupling. Never create a mega-refactor whose goal is an arbitrary line count.

## Extract `GameLayout` lifecycle hooks

Potential candidates:

- `usePhaserChapterHost`.
- `useChapterCompletion`.

Do this only during future React/Phaser bridge work.

## Split giant modes or chapters only while active

A completed large chapter has little ongoing token cost. Split only when future changes repeatedly require reading unrelated variants or sections.

---

# Explicitly rejected for now

Do not build these solely for token savings:

- MCP wrapper around the existing local CLI.
- Full AST dependency/context compiler.
- Embeddings or vector database.
- Resolver plugin framework.
- Per-chapter or per-mode metadata files.
- AI-generated source summaries.
- Confidence or ranking system.
- Background daemon or service.
- Declarative boss/behavior engine.
- Global strict-mode migration.
- Broad `ChapterScene` rewrite.
- Splitting every medium-sized file.
- `AGENTS.md` in every directory.

These may have separate product benefits, but their token-efficiency payback is weak or uncertain under the maintainability constraint.

---

# Implementation order

## Phase 1 — Simplifying safeguards

1. Reject newly introduced warnings.
2. Reduce failed-check tails.
3. Adopt contract-based documentation updates.
4. Move shared story/playtest types out of `ChapterScene`.

## Phase 2 — Instruction scoping

5. Make root instructions coding-focused.
6. Move playtesting procedure under `e2e_tests/agent/`.
7. Add concise scene and components guides only after applying the durable-rule test.
8. Add synchronization protection for Codex and Claude instruction surfaces.

## Phase 3 — Boring scalable routing

9. Add generic chapter resolution.
10. Add generic mode resolution.
11. Add convention-based path resolution.
12. Add tests proving every registered chapter and mode resolves automatically.

## Stop condition

After Phase 3, measure real tasks before building any additional context infrastructure.

Do not continue optimizing merely because a theoretical percentage remains available.

---

# Measurement plan

Use lightweight telemetry when the provider or tool makes it available:

- Provider and model.
- Input/output tokens.
- Cache-read/cache-write tokens.
- Tool-output characters.
- Files and ranges read.
- Validation runs and failure-output size.
- Retry count.
- Task category.
- Whether the task completed successfully.

Compare several real chapter, mode, subsystem, UI, and cross-cutting tasks before and after implementation. Do not rely solely on synthetic microbenchmarks.

The central estimate should be revised downward or upward based on actual usage.

---

# Final maintainability test

Before merging any implementation PR based on this roadmap, ask:

1. Did this remove, reuse, or merely add complexity?
2. Is there a new source of truth?
3. Does adding a chapter or mode create new maintenance work?
4. Can a human understand the behavior without knowing the agent tooling?
5. Can a type, test, lint rule, or directory convention replace prose or metadata?
6. Is the expected lifetime saving larger than the implementation and maintenance cost?
7. Would this change still be defensible if token savings were 25% lower than estimated?

The target is not the smallest theoretically possible prompt. The target is the highest amount of correct, maintainable game development per unit of scarce Codex/Claude usage.
