> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — ding_dong_ditch_ben (Operation Ding Dong Ditch Ben) — lens: visual
Agent: Jules  |  Date: 2024-06-13  |  Build: HEAD

## Verdict: FAIL

## Steps played
1. Selected "Nick Farrar" as hero.
2. Pressed 'f' to enable free play mode.
3. Started "Operation Ding Dong Ditch Ben".
4. Played through the initial dialogue and observed the level visuals.

## Bugs found
### BUG-1 — Background-boxed prop for "Watchwater Way" house
- Severity: blocker
- Where: Center top of the level, around x=440, y=300
- Repro: Load chapter 6 "ding_dong_ditch_ben".
- Expected vs actual: Expected the house prop to load correctly. Instead, it renders as a large dark red primitive rectangle box.
- Evidence: step_3.png
- Suspected area (optional): `src/data/chapters.ts` at `prop_watchwater` missing or incorrectly loaded.

### BUG-2 — Garbled sprite sheet rendering for Eric Huang
- Severity: blocker
- Where: Left side of the street (Eric Huang)
- Repro: Load chapter 6 "ding_dong_ditch_ben" and look at Eric Huang.
- Expected vs actual: Expected a normal character sprite. Instead, a large sheet of icons/coins is rendering under Eric Huang.
- Evidence: step_3.png
- Suspected area (optional): Incorrect sprite key assigned to Eric or a texture atlas issue.

### BUG-3 — Garbled sprite sheet rendering for Nick Hedgecock
- Severity: blocker
- Where: Right side of the street (Nick Hedgecock)
- Repro: Load chapter 6 "ding_dong_ditch_ben" and look at Nick Hedgecock.
- Expected vs actual: Expected a normal character sprite. Instead, a large sheet of UI icons/gems is rendering under Nick Hedgecock.
- Evidence: step_3.png
- Suspected area (optional): Incorrect sprite key assigned to Nick or a texture atlas issue.

## Console warnings/errors
- `Phaser v3.90.0 (WebGL | Web Audio)`
- `[.WebGL-0x120c03ec8a00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

## Notes / things that felt off (not necessarily bugs)
- There is a faintly outlined rectangle above Maharko, potentially related to a missing or misaligned UI element or prop.