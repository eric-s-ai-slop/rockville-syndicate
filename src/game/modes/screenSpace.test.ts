import { describe, it, expect } from 'vitest';
import { screenSpace } from './screenSpace';
import type Phaser from 'phaser';

const cam = (zoom: number, width = 800, height = 600) =>
  ({ zoom, width, height }) as Phaser.Cameras.Scene2D.Camera;

describe('screenSpace', () => {
  it('is the identity at zoom 1', () => {
    const { zx, zy, s } = screenSpace(cam(1));
    expect(zx(123)).toBe(123);
    expect(zy(456)).toBe(456);
    expect(s(14)).toBe(14);
  });

  it('maps intended screen coords so Phaser renders them in place at zoom 2', () => {
    // Phaser renders scrollFactor(0) objects at camCenter + (pos - camCenter) * zoom.
    // zx/zy must invert that: rendering zx(x) should land at x.
    const z = 2;
    const { zx, zy, s } = screenSpace(cam(z));
    const render = (pos: number, center: number) => center + (pos - center) * z;
    expect(render(zx(100), 400)).toBeCloseTo(100);
    expect(render(zy(50), 300)).toBeCloseTo(50);
    // Camera center is a fixed point.
    expect(zx(400)).toBe(400);
    expect(zy(300)).toBe(300);
    // Sizes render at size * zoom, so s() pre-divides.
    expect(s(20) * z).toBeCloseTo(20);
  });

  it('guards against zoom 0', () => {
    const { z } = screenSpace(cam(0));
    expect(z).toBe(1);
  });
});
