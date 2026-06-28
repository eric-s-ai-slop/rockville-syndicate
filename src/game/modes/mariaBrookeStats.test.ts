import { describe, it, expect, beforeEach } from 'vitest';
import { MariaBrookeStats, mariaBrookeStats } from './mariaBrookeStats';

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

  it('should allow properties to be mutated', () => {
    stats.laughs = 5;
    stats.truthsTyped = 3;
    stats.firstTruthPhase = 'mid';
    stats.lookUps = 10;
    stats.pressureIgnored = 2;
    stats.finalResolve = 1;
    stats.messagesSent = 15;

    expect(stats.laughs).toBe(5);
    expect(stats.truthsTyped).toBe(3);
    expect(stats.firstTruthPhase).toBe('mid');
    expect(stats.lookUps).toBe(10);
    expect(stats.pressureIgnored).toBe(2);
    expect(stats.finalResolve).toBe(1);
    expect(stats.messagesSent).toBe(15);
  });

  it('should reset all properties to their default values when reset() is called', () => {
    // Mutate properties
    stats.laughs = 5;
    stats.truthsTyped = 3;
    stats.firstTruthPhase = 'mid';
    stats.lookUps = 10;
    stats.pressureIgnored = 2;
    stats.finalResolve = 1;
    stats.messagesSent = 15;

    // Call reset
    stats.reset();

    // Verify properties are back to defaults
    expect(stats.laughs).toBe(0);
    expect(stats.truthsTyped).toBe(0);
    expect(stats.firstTruthPhase).toBeNull();
    expect(stats.lookUps).toBe(0);
    expect(stats.pressureIgnored).toBe(0);
    expect(stats.finalResolve).toBe(0);
    expect(stats.messagesSent).toBe(0);
  });
});

describe('mariaBrookeStats singleton', () => {
  it('should export a singleton instance of MariaBrookeStats', () => {
    expect(mariaBrookeStats).toBeInstanceOf(MariaBrookeStats);
  });

  it('should maintain state across usages', () => {
    mariaBrookeStats.laughs = 10;
    expect(mariaBrookeStats.laughs).toBe(10);

    // Cleanup for other tests that might use it
    mariaBrookeStats.reset();
    expect(mariaBrookeStats.laughs).toBe(0);
  });
});
