import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  updateSettings,
  saveSettings,
  getProgress,
  saveProgressData,
  subscribeSettings,
  effectiveMusicVolume,
  effectiveSfxVolume,
  DEFAULT_SETTINGS,
  _reloadFromStorage,
  saveRunRecord,
  getChapterBest,
  getRunRecords,
} from './settings';
import type { RunRecord } from './scoring';

const SAVE_KEY = 'omega-save-v2';

beforeEach(() => {
  // Fresh default cache for every test (also writes a v2 blob). Migration tests
  // below call localStorage.clear() again before seeding legacy keys, since a
  // present v2 blob would otherwise shadow the legacy values.
  localStorage.clear();
  _reloadFromStorage();
});

describe('migration from legacy v1 keys', () => {
  it('migrates muted, colorblind, and textscale into the v2 blob', () => {
    localStorage.clear(); // drop the v2 blob written by beforeEach so legacy keys win
    localStorage.setItem('omega-muted', 'true');
    localStorage.setItem('omega-colorblind', 'true');
    localStorage.setItem('omega-textscale', '1.5');
    _reloadFromStorage();

    const s = getSettings();
    expect(s.muted).toBe(true);
    expect(s.colorBlind).toBe(true);
    expect(s.textScale).toBe(1.5);
  });

  it('migrates progress (completedChapters, hero, freePlay, rose_silence) with no data loss', () => {
    localStorage.clear();
    localStorage.setItem(
      'omega-progress-v1',
      JSON.stringify({
        completedChapters: ['chapter1', 'chapter2'],
        hero: 'eric',
        freePlay: true,
        rose_silence: true,
      }),
    );
    _reloadFromStorage();

    const p = getProgress();
    expect(p.completedChapters).toEqual(['chapter1', 'chapter2']);
    expect(p.hero).toBe('eric');
    expect(p.freePlay).toBe(true);
    expect(p.rose_silence).toBe(true);
  });

  it('writes the v2 blob after migrating so it only migrates once', () => {
    localStorage.clear();
    localStorage.setItem('omega-muted', 'true');
    _reloadFromStorage();
    expect(localStorage.getItem(SAVE_KEY)).toBeTruthy();

    // Mutating the legacy key afterward must NOT change the now-canonical v2 value.
    localStorage.setItem('omega-muted', 'false');
    _reloadFromStorage();
    expect(getSettings().muted).toBe(true);
  });

  it('falls back to defaults when no legacy keys exist', () => {
    _reloadFromStorage();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(getProgress().completedChapters).toEqual([]);
  });
});

describe('saveRunRecord', () => {
  const mockRecord = (score: number, chapterId = 'test-chapter'): RunRecord => ({
    chapterId,
    heroId: 'test-hero',
    score,
    shardsCollected: 0,
    ledgerTotal: 0,
    hpRemaining: 100,
    difficulty: 'normal',
    date: new Date().toISOString(),
  });

  it('saves a run record and updates chapter best', () => {
    const newBest = saveRunRecord(mockRecord(500));
    expect(newBest).toBe(500);

    const records = getRunRecords();
    expect(records).toHaveLength(1);
    expect(records[0].score).toBe(500);

    expect(getChapterBest('test-chapter')).toBe(500);
  });

  it('maintains the highest score as chapter best', () => {
    saveRunRecord(mockRecord(500));
    expect(getChapterBest('test-chapter')).toBe(500);

    // Lower score does not overwrite
    const best1 = saveRunRecord(mockRecord(400));
    expect(best1).toBe(500);
    expect(getChapterBest('test-chapter')).toBe(500);

    // Higher score overwrites
    const best2 = saveRunRecord(mockRecord(600));
    expect(best2).toBe(600);
    expect(getChapterBest('test-chapter')).toBe(600);

    const records = getRunRecords();
    expect(records).toHaveLength(3);
    expect(records[0].score).toBe(600); // newest first
    expect(records[1].score).toBe(400);
    expect(records[2].score).toBe(500);
  });

  it('caps run records at 100 entries', () => {
    for (let i = 0; i < 105; i++) {
      saveRunRecord(mockRecord(i, 'spam-chapter'));
    }

    const records = getRunRecords();
    expect(records).toHaveLength(100);
    // Because it unshifts new records, the newest 100 should be i=104 down to i=5
    expect(records[0].score).toBe(104);
    expect(records[99].score).toBe(5);
  });
});

describe('corruption guard', () => {
  it('returns defaults (no throw) when the v2 blob is unparseable', () => {
    localStorage.setItem(SAVE_KEY, '{not valid json');
    expect(() => _reloadFromStorage()).not.toThrow();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('overwrites the corrupt blob with a clean default save', () => {
    localStorage.setItem(SAVE_KEY, 'garbage');
    _reloadFromStorage();
    const reparsed = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(reparsed.version).toBe(2);
    expect(reparsed.settings.muted).toBe(false);
  });

  it('sanitizes out-of-range / wrong-type values from a partial blob', () => {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 2, settings: { masterVolume: 9, difficulty: 'lol', textScale: 3 }, progress: {} }),
    );
    _reloadFromStorage();
    const s = getSettings();
    expect(s.masterVolume).toBe(1); // clamped to 0..1
    expect(s.difficulty).toBe('normal'); // invalid → default
    expect(s.textScale).toBe(1); // invalid → default
  });
});

describe('updateSettings / saveSettings', () => {
  it('patches a subset and preserves the rest', () => {
    updateSettings({ difficulty: 'hard' });
    expect(getSettings().difficulty).toBe('hard');
    expect(getSettings().muted).toBe(false); // untouched

    updateSettings({ muted: true });
    expect(getSettings().difficulty).toBe('hard'); // preserved across patches
    expect(getSettings().muted).toBe(true);
  });

  it('persists changes across a reload', () => {
    saveSettings({ ...DEFAULT_SETTINGS, sfxVolume: 0.5, difficulty: 'easy' });
    _reloadFromStorage();
    expect(getSettings().sfxVolume).toBe(0.5);
    expect(getSettings().difficulty).toBe('easy');
  });
});

describe('subscribe', () => {
  it('notifies subscribers on change and stops after unsubscribe', () => {
    let hits = 0;
    const unsub = subscribeSettings(() => { hits++; });
    updateSettings({ muted: true });
    expect(hits).toBe(1);
    unsub();
    updateSettings({ muted: false });
    expect(hits).toBe(1);
  });
});

describe('effective volumes', () => {
  it('folds master * channel, and zeroes out when muted', () => {
    saveSettings({ ...DEFAULT_SETTINGS, masterVolume: 0.5, musicVolume: 0.5, sfxVolume: 0.8 });
    expect(effectiveMusicVolume()).toBeCloseTo(0.25);
    expect(effectiveSfxVolume()).toBeCloseTo(0.4);

    updateSettings({ muted: true });
    expect(effectiveMusicVolume()).toBe(0);
    expect(effectiveSfxVolume()).toBe(0);
  });
});

describe('progress round-trip', () => {
  it('saveProgressData persists and getProgress reads back', () => {
    saveProgressData({ completedChapters: ['chapter1'], hero: 'lucy', rose_silence: true });
    _reloadFromStorage();
    const p = getProgress();
    expect(p.completedChapters).toEqual(['chapter1']);
    expect(p.hero).toBe('lucy');
    expect(p.rose_silence).toBe(true);
  });
});
