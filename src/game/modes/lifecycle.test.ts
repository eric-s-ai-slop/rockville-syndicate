import { describe, expect, it, vi } from 'vitest';
import { onceModeCompletion } from './lifecycle';

describe('mode lifecycle', () => {
  it('resolves a mode at most once', () => {
    const onComplete = vi.fn();
    const complete = onceModeCompletion(onComplete);
    complete({ outcome: 'win' });
    complete({ outcome: 'lose' });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ outcome: 'win' });
  });
});
