import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('selects a QTE from the qtePool when available and falls back to weaknessQTE damage if qtePool QTE has no damage', () => {
    const callback = vi.fn();
    const bossWithPool: BossConfig = {
      ...boss,
      qtePool: [
        {
          question: 'Pool Question?',
          options: ['A', 'B'],
          correctAnswer: 'A',
          // no damage property to test the fallback
        },
      ],
    };

    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(bossWithPool, callback));

    expect(result.current.activeQte?.boss.weaknessQTE.question).toBe('Pool Question?');
    expect(result.current.activeQte?.selectedDamage).toBe(7); // Falls back to weaknessQTE.damage
  });

  it('handles early return in setInterval when activeQteRef.current becomes null', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useQte());

    act(() => result.current.triggerQte(boss, callback));

    // To hit the `if (!current) return` inside the setInterval:
    // The interval is running. If we call clearQte(), activeQte is set to null,
    // and activeQteRef.current is set to null.
    // Since setActiveQte is called, a re-render is queued.
    // If we advance the timer *before* React commits the state update and runs the cleanup,
    // the interval callback will execute with activeQteRef.current === null.

    act(() => {
      // Clear QTE which sets the ref to null immediately, and queues a state update
      result.current.clearQte();

      // Advance timers while still inside the same `act` block so the state update hasn't flushed
      // causing the interval to fire one more time.
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
    expect(result.current.activeQte).toBeNull();
  });

  it('triggers QTE without a selectedQte (null from pool)', () => {
    // To get `selectedQte` falsy in `useQte`, boss.qtePool[i] would need to be null/undefined,
    // OR boss.weaknessQTE would need to be null. But boss.weaknessQTE is required by BossConfig.
    // Let's pass a boss with a qtePool containing undefined/null to test the `if (selectedQte)` branch.
    const callback = vi.fn();
    const bossWithEmptyPool: BossConfig = {
      ...boss,
      qtePool: [undefined as any],
    };

    const { result } = renderHook(() => useQte());
    act(() => result.current.triggerQte(bossWithEmptyPool, callback));

    // Should fallback to weaknessQTE damage since selectedQte is undefined
    expect(result.current.activeQte?.selectedDamage).toBe(7);
  });
});
