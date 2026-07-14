import Phaser from 'phaser';
import { MapConfig, resolveSpeaker, themeCapabilities } from '../../data/chapters';
import { furnitureFrame, furnitureAspect, FURNITURE_ATLAS_KEY } from '../furnitureCatalog';
import { packFrame, packSize, PACK_ATLAS_KEY } from '../packSpriteAtlas';
import type { MapBuilderContext } from './contracts';

export class MapBuilder {
  public scene: MapBuilderContext;

  // Watchwater crop display size overrides
  private static readonly PROP_DISPLAY: Record<string, { w: number; h: number }> = {
    prop_watchwater:      { w: 360, h: 156 },
    prop_watchwater_open: { w: 360, h: 156 },
  };

  // Default furniture mappings
  private static readonly PROPTYPE_FURNITURE: Record<string, string> = {
    couch: 'couch', tv: 'tv', desk: 'desk', counter: 'counter',
    bed: 'bed_double', bench: 'bench', window: 'window',
  };

  constructor(scene: MapBuilderContext) {
    this.scene = scene;
  }

  public buildMapFromConfig(map: MapConfig) {
    // Wide backdrop so no black shows past edges
    this.scene.add.rectangle(map.width / 2, map.height / 2, map.width * 6, map.height * 6, map.backdrop, 1).setDepth(-200);
    // Floor base
    this.scene.add.rectangle(map.width / 2, map.height / 2, map.width, map.height, map.backdrop, 1).setDepth(-190);
    // Per-theme floor pattern
    this.drawFloorLines(map);

    // R16: Decorate with nature flora
    this.scatterNature(map);

    // Outer boundary walls
    const t = 14;
    this.createWall(map.width / 2, t / 2, map.width, t);
    this.createWall(map.width / 2, map.height - t / 2, map.width, t);
    this.createWall(t / 2, map.height / 2, t, map.height);
    this.createWall(map.width - t / 2, map.height / 2, t, map.height);

    this.scene.mapCollidables = [];
    map.rects.forEach(r => {
      if (r.propKey && this.scene.playerClass) {
        const pId = this.scene.playerClass.id;
        if (r.propKey === `npc_${pId}_pool` || r.propKey === `hero_${pId}_sheet` || r.propKey === `npc_${pId}`) {
          return; // Skip duplicating the player!
        }
      }
      if (r.solid) {
        if (r.invisible) {
          const physRect = this.scene.add.rectangle(r.x, r.y, r.w, r.h, r.fill, 0);
          physRect.setVisible(false);
          this.scene.physics.add.existing(physRect, true);
          (physRect.body as Phaser.Physics.Arcade.StaticBody).setSize(r.w, r.h);
          this.scene.mapCollidables.push(physRect);
        } else {
          const obj = this.addMapObject(r.x, r.y, r.w, r.h, r.fill, r.stroke ?? r.fill, r.propType, r.propKey);
          this.scene.mapCollidables.push(obj);
        }
      } else {
        this.drawDecorativeRect(r.x, r.y, r.w, r.h, r.fill, r.stroke ?? r.fill, r.propType, r.propKey);
      }
    });

    if (this.scene.chapter.poolNameplatesConfigs) {
      this.scene.poolNameplates = new Map();

      // Hide sprites that startHidden
      this.scene.chapter.poolNameplatesConfigs.forEach(cfg => {
        if (cfg.startHidden) {
          const sprite = this.scene.propSprites.get(cfg.key);
          if (sprite) sprite.setVisible(false);
        }
      });

      this.scene.chapter.poolNameplatesConfigs.forEach(cfg => {
        const sprite = this.scene.propSprites.get(cfg.key);
        if (sprite) {
          const speaker = resolveSpeaker(cfg.id);
          const nameplate = this.scene.label(sprite.x, sprite.y - 38, speaker.name, {
            fontSize: '12px', color: speaker.color, fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
          }).setOrigin(0.5).setDepth(sprite.y + 200);
          
          this.scene.poolNameplates.set(cfg.key, nameplate);

          if (!sprite.visible) {
            nameplate.setVisible(false);
          }
        }
      });
    }

    // BotW-style area title toast — no permanent in-world signs
    const areaTitle = map.areaTitle;
    if (areaTitle) {
      this.scene.time.delayedCall(400, () => this.scene.showAreaTitle(areaTitle));
    }
    // map.labels are intentionally ignored (createRoomLabel is now a no-op)
    map.labels.forEach(l => this.createRoomLabel(l.x, l.y, l.name, l.detail, l.color));
  }

  public buildNeighborhoodMap() {
    const W = 1000, H = 1000;
    const ROAD_W = 80;

    // Endless lawn that extends well past the playable area so wide/tall
    // viewports frame the neighborhood with grass instead of black bars.
    this.scene.add.rectangle(W / 2, H / 2, 5000, 5000, 0x16331a, 1).setDepth(-12);
    for (let i = 0; i < 60; i++) {
      const gx = Phaser.Math.Between(-1400, 2400);
      const gy = Phaser.Math.Between(-1400, 2400);
      // skip the core neighborhood — those trees are placed deliberately below
      if (gx > -120 && gx < 1120 && gy > -120 && gy < 1120) continue;
      this.scene.add.circle(gx, gy, 20, 0x14532d).setDepth(-11.5);
      this.scene.add.circle(gx, gy - 3, 13, 0x166534).setDepth(-11.4);
    }

    // Use actual neighborhood map as base layer if loaded
    if (this.scene.textures.exists('neighborhood_map')) {
      const mapBg = this.scene.add.image(W / 2, H / 2, 'neighborhood_map');
      mapBg.setDisplaySize(W, H).setDepth(-11).setAlpha(0.85);
    }

    // Base grass (fallback / tint layer)
    this.scene.add.rectangle(W / 2, H / 2, W, H, 0x4ade80, this.scene.textures.exists('neighborhood_map') ? 0.15 : 1).setDepth(-10);
    // Slightly darker lawn areas
    this.scene.add.rectangle(220, 220, 380, 360, 0x22c55e, 0.6).setDepth(-9);
    this.scene.add.rectangle(780, 220, 380, 360, 0x22c55e, 0.6).setDepth(-9);
    this.scene.add.rectangle(220, 750, 380, 360, 0x22c55e, 0.6).setDepth(-9);
    this.scene.add.rectangle(780, 750, 380, 360, 0x22c55e, 0.6).setDepth(-9);

    // Dirt/stone roads
    this.scene.add.rectangle(W / 2, H / 2, ROAD_W, H, 0x9ca3af).setDepth(-8);   // vertical road
    this.scene.add.rectangle(W / 2, H / 2, W, ROAD_W, 0x9ca3af).setDepth(-8);   // horizontal road
    // Road center lines
    this.scene.add.rectangle(500, 500, 4, H, 0xfbbf24, 0.5).setDepth(-7.5);
    this.scene.add.rectangle(500, 500, W, 4, 0xfbbf24, 0.5).setDepth(-7.5);
    // Sidewalks
    this.scene.add.rectangle(W / 2, H / 2, ROAD_W + 16, H, 0, 0).setStrokeStyle(3, 0xd1d5db, 0.7).setDepth(-8.5);
    this.scene.add.rectangle(W / 2, H / 2, W, ROAD_W + 16, 0, 0).setStrokeStyle(3, 0xd1d5db, 0.7).setDepth(-8.5);

    // ── TOP-LEFT: Commons 1522 ──────────────────────────────────────────────
    this.scene.add.rectangle(110, 220, 200, 250, 0xfef9c3).setStrokeStyle(3, 0xca8a04, 0.9).setDepth(-7);
    this.scene.add.rectangle(110, 120, 200, 50, 0xfbbf24, 0.85).setDepth(-7); // roof overhang
    this.createRoomLabel(110, 170, "COMMONS 1522", "APT BATTLEGROUND", "#78350f");
    // Door
    this.scene.add.rectangle(110, 340, 28, 18, 0x78350f).setStrokeStyle(2, 0x92400e).setDepth(-6);
    // Windows
    this.scene.add.rectangle(70, 240, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);
    this.scene.add.rectangle(150, 240, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);
    this.scene.add.rectangle(70, 280, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);
    this.scene.add.rectangle(150, 280, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);

    // ── TOP-CENTER: Kitchen annex (sink hazard) ─────────────────────────────
    this.scene.add.rectangle(310, 200, 120, 150, 0xf1f5f9).setStrokeStyle(2, 0x94a3b8, 0.75).setDepth(-7);
    this.createRoomLabel(310, 165, "KITCHEN SINK", "25 FORKS HAZARD", "#475569");

    // ── TOP-RIGHT: 12 Watchwater Way ────────────────────────────────────────
    this.scene.add.rectangle(890, 220, 200, 250, 0xfce7f3).setStrokeStyle(3, 0xdb2777, 0.9).setDepth(-7);
    this.scene.add.rectangle(890, 120, 200, 50, 0xf472b6, 0.85).setDepth(-7); // roof
    this.createRoomLabel(890, 170, "12 WATCHWATER", "BEN BER'S FRONT DOOR", "#be185d");
    this.scene.add.rectangle(890, 340, 28, 18, 0x9d174d).setStrokeStyle(2, 0xbe185d).setDepth(-6);
    this.scene.add.rectangle(850, 240, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);
    this.scene.add.rectangle(930, 240, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);
    this.scene.add.rectangle(850, 280, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);
    this.scene.add.rectangle(930, 280, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);

    // ── CENTER LOUNGE: Heated Rivalry TV Room ───────────────────────────────
    this.scene.add.rectangle(500, 240, 120, 100, 0x3e1f1f, 0.8).setStrokeStyle(2, 0x8d6e63, 0.55).setDepth(-7);
    this.createRoomLabel(500, 230, "HEATED RIVALRY", "📺 BASECAMP LOUNGE", "#f5c2c2");
    this.scene.add.rectangle(500, 270, 60, 20, 0x450a0a).setStrokeStyle(2, 0x991b1b).setDepth(-6); // TV

    // ── BOTTOM-LEFT: Nick's AMG Garage ──────────────────────────────────────
    this.scene.add.rectangle(110, 760, 200, 250, 0x1e293b).setStrokeStyle(3, 0x475569, 0.9).setDepth(-7);
    this.scene.add.rectangle(110, 660, 200, 50, 0x334155, 0.85).setDepth(-7); // roof
    this.createRoomLabel(110, 710, "NICK'S GARAGE", "C55 AMG WORKSHOP", "#94a3b8");
    this.scene.add.rectangle(110, 880, 70, 16, 0x64748b).setStrokeStyle(2, 0x94a3b8).setDepth(-6); // garage door

    // ── BOTTOM-CENTER: Aidan's Sublease Suite ───────────────────────────────
    this.scene.add.rectangle(310, 780, 120, 160, 0x0f172a, 0.8).setStrokeStyle(2, 0x1e293b, 0.7).setDepth(-7);
    this.createRoomLabel(310, 775, "AIDAN'S SUITE", "SUBLEASED TERRITORY", "#64748b");

    // ── BOTTOM-RIGHT: Jacob's Vault ─────────────────────────────────────────
    this.scene.add.rectangle(890, 760, 200, 250, 0x3b1c00).setStrokeStyle(3, 0xd97706, 0.9).setDepth(-7);
    this.scene.add.rectangle(890, 660, 200, 50, 0xd97706, 0.85).setDepth(-7); // golden roof
    this.createRoomLabel(890, 710, "JACOB'S VAULT", "$3,900 LIQUID RESERVES", "#fde047");
    this.scene.add.rectangle(890, 880, 40, 36, 0x78350f).setStrokeStyle(3, 0xd97706).setDepth(-6); // vault door

    // ── Trees (pixel-style circles) ─────────────────────────────────────────
    const treePositions = [
      [60, 400], [160, 400], [60, 590], [160, 590],
      [840, 400], [940, 400], [840, 590], [940, 590],
      [380, 100], [620, 100], [380, 900], [620, 900],
      [400, 440], [600, 440], [400, 560], [600, 560]
    ];
    treePositions.forEach(([tx, ty]) => {
      this.scene.add.circle(tx, ty, 18, 0x15803d).setDepth(-6.5);
      this.scene.add.circle(tx, ty, 12, 0x16a34a).setDepth(-6);
      this.scene.add.circle(tx, ty - 2, 8, 0x22c55e).setDepth(-5.5);
    });

    // ── Fences along road edge ───────────────────────────────────────────────
    this.scene.add.rectangle(232, 448, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(232, 552, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(768, 448, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(768, 552, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(448, 232, 6, 464, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(552, 232, 6, 464, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(448, 768, 6, 464, 0x78350f, 0.6).setDepth(-6);
    this.scene.add.rectangle(552, 768, 6, 464, 0x78350f, 0.6).setDepth(-6);

    // World border
    this.scene.add.rectangle(W / 2, H / 2, W, H).setStrokeStyle(6, 0x4b5563, 0.8).setDepth(-4);
  }

  public scatterNature(map: MapConfig) {
    if (map.noNatureScatter) return;
    const theme = map.theme;
    if (!theme) return;

    if (!themeCapabilities[theme]?.allowsNatureScatter) return;
    const outdoorThemes = ['highway_night', 'park', 'florida', 'cabin', 'suburb_night'];
    if (!outdoorThemes.includes(theme)) return;

    const W = map.width;
    const H = map.height;

    let seed = 1337;
    const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0x7fffffff; };

    const natureKeys = ['nature_flower_1', 'nature_flower_2', 'nature_bush_1', 'nature_bush_2'];
    // Filter loaded keys just in case
    const availableKeys = natureKeys.filter(key => this.scene.textures.exists(key));
    if (availableKeys.length === 0) return;

    const count = theme === 'park' || theme === 'cabin' ? 40 : 15;

    for (let i = 0; i < count; i++) {
      let x = rng() * W;
      let y = rng() * H;

      // Theme-specific boundary logic
      if (theme === 'highway_night' || theme === 'florida') {
        // Keep to the top and bottom shoulders, avoid the middle road
        if (y > H * 0.25 && y < H * 0.75) {
          y = rng() > 0.5 ? y * 0.25 : H - (y * 0.25);
        }
      } else if (theme === 'park') {
        // Avoid the central path (W * 0.3 to W * 0.7)
        if (x > W * 0.3 && x < W * 0.7) {
          x = rng() > 0.5 ? x * 0.3 : W - (x * 0.3);
        }
      } else if (theme === 'cabin') {
        // Scatter mostly around the edges
        if (x > W * 0.2 && x < W * 0.8 && y > H * 0.2 && y < H * 0.8) {
          if (rng() > 0.5) x = rng() * W * 0.2;
          else x = W - (rng() * W * 0.2);
        }
      } else if (theme === 'suburb_night') {
        // Similar to highway, avoid middle
        if (y > H * 0.3 && y < H * 0.7) {
          y = rng() > 0.5 ? y * 0.3 : H - (y * 0.3);
        }
      }

      const key = availableKeys[Math.floor(rng() * availableKeys.length)];
      // Scatter as decorative non-solid sprites, set depth to Y for correct sorting
      this.scene.add.image(x, y, key).setDepth(y).setScale(0.8 + rng() * 0.4);
    }
  }

  public drawFloorLines(map: MapConfig) {
    const W = map.width;
    const H = map.height;
    const theme = map.theme;
    if (!theme) return;
    const g = this.scene.add.graphics().setDepth(-185);

    switch (theme) {
      case 'apartment':
      case 'cabin': {
        const planks = [0x7c5c2e, 0x6b4e26, 0x7a5a30, 0x6e5228];
        for (let y = 0; y < H; y += 28) {
          g.fillStyle(planks[Math.floor(y / 28) % planks.length], 0.3);
          g.fillRect(0, y, W, 14);
          g.lineStyle(1, 0x3b1f0a, 0.18);
          g.lineBetween(0, y + 14, W, y + 14);
          if (Math.floor(y / 28) % 3 === 0) {
            const joinX = ((Math.floor(y / 28) * 137) % (W - 20)) + 10;
            g.lineStyle(1, 0x3b1f0a, 0.12);
            g.lineBetween(joinX, y, joinX, y + 14);
          }
        }
        break;
      }
      case 'hospital': {
        g.lineStyle(1, 0x6b7280, 0.18);
        for (let x = 0; x <= W; x += 32) g.lineBetween(x, 0, x, H);
        for (let y = 0; y <= H; y += 32) g.lineBetween(0, y, W, y);
        for (let tx = 0; tx < W; tx += 64) {
          for (let ty = 0; ty < H; ty += 64) {
            g.fillStyle(0xffffff, 0.03);
            g.fillRect(tx + 32, ty, 32, 32);
            g.fillRect(tx, ty + 32, 32, 32);
          }
        }
        break;
      }
      case 'highway_night':
      case 'suburb_night': {
        g.lineStyle(3, 0xfbbf24, 0.5);
        [H * 0.33, H * 0.67].forEach(ly => {
          for (let x = 0; x < W; x += 40) g.lineBetween(x, ly, x + 24, ly);
        });
        g.lineStyle(2, 0xe5e7eb, 0.35);
        g.lineBetween(0, 20, W, 20);
        g.lineBetween(0, H - 20, W, H - 20);
        break;
      }
      case 'park': {
        // Deterministic grass scatter — LCG seeded to avoid jitter on reload
        let seed = 42;
        const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0x7fffffff; };
        g.fillStyle(0x166534, 0.25);
        for (let i = 0; i < 180; i++) {
          g.fillCircle(rng() * W, rng() * H, 2 + rng() * 4);
        }
        g.fillStyle(0xd97706, 0.08);
        g.fillRect(W * 0.3, 0, W * 0.4, H);
        break;
      }
      case 'florida': {
        g.lineStyle(3, 0xfbbf24, 0.55);
        for (let x = 0; x < W; x += 50) g.lineBetween(x, H / 2, x + 30, H / 2);
        g.lineStyle(2, 0xe5e7eb, 0.35);
        g.lineBetween(0, 80, W, 80);
        g.lineBetween(0, H - 80, W, H - 80);
        break;
      }
    }
  }

  public drawDecorativeRect(x: number, y: number, w: number, h: number, fill: number, stroke: number, propType?: string, propKey?: string) {
    // R1: sprite override — render a real image if the texture is loaded
    if (propKey) {
      const hasSmallAtlas = this.scene.textures.exists('small_props_atlas');
      if (hasSmallAtlas && this.scene.textures.get('small_props_atlas').has(propKey)) {
        const img = this.scene.add.image(x, y, 'small_props_atlas', propKey).setDisplaySize(w, h).setDepth(y);
        this.scene.propSprites.set(propKey, img);
        return;
      }

      const texExistsBase = this.scene.textures.exists(propKey);
      const texExistsSheet = this.scene.textures.exists(propKey + '_sheet');

      if (texExistsBase || texExistsSheet) {
        const hasSheet = texExistsSheet || propKey.endsWith('_sheet');
        let renderKey = propKey;
        if (hasSheet) {
          renderKey = propKey.endsWith('_sheet') ? propKey : propKey + '_sheet';
        } else if (this.scene.textures.exists(propKey + '_crop')) {
          renderKey = propKey + '_crop';
        }
        const frame = hasSheet ? 0 : undefined;
        const img = hasSheet ? this.scene.add.sprite(x, y, renderKey, frame) : this.scene.add.image(x, y, renderKey, frame);
        if (hasSheet && img instanceof Phaser.GameObjects.Sprite) {
          const idleKey = `idle_front_${propKey}`;
          if (this.scene.anims.exists(idleKey)) {
            img.play(idleKey, true);
          }
        }
        const isFullscreenBg = propKey.startsWith('prop_pool_map') || propKey.startsWith('stage_');
        let dw = w, dh = h;
        if (!isFullscreenBg) {
          let aspect = this.scene.propAspects[propKey];
          if (!aspect) aspect = img.width / img.height;
          dw = w; dh = w / aspect;
          if (dh > h) { dh = h; dw = h * aspect; }
        }
        const depth = isFullscreenBg ? -100 : y;
        img.setDisplaySize(dw, dh).setDepth(depth);
        this.scene.propSprites.set(propKey, img);
        return;
      }
    }
    // Sprint 2: real rug sprite (kept at floor depth, not Y-sorted up)
    if (propType === 'rug' && this.scene.textures.exists(FURNITURE_ATLAS_KEY)) {
      const frame = furnitureFrame('rug_large');
      if (frame) {
        const aspect = furnitureAspect('rug_large') ?? (w / h);
        let dw = w, dh = w / aspect;
        if (dh > h) { dh = h; dw = h * aspect; }
        this.scene.add.image(x, y, FURNITURE_ATLAS_KEY, frame).setDisplaySize(dw, dh).setDepth(-10);
        return;
      }
    }
    if (propType === 'rug') {
      const g = this.scene.add.graphics().setDepth(-10);
      g.fillStyle(fill, 0.7);
      g.fillRect(x - w / 2, y - h / 2, w, h);
      g.lineStyle(2, stroke, 0.45);
      g.strokeRect(x - w / 2, y - h / 2, w, h);
      g.lineStyle(1.5, stroke, 0.25);
      g.strokeRect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16);
      return;
    }
    // Prop rects with a propType or propKey get the same rendering pipeline as solid
    // rects — furniture atlas, PROPTYPE_FURNITURE mapping, or procedural shapes.
    // Pure structural/fill rects (no propType/propKey) stay as cheap flat decals.
    if (propType || propKey) {
      this.drawPropShape(x, y, w, h, fill, stroke, propType, propKey);
    } else {
      this.scene.add.rectangle(x, y, w, h, fill, 0.65)
        .setStrokeStyle(1.5, stroke, 0.5).setDepth(-50);
    }
  }

  public tryDrawFurniture(x: number, y: number, w: number, h: number, name: string, propType?: string): boolean {
    if (!this.scene.textures.exists(FURNITURE_ATLAS_KEY)) return false;
    const frame = furnitureFrame(name);
    if (!frame) return false;
    this.drawFurnitureSprite(x, y, w, h, frame, name, propType);
    return true;
  }

  public drawFurnitureSprite(x: number, y: number, w: number, h: number, frame: string, name: string, propType?: string) {
    const aspect = furnitureAspect(name) ?? (w / h);

    // Counters are drawn edge-to-edge on the sheet — tile horizontally instead of stretching one.
    if (propType === 'counter') {
      const tileH = h * 1.4;
      const tileW = tileH * aspect;
      const count = Math.max(1, Math.round(w / tileW));
      const startX = x - (count * tileW) / 2 + tileW / 2;
      for (let i = 0; i < count; i++) {
        const seg = this.scene.add.image(startX + i * tileW, y, FURNITURE_ATLAS_KEY, frame)
          .setOrigin(0.5, 0.6).setDisplaySize(tileW, tileH).setDepth(y);
        if (i === 0) this.scene.propSprites.set(frame, seg);
      }
      return;
    }

    // Contain-fit within the rect footprint, preserving aspect ratio.
    let dw = w, dh = w / aspect;
    if (dh > h) { dh = h; dw = h * aspect; }
    const scale = 1.15; // furniture reads a touch larger than its (often small) collision body
    const img = this.scene.add.image(x, y, FURNITURE_ATLAS_KEY, frame)
      .setOrigin(0.5, 0.6)
      .setDisplaySize(dw * scale, dh * scale);

    // Tall props: bias depth so the player can walk behind the base.
    const tall = propType === 'fridge' || name.includes('wardrobe') || name.includes('bookshelf')
      || name.includes('plant_tall') || name.includes('cabinet_tall') || name === 'tv';
    img.setDepth(tall ? y + 24 : y);
    this.scene.propSprites.set(frame, img);
  }

  public drawPackSprite(x: number, y: number, w: number, h: number, frameName: string, tallBias = 0): boolean {
    const frame = packFrame(frameName);
    if (!frame || !this.scene.textures.exists(PACK_ATLAS_KEY)) return false;
    const nat = packSize(frameName) ?? { w, h };
    const aspect = nat.w / nat.h;
    let dw = w, dh = w / aspect;
    if (dh > h) { dh = h; dw = h * aspect; }
    const img = this.scene.add.image(x, y, PACK_ATLAS_KEY, frame)
      .setOrigin(0.5, 0.6)
      .setDisplaySize(dw, dh)
      .setDepth(y + tallBias);
    this.scene.propSprites.set(frame, img);
    return true;
  }

  public drawPropShape(x: number, y: number, w: number, h: number, fill: number, stroke: number, propType?: string, propKey?: string) {
    let frame: string | null = null;
    let aspectName: string | null = null;

    // (a) explicit catalog request: propKey === 'furn_<name>'
    if (propKey?.startsWith('furn_')) {
      const n = propKey.slice(5);
      frame = furnitureFrame(n);
      aspectName = n;
    }

    // (b) propType default → catalog
    if (!frame && propType && MapBuilder.PROPTYPE_FURNITURE[propType]) {
      const n = MapBuilder.PROPTYPE_FURNITURE[propType];
      frame = furnitureFrame(n);
      aspectName = n;
    }

    if (frame && this.scene.textures.exists('furniture_atlas')) {
      this.drawFurnitureSprite(x, y, w, h, frame, aspectName!, propType);
      return;
    }

    // RUN-3: pack-atlas sprites checked first so propType takes precedence over propKey
    if (propType === 'junglebox'   && this.drawPackSprite(x, y, w, h, 'jungle_gym', 20)) return;
    if (propType === 'hottub'      && this.drawPackSprite(x, y, w, h, 'hottub', 30)) return;
    if (propType === 'arcade'      && this.drawPackSprite(x, y, w, h, 'arcade_cabinet', 50)) return;
    if (propType === 'tollbooth'   && this.drawPackSprite(x, y, w, h, 'tollbooth_front', 0)) return;
    if (propType === 'barrier_arm' && this.drawPackSprite(x, y, w, h, 'barrier_arm_down', 0)) return;
    if (propType === 'cone'        && this.drawPackSprite(x, y, w, h, 'pack_cone', 10)) return;
    if (propType === 'guardrail') {
      const gName = w >= h ? 'guardrail_h' : 'guardrail_v';
      if (this.drawPackSprite(x, y, w, h, gName, 0)) return;
    }

    // R1: sprite override — render a real image if the texture is loaded
    if (propKey) {
      const override = MapBuilder.PROP_DISPLAY[propKey];
      const dw = override ? override.w : w;
      const dh = override ? override.h : h;

      const hasSmallAtlas = this.scene.textures.exists('small_props_atlas');
      if (hasSmallAtlas && this.scene.textures.get('small_props_atlas').has(propKey)) {
        const img = this.scene.add.image(x, y, 'small_props_atlas', propKey).setDisplaySize(dw, dh).setDepth(y);
        this.scene.propSprites.set(propKey, img);
        return;
      }

      const texExistsBase = this.scene.textures.exists(propKey);
      const texExistsSheet = this.scene.textures.exists(propKey + '_sheet');

      if (texExistsBase || texExistsSheet) {
        const hasSheet = texExistsSheet || propKey.endsWith('_sheet');
        let renderKey = propKey;
        if (hasSheet) {
          renderKey = propKey.endsWith('_sheet') ? propKey : propKey + '_sheet';
        } else if (this.scene.textures.exists(propKey + '_crop')) {
          renderKey = propKey + '_crop';
        }
        const frame = hasSheet ? 0 : undefined;
        const img = hasSheet ? this.scene.add.sprite(x, y, renderKey, frame) : this.scene.add.image(x, y, renderKey, frame);
        if (hasSheet && img instanceof Phaser.GameObjects.Sprite) {
          const idleKey = `idle_front_${propKey}`;
          if (this.scene.anims.exists(idleKey)) {
            img.play(idleKey, true);
          }
        }

        let displayWidth = dw;
        let displayHeight = dh;

        if (!propKey.startsWith('prop_pool_map')) {
          let aspect = this.scene.propAspects[propKey];
          if (!aspect) {
            aspect = img.width / img.height;
          }
          displayHeight = displayWidth / aspect;
          if (displayHeight > dh) {
            displayHeight = dh;
            displayWidth = dh * aspect;
          }
        }

        const depth = propKey.startsWith('prop_pool_map') ? -100 : y;
        img.setDisplaySize(displayWidth, displayHeight).setDepth(depth);
        this.scene.propSprites.set(propKey, img);
        return;
      }
    }

    const g = this.scene.add.graphics().setDepth(y);
    const l = x - w / 2, t = y - h / 2;
    switch (propType) {
      case 'couch': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.9);
        g.strokeRect(l, t, w, h);
        // Cushion dividers
        g.lineStyle(1.5, stroke, 0.45);
        const cw = w / 3;
        g.lineBetween(l + cw, t + 4, l + cw, t + h - 4);
        g.lineBetween(l + cw * 2, t + 4, l + cw * 2, t + h - 4);
        break;
      }
      case 'tv': {
        g.fillStyle(0x374151, 1);
        g.fillRect(l, t, w, h);
        g.fillStyle(0x050a14, 1);
        g.fillRect(l + 3, t + 3, w - 6, h - 6);
        // Screen glow edge
        g.lineStyle(1.5, 0x38bdf8, 0.55);
        g.strokeRect(l + 4, t + 4, w - 8, h - 8);
        break;
      }
      case 'desk': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        // Monitor
        const mx = l + w - 30, my = t + 4;
        g.fillStyle(0x1e293b, 1);
        g.fillRect(mx, my, 24, 16);
        g.lineStyle(1, 0x60a5fa, 0.5);
        g.strokeRect(mx, my, 24, 16);
        break;
      }
      case 'wall': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        // Faint panel seams so a flat storefront wall doesn't read as a raw rect.
        g.lineStyle(1, stroke, 0.3);
        for (let sx = l + w / 4; sx < l + w; sx += w / 4) {
          g.lineBetween(sx, t + 2, sx, t + h - 2);
        }
        break;
      }
      case 'window': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.9);
        g.strokeRect(l, t, w, h);
        // Muntin cross-bars + a soft glass highlight.
        g.lineStyle(1.5, stroke, 0.6);
        g.lineBetween(x, t + 2, x, t + h - 2);
        g.lineBetween(l + 2, y, l + w - 2, y);
        g.fillStyle(0xffffff, 0.06);
        g.fillRect(l + 2, t + 2, w * 0.4, h - 4);
        break;
      }
      case 'counter': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        g.lineStyle(1.5, 0xffffff, 0.12);
        g.lineBetween(l + 3, t + 3, l + w - 3, t + 3);
        break;
      }
      case 'sink': {
        const r = Math.min(w, h) * 0.4;
        g.fillStyle(fill, 1);
        g.fillEllipse(x, y, r * 2, r * 1.3);
        g.lineStyle(2, stroke, 0.8);
        g.strokeEllipse(x, y, r * 2, r * 1.3);
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(x, y, 3);
        break;
      }
      case 'fridge': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        g.lineStyle(1.5, stroke, 0.4);
        g.lineBetween(l + 3, y, l + w - 3, y);
        // Handle
        g.lineStyle(2, 0xd1d5db, 0.7);
        g.lineBetween(l + w - 7, y - h / 4, l + w - 7, y - h / 4 + 8);
        break;
      }
      case 'door': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.9);
        g.strokeRect(l, t, w, h);
        g.fillStyle(0xd97706, 1);
        g.fillCircle(l + w - 7, y, 3);
        break;
      }
      case 'car': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.9);
        g.strokeRect(l, t, w, h);
        g.fillStyle(0x1e3a5f, 0.65);
        g.fillRect(l + 4, t + 4, w - 8, h * 0.22);
        g.fillRect(l + 4, t + h - 4 - h * 0.22, w - 8, h * 0.22);
        break;
      }
      case 'tree': {
        const tr = Math.max(w, h) / 2;
        g.fillStyle(0x166534, 1);
        g.fillCircle(x, y, tr);
        g.fillStyle(0x15803d, 1);
        g.fillCircle(x, y - 3, tr * 0.65);
        g.lineStyle(1.5, 0x14532d, 0.6);
        g.strokeCircle(x, y, tr);
        g.setDepth(y + 50); // tall props sort higher
        break;
      }
      case 'bed': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        // Pillow(s)
        g.fillStyle(0xf1f5f9, 0.8);
        g.fillRect(l + 5, t + 5, w * 0.4, h * 0.3);
        if (w > 70) g.fillRect(l + w - 5 - w * 0.4, t + 5, w * 0.4, h * 0.3);
        break;
      }
      case 'bench': {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        // Slat lines
        g.lineStyle(1, stroke, 0.35);
        for (let sx = l + w / 4; sx < l + w; sx += w / 4) {
          g.lineBetween(sx, t + 3, sx, t + h - 3);
        }
        break;
      }
      case 'firepit': {
        // Stone ring
        const fr = Math.min(w, h) * 0.45;
        g.fillStyle(0x57534e, 1);
        g.fillCircle(x, y, fr);
        g.fillStyle(0x292524, 1);
        g.fillCircle(x, y, fr * 0.65);
        // Embers glow in the center
        g.fillStyle(0xff4500, 0.7);
        g.fillCircle(x, y, fr * 0.3);
        g.fillStyle(0xffd700, 0.5);
        g.fillCircle(x, y, fr * 0.12);
        // Flame particles (capped at 6 particles)
        if (this.scene.textures.exists('particle_dot')) {
          const em = this.scene.add.particles(x, y - fr * 0.3, 'particle_dot', {
            lifespan: 700,
            speed: { min: 18, max: 36 },
            angle: { min: 255, max: 285 },
            scale: { start: 0.35, end: 0 },
            tint: [0xff4500, 0xff8c00, 0xffd700],
            quantity: 1,
            frequency: 130,
            maxParticles: 0,
            blendMode: Phaser.BlendModes.ADD,
          });
          em.setDepth(y + 2);
          this.scene.particleEmitters.push(em);
        }
        break;
      }
      case 'hottub': {
        // Tub shell (outer rect, rounded-feel via two fills)
        g.fillStyle(0x0369a1, 1);
        g.fillRect(l, t, w, h);
        // Water surface (inner, lighter blue)
        const htPad = Math.min(w, h) * 0.1;
        g.fillStyle(0x38bdf8, 0.85);
        g.fillRect(l + htPad, t + htPad, w - htPad * 2, h - htPad * 2);
        // Bubbles (4 circles)
        g.fillStyle(0x7dd3fc, 0.6);
        const htR = Math.min(w, h) * 0.07;
        [[0.3, 0.35], [0.6, 0.55], [0.45, 0.7], [0.7, 0.3]].forEach(([fx, fy]) => {
          g.fillCircle(l + w * fx, t + h * fy, htR);
        });
        g.lineStyle(2, 0x0284c7, 1);
        g.strokeRect(l, t, w, h);
        break;
      }
      case 'arcade': {
        // Cabinet body
        g.fillStyle(0x1e1b4b, 1);
        g.fillRect(l, t, w, h);
        // Screen (top third, green CRT glow)
        const scrH = h * 0.38, scrPad = w * 0.12;
        g.fillStyle(0x052e16, 1);
        g.fillRect(l + scrPad, t + h * 0.08, w - scrPad * 2, scrH);
        g.fillStyle(0x4ade80, 0.6);
        g.fillRect(l + scrPad + 2, t + h * 0.08 + 2, w - scrPad * 2 - 4, scrH - 4);
        // Joystick ball
        g.fillStyle(0xf43f5e, 1);
        g.fillCircle(l + w * 0.35, t + h * 0.68, w * 0.1);
        // Buttons (2)
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(l + w * 0.62, t + h * 0.66, w * 0.07);
        g.fillStyle(0x60a5fa, 1);
        g.fillCircle(l + w * 0.78, t + h * 0.72, w * 0.07);
        g.lineStyle(2, 0x818cf8, 1);
        g.strokeRect(l, t, w, h);
        break;
      }
      default: {
        g.fillStyle(fill, 1);
        g.fillRect(l, t, w, h);
        g.lineStyle(2, stroke, 0.8);
        g.strokeRect(l, t, w, h);
        break;
      }
    }
  }

  public addMapObject(x: number, y: number, w: number, h: number, fillColor: number, strokeColor: number, propType?: string, propKey?: string): Phaser.GameObjects.Rectangle {
    // Invisible static physics body — visual is provided by drawPropShape
    const rect = this.scene.add.rectangle(x, y, w, h, fillColor, 0);
    this.scene.physics.add.existing(rect, true);
    (rect.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
    this.drawPropShape(x, y, w, h, fillColor, strokeColor, propType, propKey);
    return rect;
  }

  public createWall(x: number, y: number, w: number, h: number) {
    const obstacle = this.scene.add.rectangle(x, y, w, h, 0x374151, 0.8).setStrokeStyle(1.5, 0x4b5563, 0.6).setDepth(-5);
    this.scene.physics.add.existing(obstacle, true);
    (obstacle.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
    this.scene.walls.add(obstacle);
  }

  public createRoomLabel(_x: number, _y: number, _name: string, _detail: string, _colorHex: string) {}
}
