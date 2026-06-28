> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-S2-05 — Chapter pass: Ch3 (Shepherd University Hospital)

## Goal
Finish the prop pass for **Ch3 `red_pee_bladder`** (`theme: 'hospital'`). The headline hospital props (bed, IV,
cabinet, red toilet) already use showcase sprites; this task replaces the **remaining bare rectangles** (windows,
extra furniture, the secondary "bed" rect, etc.) with catalog sprites and furnishes the room.

## Depends on
- **TASK-S2-01 + TASK-S2-02 merged.** Edit **data** in `src/data/chapters.ts` (Ch3 block, ~lines 465–483).
- If **Sprint-1 TASK-01 (prop extraction)** also landed, the showcase hospital props now render clean/aspect-correct
  — don't undo that. Leave `propKey: 'prop_hospital_bed' | 'prop_iv_drip' | 'prop_cabinet' | 'prop_red_toilet'`
  rects as they are (those are the real photos/showcase art, not LimeZu furniture).

## House Rules
- Don't change `x/y/w/h` of `solid:true` rects. Done = `tsc`/`build` clean + viewed in-game.

## The pass
Ch3 `objects` ≈ lines 468–483. Handle:
- The **window** rect (`propType:'window'`) → now renders the Room_Builder window sprite (good, verify).
- The **secondary bed/pillow** rect that has `propType:'bed'` but **no** showcase `propKey` → either give it
  `propKey:'furn_bed_single'` or remove it if it visually duplicates the showcase bed. Use judgment.
- Any bare rectangles (side tables, monitors, chairs) → assign `furn_*`: `nightstand`, `chair`, `cabinet_upper`,
  `mirror`, `bath_sink` as appropriate for a hospital room.
- Add believable hospital decor (non-solid `furn_*`): a `plant_small`, a `chair` by the bed, a `nightstand`,
  maybe a `bookshelf`/`cabinet_upper` along a wall. Keep the clinical feel; don't clutter the boss arena
  (`arena: { x:430, y:320, w:780, h:500 }`).

## Acceptance criteria
- No stray rectangles in the hospital; windows + added furniture are sprites; the showcase bed/IV/cabinet/toilet
  remain their existing (clean) art.
- Boss arena stays clear enough to fight Audrey. Solid rects unchanged.
- `tsc`/`build` clean. Screenshot in PR.