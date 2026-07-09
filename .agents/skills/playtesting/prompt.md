> Playtest **one chapter** end-to-end. First read `.agents/skills/playtesting/SKILL.md` and follow it exactly. Ensure `npm run dev` is running (port 3324), then launch:
> `npm run agent -- --chapter "<TITLE>" --repl --checkpoints --playtest --out "agent-artifacts/<chapter-id>"` (CLASSIFIED chapters are auto-detected from config; no extra flag needed).
>
> Use `omega-agent-v1` JSON commands with a unique `cmd_id` for every meaningful action. Inspect every `visual_checkpoint` and `observe --shot` image with your image-viewing capability.
>
> `advance` always exits with a named `status` — respond per the skill's status table, never by improvising: `choice-present` → savestate, then take **every** option deliberately; `walk-target-present` → inspect `targets`, then `walkto` or held keys (real input, no teleports); `mode-active` → attempt the minigame normally before any bypass; `ambient-dialogue` → not a block, observe and continue; `chapter-ended` → verify the end state, then report.
>
> Never use `eval`, custom automation, `injectbeat`, `modify`, `mode`, `goto`, multi-beat `skipbeat`, or `chapterflag`/`settings` writes — `--playtest` blocks them all and every `watch`/`loadstate <file>`/`speed` use is recorded in `session_summary.audit`. A permitted bypass (`skipbeat 1`, `winmode`, `losemode`) marks the run `partially-bypassed`; capture evidence first and rerun the affected path naturally before claiming completion.
>
> Do not end after a minigame. Verify the post-mode sequence and the chapter's `endChapter` state at runtime. End with the required report format from the skill, including command IDs, evidence paths, coverage, and `session_summary.playtest_integrity`. Write the report to `qa/<chapter-id>/report.md` (the chapter's `id` from its config, e.g. `qa/spain_betrayal/report.md`); keep artifacts in the matching `qa/<chapter-id>/` folder.
>
> If you have any complaints with the test harness itself, append those to `/docs/toolkit_complaints.md`, given that those complaints don't already exist within the file. 
