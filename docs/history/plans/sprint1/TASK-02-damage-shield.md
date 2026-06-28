> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-02 — Sprint 1: damage flash uses `shield.jpg`

## Goal
When the player takes damage, the shield flash effect must use **`src/assets/images/shield.jpg`**, not the
current `plasma_shield` texture.

## House Rules (must follow)
- Don't change physics/collision rects. Visual change only.
- Every asset load needs a graceful fallback (`safeLoadImage` + `this.textures.exists(...)` guard). A missing
  asset must never crash the scene.
- No new deps; Phaser 3.88.2.
- Done = `npx tsc --noEmit` clean **and** `npm run build` clean. Keep the diff surgical.

## Critical context — `shield.jpg` is a contact sheet, not an icon
`shield.jpg` is **1376×768**, the exact shape of the boss showcase sheets (`boss_nick_f.jpg`,
`micheal_bersofsky.jpg`). It is a multi-pose card, **not** a single shield icon. If you load it raw and slap it on
a sprite you'll render the whole card. You must extract a single subject via the existing preprocessor.

The project already has `preprocessShowcaseSheet(img, id)` in `src/game/SpritePreprocessor.ts`. It returns a
cleaned spritesheet canvas where **frame 0 is one background-stripped subject** (this is exactly how heroes/bosses
are processed in `ChapterScene.create()`).

## Where it's broken
`src/game/ChapterScene.ts`, `damagePlayer()` (~line 2284):
```ts
private damagePlayer(damage: number, source: string) {
  if (this.qteActive) return;
  try {
    const fx = this.add.sprite(this.player.x, this.player.y, 'plasma_shield');   // ← uses plasma_shield
    fx.setOrigin(0.5).setScale(0.1).setDepth(20).setAlpha(0.95);
    this.tweens.add({ targets: fx, scale: 0.55, alpha: 0, duration: 380, onComplete: () => fx.destroy() });
  } catch {}
  ...
```
There is already an import + load for the old asset:
- `import plasmaShieldImg from '../assets/images/plasma_shield_1781235159690.jpg';` (~line 13)
- `this.safeLoadImage('plasma_shield', plasmaShieldImg);` in `preload()` (~line 290)

## Implementation
1. **Import** `shield.jpg` at the top of `ChapterScene.ts` next to the other image imports:
   ```ts
   import shieldImg from '../assets/images/shield.jpg';
   ```
2. **Load it** in `preload()` next to the plasma_shield load:
   ```ts
   this.safeLoadImage('shield_raw', shieldImg);
   ```
3. **Process it into a clean single-subject texture** in `create()`. Add a small block right after the
   coin/shard processing block (the `['coin','shard'].forEach(...)` loop, ~line 466–480), mirroring that pattern:
   ```ts
   // Damage shield: shield.jpg is a showcase sheet → extract frame 0 as a single clean icon.
   if (this.textures.exists('shield_raw') && !this.textures.exists('shield_fx')) {
     try {
       const image = this.textures.get('shield_raw').getSourceImage() as HTMLImageElement;
       const processed = preprocessShowcaseSheet(image, 'shield');
       this.textures.addCanvas('shield_fx_canvas', processed.canvas);
       const src = this.textures.get('shield_fx_canvas').getSourceImage() as HTMLImageElement;
       this.textures.addSpriteSheet('shield_fx', src, {
         frameWidth: processed.frameWidth, frameHeight: processed.frameHeight,
       });
     } catch (err) {
       console.error('[ChapterScene] shield_fx processing failed:', err);
     }
   }
   ```
4. **Use it** in `damagePlayer()`. Pick the cleaned sheet's frame 0 when available, else fall back to the raw
   shield, else the old plasma_shield so nothing ever crashes:
   ```ts
   const shieldTex = this.textures.exists('shield_fx') ? 'shield_fx'
                   : this.textures.exists('shield_raw') ? 'shield_raw'
                   : 'plasma_shield';
   const fx = this.add.sprite(this.player.x, this.player.y, shieldTex, this.textures.exists('shield_fx') ? 0 : undefined);
   ```
   Keep the rest of the tween. Because `shield_fx` frames are 128px (vs the raw card), **tune `setScale`** so the
   flash reads at roughly the same on-screen size as before (start ~`0.45`, tween to ~`1.0`); eyeball it against
   the player sprite and adjust. Leave the plasma_shield path's original scale if it's used as fallback.

## Out of scope
- Do **not** touch the QTE modal header in `GameLayout.tsx` (it already uses `shield.jpg` via `<img>`; that's a
  different surface and not part of this task).
- Do **not** change the dash flash in `executeDash()` (it also uses `plasma_shield` — leave it; another task owns
  dash). Only the **damage** flash changes.

## Acceptance criteria
- Taking damage shows a clean shield graphic (single subject, transparent background), not a rectangular card.
- No console errors; if `shield.jpg` failed to load, the effect silently falls back and the game still runs.
- `npx tsc --noEmit` and `npm run build` are clean.