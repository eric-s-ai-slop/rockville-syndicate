import { describe, expect, it } from 'vitest';
import { findBoundaryViolations } from './boundaries';

describe('architecture boundaries', () => {
  it('keeps content, modes, and UI dependencies directional', () => {
    expect(findBoundaryViolations()).toEqual([]);
  }, 30_000);
});
