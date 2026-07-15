import { describe, it, expect } from 'vitest';
import { registerMode, getMode, listModeIds } from './index';
import type { GameMode, ModeContext, ModeResult } from './types';

describe('GameMode registry', () => {
  const mockMode1: GameMode = {
    id: 'test-mode-1',
    start: (_ctx: ModeContext, _config: unknown, _onComplete: (result: ModeResult) => void) => {},
    teardown: () => {}
  };

  const mockMode2: GameMode = {
    id: 'test-mode-2',
    start: (_ctx: ModeContext, _config: unknown, _onComplete: (result: ModeResult) => void) => {},
    teardown: () => {}
  };

  it('should register and retrieve a mode', () => {
    registerMode(mockMode1);
    const retrieved = getMode('test-mode-1');
    expect(retrieved).toBe(mockMode1);
  });

  it('should return undefined for an unknown mode id', () => {
    const retrieved = getMode('non-existent-mode');
    expect(retrieved).toBeUndefined();
  });

  it('should list all registered mode ids', () => {
    registerMode(mockMode1);
    registerMode(mockMode2);
    const ids = listModeIds();

    expect(ids).toContain('test-mode-1');
    expect(ids).toContain('test-mode-2');
  });
});
