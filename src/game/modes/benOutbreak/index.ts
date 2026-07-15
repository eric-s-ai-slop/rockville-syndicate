import Phaser from 'phaser';
import type { ModeContext, ModeResult } from '../types';
import { BEN_GAME_DEPTH as D, BenArcadeMode } from '../benArcade/shared';
import { exposurePerSecond, stageForElapsed, ventRoom } from './logic';
import RENTAL_URL from '../../../assets/chapters/bens_life/minigames/outbreak/ocean-city-rental.png';
import BEN_URL from '../../../assets/chapters/bens_life/minigames/outbreak/ben.png';
import ERIC_URL from '../../../assets/chapters/bens_life/minigames/outbreak/eric.png';
import SOPHIE_URL from '../../../assets/chapters/bens_life/minigames/outbreak/sophie.png';
import LINDEN_URL from '../../../assets/chapters/bens_life/minigames/outbreak/linden.png';
import CARA_URL from '../../../assets/chapters/bens_life/minigames/outbreak/cara.png';
import EVIDENCE_URL from '../../../assets/chapters/bens_life/minigames/outbreak/evidence.png';
import SUPPLIES_URL from '../../../assets/chapters/bens_life/minigames/outbreak/supplies.png';

export interface BenOutbreakConfig {
  durationSeconds?: number;
}

type RoomIndex = 0 | 1 | 2 | 3;

interface Guest {
  guestId: 'eric' | 'sophie' | 'linden' | 'cara';
  name: string;
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Ellipse;
  exposureBar: Phaser.GameObjects.Rectangle;
  x: number;
  room: RoomIndex;
  targetRoom: RoomIndex;
  exposure: number;
  washedUntil: number;
}

interface Evidence {
  image: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  room: RoomIndex;
}

const ASSETS = {
  rental: 'ben_outbreak_rental', ben: 'ben_outbreak_ben', eric: 'ben_outbreak_eric',
  sophie: 'ben_outbreak_sophie', linden: 'ben_outbreak_linden', cara: 'ben_outbreak_cara',
  evidence: 'ben_outbreak_evidence', supplies: 'ben_outbreak_supplies',
} as const;

const ROOM_NAMES = ['BATHROOM', 'KITCHEN', 'LIVING ROOM', 'BALCONY'] as const;
const ROOM_X = [105, 350, 585, 790] as const;
const GUEST_OFFSET: Record<Guest['guestId'], number> = { eric: -42, sophie: -14, linden: 18, cara: 47 };

export class BenOutbreakMode extends BenArcadeMode<BenOutbreakConfig> {
  id = 'benOutbreak';
  capturesPlayerMovement = true;

  private durationSeconds = 58;
  private elapsed = 0;
  private rooms = [24, 5, 3, 0];
  private ventCooldowns = [0, 0, 0, 0];
  private guests: Guest[] = [];
  private ben: Phaser.GameObjects.Image | null = null;
  private benLabel: Phaser.GameObjects.Text | null = null;
  private benX: number = ROOM_X[0];
  private benRoom: RoomIndex = 0;
  private benTargetRoom: RoomIndex = 0;
  private evidence: Evidence[] = [];
  private disinfectCooldown = 0;
  private nextBenMove = 3;
  private nextCough = 4;
  private nextEvidence = 8;
  private currentStage: 1 | 2 | 3 = 1;
  private hud: Phaser.GameObjects.Text | null = null;
  private taskText: Phaser.GameObjects.Text | null = null;
  private stageText: Phaser.GameObjects.Text | null = null;
  private roomReadouts: Phaser.GameObjects.Text[] = [];
  private roomFogs: Phaser.GameObjects.Rectangle[] = [];
  private airflowTexts: Phaser.GameObjects.Text[] = [];
  private supplyText: Phaser.GameObjects.Text | null = null;
  private layoutScale = 1;
  private layoutOffsetX = 0;
  private layoutOffsetY = 0;

  preload(ctx: ModeContext): void {
    const load = ctx.physics.scene.load;
    const entries: Array<[string, string]> = [
      [ASSETS.rental, RENTAL_URL], [ASSETS.ben, BEN_URL], [ASSETS.eric, ERIC_URL],
      [ASSETS.sophie, SOPHIE_URL], [ASSETS.linden, LINDEN_URL], [ASSETS.cara, CARA_URL],
      [ASSETS.evidence, EVIDENCE_URL], [ASSETS.supplies, SUPPLIES_URL],
    ];
    entries.forEach(([key, url]) => { if (!ctx.textures.exists(key)) load.image(key, url); });
  }

  start(ctx: ModeContext, config: BenOutbreakConfig | undefined, done: (result: ModeResult) => void): void {
    this.begin(ctx, done);
    this.configureResponsiveLayout();
    this.durationSeconds = config?.durationSeconds ?? 58;
    this.elapsed = 0; this.rooms = [24, 5, 3, 0]; this.ventCooldowns = [0, 0, 0, 0];
    this.guests = []; this.evidence = []; this.disinfectCooldown = 0;
    this.roomReadouts = []; this.roomFogs = []; this.airflowTexts = []; this.benLabel = null;
    this.nextBenMove = 3; this.nextCough = 4; this.nextEvidence = 8; this.currentStage = 1;
    this.drawScene();
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta, 40) / 1000;
    this.elapsed += dt;
    this.disinfectCooldown = Math.max(0, this.disinfectCooldown - dt);
    this.ventCooldowns = this.ventCooldowns.map((value) => Math.max(0, value - dt));
    this.updateStage();
    this.updateAir(dt);
    this.updateBen(dt);
    this.updateGuests(dt);
    this.updateHud();
    const eric = this.guests.find((guest) => guest.guestId === 'eric');
    if ((eric?.exposure ?? 0) >= 100) {
      this.finish('lose', { ericExposure: Math.round(eric?.exposure ?? 100) });
    } else if (this.elapsed >= this.durationSeconds) {
      this.finish('win', {
        ericExposure: Math.round(eric?.exposure ?? 0), evidenceLeft: this.evidence.length,
      });
    }
  }

  private drawScene(): void {
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(330), this.ss.s(920), this.ss.s(660), 0x020617, 1)
      .setScrollFactor(0).setDepth(D));
    this.track(this.ctx.add.image(this.ss.zx(460), this.ss.zy(371), ASSETS.rental)
      .setDisplaySize(this.ss.s(920), this.ss.s(518)).setScrollFactor(0).setDepth(D + 1));
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(45), this.ss.s(920), this.ss.s(90), 0x020617, 0.9)
      .setScrollFactor(0).setDepth(D + 15));
    this.hud = this.track(this.ctx.label(this.ss.zx(24), this.ss.zy(18), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#f8fafc', fontStyle: 'bold', lineSpacing: this.ss.s(3),
    }).setScrollFactor(0).setDepth(D + 18)) as Phaser.GameObjects.Text;
    this.stageText = this.track(this.ctx.label(this.ss.zx(895), this.ss.zy(20), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#bef264', fontStyle: 'bold', align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 18)) as Phaser.GameObjects.Text;

    ROOM_X.forEach((x, index) => this.makeRoomControl(index as RoomIndex, x));
    this.makeGuest('eric', 'ERIC', ASSETS.eric, 2, 52, 142);
    this.makeGuest('sophie', 'SOPHIE', ASSETS.sophie, 2, 43, 138);
    this.makeGuest('linden', 'LINDEN', ASSETS.linden, 1, 45, 140);
    this.makeGuest('cara', 'CARA', ASSETS.cara, 3, 45, 139);

    this.benRoom = 0; this.benTargetRoom = 0; this.benX = ROOM_X[0];
    this.ben = this.track(this.ctx.add.image(this.ss.zx(this.benX), this.ss.zy(520), ASSETS.ben)
      .setOrigin(0.5, 1).setDisplaySize(this.ss.s(55), this.ss.s(150)).setScrollFactor(0).setDepth(D + 8));
    this.benLabel = this.track(this.ctx.label(this.ss.zx(this.benX), this.ss.zy(360), 'BEN • DO NOT DIRECT', {
      fontSize: `${this.ss.s(9)}px`, color: '#d9f99d', fontStyle: 'bold', stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 12)) as Phaser.GameObjects.Text;
    this.ctx.tweens.add({ targets: this.benLabel, alpha: 0.45, duration: 650, yoyo: true, repeat: -1 });

    [228, 468, 690].forEach((x) => {
      const airflow = this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(260), '→', {
        fontSize: `${this.ss.s(22)}px`, color: '#bae6fd', fontStyle: 'bold', stroke: '#020617', strokeThickness: this.ss.s(4),
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 6).setAlpha(0.35)) as Phaser.GameObjects.Text;
      this.airflowTexts.push(airflow);
    });

    const supplies = this.track(this.ctx.add.image(this.ss.zx(452), this.ss.zy(520), ASSETS.supplies)
      .setOrigin(0.5, 1).setDisplaySize(this.ss.s(76), this.ss.s(67)).setScrollFactor(0).setDepth(D + 10)
      .setInteractive({ useHandCursor: true }));
    supplies.on('pointerdown', () => this.disinfectEric());
    this.hover(supplies, 'CLICK — DISINFECT ERIC AND LOWER HIS EXPOSURE');
    this.supplyText = this.track(this.ctx.label(this.ss.zx(452), this.ss.zy(532), '', {
      fontSize: `${this.ss.s(8)}px`, color: '#bae6fd', fontStyle: 'bold', stroke: '#020617', strokeThickness: this.ss.s(3),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;

    this.taskText = this.track(this.ctx.label(this.ss.zx(460), this.ss.zy(640), 'CLICK A ROOM TO MOVE ERIC • VENT GREEN ROOMS • CLICK GARBAGE TO REMOVE IT', {
      fontSize: `${this.ss.s(12)}px`, color: '#fef08a', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(5),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 20)) as Phaser.GameObjects.Text;
    this.spawnEvidence(0);
  }

  private makeRoomControl(room: RoomIndex, x: number): void {
    const fogWidths = [190, 270, 220, 200] as const;
    const fog = this.track(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(360), this.ss.s(fogWidths[room]), this.ss.s(330), 0xa3e635, 0.001)
      .setScrollFactor(0).setDepth(D + 4));
    this.roomFogs.push(fog);
    const marker = this.track(this.ctx.add.ellipse(this.ss.zx(x), this.ss.zy(545), this.ss.s(150), this.ss.s(34), 0x0f172a, 0.78)
      .setScrollFactor(0).setDepth(D + 11).setStrokeStyle(this.ss.s(2), 0x38bdf8, 0.7)
      .setInteractive({ useHandCursor: true }));
    marker.on('pointerdown', () => this.sendEricTo(room));
    this.hover(marker, `MOVE ERIC TO ${ROOM_NAMES[room]}`);
    this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(545), `MOVE ERIC: ${ROOM_NAMES[room]}`, {
      fontSize: `${this.ss.s(9)}px`, color: '#e0f2fe', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 12));
    const readout = this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(116), '', {
      fontSize: `${this.ss.s(9)}px`, color: '#d9f99d', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 14)) as Phaser.GameObjects.Text;
    this.roomReadouts.push(readout);
    if (room < 3) {
      const vent = this.track(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(143), this.ss.s(98), this.ss.s(25), 0x0369a1, 0.92)
        .setScrollFactor(0).setDepth(D + 13).setStrokeStyle(this.ss.s(1), 0x7dd3fc)
        .setInteractive({ useHandCursor: true }));
      vent.on('pointerdown', () => this.vent(room));
      this.hover(vent, `CLICK — VENT ${ROOM_NAMES[room]}`);
      this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(143), 'VENT ROOM', {
        fontSize: `${this.ss.s(8)}px`, color: '#f0f9ff', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 14));
    }
  }

  private makeGuest(guestId: Guest['guestId'], name: string, texture: string, room: RoomIndex, width: number, height: number): void {
    const x = ROOM_X[room] + GUEST_OFFSET[guestId];
    const ring = this.track(this.ctx.add.ellipse(this.ss.zx(x), this.ss.zy(514), this.ss.s(64), this.ss.s(18), 0x38bdf8, 0.08)
      .setScrollFactor(0).setDepth(D + 6).setStrokeStyle(this.ss.s(3), 0x38bdf8, 0));
    const image = this.track(this.ctx.add.image(this.ss.zx(x), this.ss.zy(520), texture)
      .setOrigin(0.5, 1).setDisplaySize(this.ss.s(width), this.ss.s(height)).setScrollFactor(0).setDepth(D + 9)
      .setInteractive({ useHandCursor: true }));
    const label = this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(365), name, {
      fontSize: `${this.ss.s(9)}px`, color: '#f8fafc', fontStyle: 'bold', stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 12));
    const exposureBar = this.track(this.ctx.add.rectangle(this.ss.zx(x - 24), this.ss.zy(382), this.ss.s(48), this.ss.s(5), 0x22c55e, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 12));
    const guest: Guest = { guestId, name, image, label, ring, exposureBar, x, room, targetRoom: room, exposure: guestId === 'eric' ? 5 : 0, washedUntil: 0 };
    if (guestId === 'eric') this.hover(image, 'ERIC — KEEP HIS EXPOSURE BELOW 100%');
    else image.disableInteractive();
    exposureBar.setVisible(guestId === 'eric');
    ring.setStrokeStyle(this.ss.s(3), 0x38bdf8, guestId === 'eric' ? 1 : 0);
    this.guests.push(guest);
  }

  private updateStage(): void {
    const stage = stageForElapsed(this.elapsed);
    if (stage === this.currentStage) return;
    this.currentStage = stage;
    this.ctx.cameras.main.flash(180, stage === 3 ? 190 : 132, stage === 3 ? 24 : 204, stage === 3 ? 93 : 22, false);
    this.taskText?.setText(stage === 2 ? 'THE COUGH BEGINS — WATCH THE AIRFLOW' : 'THE BROOKS INCIDENT — CONTAMINATION ACCELERATING');
    this.after(1800, () => this.taskText?.setText('CLICK A ROOM TO MOVE ERIC • VENT GREEN ROOMS • CLICK GARBAGE'));
  }

  private updateAir(dt: number): void {
    const before = [...this.rooms];
    for (let room = 0; room < 3; room++) {
      const flow = (before[room] - before[room + 1]) * 0.035 * dt;
      this.rooms[room] -= flow; this.rooms[room + 1] += flow;
    }
    this.rooms = this.rooms.map((value, room) => Phaser.Math.Clamp(value - dt * (room === 3 ? 7 : 0.7), 0, 100));
    this.evidence.forEach((item) => { this.rooms[item.room] = Phaser.Math.Clamp(this.rooms[item.room] + dt * 0.7, 0, 100); });
  }

  private updateBen(dt: number): void {
    const target = ROOM_X[this.benTargetRoom] + 58;
    this.benX = Phaser.Math.Linear(this.benX, target, Math.min(1, dt * 1.7));
    this.ben?.setPosition(this.ss.zx(this.benX), this.ss.zy(520));
    this.benLabel?.setPosition(this.ss.zx(this.benX), this.ss.zy(360));
    if (Math.abs(this.benX - target) < 5) this.benRoom = this.benTargetRoom;
    if (this.elapsed >= this.nextBenMove) {
      this.nextBenMove = this.elapsed + Math.max(2.8, 5.4 - this.currentStage * 0.65);
      this.benTargetRoom = Phaser.Math.Between(0, 3) as RoomIndex;
    }
    if (this.elapsed >= this.nextCough) {
      this.nextCough = this.elapsed + Math.max(2.4, 5.4 - this.currentStage * 0.8);
      this.cough();
    }
    if (this.elapsed >= this.nextEvidence) {
      this.nextEvidence = this.elapsed + Math.max(4.8, 9 - this.currentStage);
      this.spawnEvidence(this.benRoom);
    }
  }

  private updateGuests(dt: number): void {
    this.guests.forEach((guest) => {
      const target = ROOM_X[guest.targetRoom] + GUEST_OFFSET[guest.guestId];
      guest.x = Phaser.Math.Linear(guest.x, target, Math.min(1, dt * 3.2));
      if (Math.abs(guest.x - target) < 4) guest.room = guest.targetRoom;
      const washed = guest.washedUntil > this.elapsed;
      if (guest.guestId === 'eric') guest.exposure = Phaser.Math.Clamp(guest.exposure + exposurePerSecond(this.rooms[guest.room], washed) * dt, 0, 100);
      const x = this.ss.zx(guest.x);
      guest.image.setPosition(x, this.ss.zy(520)); guest.label.setPosition(x, this.ss.zy(365));
      guest.ring.setPosition(x, this.ss.zy(514)); guest.exposureBar.setPosition(this.ss.zx(guest.x - 24), this.ss.zy(382)).setScale(guest.exposure / 100, 1);
      const color = guest.exposure < 45 ? 0x22c55e : guest.exposure < 75 ? 0xfacc15 : 0xef4444;
      guest.exposureBar.setFillStyle(color, 1);
      if (washed) guest.image.setTint(0xbae6fd); else guest.image.clearTint();
    });
  }

  private updateHud(): void {
    const remaining = Math.max(0, this.durationSeconds - this.elapsed);
    const eric = this.guests.find((guest) => guest.guestId === 'eric');
    this.hud?.setText(`KEEP ERIC BELOW 100% EXPOSURE   •   ${remaining.toFixed(0)}s LEFT\nERIC EXPOSURE: ${Math.round(eric?.exposure ?? 0)}%`);
    const stageLabel = this.currentStage === 1 ? 'SECURE THE AFTERMATH' : this.currentStage === 2 ? 'THE COUGH BEGINS' : 'THE BROOKS INCIDENT';
    this.stageText?.setText(`STAGE ${this.currentStage}/3\n${stageLabel}`);
    this.roomReadouts.forEach((readout, room) => {
      const level = this.rooms[room];
      const state = level < 18 ? 'CLEAN' : level < 48 ? 'RISK' : level < 75 ? 'DIRTY' : 'TOXIC';
      readout.setText(`${state} ${Math.round(level)}%${this.ventCooldowns[room] > 0 ? ` • VENT ${this.ventCooldowns[room].toFixed(0)}s` : ''}`)
        .setColor(level < 18 ? '#86efac' : level < 48 ? '#fde047' : '#fca5a5');
      this.roomFogs[room]?.setFillStyle(level < 48 ? 0xa3e635 : 0x65a30d, Math.max(0.001, level / 460));
    });
    this.airflowTexts.forEach((airflow, index) => {
      const difference = this.rooms[index] - this.rooms[index + 1];
      airflow.setText(difference >= 0 ? '→' : '←').setAlpha(0.22 + Math.min(0.55, Math.abs(difference) / 90));
    });
    this.supplyText?.setText(this.disinfectCooldown > 0 ? `DISINFECT ${this.disinfectCooldown.toFixed(0)}s` : 'CLICK: DISINFECT ERIC');
  }

  private sendEricTo(room: RoomIndex): void {
    const eric = this.guests.find((guest) => guest.guestId === 'eric');
    if (!eric) return;
    if (eric.targetRoom === room) { this.taskText?.setText(`ERIC IS ALREADY IN THE ${ROOM_NAMES[room]}`); return; }
    eric.targetRoom = room;
    this.taskText?.setText(`MOVING ERIC TO THE ${ROOM_NAMES[room]}`);
  }

  private disinfectEric(): void {
    if (this.disinfectCooldown > 0) { this.taskText?.setText(`DISINFECTANT READY IN ${this.disinfectCooldown.toFixed(0)}s`); return; }
    const eric = this.guests.find((guest) => guest.guestId === 'eric');
    if (!eric) return;
    eric.exposure = Math.max(0, eric.exposure - 28);
    eric.washedUntil = this.elapsed + 7;
    this.disinfectCooldown = 11;
    this.ctx.cameras.main.flash(80, 94, 234, 212, false);
    this.taskText?.setText('ERIC DISINFECTED — EXPOSURE LOWERED');
  }

  private vent(room: RoomIndex): void {
    if (this.ventCooldowns[room] > 0) { this.taskText?.setText(`${ROOM_NAMES[room]} VENT RECHARGING`); return; }
    this.rooms[room] = ventRoom(this.rooms[room]); this.ventCooldowns[room] = 8;
    this.ctx.cameras.main.flash(80, 56, 189, 248, false);
    this.taskText?.setText(`${ROOM_NAMES[room]} VENTED`);
  }

  private cough(): void {
    this.rooms[this.benRoom] = Phaser.Math.Clamp(this.rooms[this.benRoom] + 22 + this.currentStage * 7, 0, 100);
    const cloud = this.track(this.ctx.add.circle(this.ss.zx(this.benX), this.ss.zy(440), this.ss.s(24), 0xa3e635, 0.42)
      .setScrollFactor(0).setDepth(D + 7).setStrokeStyle(this.ss.s(2), 0xd9f99d, 0.7));
    this.ctx.tweens.add({ targets: cloud, alpha: 0, scale: 3.3, x: this.ss.zx(this.benX + 45), duration: 1600, onComplete: () => cloud.destroy() });
    this.taskText?.setText(`BEN COUGHED IN THE ${ROOM_NAMES[this.benRoom]}`);
  }

  private spawnEvidence(room: RoomIndex): void {
    const x = ROOM_X[room] + Phaser.Math.Between(-45, 45);
    const ring = this.track(this.ctx.add.circle(this.ss.zx(x), this.ss.zy(494), this.ss.s(37), 0xa3e635, 0.08)
      .setScrollFactor(0).setDepth(D + 8).setStrokeStyle(this.ss.s(2), 0xd9f99d, 0.9));
    const image = this.track(this.ctx.add.image(this.ss.zx(x), this.ss.zy(510), ASSETS.evidence)
      .setOrigin(0.5, 1).setDisplaySize(this.ss.s(72), this.ss.s(50)).setScrollFactor(0).setDepth(D + 10)
      .setInteractive({ useHandCursor: true }));
    const item: Evidence = { image, ring, room };
    image.on('pointerdown', () => this.bagEvidence(item));
    this.hover(image, `CLICK — BAG CONTAMINATED EVIDENCE IN ${ROOM_NAMES[room]}`);
    this.ctx.tweens.add({ targets: ring, alpha: 0.35, scale: 1.16, duration: 620, yoyo: true, repeat: -1 });
    this.evidence.push(item);
  }

  private bagEvidence(item: Evidence): void {
    if (!this.evidence.includes(item)) return;
    this.rooms[item.room] = Math.max(0, this.rooms[item.room] - 22);
    this.ctx.tweens.killTweensOf(item.ring); item.image.destroy(); item.ring.destroy(); this.evidence.splice(this.evidence.indexOf(item), 1);
    this.ctx.cameras.main.flash(55, 34, 197, 94, false);
    this.taskText?.setText('CONTAMINATED GARBAGE REMOVED');
  }

  private hover(object: Phaser.GameObjects.GameObject, message: string): void {
    object.on('pointerover', () => this.taskText?.setText(message));
  }

  private configureResponsiveLayout(): void {
    const cam = this.ctx.cameras.main; const base = this.ss;
    this.layoutScale = Math.min(cam.width / 920, cam.height / 660);
    this.layoutOffsetX = (cam.width - 920 * this.layoutScale) / 2;
    this.layoutOffsetY = (cam.height - 660 * this.layoutScale) / 2;
    this.ss = {
      z: base.z,
      zx: (x) => base.zx(this.layoutOffsetX + x * this.layoutScale),
      zy: (y) => base.zy(this.layoutOffsetY + y * this.layoutScale),
      s: (size) => base.s(size * this.layoutScale),
    };
  }
}

export const benOutbreakMode = new BenOutbreakMode();
