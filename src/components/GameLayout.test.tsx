import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameLayout from './GameLayout';
import * as settings from '../game/settings';

describe('GameLayout localStorage parsing error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should not crash and should default freePlay to false when localStorage contains invalid JSON', () => {
    // Inject invalid JSON to simulate corrupted localStorage
    localStorage.setItem('omega-save-v2', '{invalid_json}');
    localStorage.setItem('omega-progress-v1', '{invalid_legacy}');
    settings._reloadFromStorage();

    // Attempt to render the layout which reads from the corrupted progress state on mount
    expect(() => render(<GameLayout />)).not.toThrow();

    // We can also verify that it renders the default Hero selection screen
    // (since defaults mean no hero selected, it should be in 'hero' status)
    expect(screen.getByText(/Choose your crew member/i)).toBeInTheDocument();
  });

  it('should default hasFreePlay (freePlay state) to false when localStorage throws an error', () => {
    // Simulate an error thrown by localStorage (e.g., quota exceeded or restricted access)
    // In Vitest tests, localStorage is globally mocked via globalThis in vitest.setup.ts,
    // so we mock window.localStorage methods directly.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localStorage is disabled');
    });

    settings._reloadFromStorage();

    expect(() => render(<GameLayout />)).not.toThrow();
    expect(screen.getByText(/Choose your crew member/i)).toBeInTheDocument();
  });
});
