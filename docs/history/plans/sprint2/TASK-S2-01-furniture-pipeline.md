> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-S2-01 — Furniture pipeline + catalog (FOUNDATION)

## Goal
Make the LimeZu furniture tilesheets usable as individual sprites. Produce (a) a **slicing pipeline** that cuts the
packed sheet into individual background-trimmed furniture textures, and (b) a **labeled catalog** mapping stable
semantic names → those textures. Everything else in Sprint 2 depends on this.

**You are building infrastructure, not changing any chapter's look yet.** Success = other code can call
`getFurnitureTexture('couch')` (or reference `furn_couch`) and get a clean couch sprite.

## House Rules
- Never change physics/collision rects. Graceful fallback if a sheet fails to load (the game must still run).
- No new heavy deps. Phaser 3.88.2. Done = `tsc --noEmit` + `npm run build` clean. `npm test` still passes.

## Inputs (already in the repo)
- `src/assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png` — **768×4272** furniture.
- `src/assets/images/game_decor/Interiors_free/48x48/Room_Builder_free_48x48.png` — **816×1104** walls/floors,
  plus a door/window/ceiling section near the top.
- Items sit on a **transparent background** with gaps between them, on a 48px grid. Multi-tile items (sofas, beds,
  wardrobes) span several grid cells but are visually separated from neighbours by transparent gaps.

## Existing code to reuse (do NOT reinvent)
- `src/game/SpritePreprocessor.ts` — has a **connected-component (BFS island) extractor** with transparent-bg
  detection and noise filtering. This is the engine for auto-slicing.
- Sprint-1's `src/game/PropExtractor.ts` (if merged) — single-subject crop with aspect ratio. Same techniques.
- `generatePropsAtlas()` in `ChapterScene.ts` (~line 2904) — shows how this project builds a Phaser atlas from a
  canvas with manual frame definitions. Mirror this for the furniture atlas.

## ⭐ A verified seed catalog already exists — START FROM IT
The architect has already inspected the sheet and produced **`plans/sprint2/furniture_catalog_seed.json`** —
exact, visually-confirmed pixel rects for ~24 core items (couch red + purple, armchair, ottoman, bench, bed_single/
double, desk, desk_study, bookshelf (tall + wide), wardrobe, sideboard, dresser, nightstand, coffee_table,
chalkboard, tv/monitor, rugs, cabinet_tall, framed pictures). **Use these coordinates directly — do not re-derive
them.** Supporting tooling is in `plans/sprint2/assets/`:
- `slice_furniture.py` — the exact connected-component detector used (deterministic; alpha≤12 = bg, merge pad=3).
- `furniture_boxes.json` — all 140 detected islands (`[x,y,w,h]`).
- `kitchen_detect.py` + `kitchen_boxes.json` — the kitchen/bath sub-region re-detected (43 sub-items).
- `kitchen_region.png`, `heroes_a/b.png`, `m_0/1.png` — labeled montages for visual reference.

**The seed is now COMPLETE for everything the free pack contains** — a 2nd pass pinned the kitchen `counter`
(+`counter_wood`), `chair`, `window`, `plant_tall`, `plant_small`, `mirror`, and `globe` with exact coords (see the
`confirmed` block). The seed's **`absent_from_free_pack`** block lists items the free pack genuinely lacks
(`fridge`, `sink`, `stove`, `toilet`, `bathtub`, `door_closed/open`) with the resolution for each — **follow those
resolutions** (mostly: keep the existing procedural shape; toilet stays on the Ch3 showcase art). Items in
`optional_decor_not_pinned` (palm, lamps, fruit_bowl) are low-priority decor — pin them later from the montages in
`assets/` only if you want them. **You do not need to do further labeling** — implement the pipeline against the
seed as-is. Supporting grid-crops `counter_zoom.png`, `win_chairs.png`, `plants.png` are in `assets/` if you want to
sanity-check a rect.

## Approach — auto-slice + label (de-risks pixel-picking)

### Step 1 — Auto-extract every furniture island
Write `src/game/furnitureCatalog.ts`. At runtime (in `ChapterScene` preload/create), load the Interiors 48×48 sheet
and run connected-component extraction over it (alpha < threshold = background; flood-fill non-transparent regions):
- For each island, compute its bounding box. **Filter noise** (ignore < ~20px boxes; ignore the text/scribble
  doodads). **Snap** each bbox out to the 48px grid edges (so a sofa keeps its full footprint) — round minX/minY
  down and maxX/maxY up to multiples of 48.
- **Guard against over-merging:** adjacent items separated by only 1–2px of stray pixels can merge into one island.
  If an island's grid footprint is implausibly large (e.g. > 6×6 tiles), treat it as a "section" and fall back to a
  **manual rect** from the override table (Step 3). Most items are 1×1 to 3×3 tiles.
- Crop each accepted island into its own canvas (trim transparent margins, keep aspect ratio), and remember
  `{ index, sx, sy, sw, sh, aspect }`.

### Step 2 — Build a numbered preview so a human can label them (one-time)
Add a **dev-only** helper (guarded by `import.meta.env.DEV`) that, when a URL flag like `?furniturePreview=1` is
present, renders all extracted islands in a grid with their **index number** overlaid, and also `console.log`s the
index→bbox table as JSON. Run it once, screenshot/inspect, and hand the numbered preview to the project owner (or
label it yourself if confident). This is how we get accurate labels without guessing pixel coordinates.
> Deliver the numbered preview image + the JSON dump in your PR so the owner can sanity-check the labeling.

### Step 3 — The labeled catalog (the contract)
Produce a static map from **semantic name → source rect** in `furnitureCatalog.ts`. Seed it from the labeled
preview. Use the **Catalog Naming Contract** below (these exact keys; downstream tasks depend on them). For any item
the free pack genuinely lacks, **omit it and list it in the PR**.

```ts
// src/game/furnitureCatalog.ts
export interface FurnitureRect { sheet: 'interiors48' | 'roombuilder48'; sx: number; sy: number; sw: number; sh: number; }
// Semantic name → rect in the source sheet. Coordinates verified via the numbered preview (Step 2).
export const FURNITURE_CATALOG: Record<string, FurnitureRect> = {
  couch:        { sheet: 'interiors48', sx: /*…*/, sy: /*…*/, sw: /*…*/, sh: /*…*/ },
  couch_long:   { /*…*/ },
  armchair:     { /*…*/ },
  ottoman:      { /*…*/ },
  coffee_table: { /*…*/ },
  tv:           { /*…*/ },
  tv_stand:     { /*…*/ },
  bookshelf:    { /*…*/ },
  desk:         { /*…*/ },
  office_chair: { /*…*/ },
  chair:        { /*…*/ },
  stool:        { /*…*/ },
  floor_lamp:   { /*…*/ },
  table_lamp:   { /*…*/ },
  rug_small:    { /*…*/ },
  rug_large:    { /*…*/ },
  plant_small:  { /*…*/ },
  plant_tall:   { /*…*/ },
  plant_palm:   { /*…*/ },
  globe:        { /*…*/ },
  chalkboard:   { /*…*/ },
  bed_single:   { /*…*/ },
  bed_double:   { /*…*/ },
  nightstand:   { /*…*/ },
  wardrobe:     { /*…*/ },
  dresser:      { /*…*/ },
  mirror:       { /*…*/ },
  counter:      { /*…*/ },
  counter_corner:{ /*…*/ },
  sink:         { /*…*/ },
  fridge:       { /*…*/ },
  stove:        { /*…*/ },
  cabinet_upper:{ /*…*/ },
  fruit_bowl:   { /*…*/ },
  toilet:       { /*…*/ },
  bathtub:      { /*…*/ },
  bath_sink:    { /*…*/ },
  window:       { sheet: 'roombuilder48', /*…*/ },
  door_closed:  { sheet: 'roombuilder48', /*…*/ },
  door_open:    { sheet: 'roombuilder48', /*…*/ },
};
```
**Where things are** (from inspecting the sheet — regions, to orient labeling; verify exact rects via Step 2):
- Upper sheet: school/office desks, chairs, benches, **green & black chalkboards**, **globes**, bookshelves, rugs.
- Upper-middle: **purple sofas / ottomans / loveseats**, **TV/large screen**, **potted plants + palm**, wardrobes.
- Middle: armchairs, beds w/ frames, **nightstands**, **table & floor lamps** (red/blue/cream), **mirrors**,
  **dressers**, **fruit bowls/baskets**, side tables.
- Lower sheet: **kitchen** (counters, corner counters, **sink**, **stove**, **fridge**, upper cabinets) and
  **bathroom** (toilet, bathtub, sink) and shelving.
- Room_Builder sheet: walls + floor tiles; a **door/ceiling** section is near the top — windows/doors come from here.

### Step 4 — Bake into a Phaser atlas + accessor
- Compose all cropped furniture into ONE atlas texture `furniture_atlas` (mirror `generatePropsAtlas()`'s
  canvas-pack + `this.textures.addAtlas(...)` approach), with each frame named `furn_<name>`.
- Export a helper so the renderer can resolve names cleanly:
  ```ts
  export function furnitureFrame(name: string): string | null; // returns `furn_${name}` if in catalog, else null
  export function furnitureAspect(name: string): number | undefined;
  ```
  Keep an exported `FURNITURE_NAMES` list and the aspect map (compute aspect from the cropped sizes).
- Guard the whole pipeline in try/catch; if the sheet is missing, leave `furniture_atlas` absent so the renderer
  falls back to primitives.

## Acceptance criteria
- `furniture_atlas` exists at runtime with frames `furn_couch`, `furn_tv`, `furn_bed_double`, `furn_fridge`,
  `furn_counter`, `furn_desk`, `furn_chair`, `furn_bookshelf`, `furn_plant_tall`, `furn_rug_large`, `furn_window`,
  etc. (every Catalog Naming Contract key that exists in the free pack).
- Each frame is a single, background-stripped furniture item at natural aspect ratio.
- The numbered preview + JSON dump are attached to the PR; the catalog coordinates are verified against it.
- Nothing renders differently in-game yet (no chapter edits in this task) and the game still runs if the sheet
  is absent.
- PR lists any contract names that the free pack lacks.
- `npx tsc --noEmit`, `npm run build`, `npm test` all clean.