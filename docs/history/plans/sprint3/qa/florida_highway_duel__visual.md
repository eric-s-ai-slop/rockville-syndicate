# QA Report — florida_highway_duel (The Florida Highway Duel) — lens: visual
Agent: jules  |  Date: 2024-06-13  |  Build: HEAD

## Verdict: FAIL

## Steps played
1. Opened game and entered Freeplay mode (`f`).
2. Navigated to and selected "The Florida Highway Duel".
3. Skipped intro dialogue and explored the scene to hunt for visual bugs (broken sprites, missing assets, background boxes).
4. Inspected the location of Jordan's Mustang and Maharko's Camaro.
5. Investigated the guardrails and palm trees.

## Bugs found
### BUG-1 — Garbled car sprites displaying full atlas
- Severity: blocker
- Where: The Meat Market parking lot, where Jordan's Mustang and Maharko's Camaro should be.
- Repro: Enter the "florida_highway_duel" chapter and look to the left.
- Expected vs actual: Expected to see a red Mustang and a black Camaro. Actual: Instead of the correct frames, the entire `small_props_atlas` texture sheet is displayed squished into the dimensions of the car props, indicating a frame mapping or atlas packing error.
- Evidence: `florida_1.png` / `florida_explore1.png` / dumped object data showing scale manipulation on `small_props_atlas` without specific frames being used.
- Suspected area (optional): `src/game/ChapterScene.ts` inside `drawDecorativeRect` and `packSpriteAtlas` or `createProceduralTextures` - the atlas is created dynamically but individual frames (`prop_jordan_mustang`, `prop_maharko_camero`) are loaded as whole images instead of atlas frames, or the fallback drawing is improperly scaling the atlas image.

### BUG-2 — Background-boxed guardrails
- Severity: polish
- Where: Across the highway, at Y:230 and Y:410
- Repro: Enter the chapter and observe the highway.
- Expected vs actual: Guardrails should likely be rendered using the `pack_rail` sprites (`guardrail_h`), but they are currently rendered as primitive filled rectangles (gray/silver boxes).
- Evidence: Visual inspection, object dump shows Rectangles at Y=230 and Y=410 with fill color 0x4b5563 instead of image sprites.
- Suspected area (optional): `src/game/ChapterScene.ts` in `drawDecorativeRect` or `src/data/chapters.ts` config for `propType: 'guardrail'`. The mapping for `guardrail` propType might be incomplete.

### BUG-3 — Missing Palm Trees (Background-boxed)
- Severity: major
- Where: The top right area near Boca skyline (Y=170/120 and Y=180/130).
- Repro: Enter the chapter and look right of the Meat Market.
- Expected vs actual: Palm trees should be rendered with sprite textures. Actual: Rendered as primitive brown vertical rectangles for trunks and green boxes for leaves.
- Evidence: Object dump shows primitive rectangles at x:700, x:820 with no corresponding tree textures loaded.
- Suspected area (optional): `src/data/chapters.ts` where palm trees are defined without `propKey` attributes.

## Console warnings/errors
- `error: %s a style property during rerender... Updating borderColor borderLeft`
- `warning: [.WebGL-0x32c05aeb400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`

## Notes / things that felt off (not necessarily bugs)
- There is no specific frame index or key applied to the cars, so the fallback engine just renders the base `small_props_atlas` image with the rect dimensions, looking extremely glitchy.
