# TASK-S2-02 — Renderer rewire: drawPropShape consumes the furniture catalog

## Goal
Make `ChapterScene.drawPropShape()` (and `drawDecorativeRect()`) render **real furniture sprites** from the
catalog built in TASK-S2-01, driven by each rect's `propType`/`propKey`, falling back to the existing primitive
shapes only when no sprite is available. After this lands, every rect that already has a `propType` shows a sprite.

## Depends on
- **TASK-S2-01 merged** (provides `furniture_atlas` + `src/game/furnitureCatalog.ts` with `furnitureFrame(name)`,
  `furnitureAspect(name)`, and frame names `furn_<name>`). Rebase on it.

## House Rules
- **Never change physics/collision rects.** Sprites may visually overflow the body — intended.
- Graceful fallback: if a catalog sprite is missing, draw the current primitive shape (don't crash, don't blank).
- Phaser 3.88.2. Done = `tsc --noEmit` + `npm run build` clean. Surgical diff.

## Current code (the thing you're changing)
`src/game/ChapterScene.ts > drawPropShape()` (~line 949). Today it checks `small_props_atlas` / a raw `propKey`
texture, else falls into a `switch (propType)` that draws primitives (couch/tv/desk/counter/sink/fridge/door/car/
tree/bed/bench/default). `drawDecorativeRect()` (~line 915) is the non-solid/rug variant.

## Implementation

### 1. propType → catalog default (add a static map)
```ts
private static readonly PROPTYPE_FURNITURE: Record<string, string> = {
  couch: 'couch', tv: 'tv', desk: 'desk', counter: 'counter',
  bed: 'bed_double', bench: 'bench', window: 'window',
  // NOTE: 'sink' and 'fridge' are intentionally NOT mapped — the LimeZu free pack has no such sprite
  // (see furniture_catalog_seed.json > absent_from_free_pack). They fall through to the existing
  // procedural shapes, which is correct. 'door' also stays procedural (no standalone door sprite).
  // car/tree/junglebox keep existing handling; tollbooth/guardrail/firepit/hottub/arcade → TASK-08.
};
```

### 2. Resolution order in `drawPropShape()` (top of the method, before the `switch`)
Resolve a furniture frame to draw; only fall through to primitives if none resolves:
```ts
import { furnitureFrame, furnitureAspect } from './furnitureCatalog';
...
// (a) explicit catalog request: propKey like 'furn_couch_long'
let frame: string | null = null;
let aspectName: string | null = null;
if (propKey && propKey.startsWith('furn_')) {
  const name = propKey.slice('furn_'.length);
  frame = furnitureFrame(name); aspectName = name;
}
// (b) existing whole-image propKey path (cars, hospital showcase) — keep as-is, unchanged.
// (c) propType default → catalog
if (!frame && propType && ChapterScene.PROPTYPE_FURNITURE[propType]) {
  const name = ChapterScene.PROPTYPE_FURNITURE[propType];
  frame = furnitureFrame(name); aspectName = name;
}
if (frame && this.textures.exists('furniture_atlas')) {
  this.drawFurnitureSprite(x, y, w, h, frame, aspectName!, propType);
  return;
}
// …existing propKey/small_props_atlas checks…
// …existing switch(propType) primitive fallback unchanged…
```
Keep the existing `propKey` (showcase/whole-image) and `small_props_atlas` branches working — those serve cars and
hospital props. Order: explicit `furn_` first, then existing whole-image propKey, then propType→catalog, then
primitive.

### 3. `drawFurnitureSprite()` helper — aspect-correct, contain-fit, Y-sorted, shadowed
```ts
private drawFurnitureSprite(x: number, y: number, w: number, h: number, frame: string, name: string, propType?: string) {
  const img = this.add.image(x, y, 'furniture_atlas', frame);
  const aspect = furnitureAspect(name);
  // CONTAIN-fit within the rect footprint, preserving aspect ratio (never stretch).
  if (aspect && aspect > 0) {
    let dw = w, dh = w / aspect;
    if (dh > h) { dh = h; dw = h * aspect; }
    // furniture reads better a touch larger than the (often small) collision body:
    const scale = 1.15; img.setDisplaySize(dw * scale, dh * scale);
  }
  img.setDepth(y);
  // Tall items (wardrobe, bookshelf, fridge, plant_tall) — bias depth so the player can pass behind the base.
  if (propType === 'fridge' || name.includes('wardrobe') || name.includes('bookshelf') || name.includes('plant_tall')) {
    img.setDepth(y + 24);
  }
  // optional: a soft shadow ellipse under free-standing furniture (reuse 'shadow_ellipse' if present)
  this.propSprites.set(frame, img);
}
```
Tune `scale`/anchor so furniture sits naturally over its footprint (LimeZu art is drawn top-down-ish; align the
*base* of the sprite near the rect center-bottom if it looks like it's floating — adjust the y anchor with
`setOrigin(0.5, 0.6)` or similar). Eyeball in Ch1.

### 4. Doors (open/closed)
`propType: 'door'` should use `furn_door_closed`; a chapter that swaps to an open door (Ch6 watchwater) can request
`furn_door_open` via propKey. Keep the existing `propSprites` map so runtime `setTexture` swaps still work — but
note door swaps for watchwater use the showcase house, not this; only generic doors use the catalog.

### 5. `drawDecorativeRect()` — rugs & floor decals
Route `propType: 'rug'` to `furn_rug_large` (keep it at floor depth ≈ −10, contain-fit, don't Y-sort it up). Other
non-solid decals (road stripes etc.) keep current behaviour. Apply the same aspect-preserving logic if you render a
catalog sprite here.

### 6. Counters that are wider than one sprite
For `counter` (often a long L of cabinets), if the rect `w` is much larger than the sprite's natural width, **tile**
`furn_counter` horizontally across `w` instead of stretching one. Keep it simple: draw N copies side by side.

## Acceptance criteria
- Booting Ch1 (apartment), the couch, TV, desk, counter, sink, fridge render as **LimeZu sprites**, not rectangles,
  at correct aspect ratio (no stretching), correctly Y-sorted (player walks behind tall items).
- Any rect whose catalog sprite is missing still draws its old primitive (no blanks, no crashes).
- Physics unchanged (walls still block where they did).
- `npx tsc --noEmit` and `npm run build` clean. PR notes which chapter you eyeballed.
