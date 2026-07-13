import Phaser from 'phaser';
import type { Beat } from '../../data/chapters';
import { BOSSES } from '../../data/entities';
import { getSettings } from '../settings';
import type { ChaseContext } from './contracts';

/** Owns the complete pre-boss chase lifecycle. */
export class ChaseController {
  private sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private pursuerId: string | null = null;
  private _active = false;

  constructor(private readonly scene: ChaseContext) {}

  get active(): boolean { return this._active; }

  start(beat: Extract<Beat, { type: 'chase' }>): void {
    this.reset();
    const config = BOSSES.find((boss) => boss.id === beat.pursuerId) ?? BOSSES[0];
    const cam = this.scene.cameras.main;
    this.pursuerId = config.id.replace('boss_', '');

    this.scene.freeze();
    if (this.scene.cache.audio.exists('boss_sting')) {
      this.scene.sound.play('boss_sting', { volume: 1.2 * getSettings().musicVolume, seek: 0.7 });
    }
    cam.flash(180, 239, 68, 68);
    cam.shake(280, 0.022);

    const runLabel = this.scene.label(cam.width / 2, cam.height / 2 - 40, 'RUN!!', {
      fontSize: '44px', color: '#ef4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(12000).setAlpha(0).setScale(0.4);

    for (const swap of this.scene.chapter.chaseTextureSwaps ?? []) {
      const prop = this.scene.propSprites.get(swap.propKey);
      if (!prop) continue;
      if (this.scene.textures.exists(swap.targetTexture)) prop.setTexture(swap.targetTexture);
      else if (swap.fallbackTexture && this.scene.textures.exists(swap.fallbackTexture)) prop.setTexture(swap.fallbackTexture);
    }

    this.scene.tweens.add({
      targets: runLabel, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(700, () => {
          this.scene.tweens.add({
            targets: runLabel, alpha: 0, y: '-=24', duration: 280,
            onComplete: () => runLabel.destroy(),
          });
        });
      },
    });

    const sheetKey = `boss_${this.pursuerId}_sheet`;
    const rawKey = config.id;
    const [texture, scale] = this.scene.textures.exists(sheetKey)
      ? [sheetKey, 0.85]
      : this.scene.textures.exists(rawKey)
        ? [rawKey, 0.55]
        : ['enemy_grunter', 1.6];

    this.sprite = this.scene.physics.add.sprite(440, 310, texture, 0);
    if (this.scene.textures.exists(sheetKey)) this.sprite.play(`idle_boss_${this.pursuerId}`, true);
    this.sprite.setScale(scale).setCollideWorldBounds(true).setDrag(200, 200);
    this.shadow = this.scene.add.image(440, 338, 'shadow_ellipse').setAlpha(0.4).setScale(1.1);
    this.scene.showBubbleText(this.sprite, '"HEY!!!"', '#ef4444');

    this.scene.physics.add.overlap(this.scene.player, this.sprite, () => {
      if (!this._active) return;
      cam.shake(120, 0.014);
      cam.flash(80, 239, 68, 68);
      this.finish();
    });

    this._active = true;
    this.scene.time.delayedCall(850, () => this.scene.unfreeze());
    this.timer = this.scene.time.delayedCall(beat.durationMs, () => this.finish());
  }

  update(): void {
    if (!this._active || !this.sprite) return;
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.scene.player.x, this.scene.player.y);
    const vx = Math.cos(angle) * 235;
    const vy = Math.sin(angle) * 235;
    this.sprite.setVelocity(vx, vy).setDepth(this.sprite.y);
    this.scene.applyDirectionalAnim(this.sprite, `boss_${this.pursuerId}`, vx, vy, this.pursuerId === 'nick_f');
    this.shadow?.setPosition(this.sprite.x, this.sprite.y + 28).setDepth(this.sprite.y - 1);
  }

  reset(): void {
    this._active = false;
    this.timer?.remove();
    this.timer = null;
    this.sprite?.destroy();
    this.sprite = null;
    this.shadow?.destroy();
    this.shadow = null;
    this.pursuerId = null;
  }

  private finish(): void {
    if (!this._active) return;
    this.reset();
    this.scene.advanceBeat();
  }
}
