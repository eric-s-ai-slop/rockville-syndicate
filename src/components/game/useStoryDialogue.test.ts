import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useStoryDialogue } from './useStoryDialogue';

const payload = {
  speakerName: 'Jacob',
  speakerEmoji: '🧾',
  speakerColor: '#fff',
  lines: ['First', 'Second'],
};

describe('useStoryDialogue', () => {
  it('advances lines and completes a story exactly once', () => {
    const done = vi.fn();
    const { result } = renderHook(() => useStoryDialogue());

    act(() => result.current.showStory(payload, done));
    act(() => result.current.advanceStory());
    expect(result.current.activeStory?.lineIndex).toBe(1);
    expect(done).not.toHaveBeenCalled();

    act(() => result.current.advanceStory());
    act(() => result.current.advanceStory());
    expect(result.current.activeStory).toBeNull();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('waits for and reports a choice on the final line', () => {
    const done = vi.fn();
    const { result } = renderHook(() => useStoryDialogue());
    act(() => result.current.showStory({ ...payload, lines: ['Pick'], choices: [{ text: 'Yes' }] }, done));

    act(() => result.current.advanceStory());
    expect(done).not.toHaveBeenCalled();
    act(() => result.current.chooseStory(0));

    expect(result.current.activeStory).toBeNull();
    expect(done).toHaveBeenCalledWith(0);
  });
});
