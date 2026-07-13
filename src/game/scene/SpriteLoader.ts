import type { SpriteLoaderContext } from './contracts';
import {
  preprocessShowcaseSheet,
  preprocessColumnFirstSheet,
  preprocessFemalePoolSheet,
  preprocessGirlSilhouetteSheet,
  preprocessStandardSheet,
} from '../SpritePreprocessor';

/**
 * SpriteLoader — runtime texture generation and sprite-sheet processing.
 *
 * Owns: procedural texture generation (vignette, lights, particles, enemy/boss
 * placeholders, projectiles), the small-props atlas, BFS subject-crop and frame-0
 * portrait extraction, animation registration, and slicing the raw character /
 * boss / NPC showcase JPEGs into playable spritesheets.
 *
 * Loading the raw asset files stays in the scene's preload() (Phaser lifecycle);
 * everything here runs against already-loaded textures.
 */
export class SpriteLoader {
  private scene: SpriteLoaderContext;

  constructor(scene: SpriteLoaderContext) {
    this.scene = scene;
  }

  private registerAnim(id: string, sheetKey: string, animName: string, frames: number[], frameRate: number, repeat: number) {
    const key = `${animName}_${id}`;
    if (this.scene.anims.exists(key)) this.scene.anims.remove(key);

    let validFrames = frames;
    if (this.scene.textures.exists(sheetKey)) {
      const tex = this.scene.textures.get(sheetKey);
      if (tex && typeof tex.frameTotal === 'number') {
        const maxFrame = tex.frameTotal - 1;
        validFrames = frames.filter(f => f <= maxFrame);
      }
    }
    if (validFrames.length === 0) validFrames = [0];

    this.scene.anims.create({
      key,
      frames: validFrames.map(f => ({ key: sheetKey, frame: f })),
      frameRate,
      repeat
    });
  }

  /** Slice raw character / boss / NPC showcase sheets into playable spritesheets and register their anims. */
  public processCharacterSheets() {
    const heroIds = ['eric', 'jacob', 'nick_f', 'nick_h', 'jordan', 'maharko', 'ben'];
    heroIds.forEach(id => {
      const sheetKey = `hero_${id}_sheet`;
      if (this.scene.textures.exists(sheetKey)) return;

      const rawKey = this.scene.textures.exists(`hero_${id}_raw_png`) ? `hero_${id}_raw_png` : `hero_${id}_raw_jpg`;

      try {
        const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);

        const cleanKey = `hero_${id}_clean_canvas`;
        this.scene.textures.addCanvas(cleanKey, processed.canvas);
        const canvasSource = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, canvasSource, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });

        this.registerAnim(id, sheetKey, 'idle_front', processed.idleFrontFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'idle_side', processed.idleSideFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'idle_back', processed.idleBackFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'walk_front', processed.walkFrontFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'walk_side', processed.walkSideFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'walk_back', processed.walkBackFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1); // Fallback
        this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 8, -1); // Fallback
        this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 12, 0);
        this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(id, sheetKey, 'victory', processed.victoryFrames, 6, -1);
        this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Spritesheet error for ${id}:`, err);
        const fallbackSource = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, fallbackSource, { frameWidth: 128, frameHeight: 128 });
        this.registerAnim(id, sheetKey, 'idle_front', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'idle_side', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'idle_back', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'walk_front', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'walk_side', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'walk_back', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'idle', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'walk', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'attack', [0], 12, 0);
        this.registerAnim(id, sheetKey, 'hurt', [0], 8, 0);
        this.registerAnim(id, sheetKey, 'victory', [0], 6, -1);
        this.registerAnim(id, sheetKey, 'defeat', [0], 4, 0);
      }
    });

    if (this.scene.textures.exists('hero_girl1_raw_jpg') && !this.scene.textures.exists('npc_girl_sheet')) {
      const src = this.scene.textures.get('hero_girl1_raw_jpg').getSourceImage() as HTMLImageElement;
      const processed = preprocessGirlSilhouetteSheet(src);
      
      const cleanKey = 'npc_girl_sheet_clean';
      this.scene.textures.addCanvas(cleanKey, processed.canvas);
      const canvasSource = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
      
      this.scene.textures.addSpriteSheet('npc_girl_sheet', canvasSource, { 
        frameWidth: processed.frameWidth, 
        frameHeight: processed.frameHeight 
      });
      
      // Use different frames (row starts) for different girls so they look varied
      this.registerAnim('girl1', 'npc_girl_sheet', 'idle_front', [0], 4, -1);
      this.registerAnim('girl2', 'npc_girl_sheet', 'idle_front', [4], 4, -1);
      this.registerAnim('girl3', 'npc_girl_sheet', 'idle_front', [8], 4, -1);
    }

    // Process enemy showcase sheets
    ['ticketmaster', 'dishes', 'zombie'].forEach(id => {
      const rawKey = `enemy_${id}_raw`;
      const sheetKey = `enemy_${id}_sheet`;
      if (!this.scene.textures.exists(rawKey) || this.scene.textures.exists(sheetKey)) return;
      try {
        const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);
        const cleanKey = `enemy_${id}_clean_canvas`;
        this.scene.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, src, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });
        this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 6, -1);
        this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 10, 0);
        this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Enemy spritesheet error for ${id}:`, err);
        try {
          const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
          const processed = preprocessColumnFirstSheet(image, id);
          const cleanKey = `enemy_${id}_clean_canvas`;
          this.scene.textures.addCanvas(cleanKey, processed.canvas);
          const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
          this.scene.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
          this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
          this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 6, -1);
          this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 10, 0);
          this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
          this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
        } catch {
          const fallbackSource = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
          this.scene.textures.addSpriteSheet(sheetKey, fallbackSource, { frameWidth: 128, frameHeight: 128 });
        }
      }
    });

    // Process girl silhouettes as sprite sheets, removing white background
    // (Removed: We now use Phaser.BlendModes.MULTIPLY on the raw textures directly)

    // Process boss_ben_umbc as a showcase sheet
    if (this.scene.textures.exists('boss_ben_umbc') && !this.scene.textures.exists('boss_ben_umbc_sheet')) {
      try {
        const image = this.scene.textures.get('boss_ben_umbc').getSourceImage() as HTMLImageElement;
        const processed = preprocessColumnFirstSheet(image, 'boss_ben_umbc');
        const cleanKey = 'boss_ben_umbc_clean';
        this.scene.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet('boss_ben_umbc_sheet', src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'walk', processed.walkFrames, 8, -1);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'attack', processed.attackFrames, 12, 0);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error('[GameScene] Boss ben umbc spritesheet error:', err);
      }
    }

    // Process chapter 5b NPC sheets. These are LimeZu-style walk sheets with 4 rows
    // (front/back/side directions) but a PER-SHEET column count — rose & alex are
    // 6-wide, benji & rose_sister are 4-wide. The previous fixed 3-column slice put
    // ~2 characters in every frame (hence the doubled "Alex" on screen). Static NPCs
    // only ever render frame 0 (see Actors.ts), so frame 0 must be a single
    // front-facing standing pose; rose's front row starts at column 1, so her sheet
    // is shifted left by one cell to land that pose on frame 0.
    const npcSheets = [
      { key: 'npc_alex_sheet',        cols: 6, frontCol: 0, rows: 4 },
      { key: 'npc_benji_sheet',       cols: 4, frontCol: 0, rows: 4 },
      { key: 'npc_rose_sheet',        cols: 6, frontCol: 1, rows: 4 },
      { key: 'npc_rose_sister_sheet', cols: 4, frontCol: 0, rows: 4 },
      // Ch12: 3 rows (front/side/back) x 8 cols; front standing pose is already col 0.
      // Plain WHITE background (not the gray checkerboard the others use), so the
      // flood-fill needs its lum band widened to include white — see bgLumMax below.
      { key: 'npc_chris_rivas_sheet', cols: 8, frontCol: 0, rows: 3, bgLumMax: 255 },
    ];
    npcSheets.forEach(({ key: sheetKey, cols, frontCol, rows, bgLumMax }) => {
      const rawKey = `${sheetKey}_raw_jpg`;
      if (!this.scene.textures.exists(rawKey) || this.scene.textures.exists(sheetKey)) return;
      try {
        const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessStandardSheet(image, cols, rows, bgLumMax);
        const fw = processed.frameWidth;
        const fh = processed.frameHeight;

        let canvas = processed.canvas;
        if (frontCol > 0) {
          // Drop leading (non-front) columns so the front standing pose is frame 0.
          const shifted = document.createElement('canvas');
          shifted.width = fw * (cols - frontCol);
          shifted.height = canvas.height;
          const sctx = shifted.getContext('2d');
          if (sctx) {
            sctx.drawImage(canvas, frontCol * fw, 0, shifted.width, canvas.height, 0, 0, shifted.width, canvas.height);
            canvas = shifted;
          }
        }

        const cleanKey = `${sheetKey}_clean_canvas`;
        this.scene.textures.addCanvas(cleanKey, canvas);
        const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, src, { frameWidth: fw, frameHeight: fh });

        // Front row = first row. Static NPCs use frame 0; register simple front
        // idle/walk anims for completeness (e.g. if ever driven as an understudy).
        const frontRow = Array.from({ length: cols - frontCol }, (_, i) => i);
        this.registerAnim(sheetKey, sheetKey, 'idle_front', [0], 4, -1);
        this.registerAnim(sheetKey, sheetKey, 'walk_front', frontRow, 8, -1);
        this.registerAnim(sheetKey, sheetKey, 'idle', [0], 4, -1); // Fallback
        this.registerAnim(sheetKey, sheetKey, 'walk', frontRow, 8, -1); // Fallback
      } catch (err) {
        console.error(`[GameScene] NPC sheet error for ${sheetKey}:`, err);
      }
    });

    // Process boss showcase sheets — column-first format (columns = categories, rows = frames)
    ['eric', 'audrey', 'florida', 'ben', 'nick_f', 'frat_bro'].forEach(bossId => {
      // NOTE: frat_bro is included here because it's a column-first sheet like bosses.
      const rawKey = bossId === 'frat_bro' ? 'enemy_frat_bro_raw' : `boss_${bossId}`;
      const sheetKey = bossId === 'frat_bro' ? 'enemy_frat_bro_sheet' : `boss_${bossId}_sheet`;
      const animId = bossId === 'frat_bro' ? 'frat_bro' : `boss_${bossId}`;
      
      if (!this.scene.textures.exists(rawKey) || this.scene.textures.exists(sheetKey)) return;
      try {
        const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessColumnFirstSheet(image, bossId);
        const cleanKey = bossId === 'frat_bro' ? 'enemy_frat_bro_clean_canvas' : `boss_${bossId}_clean_canvas`;
        this.scene.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
        this.registerAnim(animId, sheetKey, 'idle_front', processed.idleFrontFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'idle_side', processed.idleSideFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'idle_back', processed.idleBackFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'walk_front', processed.walkFrontFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'walk_side', processed.walkSideFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'walk_back', processed.walkBackFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'idle', processed.idleFrontFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'walk', processed.walkFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'attack', processed.attackFrames, 10, 0);
        this.registerAnim(animId, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(animId, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Boss/Enemy spritesheet error for ${bossId}:`, err);
      }
    });

    // Process coin and shard showcase sheets → use frame 0 as projectile/loot sprite
    ['coin', 'shard'].forEach(id => {
      const rawKey = `${id}_img`;
      const sheetKey = `${id}_sheet`;
      if (!this.scene.textures.exists(rawKey) || this.scene.textures.exists(sheetKey)) return;
      try {
        const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);
        const cleanKey = `${id}_clean_canvas`;
        this.scene.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
      } catch (err) {
        console.error(`[GameScene] ${id} spritesheet error:`, err);
      }
    });

    // Process pool party character sheets
    ['eric', 'nick_h', 'jacob', 'nick_f', 'anastasia', 'sophia', 'sam'].forEach(id => {
      const rawKey = `npc_${id}_pool`;
      const sheetKey = `npc_${id}_pool_sheet`;
      if (!this.scene.textures.exists(rawKey) || this.scene.textures.exists(sheetKey)) return;
      try {
        const image = this.scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = (id === 'anastasia' || id === 'sophia')
          ? preprocessFemalePoolSheet(image, id)
          : preprocessShowcaseSheet(image, id);
        const cleanKey = `npc_${id}_pool_clean_canvas`;
        this.scene.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.scene.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet(sheetKey, src, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });

        const prefix = `npc_${id}_pool`;
        this.registerAnim(prefix, sheetKey, 'idle_front', processed.idleFrontFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'idle_side', processed.idleSideFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'idle_back', processed.idleBackFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'walk_front', processed.walkFrontFrames, 8, -1);
        this.registerAnim(prefix, sheetKey, 'walk_side', processed.walkSideFrames, 8, -1);
        this.registerAnim(prefix, sheetKey, 'walk_back', processed.walkBackFrames, 8, -1);
        this.registerAnim(prefix, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'walk', processed.walkFrames, 8, -1);

        if (processed.submergedIdleFrames) {
          this.registerAnim(prefix, sheetKey, 'submerged_idle', processed.submergedIdleFrames, 4, -1);
        }
        if (processed.submergedSwimFrames) {
          this.registerAnim(prefix, sheetKey, 'submerged_swim', processed.submergedSwimFrames, 4, -1);
        }
      } catch (err) {
        console.error(`[GameScene] Pool character spritesheet error for ${id}:`, err);
      }
    });

    // Damage shield: shield.jpg is a showcase sheet -> extract frame 0 as a single clean icon.
    if (this.scene.textures.exists('shield_raw') && !this.scene.textures.exists('shield_fx')) {
      try {
        const image = this.scene.textures.get('shield_raw').getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, 'shield');
        this.scene.textures.addCanvas('shield_fx_canvas', processed.canvas);
        const src = this.scene.textures.get('shield_fx_canvas').getSourceImage() as HTMLImageElement;
        this.scene.textures.addSpriteSheet('shield_fx', src, {
          frameWidth: processed.frameWidth, frameHeight: processed.frameHeight,
        });
      } catch (err) {
        console.error('[ChapterScene] shield_fx processing failed:', err);
      }
    }
  }

  public createProceduralTextures() {
    // Vignette: radial gradient, transparent center → dark edges
    if (!this.scene.textures.exists('vignette')) {
      const vc = document.createElement('canvas');
      vc.width = 256; vc.height = 256;
      const vctx = vc.getContext('2d')!;
      const vg = vctx.createRadialGradient(128, 128, 40, 128, 128, 128);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.55, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,1)');
      vctx.fillStyle = vg;
      vctx.fillRect(0, 0, 256, 256);
      this.scene.textures.addCanvas('vignette', vc);
    }

    // Soft radial blob for fake point lights (tinted + ADD blend at light sources)
    if (!this.scene.textures.exists('light_glow')) {
      const lc = document.createElement('canvas');
      lc.width = 128; lc.height = 128;
      const lctx = lc.getContext('2d')!;
      const lg = lctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      lg.addColorStop(0, 'rgba(255,255,255,0.9)');
      lg.addColorStop(0.35, 'rgba(255,240,210,0.35)');
      lg.addColorStop(1, 'rgba(255,230,200,0)');
      lctx.fillStyle = lg;
      lctx.fillRect(0, 0, 128, 128);
      this.scene.textures.addCanvas('light_glow', lc);
    }

    // Tiny white circle for ambient particle emitters
    if (!this.scene.textures.exists('particle_dot')) {
      const gp = this.scene.make.graphics({});
      gp.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
      gp.generateTexture('particle_dot', 8, 8);
      gp.destroy();
    }

    // Shadow ellipse — soft stacked ovals, generated once and reused everywhere
    if (!this.scene.textures.exists('shadow_ellipse')) {
      const gShadow = this.scene.make.graphics({});
      for (let i = 5; i >= 1; i--) {
        gShadow.fillStyle(0x000000, 0.07 * i);
        gShadow.fillEllipse(40, 15, 16 * i, 7 * i);
      }
      gShadow.generateTexture('shadow_ellipse', 80, 30);
      gShadow.destroy();
    }

    if (this.scene.textures.exists('bullet')) return;

    // Enemy textures — 48px, high-contrast so they read clearly over the map
    // Ticketmaster: blue bot silhouette with barcode stripes
    const gTm = this.scene.make.graphics({});
    gTm.fillStyle(0x1e40af, 1).fillRect(8, 4, 32, 38);
    gTm.lineStyle(2.5, 0x60a5fa, 1).strokeRect(8, 4, 32, 38);
    gTm.fillStyle(0x000000, 1).fillCircle(8, 24, 6).fillCircle(40, 24, 6);
    gTm.fillStyle(0x60a5fa, 1);
    [14, 19, 23, 27, 32, 36].forEach(x => gTm.fillRect(x, 10, 2, 26));
    gTm.generateTexture('enemy_ticketmaster', 48, 48); gTm.destroy();

    // Dishes: stacked plates with angry red border
    const gDish = this.scene.make.graphics({});
    [36, 30, 24, 18, 12].forEach((y, i) => {
      const w = 32 - i * 3;
      gDish.fillStyle(i % 2 === 0 ? 0xe2e8f0 : 0xc4b5fd, 1).fillEllipse(24, y, w, 10);
      gDish.lineStyle(1.5, 0xef4444, 1).strokeEllipse(24, y, w, 10);
    });
    gDish.generateTexture('enemy_dishes', 48, 48); gDish.destroy();

    // Zombie: purple haze circle with glowing eyes
    const gZombie = this.scene.make.graphics({});
    gZombie.fillStyle(0x4c1d95, 1).fillCircle(24, 26, 18);
    gZombie.lineStyle(3, 0xa78bfa, 1).strokeCircle(24, 26, 18);
    // Head
    gZombie.fillStyle(0x6d28d9, 1).fillCircle(24, 16, 10);
    gZombie.lineStyle(1.5, 0xc4b5fd, 1).strokeCircle(24, 16, 10);
    // Glowing green eyes
    gZombie.fillStyle(0x22c55e, 1).fillCircle(19, 14, 3.5).fillCircle(29, 14, 3.5);
    gZombie.lineStyle(1, 0x4ade80, 1).strokeCircle(19, 14, 3.5).strokeCircle(29, 14, 3.5);
    gZombie.generateTexture('enemy_zombie', 48, 48); gZombie.destroy();

    // Frat bro: beefy amber figure with red UMBC hat
    const gFrat = this.scene.make.graphics({});
    // Body
    gFrat.fillStyle(0x92400e, 1).fillRect(10, 20, 28, 24);
    gFrat.lineStyle(2, 0xfbbf24, 1).strokeRect(10, 20, 28, 24);
    // Head
    gFrat.fillStyle(0xd97706, 1).fillCircle(24, 14, 10);
    gFrat.lineStyle(2, 0xfef08a, 1).strokeCircle(24, 14, 10);
    // Hat
    gFrat.fillStyle(0xdc2626, 1).fillRect(14, 4, 20, 6).fillRect(12, 8, 24, 4);
    gFrat.generateTexture('enemy_frat_bro', 48, 48); gFrat.destroy();

    // Boss textures
    const gBE = this.scene.make.graphics({});
    gBE.fillStyle(0x1e1b4b, 1).fillCircle(24, 24, 22).lineStyle(3, 0x6366f1, 1).strokeCircle(24, 24, 22);
    gBE.fillStyle(0x10b981, 1).fillRect(16, 18, 16, 12).lineStyle(1, 0xffffff, 1).strokeRect(16, 18, 16, 12);
    gBE.generateTexture('boss_boss_eric', 48, 48); gBE.destroy();

    const gBA = this.scene.make.graphics({});
    gBA.fillStyle(0x831843, 1).fillCircle(24, 24, 22).lineStyle(3, 0xec4899, 1).strokeCircle(24, 24, 22);
    gBA.fillStyle(0xfbcfe8, 1).fillCircle(16, 16, 3).fillCircle(32, 16, 3);
    gBA.generateTexture('boss_boss_audrey', 48, 48); gBA.destroy();

    const gBF = this.scene.make.graphics({});
    gBF.fillStyle(0x7c2d12, 1).fillRect(8, 12, 32, 24).lineStyle(2, 0xea580c, 1).strokeRect(8, 12, 32, 24);
    gBF.fillStyle(0x000000, 1).fillRect(6, 6, 6, 8).fillRect(36, 6, 6, 8).fillRect(6, 34, 6, 8).fillRect(36, 34, 6, 8);
    gBF.generateTexture('boss_boss_florida', 48, 48); gBF.destroy();

    const gBB = this.scene.make.graphics({});
    gBB.fillStyle(0x1e3a8a, 1).fillCircle(24, 24, 22).lineStyle(3, 0x2563eb, 1).strokeCircle(24, 24, 22);
    gBB.fillStyle(0xef4444, 1).fillCircle(24, 28, 5).fillStyle(0xffffff, 1).fillCircle(16, 16, 3.5).fillCircle(32, 16, 3.5);
    gBB.generateTexture('boss_boss_ben', 48, 48); gBB.destroy();

    const gBN = this.scene.make.graphics({});
    gBN.fillStyle(0x881337, 1).fillCircle(24, 24, 22).lineStyle(3, 0xf43f5e, 1).strokeCircle(24, 24, 22);
    gBN.fillStyle(0x059669, 1).fillRect(14, 16, 20, 16).lineStyle(1.5, 0xffffff, 1).strokeRect(14, 16, 20, 16);
    gBN.generateTexture('boss_boss_nick_f', 48, 48); gBN.destroy();

    // Projectiles
    const gBullet = this.scene.make.graphics({});
    gBullet.fillStyle(0xeab308, 1).fillCircle(8, 8, 4.5).lineStyle(1, 0xffffff, 1).strokeCircle(8, 8, 4.5);
    gBullet.generateTexture('bullet', 16, 16); gBullet.destroy();

    // Ticket bolt (Ticketmaster ranged attack)
    const gTicket = this.scene.make.graphics({});
    gTicket.fillStyle(0x1d4ed8, 1).fillRect(2, 4, 12, 8).lineStyle(1, 0x93c5fd, 1).strokeRect(2, 4, 12, 8);
    gTicket.fillStyle(0xfbbf24, 1).fillRect(5, 5, 2, 6).fillRect(9, 5, 2, 6);
    gTicket.generateTexture('ticket_bolt', 16, 16); gTicket.destroy();

    // Fork (Dishes ranged attack)
    const gFork = this.scene.make.graphics({});
    gFork.fillStyle(0xe2e8f0, 1).fillRect(7, 2, 2, 12);
    gFork.fillRect(5, 2, 2, 4).fillRect(9, 2, 2, 4);
    gFork.lineStyle(1, 0x94a3b8, 1).strokeRect(7, 2, 2, 12);
    gFork.generateTexture('fork_proj', 16, 16); gFork.destroy();

    // Loot shard
    const gShard = this.scene.make.graphics({});
    gShard.fillStyle(0x10b981, 1).fillTriangle(8, 2, 2, 14, 14, 14).lineStyle(1, 0xffffff, 1).strokeTriangle(8, 2, 2, 14, 14, 14);
    gShard.generateTexture('loot_shard', 16, 16); gShard.destroy();
  }

  public generatePropsAtlas() {
    if (this.scene.textures.exists('small_props_atlas')) return;
    const propKeys = [
      // Only small images that fit in the 1024×1024 atlas.
      // The 1408×768 showcase sheets (prop_hospital_bed, iv_drip, cabinet, red_toilet, jungle_gym)
      // are wider than 1024px and corrupt all frame coordinates when packed — excluded.
      // Cars are also excluded: extracted+cropped in create() and rendered via direct texture.
      'prop_watchwater', 'prop_watchwater_open'
    ];
    const loadedProps = propKeys.filter(k => this.scene.textures.exists(k));
    if (loadedProps.length === 0) return;

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = 1024;
    atlasCanvas.height = 1024;
    const ctx = atlasCanvas.getContext('2d')!;

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    const atlasFrames: Record<string, {x: number, y: number, w: number, h: number}> = {};

    for (const key of loadedProps) {
      const img = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
      if (!img) continue;

      if (currentX + img.width > atlasCanvas.width) {
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      ctx.drawImage(img, currentX, currentY);
      atlasFrames[key] = {x: currentX, y: currentY, w: img.width, h: img.height};

      currentX += img.width;
      rowHeight = Math.max(rowHeight, img.height);
    }

    this.scene.textures.addAtlas('small_props_atlas', atlasCanvas as unknown as HTMLImageElement, {
      frames: Object.entries(atlasFrames).map(([k, v]) => ({
        filename: k,
        frame: { x: v.x, y: v.y, w: v.w, h: v.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: v.w, h: v.h },
        sourceSize: { w: v.w, h: v.h }
      }))
    });
  }

  /**
   * BFS-extracts the connected non-background region closest to the image centre,
   * makes everything else transparent, then crops the canvas to that bounding box.
   * The texture source is replaced in-place so subsequent add.image() calls show
   * only the extracted subject at its natural size. Returns subject aspect ratio.
   */
  public extractCropSubject(textureKey: string, tolerance = 30): number {
    if (!this.scene.textures.exists(textureKey)) return 1;
    const texture = this.scene.textures.get(textureKey);
    const src = texture.getSourceImage();

    // Draw source onto a canvas we can read pixels from.
    let canvas: HTMLCanvasElement;
    if (src instanceof HTMLCanvasElement) {
      canvas = src;
    } else if (src instanceof HTMLImageElement) {
      canvas = document.createElement('canvas');
      canvas.width = src.naturalWidth || src.width;
      canvas.height = src.naturalHeight || src.height;
      canvas.getContext('2d', { willReadFrequently: true })!.drawImage(src, 0, 0);
    } else {
      return 1;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 1;
    const W = canvas.width, H = canvas.height;
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const bgR = d[0], bgG = d[1], bgB = d[2];

    const isBg = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) return true;
      const dr = d[i] - bgR, dg = d[i + 1] - bgG, db = d[i + 2] - bgB;
      return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
    };

    // Find seed near centre.
    const cx = W >> 1, cy = H >> 1;
    let sx = -1, sy = -1;
    outer: for (let r = 0; r < Math.min(cx, cy); r += 2) {
      for (let ddx = -r; ddx <= r; ddx++) {
        for (let ddy = -r; ddy <= r; ddy++) {
          if (Math.abs(ddx) === r || Math.abs(ddy) === r) {
            const px = cx + ddx, py = cy + ddy;
            if (px >= 0 && px < W && py >= 0 && py < H && !isBg(px, py)) {
              sx = px; sy = py; break outer;
            }
          }
        }
      }
    }
    if (sx === -1) return W / H;

    // BFS to collect subject pixels and track bounding box.
    const visited = new Uint8Array(W * H);
    const queue: [number, number][] = [[sx, sy]];
    visited[sy * W + sx] = 1;
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    const subject = new Set<number>();
    subject.add(sy * W + sx);
    const DX = [-1, 1, 0, 0], DY = [0, 0, -1, 1];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (let i = 0; i < 4; i++) {
        const nx = x + DX[i], ny = y + DY[i];
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const idx = ny * W + nx;
          if (!visited[idx]) {
            visited[idx] = 1;
            if (!isBg(nx, ny)) { subject.add(idx); queue.push([nx, ny]); }
          }
        }
      }
    }

    // Make non-subject pixels transparent.
    for (let i = 0; i < W * H; i++) {
      if (!subject.has(i)) d[i * 4 + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);

    // Crop to bounding box.
    const cW = maxX - minX + 1, cH = maxY - minY + 1;
    const crop = document.createElement('canvas');
    crop.width = cW; crop.height = cH;
    crop.getContext('2d')!.drawImage(canvas, minX, minY, cW, cH, 0, 0, cW, cH);

    // Register the cropped canvas as a separate Phaser texture. Mutating the
    // original texture's glTexture in-place nulls Phaser 3.90's GLTexture wrapper
    // object, causing MultiPipeline.flush to crash with "Cannot read properties of
    // null (reading 'webGLTexture')". A new key avoids touching the GL state at all.
    try {
      const cropKey = textureKey + '_crop';
      if (this.scene.textures.exists(cropKey)) this.scene.textures.remove(cropKey);
      this.scene.textures.addCanvas(cropKey, crop);
    } catch { /* ignore */ }
    return cW / cH;
  }

  /** Extract frame-0 portrait data URLs from processed sprite sheets (sync canvas read). */
  public extractPortraits() {
    const ids = [
      this.scene.playerClass.id,
      ...this.scene.chapter.actors.map(a => a.id),
    ];
    for (const id of ids) {
      if (this.scene.portraitDataUrls[id]) continue;
      const sheetKey = `hero_${id}_sheet`;
      const bossKey = `boss_${id}_sheet`;
      const texKey = this.scene.textures.exists(sheetKey) ? sheetKey
        : this.scene.textures.exists(bossKey) ? bossKey
        : null;
      if (!texKey) continue;
      try {
        const frame = this.scene.textures.get(texKey).get(0);
        const src = frame.source.image as HTMLCanvasElement | HTMLImageElement;
        const pc = document.createElement('canvas');
        pc.width = 64; pc.height = 64;
        const pctx = pc.getContext('2d')!;
        pctx.imageSmoothingEnabled = false;
        pctx.drawImage(
          src as CanvasImageSource,
          frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
          0, 0, 64, 64
        );
        this.scene.portraitDataUrls[id] = pc.toDataURL('image/png');
      } catch { /* sheet may not be sliced yet; emoji fallback used */ }
    }
  }
}
