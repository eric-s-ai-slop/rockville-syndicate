# Toolkit Complaints

## Open

### Mid-chapter quit incorrectly reports verified completion

- **Observed:** 2026-07-12 during the DEV `Playtest Fixture` branch-save smoke.
- **Exact command:** `{"protocol":"omega-agent-v1","cmd_id":"quit","action":"quit"}` while the live beat was the fixture choice immediately after the background `poolParty` beat and before `changeScene`/`endChapter`.
- **Expected:** A visually complete but unfinished run must report an incomplete or blocked completion status because `chapter-ended` was never observed.
- **Actual:** The command completed successfully and `session_summary` emitted `ok:true` and `completion_status:"verified"` solely because all four captured checkpoints had been reviewed. The run was also `partially-bypassed`, but that did not affect completion status.
- **Evidence:** `/tmp/omega-fixture-unsafe/session.jsonl`; `save-bg` immediately before quit proves the run was still at the background-mode unsafe-save boundary.
- **Likely cause:** `playtestCompletionVerdict()` currently derives completion only from `visual_qa.status` and does not require runtime observation of the terminal `endChapter` beat.
- **Scope recommendation:** Fix in the later runtime-coverage/session-summary work, not in PR 1 branch snapshot fidelity.
