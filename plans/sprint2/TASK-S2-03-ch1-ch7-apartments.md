# TASK-S2-03 — Chapter passes: Ch1 (Apartment 1522) + Ch7 (Commons 1522)

## Goal
Give every object rect in **Ch1 `spotify_insurgency`** and **Ch7 `spain_betrayal`** (both `theme: 'apartment'`) a
real furniture identity so nothing renders as a bare rectangle. These are the most furniture-dense rooms — the
screenshot the owner sent (rectangle couches/TV/fridge/windows) is this chapter.

## Depends on
- **TASK-S2-01 + TASK-S2-02 merged** (catalog + renderer). You only edit **data** in `src/data/chapters.ts`.
  Rebase on `main` after those land.

## House Rules
- **Do not change `x/y/w/h` of any rect that is `solid: true`** (those are collision bodies). You may add/adjust
  `propType` and `propKey`, and you may add **new non-solid** decorative rects. Non-solid rects' sizes can be
  tuned for looks.
- Done = `tsc --noEmit` + `npm run build` clean, and you've **looked at both chapters in-game**.

## How a chapter pass works (the method)
1. Find the chapter's `objects: [ … ]` array. **Ch1 ≈ lines 201–214; Ch7 ≈ lines 1068–1078** of `chapters.ts`
   (verify — line numbers drift). Each entry is `{ x, y, w, h, fill, stroke?, propType?, propKey?, solid? }`.
2. For **every** rect, decide what it represents (the `fill` color + position + any stale comment tells you), then:
   - If it already has a `propType` that maps to furniture (couch/tv/desk/counter/sink/fridge/bed) → leave the
     propType (TASK-02 now renders it as a sprite). Optionally pick a **specific** catalog variant via
     `propKey: 'furn_<name>'` (e.g. a long couch → `propKey: 'furn_couch_long'`).
   - If it's a **bare colored rectangle** (no propType) that is clearly an object → give it the right `propType`
     or a `propKey: 'furn_<name>'`.
   - If it's a **window** → `propType: 'window'` (renders the Room_Builder window).
   - If it's a **wall** → leave it (walls stay as walls; optional polish: a wall-tile pass is out of scope here).
3. Add tasteful **extra furniture** to fill empty apartment space using `propKey: 'furn_<name>'` non-solid rects:
   bookshelf, armchair, coffee_table, plant_tall/plant_small, rug_large (as a `propType: 'rug'` under the couch),
   table_lamp, tv_stand under the TV. Keep it believable for a college apartment; don't block walk paths.

## Catalog names you can use (from TASK-01's contract)
`couch, couch_long, armchair, ottoman, coffee_table, tv, tv_stand, bookshelf, desk, office_chair, chair, stool,
floor_lamp, table_lamp, rug_large, rug_small, plant_tall, plant_small, plant_palm, fridge, counter, sink, bed_single,
bed_double, nightstand, wardrobe, dresser, mirror, window`. Reference as `propKey: 'furn_<name>'`.

## Ch1 specifics (`spotify_insurgency`, ~line 192)
Known rects (verify against file): rug (`propType:'rug'`), couch (`propType:'couch'` — make it `furn_couch_long`),
tv (`propType:'tv'` — add a `furn_tv_stand` non-solid rect just below it), desk (`propType:'desk'` — add a
`furn_office_chair`), counter + sink + fridge (kitchen — `counter`/`sink`/`fridge`), door (`propType:'door'`).
Fill the room: a bookshelf against a wall, a plant in a corner, a coffee_table on the rug.

## Ch7 specifics (`spain_betrayal`, ~line 1057)
Known rects: couch, tv, a large desk (the "war room" table — use `furn_desk` or `furn_coffee_table` scaled), door.
This is the betrayal group-chat scene — make it read as a lived-in apartment/common room. Add bookshelf, plants,
chairs around the desk, a rug.

## Acceptance criteria
- No bare rectangles remain as "furniture" in Ch1 or Ch7 — couch/TV/desk/kitchen/windows are all LimeZu sprites.
- Rooms feel furnished (added decor), nothing overlaps the player spawn or blocks required walk paths / the door.
- Collision unchanged: solid rects keep their original `x/y/w/h`.
- `npx tsc --noEmit` + `npm run build` clean. PR includes a screenshot of each chapter.
