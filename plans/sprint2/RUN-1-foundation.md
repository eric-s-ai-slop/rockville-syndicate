# RUN 1 — Furniture pipeline + renderer (FOUNDATION)

You are building the furniture-sprite system for a Phaser 3.88 + React + Vite + TS game. Today every couch/TV/desk/
bed is a code-drawn rectangle. This run (a) slices the LimeZu furniture tilesheet into real sprites and (b) rewires
the prop renderer to draw them. **Do both parts in this one task, in order.** Nothing renders differently until
Part B, so build Part A first, then Part B against it.

This is the foundation the rest of Sprint 2 depends on — correctness here matters more than speed.

## House Rules (must follow)
- **Never change physics/collision rects.** The body is invisible (`addMapObject` makes the body, `drawPropShape`
  draws the visual). Sprites may visually overflow the body — intended.
- Every asset load has a graceful fallback (`safeLoadImage` + `this.textures.exists(...)`). A missing sprite must
  fall back to the existing primitive shape — never blank, never crash.
- No new heavy deps. Phaser **3.88.2** (no Phaser 4 APIs). Don't reformat untouched code.
- Done = `npx tsc --noEmit` clean **and** `npm run build` clean **and** `npm test` still passes.

## Inputs already in the repo
- `src/assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png` — **768×4272** furniture sheet
  (transparent bg, 48px grid).
- `src/assets/images/game_decor/Interiors_free/48x48/Room_Builder_free_48x48.png` — walls/floor tiles.
- **`plans/sprint2/furniture_catalog_seed.json`** — ⭐ VERIFIED pixel coordinates for ~30 furniture items,
  hand-labeled by the architect. **Use these coordinates directly — do not re-derive them.** Read this file first.
- Reusable extractor: `src/game/SpritePreprocessor.ts` (`preprocessShowcaseSheet`) and, if present from Sprint 1,
  `src/game/PropExtractor.ts` — background-trim + single-subject crop logic.
- Atlas-build reference: `generatePropsAtlas()` in `src/game/ChapterScene.ts` (~line 2904) — shows how this project
  packs a canvas into a Phaser atlas with manual frames.

---

# PART A — Furniture pipeline + catalog

Create **`src/game/furnitureCatalog.ts`**.

### A1. Catalog data from the seed
Transcribe `plans/sprint2/furniture_catalog_seed.json` into a typed map. Use BOTH the `confirmed` and the
2nd-pass-pinned entries (counter, counter_wood, chair, window, plant_tall, plant_small, mirror, globe). Each entry is
a source rect on the Interiors sheet:
```ts
export interface FurnitureRect { sx: number; sy: number; sw: number; sh: number; }
export const FURNITURE_CATALOG: Record<string, FurnitureRect> = { /* from the seed */ };
```
Honor the seed's other sections:
- `absent_from_free_pack` (fridge, sink, stove, toilet, bathtub, door) → **do NOT** invent catalog entries; these
  intentionally fall back to procedural (Part B handles that).
- `optional_decor_not_pinned` (palm, lamps, fruit_bowl) → skip for now.

### A2. Slice + bake into an atlas at runtime
In `ChapterScene` preload/create (mirror the existing boss/coin processing blocks):
- Load the Interiors sheet (`safeLoadImage('interiors48', interiors48Url)` — import the PNG).
- For each catalog entry, crop its `{sx,sy,sw,sh}` from the loaded image into a canvas (the sheet bg is already
  transparent, so a plain crop works; if you see stray edge pixels, alpha-trim like `PropExtractor`).
- Pack all crops into ONE atlas texture **`furniture_atlas`** with frame names **`furn_<name>`** (e.g. `furn_couch`,
  `furn_bed_double`, `furn_counter`). Use the `generatePropsAtlas()` canvas-pack + `this.textures.addAtlas(...)`
  pattern.
- Record each frame's natural aspect ratio (`sw/sh`) in an exported map.
- Wrap in try/catch; if the sheet is missing, leave `furniture_atlas` absent (Part B falls back to primitives).

### A3. Accessors
```ts
export function furnitureFrame(name: string): string | null;   // `furn_${name}` if in catalog & atlas exists, else null
export function furnitureAspect(name: string): number | undefined;
```

**Part A acceptance:** `furniture_atlas` exists at runtime with clean, single-item frames for every catalog name
(`furn_couch`, `furn_tv`, `furn_bed_double`, `furn_counter`, `furn_desk`, `furn_chair`, `furn_bookshelf`,
`furn_rug_large`, `furn_window`, `furn_plant_tall`, …). Nothing renders differently yet. Game still runs if the
sheet is absent.

---

# PART B — Renderer rewire (`drawPropShape` consumes the catalog)

Edit `ChapterScene.drawPropShape()` (~line 949) and `drawDecorativeRect()` (~line 915).

### B1. propType → catalog default
```ts
private static readonly PROPTYPE_FURNITURE: Record<string, string> = {
  couch: 'couch', tv: 'tv', desk: 'desk', counter: 'counter',
  bed: 'bed_double', bench: 'bench', window: 'window',
  // 'sink'/'fridge'/'door' intentionally absent — no free-pack sprite (see seed.absent_from_free_pack);
  // they fall through to the existing procedural shapes, which is correct.
  // car/tree/junglebox keep existing handling; tollbooth/guardrail/firepit/hottub/arcade → handled in RUN 3.
};
```

### B2. Resolution order at the top of `drawPropShape()` (before the existing `switch`)
```ts
import { furnitureFrame, furnitureAspect } from './furnitureCatalog';
// (a) explicit catalog request: propKey === 'furn_<name>'
let frame: string | null = null, aspectName: string | null = null;
if (propKey?.startsWith('furn_')) { const n = propKey.slice(5); frame = furnitureFrame(n); aspectName = n; }
// (b) propType default → catalog
if (!frame && propType && ChapterScene.PROPTYPE_FURNITURE[propType]) {
  const n = ChapterScene.PROPTYPE_FURNITURE[propType]; frame = furnitureFrame(n); aspectName = n;
}
if (frame && this.textures.exists('furniture_atlas')) {
  this.drawFurnitureSprite(x, y, w, h, frame, aspectName!, propType);
  return;
}
// …KEEP the existing whole-image propKey + small_props_atlas branches (cars, hospital showcase) UNCHANGED…
// …KEEP the existing switch(propType) primitive fallback UNCHANGED…
```
**Do not break** the existing `propKey` (showcase/whole-image) and `small_props_atlas` branches — those serve the
cars and hospital props (and Sprint-1's aspect fixes). Order: explicit `furn_` → existing whole-image propKey →
propType→catalog → primitive.

### B3. `drawFurnitureSprite()` helper — aspect-correct, contain-fit, Y-sorted
```ts
private drawFurnitureSprite(x: number, y: number, w: number, h: number, frame: string, name: string, propType?: string) {
  const img = this.add.image(x, y, 'furniture_atlas', frame);
  const aspect = furnitureAspect(name);
  if (aspect && aspect > 0) {                 // CONTAIN-fit, never stretch
    let dw = w, dh = w / aspect;
    if (dh > h) { dh = h; dw = h * aspect; }
    const scale = 1.15;                        // furniture reads a touch larger than its body
    img.setDisplaySize(dw * scale, dh * scale);
  }
  img.setDepth(y);
  if (propType === 'fridge' || name.includes('wardrobe') || name.includes('bookshelf') || name.includes('plant_tall')) {
    img.setDepth(y + 24);                      // tall props: player can pass behind the base
  }
  this.propSprites.set(frame, img);
}
```
Tune `scale`/anchor in Ch1 so furniture sits over its footprint, not floating (try `setOrigin(0.5, 0.6)` if it
floats).

### B4. Wide counters
For `propType:'counter'`, if rect `w` ≫ the sprite's natural width, **tile** `furn_counter` horizontally across `w`
(draw N copies side-by-side) instead of stretching one.

### B5. Rugs in `drawDecorativeRect()`
Route `propType:'rug'` → `furn_rug_large`, kept at floor depth (≈ −10), contain-fit, not Y-sorted up.

---

## Final acceptance (verify before you call this done)
- Boot **Ch1 (apartment)**: couch, TV, desk, counter, bed, window render as **LimeZu sprites** at correct aspect
  (no stretching), correctly Y-sorted (player walks behind tall items).
- `sink`/`fridge`/`door` still draw their procedural shapes (no blanks).
- Physics unchanged (walls block where they did). Game runs if the sheet is missing.
- `npx tsc --noEmit`, `npm run build`, `npm test` all clean. Put a Ch1 screenshot in the PR.
