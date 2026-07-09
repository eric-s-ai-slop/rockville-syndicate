> Playtest **one chapter** end-to-end. First read `.agents/skills/playtesting/SKILL.md` and follow it exactly. Ensure `npm run dev` is running (port 3324), then launch:
> `npm run agent -- --chapter "<TITLE>" --keep-open --checkpoints` (add `--classified` for Rose/UMBC).
> Loop: `advance` → then repeat `diff` → decide → act. At **every** scene run `observe --shot` and **look at the PNG**; look at every `visual_checkpoint` image. Take each dialogue branch. If blocked, escalate `skipbeat` → `winmode`/`losemode` → `goto`, and record each block as a friction finding. Do **not** write custom scripts, call `GameAgent` methods, guess command names, or read chapter config in place of playing. End with the required report format from the skill. `quit` when done and note the `session_summary` error count.
> After finishing, record your findings to /qa/chapter.... as an MD file
> Also, organize your agent artifacts to the chapter folder that you just created. 
