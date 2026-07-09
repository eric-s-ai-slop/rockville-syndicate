# Resolved Agent Toolkit Complaints

Archived 2026-07-09 after verification.

1. **Fatal Engine Crash on Unhandled React/Phaser Errors:** resolved. Command
   failures and checkpoint-capture failures are contained so the REPL remains
   available. `restart` / `refresh` reloads the selected chapter session.

2. **Background Minigames Emitting `mode-active`:** resolved. Active modes now
   record their owning beat and whether they are background modes. `advance`,
   automatic mode completion, and `winmode` only treat a current foreground
   mode as blocking.

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
