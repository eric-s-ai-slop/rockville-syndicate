import { describe, expect, it } from 'vitest';
import { classifyBeat } from './beatClassification';

describe('classifyBeat', () => {
  it('keeps timer-driven chase/wait/move beats passive', () => {
    expect(classifyBeat('chase')).toBe('passive');
    expect(classifyBeat('wait')).toBe('passive');
    expect(classifyBeat('moveActor')).toBe('passive');
  });

  it('distinguishes foreground and background minigames', () => {
    expect(classifyBeat('minigame')).toBe('blocking-mode');
    expect(classifyBeat('minigame', { background: true })).toBe('passive');
  });
});
