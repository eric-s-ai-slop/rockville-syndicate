import { describe, it, expect, vi, afterEach } from 'vitest';
import { isUiMuted } from './uiSound';

describe('isUiMuted', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when localStorage has omega-muted set to "true"', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
      if (key === 'omega-muted') return 'true';
      return null;
    });
    expect(isUiMuted()).toBe(true);
  });

  it('returns false when localStorage has omega-muted set to something else', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
      if (key === 'omega-muted') return 'false';
      return null;
    });
    expect(isUiMuted()).toBe(false);
  });

  it('returns false when localStorage access throws an error (e.g. SecurityError)', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(isUiMuted()).toBe(false);
  });
});
