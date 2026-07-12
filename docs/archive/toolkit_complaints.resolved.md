# Resolved Agent Toolkit Complaints

Archived 2026-07-09 after verification.

1. **Fatal Engine Crash on Unhandled React/Phaser Errors:** resolved. Command
   failures and checkpoint-capture failures are contained so the REPL remains
   available. `restart` / `refresh` reloads the selected chapter session.

2. **Background Minigames Emitting `mode-active`:** resolved. Active modes now
   record their owning beat and whether they are background modes. `advance`,
   automatic mode completion, and `winmode` only treat a current foreground
   mode as blocking.

3. **Autonomous Agent Ignored Visual Checkpoints and Invented a Bypass
   Conflict:** resolved at the enforceable CLI boundary. A Chapter 12 run
   emitted 26 checkpoint PNGs that the driver admitted it did not inspect,
   then it invented `mode action _bypass`, sent blocked command `mode`, and
   falsely attributed that invented command to `SKILL.md`. The source skill
   never contained `_bypass`; its documented foreground-mode bypasses were
   `winmode` and `losemode`. Checkpoints now require explicit
   `reviewcheckpoint` receipts, `session_summary.visual_qa` exposes pending
   reviews, bypasses are blocked until the latest checkpoint is reviewed,
   `skipbeat` cannot bypass an active foreground mode, and `winmode`/`losemode`
   require a successful normal keyboard or mouse attempt first. Autonomous
   launches now use `--transcript` so the raw JSONL receipts survive independently
   of any retrospective agent explanation.

4. **Claimed REPL Input Buffering Bug:** not a toolkit defect. The driver sent
   multiple JSON objects without the newline delimiter required by JSONL and
   without waiting for the first command's terminal receipt. `readline` then
   correctly delivered the concatenated bytes as one invalid record, and the
   protocol emitted explicit `INVALID_JSON` rejection receipts; no command was
   silently dropped. The safeguard that subsequently rejected `winmode` was
   also correct because the required checkpoint review had never succeeded.
   The parser now adds an actionable framing hint to `INVALID_JSON` errors, but
   it deliberately does not guess boundaries between malformed records.

## Verification

- Live `Cabin From Hell` CLI run reproduced the unmounted-game condition:
  `savestate` returned a command error, the REPL stayed open, and `restart`
  successfully re-entered the chapter.
- Live playtest reached the `cabinCollapse` → `silentDrive` boundary without
  reporting the stale background mode as the current foreground mode.
- `npm run lint` passed.
- 67 focused Vitest tests passed.
- `e2e_tests/fixture_safe_advance.spec.ts`: 3 passed.
- The Chapter 11 playtest smoke run exercised 8 foreground modes without a
  stale-background mode failure; it exceeded the 300-second full-chapter
  budget before completion, so it is not claimed as a full-chapter pass.
- The Chapter 12 artifact directory contained all 26 checkpoint PNGs described
  by the post-mortem; visual inspection confirmed the reported `doubleCall`
  label/field misalignment was visible in those artifacts.
- The repository contained no `_bypass` instruction outside the agent-authored
  false complaint. Focused compliance/doc/policy tests passed (65 tests), the
  full unit suite passed (359 tests), and `npm run lint` passed. The new
  compliance gates were unit-tested. A short live Chapter 12 protocol smoke
  emitted checkpoint 1 with `review_required`, accepted its
  `reviewcheckpoint` receipt, and ended with `visual_qa.status: "complete"`
  and no pending IDs. Its `--transcript` file exactly matched every public JSONL
  line from `ready` through `session_summary`. No new full Chapter 12 playthrough
  is claimed here.
- `agent-artifacts/origins/session5.jsonl` contains explicit `INVALID_JSON`
  rejection receipts for concatenated objects and explicit `COMMAND_FAILED`
  receipts when bypass prerequisites were unmet. The playtesting skill and
  reusable prompt both require one newline-terminated JSONL command at a time
  and waiting for its correlated terminal receipt. Protocol tests now assert
  that concatenated objects remain invalid and receive the framing guidance.
