# QA Report — cabin_basye (The Cabin) — lens: console
Agent: jules  |  Date: 2024-05-15  |  Build: latest

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Booted the game via `npm run dev` and enabled Free Play.
2. Selected `The Cabin` chapter.
3. Played through the dialog sequences and moved around the level to load map/sprites.
4. Recorded all console warnings and errors verbatim.

## Bugs found
### BUG-1 — React style property warning on rerender
- Severity: polish
- Where: React DOM UI (ChapterSelect buttons)
- Repro: Enter chapter selection screen, hover over items / play the game.
- Expected vs actual: No React style warnings. Actual: Warning about mixing shorthand and non-shorthand CSS properties (`borderColor` and `borderLeft`).
- Evidence: `[ERROR] %s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs. To avoid this, don't mix shorthand and non-shorthand properties for the same value; instead, replace the shorthand with separate values. Updating borderColor borderLeft`
- Suspected area (optional): `src/components/ChapterSelect.tsx` line 118 where `borderColor` and `borderLeft` are both used dynamically.

### BUG-2 — Canvas2D getImageData readback warning
- Severity: polish
- Where: Phaser canvas rendering
- Repro: Start a chapter (The Cabin) and let Phaser draw frames.
- Expected vs actual: No readback warnings. Actual: Warning about multiple readback operations and `willReadFrequently`.
- Evidence: `[WARNING] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`
- Suspected area (optional): `src/game/SpritePreprocessor.ts` which uses offscreen canvas and `getImageData` heavily for procedural atlas generation.

### BUG-3 — WebGL GPU stall warning
- Severity: polish
- Where: Phaser WebGL context
- Repro: Play the chapter using WebGL renderer.
- Expected vs actual: Smooth rendering without driver warnings. Actual: Warning about GPU stall due to ReadPixels.
- Evidence: `[WARNING] [.WebGL-0x2a7c03edbc00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`

## Console warnings/errors
- `[ERROR] %s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs. To avoid this, don't mix shorthand and non-shorthand properties for the same value; instead, replace the shorthand with separate values. Updating borderColor borderLeft`
- `[WARNING] [.WebGL-0x2a7c03edbc00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `[WARNING] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`

## Notes / things that felt off (not necessarily bugs)
- Did not encounter any "Texture has no frame N" errors in this chapter.
