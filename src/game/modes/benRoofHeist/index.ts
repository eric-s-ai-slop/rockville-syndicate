import Phaser from 'phaser';
import type { ModeContext, ModeResult } from '../types';
import { BEN_GAME_DEPTH as D, BenArcadeMode } from '../benArcade/shared';
import M4A4_URL from '../../../assets/chapters/bens_life/minigames/roof/m4a4.png';
import PRESSURE_COOKER_URL from '../../../assets/chapters/bens_life/minigames/roof/pressure-cooker.png';
import HOSTAGES_URL from '../../../assets/chapters/bens_life/minigames/roof/hostages.png';

export interface BenRoofHeistConfig {
  levels?: number;
}

type PieceKind = 'm4a4' | 'cooker' | 'hostages';
type PieceVisual = Phaser.GameObjects.Image;

interface Piece {
  kind: PieceKind;
  x: number;
  y: number;
  angle: number;
  fuse: number;
  vx: number;
  vy: number;
  home: { x: number; y: number };
  hit: Phaser.GameObjects.Rectangle;
  visuals: PieceVisual[];
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shape: Phaser.GameObjects.Arc;
  alive: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: Phaser.GameObjects.Rectangle;
}

const LEVELS = [
  { integrity: 25, label: 'SIMULATION 01 — DIRECT ACCESS', hint: 'Aim the M4A4 at the lock. Q / E rotates selected equipment.' },
  { integrity: 82, label: 'SIMULATION 02 — BLAST SHIELD', hint: 'Bullets cannot clear the shield. Trigger the pressure cooker near the door.' },
  { integrity: 155, label: 'SIMULATION 03 — FULL OPERATION', hint: 'Combine blast force, M4A4 fire, and the hostage counterweight.' },
] as const;

const ROOF_ASSET_KEYS = {
  m4a4: 'ben_roof_m4a4',
  cooker: 'ben_roof_pressure_cooker',
  hostages: 'ben_roof_hostages',
} as const;

export class BenRoofHeistMode extends BenArcadeMode<BenRoofHeistConfig> {
  id = 'benRoofHeist';

  private phase: 'build' | 'running' | 'result' = 'build';
  private level = 0;
  private levelCount = 3;
  private pieces: Piece[] = [];
  private selected: Piece | null = null;
  private bullets: Bullet[] = [];
  private obstacles: Obstacle[] = [];
  private elapsed = 0;
  private nextShot = 0;
  private shotsRemaining = 0;
  private cookerExploded = false;
  private doorIntegrity = 25;
  private door: Phaser.GameObjects.Rectangle | null = null;
  private doorBar: Phaser.GameObjects.Rectangle | null = null;
  private doorText: Phaser.GameObjects.Text | null = null;
  private status: Phaser.GameObjects.Text | null = null;
  private levelText: Phaser.GameObjects.Text | null = null;
  private selectionText: Phaser.GameObjects.Text | null = null;
  private executeButton: Phaser.GameObjects.Rectangle | null = null;
  private layoutScale = 1;
  private layoutOffsetX = 0;
  private layoutOffsetY = 0;

  preload(ctx: ModeContext): void {
    if (!ctx.textures.exists(ROOF_ASSET_KEYS.m4a4)) ctx.physics.scene.load.image(ROOF_ASSET_KEYS.m4a4, M4A4_URL);
    if (!ctx.textures.exists(ROOF_ASSET_KEYS.cooker)) ctx.physics.scene.load.image(ROOF_ASSET_KEYS.cooker, PRESSURE_COOKER_URL);
    if (!ctx.textures.exists(ROOF_ASSET_KEYS.hostages)) ctx.physics.scene.load.image(ROOF_ASSET_KEYS.hostages, HOSTAGES_URL);
  }

  start(ctx: ModeContext, config: BenRoofHeistConfig | undefined, onComplete: (result: ModeResult) => void): void {
    this.begin(ctx, onComplete);
    this.configureResponsiveLayout();
    this.level = 0;
    this.levelCount = Phaser.Math.Clamp(config?.levels ?? 3, 1, 3);
    this.buildScene();
    this.loadLevel();
    this.bind('keydown', (event) => this.onKey(event));
  }

  update(_time: number, delta: number): void {
    if (this.ended || this.phase !== 'running') return;
    const dt = Math.min(delta, 32) / 1000;
    this.elapsed += dt;
    this.updateWeapon(dt);
    this.updateBullets(dt);
    this.updateHostages(dt);
    this.updateHud();
    if (this.doorIntegrity <= 0) this.completeSimulation();
    else if (this.elapsed >= 5.5) this.failSimulation();
  }

  private buildScene(): void {
    const cam = this.ctx.cameras.main;
    const cx = 460;
    const cy = 330;
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy), this.ss.s(cam.width * 2), this.ss.s(cam.height * 2), 0x071a2a, 1)
      .setScrollFactor(0).setDepth(D));
    for (let x = 40; x < 920; x += 28) {
      this.track(this.ctx.add.line(0, 0, this.ss.zx(x), this.ss.zy(78), this.ss.zx(x), this.ss.zy(530), 0x38bdf8, 0.09)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(D + 1).setLineWidth(this.ss.s(1)));
    }
    for (let y = 82; y < 530; y += 28) {
      this.track(this.ctx.add.line(0, 0, this.ss.zx(38), this.ss.zy(y), this.ss.zx(882), this.ss.zy(y), 0x38bdf8, 0.09)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(D + 1).setLineWidth(this.ss.s(1)));
    }
    this.track(this.ctx.label(this.ss.zx(52), this.ss.zy(38), 'ROOF ACCESS // BEN TACTICAL SIMULATOR', {
      fontSize: `${this.ss.s(18)}px`, color: '#e0f2fe', fontStyle: 'bold', letterSpacing: this.ss.s(1.5),
    }).setScrollFactor(0).setDepth(D + 5));
    this.track(this.ctx.label(this.ss.zx(868), this.ss.zy(43), '51 MONROE  •  REV 13', {
      fontSize: `${this.ss.s(9)}px`, color: '#7dd3fc', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 5));
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(475), this.ss.s(840), this.ss.s(10), 0xb8dff3, 0.85)
      .setScrollFactor(0).setDepth(D + 4));
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(578), this.ss.s(840), this.ss.s(112), 0x04111d, 0.96)
      .setScrollFactor(0).setDepth(D + 3).setStrokeStyle(this.ss.s(2), 0x0ea5e9, 0.45));
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(624), this.ss.s(840), this.ss.s(24), 0x08283a, 1)
      .setScrollFactor(0).setDepth(D + 5));
    this.levelText = this.track(this.ctx.label(this.ss.zx(52), this.ss.zy(78), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#38bdf8', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(D + 6)) as Phaser.GameObjects.Text;
    this.status = this.track(this.ctx.label(this.ss.zx(52), this.ss.zy(105), '', {
      fontSize: `${this.ss.s(11)}px`, color: '#bae6fd', wordWrap: { width: this.ss.s(700) },
    }).setScrollFactor(0).setDepth(D + 6)) as Phaser.GameObjects.Text;
    this.selectionText = this.track(this.ctx.label(this.ss.zx(52), this.ss.zy(624), '', {
      fontSize: `${this.ss.s(9)}px`, color: '#e0f2fe', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 7)) as Phaser.GameObjects.Text;
    this.makeDoor();
    this.makePiece('m4a4', 205, 564);
    this.makePiece('cooker', 430, 564);
    this.makePiece('hostages', 650, 564);
    this.executeButton = this.track(this.ctx.add.rectangle(this.ss.zx(820), this.ss.zy(564), this.ss.s(112), this.ss.s(52), 0x0ea5e9, 1)
      .setScrollFactor(0).setDepth(D + 7).setStrokeStyle(this.ss.s(2), 0xe0f2fe, 0.8).setInteractive({ useHandCursor: true })) as Phaser.GameObjects.Rectangle;
    this.track(this.ctx.label(this.ss.zx(820), this.ss.zy(564), 'EXECUTE\n[SPACE]', {
      fontSize: `${this.ss.s(11)}px`, color: '#02131f', align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 8));
    this.executeButton.on('pointerdown', () => this.execute());
  }

  private makeDoor(): void {
    this.track(this.ctx.add.rectangle(this.ss.zx(797), this.ss.zy(343), this.ss.s(12), this.ss.s(264), 0xb8dff3, 0.8)
      .setScrollFactor(0).setDepth(D + 4));
    this.door = this.track(this.ctx.add.rectangle(this.ss.zx(752), this.ss.zy(355), this.ss.s(78), this.ss.s(220), 0x164e63, 1)
      .setScrollFactor(0).setDepth(D + 5).setStrokeStyle(this.ss.s(3), 0x7dd3fc, 1)) as Phaser.GameObjects.Rectangle;
    this.track(this.ctx.add.circle(this.ss.zx(725), this.ss.zy(355), this.ss.s(5), 0xfbbf24, 1)
      .setScrollFactor(0).setDepth(D + 7));
    this.track(this.ctx.add.rectangle(this.ss.zx(752), this.ss.zy(205), this.ss.s(140), this.ss.s(32), 0x082f49, 1)
      .setScrollFactor(0).setDepth(D + 4));
    this.doorText = this.track(this.ctx.label(this.ss.zx(752), this.ss.zy(205), 'LOCK INTEGRITY', {
      fontSize: `${this.ss.s(9)}px`, color: '#bae6fd', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 7)) as Phaser.GameObjects.Text;
    this.track(this.ctx.add.rectangle(this.ss.zx(752), this.ss.zy(227), this.ss.s(140), this.ss.s(9), 0x0f172a, 1)
      .setScrollFactor(0).setDepth(D + 5));
    this.doorBar = this.track(this.ctx.add.rectangle(this.ss.zx(682), this.ss.zy(227), this.ss.s(140), this.ss.s(9), 0xf59e0b, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 6)) as Phaser.GameObjects.Rectangle;
  }

  private makePiece(kind: PieceKind, x: number, y: number): void {
    const hitWidth = kind === 'hostages' ? 148 : kind === 'm4a4' ? 152 : 82;
    const hitHeight = kind === 'hostages' ? 92 : kind === 'm4a4' ? 58 : 74;
    const hit = this.track(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(y), this.ss.s(hitWidth), this.ss.s(hitHeight), 0xffffff, 0.001)
      .setScrollFactor(0).setDepth(D + 12).setInteractive({ useHandCursor: true })) as Phaser.GameObjects.Rectangle;
    const piece: Piece = { kind, x, y, angle: kind === 'm4a4' ? -12 : 0, fuse: 1.4, vx: 0, vy: 0, home: { x, y }, hit, visuals: [] };
    hit.on('pointerdown', () => this.select(piece));
    hit.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.phase !== 'build') return;
      piece.x = Phaser.Math.Clamp(this.screenX(dragX), 100, 690);
      piece.y = Phaser.Math.Clamp(this.screenY(dragY), 165, 445);
      this.select(piece);
      this.renderPiece(piece);
    });
    this.ctx.physics.scene.input.setDraggable(hit);
    this.pieces.push(piece);
    this.createPieceVisuals(piece);
  }

  private createPieceVisuals(piece: Piece): void {
    if (piece.kind === 'm4a4') {
      const image = this.track(this.ctx.add.image(0, 0, ROOF_ASSET_KEYS.m4a4).setDisplaySize(this.ss.s(138), this.ss.s(45))
        .setFlipX(true).setScrollFactor(0).setDepth(D + 10));
      piece.visuals.push(image);
    } else if (piece.kind === 'cooker') {
      const image = this.track(this.ctx.add.image(0, 0, ROOF_ASSET_KEYS.cooker).setDisplaySize(this.ss.s(72), this.ss.s(51))
        .setScrollFactor(0).setDepth(D + 10));
      piece.visuals.push(image);
    } else {
      const image = this.track(this.ctx.add.image(0, 0, ROOF_ASSET_KEYS.hostages).setDisplaySize(this.ss.s(138), this.ss.s(90))
        .setScrollFactor(0).setDepth(D + 10));
      piece.visuals.push(image);
    }
    this.renderPiece(piece);
  }

  private renderPiece(piece: Piece): void {
    piece.hit.setPosition(this.ss.zx(piece.x), this.ss.zy(piece.y)).setAngle(piece.kind === 'm4a4' ? piece.angle : 0);
    if (piece.kind === 'm4a4') {
      piece.visuals.forEach((object) => object.setPosition(this.ss.zx(piece.x), this.ss.zy(piece.y)).setAngle(piece.angle));
    } else {
      piece.visuals.forEach((object) => object.setPosition(this.ss.zx(piece.x), this.ss.zy(piece.y)));
    }
  }

  private loadLevel(): void {
    this.phase = 'build';
    this.elapsed = 0;
    this.bullets.forEach((bullet) => bullet.shape.destroy());
    this.bullets = [];
    this.obstacles.forEach((obstacle) => obstacle.shape.destroy());
    this.obstacles = [];
    const spec = LEVELS[this.level];
    this.doorIntegrity = spec.integrity;
    this.door?.setAngle(0).setPosition(this.ss.zx(752), this.ss.zy(355)).setFillStyle(0x164e63);
    this.levelText?.setText(spec.label);
    this.status?.setText(spec.hint);
    this.executeButton?.setFillStyle(0x0ea5e9);
    const starts = this.level === 0
      ? [[260, 350], [430, 564], [650, 564]]
      : this.level === 1
        ? [[260, 330], [560, 410], [650, 564]]
        : [[250, 335], [505, 410], [610, 420]];
    this.pieces.forEach((piece, index) => {
      piece.x = starts[index][0]; piece.y = starts[index][1]; piece.vx = 0; piece.vy = 0;
      piece.angle = piece.kind === 'm4a4' ? -4 : 0; piece.fuse = this.level === 0 ? 2.8 : 1.4;
      this.renderPiece(piece);
    });
    if (this.level === 1) this.makeObstacle(620, 372, 28, 205);
    if (this.level === 2) {
      this.makeObstacle(650, 275, 150, 18);
      this.makeObstacle(570, 454, 250, 18);
    }
    this.select(this.pieces[0]);
    this.updateHud();
  }

  private makeObstacle(x: number, y: number, w: number, h: number): void {
    const shape = this.track(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(y), this.ss.s(w), this.ss.s(h), 0x155e75, 1)
      .setScrollFactor(0).setDepth(D + 6).setStrokeStyle(this.ss.s(2), 0x67e8f9, 0.6));
    this.obstacles.push({ x, y, w, h, shape });
  }

  private select(piece: Piece): void {
    if (this.phase !== 'build') return;
    this.selected = piece;
    this.pieces.forEach((candidate) => candidate.hit.setStrokeStyle(
      this.ss.s(candidate === piece ? 3 : 0), candidate === piece ? 0xfacc15 : 0xffffff, candidate === piece ? 1 : 0,
    ));
    this.updateHud();
  }

  private onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (key === 'r') { this.loadLevel(); return; }
    if ((key === ' ' || key === 'enter') && this.phase === 'build') { event.preventDefault(); this.execute(); return; }
    if (this.phase !== 'build' || !this.selected) return;
    if (key === 'q' && this.selected.kind === 'm4a4') this.selected.angle -= 3;
    if (key === 'e' && this.selected.kind === 'm4a4') this.selected.angle += 3;
    if (key === 'z' && this.selected.kind === 'cooker') this.selected.fuse = Math.max(0.4, this.selected.fuse - 0.2);
    if (key === 'x' && this.selected.kind === 'cooker') this.selected.fuse = Math.min(3, this.selected.fuse + 0.2);
    this.renderPiece(this.selected);
    this.updateHud();
  }

  private execute(): void {
    if (this.phase !== 'build') return;
    this.phase = 'running';
    this.elapsed = 0;
    this.nextShot = 0.18;
    this.shotsRemaining = 5;
    this.cookerExploded = false;
    this.executeButton?.setFillStyle(0x334155);
    this.status?.setText('SIMULATION LIVE — CHAIN REACTION IN PROGRESS');
    this.pieces.forEach((piece) => { piece.vx = 0; piece.vy = 0; piece.hit.disableInteractive(); });
  }

  private updateWeapon(_dt: number): void {
    const weapon = this.pieces.find((piece) => piece.kind === 'm4a4');
    const cooker = this.pieces.find((piece) => piece.kind === 'cooker');
    if (!weapon || !cooker) return;
    if (this.shotsRemaining > 0 && this.elapsed >= this.nextShot) {
      this.fire(weapon);
      this.shotsRemaining--;
      this.nextShot += 0.16;
    }
    if (!this.cookerExploded && this.elapsed >= cooker.fuse) this.explode(cooker);
  }

  private fire(weapon: Piece): void {
    const angle = Phaser.Math.DegToRad(weapon.angle);
    const x = weapon.x + Math.cos(angle) * 58;
    const y = weapon.y + Math.sin(angle) * 58;
    const shape = this.track(this.ctx.add.circle(this.ss.zx(x), this.ss.zy(y), this.ss.s(4), 0xfef08a, 1)
      .setScrollFactor(0).setDepth(D + 14));
    this.bullets.push({ x, y, vx: Math.cos(angle) * 620, vy: Math.sin(angle) * 620, shape, alive: true });
    this.ctx.cameras.main.shake(45, 0.0015);
  }

  private updateBullets(dt: number): void {
    const cooker = this.pieces.find((piece) => piece.kind === 'cooker');
    this.bullets.forEach((bullet) => {
      if (!bullet.alive) return;
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
      bullet.shape.setPosition(this.ss.zx(bullet.x), this.ss.zy(bullet.y));
      if (cooker && !this.cookerExploded && Phaser.Math.Distance.Between(bullet.x, bullet.y, cooker.x, cooker.y) < 31) {
        bullet.alive = false; bullet.shape.setVisible(false); this.explode(cooker); return;
      }
      if (this.obstacles.some((o) => Math.abs(bullet.x - o.x) < o.w / 2 && Math.abs(bullet.y - o.y) < o.h / 2)) {
        bullet.alive = false; bullet.shape.setVisible(false); return;
      }
      if (bullet.x >= 713 && bullet.x <= 800 && bullet.y > 245 && bullet.y < 465) {
        bullet.alive = false; bullet.shape.setVisible(false); this.damageDoor(7); return;
      }
      if (bullet.x > 900 || bullet.x < 0 || bullet.y < 100 || bullet.y > 500) { bullet.alive = false; bullet.shape.setVisible(false); }
    });
  }

  private explode(cooker: Piece): void {
    if (this.cookerExploded) return;
    this.cookerExploded = true;
    cooker.visuals.forEach((object) => object.setVisible(false));
    cooker.hit.setVisible(false);
    const blast = this.track(this.ctx.add.circle(this.ss.zx(cooker.x), this.ss.zy(cooker.y), this.ss.s(18), 0xf97316, 0.9)
      .setScrollFactor(0).setDepth(D + 13));
    this.ctx.tweens.add({ targets: blast, scale: 9, alpha: 0, duration: 520, ease: 'Cubic.Out' });
    for (let i = 0; i < 18; i++) {
      const spark = this.track(this.ctx.add.circle(this.ss.zx(cooker.x), this.ss.zy(cooker.y), this.ss.s(3), i % 2 ? 0xfef08a : 0xfb923c, 1)
        .setScrollFactor(0).setDepth(D + 15));
      const angle = Math.PI * 2 * i / 18;
      this.ctx.tweens.add({ targets: spark, x: this.ss.zx(cooker.x + Math.cos(angle) * 120), y: this.ss.zy(cooker.y + Math.sin(angle) * 120), alpha: 0, duration: 450 });
    }
    const crowd = this.pieces.find((piece) => piece.kind === 'hostages');
    if (crowd) {
      const distance = Math.max(35, Phaser.Math.Distance.Between(cooker.x, cooker.y, crowd.x, crowd.y));
      const force = Math.max(0, 560 * (1 - distance / 300));
      crowd.vx += (crowd.x - cooker.x) / distance * force;
      crowd.vy += (crowd.y - cooker.y) / distance * force - 80;
    }
    const doorDistance = Phaser.Math.Distance.Between(cooker.x, cooker.y, 735, 355);
    this.damageDoor(Math.max(0, 118 * (1 - doorDistance / 245)));
    this.ctx.cameras.main.shake(360, 0.018);
    this.ctx.cameras.main.flash(160, 255, 126, 32, false);
  }

  private updateHostages(dt: number): void {
    const crowd = this.pieces.find((piece) => piece.kind === 'hostages');
    if (!crowd) return;
    crowd.vy += 430 * dt;
    crowd.x += crowd.vx * dt; crowd.y += crowd.vy * dt;
    crowd.vx *= Math.pow(0.992, dt * 60);
    if (crowd.y > 444) { crowd.y = 444; crowd.vy *= -0.18; crowd.vx *= 0.985; }
    if (crowd.x < 90) { crowd.x = 90; crowd.vx *= -0.25; }
    if (crowd.x + 63 >= 713 && crowd.y > 260 && crowd.y < 475 && crowd.vx > 35) {
      this.damageDoor(Math.min(90, crowd.vx * 0.22));
      crowd.x = 649; crowd.vx *= -0.18;
    }
    this.renderPiece(crowd);
  }

  private damageDoor(amount: number): void {
    if (amount <= 0 || this.doorIntegrity <= 0) return;
    this.doorIntegrity = Math.max(0, this.doorIntegrity - amount);
    this.door?.setFillStyle(this.doorIntegrity <= 0 ? 0x166534 : 0x164e63);
    this.ctx.tweens.add({ targets: this.door, x: this.ss.zx(756), yoyo: true, duration: 45, repeat: 1 });
  }

  private completeSimulation(): void {
    if (this.phase !== 'running') return;
    this.phase = 'result';
    this.door?.setAngle(-78).setPosition(this.ss.zx(783), this.ss.zy(398));
    this.status?.setText('ACCESS ACHIEVED — BEN CONFIDENCE 100%');
    this.ctx.cameras.main.flash(240, 34, 197, 94, false);
    this.after(1050, () => {
      if (this.level + 1 >= this.levelCount) {
        this.finish('win', { simulations: this.levelCount, finalIntegrity: 0, weapon: 'M4A4' });
      } else {
        this.level++;
        this.restoreInteraction();
        this.loadLevel();
      }
    });
  }

  private failSimulation(): void {
    if (this.phase !== 'running') return;
    this.phase = 'result';
    this.status?.setText(`DOOR REMAINS LOCKED — ${Math.ceil(this.doorIntegrity)} INTEGRITY.  RESETTING SIMULATION…`);
    this.ctx.cameras.main.shake(140, 0.004);
    this.after(900, () => { this.restoreInteraction(); this.loadLevel(); });
  }

  private restoreInteraction(): void {
    this.pieces.forEach((piece) => {
      piece.hit.setInteractive({ useHandCursor: true }).setVisible(true);
      this.ctx.physics.scene.input.setDraggable(piece.hit);
      piece.visuals.forEach((object) => object.setVisible(true));
    });
  }

  private updateHud(): void {
    const max = LEVELS[this.level].integrity;
    this.doorBar?.setDisplaySize(this.ss.s(140 * Phaser.Math.Clamp(this.doorIntegrity / max, 0, 1)), this.ss.s(9));
    this.doorText?.setText(`LOCK INTEGRITY  ${Math.ceil(this.doorIntegrity)} / ${max}`);
    if (!this.selected) return;
    const details = this.selected.kind === 'm4a4'
      ? `SELECTED: M4A4  •  AIM ${this.selected.angle.toFixed(0)}°  •  Q/E ROTATE`
      : this.selected.kind === 'cooker'
        ? `SELECTED: PRESSURE COOKER  •  FUSE ${this.selected.fuse.toFixed(1)}s  •  Z/X ADJUST`
        : 'SELECTED: 11 HOSTAGES  •  MASS 550kg  •  POSITION AS COUNTERWEIGHT';
    this.selectionText?.setText(`DRAG EQUIPMENT INTO THE CUTAWAY  •  ${details}  •  R RESET`);
  }

  private screenX(worldX: number): number {
    const cam = this.ctx.cameras.main;
    const screenX = cam.width / 2 + (worldX - cam.width / 2) * this.ss.z;
    return (screenX - this.layoutOffsetX) / this.layoutScale;
  }

  private screenY(worldY: number): number {
    const cam = this.ctx.cameras.main;
    const screenY = cam.height / 2 + (worldY - cam.height / 2) * this.ss.z;
    return (screenY - this.layoutOffsetY) / this.layoutScale;
  }

  private configureResponsiveLayout(): void {
    const cam = this.ctx.cameras.main;
    const base = this.ss;
    this.layoutScale = Math.min(cam.width / 920, cam.height / 660);
    this.layoutOffsetX = (cam.width - 920 * this.layoutScale) / 2;
    this.layoutOffsetY = (cam.height - 660 * this.layoutScale) / 2;
    this.ss = {
      z: base.z,
      zx: (x: number) => base.zx(this.layoutOffsetX + x * this.layoutScale),
      zy: (y: number) => base.zy(this.layoutOffsetY + y * this.layoutScale),
      s: (size: number) => base.s(size * this.layoutScale),
    };
  }
}

export const benRoofHeistMode = new BenRoofHeistMode();
