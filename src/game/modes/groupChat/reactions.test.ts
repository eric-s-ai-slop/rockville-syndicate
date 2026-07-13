import { describe, it, expect } from 'vitest';
import { GROUP_REACTIONS, ABSORB_REACTIONS, PUSHBACK_ESCALATION } from './reactions';

describe('Group Chat Reactions Configuration', () => {
  it('GROUP_REACTIONS should have valid phases and structure', () => {
    // Verify required phases exist
    expect(GROUP_REACTIONS).toHaveProperty('early');
    expect(GROUP_REACTIONS).toHaveProperty('mid');
    expect(GROUP_REACTIONS).toHaveProperty('late');

    // Verify all keys are strictly standard phases
    const keys = Object.keys(GROUP_REACTIONS);
    expect(keys.length).toBe(3);

    // Validate individual arrays
    Object.values(GROUP_REACTIONS).forEach(reactions => {
      expect(Array.isArray(reactions)).toBe(true);
      reactions.forEach(reaction => {
        expect(reaction).toHaveProperty('speaker');
        expect(reaction).toHaveProperty('text');
        expect(reaction).toHaveProperty('color');

        expect(typeof reaction.speaker).toBe('string');
        expect(typeof reaction.text).toBe('string');
        expect(typeof reaction.color).toBe('string');
        expect(reaction.color).toMatch(/^#[0-9a-fA-F]{6}$/); // basic hex color check
      });
    });
  });

  it('ABSORB_REACTIONS should be a valid array of reactions', () => {
    expect(Array.isArray(ABSORB_REACTIONS)).toBe(true);
    expect(ABSORB_REACTIONS.length).toBeGreaterThan(0);

    ABSORB_REACTIONS.forEach(reaction => {
      expect(reaction).toHaveProperty('speaker');
      expect(reaction).toHaveProperty('text');
      expect(reaction).toHaveProperty('color');

      expect(typeof reaction.speaker).toBe('string');
      expect(typeof reaction.text).toBe('string');
      expect(typeof reaction.color).toBe('string');
      expect(reaction.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('PUSHBACK_ESCALATION should be an array of reaction arrays with the last one empty', () => {
    expect(Array.isArray(PUSHBACK_ESCALATION)).toBe(true);
    expect(PUSHBACK_ESCALATION.length).toBeGreaterThan(0);

    PUSHBACK_ESCALATION.forEach((level, index) => {
      expect(Array.isArray(level)).toBe(true);

      // Last level must be empty (silence)
      if (index === PUSHBACK_ESCALATION.length - 1) {
        expect(level.length).toBe(0);
      } else {
        expect(level.length).toBeGreaterThan(0);
        level.forEach(reaction => {
          expect(reaction).toHaveProperty('speaker');
          expect(reaction).toHaveProperty('text');
          expect(reaction).toHaveProperty('color');

          expect(typeof reaction.speaker).toBe('string');
          expect(typeof reaction.text).toBe('string');
          expect(typeof reaction.color).toBe('string');
          expect(reaction.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
      }
    });
  });
});
