import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { selectSafeSaveFile } from './GameAgent';

describe('safe save selection', () => {
  it('selects the newest compatible branch-safe save from a directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-saves-'));
    const unsafe = path.join(dir, 'unsafe.json');
    const safe = path.join(dir, 'safe.json');
    fs.writeFileSync(unsafe, JSON.stringify({ safety: { branchSafe: false, unsafeReasons: ['mode active'] } }));
    fs.writeFileSync(safe, JSON.stringify({ safety: { branchSafe: true, unsafeReasons: [] } }));
    expect(selectSafeSaveFile(dir)).toBe(safe);
  });

  it('rejects directories without a branch-safe save', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-saves-'));
    fs.writeFileSync(path.join(dir, 'unsafe.json'), JSON.stringify({ safety: { branchSafe: false, unsafeReasons: ['mode active'] } }));
    expect(() => selectSafeSaveFile(dir)).toThrow('no branch-safe JSON save');
  });
});
