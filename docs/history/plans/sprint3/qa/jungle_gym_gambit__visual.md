> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — jungle_gym_gambit (park) — lens: visual
Agent: Jules  |  Date: 2026-06-13  |  Build: da02370

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Ran `npm run dev` and loaded `http://localhost:3000`.
2. Bypassed menus into "Free Play" mode and selected "The Jungle Gym Gambit" (Chapter 4).
3. Walked around the park to trigger dialogue and observe the visual layout. → Saw dark green squares rendering behind multiple bush/flower props, and an extremely tiny speaker portrait in the dialogue UI.

## Bugs found
### BUG-1 — Background-boxed props (dark green squares behind foliage)
- Severity: minor
- Where: Park environment, behind bush and flower sprites scattered across the ground
- Repro: Load the Jungle Gym Gambit chapter and observe the foliage props around the area.
- Expected vs actual: Expected transparent backgrounds around the foliage sprites, but actual rendering shows a dark green square background filling the tile behind them.
- Evidence: `screenshot_ingame_walk.png`, `screenshot_ingame_end.png`
- Suspected area: Spritesheet transparency, incorrect asset export, or tilemap layering issue for those specific props.

### BUG-2 — Incorrect sprite scaling in dialogue UI portrait
- Severity: minor
- Where: Dialogue UI box at the bottom of the screen
- Repro: Trigger dialogue in the chapter (e.g. Nick Hedgecock speaking). Look at the character portrait in the UI.
- Expected vs actual: Expected the character portrait next to the speaker's name to be clearly visible and appropriately scaled. Actually, it is extremely tiny and nearly unreadable.
- Evidence: `screenshot_ingame_end.png`
- Suspected area: Dialogue UI portrait scaling logic or missing layout dimensions.

## Console warnings/errors
- `WebGL: INVALID_ENUM: texImage2D: invalid internalformat`
- `WebGL: INVALID_OPERATION: texImage2D: type UNSIGNED_SHORT_5_6_5 but ArrayBufferView not Uint16Array`
- `GPU stall due to ReadPixels`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

## Notes / things that felt off (not necessarily bugs)
- Characters and layout generally function correctly, but the visual glitches detract slightly from the polish.