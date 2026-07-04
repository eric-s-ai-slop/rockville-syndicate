interface HitStoppable {
  physics: { world: { timeScale: number } };
  tweens: { timeScale: number };
}

/**
 * Briefly slows movement/tweens to sell impact on a heavy hit ("hit stop").
 * Deliberately leaves `scene.time` (and its delayedCall timers, e.g. tint-flash
 * clears) at normal speed — only physics.world and tweens slow down — otherwise
 * a Phaser delayedCall scheduled just before this call would itself run at the
 * slowed rate and stretch out far past its intended duration. Restored via a raw
 * setTimeout for the same reason.
 */
export function hitStop(ctx: HitStoppable, durationMs = 80, scale = 0.05): void {
  ctx.physics.world.timeScale = scale;
  ctx.tweens.timeScale = scale;
  setTimeout(() => {
    ctx.physics.world.timeScale = 1;
    ctx.tweens.timeScale = 1;
  }, durationMs);
}
