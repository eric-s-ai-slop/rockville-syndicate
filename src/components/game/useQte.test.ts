import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Phaser from 'phaser';
import type { BossConfig } from '../../data/entities';
import { useQte } from './useQte';

const boss: BossConfig = {
  id: 'test',
  name: 'Test Boss',
  title: 'Timer Inspector',
  maxHp: 10,
  combatBarks: [],
  weaknessQTE: {
    question: 'Answer?',
    options: ['No', 'Yes'],
    correctAnswer: 'Yes',
    damage: 7,
  },
  actions: [],
  phaseBarks: {},
};

describe('useQte', () => {
  afterEach(() => vi.useRealTimers());

  it('reports a response once and applies selected damage', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(boss, callback));
    act(() => result.current.respondToQte('Yes'));
    act(() => result.current.respondToQte('Yes'));

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(true, 7);
    expect(result.current.activeQte).toBeNull();
  });

  it('times out once without putting the callback in a state updater', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(boss, callback));
    act(() => vi.advanceTimersByTime(8000));

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(false, 0);
    expect(result.current.activeQte).toBeNull();
    expect(result.current.qteTimer).toBe(0);
  });
  it('selects from qtePool and shuffles options when available', () => {
    const poolBoss: BossConfig = {
      ...boss,
      qtePool: [
        {
          question: 'Pool Q?',
          options: ['A', 'B', 'C'],
          correctAnswer: 'B',
          damage: 15,
        },
      ],
    };

    const callback = vi.fn();
    const { result } = renderHook(() => useQte());

    // The vitest.setup.ts mocks Phaser.Utils.Array.Shuffle to return [].
    // Let's spy on it and make it return the array unmodified just for this test.
    const shuffleSpy = vi.spyOn(Phaser.Utils.Array, 'Shuffle').mockImplementation((arr: any) => arr);

    act(() => result.current.triggerQte(poolBoss, callback));

    expect(result.current.activeQte?.boss.weaknessQTE.question).toBe('Pool Q?');
    expect(result.current.activeQte?.selectedDamage).toBe(15);
    expect(result.current.activeQte?.boss.weaknessQTE.options).toHaveLength(3);
    expect(result.current.activeQte?.boss.weaknessQTE.options).toContain('A');
    expect(result.current.activeQte?.boss.weaknessQTE.options).toContain('B');
    expect(result.current.activeQte?.boss.weaknessQTE.options).toContain('C');

    shuffleSpy.mockRestore();
  });

  it('uses default weaknessQTE damage if qtePool item has no damage', () => {
    const poolBossNoDamage: BossConfig = {
      ...boss,
      qtePool: [
        {
          question: 'Pool Q No Damage?',
          options: ['X', 'Y'],
          correctAnswer: 'X',
        },
      ],
    };

    const callback = vi.fn();
    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(poolBossNoDamage, callback));

    // Falls back to boss.weaknessQTE.damage
    expect(result.current.activeQte?.selectedDamage).toBe(7);
  });

  it('handles falsy selectedQte (fallback to boss.weaknessQTE when qtePool is empty/missing)', () => {
    // If qtePool is provided but returns undefined from Between due to empty array?
    // Actually, useQte logic is `boss.qtePool ? boss.qtePool[...] : boss.weaknessQTE`.
    // If qtePool has 1 element, selectedQte is truthy.
    // If we want selectedQte to be falsy, let's just make qtePool empty so `[Between(0, -1)]` might be undefined.
    const poolBossEmpty: BossConfig = {
      ...boss,
      qtePool: [],
    };

    const callback = vi.fn();
    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(poolBossEmpty, callback));

    // When selectedQte is undefined, it shouldn't crash and should use weaknessQTE damage.
    expect(result.current.activeQte?.boss.weaknessQTE.question).toBe('Answer?');
    expect(result.current.activeQte?.selectedDamage).toBe(7);
  });

  it('bails out of interval callback if current activeQte is null', () => {
    vi.useFakeTimers();
    let intervalCb: Function | undefined;
    const spy = vi.spyOn(window, 'setInterval').mockImplementation((cb) => {
      intervalCb = cb;
      return 123 as any;
    });

    const callback = vi.fn();
    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(boss, callback));

    act(() => result.current.clearQte());

    act(() => {
      if (intervalCb) {
        intervalCb();
      }
    });

    expect(callback).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
