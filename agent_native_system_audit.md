# Agent-Native Development System Audit Report

**Audit Date:** July 15, 2026
**Auditor Role:** Independent Chief AI Repository Architect
**Subject Workspace:** `project-omega_-the-rockville-syndicate`

---

## 1. Overall Verdict

### **READY WITH MINOR FIXES**

The repository has an exceptionally mature, robust, and thoughtful agent-native development system. It utilizes strict boundary enforcement (via ESLint AST checks), a deterministic playtesting CLI, stateful compliance monitoring to prevent shortcut playtests, and smart test selection to minimize code-change validation latency.

No correctness blockers or architectural regressions were found. The system is ready to be locked down once the minor token-efficiency gaps, registry parsing regexes, and documentation duplication noted below are addressed.

---

## 2. Validation Run

The validation gate was executed from a clean state. All unit checks, lint configurations, boundary validations, and production builds pass successfully.

### Command Executed:
```bash
git diff --check
npm run -s check:agent
```

### Result Output:
```text
scope      full  files=0 tests=59
scope-note --full requested
typecheck  PASS  5.7s  clean
eslint     PASS  2.6s  clean
boundaries PASS  4.4s  clean
tests      PASS  14.6s  639 passed (639)
build      PASS  4.1s  3.79s
{"cmd":"validation-receipt","ok":true,"path":"agent-artifacts/check/validation-receipt.json"}
```

---

## 3. Findings by Severity

### P0 (Critical Blockers)
*No findings.*

### P1 (High Impact - Must Fix Before Freeze)
*No findings.*

---

### P2 (Medium Impact - Must Fix Before Freeze)

#### 1. Mode Test Selection Efficiency Gap (Token & Execution Overhead)
* **Evidence:** [check-selection.ts:L125-L134](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/check-selection.ts#L125-L134) checks if modified modes have local test files. Currently, **11 out of 16 registered modes** (e.g., `poolParty`, `basementScene`, `silentDrive`, `carRide`) have no local unit tests (as verified in the registry output).
* **Impact:** Modifying any of these 11 modes triggers the `fullSuite` fallback in the test selection router. Instead of a fast 1-second focused unit test run, developers and agents are penalized with a full 28-second cycle running all 639 unit tests and triggering a full production Vite build. This significantly inflates token cost and developer feedback latency during minigame changes.
* **Remedy:** Create simple companion smoke test files (e.g., `src/game/modes/poolParty/poolParty.test.ts` asserting basic structure) to satisfy the test selection logic. Alternatively, adjust `check-selection.ts` to fall back on mode conformance tests (`src/game/modes/conformance.test.ts` and `src/game/modes/index.test.ts`) instead of the entire project test suite when local tests are absent.

#### 2. Brittle Regex-Based Registries Resolution
* **Evidence:** [context-map-resolution.ts:L33, L53, L62, L91, L112, L126](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/context-map-resolution.ts#L33) uses custom regex matching to parse ES imports, chapter configurations, and `registerMode` calls.
* **Impact:** If code-formatting rules change (e.g., multi-line imports, trailing comments, or double vs. single quotes not anticipated by the regexes), resolution of context mapping and registries will break. This causes static checks to fail during routine codebase refactoring.
* **Remedy:** Migrate resolution logic to leverage the existing `ts-morph` parser in [ast.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/ast.ts) (specifically reusing `extractImportPaths` and `extractDefaultImportsByName` which are already written but unused by the mapping resolution).

#### 3. AST Project Startup Latency in Unit Tests
* **Evidence:** AST-based unit tests such as [boundaries.test.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/boundaries.test.ts#L37) and [registry-report.test.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/registry-report.test.ts#L40) take ~8 seconds each to run.
* **Impact:** Every Vitest worker initializes a cold instance of `ts-morph` and re-parses the entire project TSConfig, adding noticeable compilation drag to the unit test phase.
* **Remedy:** Share a lazily-loaded project AST context across test executions, or move AST structural tests out of the standard unit suite into a compilation-only integration stage.

#### 4. Stale Scaffolding Instructions in Chapter Pipeline Documentation
* **Evidence:** [ADDING_A_MINIGAME.md:L7-L11, L36-L43](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/docs/ADDING_A_MINIGAME.md#L7-L11) and [05_INTEGRATION.md:L12-L38](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/docs/chapter-pipeline/05_INTEGRATION.md#L12-L38) instruct developers and agents to manually copy-paste the template directory, create chapter TS files, and update registrations in `src/game/modes/index.ts` / `src/data/chapters/index.ts`.
* **Impact:** This duplicates and bypasses the automated `agent:scaffold-chapter` and `agent:scaffold-mode` CLI tools. AI agents or human contributors following the markdown pipeline guide will waste effort performing manual, error-prone registry edits, potentially breaking TypeScript syntax.
* **Remedy:** Update both markdown files to lead with their respective automated CLI commands (`npm run agent:scaffold-chapter` and `npm run agent:scaffold-mode`), keeping the manual files description as background reference.

---

### P3 (Low Impact / Polish - Revisit After Measured Failures)

#### 1. Cold Agent Diagnostic UX Friction
* **Evidence:** [cli.diagnostic.test.ts:L30-L36](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/cli.diagnostic.test.ts#L30-L36) checks that jumps to specific beats via `goto beat` fail with a `DIAGNOSTIC_PREREQUISITE_REQUIRED` error unless the agent explicitly passes `--allow-skipped-prerequisites`.
* **Impact:** A cold agent trying to jump to a scene index/beat index to fix a bug might waste loops diagnosing why the CLI rejected their jump.
* **Remedy:** Augment the CLI's `DIAGNOSTIC_PREREQUISITE_REQUIRED` error message string to explicitly prompt: `Please run again with the --allow-skipped-prerequisites flag if skipping story side-effects is intended.`

---

## 4. Chapter Pipeline Audit

The **Chapter Pipeline** is a 5-step agentic system (from Extraction through integration) that structures the translation of raw social anecdotes into TypeScript chapter data.

### Discoverability
The pipeline resides in `docs/chapter-pipeline/` with an explicit `README.md`. While the pipeline prompts themselves are well-documented, they are not registered as customizations/skills for agents (such as Google Antigravity or custom MCP servers), meaning a new agent might miss them unless it scans the directories.

### Efficiency
The prompts in `01_EXTRACTION.md`, `02a_MAP_DESIGN.md`, `02b_MECHANIC.md`, and `03_SCHEMA.md` are incredibly detailed but very long (e.g. `01_EXTRACTION.md` is 738 lines / 43KB). Loading these templates in their entirety inside an agent's context during development represents a minor token tax.

### Correctness & Drift Protection
* **Drift Protection:** The pipeline includes a special drift test guard [skillDocSync.test.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/e2e_tests/agent/skillDocSync.test.ts) that checks if the playtest instructions (`SKILL.md`, `prompt.md`, `AGENT_TOOLKIT.md`) are kept synchronized with the CLI's advance statuses, commands, and integrity checks. This is a very strong safety gate.
* **Working Draft Stale Alert:** The `docs/chapter-pipeline/working/README.md` correctly warns that shipped files in the `working/` folder are stale snapshots that must not be copied back into `src/`. However, there is no automated command/linter to clean them up or check if they are polluting the repository.

---

## 5. Areas with No Findings

### Core Verification & CI Integrity
The testing infrastructure is perfectly designed. Normal Vitest unit tests execute 100% browser-free and server-free. The live server integration tests (`cli.diagnostic.test.ts` and `cli.protocol.test.ts`) are completely isolated via `vitest.config.ts` and run only in the dedicated GitHub Actions CI pipeline after dev server validation.

### Invariant Enforcement
The codebase's permanent invariants are beautifully guarded via ESLint config rules. The rules explicitly block direct `localStorage` access (except in `settings.ts`), enforce the high-resolution `label()` helper over Phaser's blurry `add.text`, and ban `cameras.main.setBounds` to prevent black bar rendering. This guarantees no drift can leak past commits.

### Playtest Compliance
The playtest harness compliance gate (`PlaytestCompliance`) successfully stops agents from cheating. It blocks progression if visual checkpoints are unreviewed, bans fuzzy placeholder review notes like "looks fine," and prevents skipping foreground minigames using `skipbeat` without prior keyboard/mouse interaction attempts.

---

## 6. Adversarial Workflow Analysis

This review analyzes how a cold agent handles common request profiles:

1. **"Fix a visual bug halfway through Chapter 12."**
   * *Action:* Agent routes via `AGENTS.md` and runs `npm run agent:map -- --target=chapter --id=origins` to find the file `src/data/chapters/chapter12.origins.ts`.
   * *Friction:* Jumps straight to the beat using `goto beat` will fail unless the agent reads the diagnostic instruction to include `--allow-skipped-prerequisites`. (Remedied by P3.1).
   * *Verification:* Validating with `npm run agent:check -- <file>` keeps the test suite execution incredibly fast by avoiding full-suite compilation and build stages.

2. **"Add a new minigame with typed configuration."**
   * *Action:* Agent finds `agent:scaffold-mode` command, creating the files automatically.
   * *Friction:* If the agent makes code modifications to the new mode before adding a local test file (e.g., `myMode.test.ts`), `agent:check` will fall back to `fullSuite`, causing a 28s validation cycle. (Remedied by P2.1).

3. **"Change persistence behavior."**
   * *Action:* Agent uses `agent:map -- --target=persistence`, which points directly to `settings.ts`.
   * *Friction:* None. If the agent attempts to write straight to `localStorage` in another file, ESLint blocks the change instantly.

4. **"Modify an unfamiliar cross-cutting system."**
   * *Action:* Agent maps the nearest domain (e.g., `audio`). If no domain matches, the fallback rule runs `agent:check`, triggering a safe `fullSuite` check.

5. **"Add a genuinely new development domain."**
   * *Action:* Agent adds files, but must manually register them in `check-selection.ts` to bypass `fullSuite` runs.
   * *Friction:* None, this is a safe default behavior.
