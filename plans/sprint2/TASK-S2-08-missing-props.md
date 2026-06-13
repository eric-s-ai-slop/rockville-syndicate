# TASK-S2-08 — Wire the new asset packs: toll booth, guardrail, hot tub, arcade (+ optional cars)

## Status: ✅ UNBLOCKED — assets are on disk and coordinates are pinned
The owner added 5 asset packs and the architect pinned every needed sprite. Implement against
**`plans/sprint2/asset_pack_seed.json`** (verified crop-rects). Reference grid-crops are in `plans/sprint2/assets/`
(`tb_booth.png`, `tb_arms.png`, `car_R.png`, `pack_*_0.png`).

Files on disk (all 1408×768 JPGs — **no alpha**):
- `src/assets/images/game_decor/special/toolbooth.jpg`
- `src/assets/images/game_decor/special/rail.jpg`
- `src/assets/images/game_decor/special/pool.jpg`
- `src/assets/images/game_decor/special/arcade cab.jpg` (note the space — `?url` import)
- `src/assets/images/game_decor/special/cars.jpg`

## Depends on
- **TASK-S2-02 merged** (the `drawFurnitureSprite` / catalog draw path). Reuse its contain-fit + Y-sort helper.

## House Rules
- Never change physics/collision rects. Graceful fallback to the current primitive if a sprite fails to extract.
- These are JPGs with a **gray mockup background baked in** (no transparency). Extraction must **key out the gray
  bg by color** — reuse `preprocessShowcaseSheet` / the Sprint-1 `PropExtractor` background-color detection (sample
  bg, treat near-bg as transparent). The per-sheet bg RGB is in the seed (`_bg`).
- Filenames with spaces → Vite `?url` import. No new deps. `tsc`/`build` clean. Surgical diff.

## Extraction pipeline (do this once, shared)
For each needed sprite, crop its `{sx,sy,sw,sh}` from the sheet, then strip the gray bg (color-key using the
sheet's `_bg`, tolerance ~26) into a transparent texture. Bake into a small atlas (mirror `generatePropsAtlas()`)
or register individual textures `pack_<name>`. Guard everything; missing sheet → primitive fallback.

## What to wire (from the seed — `rec:true` items are the picks)

### Toll booth (Ch2) — OWNER DECISION: use BOTH backdrop + arms
- `tollbooth_front` (`@40,470 690×195`) → a **backdrop billboard** along the **top edge** of the Ch2 highway map
  (a wide, non-solid scenery sprite; depth low so it sits behind play). The flat front elevation reads head-on in
  top-down — use this, **not** the isometric `tollbooth_iso`.
- `barrier_arm_down` (`@1040,295 185×55`) → laid **across the lane(s)** at the toll line (one per lane).
- `cone` (`@1300,575 42×72`) → a few cones near the booth for flavor.
- Wire the Ch2 `propType:'tollbooth'` rect to the backdrop; add non-solid rects for the arms + cones (don't change
  collision). `change_sign` / `barrier_arm_up` / `bollard` are optional extra detail.

### Guardrail (Ch2 + Ch5)
- `guardrail_h` (`@32,93 366×214`, trim to the rail band ~`sy150 sh110`) → **tile horizontally** along the
  top/bottom highway shoulders.
- `guardrail_v` (`@161,396 53×339`) → tile vertically for any N–S shoulder.
- Wire `propType:'guardrail'` rects to these (tile across the rect width/height). `road_satellite`
  (`@1055,387 322×354`) is a bonus top-down road backdrop tile if you want richer asphalt.

### Hot tub (Ch8)
- `hottub` (`@1055,395 322×346`) → the Ch8 `propType:'hottub'` rect. Contain-fit, Y-sorted. Optionally overlay
  `jets_detail` with a subtle looping tween for moving water (reuse the scene's tween patterns).

### Arcade (Ch8)
- `arcade_cabinet` (`@64,344 122×196`) → the Ch8 `propType:'arcade'` rect. Tall prop → bias depth `+24` so the
  player can stand in front (like wardrobe/fridge in TASK-02).

### Cars (Ch2/Ch6) — OPTIONAL
- The seed recommends **reusing the existing 3 hero car sprites** for generic-car stubs (cleaner). The top-down
  cars in `cars.jpg` are embedded in a parking-lot scene on dark asphalt; only mine `car_blue/green/red`
  (`@~812/990/1170, 250`) if you want variety, and expect to key out the asphalt too. Low priority.

### Firepit (Ch8) — STILL NO ASSET
No firepit pack was provided. **Keep the Ch8 `firepit` procedural** — upgrade it to a stone ring + looping flame
particles (the scene has `particle_dot` + tween patterns; see footstep dust / `startAmbientParticles`). Cap
particle counts (don't regress the R19 perf pass). If the owner later adds a firepit sprite, swap it in here.

## Wire into chapter data
After the sprites exist, update `src/data/chapters.ts`:
- Ch2 (~lines 332–340): `tollbooth` rect → backdrop; add arm/cone non-solid rects; `guardrail` rects.
- Ch5 (~lines 768–786): `guardrail` rects.
- Ch8 (~lines 1240–1249): `hottub`, `arcade` rects (firepit stays procedural).
Map these via `drawPropShape` (propType → `pack_<name>` texture) the same way TASK-02 maps furniture.

## Acceptance criteria
- Ch2: a toll-plaza backdrop across the top + barrier arms across the lanes + cones; metal guardrails along the
  shoulders. No stray rectangles.
- Ch5: guardrails along the shoulders.
- Ch8: real hot tub + arcade cabinet sprites; firepit is a detailed procedural (stone + flame particles).
- Gray backgrounds fully keyed out (no gray boxes around sprites). Physics unchanged. Graceful fallback if a sheet
  is missing. `tsc`/`build` clean. Before/after screenshots of Ch2 + Ch8 in the PR.
