import { describe, expect, it } from 'vitest';
import { getMode, listModeIds } from './index';
import { MODE_IDS } from '../../contracts/mode-configs';

describe('registered mode conformance', () => {
  it('exposes a complete lifecycle for every registered mode', () => {
    const ids = listModeIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      const mode = getMode(id);
      expect(mode?.id).toBe(id);
      expect(typeof mode?.start).toBe('function');
      expect(typeof mode?.teardown).toBe('function');
    }
  });

  it('keeps the runtime registry aligned with the typed config contract', () => {
    expect([...listModeIds()].sort()).toEqual([...MODE_IDS].sort());
  });
});
