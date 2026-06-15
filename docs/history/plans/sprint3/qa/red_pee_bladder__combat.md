# QA Report — red_pee_bladder (The Red Pee Bladder Strike) — lens: combat
Agent: jules  |  Date: 2026-06-13  |  Build: da02370

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Start dev server and load the game (`npm run dev`).
2. Navigate to Free Play -> `The Red Pee Bladder Strike`.
3. Skipped dialogue aggressively to advance the chapter state to the boss fight phase.
4. Engaged in combat with `boss_audrey` ("The 10-Year Phantom").
5. Moved around the arena to observe boss tracking and player control mechanics.
6. Allowed boss to attack and used player attacks (spacebar) to ensure hit detection functions.

## Bugs found
### BUG-1 — Audrey sprite rendered as entire unsliced spritesheet
- Severity: major
- Where: Combat arena, boss spawn location (center-top)
- Repro: Reach the `boss_audrey` fight in chapter `red_pee_bladder`.
- Expected vs actual: The boss should be rendered as a single animated frame (e.g., 48x48) sliced from the spritesheet. Instead, the entire source spritesheet (`boss_audrey_sheet`) is rendered as a single static image, overlapping the UI and arena bounds.
- Evidence: `qa_combat_late.png`
- Suspected area (optional): `ChapterScene.ts` in `summonBossMatch()`. The conditional block for `if (this.textures.exists(bossSheetKey))` uses the raw sheet texture without applying a specific frame. `SpritePreprocessor.ts` may also not be successfully registering `boss_audrey_sheet` as an animated texture if it is loaded elsewhere.

## Console warnings/errors
- None logged in the console output matching `Texture has no frame N` during the playwright run.

## Notes / things that felt off (not necessarily bugs)
- **Reversed Controls**: As announced in the dialogue ("Bladder Strike confirmed. Controls will be reversed."), the player's WASD and arrow key movement directions are inverted. This is an intentional mechanic (`this.setControlsInverted(true)` in `ChapterScene.ts`).
- **Kidney Strike Teleport**: The boss correctly employs the `teleportKidneyStrike` attack, generating a red warning ring before snapping to the player's position. This functions smoothly.
