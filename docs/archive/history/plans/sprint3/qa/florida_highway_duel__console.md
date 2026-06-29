> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — florida_highway_duel (The Florida Highway Duel) — lens: console
Agent: jules  |  Date: 2024-06-13  |  Build: 0cfcc14

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Selected Eric Huang, clicked "Begin the Story", and started "The Florida Highway Duel" chapter in Free Play mode.
2. Progressed through dialogue slowly and explored the map during the boss fight using arrow keys and the space bar to attack.
3. Successfully completed the chapter.

## Bugs found
None directly attributable to the `console` lens during this run.

## Console warnings/errors
- `[error] %s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs. To avoid this, don't mix shorthand and non-shorthand properties for the same value; instead, replace the shorthand with separate values. Updating borderColor borderLeft` (Repeated multiple times)
- `[warning] [.WebGL-0x...]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels` (Repeated multiple times)
- `[warning] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently` (Repeated multiple times)
- `[pageerror] Framebuffer status: Incomplete Attachment`

## Notes / things that felt off (not necessarily bugs)
- Did not observe the `Texture has no frame N` error during testing.