## Playthrough: Cabin From Hell
Reached: beat 68 of ~150 — BLOCKED at scene 1

### What I observed (with evidence)
- [P0] Fatal engine crash on second `cabinCollapse` minigame bypass attempt.
  Reproduction: Play through Chapter 11, bypass `speakerHunt` (beat 46), first `cabinCollapse` (beat 62), and `storyFractures` (beat 62). At beat 68, the second instance of `cabinCollapse` starts. Send `winmode` to bypass.
  Expected: The minigame is bypassed successfully, allowing the chapter to continue.
  Observed: The game throws `page.evaluate: Error: stepFrames: __OMEGA_GAME__ not available (dev build only)`. This indicates a fatal runtime crash or React unmount in the browser that broke the agent bridge. Further `loadstate` attempts time out waiting for the `FREE PLAY` UI, indicating the app fails to render completely upon reload.
  Evidence: Console logs from agent test session (task-132, task-382). `protocol-cmd176-shot-147.png` (failed `winmode` attempt).
  Reproducibility: reproducible

### Blocks I hit and how I bypassed them
- Scene 1, beat 46: `speakerHunt` minigame blocked flow → bypassed with `winmode`
- Scene 1, beat 62: `cabinCollapse` minigame blocked flow → bypassed with `winmode`
- Scene 1, beat 62: `storyFractures` minigame blocked flow → bypassed with `winmode`
- Scene 1, beat 68: `cabinCollapse` minigame blocked flow → attempted bypass with `winmode`, resulting in a fatal engine crash. (this itself is a friction bug: yes, the game should safely handle minigame completion)

### Not verified
- Everything after beat 68. The fatal crash at beat 68 prevented any further testing of the remainder of Chapter 11.

### Coverage
- Scenes reached: 1/1; checkpoint IDs inspected: 1-20
- Choices: Selected "Continue" after `speakerHunt` timeout block.
- minigames: bypassed via `winmode` (speakerHunt, cabinCollapse, storyFractures).
- Run integrity: partially-bypassed, plus `bypasses` and `audit` quoted from the `session_summary` line:
  ```json
  "bypasses":[{"command":"winmode","reason":"Minigame was force-completed with outcome \"win\".","timestamp":1783630326241},{"command":"winmode","reason":"Minigame was force-completed with outcome \"win\".","timestamp":1783630344549},{"command":"winmode","reason":"Minigame was force-completed with outcome \"win\".","timestamp":1783630373263},{"command":"winmode","reason":"Minigame was force-completed with outcome \"win\".","timestamp":1783630539379},{"command":"winmode","reason":"Minigame was force-completed with outcome \"win\".","timestamp":1783630580334},{"command":"winmode","reason":"Minigame was force-completed with outcome \"win\".","timestamp":1783630601123}]
  "audit":[{"command":"loadstate","note":"loadstate from file: state3","timestamp":1783630668181},{"command":"loadstate","note":"loadstate from file: state2","timestamp":1783630713345}]
  ```
