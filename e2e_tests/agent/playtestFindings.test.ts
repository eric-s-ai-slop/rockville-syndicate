import { describe, expect, it } from 'vitest';
import { PlaytestFindingTracker } from './playtestFindings';

const input = {
  severity: 'p2',
  category: 'friction',
  title: 'Walk marker is difficult to identify',
  location: 'scene 2 beat 14',
  reproduction: 'advance to walk-control and inspect the objective area',
  expected: 'A visible marker identifies the destination.',
  actual: 'The destination blends into the floor texture.',
  evidence: 'walk-014, qa/test/checkpoint-004.png',
};

describe('PlaytestFindingTracker', () => {
  it('records normalized findings with stable IDs', () => {
    const tracker = new PlaytestFindingTracker();
    expect(tracker.record(input)).toMatchObject({
      created: true,
      finding: { id: 'F001', severity: 'P2', category: 'friction', status: 'open' },
    });
    expect(tracker.record({ ...input, title: 'Mode instructions overlap the footer', evidence: 'checkpoint:5' }))
      .toMatchObject({ finding: { id: 'F002' } });
  });

  it('deduplicates the same open runtime evidence', () => {
    const tracker = new PlaytestFindingTracker();
    tracker.record(input);
    expect(tracker.record(input)).toMatchObject({ created: false, finding: { id: 'F001' } });
    expect(tracker.summary()).toHaveLength(1);
  });

  it('dismisses without deleting the audit trail', () => {
    const tracker = new PlaytestFindingTracker();
    tracker.record(input);
    expect(tracker.dismiss('f001', 'A second capture showed the marker after its fade-in.')).toMatchObject({
      id: 'F001',
      status: 'dismissed',
      dismissedReason: 'A second capture showed the marker after its fade-in.',
    });
    expect(tracker.summary()).toHaveLength(1);
  });

  it('rejects incomplete or unbounded findings', () => {
    const tracker = new PlaytestFindingTracker();
    expect(() => tracker.record({ ...input, severity: 'P4' })).toThrow('severity');
    expect(() => tracker.record({ ...input, category: 'guess' })).toThrow('category');
    expect(() => tracker.record({ ...input, actual: 'x' })).toThrow('actual');
    expect(() => tracker.dismiss('F999', 'Not reproducible on a second attempt.')).toThrow('Unknown finding');
  });
});
