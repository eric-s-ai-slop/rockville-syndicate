> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# Sprint 3 — Agent Dispatch Sheet (copy → paste → run, 46 times)

Every task below uses the **same setup** in Jules:
- **Repo:** `eric-s-ai-slop/rockville-syndicate`
- **Base branch:** `main`  ← always main, for every single task
- **Prompt:** the fenced block under each item — paste it verbatim.

Work top to bottom, check the box as you fire each one. They run in parallel; don't wait for one to finish before starting the next.

> Prerequisite: `plans/sprint3/` must be committed and pushed to `main` first, or the agents can't read their instructions.

---

## Part A — The 6 code fixes (one agent each)

- [ ] **S3-T1 — Mission-select visual feedback**
```
Read the file plans/sprint3/S3-T1-mission-select-feedback.md in this repo and implement it exactly as written. Read plans/sprint3/MASTER_PLAN_S3.md first for the global house rules. Make a surgical diff to ONLY the region that task names. Branch from main. When done, run `npx tsc --noEmit` and `npm run build`, then open a pull request describing the root cause, your exact change, and how you verified it.
```

- [ ] **S3-T2 — Audio mix + dialogue blip won't stop**
```
Read the file plans/sprint3/S3-T2-audio-mix-and-blip.md in this repo and implement it exactly as written. Read plans/sprint3/MASTER_PLAN_S3.md first for the global house rules. Make a surgical diff to ONLY the region that task names. Branch from main. When done, run `npx tsc --noEmit` and `npm run build`, then open a pull request describing the root cause, your exact change, and how you verified it.
```

- [ ] **S3-T3 — Nick F deals no damage (Spain boss)**
```
Read the file plans/sprint3/S3-T3-nickf-no-damage.md in this repo and implement it exactly as written. Read plans/sprint3/MASTER_PLAN_S3.md first for the global house rules. Make a surgical diff to ONLY the region that task names. Branch from main. When done, run `npx tsc --noEmit` and `npm run build`, then open a pull request describing the root cause, your exact change, and how you verified it.
```

- [ ] **S3-T4 — Multiple copies of Eric boss**  *(merge AFTER T3)*
```
Read the file plans/sprint3/S3-T4-eric-boss-duplication.md in this repo and implement it exactly as written. Read plans/sprint3/MASTER_PLAN_S3.md first for the global house rules. Make a surgical diff to ONLY the region that task names. Branch from main. When done, run `npx tsc --noEmit` and `npm run build`, then open a pull request describing the root cause, your exact change, and how you verified it.
```

- [ ] **S3-T5 — Broken car asset (I-95 / Florida)**  *(merge AFTER T6)*
```
Read the file plans/sprint3/S3-T5-broken-car-asset.md in this repo and implement it exactly as written. Read plans/sprint3/MASTER_PLAN_S3.md first for the global house rules. Make a surgical diff to ONLY the region that task names. Branch from main. When done, run `npx tsc --noEmit` and `npm run build`, then open a pull request describing the root cause, your exact change, and how you verified it.
```

- [ ] **S3-T6 — Broken boss / Audrey sprites**  *(merge BEFORE T5; needs runtime visual check)*
```
Read the file plans/sprint3/S3-T6-boss-audrey-sprite-regression.md in this repo and implement it exactly as written. Read plans/sprint3/MASTER_PLAN_S3.md first for the global house rules. This is a heuristic computer-vision task: a passing tsc proves nothing — you MUST run the game and visually confirm each boss sprite renders correctly. Make a surgical diff to ONLY the region that task names. Branch from main. When done, run `npx tsc --noEmit` and `npm run build`, then open a pull request with screenshots of Audrey and one other boss, describing the root cause, your exact change, and how you verified it.
```

---

## Part B — The 40 QA-grid agents (one cell each)

Same task file for all 40 (`S3-T7`); only **chapter** and **lens** change. Each writes a uniquely-named report file, so all 40 can run at once with zero conflicts.

### Chapter 1 — spotify_insurgency (Eric / Spotify)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spotify_insurgency lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/spotify_insurgency__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spotify_insurgency lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs, and write ONLY the file plans/sprint3/qa/spotify_insurgency__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spotify_insurgency lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs, and write ONLY the file plans/sprint3/qa/spotify_insurgency__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spotify_insurgency lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs, and write ONLY the file plans/sprint3/qa/spotify_insurgency__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spotify_insurgency lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/spotify_insurgency__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 2 — nyc_1am_drive (I-95 Northbound)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=nyc_1am_drive lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/nyc_1am_drive__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=nyc_1am_drive lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs, and write ONLY the file plans/sprint3/qa/nyc_1am_drive__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=nyc_1am_drive lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs, and write ONLY the file plans/sprint3/qa/nyc_1am_drive__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=nyc_1am_drive lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs, and write ONLY the file plans/sprint3/qa/nyc_1am_drive__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=nyc_1am_drive lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/nyc_1am_drive__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 3 — red_pee_bladder (Audrey / hospital) — controls are inverted here on purpose
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=red_pee_bladder lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/red_pee_bladder__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=red_pee_bladder lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs, and write ONLY the file plans/sprint3/qa/red_pee_bladder__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=red_pee_bladder lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs, and write ONLY the file plans/sprint3/qa/red_pee_bladder__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=red_pee_bladder lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs (NOTE: inverted controls in this chapter are intentional, not a bug), and write ONLY the file plans/sprint3/qa/red_pee_bladder__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=red_pee_bladder lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/red_pee_bladder__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 4 — jungle_gym_gambit (park)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=jungle_gym_gambit lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/jungle_gym_gambit__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=jungle_gym_gambit lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs, and write ONLY the file plans/sprint3/qa/jungle_gym_gambit__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=jungle_gym_gambit lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs, and write ONLY the file plans/sprint3/qa/jungle_gym_gambit__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=jungle_gym_gambit lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs, and write ONLY the file plans/sprint3/qa/jungle_gym_gambit__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=jungle_gym_gambit lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/jungle_gym_gambit__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 5 — florida_highway_duel (Florida)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=florida_highway_duel lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/florida_highway_duel__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=florida_highway_duel lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs, and write ONLY the file plans/sprint3/qa/florida_highway_duel__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=florida_highway_duel lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs, and write ONLY the file plans/sprint3/qa/florida_highway_duel__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=florida_highway_duel lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs, and write ONLY the file plans/sprint3/qa/florida_highway_duel__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=florida_highway_duel lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/florida_highway_duel__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 6 — ding_dong_ditch_ben (Michael chase)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=ding_dong_ditch_ben lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/ding_dong_ditch_ben__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=ding_dong_ditch_ben lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs (watch the knock SFX and door-open), and write ONLY the file plans/sprint3/qa/ding_dong_ditch_ben__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=ding_dong_ditch_ben lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs (watch the chase→fight handoff), and write ONLY the file plans/sprint3/qa/ding_dong_ditch_ben__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=ding_dong_ditch_ben lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs (watch the chase→fight handoff), and write ONLY the file plans/sprint3/qa/ding_dong_ditch_ben__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=ding_dong_ditch_ben lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/ding_dong_ditch_ben__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 7 — spain_betrayal (Nick F)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spain_betrayal lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/spain_betrayal__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spain_betrayal lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs, and write ONLY the file plans/sprint3/qa/spain_betrayal__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spain_betrayal lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs (Nick F boss damage is a known issue being fixed separately — confirm whether he deals damage), and write ONLY the file plans/sprint3/qa/spain_betrayal__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spain_betrayal lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs, and write ONLY the file plans/sprint3/qa/spain_betrayal__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=spain_betrayal lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/spain_betrayal__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

### Chapter 8 — cabin_basye (cabin)
- [ ] visual
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=cabin_basye lens=visual. Follow that task exactly: play ONLY that chapter, hunt ONLY for visual bugs, and write ONLY the file plans/sprint3/qa/cabin_basye__visual.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] audio
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=cabin_basye lens=audio. Follow that task exactly: play ONLY that chapter, hunt ONLY for audio bugs (this chapter reuses chapter 1 music — note if that feels wrong), and write ONLY the file plans/sprint3/qa/cabin_basye__audio.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] combat
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=cabin_basye lens=combat. Follow that task exactly: play ONLY that chapter, hunt ONLY for combat bugs, and write ONLY the file plans/sprint3/qa/cabin_basye__combat.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] flow
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=cabin_basye lens=flow. Follow that task exactly: play ONLY that chapter, hunt ONLY for flow bugs, and write ONLY the file plans/sprint3/qa/cabin_basye__flow.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```
- [ ] console
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. Your assigned cell is chapter=cabin_basye lens=console. Follow that task exactly: play ONLY that chapter, capture ONLY console warnings/errors, and write ONLY the file plans/sprint3/qa/cabin_basye__console.md. Do not edit any game code. Branch from main and open a docs-only pull request.
```

---

## Part C — Spare agents (optional, ~4)

If you have agents left over, run a generalist whole-game pass. Use lens slug `freeplay` and append the agent id so filenames stay unique:
```
Read plans/sprint3/S3-T7-qa-sweep-fanout.md in this repo. You are a generalist tester: play the WHOLE game start to finish across all chapters, covering all five lenses (visual, audio, combat, flow, console). Write ONLY the file plans/sprint3/qa/fullgame__freeplay__<your-agent-id>.md (replace <your-agent-id> with a unique value). Do not edit any game code. Branch from main and open a docs-only pull request.
```

---

## Merge order when PRs come back
1. Code PRs first: **T3 before T4**, **T6 before T5**; T1 and T2 any time.
2. All 40 QA-report PRs are docs-only with unique filenames — merge in any order, no conflicts.
3. When the QA reports are merged, hand back to the architect to compile the Sprint 3.5 fix wave.