import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: { Math: { Angle: { Between: () => 0 } } },
}));

import { ChaseController } from './ChaseController';
import type { ChaseContext } from './contracts';

function chain() {
  const value: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['setOrigin', 'setScrollFactor', 'setDepth', 'setAlpha', 'setScale', 'setTexture', 'setCollideWorldBounds', 'setDrag', 'setPosition', 'setVelocity', 'play']) {
    value[method] = vi.fn(() => value);
  }
  value.destroy = vi.fn();
  Object.assign(value, { x: 440, y: 310 });
  return value;
}

function harness() {
  const sprite = chain();
  const shadow = chain();
  const label = chain();
  const callbacks = new Map<number, () => void>();
  const timers = new Map<number, { remove: ReturnType<typeof vi.fn> }>();
  let overlap: (() => void) | undefined;
  const advanceBeat = vi.fn();
  const applyDirectionalAnim = vi.fn();

  const context = {
    add: { image: vi.fn(() => shadow) },
    cache: { audio: { exists: vi.fn(() => false) } },
    cameras: { main: { width: 1000, height: 700, flash: vi.fn(), shake: vi.fn() } },
    chapter: { chaseTextureSwaps: [] },
    physics: {
      add: {
        sprite: vi.fn(() => sprite),
        overlap: vi.fn((_player, _sprite, callback) => { overlap = callback; }),
      },
    },
    player: { x: 600, y: 310 },
    propSprites: new Map(),
    sound: { play: vi.fn() },
    textures: { exists: vi.fn((key: string) => key === 'boss_ben_sheet') },
    time: {
      delayedCall: vi.fn((delay: number, callback: () => void) => {
        callbacks.set(delay, callback);
        const timer = { remove: vi.fn() };
        timers.set(delay, timer);
        return timer;
      }),
    },
    tweens: { add: vi.fn() },
    advanceBeat,
    applyDirectionalAnim,
    freeze: vi.fn(),
    label: vi.fn(() => label),
    showBubbleText: vi.fn(),
    unfreeze: vi.fn(),
  } as unknown as ChaseContext;

  return { context, sprite, shadow, callbacks, timers, advanceBeat, applyDirectionalAnim, getOverlap: () => overlap };
}

describe('ChaseController', () => {
  it('finishes exactly once when catch and duration callbacks converge', () => {
    const h = harness();
    const controller = new ChaseController(h.context);
    controller.start({ type: 'chase', pursuerId: 'boss_ben_umbc', durationMs: 5000 });

    expect(controller.active).toBe(true);
    h.getOverlap()?.();
    h.callbacks.get(5000)?.();

    expect(h.advanceBeat).toHaveBeenCalledTimes(1);
    expect(controller.active).toBe(false);
    expect(h.sprite.destroy).toHaveBeenCalledOnce();
    expect(h.shadow.destroy).toHaveBeenCalledOnce();
  });

  it('updates pursuit through the narrow scene context', () => {
    const h = harness();
    const controller = new ChaseController(h.context);
    controller.start({ type: 'chase', pursuerId: 'boss_ben_umbc', durationMs: 5000 });
    controller.update();

    expect(h.sprite.setVelocity).toHaveBeenCalledWith(235, 0);
    expect(h.applyDirectionalAnim).toHaveBeenCalledWith(h.sprite, 'boss_ben_umbc', 235, 0, false);
  });

  it('reset tears down without advancing the story', () => {
    const h = harness();
    const controller = new ChaseController(h.context);
    controller.start({ type: 'chase', pursuerId: 'boss_ben_umbc', durationMs: 5000 });
    controller.reset();

    expect(h.timers.get(5000)?.remove).toHaveBeenCalledOnce();
    expect(h.advanceBeat).not.toHaveBeenCalled();
  });
});
