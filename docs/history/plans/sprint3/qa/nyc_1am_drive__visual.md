> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — nyc_1am_drive (I-95 Northbound) — lens: visual
Agent: jules  |  Date: 2024-05-24  |  Build: main

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Start the local dev server and load the game.
2. Select Jacob, choose "Begin the Story", and turn on Free Play.
3. Select "I-95 Northbound" chapter.
4. Observe the characters in the level.
5. Notice Jordan's sprite at the start.
6. Play through the chapter briefly.

## Bugs found
### BUG-1 — Jordan's sprite is improperly preprocessed, showing the entire spritesheet with overlaid text
- Severity: major
- Where: I-95 Northbound highway map, center lane (Jordan's spawn position)
- Repro: Load `nyc_1am_drive` chapter. Observe Jordan on the road.
- Expected vs actual: Expected to see a correctly preprocessed single idle frame. Actual: We see the raw unsliced spreadsheet or multiple slices overlapping, containing the character sprites and the name "Jordan".
- Evidence: screenshot_play_1.png
- Suspected area (optional): `src/game/SpritePreprocessor.ts` or `src/game/ChapterScene.ts` (the way `hero_jordan.jpg` is being parsed/sliced, possibly hitting a fallback or incorrect `preprocessShowcaseSheet` logic).

## Console warnings/errors
- `GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

## Notes / things that felt off (not necessarily bugs)
- There are some decorative bushes visible directly on the dark road lanes, which feels a little strange for the I-95 highway but may be intended or randomly placed.