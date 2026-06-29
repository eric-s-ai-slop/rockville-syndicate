> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — nyc_1am_drive (I-95 Northbound) — lens: combat
Agent: jules  |  Date: 2024-06-13  |  Build: main

## Verdict: PASS

## Steps played
1. Jumped to `nyc_1am_drive` via Free Play toggle / chapter select.
2. Advanced dialogue through the tollbooth checkpoint.
3. Arrived at the choice menu.
4. Made a choice and completed the chapter.

## Bugs found
No combat encounters or combat systems present in this chapter. It is exclusively an interlude / dialogue chapter. No combat bugs found.

## Console warnings/errors
- `GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`

## Notes / things that felt off (not necessarily bugs)
- Chapter is fully dialogue/choice driven. No combat mechanics are utilized.