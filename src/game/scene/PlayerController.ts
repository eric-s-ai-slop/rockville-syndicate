import Phaser from 'phaser';
import { WEAPONS } from '../../data/entities';
import { getSettings } from '../settings';
import type { PlayerControllerContext } from './contracts';

/**
 * Owns player input → movement → dash → autofire → footstep logic.
 * Follows the same subsystem pattern as AudioController/Actors/BeatEngine —
 * receives a typed scene ref; scene delegates to this rather than keeping
 * 150+ lines of player-controller code inline.
 */
export class PlayerController {
  private scene: PlayerControllerContext;

  // ── Dash state ──────────────────────────────────────────────────────────────
  private _dashCooldown = false;
  private _isDashing = false;
  /** Absolute Phaser time (ms) until which the player is invulnerable. */
  playerInvulnUntil = 0;

  // ── Weapon / animation state ─────────────────────────────────────────────────
  private lastFired = 0;
  private lastMoveAngle = 0;
  /** True while the attack animation is playing (constrains velocity during swing). */
  private _isAttackingAnim = false;

  // ── Footstep timing ──────────────────────────────────────────────────────────
  private lastFootstepTime = 0;

  constructor(scene: PlayerControllerContext) {
    this.scene = scene;
  }

  // ── Accessors for ChapterScene (read-only outside this class) ────────────────

  get isDashing(): boolean { return this._isDashing; }
  get isAttackingAnim(): boolean { return this._isAttackingAnim; }

  /** Call from applyPowerUp(defense_buff) to remove the dash gate. */
  resetDashCooldown(): void { this._dashCooldown = false; }

  /** Cancel the attacking animation flag (called when the player takes damage). */
  cancelAttackAnim(): void { this._isAttackingAnim = false; }

  /** True if the player currently has i-frames (dash or power-up). */
  isInvuln(now: number): boolean { return now < this.playerInvulnUntil; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  reset(): void {
    this._dashCooldown = false;
    this._isDashing = false;
    this.playerInvulnUntil = 0;
    this.lastFired = 0;
    this.lastMoveAngle = 0;
    this._isAttackingAnim = false;
    this.lastFootstepTime = 0;
  }

  // ── Per-frame update (called from ChapterScene.update for the non-frozen path) ─

  /**
   * Handle velocity, animations, dash trigger, footsteps, and auto-fire.
   * @param time   Phaser time.now
   * @param vx     Resolved horizontal velocity (already inverted for controls-flip)
   * @param vy     Resolved vertical velocity
   * @param animId  Animation key for the current player sprite set
   * @param dialogueOpen  True while a dialogue beat is open (suppress dash key)
   * @param gamepadDashJustDown  True the one frame the gamepad's A button was pressed
   */
  update(time: number, vx: number, vy: number, animId: string, dialogueOpen: boolean, gamepadDashJustDown = false): void {
    const { scene } = this;
    const { player, playerClass } = scene;

    if (vx !== 0 || vy !== 0) {
      this.lastMoveAngle = Math.atan2(vy, vx);
    }

    if (!this._isDashing && !this._isAttackingAnim) {
      player.setVelocity(vx, vy);
      scene.applyDirectionalAnim(player, animId, vx, vy, playerClass.id === 'nick_f');
    } else if (this._isAttackingAnim) {
      player.setVelocity(vx, vy);
    }

    if (dialogueOpen) {
      scene.wasdKeys.SPACE.reset();
    } else {
      if (Phaser.Input.Keyboard.JustDown(scene.wasdKeys.SPACE) || gamepadDashJustDown) {
        this.executeDash(vx, vy);
      }
    }

    this.tickFootsteps(time, vx, vy);

    if (scene.isBossActive && !scene.qteActive && scene.spawnedBoss) {
      const nearest = this.findNearestEnemy();
      if (nearest) this.fireWeapon(time, nearest.x, nearest.y);
    }
  }

  // ── Dash ──────────────────────────────────────────────────────────────────────

  private executeDash(vx: number, vy: number): void {
    if (this._dashCooldown || this._isDashing) return;
    const { scene } = this;
    const { player, playerClass } = scene;

    this._isDashing = true;
    this._dashCooldown = true;
    // i-frames last slightly longer than the dash so the exit frame is safe
    this.playerInvulnUntil = scene.time.now + 260;

    const dashFactor = 2.2;
    const dashX = vx === 0 && vy === 0 ? playerClass.speed * dashFactor : vx * dashFactor;
    const dashY = vx === 0 && vy === 0 ? 0 : vy * dashFactor;

    player.setVelocity(dashX, dashY);

    try {
      const shieldFlash = scene.add.sprite(player.x, player.y, 'plasma_shield');
      shieldFlash.setOrigin(0.5).setScale(0.12).setDepth(15).setAlpha(0.7);
      scene.tweens.add({
        targets: shieldFlash,
        scale: 0.55, alpha: 0,
        x: player.x + dashX * 0.12,
        y: player.y + dashY * 0.12,
        duration: 350,
        onComplete: () => shieldFlash.destroy(),
      });
    } catch {}

    for (let i = 0; i < 4; i++) {
      scene.time.delayedCall(i * 60, () => {
        const ghost = scene.add.sprite(player.x, player.y, player.texture.key, player.frame.name);
        ghost.setScale(player.scaleX).setAlpha(0.6 - i * 0.15).setRotation(player.rotation);
        scene.tweens.add({ targets: ghost, alpha: 0, scale: 0.8, duration: 300, onComplete: () => ghost.destroy() });
      });
    }

    scene.time.delayedCall(220, () => { this._isDashing = false; });
    scene.time.delayedCall(1500, () => { this._dashCooldown = false; });
  }

  // ── Footsteps ─────────────────────────────────────────────────────────────────

  private tickFootsteps(time: number, vx: number, vy: number): void {
    const { scene } = this;
    if ((vx === 0 && vy === 0) || time - this.lastFootstepTime <= 250) return;
    if (!scene.textures.exists('particle_dot')) return;
    this.lastFootstepTime = time;

    if (scene.footstepKeys.length) {
      const key = scene.footstepKeys[Math.floor(Math.random() * scene.footstepKeys.length)];
      try { scene.sound.play(key, { volume: 0.12 * getSettings().sfxVolume }); } catch {}
    }
    const puff = scene.add.image(
      scene.player.x + Phaser.Math.Between(-6, 6),
      scene.player.y + 14,
      'particle_dot',
    ).setAlpha(0.5).setScale(0.8).setDepth(scene.player.y - 2).setTint(0xbbaa99);
    scene.tweens.add({ targets: puff, alpha: 0, scale: 1.8, y: puff.y + 8, duration: 320, onComplete: () => puff.destroy() });
  }

  // ── Weapon / auto-fire ────────────────────────────────────────────────────────

  private findNearestEnemy(): { x: number; y: number } | null {
    const { scene } = this;
    let nearest: { x: number; y: number } | null = null;
    let nearestDist = Infinity;
    const candidates = scene.isBossActive && scene.spawnedBoss
      ? [scene.spawnedBoss as Phaser.GameObjects.GameObject]
      : scene.enemies.getChildren();
    candidates.forEach(obj => {
      const go = obj as Phaser.GameObjects.GameObject & { active: boolean; x: number; y: number };
      if (!go.active) return;
      const d = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, go.x, go.y);
      if (d < nearestDist) { nearestDist = d; nearest = { x: go.x, y: go.y }; }
    });
    return nearestDist < 700 ? nearest : null;
  }

  private fireWeapon(time: number, targetX?: number, targetY?: number): void {
    const { scene } = this;
    const { player, playerClass } = scene;
    const weapon = WEAPONS[scene.currentLevelIndex % WEAPONS.length];
    if (time < this.lastFired + weapon.cooldown) return;
    this.lastFired = time;

    this._isAttackingAnim = true;
    player.play('attack_' + playerClass.id, true);
    scene.time.delayedCall(220, () => { this._isAttackingAnim = false; });

    const useCoinSheet = scene.textures.exists('coin_sheet');
    const texKey = useCoinSheet ? 'coin_sheet' : 'bullet';
    const frame = useCoinSheet ? 0 : undefined;
    const projectile = scene.projectiles.create(player.x, player.y, texKey, frame);
    if (!projectile) return;

    projectile.setScale(useCoinSheet ? 0.22 : 0.35).setTint(0xfbbf24).setActive(true).setVisible(true);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    if (body) { body.setGravity(0, 0); body.setAllowGravity(false); }

    const fallbackX = player.x + Math.cos(this.lastMoveAngle);
    const fallbackY = player.y + Math.sin(this.lastMoveAngle);
    const targetAngle = Phaser.Math.Angle.Between(player.x, player.y, targetX ?? fallbackX, targetY ?? fallbackY);
    player.setFlipX(Math.cos(targetAngle) < 0);

    projectile.setVelocity(Math.cos(targetAngle) * 650, Math.sin(targetAngle) * 650);
    projectile.setRotation(targetAngle + Math.PI / 2);

    if (Math.random() < 0.12) {
      scene.showBubbleText(player, weapon.unleashedQuote, '#facc15');
    }

    scene.time.delayedCall(2000, () => { if (projectile?.active) projectile.destroy(); });
  }
}
