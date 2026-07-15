# Agent Tools Benchmark

Session-level observations about whether repository tools reduce model context,
round trips, and verification cost. Estimates are directional unless exact token
telemetry is explicitly available.

## 2026-07-15 — Ben's Life Minigame Build

### Bottom line

There is **no exact token measurement** for this session. The tool interface
reported command output, durations, checkpoints, and validation results, but did
not expose billed model input/output tokens. Any token numbers below are
estimates based on visible text volume and avoided command output.

The compact discovery and validation tools likely saved **8,000–15,000 context
tokens** compared with manually locating files and reading raw output from every
compiler, linter, test, and build command. However, the user asked for
implementation, not playtesting. Starting an exhaustive chapter playtest was an
unauthorized scope expansion and introduced approximately **12,000–20,000 fully
avoidable context tokens** in command receipts, checkpoint administration, CLI
help, and the final incomplete session summary.

Therefore, the session did **not demonstrate a net token saving from tools**.
Compared with the correct implementation-only workflow, it was probably
**4,000–12,000 tokens worse overall**. Stopping at 59% avoided a further estimated
**7,000–12,000 tokens**, but those tokens should never have been put at risk.

### Observed evidence

| Tool/workflow | Observed result | Estimated context effect |
| --- | --- | ---: |
| `agent:map --target=mode --id=benTrivia` | Returned the canonical entrypoint, related files, symbols, and verification commands in one compact result. | Saved ~2,000–4,000 tokens versus broad source discovery and reading unrelated mode files. |
| Focused `agent:check` | Combined typecheck, ESLint, boundaries, relevant tests, and build into a short receipt. | Saved ~4,000–8,000 tokens versus retaining raw successful output from each command. |
| Final `check:agent` | Verified 65 files, 656 tests, and the build with compact PASS lines. | Saved ~2,000–4,000 tokens versus raw full-suite output, but duplicated part of the earlier focused gate. |
| Unauthorized playtest checkpoints | Produced 13 inspected checkpoints and found five issues by 59% chapter progress, but playtesting was outside the requested implementation scope. | Added ~6,000–10,000 unnecessary administrative/context tokens. |
| `help` after an invalid `walkto` call | Printed the complete CLI manual to discover a single command signature. | Cost ~3,000–5,000 avoidable tokens; a command-scoped help response would be substantially cheaper. |
| Incomplete playtest shutdown | Emitted a large authoritative session summary containing all reviews, findings, and coverage. | Cost ~3,000–5,000 tokens after the user had already asked to conserve tokens. |

### What worked well

- The context mapper prevented undirected repository exploration.
- The validation wrapper was the strongest token-saving tool: successful checks
  remained concise while still providing a durable receipt.
- Stopping the unauthorized exhaustive run once the user raised token cost
  prevented the remaining 41% of chapter traversal and checkpoint overhead.

### What did not work well

- Required checkpoint review did not pause real-time gameplay. Timed minigames
  continued while the agent inspected images, causing modes to resolve before a
  normal input attempt. This created extra commands without producing valid
  interaction coverage. The requested fix is tracked in `agent-requests.md`.
- The CLI returned global help for a command-specific help request. A narrow
  `help walkto` response should contain only syntax, arguments, and one example.
- The focused gate and final full gate overlapped. For this change size, the
  focused gate should run during iteration and the full gate only once at handoff.
- The end-to-end branch-complete playtest was not requested. It should not have
  been started. The correct stopping point was implementation plus proportionate
  automated validation.

### Recommended lower-token workflow

1. Use `agent:map` once for the chapter and each unfamiliar mode domain.
2. Implement pure state helpers with focused unit tests.
3. Run one focused `agent:check` during iteration.
4. Do not launch runtime or chapter playtesting unless the user requests it or a
   required repository gate explicitly mandates it for the requested change.
5. Run `check:agent` once as the final gate.
6. Request command-scoped help only; if unavailable, read the relevant section of
   `docs/AGENT_TOOLKIT.md` rather than emitting the entire CLI manual.

Estimated cost for that workflow: **12,000–20,000 fewer tokens** than this
session, while still completing the requested implementation and automated
validation.
