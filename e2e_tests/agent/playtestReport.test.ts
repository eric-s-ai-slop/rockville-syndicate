import { describe, expect, it } from 'vitest';
import {
  canonicalSessionEvidence,
  parseLastSessionSummary,
  PlaytestSessionSummary,
  validatePlaytestReport,
} from './playtestReport';

const summary: PlaytestSessionSummary = {
  cmd: 'session_summary',
  ok: false,
  completion_status: 'incomplete-visual-qa',
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
};

function validReport(): string {
  return [
    'Reached: beat 20 of 30 — BLOCKED: INCOMPLETE VISUAL QA',
    'Pending checkpoints: 2',
    'Run integrity: partially-bypassed',
    'Raw execution trace: `agent-artifacts/test/session.jsonl`',
    canonicalSessionEvidence(summary),
  ].join('\n\n');
}

describe('playtest report verification', () => {
  it('accepts a report whose evidence matches the transcript summary', () => {
    expect(validatePlaytestReport(validReport(), summary, 'agent-artifacts/test/session.jsonl')).toEqual([]);
  });

  it('rejects dishonest completion and omitted pending checkpoints', () => {
    const report = validReport()
      .replace('BLOCKED: INCOMPLETE VISUAL QA', 'COMPLETED')
      .replace('Pending checkpoints: 2', 'Pending checkpoints: none');
    expect(validatePlaytestReport(report, summary, 'agent-artifacts/test/session.jsonl')).toEqual(
      expect.arrayContaining([
        'Report must state "Pending checkpoints: 2".',
        'Report cannot claim COMPLETED while visual_qa.status is incomplete.',
      ]),
    );
  });

  it('rejects a hand-edited evidence block', () => {
    const report = validReport().replace('"reviewed": 1', '"reviewed": 2');
    expect(validatePlaytestReport(report, summary, 'agent-artifacts/test/session.jsonl')).toContain(
      'Embedded session evidence does not exactly match the transcript session_summary.',
    );
  });

  it('reads the final session_summary from a JSONL transcript', () => {
    const transcript = [JSON.stringify({ cmd: 'ready', ok: true }), JSON.stringify(summary)].join('\n');
    expect(parseLastSessionSummary(transcript)).toEqual(summary);
  });
});
