# QA Report — spotify_insurgency (The Spotify Family Insurgency) — lens: visual
Agent: Jules  |  Date: 2024-06-13  |  Build: da02370

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Launched local dev server and navigated to the app via Playwright.
2. Selected "Eric Huang" -> "Begin the Story" -> "The Spotify Family Insurgency".
3. Clicked through the initial dialogue sequence with Eric.
4. Used WASD to walk the player character around the entire apartment 1522.
5. Systematically observed the desk area, living room (rug, couch, TV), and kitchen.

## Bugs found
### BUG-1 — Background-boxed prop at Command Desk
- Severity: polish
- Where: Eric's command desk (top-left, approx `x: 180, y: 150`)
- Repro: Walk to the command desk on the left side of the room.
- Expected vs actual: The placeholder map rect should be hidden once the sprite loads. Actual: The flat colored bounding box (`fill: C.desk, stroke: 0x64748b`) renders visibly underneath the `furn_desk` sprite, extending below it.
- Evidence: `real_desk.png`
- Suspected area (optional): Map renderer likely isn't hiding the base `rect` when a `propKey` is present.

### BUG-2 — Giant pixelation / wrong scale on Living Room Rug
- Severity: minor
- Where: Living room center (approx `x: 460, y: 380`)
- Repro: Walk to the center of the living room.
- Expected vs actual: The rug sprite should have a consistent pixel density with characters. Actual: The `furn_rug_large` sprite is massively scaled up, creating giant pixels that clash with the game's art style.
- Evidence: `real_middle.png`
- Suspected area (optional): `chapters.ts` rug rect size (`w: 320, h: 200`) forces the sprite to stretch aggressively, or the sprite asset itself is too small.

### BUG-3 — Couch sprite size/aspect mismatch
- Severity: minor
- Where: Living room, behind Nick H (approx `x: 460, y: 300`)
- Repro: Look at the couch behind Nick H.
- Expected vs actual: The `furn_couch_long` sprite should represent the full width of its collision box (`w: 180`). Actual: The sprite renders as a tiny square cushion, completely failing to match the physical bounds of the long couch.
- Evidence: `real_middle.png`
- Suspected area (optional): The sprite might be missing frames, or the wrong `propKey` is used for a long couch.

### BUG-4 — Duplicate TV rects / missing cabinet sprite
- Severity: minor
- Where: Living room TV area (approx `x: 460, y: 250`)
- Repro: Look at the wall above the couch.
- Expected vs actual: A single cabinet/TV prop should render properly. Actual: There are duplicate overlapping rects in the chapter data (one with `propType: 'tv'`, one with `propKey: 'furn_cabinet_tall'`), resulting in just a solid dark blue geometric box being visible without the intended cabinet sprite.
- Evidence: `real_desk.png` (bottom right), `chapters.ts`
- Suspected area (optional): `src/data/chapters.ts` has two rect entries for the TV at the exact same coordinates.

### BUG-5 — Missing assets for Kitchen Counter and Fridge (Gray Boxes)
- Severity: minor
- Where: Kitchen area (top-right, approx `x: 720` to `860`)
- Repro: Walk to the kitchen area.
- Expected vs actual: The kitchen counter, sink, and fridge should have sprites. Actual: They lack a `propKey` and render as flat gray/blue geometric boxes.
- Evidence: `real_kitchen.png`
- Suspected area (optional): `chapters.ts` map data is missing `propKey` values for these rects.

## Console warnings/errors
- `WebGL warning: readPixels: GPU stall due to ReadPixels`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true`

## Notes / things that felt off (not necessarily bugs)
- The initial spawn area at the bottom of the map appears completely pitch black until the player walks further up into the apartment.
- Nick H is labeled "(asleep)" but his sprite is standing perfectly upright with eyes open.
