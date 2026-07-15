import Phaser from "phaser";
import type { ModeContext, ModeResult } from "../types";
import { BEN_GAME_DEPTH as D, BenArcadeMode } from "../benArcade/shared";
import { resolveBallCollision } from "../benArcade/logic";
export interface BenPoolShotConfig {
  rounds?: number;
}
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  o: Phaser.GameObjects.Arc;
  number: number;
  alive: boolean;
}
export class BenPoolShotMode extends BenArcadeMode<BenPoolShotConfig> {
  id = "benPoolShot";
  private balls: Ball[] = [];
  private keys = new Set<string>();
  private angle = 0;
  private power = 55;
  private moving = false;
  private round = 1;
  private rounds = 3;
  private sunk = 0;
  private shots = 0;
  private target = 1;
  private line: Phaser.GameObjects.Line | null = null;
  private hud: Phaser.GameObjects.Text | null = null;
  private phone = 50;
  start(
    ctx: ModeContext,
    c: BenPoolShotConfig | undefined,
    done: (r: ModeResult) => void,
  ) {
    this.begin(ctx, done);
    this.rounds = c?.rounds ?? 3;
    this.round = 1;
    this.sunk = this.shots = 0;
    this.keys.clear();
    this.makeBackdrop(
      "ONE TAKE FOR COLLEEN",
      "PHYSICS BILLIARDS / CINEMATIC CONSTRAINT",
      0xec4899,
      0x140712,
    );
    this.track(
      ctx.add
        .rectangle(
          this.ss.zx(460),
          this.ss.zy(365),
          this.ss.s(650),
          this.ss.s(300),
          0x5b341b,
          1,
        )
        .setScrollFactor(0)
        .setDepth(D + 3),
    );
    this.track(
      ctx.add
        .rectangle(
          this.ss.zx(460),
          this.ss.zy(365),
          this.ss.s(610),
          this.ss.s(260),
          0x0f6b4f,
          1,
        )
        .setScrollFactor(0)
        .setDepth(D + 4)
        .setStrokeStyle(this.ss.s(8), 0x7c4a28),
    );
    [
      [155, 235],
      [460, 235],
      [765, 235],
      [155, 495],
      [460, 495],
      [765, 495],
    ].forEach(([x, y]) =>
      this.track(
        ctx.add
          .circle(this.ss.zx(x), this.ss.zy(y), this.ss.s(17), 0x020617, 1)
          .setScrollFactor(0)
          .setDepth(D + 5),
      ),
    );
    this.line = this.track(
      ctx.add
        .line(0, 0, 0, 0, 0, 0, 0xf8fafc, 0.7)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(D + 7),
    ) as Phaser.GameObjects.Line;
    this.hud = this.track(
      ctx
        .label(this.ss.zx(460), this.ss.zy(535), "", {
          fontSize: `${this.ss.s(10)}px`,
          color: "#fce7f3",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(D + 8),
    ) as Phaser.GameObjects.Text;
    this.bind("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === " ") {
        e.preventDefault();
        this.shoot();
      }
    });
    this.bind("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    this.rack();
  }
  update(_t: number, d: number) {
    if (this.ended) return;
    const dt = Math.min(d, 33) / 1000;
    if (!this.moving) {
      if (this.keys.has("a") || this.keys.has("arrowleft"))
        this.angle -= 1.65 * dt;
      if (this.keys.has("d") || this.keys.has("arrowright"))
        this.angle += 1.65 * dt;
      if (this.keys.has("w") || this.keys.has("arrowup"))
        this.power = Math.min(100, this.power + 55 * dt);
      if (this.keys.has("s") || this.keys.has("arrowdown"))
        this.power = Math.max(15, this.power - 55 * dt);
      if (this.keys.has("q")) this.phone = Math.max(0, this.phone - 35 * dt);
      if (this.keys.has("e")) this.phone = Math.min(100, this.phone + 35 * dt);
      this.drawAim();
    }
    let active = false;
    this.balls.forEach((b) => {
      if (!b.alive) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= Math.pow(0.988, d / 16.67);
      b.vy *= Math.pow(0.988, d / 16.67);
      if (Math.abs(b.vx) + Math.abs(b.vy) < 5) {
        b.vx = b.vy = 0;
      } else active = true;
      if (b.x < 175 || b.x > 745) {
        b.vx *= -0.92;
        b.x = Phaser.Math.Clamp(b.x, 175, 745);
      }
      if (b.y < 255 || b.y > 475) {
        b.vy *= -0.92;
        b.y = Phaser.Math.Clamp(b.y, 255, 475);
      }
      for (const [px, py] of [
        [155, 235],
        [460, 235],
        [765, 235],
        [155, 495],
        [460, 495],
        [765, 495],
      ])
        if (Phaser.Math.Distance.Between(b.x, b.y, px, py) < 32) {
          b.alive = false;
          b.o.setVisible(false);
          if (b.number === this.target) this.sunk++;
        }
      b.o.setPosition(this.ss.zx(b.x), this.ss.zy(b.y));
    });
    for (let i = 0; i < this.balls.length; i++)
      for (let j = i + 1; j < this.balls.length; j++)
        if (this.balls[i].alive && this.balls[j].alive)
          resolveBallCollision(this.balls[i], this.balls[j]);
    if (this.moving && !active) {
      this.moving = false;
      this.after(450, () => this.nextRound());
    }
    this.hud?.setText(
      `A/D AIM • W/S POWER • SPACE SHOOT • Q/E CAMERA     ROUND ${this.round}/${this.rounds}   TARGET ${this.target}   POWER ${Math.round(this.power)}%   FACE ${Math.round(this.phone)}%   SUNK ${this.sunk}`,
    );
  }
  private rack() {
    this.balls.forEach((b) => b.o.destroy());
    this.balls = [];
    this.target = this.round;
    this.angle = -0.12 + this.round * 0.08;
    this.power = 52;
    this.moving = false;
    this.ball(280, 365, 0, 0, 0, 0xffffff);
    this.ball(
      585,
      335 + (this.round % 2) * 55,
      0,
      0,
      this.target,
      [0xfacc15, 0x3b82f6, 0xef4444][(this.round - 1) % 3],
    );
    this.ball(620, 390, 0, 0, 8, 0x111827);
    this.ball(650, 340, 0, 0, 9, 0x7c3aed);
  }
  private ball(
    x: number,
    y: number,
    vx: number,
    vy: number,
    number: number,
    color: number,
  ) {
    const o = this.track(
      this.ctx.add
        .circle(this.ss.zx(x), this.ss.zy(y), this.ss.s(12), color, 1)
        .setScrollFactor(0)
        .setDepth(D + 6)
        .setStrokeStyle(this.ss.s(2), 0xffffff, 0.5),
    );
    this.balls.push({ x, y, vx, vy, radius: 12, o, number, alive: true });
  }
  private drawAim() {
    const c = this.balls[0];
    if (!c?.alive) return;
    const len = 80 + this.power;
    this.line?.setTo(
      this.ss.zx(c.x),
      this.ss.zy(c.y),
      this.ss.zx(c.x + Math.cos(this.angle) * len),
      this.ss.zy(c.y + Math.sin(this.angle) * len),
    );
  }
  private shoot() {
    if (this.moving || this.ended) return;
    const c = this.balls[0];
    if (!c?.alive) return;
    c.vx = Math.cos(this.angle) * this.power * 6;
    c.vy = Math.sin(this.angle) * this.power * 6;
    this.moving = true;
    this.shots++;
    this.line?.setTo(0, 0, 0, 0);
  }
  private nextRound() {
    if (this.round >= this.rounds) {
      const composition = Math.max(0, 100 - Math.abs(this.phone - 18) * 1.8);
      this.finish(this.sunk >= 2 ? "win" : "lose", {
        sunk: this.sunk,
        shots: this.shots,
        composition: Math.round(composition),
      });
      return;
    }
    this.round++;
    this.rack();
  }
}
export const benPoolShotMode = new BenPoolShotMode();
