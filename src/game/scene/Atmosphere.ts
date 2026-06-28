import Phaser from 'phaser';
import type ChapterScene from '../ChapterScene';
import type { MapConfig } from '../../data/chapters';

/**
 * Atmosphere & floating-VFX subsystem.
 *
 * Owns the per-theme color grade, vignette, fake light glows, ambient particle
 * emitters, the cinematic letterbox, and the transient floating-text helpers
 * (bubbles, damage numbers, passive-icon toasts, area titles).
 *
 * Particle emitters are pushed into the scene's shared `particleEmitters` array
 * (MapBuilder also contributes to it) so the scene owns their teardown.
 */
export class Atmosphere {
  private scene: ChapterScene;

  private ambientOverlay: Phaser.GameObjects.Rectangle | null = null;
  private vignetteOverlay: Phaser.GameObjects.Image | null = null;
  private fakeLights: Phaser.GameObjects.Image[] = [];
  private letterboxTop: Phaser.GameObjects.Rectangle | null = null;
  private letterboxBottom: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: ChapterScene) {
    this.scene = scene;
  }

  // ─── Environment build ──────────────────────────────────────────────────────

  build(map: MapConfig) {
    const theme = map.theme ?? 'apartment';
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Per-theme ambient overlay: [color, alpha]
    const overlayConfigs: Record<string, [number, number]> = {
      apartment:     [0x3d1200, 0.10],
      highway_night: [0x020c28, 0.55],
      hospital:      [0xe8ffff, 0.05],
      park:          [0xffcc60, 0.07],
      florida:       [0xff5000, 0.15],
      suburb_night:  [0x010408, 0.42],
      cabin:         [0x5a1e00, 0.12],
    };

    // Per-theme vignette alpha
    const vignetteAlphas: Record<string, number> = {
      apartment:     0.35,
      highway_night: 0.60,
      hospital:      0.22,
      park:          0.22,
      florida:       0.32,
      suburb_night:  0.62,
      cabin:         0.45,
    };

    const [overlayColor, overlayAlpha] = overlayConfigs[theme] ?? [0x000000, 0];
    const vigAlpha = vignetteAlphas[theme] ?? 0.30;

    // Full-viewport color-grade overlay — depth 800 (above Y-sorted chars ~700)
    this.ambientOverlay = this.scene.add.rectangle(w / 2, h / 2, w, h, overlayColor, overlayAlpha)
      .setScrollFactor(0)
      .setDepth(800);

    // Vignette — screen-space stretched to viewport
    if (vigAlpha > 0 && this.scene.textures.exists('vignette')) {
      this.vignetteOverlay = this.scene.add.image(w / 2, h / 2, 'vignette')
        .setDisplaySize(w, h)
        .setAlpha(vigAlpha)
        .setScrollFactor(0)
        .setDepth(6000);
    }

    this.buildFakeLights(theme, map.width, map.height);
    this.startAmbientParticles(theme, map.width, map.height);
  }

  private buildFakeLights(theme: string, mapW: number, mapH: number) {
    if (!this.scene.textures.exists('light_glow')) return;

    type LightDef = { x: number; y: number; scale: number; tint: number; alpha: number };

    const lightsByTheme: Partial<Record<string, LightDef[]>> = {
      apartment: [
        { x: mapW * 0.25, y: mapH * 0.30, scale: 3.0, tint: 0xffdd88, alpha: 0.18 },
        { x: mapW * 0.70, y: mapH * 0.25, scale: 2.2, tint: 0x88ccff, alpha: 0.22 }, // TV glow
      ],
      highway_night: [
        { x: mapW * 0.20, y: mapH * 0.50, scale: 4.5, tint: 0xff9900, alpha: 0.30 }, // toll booth
        { x: mapW * 0.80, y: mapH * 0.50, scale: 3.5, tint: 0xffffff, alpha: 0.20 }, // headlight
      ],
      hospital: [
        { x: mapW * 0.50, y: mapH * 0.30, scale: 5.0, tint: 0xeeffff, alpha: 0.12 }, // overhead
        { x: mapW * 0.80, y: mapH * 0.20, scale: 2.5, tint: 0xffeecc, alpha: 0.15 }, // window beam
      ],
      park: [
        { x: mapW * 0.50, y: mapH * 0.50, scale: 6.0, tint: 0xffcc44, alpha: 0.10 }, // golden-hour fill
      ],
      florida: [
        { x: mapW * 0.10, y: mapH * 0.50, scale: 4.0, tint: 0xff4400, alpha: 0.22 }, // sunset
        { x: mapW * 0.90, y: mapH * 0.50, scale: 3.0, tint: 0xff8800, alpha: 0.18 },
      ],
      suburb_night: [
        { x: mapW * 0.35, y: mapH * 0.20, scale: 2.5, tint: 0xffeeaa, alpha: 0.35 }, // porch light
        { x: mapW * 0.60, y: mapH * 0.15, scale: 2.0, tint: 0xaaccff, alpha: 0.20 }, // window glow
      ],
      cabin: [
        { x: mapW * 0.50, y: mapH * 0.55, scale: 3.5, tint: 0xff6600, alpha: 0.28 }, // firepit
        { x: mapW * 0.75, y: mapH * 0.65, scale: 2.5, tint: 0x00ffee, alpha: 0.15 }, // hot tub
        { x: mapW * 0.20, y: mapH * 0.25, scale: 2.0, tint: 0xffdd88, alpha: 0.18 }, // lamp
      ],
    };

    const defs = lightsByTheme[theme] ?? [];
    for (const def of defs) {
      const img = this.scene.add.image(def.x, def.y, 'light_glow')
        .setScale(def.scale)
        .setTint(def.tint)
        .setAlpha(def.alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(850);
      this.fakeLights.push(img);
    }
  }

  private startAmbientParticles(theme: string, mapW: number, mapH: number) {
    if (!this.scene.textures.exists('particle_dot')) return;

    type EmitterConfig = {
      x: number; y: number; quantity: number;
      speedX?: [number, number]; speedY?: [number, number];
      lifespan: number; scale: { start: number; end: number };
      alpha: { start: number; end: number };
      tint: number; frequency: number;
      bounce?: boolean;
    };

    const makeEmitter = (cfg: EmitterConfig) => {
      const em = this.scene.add.particles(cfg.x, cfg.y, 'particle_dot', {
        x: { min: 0, max: cfg.x > mapW * 0.1 ? mapW * 0.8 : 0 },
        speedX: cfg.speedX ? { min: cfg.speedX[0], max: cfg.speedX[1] } : { min: -8, max: 8 },
        speedY: cfg.speedY ? { min: cfg.speedY[0], max: cfg.speedY[1] } : { min: -20, max: -5 },
        lifespan: cfg.lifespan,
        scale: { start: cfg.scale.start, end: cfg.scale.end },
        alpha: { start: cfg.alpha.start, end: cfg.alpha.end },
        tint: cfg.tint,
        quantity: cfg.quantity,
        frequency: cfg.frequency,
        blendMode: Phaser.BlendModes.ADD,
      });
      em.setDepth(860);
      this.scene.particleEmitters.push(em);
    };

    if (theme === 'apartment' || theme === 'cabin') {
      // Slow dust motes drifting through interior light
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 350,
        speedX: [-12, 12], speedY: [-15, -3],
        lifespan: 4500,
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xffffcc,
      });
    }

    if (theme === 'cabin') {
      // Fireflies drifting upward
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 600,
        speedX: [-25, 25], speedY: [-30, -8],
        lifespan: 3500,
        scale: { start: 0.7, end: 0.0 },
        alpha: { start: 0.9, end: 0 },
        tint: 0x88ff44,
      });
      // Fire ember sparks rising from firepit center
      makeEmitter({
        x: mapW * 0.50, y: mapH * 0.58,
        quantity: 1, frequency: 180,
        speedX: [-18, 18], speedY: [-55, -25],
        lifespan: 1200,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: 0xff5500,
      });
    }

    if (theme === 'park') {
      // Fireflies at dusk
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 700,
        speedX: [-20, 20], speedY: [-18, -5],
        lifespan: 4000,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: 0xaaff66,
      });
    }

    if (theme === 'highway_night' || theme === 'suburb_night') {
      // Drifting dust / light streaks
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 900,
        speedX: [-5, 5], speedY: [-8, 8],
        lifespan: 5000,
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.25, end: 0 },
        tint: 0xaaccff,
      });
    }

    if (theme === 'florida') {
      // Heat shimmer particles drifting up from road
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.7,
        quantity: 1, frequency: 400,
        speedX: [-10, 10], speedY: [-35, -15],
        lifespan: 2000,
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.45, end: 0 },
        tint: 0xff8833,
      });
    }
  }

  /** Reposition the screen-space overlays when the viewport size changes. */
  repositionOverlays(w: number, h: number) {
    if (this.ambientOverlay) this.ambientOverlay.setPosition(w / 2, h / 2).setSize(w, h);
    if (this.vignetteOverlay) this.vignetteOverlay.setPosition(w / 2, h / 2).setDisplaySize(w, h);
  }

  /** Drop references to the map-tied visuals (the objects are destroyed via mapObjects). */
  resetMapVisuals() {
    this.ambientOverlay = null;
    this.vignetteOverlay = null;
    this.fakeLights = [];
  }

  /** Drop letterbox references (screen-space, not tracked in mapObjects). */
  resetLetterbox() {
    this.letterboxTop = null;
    this.letterboxBottom = null;
  }

  // ─── Cinematic helpers ──────────────────────────────────────────────────────

  /** Tween black bars in from top and bottom — "cutscene" signal. */
  showLetterbox(durationMs = 350) {
    const cam = this.scene.cameras.main;
    const barH = Math.round(cam.height * 0.10);
    if (!this.letterboxTop) {
      this.letterboxTop = this.scene.add.rectangle(cam.width / 2, 0, cam.width * 4, barH * 2, 0x000000)
        .setScrollFactor(0).setDepth(9500).setOrigin(0.5, 1).setAlpha(0);
    }
    if (!this.letterboxBottom) {
      this.letterboxBottom = this.scene.add.rectangle(cam.width / 2, cam.height, cam.width * 4, barH * 2, 0x000000)
        .setScrollFactor(0).setDepth(9500).setOrigin(0.5, 0).setAlpha(0);
    }
    this.scene.tweens.add({ targets: this.letterboxTop, alpha: 1, y: barH, duration: durationMs, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: this.letterboxBottom, alpha: 1, y: cam.height - barH, duration: durationMs, ease: 'Sine.easeOut' });
  }

  hideLetterbox(durationMs = 350) {
    if (!this.letterboxTop && !this.letterboxBottom) return;
    this.scene.tweens.add({
      targets: [this.letterboxTop, this.letterboxBottom], alpha: 0, duration: durationMs, ease: 'Sine.easeIn',
      onComplete: () => {
        this.letterboxTop?.destroy(); this.letterboxTop = null;
        this.letterboxBottom?.destroy(); this.letterboxBottom = null;
      }
    });
  }

  /** BotW-style area title toast — bottom-left, fades in then out. Screen-space. */
  showAreaTitle(title: string) {
    const cam = this.scene.cameras.main;
    const sy = cam.height - 56;

    const accent = this.scene.add.rectangle(18, sy, 3, 22, 0xfacc15)
      .setScrollFactor(0).setDepth(4999).setOrigin(0, 0.5).setAlpha(0);
    const lbl = this.scene.label(28, sy, title.toUpperCase(), {
      fontSize: '13px', color: '#f1f5f9', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4, letterSpacing: 3
    }).setScrollFactor(0).setDepth(5000).setAlpha(0).setOrigin(0, 0.5);

    this.scene.tweens.add({
      targets: [lbl, accent], alpha: 1, duration: 450, ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(2200, () => {
          this.scene.tweens.add({
            targets: [lbl, accent], alpha: 0, duration: 700, ease: 'Sine.easeIn',
            onComplete: () => { lbl.destroy(); accent.destroy(); }
          });
        });
      }
    });
  }

  // ─── Floating text ──────────────────────────────────────────────────────────

  showBubbleText(anchor: Phaser.GameObjects.GameObject, text: string, colorHex = '#ffffff') {
    const sprite = anchor as Phaser.Physics.Arcade.Sprite;
    if (!sprite?.x || !sprite?.y) return;
    const container = this.scene.add.container(sprite.x, sprite.y - 45).setDepth(2000);
    const label = this.scene.label(0, 0, text, {
      fontSize: '12px', color: colorHex,
      backgroundColor: '#0b1208e6', padding: { x: 9, y: 5 },
      stroke: '#000000', strokeThickness: 2,
      align: 'center', wordWrap: { width: 220 }
    }).setOrigin(0.5);
    container.add(label);
    this.scene.tweens.add({ targets: container, y: container.y - 40, alpha: 0, duration: 1900, onComplete: () => container.destroy() });
  }

  showPassiveIconText(x: number, y: number, text: string, color: string) {
    const label = this.scene.label(x, y, text, {
      fontSize: '13px', color,
      stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2000);
    this.scene.tweens.add({ targets: label, y: y - 50, alpha: 0, duration: 1300, onComplete: () => label.destroy() });
  }

  /** Floating damage number rising from a world position. */
  showDamageNumber(x: number, y: number, amount: number, color: string) {
    const isBig = amount >= 25;
    const txt = this.scene.label(x, y, `-${amount}`, {
      fontSize: isBig ? '16px' : '13px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: isBig ? 5 : 3,
    }).setOrigin(0.5).setDepth(3000);
    if (isBig) txt.setScale(1.4);
    this.scene.tweens.add({
      targets: txt,
      y: y - 55,
      alpha: 0,
      scale: isBig ? 1.0 : 1,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => txt.destroy(),
    });
  }
}
