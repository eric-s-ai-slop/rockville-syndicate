# Agent Tooling Implementation Specification

Implementation-ready improvements for making repository tasks faster, cheaper,
and easier to verify. This document is a backlog and contract, not evidence that
an item has shipped.

## Pause Real-Time Gameplay During Required Checkpoint Review

**Observed:** 2026-07-15, while playtesting Chapter 13 minigames with
`--playtest --repl --checkpoints`.

When a foreground-mode checkpoint is emitted, the agent must inspect and review
the PNG before any other state-changing command is accepted. The Phaser loop
continues running during that external inspection, while `pause` is rejected
because the checkpoint is still pending. Timed modes can therefore expire or
hit a stationary player before the required visual review is complete. This
made normal-input coverage inaccurate for the Rust and Patient Zero modes.

**Request:** Automatically pause the game loop when a required foreground-mode
checkpoint is emitted, then resume it after `reviewcheckpoint`, or allow `pause`
as the sole state-changing command while visual review is pending.

**Acceptance criteria:**

- A timed foreground mode does not advance while its required checkpoint awaits
  review.
- Reviewing the checkpoint restores the prior loop state without altering the
  mode timer, physics, tweens, or input state.
- An agent can inspect the PNG, submit `reviewcheckpoint`, and then make a normal
  keyboard or pointer attempt before the mode resolves.
- Background-mode and ordinary scene checkpoints retain explicitly documented
  behavior so automatic pausing cannot silently change story timing.

## Add a Linux Docker Release-Parity Gate

**Observed:** 2026-07-15, while preparing Project Omega v2.0.0 for release.

The host production build, typecheck, lint, unit tests, and Playwright suite all
passed on macOS, but `docker build` failed because two image imports differed
from their on-disk filenames only by letter case. The case-insensitive host
filesystem concealed a defect that the Linux image builder correctly rejected.
The existing full agent check therefore proves source-level health but not that
the deployable artifact can be built and booted.

**Request:** Add one release-oriented command, such as
`npm run agent:release-check`, that builds the production Docker image on Linux,
starts an ephemeral container, and verifies both `/api/health` and the static
application before declaring the repository deployable. Run the same command
as a required CI job for pushes to `main` and release tags.

**Acceptance criteria:**

- The gate fails on case-mismatched imports even when invoked from a
  case-insensitive development filesystem.
- It builds the actual `Dockerfile`, not a parallel test-only image definition.
- It starts the resulting image with `NODE_ENV=production`, waits for health,
  and requires successful responses from `/api/health` and `/`.
- Containers, temporary tags, ports, and logs are cleaned up on success,
  failure, or interruption.
- Output identifies whether failure occurred during image build, container
  startup, health polling, or static application smoke testing.
- A successful run emits a compact machine-readable release receipt containing
  the image tag or digest and the validation results.

## Make Shipping Chapter Boundaries Explicit and Testable

**Observed:** 2026-07-15, while verifying whether the playtest fixture would be
present in Docker.

The agent registry intentionally includes `fixture-playtest`, while production
chapter registration excludes it through an environment-dependent condition.
That is correct behavior, but it is difficult to prove from registry output and
easy for future ordering or unlock logic to accidentally treat a development
fixture as shipping content.

**Request:** Represent chapter inclusion as an explicit, testable deployment
classification rather than relying only on an inline environment conditional.
Expose a machine-readable production chapter manifest to release validation.

**Acceptance criteria:**

- Development and agent tooling include the fixture, while a production
  manifest excludes it deterministically.
- Tests verify that non-shipping chapters cannot gate, reorder, or unlock
  shipping chapters.
- The Docker release gate checks the production manifest rather than searching
  minified bundles for fixture strings.
- Adding another fixture or internal-only chapter requires declaring its
  deployment classification in typed chapter configuration.
- Registry output can distinguish `shipping`, `development`, and any future
  internal classifications without changing the default player-facing menu.

## Derive the Chapter Catalog From Canonical Configuration

**Observed:** 2026-07-15, while adding play-time estimates, moving Origins into
the Meta section, and hiding its title until the external seal was opened.

Chapter title, order, estimate, seal classification, and release availability
are represented across typed configs, the chapter selector, tests, and the
README table. Manual comparison was required to confirm that all sixteen
estimate ranges matched and that the documented menu order still reflected the
runtime registry.

**Request:** Generate the README chapter catalog from canonical chapter metadata
or add a strict drift test that compares the checked-in table with the typed
registry. Keep player presentation rules in code, but make duplicated factual
metadata mechanically verifiable.

**Acceptance criteria:**

- Every registered chapter has a positive `{ min, max }` estimate with
  `min <= max`.
- README title, config filename, estimate range, shipping classification, and
  registry order cannot silently diverge from canonical configuration.
- External/Meta chapters and ordinary classified chapters remain distinct in
  the generated or validated metadata.
- The development fixture is documented as non-shipping without appearing in a
  production player catalog.
- A mismatch reports the exact chapter and field instead of only failing a
  broad documentation test.

## Add a Safe Publish Preflight

**Observed:** 2026-07-15, while publishing Project Omega v2.0.0.

The working tree contained source, documentation, binary assets, QA evidence,
and tracked deletions. After scope was confirmed and the release commit was
created, the first push was rejected because `origin/main` had advanced in the
meantime. The remote changes were compatible, but discovering that only after
the commit added avoidable release friction.

**Request:** Add an agent-oriented publish preflight that summarizes scope and
checks remote divergence immediately before commit and push. It should remain a
guard and reporting tool; it must not force-push or choose merge policy without
explicit authorization.

**Acceptance criteria:**

- The preflight fetches the tracked remote and reports ahead/behind counts
  before staging or committing.
- It groups modified, deleted, untracked, generated QA, and binary asset files,
  including aggregate binary size.
- Publishing a mixed worktree requires an explicit all-files confirmation or an
  explicit path list.
- A branch that is behind its remote is stopped before push with the remote
  commits and changed paths summarized.
- Force-push is never selected automatically.
- After a successful push, the tool verifies that local `HEAD` equals the
  remote branch SHA and reports that SHA in a machine-readable receipt.

## Include Release Provenance in Production Health

**Observed:** 2026-07-15, while smoke-testing the v2.0.0 container.

`/api/health` proved that the server was alive but returned only status and a
timestamp. It could not prove which package version, Git commit, or image build
was actually running, leaving deployment verification dependent on external
tag discipline.

**Request:** Embed non-secret build provenance in the production image and
return it from `/api/health`.

**Acceptance criteria:**

- Production health includes the package version, Git commit SHA, build time,
  and runtime environment.
- The Docker image carries matching OCI labels for version and revision.
- Missing provenance fails the release gate but does not prevent ordinary local
  development.
- The values are injected during the build and cannot become stale through a
  manually maintained source constant.
- No tokens, repository credentials, host paths, or other secrets are exposed.

## Gemini Requests

### High-Speed "Teleport to Beat" Command

**Observed:** 2026-07-16, when analyzing the agent CLI drive workflow.

Getting to a specific narrative beat in the middle of a chapter requires repeatedly executing `advance` or driving the player manually. Jumps via `goto` require `--allow-skipped-prerequisites` and can bypass critical scene states.

**Request:** Add a `--jump-to-beat <beatId>` boot flag.

**Acceptance criteria:**

- The harness executes the chapter under high timescale (`--speed 3` or higher) with automated dialog-clicking.
- It resolves choices deterministically or chooses defaults until the target beat is reached.
- It pauses the loop automatically when the target beat is reached, returning control.
- This reduces 10+ manual command round-trips to a single boot step.

### AST Reference Investigator (`agent:refs`)

**Observed:** 2026-07-16, when identifying refactoring scopes for shared interfaces/contracts.

To check usages of a contract or interface, agents must grep for references and then read the full files to understand the usage context, which consumes unnecessary tokens.

**Request:** Implement `npm run agent:refs -- --symbol <symbolName>`.

**Acceptance criteria:**

- It uses the existing `ts-morph` AST utility to extract the symbol's signature.
- It outputs a concise list of file paths with only the exact lines of code where that symbol is referenced.
- It avoids listing lines of code that do not reference the symbol directly.

### Chapter Dialogue Diffing

**Observed:** 2026-07-16, when reviewing changes to narrative beats.

Chapters are large TypeScript configuration files. A normal `git diff` shows the code syntax changes, which can be noisy for agents checking narrative changes.

**Request:** Implement `npm run agent:diff-story`.

**Acceptance criteria:**

- The script compares the current chapter file against `HEAD`.
- It prints a structured tree diff of only the *narrative content* (e.g. `"Speaker: Line text"`, choices, or scene shifts), ignoring boilerplate code syntax.
- The output is optimized for text/token efficiency.

### Direct Node-Only Mode Tester (Browserless)

**Observed:** 2026-07-16, when evaluating the time and resources required to test minigames.

Testing minigame state logic requires spawning a Playwright Chromium instance, which takes ~3–5 seconds to spin up and consumes memory/CPU.

**Request:** Add a mock runner `npm run test:mode <modeId>` that imports the mode class directly into a Node.js shell.

**Acceptance criteria:**

- The runner loads the mode under node.js without opening any browser or launching Playwright.
- It mocks the `ModeContext` façade.
- It executes and asserts state transitions programmatically.

