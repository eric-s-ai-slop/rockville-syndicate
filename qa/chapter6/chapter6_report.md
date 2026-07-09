## Playthrough: Operation Ding Dong Ditch Ben
Reached: endChapter (16 of 16 beats) — COMPLETED

### What I observed (with evidence)
- The chapter title text is truncated (`CHAPTER ding_dong_dit_ben`) on the intro screen — evidence: `qa/chapter6/checkpoint-001.png`
- The house sprite (`prop_watchwater`) and trees are drawn with incorrect scroll-factor/zoom and render clipped as giant UI elements near the top of the screen — evidence: `qa/chapter6/checkpoint-003.png` and `qa/chapter6/checkpoint-004.png`
- Because the house isn't rendered on the map correctly, the door and windows are floating in the black void — evidence: `qa/chapter6/checkpoint-002.png`
- Player sprite spawned on top of/behind a bush in the center of the street — evidence: `qa/chapter6/checkpoint-002.png`
- "HEY!!!" AoE Fear spell text renders in the top-left corner (0,0) instead of centered — evidence: `{"text":"\"HEY!!!\"","x":0,"y":0,"type":"Text"}` in diff output.
- The `RUN!!` text and `MICHAEL BERSOFSKY` boss UI remained on the canvas after the `bossFight` mode was forcefully ended via `winmode` — evidence: `qa/chapter6/checkpoint-004.png`

### Blocks I hit and how I bypassed them
- Scene 0, beat "walkTo" ("Approach the front door"): The player soft-locked when walking to `440, 440`. The player stopped at `y: 454.3` because they hit the collision box of the floating front door. The target was `440, 440`, which was unreachable due to the door's collision bounds preventing entry into the 50px radius. → bypassed with `skipbeat 1`
  (this itself is a friction bug: yes, the door collision blocks the walkTo target)
- Boss fight blocking progress → bypassed with `winmode` (expected friction bypass for combat).

### Not verified
- Could not verify if the `chase` sequence functions correctly since dialogue skipping advanced through it while the `walkTo` beat was softlocked.
