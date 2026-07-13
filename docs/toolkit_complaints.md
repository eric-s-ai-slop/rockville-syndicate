# Toolkit Complaints

## Closed / disproven

### Mid-chapter quit incorrectly reports verified completion — resolved

- **Observed:** 2026-07-12 during the DEV `Playtest Fixture` branch-save smoke.
- **Exact command:** `{"protocol":"omega-agent-v1","cmd_id":"quit","action":"quit"}` while the live beat was the fixture choice immediately after the background `poolParty` beat and before `changeScene`/`endChapter`.
- **Expected:** A visually complete but unfinished run must report an incomplete or blocked completion status because `chapter-ended` was never observed.
- **Actual:** The command completed successfully and `session_summary` emitted `ok:true` and `completion_status:"verified"` solely because all four captured checkpoints had been reviewed. The run was also `partially-bypassed`, but that did not affect completion status.
- **Evidence:** `/tmp/omega-fixture-unsafe/session.jsonl`; `save-bg` immediately before quit proves the run was still at the background-mode unsafe-save boundary.
- **Likely cause:** `playtestCompletionVerdict()` currently derives completion only from `visual_qa.status` and does not require runtime observation of the terminal `endChapter` beat.
- **Scope recommendation:** Fix in the later runtime-coverage/session-summary work, not in PR 1 branch snapshot fidelity.
- **Triage:** Confirmed as a historical bug and fixed on `main` in commit `26fa6fe`. `main` now requires `coverage.terminalObserved` and has a regression test in `e2e_tests/agent/playtestCompliance.test.ts`; the cited transcript predates that fix.

### `SKILL.md` documents incorrect protocol command for walking — disproven
- **Observed:** During Chapter 12 playtest.
- **Expected:** `SKILL.md` instructs using `walkto <target>` for movement during `walk-target-present`.
- **Actual:** The correct command in the `omega-agent-v1` protocol is `walkTarget`. Using `walkto` causes a command failure.
- **Triage:** Not reproducible in the current toolkit. `walkto` is the registered public command in `cli.ts`; `walkTarget` is the internal live-state field used by `targets`/diagnostics. The skill and toolkit docs already teach the correct command.

### `savestate` command payload missing expected safety guarantees — resolved
- **Observed:** During Chapter 12 playtest at choice boundaries (e.g. `scene3-choice1`).
- **Expected:** As per `SKILL.md`, running `savestate <name>` should allow inspection of `branchSafe` and `unsafeReasons` in the output.
- **Actual:** The `savestate` command only returns `{"cmd":"savestate","ok":true,"file":"..."}` and does not include `branchSafe` or `unsafeReasons` in the JSON result payload.
- **Triage:** Confirmed for the file-save form. Fixed in commit `5605f85` so `savestate <file>` returns and persists the same `branchSafe`/`unsafeReasons` metadata as an in-memory save; regression coverage now exercises both safe and unsafe fixture boundaries.
