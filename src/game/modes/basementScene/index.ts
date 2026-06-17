import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { Beat } from '../../../data/chapters';

// Drives NPC movement in the UMBC frat basement (scene 0 of the UMBC chapter).
// Runs as a background mode — the BeatEngine advances immediately and this mode
// reacts to dialogue beats via onDialogue for the full duration of the scene.
//
// Two instances fire: one before the boss fight (party movement), one after
// (exit movement). The bossFight beat replaces activeMode, so we re-register
// after it resolves with a second background minigame beat in the chapter config.

export class BasementSceneMode implements GameMode {
  id = 'basementScene';
  private ctx!: ModeContext;

  start(ctx: ModeContext, _config: unknown, _onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    // Background mode — never calls onComplete. Stays active until replaced.
  }

  update(_time: number, _delta: number): void {}

  teardown(): void {
    // Actor sprites are owned by the scene — don't destroy them.
    // Kill any in-flight tweens so a scene transition lands clean.
    const ben = this.getSprite('ben');
    const maharko = this.getSprite('maharko');
    if (ben) this.ctx.tweens.killTweensOf(ben);
    if (maharko) this.ctx.tweens.killTweensOf(maharko);
  }

  onDialogue(beat: Extract<Beat, { type: 'dialogue' }>): void {
    const text = beat.lines.join(' ');

    // ── PRE-BOSS: Ben drifts through the room ─────────────────────────────────
    // Triggered by the narrator beat immediately before "You're next."
    if (text.includes('Ben moved through the room.')) {
      // Intentionally left blank. Ben now moves when he says "You're next."
    }

    // ── PRE-BOSS: Ben's voiced line ───────────────────────────────────────────
    // Plays the baked TTS clip as the "You're next." box appears. Wrapped in
    // try/catch so a missing clip (file not dropped yet) just stays silent.
    if (text.includes("You're next.")) {
      try { this.ctx.sound.play('sfx_ben_youre_next', { volume: 0.7 }); } catch { /* clip not loaded */ }
      this.moveActor('ben', 760, 100, 2400, { flipX: false });
    }

    // ── POST-BOSS: Maharko closes in on Ben ────────────────────────────────────
    // The bossFight beat ends, dropping us back into basementScene.
    // The very next beat is "The frat guys appeared."
    if (text.includes('The frat guys appeared.')) {
      this.ctx.showActor('ben');
      this.moveActor('maharko', 500, 300, 1400, { flipX: false });
      this.moveActor('frat1', 520, 280, 1400, { flipX: true });
      this.moveActor('frat2', 540, 300, 1400, { flipX: true });
      this.moveActor('frat3', 530, 260, 1400, { flipX: true });
    }

    // ── POST-BOSS: Both exit toward the door ──────────────────────────────────
    // "Bro. Come on. / We're leaving right now." — they head for the door (870, 400)
    if (text.includes("We're leaving right now.")) {
      this.moveActor('ben',     760, 390, 1800, { flipX: false });
      this.moveActor('maharko', 760, 420, 2000, { flipX: false });
      this.moveActor('frat1',   780, 400, 2000, { flipX: false });
      this.moveActor('frat2',   790, 420, 2000, { flipX: false });
      this.moveActor('frat3',   800, 380, 2000, { flipX: false });
    }

    // Fade both out once they reach the door, after the move completes
    if (text.includes("Travis Scott didn't play on the drive back.")) {
      const ben = this.getSprite('ben');
      const maharko = this.getSprite('maharko');
      const f1 = this.getSprite('frat1');
      const f2 = this.getSprite('frat2');
      const f3 = this.getSprite('frat3');
      [ben, maharko, f1, f2, f3].forEach(sprite => {
        if (!sprite) return;
        this.ctx.tweens.add({ targets: sprite, alpha: 0, duration: 600, delay: 200 });
      });
      // Also fade nameplates + shadows
      ['ben', 'maharko', 'frat1', 'frat2', 'frat3'].forEach(id => {
        const [, nameplate, shadow] = this.ctx.actorSprites[id] ?? [];
        if (nameplate) this.ctx.tweens.add({ targets: nameplate, alpha: 0, duration: 600, delay: 200 });
        if (shadow)    this.ctx.tweens.add({ targets: shadow,    alpha: 0, duration: 600, delay: 200 });
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getSprite(actorId: string): (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) | undefined {
    const objs = this.ctx.actorSprites[actorId];
    if (!objs?.[0]) return undefined;
    return objs[0] as Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  }

  private moveActor(
    actorId: string,
    tx: number,
    ty: number,
    duration: number,
    opts: { flipX?: boolean } = {},
  ): void {
    const sprite = this.getSprite(actorId);
    if (!sprite) return;

    const [, nameplate, shadow] = this.ctx.actorSprites[actorId];

    if (opts.flipX !== undefined && (sprite as Phaser.GameObjects.Sprite).setFlipX) {
      const sx = (sprite as any).x ?? 0;
      const goingLeft = tx < sx;
      (sprite as Phaser.GameObjects.Sprite).setFlipX(goingLeft);
    }

    this.ctx.tweens.killTweensOf(sprite);
    this.ctx.tweens.add({
      targets: sprite,
      x: tx,
      y: ty,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const s = sprite as any;
        s.setDepth?.(s.y);
        if (nameplate) {
          (nameplate as any).setPosition?.(s.x, s.y - 38);
          (nameplate as any).setDepth?.(s.y + 200);
        }
        if (shadow) {
          (shadow as any).setPosition?.(s.x, s.y + 18);
          (shadow as any).setDepth?.(s.y - 1);
        }
      },
    });
  }
}

export const basementSceneMode = new BasementSceneMode();
export default basementSceneMode;
