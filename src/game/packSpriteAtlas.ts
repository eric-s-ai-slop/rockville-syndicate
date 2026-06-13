// RUN-3: extraction pipeline for the owner-added asset-pack JPGs.
// Each pack is a 1408×768 JPG with a solid gray background (no alpha).
// cropAndKey() slices one sprite and keys the gray to transparent.
// buildPackAtlas() bakes all needed sprites into a single 'pack_atlas' Phaser texture.

import Phaser from 'phaser';

export const PACK_ATLAS_KEY = 'pack_atlas';

const builtPackFrames = new Set<string>();
const packNaturalSizes: Record<string, { w: number; h: number }> = {};

interface PackEntry {
  sheetKey: string;
  name: string;
  sx: number; sy: number; sw: number; sh: number;
  bgR: number; bgG: number; bgB: number;
  tolerance?: number;
}

// Verified crop-rects from plans/sprint2/asset_pack_seed.json (rec:true only).
// guardrail_h trimmed to the rail band (sy 150, sh 110) per the seed note.
const PACK_ENTRIES: PackEntry[] = [
  // toll-booth sheet  (_bg [165,171,178])
  { sheetKey: 'pack_tollbooth', name: 'tollbooth_front',  sx: 40,   sy: 470, sw: 690, sh: 195, bgR: 165, bgG: 171, bgB: 178 },
  { sheetKey: 'pack_tollbooth', name: 'barrier_arm_down', sx: 1040, sy: 295, sw: 185, sh: 55,  bgR: 165, bgG: 171, bgB: 178 },
  { sheetKey: 'pack_tollbooth', name: 'pack_cone',        sx: 1300, sy: 575, sw: 42,  sh: 72,  bgR: 165, bgG: 171, bgB: 178 },
  // rail sheet  (_bg [196,196,196]) — guardrail_h trimmed to tight rail band
  { sheetKey: 'pack_rail', name: 'guardrail_h', sx: 32,  sy: 150, sw: 366, sh: 110, bgR: 196, bgG: 196, bgB: 196 },
  { sheetKey: 'pack_rail', name: 'guardrail_v', sx: 161, sy: 396, sw: 53,  sh: 339, bgR: 196, bgG: 196, bgB: 196 },
  // pool sheet  (_bg [195,195,195])
  { sheetKey: 'pack_pool', name: 'hottub', sx: 1055, sy: 395, sw: 322, sh: 346, bgR: 195, bgG: 195, bgB: 195 },
  // arcade-cab sheet  (_bg [196,195,193])
  { sheetKey: 'pack_arcade', name: 'arcade_cabinet', sx: 64, sy: 344, sw: 122, sh: 196, bgR: 196, bgG: 195, bgB: 193 },
];

function cropAndKey(
  src: HTMLImageElement | HTMLCanvasElement,
  sx: number, sy: number, sw: number, sh: number,
  bgR: number, bgG: number, bgB: number,
  tolerance = 26
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);

  const imgData = ctx.getImageData(0, 0, sw, sh);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgR, dg = data[i + 1] - bgG, db = data[i + 2] - bgB;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance) data[i + 3] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export function buildPackAtlas(scene: Phaser.Scene): void {
  if (scene.textures.exists(PACK_ATLAS_KEY)) {
    PACK_ENTRIES.forEach(e => {
      builtPackFrames.add(e.name);
      packNaturalSizes[e.name] = { w: e.sw, h: e.sh };
    });
    return;
  }

  try {
    const crops: { name: string; canvas: HTMLCanvasElement; w: number; h: number }[] = [];
    for (const entry of PACK_ENTRIES) {
      if (!scene.textures.exists(entry.sheetKey)) continue;
      const src = scene.textures.get(entry.sheetKey).getSourceImage() as HTMLImageElement;
      const canvas = cropAndKey(src, entry.sx, entry.sy, entry.sw, entry.sh, entry.bgR, entry.bgG, entry.bgB, entry.tolerance);
      crops.push({ name: entry.name, canvas, w: entry.sw, h: entry.sh });
    }
    if (crops.length === 0) return;

    const PAD = 2, ATLAS_W = 1024;
    let cx = 0, cy = 0, rowH = 0;
    const layout: { name: string; canvas: HTMLCanvasElement; dx: number; dy: number; w: number; h: number }[] = [];
    for (const c of crops) {
      if (cx + c.w + PAD > ATLAS_W) { cx = 0; cy += rowH + PAD; rowH = 0; }
      layout.push({ ...c, dx: cx, dy: cy });
      cx += c.w + PAD;
      rowH = Math.max(rowH, c.h);
    }

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = ATLAS_W;
    atlasCanvas.height = Math.max(cy + rowH + PAD, 4);
    const actx = atlasCanvas.getContext('2d')!;
    for (const it of layout) {
      actx.drawImage(it.canvas, it.dx, it.dy);
      builtPackFrames.add(it.name);
      packNaturalSizes[it.name] = { w: it.w, h: it.h };
    }

    scene.textures.addAtlas(
      PACK_ATLAS_KEY,
      atlasCanvas as unknown as HTMLImageElement,
      {
        frames: layout.map(it => ({
          filename: it.name,
          frame: { x: it.dx, y: it.dy, w: it.w, h: it.h },
          rotated: false, trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h },
          sourceSize: { w: it.w, h: it.h },
        })),
      }
    );
  } catch (err) {
    console.error('[packSpriteAtlas] buildPackAtlas failed:', err);
  }
}

/** Returns frame name if it was baked, else null. */
export function packFrame(name: string): string | null {
  return builtPackFrames.has(name) ? name : null;
}

/** Natural pixel size of an extracted frame, for contain-fit aspect math. */
export function packSize(name: string): { w: number; h: number } | undefined {
  return packNaturalSizes[name];
}
