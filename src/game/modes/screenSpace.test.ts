import { describe, it, expect } from 'vitest';
import { screenSpace } from './screenSpace';
import type Phaser from 'phaser';

const cam = (zoom: number, width = 800, height = 600, scrollX = 0, scrollY = 0) =>
  ({ zoom, width, height, scrollX, scrollY }) as Phaser.Cameras.Scene2D.Camera;

describe('screenSpace', () => {
  it('handles fractional zoom correctly', () => {
    const { z, zx, zy, s } = screenSpace(cam(0.5));
    expect(z).toBe(0.5);
    // Center is 400, 300.
    // zx(100) = 400 + (100 - 400) / 0.5 = 400 - 600 = -200
    expect(zx(100)).toBe(-200);
    // zy(50) = 300 + (50 - 300) / 0.5 = 300 - 500 = -200
    expect(zy(50)).toBe(-200);
    expect(s(10)).toBe(20);
  });

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
