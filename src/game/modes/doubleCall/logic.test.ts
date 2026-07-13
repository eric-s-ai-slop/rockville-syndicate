import { describe, it, expect } from 'vitest';
import { nextTypedState, incrementPressCount, nextFakeDigit } from './logic';

describe('doubleCall pure logic', () => {
  describe('nextTypedState (typed-reply matcher)', () => {
    it('advances one character at a time on a correct key', () => {
      let state = nextTypedState('why', '', 'w');
      expect(state).toEqual({ typed: 'w', complete: false, advanced: true });
      state = nextTypedState('why', state.typed, 'h');
      expect(state).toEqual({ typed: 'wh', complete: false, advanced: true });
      state = nextTypedState('why', state.typed, 'y');
      expect(state).toEqual({ typed: 'why', complete: true, advanced: true });
    });

    it('ignores a wrong key and leaves state unchanged', () => {
      const state = nextTypedState('why', 'w', 'q');
      expect(state).toEqual({ typed: 'w', complete: false, advanced: false });
    });

    it('is a no-op once already complete (never fails, never re-completes)', () => {
      const state = nextTypedState('omw', 'omw', 'o');
      expect(state).toEqual({ typed: 'omw', complete: true, advanced: false });
    });

    it('matches the omw grammar the same way', () => {
      let state = nextTypedState('omw', '', 'o');
      state = nextTypedState('omw', state.typed, 'm');
      state = nextTypedState('omw', state.typed, 'w');
      expect(state.complete).toBe(true);
      expect(state.typed).toBe('omw');
    });

    it('is case-sensitive', () => {
      const state = nextTypedState('why', '', 'W');
      expect(state).toEqual({ typed: '', complete: false, advanced: false });
    });

    it('returns complete if typed length is strictly greater than target length', () => {
      const state = nextTypedState('why', 'whyyyy', 'y');
      expect(state).toEqual({ typed: 'whyyyy', complete: true, advanced: false });
    });
  });

  describe('incrementPressCount (Scene 10 unsent rewind counter)', () => {
    it('increments from zero', () => {
      expect(incrementPressCount(0)).toBe(1);
    });

    it('is repeatable forever, never capped or punished', () => {
      let count = 0;
      for (let i = 0; i < 50; i++) count = incrementPressCount(count);
      expect(count).toBe(50);
    });
  });

  describe('nextFakeDigit', () => {
    it('is deterministic for a given index', () => {
      expect(nextFakeDigit(0)).toBe(nextFakeDigit(0));
    });

    it('produces a single digit character', () => {
      for (let i = 0; i < 20; i++) {
        expect(nextFakeDigit(i)).toMatch(/^[0-9]$/);
      }
    });
  });
});
