# TASK-01 — Prop & vehicle asset extraction (cars, jungle gym, hospital, stretched toilet)

## Goal
Several "prop" images render as the **whole multi-view contact sheet with its background**, and some are
**stretched** to a fixed rectangle. Fix all of them to render a **single clean subject, background removed,
aspect ratio preserved**. Establish this as the standard so it never regresses.

Specifically:
- **Ch2** Nick F's corolla (`prop_nick_f_corolla`).
- **Ch5** Jordan's mustang (`prop_jordan_mustang`) and Maharko's camero (`prop_maharko_camero`).
- **Ch4** jungle gym (`prop_jungle_gym`).
- **Ch3** hospital props — `prop_hospital_bed`, `prop_iv_drip`, `prop_cabinet`, **`prop_red_toilet` (stretched)**.

## House Rules (must follow)
- **Never change physics/collision rects.** The body is invisible (`addMapObject`); only the *visual* in
  `drawPropShape` changes. Aspect-correct visuals may now differ in size from the body — that's fine and intended.
- Every asset load needs a graceful fallback; missing assets must never crash.
- No new deps; Phaser 3.88.2. Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff.

## Root cause
These JPGs are **showcase contact sheets** (≈1365×768, or 1024×1024 for the jungle gym), the same family as the
hero/boss sheets — multiple views of the object on a labeled card. But unlike heroes/bosses, props are loaded raw
and drawn whole + stretched:

`src/game/ChapterScene.ts > drawPropShape()` (~line 894):
```ts
if (this.textures.exists(propKey)) {
  const img = this.add.image(x, y, propKey).setDisplaySize(dw, dh).setDepth(y);  // ← raw sheet, stretched
  this.propSprites.set(propKey, img);
  return;
}
```
`setDisplaySize(dw, dh)` forces the prop into the physics-rect dimensions → **stretching** (the toilet). And
`propKey` points at the raw sheet texture (loaded in `preload`, ~lines 312–325) → the **whole card shows**.

The project already solves this for characters via `preprocessShowcaseSheet()`
(`src/game/SpritePreprocessor.ts`): it background-strips and returns a clean spritesheet whose **frame 0 is one
isolated subject**. We'll reuse that machinery but give props an **aspect-preserving** draw.

## Implementation

### 1. New file: `src/game/PropExtractor.ts`
Create a small helper that returns a **single clean subject** from a prop sheet, plus its natural aspect ratio.
The robust approach is to reuse the existing preprocessor and read frame 0's trimmed content; but the showcase
slicer is tuned for humanoid rows, so prefer a **dedicated single-subject crop** that's more reliable for arbitrary
objects:

```ts
// src/game/PropExtractor.ts
// Crops a "showcase sheet" prop image down to its single dominant subject with the
// background removed, preserving aspect ratio. Mirrors the background-detection approach
// in SpritePreprocessor.ts (sample bg near a corner, flood/scan for the largest content box).

export interface ExtractedProp {
  canvas: HTMLCanvasElement;   // tightly-cropped, background-stripped subject (transparent bg)
  width: number;               // natural pixel width of the crop (use for aspect ratio)
  height: number;              // natural pixel height of the crop
}

export function extractPropSubject(img: HTMLImageElement): ExtractedProp {
  // 1. Draw to a temp canvas, read ImageData.
  // 2. Sample background colour near (a few px in from) the top-left corner.
  // 3. isBackground(r,g,b,a): a<50 OR colour-distance to bg < ~45 (same tolerance as SpritePreprocessor).
  // 4. Find the bounding box of the LARGEST connected non-background region (BFS islands, like
  //    SpritePreprocessor) — this isolates one subject and ignores card labels / other poses.
  //    Reuse the noise filters: ignore components smaller than ~24px, and ignore short wide text bands
  //    near the very top of the card (minY < height*0.10 && h < 24).
  // 5. Copy that bounding box into a new canvas, zeroing alpha on background-coloured pixels so the
  //    subject sits on transparency.
  // 6. Return { canvas, width: bboxW, height: bboxH }.
}
```
Implementation notes:
- You may **lift and adapt** the BFS island + background-tolerance code from `SpritePreprocessor.ts`
  (`isBackground`, the visited/queue scan, the noise filters). Keep tolerances identical (alpha<50; colour
  distance <45 for bg, <35 for sampled card corners) so results match the character pipeline.
- Pick the component with the **largest area** (or merge components whose boxes heavily overlap) as "the subject."
  For the jungle gym (1024×1024, single big structure) and cars (one car per cell), the dominant region is the
  intended subject.
- If extraction finds nothing usable, return the full image as the canvas (graceful fallback) so we still draw
  *something*.

### 2. Process prop sheets in `ChapterScene.create()`
After the boss/coin/shard processing loops (~line 480), add a loop that builds a cleaned texture per prop key and
records its natural aspect ratio. Store the cleaned texture under a new key suffix (`<propKey>_clean`) and keep an
aspect map:
```ts
// Props that ship as showcase sheets — extract one clean subject each.
private propAspect: Record<string, number> = {};   // add as a class field near propSprites

const PROP_SHEET_KEYS = [
  'prop_nick_f_corolla', 'prop_jordan_mustang', 'prop_maharko_camero',
  'prop_jungle_gym', 'prop_hospital_bed', 'prop_iv_drip', 'prop_cabinet', 'prop_red_toilet',
];
PROP_SHEET_KEYS.forEach(key => {
  if (!this.textures.exists(key) || this.textures.exists(key + '_clean')) return;
  try {
    const image = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const { canvas, width, height } = extractPropSubject(image);
    this.textures.addCanvas(key + '_clean', canvas);
    this.propAspect[key] = width / height;
  } catch (err) {
    console.error('[ChapterScene] prop extraction failed for', key, err);
  }
});
```
(Import `extractPropSubject` from `./PropExtractor`. `watchwater` house is intentionally **not** in this list — it
was already hand-cropped for R11; leave it alone.)

### 3. Aspect-preserving draw in `drawPropShape()` (and the same in `drawDecorativeRect()`)
Replace the stretched `setDisplaySize(dw, dh)` for prop sprites with a **contain** fit: keep the prop's natural
aspect ratio, sized to fit within the rect's footprint (use the larger rect dimension as a budget so props read at
a sensible size). Prefer the `_clean` texture when present:
```ts
if (propKey) {
  const cleanKey = this.textures.exists(propKey + '_clean') ? propKey + '_clean' : null;
  const texKey = cleanKey ?? (this.textures.exists(propKey) ? propKey : null);
  if (texKey) {
    const override = ChapterScene.PROP_DISPLAY[propKey];
    const boxW = override ? override.w : w;
    const boxH = override ? override.h : h;
    const img = this.add.image(x, y, texKey).setDepth(y);
    const aspect = this.propAspect[propKey];
    if (aspect && aspect > 0) {
      // contain: fit within (boxW, boxH) preserving aspect
      let dw2 = boxW, dh2 = boxW / aspect;
      if (dh2 > boxH) { dh2 = boxH; dw2 = boxH * aspect; }
      img.setDisplaySize(dw2, dh2);
    } else {
      img.setDisplaySize(boxW, boxH);   // fallback (e.g. atlas props) — unchanged behaviour
    }
    this.propSprites.set(propKey, img);
    return;
  }
}
```
Apply the **same** aspect-preserving logic in `drawDecorativeRect()` (~line 860) where it also does
`this.add.image(x, y, propKey).setDisplaySize(w, h)`, so non-solid decals don't stretch either.

Note: the existing `PROP_DISPLAY` override (`prop_watchwater*`) can stay — it just becomes the *box* the contain-fit
works within. The hospital props currently use no override, so they'll fit within their physics-rect footprint at
natural aspect — that fixes the stretched toilet.

### 4. Tuning
After wiring, eyeball each chapter (Ch2/Ch3/Ch4/Ch5). If a prop reads too small/large, adjust **only** its
`PROP_DISPLAY` box entry (add entries for the cars / toilet / jungle gym if needed) — do **not** revert to
stretching and do **not** touch the physics rects in `chapters.ts`.

## Leave a standing note
At the top of `drawPropShape()` add a short comment so this doesn't regress:
```ts
// NOTE: prop images are showcase sheets. Always render a background-stripped single subject
// (see PropExtractor + the *_clean textures) and CONTAIN-fit to preserve aspect ratio.
// Never setDisplaySize() a raw sheet to a physics rect — that re-introduces stretching + visible card.
```

## Acceptance criteria
- Ch2 corolla, Ch5 mustang + camero, Ch4 jungle gym, Ch3 bed/IV/cabinet/toilet each show **one** object on a
  transparent background — no card, no labels, no second pose, no stretching.
- The red toilet is no longer squashed/stretched.
- Physics/collisions unchanged (walls still block where they did).
- `npx tsc --noEmit` and `npm run build` clean. Note in the PR which chapters you visually checked.
