# QA Report — spain_betrayal (The Spain Betrayal) — lens: visual
Agent: Jules  |  Date: 2024-05-24  |  Build: 0cfcc14

## Verdict: FAIL

## Steps played
1. Opened the game, navigated to Free Play, and launched Chapter 7: "The Spain Betrayal". → Spawned into the Commons Apartment 1522 scene.
2. Explored the starting room with Nick Farrar and Maharko. → The map and all props rendered as plain flat rectangular colors rather than pixel art sprites.

## Bugs found
### BUG-1 — Missing textures/background-boxed props for the entire environment
- Severity: major
- Where: Entire map "Commons Apartment 1522"
- Repro:
  1. Load "The Spain Betrayal" in Free Play mode.
  2. Observe the map's environment and props.
- Expected vs actual: The environment (walls, rug, couch, desks, TV, door) should render with their respective pixel art textures. Actual: All environment props render as primitive, background-boxed colored rectangles.
- Evidence: `screen_0.png`
- Suspected area: `src/data/chapters.ts` in the `spain_betrayal` chapter's `map.rects` definition. Several rects (walls, tv, door, zelle notification) are missing the `propKey` property entirely. Props that do have `propKey` (like `furn_rug_large`) appear to be failing to load or are incorrectly configured, falling back to primitive rectangles.

## Console warnings/errors
- None specific to this bug currently visible in the summary, but likely missing texture/frame warnings if `propKey` textures aren't found.

## Notes / things that felt off (not necessarily bugs)
- The labels floating around the map (like the evidence wall and the google doc) aren't visually styled, though this might be intended as debug labels.
