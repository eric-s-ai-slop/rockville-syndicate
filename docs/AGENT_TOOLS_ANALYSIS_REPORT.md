# Project Omega Agent Tools: Analysis Report

**Date:** 2026-07-15
**Repository:** `eric-s-ai-slop/rockville-syndicate`
**Scope:** Repository development tools, with special attention to adding a new chapter
**Status:** Read-only audit of the existing implementation; no agent infrastructure was changed

## Executive summary

Project Omega has a substantial agent-tooling layer. It is not a collection of disconnected scripts: it has a routing model, typed content scaffolding, static chapter validation, focused test selection, runtime diagnostics, playtest evidence, and compact machine-readable output.

The tooling is effective, but it does not automate the entire act of developing a chapter. The developer still writes the narrative and gameplay configuration, registers the finished chapter, adds assets and music, updates documentation, and makes final visual judgments.

The most defensible conclusions are:

| Question | Assessment |
|---|---:|
| Are the core agent tools implemented? | **Approximately 90%** |
| Is adding a chapter fully automated? | **Approximately 70%** |
| Estimated token savings for new-chapter work | **Approximately 55–60%** |
| Estimated token savings across mixed repository work | **Approximately 40%** |
| Focused test-count reduction for a chapter edit | **About 90% fewer tests** |

The token figures are estimates of agent-facing context and output, not a billing-meter benchmark. They depend on what the agent would have read and how verbose the alternative workflow would have been.

## What was audited

The audit inspected the following areas:

- `package.json` agent scripts;
- `e2e_tests/agent/` command implementations and tests;
- `e2e_tests/agent/context-map.json` and context resolution;
- chapter scaffolding and chapter validation;
- focused test selection;
- static asset and dialogue audits;
- the terminal game agent and playtest documentation;
- `docs/AGENT_TOOLKIT.md` and the agent toolkit specification;
- the chapter-scoped authoring guide in `src/data/chapters/CLAUDE.md`.

The audit also executed representative read-only commands:

```bash
npm run -s agent:map -- --target=chapter
npm run -s agent:map -- --target=chapter --id=origins
npm run -s agent:validate-chapter -- origins
npm run -s agent:audit
npm run -s agent:lint-dialogue
npm run -s agent:check -- src/data/chapters/chapter1.spotify-insurgency.ts
```

The validation command passed with typecheck, ESLint, architecture boundaries, and focused tests all clean. The static audit and dialogue lint also returned successful results.

## Tool inventory and value

### Context routing: `agent:map`

The context map is a curated, hand-maintained index of domain registration points, related files, symbols, how-to guidance, and verification commands.

For chapters, the compact resolved output identifies:

- `src/data/chapters/index.ts` and `CHAPTERS` as the registration point;
- the chapter types and scoped authoring guide;
- chapter tests;
- the scaffold command;
- chapter-specific asset registration when applicable;
- referenced mode IDs;
- exact verification commands.

Measured output sizes:

| Invocation | Output size | Approximate tokens |
|---|---:|---:|
| Chapter context, compact | 547 characters | 137 |
| Chapter context with `--symbols` | 1,044 characters | 261 |
| Full registry inventory | 3,993 characters | 999 |

The compact default is a good design choice. Exact AST ranges are useful only when an agent needs to edit a specific declaration. They should not be included routinely.

### Chapter scaffolding: `agent:scaffold-chapter`

The chapter scaffolder creates a minimal, typed, intentionally unregistered chapter. It validates the index and slug, prevents duplicate IDs, and generates conventional file and export names.

Measured for `13 new-adventure`:

- generated file: 670 characters, approximately 168 code tokens;
- generated file: 29 lines;
- command receipt: 631 characters, approximately 158 tokens.

The scaffolder removes repetitive setup and prevents several low-value mistakes. It does not try to author story content or modify multiple registries automatically, which is safer for incomplete work.

### Chapter validation: `agent:validate-chapter`

The typed validator operates without a browser and checks chapter-level structural rules, including:

- unreachable beats;
- broken `goto`, `loseGoto`, and route targets;
- out-of-bounds `walkTo` coordinates;
- unknown speakers;
- unregistered minigame IDs;
- missing music keys;
- invalid scene indices;
- missing map themes.

For a clean chapter, the output is a single success JSON line. This is excellent for agent context efficiency and still leaves failures structured enough to act on.

### Static audits: `agent:audit` and `agent:lint-dialogue`

`agent:audit` checks static audio imports, stage-music mappings, chapter-referenced music, image imports, and minigame registration.

`agent:lint-dialogue` identifies dialogue and choice lines above a conservative length threshold. It is explicitly a heuristic rather than a browser-layout proof, which is the correct level of confidence for a static linter.

### Focused validation: `agent:check`

`agent:check` always runs the core typecheck, ESLint, and boundary checks. Its test selector chooses a safe focused set based on changed files. It stores detailed logs under `agent-artifacts/check/` and prints compact summaries.

Measured results:

| Check | Scope | Result |
|---|---|---:|
| Focused chapter file | 4 test files | 16 tests passed |
| Full repository gate | 62 test files | 648 tests passed |
| Focused elapsed time | typecheck, lint, boundaries, tests | approximately 11.2 seconds |
| Full elapsed time | typecheck, lint, boundaries, tests, build | approximately 24.4 seconds |

A chapter plus asset/index changes selects approximately 6 test files. This is a major compute reduction, although the token reduction is smaller because successful output is compact in both cases.

### Runtime agent and playtesting

The terminal game agent provides a stateful browser session with structured commands. Important capabilities include:

- `advance` for story-aware progression;
- `advance-to` for diagnostic navigation;
- `observe` for structured state snapshots;
- `walkto` for real key-driven movement;
- `choose` for choices;
- `modes`, `winmode`, and `losemode` for mode inspection;
- `screenshot --annotate` and visual checkpoints;
- save-state and restore commands;
- deterministic stepping and seeded randomness;
- transcripts, coverage, and completion summaries.

The playtest mode also records bypasses and requires visual checkpoint review for a verified result. This is valuable because it prevents an agent from claiming a natural full-chapter completion after using diagnostic shortcuts.

The runtime agent’s token savings are variable. A short, linear chapter may not save much. A chapter with branches, scenes, walking, and modes can avoid many repeated state dumps and ad hoc browser scripts.

## New-chapter workflow assessment

The current new-chapter path is:

```text
map → read scoped guide → scaffold → author content → register → validate → check → playtest → full gate
```

### Fully implemented portions

- Find the chapter domain and canonical files.
- Generate a valid starter chapter.
- Catch common structural chapter errors.
- Audit music, static imports, and mode references.
- Select focused tests from changed files.
- Drive a running chapter through a stateful browser agent.
- Produce structured playtest and QA evidence.

### Partially implemented portions

- Chapter registration remains manual.
- Chapter-specific asset manifests remain manual.
- Music mappings remain manual.
- README chapter documentation remains manual.
- Final visual quality review remains human or multimodal-agent judgment.

### Important workflow gap

The scaffold is intentionally unregistered. This keeps incomplete content out of the playable `CHAPTERS` collection, but it also means `agent:validate-chapter`, `agent:audit`, and `agent:lint-dialogue` cannot inspect the draft until it is imported and appended to `CHAPTERS`.

This is the clearest missing feature in the workflow. A future validator could accept a direct chapter file or ID without requiring runtime registration, while preserving the current safety behavior.

## Token-savings analysis

### Measurement method

The rough estimates in this report use character counts divided by four as a simple code-and-prose token approximation. This is not identical to the production tokenizer, so the figures should be treated as directional.

The comparison baseline is a naive development workflow in which an agent:

1. searches broadly for chapter-related files;
2. reads the entire chapter guide, types, registry, tests, assets, audio, and example chapters;
3. runs broad validation with verbose logs;
4. manually drives the browser with repeated full-state observations.

The tool-assisted workflow reads the scoped guide and canonical types but uses compact routing, generated scaffolding, focused checks, and structured runtime receipts.

### Chapter work

A representative broad chapter context bundle is approximately 9,600 tokens when it includes the chapter guide, types, registry, chapter tests, asset index, audio mapping, and an example chapter.

The routed path can often begin with approximately 4,100 tokens of essential context: the compact chapter map, the scoped guide, the chapter types, and the scaffold receipt. The story content and any genuinely necessary asset or music source still have to be understood, so this is not a claim that a chapter can be authored from 4,100 tokens alone.

Under this comparison:

```text
(9,600 - 4,100) / 9,600 ≈ 57%
```

That supports the practical chapter estimate of **55–60% token savings**, with a wider range of **50–70%** depending on chapter complexity.

### Overall repository work

Across the whole repo, not every task benefits equally:

| Work type | Estimated savings |
|---|---:|
| New chapter/content | 50–70% |
| Local bug fix | 30–50% |
| Runtime debugging/playtesting | 20–40% |
| Cross-cutting engine work | 10–25% |
| Mixed repository average | approximately 40% |

The mixed average is lower because engine changes still require broad understanding of `ChapterScene`, scene contracts, React bridges, modes, and runtime lifecycle. The tools reduce navigation and verification overhead, but they do not eliminate the reasoning needed to design cross-cutting changes.

### What the percentage does not mean

The estimate does not mean that every user request becomes 40% shorter. It means the agent is expected to spend fewer context tokens on repository orientation, irrelevant source reads, verbose successful checks, and repeated runtime probing.

It also does not mean that the implementation itself is 40% smaller. A 5,000-line feature still requires roughly the same feature reasoning and code.

## Strengths

### Compactness is designed in

Most agent commands emit one JSON line per result. Successful validation does not dump full compiler or test logs into the conversation.

### The router prevents premature broad search

The repository’s `AGENTS.md` gives intent-specific first moves. This is one of the most important token-saving decisions in the project.

### Validation is proportionate

Content changes do not automatically require every unrelated unit test, while cross-cutting entrypoints still fall back to the full suite.

### Runtime evidence is structured

Named progression statuses and machine-readable transcripts are much more useful than a long undifferentiated browser log.

### The safety model is unusually explicit

Diagnostic shortcuts are labeled, playtest bypasses are recorded, and verified completion requires natural progression plus terminal and visual coverage.

## Weaknesses and risks

### Draft validation gap

The scaffold’s unregistered state is safe but creates an awkward validation delay.

### Curated map drift

The context map is intentionally not a general dependency graph. It is compact and maintainable, but new domains or unusual dependencies require updates.

### Asset validation is not chapter-file-first

Static audits inspect the registered `CHAPTERS` collection. They are strongest after integration rather than during the first draft.

### Visual QA still costs attention

The tools can capture and organize evidence, but an image still needs to be looked at when the question is sprite scale, composition, animation, atmosphere, or visual polish.

### Documentation duplication

There are several sources of agent guidance: root instructions, scoped `CLAUDE.md` files, `docs/AGENT_TOOLKIT.md`, the toolkit specification, and skill documentation. The routing rules help, but a careless agent could still load too much documentation.

## Recommendations

### Priority 1: validate unregistered draft files

Add a mode such as:

```bash
npm run agent:validate-chapter -- --file src/data/chapters/chapter13.new-adventure.ts
```

The validator could import the file directly and use the existing registered mode and music inventories. This would preserve safe non-registration while enabling earlier feedback.

### Priority 2: add an optional chapter integration helper

Provide an explicit, opt-in command that updates only the chapter import and `CHAPTERS` array after the developer confirms the draft is ready. It should refuse to overwrite ambiguous files and show a diff before writing.

### Priority 3: expose compact source excerpts from `agent:map`

The map currently returns paths and symbols. An optional, tightly bounded `--excerpt` mode could return only the relevant type/interface or registration slice, avoiding a separate broad file read without turning the map into a general dependency graph.

### Priority 4: measure token savings directly

The current percentages are reasoned estimates. A future benchmark could record:

- tool output token counts;
- files read per task;
- full versus focused test output;
- number of runtime observations per bug;
- total transcript tokens for representative tasks.

That would convert the current directional estimates into a reproducible benchmark.

## Final verdict

Project Omega’s agent infrastructure is real, useful, and substantially implemented. Its strongest feature is not any single command; it is the way the commands form a workflow that keeps the agent oriented and the feedback compact.

The tools currently deliver:

```text
high discovery savings
high chapter-validation value
high focused-test value
medium runtime-debugging savings
low automation of final integration paperwork
```

The fairest headline is:

> **The repo’s agent tools save about 40% of development-context tokens overall and about 55–60% for new chapter work, while covering roughly 90% of the core tooling surface and 70% of the full chapter-authoring workflow.**

The remaining work is clear rather than mysterious: draft-file validation, safer integration helpers, and direct benchmark instrumentation.
