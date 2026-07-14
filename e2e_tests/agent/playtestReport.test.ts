import { describe, expect, it } from 'vitest';
import {
  canonicalSessionEvidence,
  parseLastSessionSummary,
  PlaytestSessionSummary,
  renderPlaytestReport,
  validatePlaytestReport,
} from './playtestReport';
import type { PlaytestCoverageSummary } from './playtestCoverage';

const coverage: PlaytestCoverageSummary = {
  scenes: { checkpointed: [0], reviewed: [0] },
  choices: [],
  walks: [],
  modes: [],
  terminalObserved: false,
  passive: { captured: [], missed: [] },
};

const summary: PlaytestSessionSummary = {
  cmd: 'session_summary',
  ok: false,
  completion_status: 'incomplete-visual-qa',
  investigation_verdict: 'inconclusive',
  errors: 0,
  warnings: 0,
  playtest_integrity: 'partially-bypassed',
  bypasses: [{ command: 'winmode', reason: 'blocked mode', timestamp: 1 }],
  audit: [],
  visual_qa: {
    status: 'incomplete',
    captured: 2,
    reviewed: 1,
    pending: [2],
    reviews: [{ checkpointId: 1, verdict: 'clear', note: 'Actors and labels are centered on the balcony.', timestamp: 2 }],
    reasons: ['1 visual checkpoint(s) were not reviewed'],
  },
  coverage,
};

function validReport(): string {
  return [
    'Reached: beat 20 of 30 — BLOCKED: INCOMPLETE VISUAL QA',
    'Pending checkpoints: 2',
    'Investigation verdict: inconclusive',
    'Run integrity: partially-bypassed',
    'Raw execution trace: `qa/test/session.jsonl`',
    canonicalSessionEvidence(summary),
  ].join('\n\n');
}

describe('playtest report verification', () => {
  it('accepts a report whose evidence matches the transcript summary', () => {
    expect(validatePlaytestReport(validReport(), summary, 'qa/test/session.jsonl')).toEqual([]);
  });

  it('rejects dishonest completion and omitted pending checkpoints', () => {
    const report = validReport()
      .replace('BLOCKED: INCOMPLETE VISUAL QA', 'COMPLETED')
      .replace('Pending checkpoints: 2', 'Pending checkpoints: none');
    expect(validatePlaytestReport(report, summary, 'qa/test/session.jsonl')).toEqual(
      expect.arrayContaining([
        'Report must state "Pending checkpoints: 2".',
        'Report cannot claim COMPLETED while completion_status is incomplete-visual-qa.',
        'A report cannot claim natural completion when the playtest was bypassed.',
      ]),
    );
  });

  it('rejects a hand-edited evidence block', () => {
    const report = validReport().replace('"reviewed": 1', '"reviewed": 2');
    expect(validatePlaytestReport(report, summary, 'qa/test/session.jsonl')).toContain(
      'Embedded session evidence does not exactly match the transcript session_summary.',
    );
  });

  it('rejects missing or edited canonical coverage', () => {
    const missing = validReport().replace('"coverage":', '"not_coverage":');
    expect(validatePlaytestReport(missing, summary, 'qa/test/session.jsonl')).toContain(
      'Embedded session evidence does not exactly match the transcript session_summary.',
    );

    const edited = validReport().replace('"terminalObserved": false', '"terminalObserved": true');
    expect(validatePlaytestReport(edited, summary, 'qa/test/session.jsonl')).toContain(
      'Embedded session evidence does not exactly match the transcript session_summary.',
    );
  });

  it('rejects a completed report for a bypassed terminal run', () => {
    const bypassed = {
      ...summary,
      ok: false,
      completion_status: 'incomplete-integrity' as const,
      visual_qa: { ...summary.visual_qa, status: 'complete' as const, reviewed: 2, pending: [], reasons: [] },
      coverage: { ...summary.coverage, terminalObserved: true },
    };
    const report = validReport()
      .replace('BLOCKED: INCOMPLETE VISUAL QA', 'COMPLETED')
      .replace(canonicalSessionEvidence(summary), canonicalSessionEvidence(bypassed))
      .replace('Pending checkpoints: 2', 'Pending checkpoints: none');
    expect(validatePlaytestReport(report, bypassed, 'qa/test/session.jsonl')).toEqual(
      expect.arrayContaining([
        'Report cannot claim COMPLETED while completion_status is incomplete-integrity.',
        'A report cannot claim natural completion when the playtest was bypassed.',
      ]),
    );
  });

  it('reads the final session_summary from a JSONL transcript', () => {
    const transcript = [JSON.stringify({ cmd: 'ready', ok: true }), JSON.stringify(summary)].join('\n');
    expect(parseLastSessionSummary(transcript)).toEqual(summary);
  });

  it('recovers an honest incomplete summary from receipts after a hard crash', () => {
    const transcript = [
      JSON.stringify({ cmd: 'visual_checkpoint', checkpointId: 3, path: 'qa/test/checkpoint-003.png' }),
      JSON.stringify({ cmd: 'recordfinding', ok: true, finding: { id: 'F001', severity: 'P2', category: 'visual', title: 'Clipped label', location: 'scene 0', reproduction: 'Advance to checkpoint 3', expected: 'Label is readable.', actual: 'Label is clipped.', evidence: 'checkpoint:3', status: 'open', timestamp: 4 } }),
      JSON.stringify({ cmd: 'reviewcheckpoint', ok: true, review: { checkpointId: 3, verdict: 'issue-found', note: 'The lower label is clipped by the panel edge.', timestamp: 5 } }),
    ].join('\n');

    expect(parseLastSessionSummary(transcript)).toMatchObject({
      ok: false,
      completion_status: 'incomplete-coverage',
      findings: [{ id: 'F001' }],
      visual_qa: { status: 'complete', captured: 1, reviewed: 1, pending: [] },
      coverage: { terminalObserved: false },
    });
  });

  it('renders recorded findings into a verifier-compatible report', () => {
    const withFinding: PlaytestSessionSummary = {
      ...summary,
      findings: [{
        id: 'F001', severity: 'P2', category: 'visual', title: 'Actor label overlaps the footer',
        location: 'scene 0 beat 4', reproduction: 'advance to the first mode checkpoint',
        expected: 'The label remains above the footer.', actual: 'The label intersects the footer.',
        evidence: 'checkpoint:1, qa/test/checkpoint-001.png', status: 'open', timestamp: 3,
      }],
    };
    const report = renderPlaytestReport(withFinding, 'qa/test/session.jsonl');
    expect(report).toContain('### F001 — [P2] Actor label overlaps the footer');
    expect(validatePlaytestReport(report, withFinding, 'qa/test/session.jsonl')).toEqual([]);
  });

  it('rejects omitted live findings and unlinked issue checkpoints', () => {
    const withFinding: PlaytestSessionSummary = {
      ...summary,
      findings: [{
        id: 'F001', severity: 'P2', category: 'friction', title: 'Walk marker is unclear',
        location: 'scene 0 beat 4', reproduction: 'advance to the walk target',
        expected: 'The marker is visible.', actual: 'The marker blends into the floor.',
        evidence: 'walk-004', status: 'open', timestamp: 3,
      }],
      visual_qa: {
        ...summary.visual_qa,
        reviews: [{ checkpointId: 1, verdict: 'issue-found', note: 'The actor label overlaps the bottom story panel.', timestamp: 2 }],
      },
    };
    const report = validReport().replace(canonicalSessionEvidence(summary), canonicalSessionEvidence(withFinding));
    expect(validatePlaytestReport(report, withFinding, 'qa/test/session.jsonl')).toEqual(expect.arrayContaining([
      'Report must include open finding F001 in its visible Findings section.',
      'Checkpoint 1 was marked issue-found but is not linked by any recorded finding evidence.',
    ]));
  });
});
