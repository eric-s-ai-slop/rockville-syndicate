> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — cabin_basye (The Cabin) — lens: visual
Agent: jules  |  Date: 2024-06-13  |  Build: HEAD

## Verdict: FAIL

## Steps played
1. Opened the game using `npm run dev`.
2. Skipped to Chapter 8 ("The Cabin") using the Free Play chapter selector.
3. Advanced past dialogue using "I check my brokerage..."
4. Explored the entire cabin area, verifying sprites, map rects, backgrounds, and assets.
5. Observed hot tub, firepit, TV, and arcade sprites.

## Bugs found
### BUG-1 — Background-boxed props
- Severity: major
- Where: Throughout the map (hot tub, firepit, arcade, TV, door)
- Repro: Load into the `cabin_basye` map and explore the environment.
- Expected vs actual: The hot tub, firepit, TV, arcade, and door should be rendered as sprite assets. Actual: They render as primitive geometric shapes (background-boxed props with raw color fills and strokes) because they lack `propKey` properties mapping them to sprite assets.
- Evidence: `cabin_move6.png`
- Suspected area: `src/data/chapters.ts` in `cabin_basye` `rects` array (`propType: 'hottub'`, `propType: 'firepit'`, `propType: 'arcade'`, `propType: 'tv'`, `propType: 'door'`).

## Console warnings/errors
- `[error] %s a style property during rerender (%s) when a conflicting property is set (%s) can lead to styling bugs... Updating borderColor borderLeft`
- `[warning] [.WebGL-0x306404eaf600]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `[warning] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

## Notes / things that felt off (not necessarily bugs)
- Everything else functions fine, just missing textures / propKeys.