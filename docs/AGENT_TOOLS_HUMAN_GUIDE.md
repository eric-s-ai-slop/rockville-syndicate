# Project Omega Agent Tools

## A human guide to the repository’s development helpers

Project Omega includes a collection of command-line tools for helping an agent—or a human developer—understand, validate, debug, and playtest the game.

The short version:

> The tools do not write the whole game for you. They make the important parts of development cheaper to discover, safer to validate, and easier to reproduce.

The biggest benefit is reduced context and investigation overhead. Across mixed repository work, the current toolkit is estimated to save about **40% of agent-facing tokens**. Chapter-authoring work benefits more—roughly **55–60%**—because the repository has a focused router, scaffold, chapter validator, and targeted test selection.

These percentages are estimates, not billing measurements. They compare the tool-assisted workflow with a plausible alternative in which an agent searches broadly, reads unrelated files, runs verbose checks, and manually drives the browser.

## The main tools at a glance

| Tool | What it does | Best use |
|---|---|---|
| `agent:map` | Finds the canonical files and registration points for a domain | Start here when you do not know where code lives |
| `agent:scaffold-chapter` | Creates a minimal typed chapter file | Start a new chapter without hand-writing boilerplate |
| `agent:scaffold-mode` | Creates a mode from the project template and wires its registries | Start a new minigame mode |
| `agent:validate-chapter` | Checks chapter structure and references without opening a browser | Catch content mistakes early |
| `agent:audit` | Checks static assets, music keys, and registered mode references | Verify chapter integrations |
| `agent:lint-dialogue` | Flags unusually long dialogue lines | Find likely dialogue-box layout problems |
| `agent:check` | Runs typecheck, lint, boundaries, and the smallest safe test set | Validate a focused code change |
| `check:agent` | Runs the complete typecheck, lint, tests, and build gate | Final validation before handoff |
| `agent:registry` | Prints the current chapter and mode inventory | Get a compact overview of the game’s content |
| `agent` | Drives the running game through a stateful terminal interface | Debug or playtest a chapter |
| `agent:restart-check` | Replaces only a verified workspace-owned dev server | Recover from stale Vite/server state |
| `agent:qa-audit` | Checks that playtest reports and evidence agree | Verify QA evidence is complete and honest |

## The recommended development loop

For most work, use this sequence:

1. Route to the right area of the repository.
2. Read the nearest scoped guide and the canonical source it identifies.
3. Make the smallest change that solves the task.
4. Run focused validation on the changed files.
5. Use the browser agent only when runtime or visual behavior matters.
6. Run the full gate when the change is complete or cross-cutting.

The router in `AGENTS.md` is intentional. It prevents an agent from beginning with a repository-wide search every time.

## Adding a new chapter

### 1. Find the chapter workflow

```bash
npm run -s agent:map -- --target=chapter
```

This returns the chapter registration file, related files, relevant symbols, and verification commands. The output is compact—about 137 tokens in the current repository.

For an existing chapter, you can ask for its exact context:

```bash
npm run -s agent:map -- --target=chapter --id=origins
```

Use `--symbols` only when exact declaration ranges are necessary. It increases the output from roughly 137 tokens to roughly 261 tokens.

### 2. Create the starter file

```bash
npm run agent:scaffold-chapter -- 13 new-adventure
```

The scaffold command:

- validates the chapter index;
- enforces lowercase kebab-case slugs;
- prevents duplicate chapter IDs;
- creates a valid `ChapterConfig`;
- gives the file a conventional filename and export name;
- leaves the chapter unregistered until it is ready.

The generated file is only about 29 lines. The command writes it directly and returns a short next-steps receipt instead of requiring the agent to generate boilerplate manually.

### 3. Read the chapter authoring guide

The canonical guide is:

[src/data/chapters/CLAUDE.md](/Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/data/chapters/CLAUDE.md)

It covers beat types, routing patterns, speakers, map themes, assets, music, and registration. The types remain authoritative if the guide and code disagree.

The most important chapter rules are:

- Use the declared `Beat` union rather than inventing new beat shapes.
- Use `map.theme` deliberately; it controls procedural decoration.
- Keep `walkTo` coordinates inside the active map.
- Use `loseGoto` for ordinary minigame lose branches.
- Register chapter-only assets in `src/game/assets/chapter/`.
- Add chapter music or document intentional silence.
- Import the chapter and append it to `CHAPTERS` only when the draft is ready to validate.

### 4. Register the finished chapter

The scaffold is intentionally unregistered so incomplete content does not appear in the game. When the chapter is ready, update:

- `src/data/chapters/index.ts`
- `src/game/assets/chapter/index.ts`, if chapter-specific assets exist
- `src/game/audio.ts`, if the chapter needs music
- the README chapter table

These steps are still manual. The current scaffold does not modify multiple registries or documentation files automatically.

### 5. Validate the chapter

```bash
npm run -s agent:validate-chapter -- new_adventure
npm run -s agent:audit
npm run -s agent:lint-dialogue
```

The chapter validator checks for:

- unreachable beats;
- broken `goto`, `loseGoto`, and route targets;
- out-of-bounds `walkTo` coordinates;
- unknown speakers;
- unregistered mode IDs;
- unknown music keys;
- invalid scene transitions;
- missing map themes.

The static audit checks the broader asset and music wiring. Dialogue linting is heuristic: it identifies lines worth reviewing, but it does not claim to measure actual browser overflow.

### 6. Run focused checks

```bash
npm run -s agent:check -- src/data/chapters/chapter13.new-adventure.ts
```

For a chapter-only change, the selector normally runs the chapter content tests and related tests instead of every test in the repository. In the current repository:

- focused chapter validation selected 4 tests / 16 assertions;
- a chapter plus assets/index changes selects about 6 tests;
- the full suite contains 62 test files / 648 test cases.

The command prints compact stage receipts and stores detailed logs under `agent-artifacts/check/`.

### 7. Playtest the chapter

Start or repair the development server:

```bash
npm run agent:restart-check
```

Then run a normal diagnostic session:

```bash
npm run agent -- --chapter "New Adventure" --diagnostic --repl
```

For completion-quality evidence, use the playtest mode:

```bash
npm run agent -- --chapter "New Adventure" --repl --checkpoints --playtest \
  --out "qa/new_adventure" \
  --transcript "qa/new_adventure/session.jsonl"
```

The most useful command is usually `advance`. It stops at meaningful story boundaries and reports a named status such as:

- `walk-control`;
- `choice-present`;
- `walk-target-present`;
- `mode-active`;
- `ambient-dialogue`;
- `chapter-ended`.

This avoids repeatedly dumping the entire browser state. Use `observe --shot` or `screenshot --annotate` when visual inspection is needed.

After a playtest:

```bash
npm run agent:write-report -- qa/new_adventure/report.md qa/new_adventure/session.jsonl
npm run agent:verify-report -- qa/new_adventure/report.md qa/new_adventure/session.jsonl
npm run agent:qa-audit -- qa/new_adventure/report.md qa/new_adventure/session.jsonl
```

## What saves tokens

### Repository discovery

This is the largest saving.

A broad manual chapter investigation can easily load 8,000–10,000 tokens of types, guides, registries, tests, assets, audio, and example chapters. The chapter map itself is about 137 tokens and points to the files that matter.

In practice, the routed approach usually saves about **4,000–8,000 tokens per chapter task**, depending on how much unrelated material the agent would otherwise inspect.

### Boilerplate generation

The scaffold writes the starter source directly. This saves approximately **50–150 output tokens** compared with hand-generating the file and its naming conventions. The larger benefit is avoiding trivial syntax, ID, and filename mistakes.

### Validation output

`agent:check` keeps successful output to a few lines and stores raw logs on disk. This is a modest conversation-token saving, but it also makes failures easier to isolate. Its strongest benefit is runtime: focused checks avoid rebuilding and rerunning unrelated tests.

### Runtime investigation

The browser agent provides structured state, named progression statuses, checkpoints, and transcripts. This reduces the need for repeated screenshots, guesses, and ad hoc browser scripts. The exact token saving varies with the bug and number of iterations, so no fixed percentage is claimed here.

## Overall effectiveness estimate

These are practical estimates for agent-facing context, not a benchmark of model billing:

| Type of work | Estimated tokens saved |
|---|---:|
| New chapter/content work | 50–70% |
| Local bug fix | 30–50% |
| Runtime debugging/playtesting | 20–40% |
| Cross-cutting engine change | 10–25% |
| Mixed repository development | about 40% |

The number is lower for engine work because the agent still needs to understand broad lifecycle and subsystem interactions. The tools reduce navigation and verification overhead; they do not replace the reasoning required to design or implement complex behavior.

## Current limitations

The workflow is strong but not completely automatic.

### Draft chapters cannot be validated before registration

`agent:validate-chapter`, `agent:audit`, and `agent:lint-dialogue` operate on the registered `CHAPTERS` collection. A scaffold must be imported and registered before those tools can inspect it.

### Assets, music, and documentation remain manual

The scaffold does not create chapter asset manifests, add music mappings, update `CHAPTERS`, or edit the README. This is deliberate safety behavior, but it leaves several integration steps to the developer.

### The context map is curated

`agent:map` is a small, hand-maintained map rather than a general dependency graph. That keeps its output compact and predictable, but a new domain or unusual dependency may require manual search.

### Full playtests still need visual judgment

The gauntlet and playtest receipts can prove progression and coverage, but they cannot replace looking at screenshots when layout, sprite scale, animation, or atmosphere matters.

## When to use which command

Use `agent:map` when you are unsure where to begin.

Use `agent:registry` when you want a compact inventory of all chapters and modes. Do not use it as the first step for a new chapter; its current output is about 1,000 tokens.

Use `agent:validate-chapter` for content structure.

Use `agent:audit` for music, image, asset, and mode wiring.

Use `agent:check -- <changed-files>` for ordinary code validation.

Use `check:agent` for the final full gate.

Use `agent -- --diagnostic --repl` for a localized runtime problem.

Use `agent -- --playtest --repl --checkpoints` when you need completion-quality evidence.

Use `agent:restart-check` when the browser appears to be running stale code or the dev server is unhealthy.

## The practical takeaway

The agent tools are best understood as a development rail system:

```text
map → read the right guide → scaffold or edit → validate → focused check → playtest → full gate
```

They currently deliver their strongest value by preventing wasted investigation. The next major improvement would be draft-file validation before registration, followed by optional automation for asset/music registration and README updates.
