# QA Report — ding_dong_ditch_ben (Operation Ding Dong Ditch Ben) — lens: console
Agent: Jules  |  Date: 2024-06-13  |  Build: 0cfcc14

## Verdict: PASS

## Steps played
1. Booted game, selected Eric Huang, started freeplay mode.
2. Navigated to "Operation Ding Dong Ditch Ben" (Chapter 6).
3. Randomly navigated map using keyboard W, A, S, D and triggered story beats with Space.
4. Explored for several minutes, monitoring devtools console for warnings and errors.

## Bugs found
(None observed during playthrough regarding `Texture has no frame` or game-breaking errors).

## Console warnings/errors
- `[error] %s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs. To avoid this, don't mix shorthand and non-shorthand properties for the same value; instead, replace the shorthand with separate values. Updating borderColor borderLeft` (Repeats several times)
- `[warning] [.WebGL-0x1fcc054f0800]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels` (Repeats several times, then says "this message will no longer repeat")
- `[warning] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently` (Repeats several times)

## Notes / things that felt off (not necessarily bugs)
- There is a persistent React styling warning regarding `borderColor` and `borderLeft` being updated simultaneously. While not game-breaking, this clutters the console and should be fixed in the UI components.
