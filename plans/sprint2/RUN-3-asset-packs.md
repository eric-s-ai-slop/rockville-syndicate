# RUN 3 — Wire the new asset packs (toll booth, guardrail, hot tub, arcade)

The furniture system + chapter passes are done (RUN 1 & 2). This run wires the 5 owner-added asset packs for the
props that had no sprite. Coordinates are pre-pinned in **`plans/sprint2/asset_pack_seed.json`** — read it first and
implement against it. Reference grid-crops: `plans/sprint2/assets/` (`tb_booth.png`, `tb_arms.png`, `car_R.png`,
`pack_rail_0.png`, `pack_pool_0.png`, `pack_arcade_0.png`).

Files on disk (all **1408×768 JPGs — NO alpha**, gray mockup background baked in):
- `src/assets/images/game_decor/special/toolbooth.jpg`
- `src/assets/images/game_decor/special/rail.jpg`
- `src/assets/images/game_decor/special/pool.jpg`
- `src/assets/images/game_decor/special/arcade cab.jpg`  ← note the space → use Vite `?url` import
- `src/assets/images/game_decor/special/cars.jpg`

## House Rules
- Never change physics/collision rects. Graceful fallback to the current primitive if a sprite fails to extract.
- **These are JPGs with a gray background baked in** — extraction must **key out the gray by color** (reuse the
  background-color detection in `preprocessShowcaseSheet` / `PropExtractor`: sample bg, treat near-bg as
  transparent). The per-sheet bg RGB is in the seed (`_bg`); tolerance ~26.
- Filenames with spaces → `?url`. No new deps. `tsc`/`build`/`test` clean. Surgical diff.

## Extraction (shared, do once)
For each needed sprite: crop its `{sx,sy,sw,sh}` from the sheet, color-key the gray bg to transparent, store as a
texture `pack_<name>` (or bake into a small atlas like `generatePropsAtlas()`). Then render via the
`drawFurnitureSprite` contain-fit + Y-sort helper from RUN 1. Guard everything; missing sheet → primitive fallback.

These are AI-generated mockups — expect to trim a few stray px and tune size/anchor in-engine.

## What to wire (the `rec:true` items in the seed)

### Toll booth (Ch2) — use BOTH a backdrop + barrier arms
- `tollbooth_front` (`@40,470 690×195`) → wide **backdrop billboard along the TOP edge** of the Ch2 highway map
  (non-solid scenery, low depth so it sits behind play). This flat front elevation reads head-on — use it, NOT the
  isometric `tollbooth_iso`.
- `barrier_arm_down` (`@1040,295 185×55`) → laid **across the lane(s)** at the toll line.
- `cone` (`@1300,575 42×72`) → a few near the booth.
- Wire Ch2's `propType:'tollbooth'` rect to the backdrop; add non-solid rects for arms + cones. Don't change
  collision.

### Guardrail (Ch2 + Ch5)
- `guardrail_h` (`@32,93 366×214`; trim to the rail band ≈ `sy150 sh110`) → **tile horizontally** along top/bottom
  shoulders.
- `guardrail_v` (`@161,396 53×339`) → tile vertically for N–S shoulders.
- Wire `propType:'guardrail'` rects to these (tile across the rect). `road_satellite` (`@1055,387 322×354`) is an
  optional richer road backdrop.

### Hot tub (Ch8)
- `hottub` (`@1055,395 322×346`) → Ch8 `propType:'hottub'` rect. Contain-fit, Y-sorted. Optional: overlay
  `jets_detail` with a subtle looping tween for moving water.

### Arcade (Ch8)
- `arcade_cabinet` (`@64,344 122×196`) → Ch8 `propType:'arcade'` rect. Tall prop → bias depth `+24` (player stands
  in front).

### Firepit (Ch8) — STILL NO ASSET
No firepit pack exists. **Keep `propType:'firepit'` procedural**, upgraded to a stone ring + looping flame
particles (reuse `particle_dot` + the scene's tween/particle patterns; cap particle counts — don't regress perf).

### Cars (Ch2/Ch6) — OPTIONAL, low priority
RUN 2 already stubbed generic cars with the existing 3 hero car sprites (cleaner). The `cars.jpg` top-down cars are
embedded in a parking-lot scene on dark asphalt; only mine `car_blue/green/red` (`@~812/990/1170,250`) if you want
variety, and key out the asphalt too.

## Wire into chapter data (`src/data/chapters.ts`)
- Ch2 (~lines 332–340): `tollbooth` → backdrop; add arm/cone non-solid rects; `guardrail` rects.
- Ch5 (~lines 768–786): `guardrail` rects.
- Ch8 (~lines 1240–1249): `hottub`, `arcade` (firepit stays procedural).
Map propType → `pack_<name>` texture in `drawPropShape` the same way RUN 1 mapped furniture.

## Acceptance criteria
- Ch2: toll-plaza backdrop across the top + barrier arms across the lanes + cones; metal guardrails on the shoulders.
- Ch5: guardrails on the shoulders.
- Ch8: real hot tub + arcade sprites; firepit is a detailed procedural (stone + flame particles).
- Gray backgrounds fully keyed out (no gray boxes around sprites). Physics unchanged. Graceful fallback if a sheet
  is missing. `tsc`/`build` clean. Before/after screenshots of Ch2 + Ch8 in the PR.
