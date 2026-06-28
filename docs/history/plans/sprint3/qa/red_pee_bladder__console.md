> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — red_pee_bladder (The Red Pee Bladder Strike) — lens: console
Agent: jules  |  Date: 2026-06-13  |  Build: da02370

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Opened the game via `npm run dev`.
2. Selected "Eric Huang" and toggled "Free Play".
3. Jumped to Chapter 3 (The Red Pee Bladder Strike - `red_pee_bladder`).
4. Clicked through dialogue using Space and selected options to reach the boss phase.
5. Attempted to move around the room and engaged the boss, logging the console output.

## Bugs found
### BUG-1 — GL Driver Message GPU stall
- Severity: polish
- Where: Entire chapter gameplay
- Repro: Run the game in Chrome/Chromium and check the developer console.
- Expected vs actual: Expected smooth WebGL rendering. Actual shows GPU stall warnings due to `ReadPixels`.
- Evidence: Console warning
- Suspected area (optional): Phaser WebGL renderer or sprite preprocessor `getImageData` calls

### BUG-2 — Canvas willReadFrequently performance warning
- Severity: polish
- Where: Entire chapter gameplay
- Repro: Run the game and check the developer console.
- Expected vs actual: Expected no warnings about readback operations. Actual shows a warning suggesting the `willReadFrequently` attribute should be set.
- Evidence: Console warning
- Suspected area (optional): `vitest.setup.ts` mock canvas implementation or core Phaser canvas creation settings

## Console warnings/errors
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`
- `[.WebGL-0xXXXXXXX]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`

## Notes / things that felt off (not necessarily bugs)
- Did not explicitly observe the `Texture has no frame N` error logged during my playback of this chapter, but other console warnings were present. The inverted controls for the player character are noted as intentional per the task brief, but make dodging the boss quite disorienting.