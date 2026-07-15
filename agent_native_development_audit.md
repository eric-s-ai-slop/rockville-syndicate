# Project Omega Agent-Native Development Audit

Audit performed from the current working tree on 2026-07-15. Existing worktree artifacts were preserved; no existing files were edited, staged, committed, deleted, cleaned, or reformatted during the audit.

## Overall verdict

**NOT READY**

The repository has a strong, compact agent-native workflow with good routing, focused validation, typed chapter/mode contracts, browser diagnosis, evidence-aware playtesting, and CI separation. Two issues should be fixed before freezing:

1. `agent:check` can report a green no-test/no-build scope for executable files outside `src/` and `e2e_tests/`.
2. `agent:scaffold-mode` registers a runtime mode without adding its typed ID/config contract, leaving the repository conformance-red after scaffolding.

## Findings

### P1 — Validation has a false-green path outside the recognized source roots

Evidence:

- `e2e_tests/agent/check-selection.ts:147-149` only falls back to the full suite for unknown files under `src/` or `e2e_tests/`.
- `e2e_tests/agent/check.ts:125-130` skips tests when no files are selected and only runs the build for full-suite selections.
- Direct `selectTests` checks returned no tests and `fullSuite: false` for `server.ts`, `public/minigames/battleiq/omega-bridge.js`, and `scripts/voicegen/extract-lines.ts`.

Impact: an agent changing the dev server, served external-game bridge, or executable script can receive a passing typecheck/ESLint/boundaries result without relevant behavior verification or a build.

Smallest high-ROI remedy: add explicit conservative rules for executable runtime paths outside `src/`—at minimum `server.ts`, `public/minigames/**`, and relevant scripts—or emit a required verification command instead of a green no-test scope. Do not make ordinary documentation changes run the full suite.

### P1 — Mode scaffolding leaves typed registration incomplete

Evidence:

- `e2e_tests/agent/scaffold-mode.ts:66-82` updates the runtime mode registry and documentation only.
- `src/contracts/mode-configs.ts:13-43` defines the separate `MODE_IDS` and `ModeConfigMap` inventories.
- `src/game/modes/conformance.test.ts:17-19` requires runtime IDs to equal `MODE_IDS`.
- `e2e_tests/agent/scaffold-mode.ts:92-96` does not list adding the new typed contract entries as a next step.

Impact: a cold agent following the scaffold command creates a runtime-registered mode that immediately fails conformance. This directly harms the “new minigame with typed configuration” workflow.

Smallest high-ROI remedy: update all three inventories atomically, or leave the mode unregistered until its config contract is supplied and report that required step explicitly.

### P2 — Eleven of sixteen registered modes trigger expensive full-suite fallback

Evidence:

- `e2e_tests/agent/check-selection.ts:125-132` sends modes with no local unit test to the full suite.
- The live registry contained 16 modes, 11 without local tests.
- A `poolParty` mode change selected all 59 unit-test files and the build instead of a focused set.

Impact: this is safe but costly in tokens and wall-clock time. It is the largest recurring efficiency cost in mode iteration.

Smallest high-ROI remedy: add meaningful pure-logic tests for frequently changed modes. Only narrow the fallback after measured repeated failures; replacing it with superficial registry smoke tests would weaken safety.

### P2 — Chapter pipeline index contains dead links and is outside documentation drift checks

Evidence:

- `docs/chapter-pipeline/README.md:36`, `:67`, `:101`, and `:109` reference missing `02a_MAP_DESIGN.md`, `05_INTEGRATION.md`, and `DEEPEN.md`.
- `src/docsLinks.test.ts:10-20` does not include `docs/chapter-pipeline/README.md` in living-document validation.

Impact: agents following the chapter pipeline can hit dead ends or use stale manual workflows.

Smallest high-ROI remedy: update or remove the stale references and include the index in the living-document link guard.

### P2 — Template mode can queue multiple completion callbacks

Evidence:

- `src/game/modes/_template/index.ts:92-104` schedules delayed completion without a local ended flag or cancellable delayed-event handle.
- `src/game/modes/CLAUDE.md:32-34` explicitly instructs modes to guard local resolve work.
- The host guard in `src/game/scene/BeatEngine.ts:333-398` prevents duplicate story advancement, limiting the current correctness impact.

Impact: copied modes can leave delayed callbacks running after teardown and violate the local lifecycle guarantee.

Smallest high-ROI remedy: add a `modeEnded` guard, retain the delayed event, cancel it during teardown, and add a focused template lifecycle test.

### P2 — New chapter IDs are not uniqueness-checked

Evidence:

- `e2e_tests/agent/chapter-scaffold.ts:10-18` validates only index format and slug format.
- The scaffold accepts different files that generate the same chapter ID, such as `chapter13.new-adventure.ts` and `chapter12.new-adventure.ts`, both producing `new_adventure`.
- `src/data/chapters.test.ts:26-38` checks chapter shape but not unique IDs.

Impact: duplicate IDs can make `getChapter()` resolve the wrong chapter, confuse CLI navigation, collide with music/assets mappings, and make registry output ambiguous.

Smallest high-ROI remedy: reject duplicate IDs during scaffolding and add a test asserting unique registered chapter IDs. Treat numeric index collisions according to project policy because existing `5b`/`3b` naming suggests some may be intentional.

## P3 / revisit only after measured repeated failures

### Formatting-sensitive registry parsing

`e2e_tests/agent/context-map-resolution.ts:50-62` and `:87-128` use regexes for import, chapter-array, mode-registration, and beat-mode discovery. Current drift tests catch failures, and the implementation is compact.

Do not replace this with a generalized AST dependency framework. If the same formatting failure recurs, add targeted parser tests or migrate only the failing parse path to the existing AST helper.

## New-chapter expansion path

The chapter path is substantially better than the mode scaffold path:

1. Run `npm run agent:scaffold-chapter -- <index> <kebab-case-slug>`.
2. Replace TODO content in the generated typed `ChapterConfig`.
3. Add chapter-only assets and register the manifest.
4. Add chapter music or an intentional-silence justification.
5. Import the chapter and append it to `CHAPTERS` in `src/data/chapters/index.ts`.
6. Add the finished title to the README chapter table.
7. Run `npm run agent:validate-chapter -- <chapter-id>`.
8. Run `npm run agent:check -- <chapter-file>`.
9. Playtest the chapter or include it in the appropriate gauntlet.

The scaffold intentionally leaves incomplete chapters unregistered and reports that fact in `e2e_tests/agent/scaffold-chapter.ts:20-34`. Before registration, typecheck covers the file, but chapter content tests and `agent:validate-chapter` operate on registered `CHAPTERS` only. This is intentional, documented behavior; agents must register the chapter before trusting content validation.

Once registered, `agent:map` and `agent:registry` discover the chapter automatically. Playtest smoke/gauntlet enumerate `CHAPTERS` dynamically, so a registered new chapter is included without a separate per-chapter agent-map entry.

## Focused-test selection matrix

Using the real 59-file unit-test inventory:

| Changed file | Result |
|---|---|
| `src/data/chapters/chapter12.origins.ts` | Focused chapter, map, type, and documentation tests |
| `src/game/modes/doubleCall/index.ts` | Local mode tests plus registry/documentation tests |
| `src/contracts/mode-configs.ts` | Config conformance, registry, chapter, and type tests |
| `src/game/contracts/story.ts` | Story hook and `GameLayout` tests |
| `src/game/modes/lifecycle.ts` | Lifecycle test only |
| `src/game/ChapterScene.ts` | Full suite; intentional cross-cutting fallback |
| `src/game/new-system.ts` | Full suite; intentional unknown-`src` fallback |
| `server.ts` / `public/**` / `scripts/**` | No tests and no full-suite fallback; P1 |

## Discoverability and adversarial workflows

- **Visual bug in Chapter 12:** `AGENTS.md` routes to `agent:restart-check`, diagnostic CLI mode, `advance-to`, `observe --shot`, and annotated screenshots. The actual Chapter 12 ID is `origins`; passing numeric `12` produces a useful valid-ID error but is a small naming friction.
- **New minigame:** route to the mode map, read the mode contract/template, scaffold, add `ModeConfigMap`/`MODE_IDS`/runtime registration, then run focused tests. The scaffold omission is P1.
- **Persistence change:** route to `src/game/settings.ts`; focused selection includes settings, progress, and `GameLayout` tests. ESLint protects against ad-hoc storage keys.
- **Unfamiliar `src/game` runtime system:** the nearest-domain map is available; unknown source files safely fall back to the full suite, though this is expensive.
- **Genuinely new domain:** the AGENTS fallback is safe for new `src/` domains but requires manually adding a curated `context-map.json` entry for discoverability. New executable domains outside `src/` expose the P1 validation gap.

## Token and output measurements

- Default `agent:map` domain list: 206 bytes.
- Mode lookup: 740 bytes.
- Validation lookup: 793 bytes.
- Default registry: 3,994 bytes, one JSON line.
- Registry with `--symbols`: 17,436 bytes, 4.37× larger.
- Default outputs contain no `symbolRanges`; AST ranges are opt-in.

## Correctness and CI validation

- `git diff --check` — passed.
- `npm run -s check:agent` — passed typecheck, ESLint, boundaries, 639 tests, and build.
- Receipt: `agent-artifacts/check/validation-receipt.json`, schema `omega-validation-receipt-v1`, `ok: true`, no introduced warnings.
- Normal `npm test` passed independently with no server running: 59 files, 639 tests.
- `npm run -s agent:integration` passed separately against the live dev server: 2 files, 3 tests.
- CI correctly isolates live CLI integration tests in the gauntlet job after starting the server.

## No-findings areas

- Compact default map/registry output and opt-in AST ranges.
- Existing chapter/mode/visual/runtime/validation routing in `AGENTS.md`.
- Browser diagnostic and evidence-aware playtesting capabilities.
- Content/runtime/UI dependency boundaries.
- Centralized persistence and raw-storage lint protection.
- Host-side mode completion guard and scene teardown behavior.
- Normal Vitest independence from a live server.

## Worktree note

The audit worktree had no tracked changes. An existing untracked `agent_native_system_audit.md` artifact was preserved untouched. This report is the newly written audit file.
