import type { GameMode, ModeContext, ModeResult } from '../types';

export class ClassroomAmbienceMode implements GameMode {
  id = 'classroomAmbience';

  private ctx!: ModeContext;
  private onCompleteCallback!: (result: ModeResult) => void;
  private started = false;
  private timerEvent!: Phaser.Time.TimerEvent;

  private theBoys = ['eric', 'jordan', 'nick_f', 'maharko'];
  private theReactions = ['💀', '😭', 'lmao', 'bruh'];

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, _config: unknown, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    
    // Resolve immediately since it's a background mode
    // It will continue to tick/run until teardown is called by the scene
    this.onCompleteCallback({ outcome: 'win' });

    this.timerEvent = ctx.time.addEvent({
      delay: 4500,
      callback: this.tickAmbience,
      callbackScope: this,
      loop: true
    });

    this.started = true;
  }

  private tickAmbience(): void {
    // 60% chance to do nothing this tick to keep it sparse
    if (Math.random() < 0.6) return;

    // Pick a random boy and reaction
    const boyId = this.theBoys[Math.floor(Math.random() * this.theBoys.length)];
    const reaction = this.theReactions[Math.floor(Math.random() * this.theReactions.length)];

    const sprites = this.ctx.actorSprites[boyId];
    if (sprites && sprites.length > 0) {
      // Find the main sprite, not the shadow
      const target = sprites.find(s => (s as Phaser.GameObjects.Sprite).texture?.key.includes('hero_') || (s as Phaser.GameObjects.Sprite).texture?.key.includes('enemy_')) || sprites[0];
      this.ctx.showBubbleText(target, reaction, '#cbd5e1');
    }
  }

  update(_time: number, _delta: number): void {
    if (!this.started) return;
  }

  teardown(): void {
    this.started = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }
  }
}

export const classroomAmbienceMode = new ClassroomAmbienceMode();
