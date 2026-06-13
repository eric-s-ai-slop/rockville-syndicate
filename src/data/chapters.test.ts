import { describe, it, expect } from 'vitest';
import { CHAPTERS } from './chapters';

describe('chapters data', () => {
  it('should have chapters defined', () => {
    expect(CHAPTERS).toBeDefined();
    expect(CHAPTERS.length).toBeGreaterThan(0);
  });

  it('chapters should have valid properties', () => {
    CHAPTERS.forEach(chapter => {
      expect(chapter).toHaveProperty('id');
      expect(chapter).toHaveProperty('title');
      expect(chapter).toHaveProperty('beats');
    });
  });
});
