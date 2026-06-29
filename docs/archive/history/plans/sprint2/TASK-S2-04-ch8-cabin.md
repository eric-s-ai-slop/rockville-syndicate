> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-S2-04 — Chapter pass: Ch8 (The Cabin, Basye VA)

## Goal
Replace every primitive rect in **Ch8 `cabin_basye`** (`theme: 'cabin'`) with real sprites. This is the most
prop-dense room (beds, couch, tv, counter, + cabin specials: hot tub, firepit, arcade).

## Depends on
- **TASK-S2-01 + TASK-S2-02 merged.** You edit **data** in `src/data/chapters.ts` (Ch8 block, ~lines 1213–1249).
- **Hot tub / firepit / arcade are NOT in the asset pack** — they are owned by **TASK-S2-08** (procedural upgrade).
  For those three, **leave the `propType` as-is** (`hottub`/`firepit`/`arcade`) and do not invent a `propKey`;
  TASK-08 will make them look good. Coordinate: if TASK-08 hasn't merged, they'll keep the current primitive — fine.

## House Rules
- Don't change `x/y/w/h` of `solid:true` rects. Done = `tsc --noEmit` + `build` clean + looked at it in-game.

## The pass (method)
Ch8 `objects` ≈ lines 1225–1249. Known rects: multiple **beds** (`propType:'bed'` → `furn_bed_single` /
`furn_bed_double` by width), **tv** (`furn_tv` + `furn_tv_stand`), **couch** (`furn_couch`), **counter**
(`furn_counter`, tiled if wide), **hottub**, **firepit**, **arcade** (leave for TASK-08), and a **door**.

For each:
- beds → set `propKey: 'furn_bed_double'` for wide beds, `'furn_bed_single'` for narrow; add `nightstand`s beside
  them as non-solid decor.
- couch → `propKey: 'furn_couch'`; tv → `propType:'tv'` (+ `furn_tv_stand` non-solid under it).
- counter → `propType:'counter'`.
- door → `propType:'door'`.
- Add cabin-appropriate decor (non-solid `furn_*`): `plant_tall`, `rug_large` (as `propType:'rug'`), `bookshelf`,
  `armchair`, `floor_lamp`, `dresser`/`wardrobe` for the bedroom corners.
- **hottub / firepit / arcade**: leave alone (TASK-08).

## Acceptance criteria
- Beds, couch, TV, counter, door are LimeZu sprites; the room reads as a furnished cabin.
- hottub/firepit/arcade untouched (still their current look until TASK-08 lands).
- Solid collision rects unchanged. `tsc`/`build` clean. Screenshot in PR.