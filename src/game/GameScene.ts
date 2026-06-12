import Phaser from 'phaser';
import {
  CharacterClass,
  EnemyConfig,
  BOSSES,
  BossConfig,
  LORE_BARKS,
  WEAPONS,
  ENEMIES,
  NPC_CHARACTERS
} from '../data';
import plasmaShieldImg from '../assets/images/plasma_shield_1781235159690.jpg';
import heroEricImg from '../assets/images/hero_eric_1781236098529.jpg';
import heroJacobImg from '../assets/images/hero_jacob_1781236113357.jpg';
import heroNickFImg from '../assets/images/hero_nick_f_1781236122782.jpg';
import heroNickHImg from '../assets/images/hero_nick_h_1781236135006.jpg';
import enemyTicketmasterImg from '../assets/images/enemy_ticketmaster.jpg';
import enemyDishesImg from '../assets/images/enemy_dishes.jpg';
import enemyZombieImg from '../assets/images/enemy_zombie.jpg';
import enemyFratBroImg from '../assets/images/enemy_frat_bro.jpg';
import neighborhoodMapImg from '../assets/images/neighborhood_map.jpg';
import bossEricImg from '../assets/images/boss_eric.jpg';
import bossAudreyImg from '../assets/images/boss_audrey.jpg';
import bossFloridaImg from '../assets/images/boss_florida.jpg';
import bossBenImg from '../assets/images/boss_ben.jpg';
import bossNickFImg from '../assets/images/boss_nick_f.jpg';
import coinImg from '../assets/images/coin.jpg';
import shardImg from '../assets/images/shard.jpg';
import { preprocessShowcaseSheet } from './SpritePreprocessor';

export default class GameScene extends Phaser.Scene {
  private playerClass!: CharacterClass;
  private currentLevelIndex: number = 0;
  private onGoldChange!: (gold: number) => void;
  private onHpChange!: (hp: number) => void;
  private onMessageLog!: (msg: string) => void;
  private onTriggerQTE!: (boss: BossConfig, callback: (success: boolean) => void) => void;
  private onLevelCompleted!: () => void;
  private onGameOver!: () => void;
  private onNpcInteract!: (npcId: string, resume: () => void) => void;

  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    F: Phaser.Input.Keyboard.Key;
  };
  private isDashing: boolean = false;
  private dashCooldown: boolean = false;
  private lastFired: number = 0;
  private lastBossAttackTime: number = 0;
  private activeGold: number = 0;
  private activeHp: number = 100;
  private isAttackingAnim: boolean = false;
  private enemyHitCooldowns = new Map<any, number>();

  // Status effects
  private brainrotLevel: number = 0;
  private subZeroActive: boolean = false;
  private subZeroActivatedOnce: boolean = false;
  private brainrotBar!: Phaser.GameObjects.Rectangle;
  private brainrotFill!: Phaser.GameObjects.Rectangle;
  private brainrotLabel!: Phaser.GameObjects.Text;

  // Groups
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private lootShards!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  // Boss health bar (floats above the boss)
  private bossHpBg: Phaser.GameObjects.Rectangle | null = null;
  private bossHpFill: Phaser.GameObjects.Rectangle | null = null;
  private bossNameLabel: Phaser.GameObjects.Text | null = null;

  // Game state
  private spawnedBoss: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private isBossActive: boolean = false;
  private bossData: BossConfig | null = null;
  private enemiesLeftToSpawn: number = 15;
  private enemiesKilledCount: number = 0;
  private currentBossHp: number = 0;
  private levelStarted: boolean = false;

  // Collider references for map objects (need to store for enemy collision setup)
  private mapCollidables: Phaser.GameObjects.Rectangle[] = [];

  // NPC interaction system
  private npcs: Array<{
    id: string;
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    prompt: Phaser.GameObjects.Text;
  }> = [];
  private dialogueOpen: boolean = false;
  private eKey!: Phaser.Input.Keyboard.Key;
  private lastMoveAngle: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  public init(data: {
    hero?: CharacterClass;
    levelIndex?: number;
    playerGold?: number;
    playerHp?: number;
    onGoldChange?: (gold: number) => void;
    onHpChange?: (hp: number) => void;
    onMessageLog?: (msg: string) => void;
    onTriggerQTE?: (boss: BossConfig, callback: (success: boolean) => void) => void;
    onLevelCompleted?: () => void;
    onGameOver?: () => void;
    onNpcInteract?: (npcId: string, resume: () => void) => void;
  }) {
    if (!data || !data.hero) return;

    this.playerClass = data.hero;
    this.currentLevelIndex = data.levelIndex ?? 0;
    this.activeGold = data.playerGold ?? 0;
    this.activeHp = data.playerHp ?? 100;
    this.onGoldChange = data.onGoldChange!;
    this.onHpChange = data.onHpChange!;
    this.onMessageLog = data.onMessageLog ?? (() => {});
    this.onTriggerQTE = data.onTriggerQTE!;
    this.onLevelCompleted = data.onLevelCompleted!;
    this.onGameOver = data.onGameOver!;
    this.onNpcInteract = data.onNpcInteract ?? (() => {});

    this.isDashing = false;
    this.dashCooldown = false;
    this.lastBossAttackTime = 0;
    this.spawnedBoss = null;
    this.isBossActive = false;
    this.levelStarted = false;
    this.enemiesLeftToSpawn = 12 + (data.levelIndex ?? 0) * 4;
    this.enemiesKilledCount = 0;
    this.enemyHitCooldowns.clear();
    this.brainrotLevel = 0;
    this.subZeroActive = false;
    this.subZeroActivatedOnce = false;
    this.mapCollidables = [];
    this.npcs = [];
    this.dialogueOpen = false;
    this.lastMoveAngle = 0;
  }

  private safeLoadImage(key: string, url: string) {
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  }

  private registerAnim(id: string, sheetKey: string, animName: string, frames: number[], frameRate: number, repeat: number) {
    const key = `${animName}_${id}`;
    if (this.anims.exists(key)) this.anims.remove(key);
    this.anims.create({
      key,
      frames: frames.map(f => ({ key: sheetKey, frame: f })),
      frameRate,
      repeat
    });
  }

  public preload() {
    this.createProceduralTextures();
    this.safeLoadImage('plasma_shield', plasmaShieldImg);
    this.safeLoadImage('hero_eric_raw_jpg', heroEricImg);
    this.safeLoadImage('hero_jacob_raw_jpg', heroJacobImg);
    this.safeLoadImage('hero_nick_f_raw_jpg', heroNickFImg);
    this.safeLoadImage('hero_nick_h_raw_jpg', heroNickHImg);
    this.safeLoadImage('neighborhood_map', neighborhoodMapImg);
    // Boss images
    this.safeLoadImage('boss_eric', bossEricImg);
    this.safeLoadImage('boss_audrey', bossAudreyImg);
    this.safeLoadImage('boss_florida', bossFloridaImg);
    this.safeLoadImage('boss_ben', bossBenImg);
    this.safeLoadImage('boss_nick_f', bossNickFImg);
    // Projectile / loot images
    this.safeLoadImage('coin_img', coinImg);
    this.safeLoadImage('shard_img', shardImg);
    // Enemy sprite sheets — BFS-processed in create() with procedural fallback
    this.safeLoadImage('enemy_ticketmaster_raw', enemyTicketmasterImg);
    this.safeLoadImage('enemy_dishes_raw', enemyDishesImg);
    this.safeLoadImage('enemy_zombie_raw', enemyZombieImg);
    this.safeLoadImage('enemy_frat_bro_raw', enemyFratBroImg);
  }

  public create() {
    if (!this.playerClass) return;

    const heroIds = ['eric', 'jacob', 'nick_f', 'nick_h'];
    heroIds.forEach(id => {
      const sheetKey = `hero_${id}_sheet`;
      if (this.textures.exists(sheetKey)) return;

      const rawKey = this.textures.exists(`hero_${id}_raw_png`) ? `hero_${id}_raw_png` : `hero_${id}_raw_jpg`;

      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);

        const cleanKey = `hero_${id}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const canvasSource = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, canvasSource, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });

        this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 12, 0);
        this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(id, sheetKey, 'victory', processed.victoryFrames, 6, -1);
        this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Spritesheet error for ${id}:`, err);
        const fallbackSource = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, fallbackSource, { frameWidth: 128, frameHeight: 128 });
        this.registerAnim(id, sheetKey, 'idle', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'walk', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'attack', [0], 12, 0);
        this.registerAnim(id, sheetKey, 'hurt', [0], 8, 0);
        this.registerAnim(id, sheetKey, 'victory', [0], 6, -1);
        this.registerAnim(id, sheetKey, 'defeat', [0], 4, 0);
      }
    });

    // Process enemy showcase sheets
    ['ticketmaster', 'dishes', 'zombie', 'frat_bro'].forEach(id => {
      const rawKey = `enemy_${id}_raw`;
      const sheetKey = `enemy_${id}_sheet`;
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);
        const cleanKey = `enemy_${id}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, {
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
      }
    });

    // Process boss showcase sheets — same format as heroes
    ['eric', 'audrey', 'florida', 'ben', 'nick_f'].forEach(bossId => {
      const rawKey = `boss_${bossId}`;
      const sheetKey = `boss_${bossId}_sheet`;
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, bossId);
        const cleanKey = `boss_${bossId}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
        this.registerAnim(`boss_${bossId}`, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim(`boss_${bossId}`, sheetKey, 'walk', processed.walkFrames, 6, -1);
        this.registerAnim(`boss_${bossId}`, sheetKey, 'attack', processed.attackFrames, 10, 0);
        this.registerAnim(`boss_${bossId}`, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(`boss_${bossId}`, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Boss spritesheet error for boss_${bossId}:`, err);
      }
    });

    // Process coin and shard showcase sheets → use frame 0 as projectile/loot sprite
    ['coin', 'shard'].forEach(id => {
      const rawKey = `${id}_img`;
      const sheetKey = `${id}_sheet`;
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);
        const cleanKey = `${id}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
      } catch (err) {
        console.error(`[GameScene] ${id} spritesheet error:`, err);
      }
    });

    // Player is confined to the 1000x1000 neighborhood, but the camera is left
    // unbounded and given a grass-colored backdrop so wide/tall viewports show
    // an endless cozy lawn around the edges instead of black bars.
    this.physics.world.setBounds(0, 0, 1000, 1000);
    this.cameras.main.setBackgroundColor(0x16331a);

    this.buildNeighborhoodMap();

    this.projectiles = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.lootShards = this.physics.add.group();
    this.walls = this.physics.add.staticGroup();

    // Outer world boundary walls
    this.createWall(500, 2, 1000, 10);
    this.createWall(500, 998, 1000, 10);
    this.createWall(2, 500, 10, 1000);
    this.createWall(998, 500, 10, 1000);

    // Building perimeter walls (matching neighborhood map)
    // Commons 1522 block
    this.createWall(100, 180, 200, 10);
    this.createWall(100, 360, 200, 10);
    this.createWall(195, 270, 10, 180);
    this.createWall(5, 270, 10, 180);

    // Watchwater block (top-right)
    this.createWall(900, 180, 200, 10);
    this.createWall(900, 360, 200, 10);
    this.createWall(995, 270, 10, 180);
    this.createWall(805, 270, 10, 180);

    // Nick's Garage (bottom-left)
    this.createWall(100, 640, 200, 10);
    this.createWall(100, 820, 200, 10);
    this.createWall(195, 730, 10, 180);
    this.createWall(5, 730, 10, 180);

    // Jacob's Vault (bottom-right)
    this.createWall(900, 640, 200, 10);
    this.createWall(900, 820, 200, 10);
    this.createWall(995, 730, 10, 180);
    this.createWall(805, 730, 10, 180);

    // Interior map objects (collidable)
    const gSink = this.addMapObject(790, 210, 44, 36, 0x0369a1, 0x38bdf8, 'SINK');
    const gCouch = this.addMapObject(500, 510, 90, 32, 0x991b1b, 0xef4444, 'COUCH');
    const gCar = this.addMapObject(100, 720, 76, 32, 0x334155, 0x64748b, 'C55 AMG');
    const gVault = this.addMapObject(900, 720, 60, 50, 0x78350f, 0xd97706, 'VAULT');

    this.mapCollidables = [gSink, gCouch, gCar, gVault];

    const sheetKey = 'hero_' + this.playerClass.id + '_sheet';
    this.player = this.physics.add.sprite(500, 500, sheetKey, 0);
    this.player.setScale(0.5);
    this.player.setCircle(22, 42, 45);
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(500, 500);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.0);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      F: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F)
    };
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.physics.add.collider(this.player, this.walls);
    this.mapCollidables.forEach(obj => {
      this.physics.add.collider(this.player, obj as any);
      this.physics.add.collider(this.enemies, obj as any);
      this.physics.add.collider(this.projectiles, obj as any, (p: any) => p.destroy());
      this.physics.add.collider(this.enemyProjectiles, obj as any, (p: any) => p.destroy());
    });
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.projectiles, this.walls, (p: any) => p.destroy());
    this.physics.add.collider(this.enemyProjectiles, this.walls, (p: any) => p.destroy());

    this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileHitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyMeleeHit, undefined, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.handleProjectileHitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.lootShards, this.handleCollectLoot, undefined, this);

    this.buildBrainrotHUD();
    this.setupNPCs();

    this.onMessageLog(`⚔️ ${this.playerClass.name} deployed! WASD to move, SPACE to dash, E to talk to friends.`);

    this.time.addEvent({
      delay: 2000,
      callback: this.spawnLevelEnemy,
      callbackScope: this,
      loop: true
    });

    // Brainrot slow drain over time
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.brainrotLevel > 0) {
          this.brainrotLevel = Math.max(0, this.brainrotLevel - 2);
          this.updateBrainrotHUD();
        }
      },
      loop: true
    });

    if (this.playerClass.id === 'eric') {
      this.time.addEvent({
        delay: 4000,
        callback: () => {
          this.activeGold += 3;
          this.onGoldChange(this.activeGold);
          this.showPassiveIconText(this.player.x, this.player.y - 30, '+$3 (Spotify Admin)', '#10b981');
        },
        loop: true
      });
    }

    this.levelStarted = true;

    // Keep camera-anchored HUD in place when the viewport resizes
    this.scale.on('resize', this.repositionHUD, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.repositionHUD, this));

    // Ensure the canvas has keyboard focus (Phaser 3 uses window listeners, but
    // Chrome requires the canvas to have tabindex + focus to capture keys)
    this.input.on('pointerdown', () => this.game.canvas.focus());
    this.time.delayedCall(100, () => {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    });
  }

  // ─── Map Building ────────────────────────────────────────────────────────────

  private buildNeighborhoodMap() {
    const W = 1000, H = 1000;
    const ROAD_W = 80;

    // Endless lawn that extends well past the playable area so wide/tall
    // viewports frame the neighborhood with grass instead of black bars.
    this.add.rectangle(W / 2, H / 2, 5000, 5000, 0x16331a, 1).setDepth(-12);
    for (let i = 0; i < 60; i++) {
      const gx = Phaser.Math.Between(-1400, 2400);
      const gy = Phaser.Math.Between(-1400, 2400);
      // skip the core neighborhood — those trees are placed deliberately below
      if (gx > -120 && gx < 1120 && gy > -120 && gy < 1120) continue;
      this.add.circle(gx, gy, 20, 0x14532d).setDepth(-11.5);
      this.add.circle(gx, gy - 3, 13, 0x166534).setDepth(-11.4);
    }

    // Use actual neighborhood map as base layer if loaded
    if (this.textures.exists('neighborhood_map')) {
      const mapBg = this.add.image(W / 2, H / 2, 'neighborhood_map');
      mapBg.setDisplaySize(W, H).setDepth(-11).setAlpha(0.85);
    }

    // Base grass (fallback / tint layer)
    this.add.rectangle(W / 2, H / 2, W, H, 0x4ade80, this.textures.exists('neighborhood_map') ? 0.15 : 1).setDepth(-10);
    // Slightly darker lawn areas
    this.add.rectangle(220, 220, 380, 360, 0x22c55e, 0.6).setDepth(-9);
    this.add.rectangle(780, 220, 380, 360, 0x22c55e, 0.6).setDepth(-9);
    this.add.rectangle(220, 750, 380, 360, 0x22c55e, 0.6).setDepth(-9);
    this.add.rectangle(780, 750, 380, 360, 0x22c55e, 0.6).setDepth(-9);

    // Dirt/stone roads
    this.add.rectangle(W / 2, H / 2, ROAD_W, H, 0x9ca3af).setDepth(-8);   // vertical road
    this.add.rectangle(W / 2, H / 2, W, ROAD_W, 0x9ca3af).setDepth(-8);   // horizontal road
    // Road center lines
    this.add.rectangle(500, 500, 4, H, 0xfbbf24, 0.5).setDepth(-7.5);
    this.add.rectangle(500, 500, W, 4, 0xfbbf24, 0.5).setDepth(-7.5);
    // Sidewalks
    this.add.rectangle(W / 2, H / 2, ROAD_W + 16, H, 0, 0).setStrokeStyle(3, 0xd1d5db, 0.7).setDepth(-8.5);
    this.add.rectangle(W / 2, H / 2, W, ROAD_W + 16, 0, 0).setStrokeStyle(3, 0xd1d5db, 0.7).setDepth(-8.5);

    // ── TOP-LEFT: Commons 1522 ──────────────────────────────────────────────
    this.add.rectangle(110, 220, 200, 250, 0xfef9c3).setStrokeStyle(3, 0xca8a04, 0.9).setDepth(-7);
    this.add.rectangle(110, 120, 200, 50, 0xfbbf24, 0.85).setDepth(-7); // roof overhang
    this.createRoomLabel(110, 170, "COMMONS 1522", "APT BATTLEGROUND", "#78350f");
    // Door
    this.add.rectangle(110, 340, 28, 18, 0x78350f).setStrokeStyle(2, 0x92400e).setDepth(-6);
    // Windows
    this.add.rectangle(70, 240, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);
    this.add.rectangle(150, 240, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);
    this.add.rectangle(70, 280, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);
    this.add.rectangle(150, 280, 24, 20, 0x93c5fd, 0.85).setStrokeStyle(1.5, 0x60a5fa).setDepth(-6);

    // ── TOP-CENTER: Kitchen annex (sink hazard) ─────────────────────────────
    this.add.rectangle(310, 200, 120, 150, 0xf1f5f9).setStrokeStyle(2, 0x94a3b8, 0.75).setDepth(-7);
    this.createRoomLabel(310, 165, "KITCHEN SINK", "25 FORKS HAZARD", "#475569");

    // ── TOP-RIGHT: 12 Watchwater Way ────────────────────────────────────────
    this.add.rectangle(890, 220, 200, 250, 0xfce7f3).setStrokeStyle(3, 0xdb2777, 0.9).setDepth(-7);
    this.add.rectangle(890, 120, 200, 50, 0xf472b6, 0.85).setDepth(-7); // roof
    this.createRoomLabel(890, 170, "12 WATCHWATER", "BEN BER'S FRONT DOOR", "#be185d");
    this.add.rectangle(890, 340, 28, 18, 0x9d174d).setStrokeStyle(2, 0xbe185d).setDepth(-6);
    this.add.rectangle(850, 240, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);
    this.add.rectangle(930, 240, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);
    this.add.rectangle(850, 280, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);
    this.add.rectangle(930, 280, 24, 20, 0xfda4af, 0.85).setStrokeStyle(1.5, 0xfb7185).setDepth(-6);

    // ── CENTER LOUNGE: Heated Rivalry TV Room ───────────────────────────────
    this.add.rectangle(500, 240, 120, 100, 0x3e1f1f, 0.8).setStrokeStyle(2, 0x8d6e63, 0.55).setDepth(-7);
    this.createRoomLabel(500, 230, "HEATED RIVALRY", "📺 BASECAMP LOUNGE", "#f5c2c2");
    this.add.rectangle(500, 270, 60, 20, 0x450a0a).setStrokeStyle(2, 0x991b1b).setDepth(-6); // TV

    // ── BOTTOM-LEFT: Nick's AMG Garage ──────────────────────────────────────
    this.add.rectangle(110, 760, 200, 250, 0x1e293b).setStrokeStyle(3, 0x475569, 0.9).setDepth(-7);
    this.add.rectangle(110, 660, 200, 50, 0x334155, 0.85).setDepth(-7); // roof
    this.createRoomLabel(110, 710, "NICK'S GARAGE", "C55 AMG WORKSHOP", "#94a3b8");
    this.add.rectangle(110, 880, 70, 16, 0x64748b).setStrokeStyle(2, 0x94a3b8).setDepth(-6); // garage door

    // ── BOTTOM-CENTER: Aidan's Sublease Suite ───────────────────────────────
    this.add.rectangle(310, 780, 120, 160, 0x0f172a, 0.8).setStrokeStyle(2, 0x1e293b, 0.7).setDepth(-7);
    this.createRoomLabel(310, 775, "AIDAN'S SUITE", "SUBLEASED TERRITORY", "#64748b");

    // ── BOTTOM-RIGHT: Jacob's Vault ─────────────────────────────────────────
    this.add.rectangle(890, 760, 200, 250, 0x3b1c00).setStrokeStyle(3, 0xd97706, 0.9).setDepth(-7);
    this.add.rectangle(890, 660, 200, 50, 0xd97706, 0.85).setDepth(-7); // golden roof
    this.createRoomLabel(890, 710, "JACOB'S VAULT", "$3,900 LIQUID RESERVES", "#fde047");
    this.add.rectangle(890, 880, 40, 36, 0x78350f).setStrokeStyle(3, 0xd97706).setDepth(-6); // vault door

    // ── Trees (pixel-style circles) ─────────────────────────────────────────
    const treePositions = [
      [60, 400], [160, 400], [60, 590], [160, 590],
      [840, 400], [940, 400], [840, 590], [940, 590],
      [380, 100], [620, 100], [380, 900], [620, 900],
      [400, 440], [600, 440], [400, 560], [600, 560]
    ];
    treePositions.forEach(([tx, ty]) => {
      this.add.circle(tx, ty, 18, 0x15803d).setDepth(-6.5);
      this.add.circle(tx, ty, 12, 0x16a34a).setDepth(-6);
      this.add.circle(tx, ty - 2, 8, 0x22c55e).setDepth(-5.5);
    });

    // ── Fences along road edge ───────────────────────────────────────────────
    this.add.rectangle(232, 448, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(232, 552, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(768, 448, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(768, 552, 464, 6, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(448, 232, 6, 464, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(552, 232, 6, 464, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(448, 768, 6, 464, 0x78350f, 0.6).setDepth(-6);
    this.add.rectangle(552, 768, 6, 464, 0x78350f, 0.6).setDepth(-6);

    // World border
    this.add.rectangle(W / 2, H / 2, W, H).setStrokeStyle(6, 0x4b5563, 0.8).setDepth(-4);
  }

  // Higher-DPI text rendering. Phaser draws text to a texture at the font's
  // pixel size and then scales it to the canvas — without bumping resolution,
  // small fonts come out blurry. Render at device pixel ratio (min 2x).
  private get textRes(): number {
    return Math.max(2, Math.ceil((typeof window !== 'undefined' ? window.devicePixelRatio : 1) * 2));
  }

  /** Crisp text helper — applies resolution + a readable default font. */
  private label(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle = {}
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: 'JetBrains Mono, monospace',
      resolution: this.textRes,
      ...style
    });
  }

  private addMapObject(x: number, y: number, w: number, h: number, fillColor: number, strokeColor: number, label: string): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, fillColor).setStrokeStyle(2, strokeColor, 0.9).setDepth(-5);
    this.physics.add.existing(rect, true);
    this.label(x, y, label, {
      fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(-4);
    return rect;
  }

  private createWall(x: number, y: number, w: number, h: number) {
    const obstacle = this.add.rectangle(x, y, w, h, 0x374151, 0.8).setStrokeStyle(1.5, 0x4b5563, 0.6).setDepth(-5);
    this.physics.add.existing(obstacle, true);
    this.walls.add(obstacle);
  }

  private createRoomLabel(x: number, y: number, name: string, detail: string, colorHex: string) {
    const w = Math.max(150, name.length * 11 + 28);
    this.add.rectangle(x, y, w, 40, 0x0b1208, 0.82).setStrokeStyle(1.5, 0x3a5520, 0.6).setDepth(-5);
    this.label(x, y - 9, name, {
      fontSize: '14px', color: colorHex, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(-4);
    this.label(x, y + 9, detail, {
      fontSize: '10px', color: '#9ca8b8',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(-4);
  }

  // ─── Brainrot HUD ─────────────────────────────────────────────────────────

  private buildBrainrotHUD() {
    const cam = this.cameras.main;
    const cx = cam.width - 160;
    const cy = 24;

    this.brainrotBar = this.add.rectangle(cx, cy, 120, 12, 0x1e293b)
      .setStrokeStyle(1.5, 0x7c3aed, 0.8)
      .setScrollFactor(0)
      .setDepth(100);

    this.brainrotFill = this.add.rectangle(cx - 60, cy, 0, 10, 0xa78bfa)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.brainrotLabel = this.label(cx, cy - 13, 'BRAINROT', {
      fontSize: '11px', color: '#c4b5fd', fontStyle: 'bold',
      stroke: '#0b1208', strokeThickness: 3
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(102);
  }

  private lastCanvasW = 0;
  private lastCanvasH = 0;

  /** Resize the game to match its container whenever that container changes. */
  private syncCanvasToParent() {
    const parent = this.game.canvas?.parentElement;
    if (!parent) return;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    if (w < 1 || h < 1) return;
    if (w === this.lastCanvasW && h === this.lastCanvasH) return;
    this.lastCanvasW = w;
    this.lastCanvasH = h;
    this.scale.resize(w, h);
    this.repositionHUD();
  }

  /** Reposition camera-anchored HUD when the viewport size changes. */
  private repositionHUD() {
    const cam = this.cameras.main;
    const cx = cam.width - 160;
    const cy = 24;
    if (this.brainrotBar) this.brainrotBar.setPosition(cx, cy);
    if (this.brainrotFill) this.brainrotFill.setPosition(cx - 60, cy);
    if (this.brainrotLabel) this.brainrotLabel.setPosition(cx, cy - 13);
  }

  private updateBrainrotHUD() {
    if (!this.brainrotFill) return;
    const fillW = (this.brainrotLevel / 100) * 120;
    this.brainrotFill.setSize(fillW, 10);
    const alpha = this.brainrotLevel > 0 ? 1 : 0.3;
    this.brainrotFill.setAlpha(alpha);
    this.brainrotLabel.setAlpha(alpha);
    this.brainrotBar.setAlpha(alpha > 0.3 ? 1 : 0.3);
  }

  // ─── Update Loop ─────────────────────────────────────────────────────────────

  public update(time: number, _delta: number) {
    if (!this.levelStarted) return;

    // Keep the canvas glued to its container every rendered frame. Phaser's RAF
    // loop is the most reliable ticker available — more dependable than
    // ResizeObserver or setInterval, which some embedded/headless contexts
    // throttle or never fire. The guard makes this a cheap no-op when unchanged.
    this.syncCanvasToParent();

    // ── NPC proximity + E-key interaction ─────────────────────────────────
    let nearNpcId: string | null = null;
    this.npcs.forEach(npc => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
      const inRange = dist < 100;
      npc.prompt.setVisible(inRange && !this.dialogueOpen);
      if (inRange) nearNpcId = npc.id;
    });

    if (!this.dialogueOpen && nearNpcId && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      const npcId = nearNpcId;
      this.dialogueOpen = true;
      this.npcs.forEach(n => n.prompt.setVisible(false));
      this.physics.pause();
      this.onNpcInteract(npcId, () => {
        this.dialogueOpen = false;
        this.physics.resume();
      });
    }

    // Pause all gameplay input while dialogue is open
    if (this.dialogueOpen) return;

    let vx = 0;
    let vy = 0;
    const speed = this.playerClass.speed;

    if (this.wasdKeys.W.isDown || this.cursors.up.isDown) vy = -speed;
    else if (this.wasdKeys.S.isDown || this.cursors.down.isDown) vy = speed;
    if (this.wasdKeys.A.isDown || this.cursors.left.isDown) vx = -speed;
    else if (this.wasdKeys.D.isDown || this.cursors.right.isDown) vx = speed;

    // Track last movement direction for auto-fire aim
    if (vx !== 0 || vy !== 0) {
      this.lastMoveAngle = Math.atan2(vy, vx);
    }

    if (this.playerClass.id === 'nick_h') {
      const h = new Date().getHours();
      const m = new Date().getMinutes();
      if (h > 22 || (h === 22 && m >= 30)) {
        vx *= 0.5;
        vy *= 0.5;
      }
    }

    if (!this.isDashing && !this.isAttackingAnim) {
      this.player.setVelocity(vx, vy);
      if (vx !== 0 || vy !== 0) {
        if (this.player.anims.currentAnim?.key !== 'walk_' + this.playerClass.id) {
          this.player.play('walk_' + this.playerClass.id);
        }
      } else {
        if (this.player.anims.currentAnim?.key !== 'idle_' + this.playerClass.id) {
          this.player.play('idle_' + this.playerClass.id);
        }
      }
    } else if (this.isAttackingAnim) {
      this.player.setVelocity(vx, vy);
    }

    if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.SPACE)) {
      this.executeDash(vx, vy);
    }

    // Auto-fire at nearest enemy — no mouse required
    const nearest = this.findNearestEnemy();
    if (nearest) {
      this.fireWeapon(time, nearest.x, nearest.y);
    }

    this.updateEnemyAI(time);

    if (this.isBossActive && this.spawnedBoss && this.bossData) {
      this.handleBossAI(time);
      this.updateBossHpBarPosition();
    }
  }

  // ─── Enemy AI ─────────────────────────────────────────────────────────────

  private updateEnemyAI(time: number) {
    this.enemies.getChildren().forEach((obj: any) => {
      if (!obj.active) return;
      const config: EnemyConfig = obj.getData('config');
      if (!config) return;

      const dist = Phaser.Math.Distance.Between(obj.x, obj.y, this.player.x, this.player.y);
      const angle = Phaser.Math.Angle.Between(obj.x, obj.y, this.player.x, this.player.y);
      const spd: number = obj.getData('speed') ?? config.speed;

      switch (config.aiType) {
        case 'shooter':
          this.aiShooter(obj, dist, angle, spd, time);
          break;
        case 'charger':
          this.aiCharger(obj, dist, angle, spd, time);
          break;
        case 'grunter':
          this.aiGrunter(obj, dist, angle, spd, time);
          break;
        case 'heavy':
          this.aiHeavy(obj, dist, angle, spd, time);
          break;
        default:
          // Simple chase fallback
          obj.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
      }

      // Occasional random bark
      if (Math.random() < 0.001) {
        const barks: string[] = config.barks ?? [];
        if (barks.length > 0) {
          this.showBubbleText(obj, barks[Math.floor(Math.random() * barks.length)], '#fca5a5');
        }
      }
    });
  }

  // Ticketmaster: hold at range, fires ticket bolt every 2.5s
  private aiShooter(enemy: any, dist: number, angle: number, spd: number, time: number) {
    const PREFERRED_RANGE = 300;
    const FLEE_RANGE = 150;

    if (dist > PREFERRED_RANGE) {
      enemy.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
    } else if (dist < FLEE_RANGE) {
      enemy.setVelocity(-Math.cos(angle) * spd * 0.8, -Math.sin(angle) * spd * 0.8);
    } else {
      enemy.setVelocity(0, 0);
    }

    const lastShot: number = enemy.getData('lastShootTime') ?? 0;
    if (time - lastShot > 2500 && dist < PREFERRED_RANGE + 80) {
      enemy.setData('lastShootTime', time);
      this.fireEnemyTicket(enemy, angle);
    }
  }

  private fireEnemyTicket(enemy: any, angle: number) {
    for (let i = -1; i <= 1; i++) {
      const spread = angle + (i * 0.18);
      const bolt = this.physics.add.sprite(enemy.x, enemy.y, 'ticket_bolt');
      bolt.setVelocity(Math.cos(spread) * 280, Math.sin(spread) * 280);
      bolt.setDepth(5);
      this.enemyProjectiles.add(bolt);
      this.time.delayedCall(2500, () => { if (bolt.active) bolt.destroy(); });
    }
    if (Math.random() < 0.3) {
      this.showBubbleText(enemy, 'Service fee: BULLETS.', '#93c5fd');
    }
  }

  // Galaxy Gas Zombie: slow approach, then burst charge at 400px
  private aiCharger(enemy: any, dist: number, angle: number, spd: number, time: number) {
    const isCharging: boolean = enemy.getData('isCharging') ?? false;
    const lastCharge: number = enemy.getData('lastChargeTime') ?? 0;

    if (isCharging) {
      // Charge is handled by the velocity set when charge started; just let it coast
      if (time - lastCharge > 800) {
        enemy.setData('isCharging', false);
      }
      return;
    }

    if (dist < 400 && time - lastCharge > 3000) {
      // Initiate charge
      enemy.setData('isCharging', true);
      enemy.setData('lastChargeTime', time);
      enemy.setVelocity(Math.cos(angle) * spd * 2.5, Math.sin(angle) * spd * 2.5);
      this.showBubbleText(enemy, '*HISS* B12 INCOMING!', '#a78bfa');
      this.cameras.main.shake(80, 0.006);
    } else {
      // Normal slow approach
      enemy.setVelocity(Math.cos(angle) * spd * 0.7, Math.sin(angle) * spd * 0.7);
    }
  }

  // Dish stack: normal approach + fork throw when in range
  private aiGrunter(enemy: any, dist: number, angle: number, spd: number, time: number) {
    enemy.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

    const lastFork: number = enemy.getData('lastForkTime') ?? 0;
    if (dist < 260 && time - lastFork > 3000) {
      enemy.setData('lastForkTime', time);
      this.throwFork(enemy, angle);
    }
  }

  private throwFork(enemy: any, angle: number) {
    const fork = this.physics.add.sprite(enemy.x, enemy.y, 'fork_proj');
    fork.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
    fork.setRotation(angle);
    fork.setDepth(5);
    this.enemyProjectiles.add(fork);
    this.time.delayedCall(2000, () => { if (fork.active) fork.destroy(); });
    if (Math.random() < 0.4) {
      this.showBubbleText(enemy, 'RINSE THE DISHES!!!', '#fef3c7');
    }
  }

  // Frat Bro: slow melee, AoE shout at close range
  private aiHeavy(enemy: any, dist: number, angle: number, spd: number, time: number) {
    enemy.setVelocity(Math.cos(angle) * spd * 0.65, Math.sin(angle) * spd * 0.65);

    const lastShout: number = enemy.getData('lastShoutTime') ?? 0;
    if (dist < 110 && time - lastShout > 5000) {
      enemy.setData('lastShoutTime', time);
      this.fraternityShout(enemy);
    }
  }

  private fraternityShout(enemy: any) {
    this.showBubbleText(enemy, 'BRO!! UMBC RULES BRO!!', '#fef08a');
    this.cameras.main.shake(200, 0.01);
    // Radial shockwave visual
    const ring = this.add.circle(enemy.x, enemy.y, 10, 0xd97706, 0.5).setDepth(6);
    this.tweens.add({
      targets: ring,
      scaleX: 10, scaleY: 10, alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy()
    });
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    if (dist < 130) {
      const pushAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.player.setVelocity(Math.cos(pushAngle) * 500, Math.sin(pushAngle) * 500);
      this.damagePlayer(8, 'Frat Bro Shout AoE');
    }
  }

  // ─── Dash ─────────────────────────────────────────────────────────────────

  private executeDash(vx: number, vy: number) {
    if (this.dashCooldown || this.isDashing) return;

    if (this.playerClass.id === 'nick_f' && Math.random() < 0.05) {
      this.onMessageLog('⚠️ Keys locked in the C55 AMG — dash failed!');
      this.dashCooldown = true;
      this.showBubbleText(this.player, 'KEYS LOCKED IN C55 AMG 💀', '#ef4444');
      this.time.delayedCall(4000, () => { this.dashCooldown = false; });
      return;
    }

    this.isDashing = true;
    this.dashCooldown = true;

    const dashFactor = this.playerClass.id === 'nick_f' ? 3.0 : 2.2;
    const dashX = vx === 0 && vy === 0 ? this.playerClass.speed * dashFactor : vx * dashFactor;
    const dashY = vx === 0 && vy === 0 ? 0 : vy * dashFactor;

    this.player.setVelocity(dashX, dashY);

    try {
      const shieldFlash = this.add.sprite(this.player.x, this.player.y, 'plasma_shield');
      shieldFlash.setOrigin(0.5).setScale(0.12).setDepth(15).setAlpha(0.7);
      this.tweens.add({
        targets: shieldFlash,
        scale: 0.55, alpha: 0,
        x: this.player.x + dashX * 0.12,
        y: this.player.y + dashY * 0.12,
        duration: 350,
        onComplete: () => shieldFlash.destroy()
      });
    } catch {}

    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 60, () => {
        const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name);
        ghost.setScale(this.player.scaleX).setAlpha(0.6 - i * 0.15).setRotation(this.player.rotation);
        this.tweens.add({ targets: ghost, alpha: 0, scale: 0.8, duration: 300, onComplete: () => ghost.destroy() });
      });
    }

    this.time.delayedCall(220, () => { this.isDashing = false; });
    this.time.delayedCall(this.playerClass.id === 'nick_f' ? 900 : 1500, () => { this.dashCooldown = false; });
  }

  // ─── Weapons ──────────────────────────────────────────────────────────────

  private findNearestEnemy(): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let nearestDist = Infinity;
    const candidates: any[] = this.isBossActive && this.spawnedBoss
      ? [this.spawnedBoss]
      : (this.enemies.getChildren() as any[]);
    candidates.forEach(obj => {
      if (!obj.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y);
      if (d < nearestDist) { nearestDist = d; nearest = { x: obj.x, y: obj.y }; }
    });
    return nearestDist < 700 ? nearest : null;
  }

  private fireWeapon(time: number, targetX?: number, targetY?: number) {
    const weapon = WEAPONS[this.currentLevelIndex % WEAPONS.length];
    if (time < this.lastFired + weapon.cooldown) return;
    this.lastFired = time;

    this.isAttackingAnim = true;
    this.player.play('attack_' + this.playerClass.id, true);
    this.time.delayedCall(220, () => { this.isAttackingAnim = false; });

    const useCoinSheet = this.textures.exists('coin_sheet');
    const texKey = useCoinSheet ? 'coin_sheet' : 'bullet';
    const frame = useCoinSheet ? 0 : undefined;
    const projectile = this.projectiles.create(this.player.x, this.player.y, texKey, frame);
    if (!projectile) return;

    projectile.setScale(useCoinSheet ? 0.22 : 0.35).setTint(0xfbbf24).setActive(true).setVisible(true);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    if (body) { body.setGravity(0, 0); body.setAllowGravity(false); }

    const targetAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX ?? this.player.x + Math.cos(this.lastMoveAngle), targetY ?? this.player.y + Math.sin(this.lastMoveAngle));
    // Face player toward firing direction (no free rotation — just flip horizontally)
    this.player.setFlipX(Math.cos(targetAngle) < 0);

    projectile.setVelocity(Math.cos(targetAngle) * 650, Math.sin(targetAngle) * 650);
    projectile.setRotation(targetAngle + Math.PI / 2);

    if (Math.random() < 0.12) {
      this.showBubbleText(this.player, weapon.unleashedQuote, '#facc15');
    }

    this.time.delayedCall(2000, () => { if (projectile?.active) projectile.destroy(); });
  }

  // ─── Enemy Spawning ───────────────────────────────────────────────────────

  private spawnLevelEnemy() {
    if (this.isBossActive || !this.levelStarted) return;

    if (this.enemiesLeftToSpawn <= 0) {
      if (this.enemies.countActive() === 0 && !this.isBossActive) {
        this.summonBossMatch();
      }
      return;
    }

    this.enemiesLeftToSpawn--;
    const config = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 350 + Math.random() * 200;
    const sx = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 50, 950);
    const sy = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 50, 950);

    const texKey = this.textures.exists(`enemy_${config.id}_sheet`) ? `enemy_${config.id}_sheet` : `enemy_${config.id}`;
    const enemy = this.physics.add.sprite(sx, sy, texKey);
    enemy.setDrag(150, 150);
    // Scale up enemies so they're clearly visible against the map
    enemy.setScale(1.8);
    // Apply distinctive color tint so each enemy type is easy to ID at a glance
    enemy.setTint(parseInt(config.color));
    enemy.setData('id', config.id);
    enemy.setData('name', config.name);
    enemy.setData('hp', config.hp);
    enemy.setData('maxHp', config.hp);
    enemy.setData('attack', config.attack);
    enemy.setData('speed', config.speed);
    enemy.setData('config', config);
    this.enemies.add(enemy);

    // Play idle anim if sheet loaded
    if (this.textures.exists(`enemy_${config.id}_sheet`)) {
      if (this.anims.exists(`idle_${config.id}`)) enemy.play(`idle_${config.id}`);
    }

    if (Math.random() < 0.3) {
      const bark = config.barks[Math.floor(Math.random() * config.barks.length)];
      this.showBubbleText(enemy, bark, '#fca5a5');
    }
  }

  // ─── Boss AI ──────────────────────────────────────────────────────────────

  private handleBossAI(time: number) {
    if (!this.spawnedBoss || !this.bossData) return;

    const targetAngle = Phaser.Math.Angle.Between(this.spawnedBoss.x, this.spawnedBoss.y, this.player.x, this.player.y);
    const bossSpeed = 80 + this.currentLevelIndex * 15;
    this.spawnedBoss.setVelocity(Math.cos(targetAngle) * bossSpeed, Math.sin(targetAngle) * bossSpeed);
    this.spawnedBoss.setRotation(targetAngle + Math.PI / 2);

    if (time - this.lastBossAttackTime > 2000) {
      this.lastBossAttackTime = time;
      switch (this.bossData.id) {
        case 'boss_eric': this.fireBossCoinAttack(); break;
        case 'boss_audrey': this.teleportKidneyStrike(); break;
        case 'boss_florida': this.deployTireTreadTether(); break;
        case 'boss_ben': this.unleashHeyAoE(); break;
        case 'boss_nick_f': this.dischargeRefundRosterChecks(); break;
      }
    }

    // Phase bark
    const hpRatio = this.currentBossHp / this.bossData.maxHp;
    const phase = hpRatio < 0.33 ? 1 : hpRatio < 0.66 ? 2 : 3;
    if (Math.random() < 0.005) {
      const phaseBarks = this.bossData.phaseBarks;
      const phaseBark = phaseBarks[phase] ?? this.bossData.combatBarks[Math.floor(Math.random() * this.bossData.combatBarks.length)];
      this.showBubbleText(this.spawnedBoss, phaseBark, '#ef4444');
    }
  }

  private fireBossCoinAttack() {
    if (!this.spawnedBoss) return;
    this.onMessageLog('💸 Eric Huang casting index fees!');
    for (let i = 0; i < 5; i++) {
      const coin = this.add.circle(this.player.x + Phaser.Math.Between(-150, 150), this.player.y - 300, 12, 0xfacc15);
      this.physics.add.existing(coin);
      (coin.body as Phaser.Physics.Arcade.Body).setVelocityY(350);
      this.physics.add.overlap(this.player, coin, () => { coin.destroy(); this.damagePlayer(18, 'Gold Extortion Coin'); });
      this.time.delayedCall(2000, () => { if (coin.active) coin.destroy(); });
    }
  }

  private teleportKidneyStrike() {
    if (!this.spawnedBoss) return;
    this.onMessageLog('🩸 Audrey teleports — Kidney Punch incoming!');
    const targetX = this.player.x;
    const targetY = this.player.y;
    const ring = this.add.circle(targetX, targetY, 40, 0xef4444, 0.3);
    this.time.delayedCall(700, () => {
      ring.destroy();
      if (!this.spawnedBoss) return;
      this.spawnedBoss.x = targetX;
      this.spawnedBoss.y = targetY;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY) < 60) {
        this.damagePlayer(25, 'Kidney Punch [controls reversed]');
        this.triggerRedPeeBladderInversion();
      }
    });
  }

  private triggerRedPeeBladderInversion() {
    this.onMessageLog('⚠️ Red Pee Bladder Strike! Controls reversed for 4.5s!');
    this.cameras.main.flash(400, 239, 68, 68);
    const { W, S, A, D } = this.wasdKeys;
    this.wasdKeys.W = S; this.wasdKeys.S = W;
    this.wasdKeys.A = D; this.wasdKeys.D = A;
    this.time.delayedCall(4500, () => {
      this.wasdKeys.W = W; this.wasdKeys.S = S;
      this.wasdKeys.A = A; this.wasdKeys.D = D;
      this.onMessageLog('⚙️ Controls normalized.');
    });
  }

  private deployTireTreadTether() {
    if (!this.spawnedBoss) return;
    this.onMessageLog('🏎️ Florida Syndicate — Mustang Crowd Control!');
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const proj = this.physics.add.sprite(this.spawnedBoss.x, this.spawnedBoss.y, 'bullet');
      proj.setTint(0x374151).setVelocity(Math.cos(angle) * 320, Math.sin(angle) * 320);
      this.enemyProjectiles.add(proj);
      this.time.delayedCall(2000, () => { if (proj.active) proj.destroy(); });
    }
  }

  private unleashHeyAoE() {
    if (!this.spawnedBoss) return;
    this.onMessageLog('🔊 Michael Bersofsky bellows "HEY!!!"');
    this.cameras.main.shake(300, 0.02);
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      const ringB = this.physics.add.sprite(this.spawnedBoss.x, this.spawnedBoss.y, 'bullet');
      ringB.setTint(0x6b7280).setScale(1.2).setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
      this.enemyProjectiles.add(ringB);
      this.time.delayedCall(3000, () => { if (ringB.active) ringB.destroy(); });
    }
  }

  private dischargeRefundRosterChecks() {
    if (!this.spawnedBoss) return;
    this.onMessageLog('💸 Nick Farrar drops Refund Checks — 5% Robinhood fee active!');
    for (let i = 0; i < 6; i++) {
      const check = this.add.rectangle(
        this.player.x + Phaser.Math.Between(-200, 200),
        this.player.y + Phaser.Math.Between(-200, 200),
        24, 14, 0x10b981
      );
      this.physics.add.existing(check);
      this.tweens.add({ targets: check, scale: 1.4, alpha: 0.1, duration: 1800, onComplete: () => check.destroy() });
      this.physics.add.overlap(this.player, check, () => { check.destroy(); this.damagePlayer(15, 'Refund Interest Fee'); });
    }
  }

  // ─── Boss Spawn ───────────────────────────────────────────────────────────

  private summonBossMatch() {
    this.isBossActive = true;
    const config = BOSSES[this.currentLevelIndex % BOSSES.length];
    this.bossData = config;
    this.currentBossHp = config.maxHp;
    this.lastBossAttackTime = this.time.now;

    this.onMessageLog(`⚠️ BOSS INCOMING: ${config.name} — ${config.title}!`);

    // Use processed boss sheet if available, fall back to raw image, then procedural
    const bossId = config.id.replace('boss_', '');
    const bossSheetKey = `boss_${bossId}_sheet`;
    const bossRawKey = config.id; // e.g. 'boss_eric'
    let bossTex: string;
    let bossScale: number;
    if (this.textures.exists(bossSheetKey)) {
      bossTex = bossSheetKey;
      bossScale = 0.85;
    } else if (this.textures.exists(bossRawKey)) {
      bossTex = bossRawKey;
      bossScale = 0.55;
    } else {
      bossTex = 'enemy_grunter';
      bossScale = 1.6;
    }
    this.spawnedBoss = this.physics.add.sprite(500, 150, bossTex, 0);
    if (this.textures.exists(bossSheetKey)) {
      this.spawnedBoss.play(`idle_boss_${bossId}`, true);
    }
    this.spawnedBoss.setScale(bossScale).setCollideWorldBounds(true).setDrag(400, 400);
    this.showBubbleText(this.spawnedBoss, config.combatBarks[0], '#f43f5e');
    this.cameras.main.flash(500, 239, 68, 68);
    this.cameras.main.shake(400, 0.015);

    // Floating boss health bar
    const barW = 220;
    this.bossHpBg = this.add.rectangle(this.spawnedBoss.x, this.spawnedBoss.y - 90, barW, 14, 0x1a0606)
      .setStrokeStyle(2, 0xef4444, 0.9).setDepth(150);
    this.bossHpFill = this.add.rectangle(this.spawnedBoss.x - barW / 2 + 2, this.spawnedBoss.y - 90, barW - 4, 10, 0xef4444)
      .setOrigin(0, 0.5).setDepth(151);
    this.bossNameLabel = this.label(this.spawnedBoss.x, this.spawnedBoss.y - 104, `${config.name} — ${config.title}`, {
      fontSize: '12px', color: '#fca5a5', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(152);

    // Let auto-fire projectiles chip the boss down (QTE delivers big audit hits).
    // Identify the projectile by group membership rather than argument position
    // so we never accidentally destroy the boss sprite itself.
    this.physics.add.overlap(this.projectiles, this.spawnedBoss, (a: any, b: any) => {
      const projectile = this.projectiles.contains(a) ? a : b;
      if (projectile === this.spawnedBoss) return;
      projectile.destroy();
      const weapon = WEAPONS[this.currentLevelIndex % WEAPONS.length];
      this.damageBoss(weapon.attackPower * 0.6);
    });

    this.time.addEvent({
      delay: 9000,
      callback: this.triggerBossQTEQuest,
      callbackScope: this,
      loop: true
    });
  }

  /** Apply damage to the active boss and refresh its health bar. */
  private damageBoss(amount: number) {
    if (!this.isBossActive || !this.bossData || !this.spawnedBoss) return;
    this.currentBossHp = Math.max(0, this.currentBossHp - amount);
    this.updateBossHpBar();
    this.spawnedBoss.setTintFill(0xffffff);
    this.time.delayedCall(60, () => this.spawnedBoss?.clearTint());
    if (this.currentBossHp <= 0) this.defeatBossSuccess();
  }

  private updateBossHpBar() {
    if (!this.bossHpFill || !this.bossData || !this.spawnedBoss) return;
    const barW = 220;
    const ratio = Phaser.Math.Clamp(this.currentBossHp / this.bossData.maxHp, 0, 1);
    this.bossHpFill.width = (barW - 4) * ratio;
    const color = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xef4444;
    this.bossHpFill.setFillStyle(color);
  }

  private updateBossHpBarPosition() {
    if (!this.spawnedBoss) return;
    const barW = 220;
    const bx = this.spawnedBoss.x;
    const by = this.spawnedBoss.y - 90;
    this.bossHpBg?.setPosition(bx, by);
    this.bossHpFill?.setPosition(bx - barW / 2 + 2, by);
    this.bossNameLabel?.setPosition(bx, by - 14);
  }

  private destroyBossHpBar() {
    this.bossHpBg?.destroy(); this.bossHpBg = null;
    this.bossHpFill?.destroy(); this.bossHpFill = null;
    this.bossNameLabel?.destroy(); this.bossNameLabel = null;
  }

  private triggerBossQTEQuest() {
    if (!this.isBossActive || !this.bossData || !this.spawnedBoss) return;
    this.physics.pause();
    this.onMessageLog(`⚡ [QTE]: Audit ${this.bossData.name} — choose your counter!`);
    this.onTriggerQTE(this.bossData, (success: boolean) => {
      this.physics.resume();
      if (success && this.spawnedBoss && this.bossData) {
        const dmg = this.bossData.weaknessQTE.damage;
        this.onMessageLog(`🔥 AUDIT SUCCESS! ${this.bossData.name} -${dmg} BIQ!`);
        this.cameras.main.flash(300, 34, 197, 94);
        this.cameras.main.shake(300, 0.02);
        this.showBubbleText(this.spawnedBoss, 'CALLED OUT ON LOGS! MY B.I.Q. IS PLUMMETING! 💀', '#10b981');
        this.damageBoss(dmg);
      } else {
        this.onMessageLog(`💥 AUDIT FAILED — ${this.bossData?.name} counters!`);
        this.cameras.main.flash(350, 239, 68, 68);
        this.damagePlayer(35, 'Failed QTE');
      }
    });
  }

  private defeatBossSuccess() {
    if (!this.spawnedBoss || !this.bossData) return;
    this.onMessageLog(`🏆 ${this.bossData.name} logged and archived in the group chat!`);

    for (let i = 0; i < 24; i++) {
      const star = this.add.circle(this.spawnedBoss.x, this.spawnedBoss.y, 8, 0xfacc15);
      this.physics.add.existing(star);
      (star.body as Phaser.Physics.Arcade.Body).setVelocity(Phaser.Math.Between(-300, 300), Phaser.Math.Between(-300, 300));
      this.time.delayedCall(1000, () => star.destroy());
    }

    for (let i = 0; i < 10; i++) {
      const shard = this.physics.add.sprite(
        this.spawnedBoss.x + Phaser.Math.Between(-30, 30),
        this.spawnedBoss.y + Phaser.Math.Between(-30, 30),
        this.textures.exists('shard_sheet') ? 'shard_sheet' : 'loot_shard',
        this.textures.exists('shard_sheet') ? 0 : undefined
      );
      shard.setScale(this.textures.exists('shard_sheet') ? 0.18 : 1)
        .setTint(0xfacc15).setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150)).setDrag(100, 100);
      this.lootShards.add(shard);
    }

    this.destroyBossHpBar();
    this.spawnedBoss.destroy();
    this.spawnedBoss = null;
    this.isBossActive = false;
    this.isAttackingAnim = false;
    this.player.play('victory_' + this.playerClass.id, true);
    this.time.delayedCall(2500, () => this.onLevelCompleted());
  }

  // ─── Damage & Status Effects ───────────────────────────────────────────────

  private damagePlayer(damage: number, source: string) {
    try {
      const fx = this.add.sprite(this.player.x, this.player.y, 'plasma_shield');
      fx.setOrigin(0.5).setScale(0.1).setDepth(20).setAlpha(0.95);
      this.tweens.add({ targets: fx, scale: 0.55, alpha: 0, duration: 380, onComplete: () => fx.destroy() });
    } catch {}

    let finalDmg = damage;
    if (this.playerClass.id === 'jacob') {
      if (this.subZeroActive) {
        finalDmg = Math.floor(damage * 0.5); // Sub-Zero: immune to pain
      } else {
        finalDmg = Math.floor(damage * 2.5); // Loss Aversion penalty
      }
    } else if (this.playerClass.id === 'nick_h') {
      finalDmg = Math.floor(damage * 0.4);
    }

    // Brainrot from Galaxy Gas Zombie source
    if (source.toLowerCase().includes('zombie') || source.toLowerCase().includes('b12') || source.toLowerCase().includes('galaxy')) {
      this.brainrotLevel = Math.min(100, this.brainrotLevel + 20);
      this.updateBrainrotHUD();
      if (this.brainrotLevel >= 100) {
        this.onMessageLog('🧠 SKIBIDI PROTOCOL: Brainrot maxed! BIQ collapsing!');
        this.cameras.main.flash(300, 167, 139, 250);
        this.showPassiveIconText(this.player.x, this.player.y - 40, 'SKIBIDI PROTOCOL 🧠', '#a78bfa');
      }
    }

    this.activeHp -= finalDmg;
    this.onHpChange(Math.max(0, this.activeHp));

    // Sub-Zero awakening for Jacob
    if (this.playerClass.id === 'jacob' && !this.subZeroActivatedOnce) {
      const hpThreshold = this.playerClass.maxHp * 0.3;
      if (this.activeHp <= hpThreshold && this.activeHp > 0) {
        this.activateSubZero();
      }
    }

    if (this.activeHp > 0) {
      this.isAttackingAnim = false;
      this.player.play('hurt_' + this.playerClass.id, true);
    } else {
      this.player.play('defeat_' + this.playerClass.id, true);
    }

    if (finalDmg > 12) {
      this.cameras.main.shake(150, 0.012);
      this.cameras.main.flash(80, 239, 68, 68, true);
    }

    this.showPassiveIconText(this.player.x, this.player.y - 25, `-${finalDmg} HP`, '#ef4444');
    this.onMessageLog(`💔 ${this.playerClass.name} hit by ${source} (-${finalDmg} HP).`);

    if (this.activeHp <= 0) {
      this.onMessageLog('💀 SOCIAL COLLAPSE: The Rockville Core abandoned you to go to sleep!');
      this.physics.pause();
      this.onGameOver();
    }
  }

  private activateSubZero() {
    this.subZeroActive = true;
    this.subZeroActivatedOnce = true;
    this.player.setTint(0x38bdf8);
    this.cameras.main.flash(500, 56, 189, 248);
    this.cameras.main.shake(600, 0.025);
    this.onMessageLog('🥷 SUB-ZERO AWAKENED! Jacob enters Mortal Kombat mode. Damage: +50%, Pain: OFF.');
    this.showBubbleText(this.player, "I'M FUCKING SUBZERO!!!", '#38bdf8');
    this.showPassiveIconText(this.player.x, this.player.y - 50, 'SUB-ZERO ACTIVATED 🥷', '#38bdf8');
    // Ice particles burst
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI / 4) * i;
      const shard = this.add.rectangle(this.player.x, this.player.y, 8, 3, 0x38bdf8);
      this.physics.add.existing(shard);
      (shard.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * 200, Math.sin(ang) * 200);
      this.time.delayedCall(600, () => shard.destroy());
    }
  }

  // ─── Combat Callbacks ─────────────────────────────────────────────────────

  private handleProjectileHitEnemy(proj: any, enemy: any) {
    proj.destroy();
    const atkBonus = (this.playerClass.id === 'jacob' && this.subZeroActive) ? 1.5 : 1.0;
    const currHp = (enemy.getData('hp') as number) - Math.floor(this.playerClass.attack * atkBonus);
    enemy.setData('hp', currHp);
    enemy.setTint(0xffffff);
    this.time.delayedCall(100, () => {
      if (enemy.active) enemy.setTint(parseInt((enemy.getData('config') as EnemyConfig).color));
    });

    if (currHp <= 0) {
      const config: EnemyConfig = enemy.getData('config');
      this.onMessageLog(`💥 ${enemy.getData('name')} eliminated! ${config.deathQuote}`);
      const shardTex = this.textures.exists('shard_sheet') ? 'shard_sheet' : 'loot_shard';
      const shardFrame = this.textures.exists('shard_sheet') ? 0 : undefined;
      const shard = this.physics.add.sprite(enemy.x, enemy.y, shardTex, shardFrame);
      shard.setScale(this.textures.exists('shard_sheet') ? 0.18 : 1).setTint(0x34d399);
      this.lootShards.add(shard);
      enemy.destroy();
      this.enemiesKilledCount++;
    } else if (Math.random() < 0.15) {
      const config: EnemyConfig = enemy.getData('config');
      const bark = config.barks[Math.floor(Math.random() * config.barks.length)];
      this.showBubbleText(enemy, bark, '#fca5a5');
    }
  }

  private handleEnemyMeleeHit(_player: any, enemy: any) {
    const now = this.time.now;
    const lastHit = this.enemyHitCooldowns.get(enemy) ?? 0;
    if (now - lastHit < 600) return;
    this.enemyHitCooldowns.set(enemy, now);

    const config: EnemyConfig = enemy.getData('config');
    const attackDmg = enemy.getData('attack') as number;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    this.damagePlayer(attackDmg, config?.name ?? 'Enemy');
    enemy.setVelocity(0, 0);
  }

  private handleProjectileHitPlayer(_player: any, proj: any) {
    proj.destroy();
    this.damagePlayer(12, 'Boss Projectile');
  }

  private handleCollectLoot(_player: any, shard: any) {
    shard.destroy();
    const gold = Phaser.Math.Between(15, 35);
    this.activeGold += gold;
    this.onGoldChange(this.activeGold);
    this.showPassiveIconText(this.player.x, this.player.y - 30, `+$${gold} Gold!`, '#10b981');

    if (Math.random() < 0.25) {
      const barks = LORE_BARKS;
      this.onMessageLog(`🔓 "${barks[Math.floor(Math.random() * barks.length)]}"`);
    }
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  private showBubbleText(anchor: Phaser.GameObjects.GameObject, text: string, colorHex = '#ffffff') {
    const sprite = anchor as Phaser.Physics.Arcade.Sprite;
    if (!sprite?.x || !sprite?.y) return;
    const container = this.add.container(sprite.x, sprite.y - 45).setDepth(200);
    const label = this.label(0, 0, text, {
      fontSize: '12px', color: colorHex,
      backgroundColor: '#0b1208e6', padding: { x: 9, y: 5 },
      stroke: '#000000', strokeThickness: 2,
      align: 'center', wordWrap: { width: 220 }
    }).setOrigin(0.5);
    container.add(label);
    this.tweens.add({ targets: container, y: container.y - 40, alpha: 0, duration: 1900, onComplete: () => container.destroy() });
  }

  private showPassiveIconText(x: number, y: number, text: string, color: string) {
    const label = this.label(x, y, text, {
      fontSize: '13px', color,
      stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: label, y: y - 50, alpha: 0, duration: 1300, onComplete: () => label.destroy() });
  }

  // ─── Procedural Textures ──────────────────────────────────────────────────

  private createProceduralTextures() {
    if (this.textures.exists('bullet')) return;

    // Enemy textures — 48px, high-contrast so they read clearly over the map
    // Ticketmaster: blue bot silhouette with barcode stripes
    const gTm = this.make.graphics({});
    gTm.fillStyle(0x1e40af, 1).fillRoundedRect(8, 4, 32, 38, 6);
    gTm.lineStyle(2.5, 0x60a5fa, 1).strokeRoundedRect(8, 4, 32, 38, 6);
    gTm.fillStyle(0x000000, 1).fillCircle(8, 24, 6).fillCircle(40, 24, 6);
    gTm.fillStyle(0x60a5fa, 1);
    [14, 19, 23, 27, 32, 36].forEach(x => gTm.fillRect(x, 10, 2, 26));
    gTm.generateTexture('enemy_ticketmaster', 48, 48); gTm.destroy();

    // Dishes: stacked plates with angry red border
    const gDish = this.make.graphics({});
    [36, 30, 24, 18, 12].forEach((y, i) => {
      const w = 32 - i * 3;
      const x = (48 - w) / 2;
      gDish.fillStyle(i % 2 === 0 ? 0xe2e8f0 : 0xc4b5fd, 1).fillEllipse(24, y, w, 10);
      gDish.lineStyle(1.5, 0xef4444, 1).strokeEllipse(24, y, w, 10);
    });
    gDish.generateTexture('enemy_dishes', 48, 48); gDish.destroy();

    // Zombie: purple haze circle with glowing eyes
    const gZombie = this.make.graphics({});
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
    const gFrat = this.make.graphics({});
    // Body
    gFrat.fillStyle(0x92400e, 1).fillRoundedRect(10, 20, 28, 24, 4);
    gFrat.lineStyle(2, 0xfbbf24, 1).strokeRoundedRect(10, 20, 28, 24, 4);
    // Head
    gFrat.fillStyle(0xd97706, 1).fillCircle(24, 14, 10);
    gFrat.lineStyle(2, 0xfef08a, 1).strokeCircle(24, 14, 10);
    // Hat
    gFrat.fillStyle(0xdc2626, 1).fillRect(14, 4, 20, 6).fillRect(12, 8, 24, 4);
    gFrat.generateTexture('enemy_frat_bro', 48, 48); gFrat.destroy();

    // Boss textures
    const gBE = this.make.graphics({});
    gBE.fillStyle(0x1e1b4b, 1).fillCircle(24, 24, 22).lineStyle(3, 0x6366f1, 1).strokeCircle(24, 24, 22);
    gBE.fillStyle(0x10b981, 1).fillRect(16, 18, 16, 12).lineStyle(1, 0xffffff, 1).strokeRect(16, 18, 16, 12);
    gBE.generateTexture('boss_boss_eric', 48, 48); gBE.destroy();

    const gBA = this.make.graphics({});
    gBA.fillStyle(0x831843, 1).fillCircle(24, 24, 22).lineStyle(3, 0xec4899, 1).strokeCircle(24, 24, 22);
    gBA.fillStyle(0xfbcfe8, 1).fillCircle(16, 16, 3).fillCircle(32, 16, 3);
    gBA.generateTexture('boss_boss_audrey', 48, 48); gBA.destroy();

    const gBF = this.make.graphics({});
    gBF.fillStyle(0x7c2d12, 1).fillRect(8, 12, 32, 24).lineStyle(2, 0xea580c, 1).strokeRect(8, 12, 32, 24);
    gBF.fillStyle(0x000000, 1).fillRect(6, 6, 6, 8).fillRect(36, 6, 6, 8).fillRect(6, 34, 6, 8).fillRect(36, 34, 6, 8);
    gBF.generateTexture('boss_boss_florida', 48, 48); gBF.destroy();

    const gBB = this.make.graphics({});
    gBB.fillStyle(0x1e3a8a, 1).fillCircle(24, 24, 22).lineStyle(3, 0x2563eb, 1).strokeCircle(24, 24, 22);
    gBB.fillStyle(0xef4444, 1).fillCircle(24, 28, 5).fillStyle(0xffffff, 1).fillCircle(16, 16, 3.5).fillCircle(32, 16, 3.5);
    gBB.generateTexture('boss_boss_ben', 48, 48); gBB.destroy();

    const gBN = this.make.graphics({});
    gBN.fillStyle(0x881337, 1).fillCircle(24, 24, 22).lineStyle(3, 0xf43f5e, 1).strokeCircle(24, 24, 22);
    gBN.fillStyle(0x059669, 1).fillRect(14, 16, 20, 16).lineStyle(1.5, 0xffffff, 1).strokeRect(14, 16, 20, 16);
    gBN.generateTexture('boss_boss_nick_f', 48, 48); gBN.destroy();

    // Projectiles
    const gBullet = this.make.graphics({});
    gBullet.fillStyle(0xeab308, 1).fillCircle(8, 8, 4.5).lineStyle(1, 0xffffff, 1).strokeCircle(8, 8, 4.5);
    gBullet.generateTexture('bullet', 16, 16); gBullet.destroy();

    // Ticket bolt (Ticketmaster ranged attack)
    const gTicket = this.make.graphics({});
    gTicket.fillStyle(0x1d4ed8, 1).fillRect(2, 4, 12, 8).lineStyle(1, 0x93c5fd, 1).strokeRect(2, 4, 12, 8);
    gTicket.fillStyle(0xfbbf24, 1).fillRect(5, 5, 2, 6).fillRect(9, 5, 2, 6);
    gTicket.generateTexture('ticket_bolt', 16, 16); gTicket.destroy();

    // Fork (Dishes ranged attack)
    const gFork = this.make.graphics({});
    gFork.fillStyle(0xe2e8f0, 1).fillRect(7, 2, 2, 12);
    gFork.fillRect(5, 2, 2, 4).fillRect(9, 2, 2, 4);
    gFork.lineStyle(1, 0x94a3b8, 1).strokeRect(7, 2, 2, 12);
    gFork.generateTexture('fork_proj', 16, 16); gFork.destroy();

    // Loot shard
    const gShard = this.make.graphics({});
    gShard.fillStyle(0x10b981, 1).fillTriangle(8, 2, 2, 14, 14, 14).lineStyle(1, 0xffffff, 1).strokeTriangle(8, 2, 2, 14, 14, 14);
    gShard.generateTexture('loot_shard', 16, 16); gShard.destroy();
  }

  // ─── NPC Setup ───────────────────────────────────────────────────────────────

  private setupNPCs() {
    const heroNpcData = [
      { id: 'eric',   x: 180,  y: 180,  name: 'Eric Huang',     color: '#818cf8' },
      { id: 'nick_f', x: 840,  y: 180,  name: 'Nick Farrar',    color: '#f59e0b' },
      { id: 'nick_h', x: 180,  y: 820,  name: 'Nick Hedgecock', color: '#4ade80' },
      { id: 'jacob',  x: 840,  y: 820,  name: 'Jacob Lebby',    color: '#67e8f9' },
    ];

    heroNpcData.forEach(npc => {
      if (npc.id === this.playerClass.id) return; // don't duplicate the player

      const sheetKey = `hero_${npc.id}_sheet`;
      const hasSheet = this.textures.exists(sheetKey);

      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      if (hasSheet) {
        const s = this.add.sprite(npc.x, npc.y, sheetKey, 0);
        s.play(`idle_${npc.id}`, true);
        s.setScale(0.42).setDepth(5).setAlpha(0.92);
        sprite = s;
      } else {
        // fallback: draw a simple colored circle placeholder
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(parseInt(npc.color.replace('#', ''), 16), 1);
        g.fillCircle(24, 24, 24);
        g.generateTexture(`npc_fallback_${npc.id}`, 48, 48);
        g.destroy();
        sprite = this.add.image(npc.x, npc.y, `npc_fallback_${npc.id}`)
          .setScale(1.0).setDepth(5).setAlpha(0.88);
      }

      this.label(npc.x, npc.y - 54, npc.name, {
        fontSize: '12px', color: npc.color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4, padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(6);

      const prompt = this.makeTalkPrompt(npc.x, npc.y - 72);
      this.npcs.push({ id: npc.id, sprite, prompt });
    });

    // Jordan — shadow admin, always present, placed in the center park area
    NPC_CHARACTERS.forEach(npc => {
      const texKey = 'jordan_npc';
      if (!this.textures.exists(texKey)) {
        // Procedural silhouette: dark hoodie figure
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x1a1a2e, 1);
        g.fillCircle(24, 10, 10); // head
        g.fillStyle(0xf97316, 1);
        g.fillCircle(24, 10, 7); // orange tint
        g.fillStyle(0x1a1a2e, 1);
        g.fillRect(14, 20, 20, 28); // body
        g.fillStyle(0xf97316, 0.4);
        g.fillRect(14, 20, 20, 28);
        g.generateTexture(texKey, 48, 56);
        g.destroy();
      }

      const sprite = this.add.image(500, 490, texKey)
        .setScale(1.3)
        .setDepth(5)
        .setAlpha(0.92);

      this.label(500, 490 - 44, npc.name, {
        fontSize: '12px', color: npc.color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4, padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(6);

      this.label(500, 490 - 60, npc.title, {
        fontSize: '10px', color: '#cbd5b8',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6);

      const prompt = this.makeTalkPrompt(500, 490 - 78);
      this.npcs.push({ id: npc.id, sprite, prompt });
    });
  }

  /** Shared "[ E ] Talk" floating prompt, hidden until the player is in range. */
  private makeTalkPrompt(x: number, y: number): Phaser.GameObjects.Text {
    return this.label(x, y, '[ E ] Talk', {
      fontSize: '11px', color: '#fbbf24', fontStyle: 'bold',
      backgroundColor: '#1a2e10f0', padding: { x: 7, y: 4 },
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(7).setVisible(false);
  }
}
