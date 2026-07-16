import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ChapterConfig } from '../../src/data/chapters/types';
import { deriveCoverageManifest } from './coverageManifest';
import { PlaytestCoverageTracker } from './playtestCoverage';
import { PlaytestProgressWriter, coverageProgress } from './playtestProgress';

const map = { width: 100, height: 100, backdrop: 0, rects: [], labels: [], playerSpawn: { x: 0, y: 0 } };
const chapter: ChapterConfig = {
  id: 'progress-test', index: 1, deployment: 'development', title: 'Progress Test', subtitle: '', location: '', description: '', kind: 'chapter',
  map, actors: [], scenes: [{ map, actors: [] }, { map, actors: [] }],
  beats: [
    { type: 'choice', speaker: 'narrator', prompt: 'Choose', options: [{ text: 'A' }, { text: 'B' }] },
    { type: 'walkTo', x: 1, y: 1 },
    { type: 'minigame', modeId: 'doubleCall' },
    { type: 'minigame', modeId: 'poolParty', background: true },
    { type: 'endChapter' },
  ],
};

const visualQa = {
  status: 'complete' as const,
  captured: 2,
  reviewed: 2,
  pending: [],
  reviews: [],
  reasons: [],
};

describe('playtest progress', () => {
  function completedCoverage() {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordCheckpoint(1, 0, []);
    tracker.recordCheckpointReview(1);
    tracker.recordCheckpoint(2, 1, []);
    tracker.recordCheckpointReview(2);
    tracker.recordChoice(0, 0, 0, 'A');
    tracker.recordChoice(0, 0, 1, 'B');
    tracker.recordWalk(0, 1, 'walkTo', true);
    tracker.observeMode('foreground', 'doubleCall', 2);
    tracker.recordInput('click');
    tracker.observeMode('background', 'poolParty', 3);
    tracker.recordTerminalObservation();
    return tracker.summary();
  }

  it('computes obligation coverage from the manifest without over-counting', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordChoice(0, 0, 0, 'A');
    tracker.recordChoice(0, 0, 0, 'A');
    tracker.recordWalk(0, 1, 'walkTo', true);
    const progress = coverageProgress(deriveCoverageManifest(chapter), tracker.summary());
    expect(progress).toMatchObject({ completed: 2, total: 8, percent: 25 });
  });

  it('writes human and machine progress atomically and stays below 100 until verified', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-progress-'));
    const tracker = new PlaytestCoverageTracker();
    const writer = new PlaytestProgressWriter(chapter, deriveCoverageManifest(chapter), out);
    const running = writer.update({ currentBeat: 4, coverage: tracker.summary(), visualQa, findings: [] });
    expect(running.overallPercent).toBeLessThan(100);
    const verified = writer.update({ currentBeat: 4, coverage: completedCoverage(), visualQa, findings: [], status: 'verified' });
    expect(verified.overallPercent).toBe(100);
    expect(JSON.parse(fs.readFileSync(path.join(out, 'progress.json'), 'utf8'))).toMatchObject({
      schema: 'omega-playtest-progress-v1', overallPercent: 100,
    });
    expect(fs.readFileSync(path.join(out, 'progress.md'), 'utf8')).toContain('[████████████████████] 100%');
  });

  it('does not call partial branch coverage 100% even when the terminal summary is verified', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-progress-'));
    const writer = new PlaytestProgressWriter(chapter, deriveCoverageManifest(chapter), out);
    const partial = writer.update({
      currentBeat: 4,
      coverage: new PlaytestCoverageTracker().summary(),
      visualQa,
      findings: [],
      status: 'verified',
    });
    expect(partial.overallPercent).toBeLessThan(100);
  });

  it('keeps story and overall progress monotonic across branch restarts', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-progress-'));
    const tracker = new PlaytestCoverageTracker();
    const writer = new PlaytestProgressWriter(chapter, deriveCoverageManifest(chapter), out);
    const first = writer.update({ currentBeat: 3, coverage: tracker.summary(), visualQa, findings: [] });
    const restarted = writer.update({ currentBeat: 0, coverage: tracker.summary(), visualQa, findings: [] });
    expect(restarted.story.farthestBeat).toBe(3);
    expect(restarted.overallPercent).toBeGreaterThanOrEqual(first.overallPercent);
  });
});
