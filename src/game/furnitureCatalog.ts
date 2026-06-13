// Sprint 2 — RUN 1: LimeZu furniture catalog + slicing pipeline.
//
// The furniture art ships as one big packed tilesheet
// (assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png, 768x4272).
// This module holds VERIFIED crop-rects for each item (hand-labeled — see
// plans/sprint2/furniture_catalog_seed.json), slices them out of the loaded sheet at
// runtime, and bakes them into a single Phaser atlas `furniture_atlas` whose frames are
// named `furn_<name>`. drawPropShape() then renders these instead of primitive rectangles.
//
// Items the FREE pack lacks (fridge, sink, stove, toilet, bathtub, door) are intentionally
// absent here — drawPropShape falls back to its procedural shapes for those.

import Phaser from 'phaser';

export interface FurnitureRect { sx: number; sy: number; sw: number; sh: number; }

/** name → source pixel rect on Interiors_free_48x48.png. Verified coordinates. */
export const FURNITURE_CATALOG: Record<string, FurnitureRect> = {
  // ── Living room / office ──
  couch:         { sx: 384, sy: 864,  sw: 144, sh: 78 },  // red 2-seat sofa
  couch_purple:  { sx: 192, sy: 2112, sw: 141, sh: 96 },  // purple sofa + ottoman set
  couch_long:    { sx: 351, sy: 2190, sw: 114, sh: 111 }, // large purple sectional
  armchair:      { sx: 243, sy: 2211, sw: 90,  sh: 93 },
  ottoman:       { sx: 99,  sy: 2136, sw: 90,  sh: 54 },
  coffee_table:  { sx: 291, sy: 627,  sw: 42,  sh: 42 },
  bench:         { sx: 351, sy: 648,  sw: 114, sh: 63 },
  chair:         { sx: 438, sy: 1491, sw: 39,  sh: 63 },
  desk:          { sx: 48,  sy: 1731, sw: 192, sh: 69 },
  desk_study:    { sx: 246, sy: 1749, sw: 84,  sh: 75 },
  bookshelf:     { sx: 240, sy: 672,  sw: 96,  sh: 192 },
  bookshelf_wide:{ sx: 96,  sy: 888,  sw: 192, sh: 96 },
  tv:            { sx: 144, sy: 414,  sw: 48,  sh: 66 },
  chalkboard:    { sx: 630, sy: 1941, sw: 84,  sh: 69 },
  globe:         { sx: 189, sy: 3204, sw: 63,  sh: 57 },
  mirror:        { sx: 402, sy: 3192, sw: 60,  sh: 66 },
  // ── Bedroom ──
  bed_double:    { sx: 39,  sy: 483,  sw: 114, sh: 111 },
  bed_single:    { sx: 630, sy: 1362, sw: 84,  sh: 69 },
  nightstand:    { sx: 531, sy: 510,  sw: 45,  sh: 39 },
  dresser:       { sx: 579, sy: 531,  sw: 45,  sh: 39 },
  sideboard:     { sx: 48,  sy: 759,  sw: 189, sh: 84 },
  wardrobe:      { sx: 528, sy: 1161, sw: 96,  sh: 84 },
  cabinet_tall:  { sx: 672, sy: 4128, sw: 96,  sh: 120 },
  // ── Kitchen (counters only; no appliances in the free pack) ──
  counter:       { sx: 48,  sy: 3474, sw: 96,  sh: 96 },
  counter_wood:  { sx: 288, sy: 3474, sw: 96,  sh: 96 },
  // ── Rugs / decor / structure ──
  rug_large:     { sx: 342, sy: 732,  sw: 180, sh: 120 },
  rug_woven:     { sx: 9,   sy: 2022, sw: 129, sh: 84 },
  rug_blue:      { sx: 636, sy: 534,  sw: 120, sh: 180 },
  window:        { sx: 96,  sy: 1344, sw: 48,  sh: 84 },
  plant_tall:    { sx: 486, sy: 2130, sw: 48,  sh: 114 },
  plant_small:   { sx: 576, sy: 2178, sw: 48,  sh: 96 },
  picture_l:     { sx: 726, sy: 276,  sw: 36,  sh: 27 },
  picture_r:     { sx: 726, sy: 180,  sw: 36,  sh: 27 },
};

export const FURNITURE_ATLAS_KEY = 'furniture_atlas';

// Populated by buildFurnitureAtlas(); guards furnitureFrame() so we never reference a
// frame that failed to bake (e.g. sheet missing).
const builtFrames = new Set<string>();

/**
 * Slice every catalog rect out of the loaded interiors sheet and bake them into a single
 * atlas texture. Safe to call repeatedly — no-ops if already built or the sheet is missing.
 */
export function buildFurnitureAtlas(scene: Phaser.Scene, sheetTextureKey: string): void {
  if (scene.textures.exists(FURNITURE_ATLAS_KEY)) {
    // Atlas already present (e.g. scene restart) — make sure builtFrames reflects it.
    Object.keys(FURNITURE_CATALOG).forEach(n => builtFrames.add(n));
    return;
  }
  if (!scene.textures.exists(sheetTextureKey)) return;

  try {
    const src = scene.textures.get(sheetTextureKey).getSourceImage() as HTMLImageElement;
    const names = Object.keys(FURNITURE_CATALOG);

    // Shelf-pack the crops into a canvas.
    const PAD = 2;
    const atlasW = 1024;
    let cx = 0, cy = 0, rowH = 0;
    const layout: { name: string; r: FurnitureRect; dx: number; dy: number }[] = [];
    for (const name of names) {
      const r = FURNITURE_CATALOG[name];
      if (cx + r.sw + PAD > atlasW) { cx = 0; cy += rowH + PAD; rowH = 0; }
      layout.push({ name, r, dx: cx, dy: cy });
      cx += r.sw + PAD;
      rowH = Math.max(rowH, r.sh);
    }
    const atlasH = cy + rowH + PAD;

    const canvas = document.createElement('canvas');
    canvas.width = atlasW;
    canvas.height = atlasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false; // preserve crisp pixel art

    for (const it of layout) {
      ctx.drawImage(src, it.r.sx, it.r.sy, it.r.sw, it.r.sh, it.dx, it.dy, it.r.sw, it.r.sh);
      builtFrames.add(it.name);
    }

    scene.textures.addAtlas(
      FURNITURE_ATLAS_KEY,
      canvas as unknown as HTMLImageElement,
      {
        frames: layout.map(it => ({
          filename: `furn_${it.name}`,
          frame: { x: it.dx, y: it.dy, w: it.r.sw, h: it.r.sh },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: it.r.sw, h: it.r.sh },
          sourceSize: { w: it.r.sw, h: it.r.sh },
        })),
      }
    );
  } catch (err) {
    console.error('[furnitureCatalog] buildFurnitureAtlas failed:', err);
  }
}

/** Returns the atlas frame name `furn_<name>` if it was baked, else null. */
export function furnitureFrame(name: string): string | null {
  return builtFrames.has(name) ? `furn_${name}` : null;
}

/** Natural aspect ratio (w/h) of a catalog item, for contain-fit drawing. */
export function furnitureAspect(name: string): number | undefined {
  const r = FURNITURE_CATALOG[name];
  return r ? r.sw / r.sh : undefined;
}
