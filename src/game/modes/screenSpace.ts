import type Phaser from 'phaser';

/**
 * Screen-space placement for scrollFactor(0) HUD under a zoomed camera.
 *
 * The main camera runs at a permanent zoom (chapter.cameraZoom ?? 2.0).
 * `setScrollFactor(0)` cancels camera *scroll* only, NOT *zoom* — Phaser still maps
 * every object through `screenPos = camCenter + (objPos - camCenter) * zoom`, so a HUD
 * object placed at intended screen coordinates renders displaced/off-screen, and its
 * sizes/fonts render zoom-inflated. This independently bit complicityReport,
 * speakerHunt, and Atmosphere.setScreenTint before this helper existed.
 *
 * Usage — run EVERY screen-space coordinate through zx/zy and EVERY size (width,
 * height, fontSize, strokeThickness) through s():
 *
 *   const { zx, zy, s } = screenSpace(ctx.cameras.main);
 *   ctx.add.rectangle(zx(x), zy(y), s(w), s(h), 0x000000, 0.8).setScrollFactor(0);
 *   ctx.label(zx(x), zy(y), 'HUD', { fontSize: `${s(14)}px` }).setScrollFactor(0);
 *
 * Related trap: `add.rectangle(x, y, w, h, color, 0)` sets fillAlpha to 0 permanently —
 * tweening `alpha` on it never renders (renderer multiplies fillAlpha * alpha). For a
 * fade overlay, construct with fillAlpha 1 and tween `alpha` 0↔target.
 */
export interface ScreenSpace {
  /** Camera zoom (never 0). */
  z: number;
  /** Map an intended screen X to the pre-zoom coordinate that renders there. */
  zx: (screenX: number) => number;
  /** Map an intended screen Y to the pre-zoom coordinate that renders there. */
  zy: (screenY: number) => number;
  /** Scale a size (width/height/font/stroke) so it renders at the intended pixels. */
  s: (size: number) => number;
}

export function screenSpace(cam: Phaser.Cameras.Scene2D.Camera): ScreenSpace {
  const z = cam.zoom || 1;
  const cx = cam.width / 2;
  const cy = cam.height / 2;
  return {
    z,
    zx: (screenX: number) => cx + (screenX - cx) / z,
    zy: (screenY: number) => cy + (screenY - cy) / z,
    s: (size: number) => size / z,
  };
}
