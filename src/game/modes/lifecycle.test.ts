import { describe, expect, it, vi } from 'vitest';
import { onceModeCompletion } from './lifecycle';

describe('mode lifecycle', () => {
  describe('onceModeCompletion', () => {
    it('invokes the original callback with correct arguments', () => {
      const onComplete = vi.fn();
      const complete = onceModeCompletion(onComplete);
      const result = { outcome: 'win' as const };

      complete(result);

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(result);
    });

    it('resolves a mode at most once and ignores subsequent calls', () => {
      const onComplete = vi.fn();
      const complete = onceModeCompletion(onComplete);

      complete({ outcome: 'win' });
      complete({ outcome: 'lose' });
      complete({ outcome: 'win', nextMode: 'someMode' });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({ outcome: 'win' });
    });

    it('does not crash if called multiple times with different payloads', () => {
      const onComplete = vi.fn();
      const complete = onceModeCompletion(onComplete);

      expect(() => {
        complete({ outcome: 'lose' });
        complete({ outcome: 'win' });
      }).not.toThrow();

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({ outcome: 'lose' });
    });
  });
});
