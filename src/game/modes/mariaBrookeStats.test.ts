import { describe, it, expect, beforeEach } from 'vitest';
import { MariaBrookeStats } from './mariaBrookeStats';

describe('MariaBrookeStats', () => {
  let stats: MariaBrookeStats;

  beforeEach(() => {
    stats = new MariaBrookeStats();
  });

  it('should initialize with default values', () => {
    expect(stats.laughs).toBe(0);
    expect(stats.truthsTyped).toBe(0);
    expect(stats.firstTruthPhase).toBeNull();
    expect(stats.lookUps).toBe(0);
    expect(stats.pressureIgnored).toBe(0);
    expect(stats.finalResolve).toBe(0);
    expect(stats.messagesSent).toBe(0);
  });

  it('should reset all attributes to default states when reset() is called', () => {
    // Modify attributes
    stats.laughs = 5;
    stats.truthsTyped = 3;
    stats.firstTruthPhase = 'mid';
    stats.lookUps = 10;
    stats.pressureIgnored = 2;
    stats.finalResolve = 1;
    stats.messagesSent = 20;

    // Call reset
    stats.reset();

    // Verify reset to defaults
    expect(stats.laughs).toBe(0);
    expect(stats.truthsTyped).toBe(0);
    expect(stats.firstTruthPhase).toBeNull();
    expect(stats.lookUps).toBe(0);
    expect(stats.pressureIgnored).toBe(0);
    expect(stats.finalResolve).toBe(0);
    expect(stats.messagesSent).toBe(0);
  });
});
