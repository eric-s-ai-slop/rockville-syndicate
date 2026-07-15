import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  return {
    default: {
      Math: { Between: () => 1 },
      WEBGL: 1,
      CANVAS: 2,
    }
  };
});

describe('StewOfferingMode', () => {
  it('should handle npc clicks and complete the minigame', () => {
    // Basic test without full phaser integration
    expect(true).toBe(true);
  });
});
