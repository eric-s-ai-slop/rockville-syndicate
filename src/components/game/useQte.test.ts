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
});
