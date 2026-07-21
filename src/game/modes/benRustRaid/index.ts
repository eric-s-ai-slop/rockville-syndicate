import Phaser from 'phaser';
import type { ModeContext, ModeResult } from '../types';
import { BEN_GAME_DEPTH as D, BenArcadeMode } from '../benArcade/shared';
import { getSettings } from '../../settings';
import { coverScore, threatRate, waveForElapsed, type PanicTasks } from './logic';
import RUST_ARENA_URL from '../../../assets/chapters/bens_life/minigames/rust/rust-arena.png';
import BEDROOM_URL from '../../../assets/chapters/bens_life/minigames/rust/bedroom.png';
import SURVIVOR_URL from '../../../assets/chapters/bens_life/minigames/rust/survivor.png';
import RAIDER_URL from '../../../assets/chapters/bens_life/minigames/rust/raider.png';
import LOOT_URL from '../../../assets/chapters/bens_life/minigames/rust/loot-cache.png';
import BEN_PANIC_URL from '../../../assets/chapters/bens_life/minigames/rust/ben-panic.png';

export interface BenRustRaidConfig {
  raidSeconds?: number;
  panicSeconds?: number;
  lootGoal?: number;
}

interface Raider {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  hp: number;
  attackCooldown: number;
}

interface Bullet {
  shape: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

interface Cache {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  amount: number;
  respawnAt: number;
}

interface Wall {
  shape: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  hp: number;
}

interface PanicStation {
  key: keyof PanicTasks | 'bed';
  x: number;
  y: number;
  label: string;
  shortLabel: string;
  ring: Phaser.GameObjects.Arc;
  tag: Phaser.GameObjects.Text;
}

const ASSETS = {
  arena: 'ben_rust_arena', bedroom: 'ben_rust_bedroom', survivor: 'ben_rust_survivor',
  raider: 'ben_rust_raider', loot: 'ben_rust_loot', panic: 'ben_rust_panic',
} as const;

export class BenRustRaidMode extends BenArcadeMode<BenRustRaidConfig> {
  id = 'benRustRaid';
  capturesPlayerMovement = true;

  private phase: 'raid' | 'knock' | 'panic' = 'raid';
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private keys = new Set<string>();
  private player = { x: 300, y: 380 };
  private playerImage: Phaser.GameObjects.Image | null = null;
  private aimLine: Phaser.GameObjects.Line | null = null;
  private aim = { x: 650, y: 360 };
  private raiders: Raider[] = [];
  private bullets: Bullet[] = [];
  private caches: Cache[] = [];
  private walls: Wall[] = [];
  private banked = 0;
  private carrying = 0;
  private noise = 8;
  private baseHp = 100;
  private elapsed = 0;
  private raidSeconds = 42;
  private panicSeconds = 24;
  private lootGoal = 6;
  private michael = 0;
  private currentWave = 1;
  private spawnedInWave = 0;
  private shotCooldown = 0;
  private hud: Phaser.GameObjects.Text | null = null;
  private threatText: Phaser.GameObjects.Text | null = null;
  private vignette: Phaser.GameObjects.Rectangle | null = null;
  private pointerMove?: (pointer: Phaser.Input.Pointer) => void;
  private pointerDown?: (pointer: Phaser.Input.Pointer) => void;
  private layoutScale = 1;
  private layoutOffsetX = 0;
  private layoutOffsetY = 0;
  private tasks: PanicTasks = { mic: false, monitor: false, pi: false, headset: false, camera: false };
  private stations: PanicStation[] = [];
  private panicRemaining = 0;
  private interactionProgress = 0;
  private activeStation: PanicStation | null = null;
  private interactionBar: Phaser.GameObjects.Rectangle | null = null;
  private actionText: Phaser.GameObjects.Text | null = null;
  private harvestProgress = 0;

  preload(ctx: ModeContext): void {
    const load = ctx.physics.scene.load;
    if (!ctx.textures.exists(ASSETS.arena)) load.image(ASSETS.arena, RUST_ARENA_URL);
    if (!ctx.textures.exists(ASSETS.bedroom)) load.image(ASSETS.bedroom, BEDROOM_URL);
    if (!ctx.textures.exists(ASSETS.survivor)) load.image(ASSETS.survivor, SURVIVOR_URL);
    if (!ctx.textures.exists(ASSETS.raider)) load.image(ASSETS.raider, RAIDER_URL);
    if (!ctx.textures.exists(ASSETS.loot)) load.image(ASSETS.loot, LOOT_URL);
    if (!ctx.textures.exists(ASSETS.panic)) load.image(ASSETS.panic, BEN_PANIC_URL);
  }

  start(ctx: ModeContext, config: BenRustRaidConfig | undefined, onComplete: (result: ModeResult) => void): void {
    this.begin(ctx, onComplete);
    this.configureResponsiveLayout();
    this.raidSeconds = config?.raidSeconds ?? 42;
    this.panicSeconds = config?.panicSeconds ?? 24;
    this.lootGoal = config?.lootGoal ?? 6;
    this.keys.clear();
    this.bind('keydown', (event) => this.onKeyDown(event));
    this.bind('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    this.pointerMove = (pointer) => { this.aim = { x: this.designX(pointer.x), y: this.designY(pointer.y) }; };
    this.pointerDown = (pointer) => { if (pointer.leftButtonDown() && this.phase === 'raid') this.fire(); };
    ctx.physics.scene.input.on('pointermove', this.pointerMove);
    ctx.physics.scene.input.on('pointerdown', this.pointerDown);
    this.startRaid();
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta, 34) / 1000;
    if (this.phase === 'raid') this.updateRaid(dt);
    else if (this.phase === 'panic') this.updatePanic(dt);
  }

  teardown(): void {
    if (this.pointerMove) this.ctx.physics.scene.input.off('pointermove', this.pointerMove);
    if (this.pointerDown) this.ctx.physics.scene.input.off('pointerdown', this.pointerDown);
    this.pointerMove = undefined;
    this.pointerDown = undefined;
    super.teardown();
  }

  private startRaid(): void {
    this.phase = 'raid'; this.elapsed = 0; this.michael = 0; this.noise = 8; this.baseHp = 100;
    this.banked = 0; this.carrying = 0; this.currentWave = 1; this.spawnedInWave = 0;
    this.harvestProgress = 0;
    this.raiders = []; this.bullets = []; this.caches = []; this.walls = [];
    this.clearPhase();
    this.addBackdrop(ASSETS.arena);
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(42), this.ss.s(920), this.ss.s(84), 0x020617, 0.86)
      .setScrollFactor(0).setDepth(D + 3));
    this.phaseTrack(this.ctx.add.circle(this.ss.zx(272), this.ss.zy(340), this.ss.s(82), 0x22c55e, 0.08)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(3), 0x86efac, 0.75));
    this.phaseTrack(this.ctx.label(this.ss.zx(272), this.ss.zy(340), 'BASE\nDEPOSIT LOOT', {
      fontSize: `${this.ss.s(10)}px`, color: '#dcfce7', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4));
    this.player = { x: 320, y: 400 };
    this.playerImage = this.phaseTrack(this.ctx.add.image(this.ss.zx(this.player.x), this.ss.zy(this.player.y), ASSETS.survivor)
      .setDisplaySize(this.ss.s(50), this.ss.s(104)).setScrollFactor(0).setDepth(D + 8));
    this.aimLine = this.phaseTrack(this.ctx.add.line(0, 0, 0, 0, 0, 0, 0xfef08a, 0.65)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(D + 7).setLineWidth(this.ss.s(2))) as Phaser.GameObjects.Line;
    [[620, 165], [760, 260], [610, 515], [455, 205], [790, 500]].forEach(([x, y]) => this.makeCache(x, y));
    this.hud = this.phaseTrack(this.ctx.label(this.ss.zx(30), this.ss.zy(28), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#f8fafc', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(D + 8)) as Phaser.GameObjects.Text;
    this.threatText = this.phaseTrack(this.ctx.label(this.ss.zx(890), this.ss.zy(28), '', {
      fontSize: `${this.ss.s(11)}px`, color: '#fda4af', fontStyle: 'bold', align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 8)) as Phaser.GameObjects.Text;
    this.actionText = this.phaseTrack(this.ctx.label(this.ss.zx(460), this.ss.zy(618), '', {
      fontSize: `${this.ss.s(13)}px`, color: '#fef08a', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 10)) as Phaser.GameObjects.Text;
    this.vignette = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(330), this.ss.s(920), this.ss.s(660), 0xef4444, 0.001)
      .setScrollFactor(0).setDepth(D + 12)) as Phaser.GameObjects.Rectangle;
  }

  private updateRaid(dt: number): void {
    this.elapsed += dt; this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.movePlayer(dt, 215, 45, 875, 100, 620);
    const wave = waveForElapsed(this.elapsed);
    if (wave !== this.currentWave) { this.currentWave = wave; this.spawnedInWave = 0; this.ctx.cameras.main.flash(160, 239, 68, 68, false); }
    const desired = [0, 3, 5, 8][wave];
    if (this.spawnedInWave < desired && this.raiders.length < Math.min(5, wave + 2)) {
      this.spawnRaider(); this.spawnedInWave++;
    }
    if (this.keys.has('e')) this.harvestOrDeposit(dt);
    else this.harvestProgress = 0;
    this.updateBullets(dt); this.updateRaiders(dt); this.updateCaches();
    this.noise = Phaser.Math.Clamp(this.noise - dt * 4.5, 0, 100);
    this.michael += threatRate(this.noise) * dt;
    const remaining = Math.max(0, this.raidSeconds - this.elapsed);
    this.hud?.setText(`WAVE ${wave}/3   BASE ${Math.round(this.baseHp)}%   LOOT ${this.banked}/${this.lootGoal} +${this.carrying}\nWASD MOVE  •  MOUSE FIRE  •  E HARVEST/DEPOSIT  •  F QUIET MELEE  •  B BUILD WALL`);
    const threat = this.michael < 48 ? 'HOUSE: QUIET' : this.michael < 72 ? 'FOOTSTEPS IN HALL' : this.michael < 90 ? 'SHADOW UNDER DOOR' : 'DOORKNOB MOVING';
    this.threatText?.setText(`${threat}\nRAID WINDOW ${remaining.toFixed(0)}s`);
    this.actionText?.setText(this.raidActionPrompt());
    this.vignette?.setFillStyle(0xef4444, Math.max(0.001, (this.michael - 58) / 280));
    this.drawAim();
    if (this.baseHp <= 0) { this.banked = Math.max(0, this.banked - 2); this.beginPanic(); }
    else if (remaining <= 0 || this.michael >= 100) this.beginPanic();
  }

  private beginPanic(): void {
    if (this.phase !== 'raid') return;
    this.phase = 'knock';
    this.keys.clear();
    this.playerImage?.setTint(0x94a3b8);
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(330), this.ss.s(920), this.ss.s(660), 0x020617, 0.42)
      .setScrollFactor(0).setDepth(D + 14));
    this.phaseTrack(this.ctx.label(this.ss.zx(460), this.ss.zy(330), 'KNOCK  •  KNOCK  •  KNOCK', {
      fontSize: `${this.ss.s(25)}px`, color: '#fecaca', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(7),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 15));
    [0, 150, 300].forEach((delay) => this.after(delay, () => {
      try { this.ctx.sound.play('sfx_knock', { volume: 0.6 * getSettings().sfxVolume }); } catch { /* preloaded globally */ }
    }));
    this.after(650, () => this.startPanicRoom());
  }

  private startPanicRoom(): void {
    if (this.phase !== 'knock' || this.ended) return;
    this.phase = 'panic';
    this.ctx.cameras.main.flash(300, 255, 255, 255, false);
    this.clearPhase();
    this.tasks = { mic: false, monitor: false, pi: false, headset: false, camera: false };
    this.stations = []; this.panicRemaining = this.panicSeconds; this.interactionProgress = 0; this.activeStation = null;
    this.addBackdrop(ASSETS.bedroom);
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(46), this.ss.s(920), this.ss.s(92), 0x020617, 0.82)
      .setScrollFactor(0).setDepth(D + 3));
    this.showLockAlert();
    this.player = { x: 716, y: 260 };
    this.playerImage = this.phaseTrack(this.ctx.add.image(this.ss.zx(this.player.x), this.ss.zy(this.player.y), ASSETS.panic)
      .setDisplaySize(this.ss.s(56), this.ss.s(111)).setScrollFactor(0).setDepth(D + 9));
    this.makeStation('monitor', 700, 190, 'SHUT OFF MONITOR', 'MONITOR', 700, 145);
    this.makeStation('mic', 635, 235, 'MUTE DISCORD', 'DISCORD MIC', 625, 285);
    this.makeStation('pi', 812, 220, 'HIDE RASPBERRY PI', 'RASPBERRY PI', 825, 270);
    this.makeStation('headset', 585, 225, 'REMOVE HEADSET', 'HEADSET', 545, 190);
    this.makeStation('camera', 750, 180, 'DISABLE CAMERA', 'CAMERA', 790, 145);
    this.makeStation('bed', 150, 285, 'GET IN BED', 'BED', 150, 355);
    this.hud = this.phaseTrack(this.ctx.label(this.ss.zx(28), this.ss.zy(22), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#f8fafc', fontStyle: 'bold', lineSpacing: this.ss.s(4),
    }).setScrollFactor(0).setDepth(D + 12)) as Phaser.GameObjects.Text;
    this.threatText = this.phaseTrack(this.ctx.label(this.ss.zx(890), this.ss.zy(22), '', {
      fontSize: `${this.ss.s(16)}px`, color: '#fca5a5', fontStyle: 'bold', align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 12)) as Phaser.GameObjects.Text;
    this.actionText = this.phaseTrack(this.ctx.label(this.ss.zx(460), this.ss.zy(582), '', {
      fontSize: `${this.ss.s(15)}px`, color: '#fef08a', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(5),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(360), this.ss.zy(614), this.ss.s(200), this.ss.s(8), 0x020617, 0.9)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 12).setStrokeStyle(this.ss.s(1), 0x94a3b8));
    this.interactionBar = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(360), this.ss.zy(614), this.ss.s(200), this.ss.s(8), 0xfacc15, 1)
      .setOrigin(0, 0.5).setScale(0, 1).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Rectangle;
  }

  private showLockAlert(): void {
    const panel = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(344), this.ss.s(760), this.ss.s(166), 0x450a0a, 0.94)
      .setScrollFactor(0).setDepth(D + 20).setStrokeStyle(this.ss.s(4), 0xfca5a5, 0.95));
    const headline = this.phaseTrack(this.ctx.label(this.ss.zx(460), this.ss.zy(332), 'MICHEAL IS PICKING MY LOCK', {
      fontSize: `${this.ss.s(29)}px`, color: '#fef2f2', fontStyle: 'bold', align: 'center',
      stroke: '#1c0505', strokeThickness: this.ss.s(8),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 21));
    const instruction = this.phaseTrack(this.ctx.label(this.ss.zx(460), this.ss.zy(386), 'GET THE COMPUTER QUIET. THEN GET IN BED.', {
      fontSize: `${this.ss.s(13)}px`, color: '#fecaca', fontStyle: 'bold', align: 'center',
      stroke: '#1c0505', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 21));
    this.after(1800, () => {
      this.ctx.tweens.add({
        targets: [panel, headline, instruction],
        alpha: 0,
        duration: 450,
        onComplete: () => [panel, headline, instruction].forEach((object) => object.destroy()),
      });
    });
  }

  private updatePanic(dt: number): void {
    this.panicRemaining = Math.max(0, this.panicRemaining - dt);
    this.movePlayer(dt, 245, 80, 860, 105, 590);
    const nearest = this.nearestStation();
    this.stations.forEach((station) => station.ring.setStrokeStyle(this.ss.s(station === nearest ? 4 : 2), station === nearest ? 0xfacc15 : 0x38bdf8, station === nearest ? 1 : 0.45));
    if (this.keys.has('e') && nearest) {
      if (this.activeStation !== nearest) { this.activeStation = nearest; this.interactionProgress = 0; }
      this.interactionProgress += dt;
      if (this.interactionProgress >= (nearest.key === 'bed' ? 0.7 : 0.9)) this.completeStation(nearest);
    } else { this.activeStation = null; this.interactionProgress = 0; }
    const holdSeconds = nearest?.key === 'bed' ? 0.7 : 0.9;
    this.interactionBar?.setScale(nearest ? Phaser.Math.Clamp(this.interactionProgress / holdSeconds, 0, 1) : 0, 1);
    const mark = (done: boolean) => done ? '✓' : '○';
    this.hud?.setText(`MICHEAL IS PICKING MY LOCK\n${mark(this.tasks.mic)} MUTE DISCORD   ${mark(this.tasks.monitor)} SHUT MONITOR   ${mark(this.tasks.pi)} HIDE PI\n${mark(this.tasks.headset)} REMOVE HEADSET   ${mark(this.tasks.camera)} DISABLE CAMERA (OPTIONAL)   → GET IN BED`);
    this.actionText?.setText(nearest ? `HOLD E — ${nearest.label}` : 'MOVE TO A MARKED ITEM');
    this.threatText?.setText(`${this.panicRemaining.toFixed(1)}s\nUNTIL DOOR OPENS`);
    if (this.panicRemaining <= 0) this.finish('lose', { phase: 'panic', loot: this.banked, coverScore: coverScore(this.tasks), tasks: this.tasks });
  }

  private movePlayer(dt: number, speed: number, minX: number, maxX: number, minY: number, maxY: number): void {
    const dx = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    const dy = (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx / length * speed * dt, minX, maxX);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy / length * speed * dt, minY, maxY);
    this.playerImage?.setPosition(this.ss.zx(this.player.x), this.ss.zy(this.player.y)).setFlipX(dx < 0);
  }

  private harvestOrDeposit(dt: number): void {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 272, 340) < 92 && this.carrying > 0) {
      this.banked += this.carrying; this.carrying = 0; this.harvestProgress = 0; this.ctx.cameras.main.flash(90, 134, 239, 172, false); return;
    }
    const cache = this.caches.find((candidate) => candidate.amount > 0 && Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.x, candidate.y) < 66);
    if (!cache) { this.harvestProgress = 0; return; }
    this.harvestProgress += dt;
    if (this.harvestProgress >= 0.4) {
      this.harvestProgress = 0; cache.amount--; this.carrying++; this.noise += 4;
      this.ctx.cameras.main.flash(45, 250, 204, 21, false);
      if (cache.amount <= 0) { cache.respawnAt = this.elapsed + 8; cache.image.setVisible(false); }
    }
  }

  private raidActionPrompt(): string {
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 272, 340) < 92) {
      return this.carrying > 0 ? `HOLD E — DEPOSIT ${this.carrying} LOOT IN BASE` : 'BASE STORAGE — BRING LOOT HERE';
    }
    const cache = this.caches.find((candidate) => candidate.amount > 0 && Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.x, candidate.y) < 66);
    return cache ? `HOLD E — PICK UP COMPONENTS (${cache.amount} LEFT)` : 'GLOWING CRATES = LOOT  •  RETURN LOOT TO THE GREEN BASE';
  }

  private updateCaches(): void {
    this.caches.forEach((cache) => { if (cache.amount <= 0 && this.elapsed >= cache.respawnAt) { cache.amount = 2; cache.image.setVisible(true); } });
  }

  private makeCache(x: number, y: number): void {
    const image = this.phaseTrack(this.ctx.add.image(this.ss.zx(x), this.ss.zy(y), ASSETS.loot)
      .setDisplaySize(this.ss.s(70), this.ss.s(53)).setScrollFactor(0).setDepth(D + 5));
    this.caches.push({ image, x, y, amount: 2, respawnAt: 0 });
  }

  private spawnRaider(): void {
    const edge = Phaser.Math.Between(0, 2);
    const x = edge === 0 ? 900 : Phaser.Math.Between(500, 890);
    const y = edge === 1 ? 90 : edge === 2 ? 620 : Phaser.Math.Between(110, 610);
    const image = this.phaseTrack(this.ctx.add.image(this.ss.zx(x), this.ss.zy(y), ASSETS.raider)
      .setDisplaySize(this.ss.s(48), this.ss.s(68)).setScrollFactor(0).setDepth(D + 7));
    this.raiders.push({ image, x, y, hp: 2 + this.currentWave, attackCooldown: 0 });
  }

  private updateRaiders(dt: number): void {
    for (let i = this.raiders.length - 1; i >= 0; i--) {
      const raider = this.raiders[i]; raider.attackCooldown = Math.max(0, raider.attackCooldown - dt);
      const playerDistance = Phaser.Math.Distance.Between(raider.x, raider.y, this.player.x, this.player.y);
      let targetX = playerDistance < 175 ? this.player.x : 272; let targetY = playerDistance < 175 ? this.player.y : 340;
      const blockingWall = this.walls.find((wall) => Phaser.Math.Distance.Between(raider.x, raider.y, wall.x, wall.y) < 42);
      if (blockingWall) { targetX = blockingWall.x; targetY = blockingWall.y; }
      const angle = Phaser.Math.Angle.Between(raider.x, raider.y, targetX, targetY);
      raider.x += Math.cos(angle) * (54 + this.currentWave * 8) * dt; raider.y += Math.sin(angle) * (54 + this.currentWave * 8) * dt;
      raider.image.setPosition(this.ss.zx(raider.x), this.ss.zy(raider.y)).setFlipX(Math.cos(angle) < 0);
      if (Phaser.Math.Distance.Between(raider.x, raider.y, targetX, targetY) < 34 && raider.attackCooldown <= 0) {
        raider.attackCooldown = 0.65;
        if (blockingWall) { blockingWall.hp -= 20; if (blockingWall.hp <= 0) { blockingWall.shape.destroy(); this.walls.splice(this.walls.indexOf(blockingWall), 1); } }
        else if (playerDistance < 175) { this.carrying = Math.max(0, this.carrying - 1); }
        else this.baseHp -= 7 + this.currentWave * 2;
        this.ctx.cameras.main.shake(70, 0.003);
      }
      if (raider.hp <= 0) { raider.image.destroy(); this.raiders.splice(i, 1); }
    }
  }

  private fire(): void {
    if (this.phase !== 'raid' || this.shotCooldown > 0) return;
    this.shotCooldown = 0.18; this.noise = Phaser.Math.Clamp(this.noise + 13, 0, 100);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.aim.x, this.aim.y);
    const shape = this.phaseTrack(this.ctx.add.circle(this.ss.zx(this.player.x), this.ss.zy(this.player.y), this.ss.s(4), 0xfef08a, 1)
      .setScrollFactor(0).setDepth(D + 11));
    this.bullets.push({ shape, x: this.player.x, y: this.player.y, vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620, alive: true });
  }

  private updateBullets(dt: number): void {
    this.bullets.forEach((bullet) => {
      if (!bullet.alive) return; bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
      bullet.shape.setPosition(this.ss.zx(bullet.x), this.ss.zy(bullet.y));
      const hit = this.raiders.find((raider) => Phaser.Math.Distance.Between(bullet.x, bullet.y, raider.x, raider.y) < 29);
      if (hit) { hit.hp--; bullet.alive = false; bullet.shape.setVisible(false); }
      else if (bullet.x < 0 || bullet.x > 920 || bullet.y < 70 || bullet.y > 660) { bullet.alive = false; bullet.shape.setVisible(false); }
    });
  }

  private quietMelee(): void {
    if (this.phase !== 'raid') return;
    const targets = this.raiders.filter((raider) => Phaser.Math.Distance.Between(raider.x, raider.y, this.player.x, this.player.y) < 72);
    targets.forEach((raider) => { raider.hp -= 2; });
    if (targets.length) { this.noise += 2; this.ctx.cameras.main.shake(60, 0.002); }
  }

  private buildWall(): void {
    if (this.phase !== 'raid' || this.banked < 1) return;
    this.banked--;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.aim.x, this.aim.y);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * 58, 80, 860);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * 58, 110, 600);
    const shape = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(y), this.ss.s(68), this.ss.s(18), 0x64748b, 1)
      .setAngle(Phaser.Math.RadToDeg(angle) + 90).setScrollFactor(0).setDepth(D + 6).setStrokeStyle(this.ss.s(2), 0xcbd5e1));
    this.walls.push({ shape, x, y, hp: 60 }); this.noise += 6;
  }

  private drawAim(): void {
    this.aimLine?.setTo(this.ss.zx(this.player.x), this.ss.zy(this.player.y), this.ss.zx(this.aim.x), this.ss.zy(this.aim.y));
    this.playerImage?.setFlipX(this.aim.x < this.player.x);
  }

  private makeStation(key: PanicStation['key'], x: number, y: number, label: string, shortLabel: string, tagX: number, tagY: number): void {
    const ring = this.phaseTrack(this.ctx.add.circle(this.ss.zx(x), this.ss.zy(y), this.ss.s(key === 'bed' ? 52 : 28), 0x38bdf8, 0.08)
      .setScrollFactor(0).setDepth(D + 7).setStrokeStyle(this.ss.s(2), 0x38bdf8, 0.45));
    const tag = this.phaseTrack(this.ctx.label(this.ss.zx(tagX), this.ss.zy(tagY), shortLabel, {
      fontSize: `${this.ss.s(9)}px`, color: '#7dd3fc', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 10)) as Phaser.GameObjects.Text;
    this.stations.push({ key, x, y, label, shortLabel, ring, tag });
  }

  private addBackdrop(texture: string): void {
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(330), this.ss.s(920), this.ss.s(660), 0x020617, 1)
      .setScrollFactor(0).setDepth(D));
    this.phaseTrack(this.ctx.add.image(this.ss.zx(460), this.ss.zy(371), texture)
      .setDisplaySize(this.ss.s(920), this.ss.s(518)).setScrollFactor(0).setDepth(D + 1));
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(371), this.ss.s(916), this.ss.s(514), 0x000000, 0)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(2), 0x334155, 0.85));
  }

  private nearestStation(): PanicStation | null {
    let nearest: PanicStation | null = null; let distance = 75;
    this.stations.forEach((station) => {
      if (station.key !== 'bed' && this.tasks[station.key]) return;
      const candidate = Phaser.Math.Distance.Between(this.player.x, this.player.y, station.x, station.y);
      if (candidate < distance) { distance = candidate; nearest = station; }
    });
    return nearest;
  }

  private completeStation(station: PanicStation): void {
    this.activeStation = null; this.interactionProgress = 0;
    if (station.key === 'bed') {
      const score = coverScore(this.tasks);
      this.finish('win', { phase: 'bed', loot: this.banked, baseHp: Math.round(this.baseHp), coverScore: score, cameraLeftOn: !this.tasks.camera, tasks: this.tasks });
      return;
    }
    this.tasks[station.key] = true;
    station.ring.setFillStyle(0x22c55e, 0.3).setStrokeStyle(this.ss.s(3), 0x86efac, 1);
    station.tag.setText(`✓ ${station.shortLabel}`).setColor('#86efac');
    this.ctx.cameras.main.flash(70, 34, 197, 94, false);
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase(); this.keys.add(key);
    if (key === 'f') this.quietMelee();
    if (key === 'b') this.buildWall();
  }

  private phaseTrack<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.track(object); this.phaseObjects.push(object); return object;
  }

  private clearPhase(): void {
    this.phaseObjects.forEach((object) => {
      try { this.ctx.tweens.killTweensOf(object); object.destroy(); } catch { /* already gone */ }
      const index = this.objects.indexOf(object); if (index >= 0) this.objects.splice(index, 1);
    });
    this.phaseObjects = [];
  }

  private configureResponsiveLayout(): void {
    const cam = this.ctx.cameras.main; const base = this.ss;
    this.layoutScale = Math.min(cam.width / 920, cam.height / 660);
    this.layoutOffsetX = (cam.width - 920 * this.layoutScale) / 2;
    this.layoutOffsetY = (cam.height - 660 * this.layoutScale) / 2;
    this.ss = { z: base.z, zx: (x) => base.zx(this.layoutOffsetX + x * this.layoutScale), zy: (y) => base.zy(this.layoutOffsetY + y * this.layoutScale), s: (size) => base.s(size * this.layoutScale) };
  }

  private designX(screenX: number): number {
    return Phaser.Math.Clamp((screenX - this.layoutOffsetX) / this.layoutScale, 0, 920);
  }

  private designY(screenY: number): number {
    return Phaser.Math.Clamp((screenY - this.layoutOffsetY) / this.layoutScale, 0, 660);
  }
}

export const benRustRaidMode = new BenRustRaidMode();
