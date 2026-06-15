# QA Report — jungle_gym_gambit (The Jungle Gym Gambit) — lens: console
Agent: jules  |  Date: 2026-06-13  |  Build: a03daf1

## Verdict: PASS

## Steps played
1. Selected a hero.
2. Started the story.
3. Enabled freeplay mode.
4. Jumped to Chapter 4: The Jungle Gym Gambit.
5. Walked around and progressed through dialogue.
6. Captured all console warnings and errors.

## Bugs found
None strictly from the game code affecting gameplay in this chapter. No "Texture has no frame N" or similar game-breaking errors were found.

## Console warnings/errors
- `[error] %s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs. To avoid this, don't mix shorthand and non-shorthand properties for the same value; instead, replace the shorthand with separate values. Updating borderColor borderLeft`
- `[warning] [.WebGL-0x...]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `[warning] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`

## Notes / things that felt off (not necessarily bugs)
- React complains about style shorthand property conflicts (`borderColor` vs `borderLeft`) on UI elements.
