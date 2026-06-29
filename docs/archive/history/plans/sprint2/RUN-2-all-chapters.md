> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# RUN 2 — All chapter prop passes (data-only)

The furniture sprite system is live (RUN 1): `drawPropShape` renders a real LimeZu sprite for any rect whose
`propType` maps to furniture, or whose `propKey` is `furn_<name>`. Your job is **coverage**: go through **every
chapter** and give each object rect a real identity so nothing renders as a bare rectangle. **You only edit data**
in `src/data/chapters.ts` — do not touch renderer code.

Work **one chapter block at a time**, in this order: Ch1, Ch7, Ch8, Ch3, Ch2, Ch5, Ch4, Ch6. Commit/verify per
chapter if you can.

## House Rules (must follow)
- **Do NOT change `x/y/w/h` of any `solid: true` rect** — those are collision bodies. You may add/adjust
  `propType` and `propKey`, and add **new non-solid** decorative rects (their sizes can be tuned for looks).
- Don't block the player spawn, required walk paths, doors, or boss arenas with new decor.
- Done = `npx tsc --noEmit` + `npm run build` clean, and you've **looked at each chapter in-game**.

## The method (same for every chapter)
1. Find the chapter's `objects: [ … ]` array. Each entry: `{ x, y, w, h, fill, stroke?, propType?, propKey?, solid? }`.
2. For every rect, decide what it is (fill color + position + any comment), then:
   - Already has a furniture `propType` (couch/tv/desk/counter/sink/fridge/bed/bench/window) → leave it (it now
     renders a sprite). Optionally pick a specific variant via `propKey: 'furn_<name>'`.
   - Bare colored rectangle that's clearly an object → give it the right `propType`, or a `propKey: 'furn_<name>'`.
   - A **window** → `propType: 'window'`. A **wall** → leave it (walls stay walls).
3. Add tasteful **extra furniture** (non-solid `propKey:'furn_<name>'` rects) to fill empty space — don't overdo it.

## Catalog names available (from RUN 1 — reference as `propKey: 'furn_<name>'`)
`couch, couch_long, couch_purple, armchair, ottoman, coffee_table, bench, chair, desk, desk_study, bookshelf,
bookshelf_wide, sideboard, dresser, nightstand, wardrobe, cabinet_tall, bed_single, bed_double, rug_large,
rug_woven, rug_blue, chalkboard, tv, mirror, globe, window, counter, counter_wood, plant_tall, plant_small,
picture_arrow_l, picture_arrow_r`.

**No sprite for these (leave as the current procedural shape — do NOT force a furniture key):** `sink`, `fridge`,
`door`. **`toilet`** stays on its Ch3 showcase art. **Cars, jungle gym, watchwater house** keep their existing
showcase `propKey` — leave them. **tollbooth/guardrail/firepit/hottub/arcade** are handled in RUN 3 — **leave their
`propType` untouched** (do not assign a propKey).

---

## Per-chapter notes

### Ch1 `spotify_insurgency` (apartment) — the headline screenshot
Rug, couch (`furn_couch_long`), TV (+ add a `furn_tv_stand`? no — use `furn_cabinet_tall` low, or skip), desk
(`furn_desk` + add a `furn_chair`), kitchen counter/sink/fridge (counter→sprite, sink/fridge stay procedural),
door (procedural). Fill: a `furn_bookshelf` on a wall, `furn_plant_tall` in a corner, `furn_coffee_table` on the rug.

### Ch7 `spain_betrayal` (apartment) — war-room/common room
Couch, TV, the big "war room" desk (`furn_desk` or a long table), door. Add `furn_bookshelf`, `furn_plant_tall`,
`furn_chair`s around the desk, a `furn_rug_large`.

### Ch8 `cabin_basye` (cabin) — prop-dense
Beds (`furn_bed_double`/`furn_bed_single` by width; add `furn_nightstand`s), couch (`furn_couch`), tv, counter, door.
Add `furn_plant_tall`, `furn_rug_large`, `furn_wardrobe`/`furn_dresser`. **Leave hottub/firepit/arcade alone (RUN 3).**

### Ch3 `red_pee_bladder` (hospital)
Keep the showcase props (`prop_hospital_bed`/`prop_iv_drip`/`prop_cabinet`/`prop_red_toilet`). Window → `propType:
'window'`. The secondary bare `bed` rect → `furn_bed_single` or remove if duplicate. Add a `furn_chair`,
`furn_nightstand`, `furn_plant_small`. Keep the Audrey boss arena clear.

### Ch2 `nyc_1am_drive` (highway_night)
Nick F's corolla keeps its propKey. **tollbooth/guardrail → leave for RUN 3.** Any generic `propType:'car'` with no
propKey → set its propKey to one of the existing car keys (`prop_nick_f_corolla`/`prop_jordan_mustang`/
`prop_maharko_camero`) as a stand-in. Flag any bare square you can't identify in the PR.

### Ch5 `florida_highway_duel` (florida)
Jordan's mustang + Maharko's camero keep their propKeys. **guardrail → RUN 3.** Generic cars → stub with existing
car keys. Road stripes are procedural — leave.

### Ch4 `jungle_gym_gambit` (park)
Keep the jungle gym showcase. `bench` → sprite (verify). Trees/foliage stay procedural/nature scatter. Add a
`furn_bench` or `furn_plant_tall` if it helps; flag any playground rect with no asset.

### Ch6 `ding_dong_ditch_ben` (suburb_night)
Keep the watchwater house + door. Generic cars (getaway/parked) → stub with existing car keys. Hedges (`0x0f2a0f`
squares) → leave as foliage decals or nature; don't leave flat squares. Street-lamp poles can stay thin primitives.

## Acceptance criteria
- No bare "furniture" rectangles remain in any chapter (each rect is a sprite, a stub, a wall, a procedural
  sink/fridge/door, or explicitly flagged).
- Rooms feel furnished; nothing blocks spawns/paths/doors/boss arenas. Solid rects keep original `x/y/w/h`.
- tollbooth/guardrail/firepit/hottub/arcade untouched (RUN 3 owns them).
- `tsc`/`build` clean. PR includes a screenshot per chapter + a list of any rects you flagged as needing assets.