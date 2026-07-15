import Phaser from "phaser";
import type { GameMode, ModeContext, ModeResult } from "../types";
import { screenSpace, type ScreenSpace } from "../screenSpace";

export const BEN_GAME_DEPTH = 9600;

type KeyHandler = (event: KeyboardEvent) => void;

/** Shared lifecycle and presentation primitives; gameplay remains mode-owned. */
export abstract class BenArcadeMode<Config> implements GameMode<Config> {
  abstract id: string;

  protected ctx!: ModeContext;
  protected ss!: ScreenSpace;
  protected ended = false;
  protected objects: Phaser.GameObjects.GameObject[] = [];
  protected timers: Phaser.Time.TimerEvent[] = [];
  private complete: ((result: ModeResult) => void) | null = null;
  private listeners: Array<{ type: "keydown" | "keyup"; handler: KeyHandler }> =
    [];

  harnessForceComplete = (result: ModeResult = { outcome: "win" }): void => {
    this.finish(result.outcome === "lose" ? "lose" : "win", result.data, 0);
  };

  preload(_ctx: ModeContext): void {}

  abstract start(
    ctx: ModeContext,
    config: Config | undefined,
    onComplete: (result: ModeResult) => void,
  ): void;

  protected begin(
    ctx: ModeContext,
    onComplete: (result: ModeResult) => void,
  ): void {
    this.ctx = ctx;
    this.ss = screenSpace(ctx.cameras.main);
    this.complete = onComplete;
    this.ended = false;
    this.objects = [];
    this.timers = [];
    this.listeners = [];
  }

  protected makeBackdrop(
    title: string,
    kicker: string,
    accent = 0xf59e0b,
    background = 0x07111f,
  ): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.track(
      this.ctx.add
        .rectangle(
          this.ss.zx(cx),
          this.ss.zy(cy),
          this.ss.s(cam.width * 2),
          this.ss.s(cam.height * 2),
          background,
          1,
        )
        .setScrollFactor(0)
        .setDepth(BEN_GAME_DEPTH),
    );
    this.track(
      this.ctx.add
        .rectangle(
          this.ss.zx(cx),
          this.ss.zy(cy),
          this.ss.s(cam.width * 0.91),
          this.ss.s(cam.height * 0.82),
          0x0f1b2d,
          1,
        )
        .setScrollFactor(0)
        .setDepth(BEN_GAME_DEPTH + 1)
        .setStrokeStyle(this.ss.s(2), accent, 0.7),
    );
    this.track(
      this.ctx.add
        .rectangle(
          this.ss.zx(cx),
          this.ss.zy(cy - cam.height * 0.32),
          this.ss.s(cam.width * 0.91),
          this.ss.s(58),
          accent,
          0.12,
        )
        .setScrollFactor(0)
        .setDepth(BEN_GAME_DEPTH + 2),
    );
    this.track(
      this.ctx
        .label(
          this.ss.zx(cx - cam.width * 0.42),
          this.ss.zy(cy - cam.height * 0.355),
          kicker,
          {
            fontSize: `${this.ss.s(9)}px`,
            color: "#94a3b8",
            fontStyle: "bold",
            letterSpacing: this.ss.s(2),
          },
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(BEN_GAME_DEPTH + 4),
    );
    this.track(
      this.ctx
        .label(
          this.ss.zx(cx - cam.width * 0.42),
          this.ss.zy(cy - cam.height * 0.31),
          title,
          {
            fontSize: `${this.ss.s(21)}px`,
            color: "#f8fafc",
            fontStyle: "bold",
            stroke: "#020617",
            strokeThickness: this.ss.s(4),
          },
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(BEN_GAME_DEPTH + 4),
    );
    for (let i = 0; i < 9; i++) {
      this.track(
        this.ctx.add
          .rectangle(
            this.ss.zx(cx),
            this.ss.zy(cy - cam.height * 0.23 + i * cam.height * 0.062),
            this.ss.s(cam.width * 0.86),
            this.ss.s(1),
            0xffffff,
            0.025,
          )
          .setScrollFactor(0)
          .setDepth(BEN_GAME_DEPTH + 2),
      );
    }
  }

  protected bind(type: "keydown" | "keyup", handler: KeyHandler): void {
    window.addEventListener(type, handler);
    this.listeners.push({ type, handler });
  }

  protected after(delay: number, callback: () => void): Phaser.Time.TimerEvent {
    const timer = this.ctx.time.delayedCall(delay, callback);
    this.timers.push(timer);
    return timer;
  }

  protected finish(
    outcome: "win" | "lose",
    data: unknown = {},
    delay = 650,
  ): void {
    if (this.ended) return;
    this.ended = true;
    const callback = this.complete;
    if (delay <= 0) callback?.({ outcome, data });
    else this.after(delay, () => callback?.({ outcome, data }));
  }

  protected track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  teardown(): void {
    this.ended = true;
    this.listeners.forEach(({ type, handler }) =>
      window.removeEventListener(type, handler),
    );
    this.listeners = [];
    this.timers.forEach((timer) => timer.remove(false));
    this.timers = [];
    this.objects.forEach((object) => {
      try {
        this.ctx.tweens.killTweensOf(object);
        object.destroy();
      } catch {
        /* scene shutdown */
      }
    });
    this.objects = [];
    this.complete = null;
  }
}
