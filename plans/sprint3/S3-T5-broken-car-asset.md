# S3-T5 — Broken car asset on the I-95 highway (and Florida cars)

> Fresh agent: read **Global House Rules** in `plans/sprint3/MASTER_PLAN_S3.md` first. Surgical diff only.

## Symptom (owner's words)
"During the I-95 highway, the car asset is still broken." ("still" = a prior task tried and missed.)

The I-95 chapter (location `I-95 Northbound`) places a car prop:
`{ ..., propType: 'car', propKey: 'prop_nick_f_corolla' }` (in `src/data/chapters.ts`). The Florida chapter places
`prop_jordan_mustang` and `prop_maharko_camero` the same way. All are photographic JPGs with a **gray/photo
background** that must be removed; on screen the car shows its full rectangular background = "broken."

## Your region (do not touch anything else)
`src/game/ChapterScene.ts`:
- the prop-extraction block inside `create()` — the `PROP_SHEET_KEYS` loop, around **L405–423**, plus the
  `this.generatePropsAtlas();` call on **L405**.
- `private generatePropsAtlas()` — around **L3102–3150**.

and `src/game/PropExtractor.ts` (function `extractPropSubject`) **only if** you need to make it crop/return a cleaned
canvas (see options). Do not edit unrelated methods.

## Root cause (two compounded bugs)
1. **Extraction is wired to the wrong keys.** `extractPropSubject()` (the background remover) is called only for:
   ```ts
   const PROP_SHEET_KEYS = ['bg_hospital_room', 'bg_jungle_gym', 'bg_cars_01'];
   ```
   It is **never** called for the actual car prop textures `prop_nick_f_corolla`, `prop_jordan_mustang`,
   `prop_maharko_camero`.
2. **Atlas is built from raw textures, before extraction.** `this.generatePropsAtlas()` runs at **L405**, *before* the
   extraction loop, and packs the **raw** car JPGs (background intact) into `small_props_atlas`. The renderer draws the
   car from that atlas:
   ```ts
   if (this.textures.exists('small_props_atlas') && this.textures.get('small_props_atlas').has(propKey)) {
     const img = this.add.image(x, y, 'small_props_atlas', propKey).setDisplaySize(w, h)...
   }
   ```
   So even if extraction ran, its cleaned pixels never reach the atlas.

## The fix — pick the cleanest of these (Option A recommended)

**Option A — extract the car props *before* atlas packing, in place.**
1. Add the car prop keys to the extraction set and run extraction **before** `generatePropsAtlas()`. Reorder so the
   sequence in `create()` is: load → **extract car props** → `generatePropsAtlas()`. Example:
   ```ts
   const PROP_EXTRACT_KEYS = [
     'bg_hospital_room', 'bg_jungle_gym', 'bg_cars_01',
     'prop_nick_f_corolla', 'prop_jordan_mustang', 'prop_maharko_camero',
   ];
   for (const key of PROP_EXTRACT_KEYS) {
     if (this.textures.exists(key)) this.propAspects[key] = extractPropSubject(this, key);
   }
   this.generatePropsAtlas();   // now reads the cleaned canvases
   ```
   `extractPropSubject` mutates the texture source in place (sets background alpha→0), and `generatePropsAtlas` reads
   `this.textures.get(key).getSourceImage()`, so packing *after* extraction captures the transparency.
   **Verify the source it reads is the mutated canvas** — `extractPropSubject` for an `HTMLImageElement` swaps
   `texture.source[0].source/image` to the canvas, which `getSourceImage()` returns. If in practice the atlas still
   shows background, fall to Option B.

**Option B — clean inside `generatePropsAtlas()` itself.** When packing each car key, run the same color-key removal
on its pixels before `ctx.drawImage` into the atlas (sample top-left as background, distance threshold ~30–40, set
matching pixels transparent). This guarantees the atlas frame is clean regardless of call order. This mirrors the
proven `cropAndKey` approach in `src/game/packSpriteAtlas.ts` — you may copy that local helper pattern (do **not**
import across files in a way that creates churn; a small local function is fine).

**Robustness note (important):** `extractPropSubject` uses a **center-seed BFS** with `tolerance = 30`. Photographic
car JPGs have non-uniform backgrounds and shadows; a too-tight tolerance leaves halo/background, a too-loose one eats
the car. If the car still looks wrong after wiring extraction, raise the tolerance for these photo props (try 38–45)
and/or fall back to Option B's straight color-key (simpler and more predictable for flat-ish gray backgrounds). Pick
whichever yields a clean car on screen — the **runtime result is the spec**, not the algorithm.

Keep `propType: 'car'` placements in `chapters.ts` unchanged; do not alter the display rects.

## Accept criteria
- The I-95 chapter's Nick F corolla renders as a **car with a transparent background** (no gray box), correctly sized
  within its prop rect.
- The Florida chapter's mustang and camero likewise render clean.
- No regression to the other small props in `small_props_atlas` (hospital bed, IV drip, cabinet, red toilet, jungle
  gym, watchwater house).
- `npx tsc --noEmit` and `npm run build` clean.

## Verify
`npm run dev`, load the I-95 chapter and the Florida chapter; confirm cars have no background rectangle. Screenshot the
before/after region in your PR. **Rebase on `main`** first and re-locate `generatePropsAtlas` + the `create()`
extraction loop by name — task S3-T6 also edits `create()` (a different block, hero/boss sheet building ~L480–560), so
keep your hunks disjoint.
