export interface PlaytestSessionSummary {
  cmd: 'session_summary';
  ok: boolean;
  completion_status?: 'verified' | 'incomplete-visual-qa';
  errors: number;
  warnings: number;
  playtest_integrity: 'natural' | 'partially-bypassed';
  bypasses: Array<{ command: string; reason: string; timestamp: number }>;
  audit: Array<{ command: string; note: string; timestamp: number }>;
  visual_qa: {
    status: 'complete' | 'incomplete';
    captured: number;
    reviewed: number;
    pending: number[];
    reviews: Array<{
      checkpointId: number;
      verdict: 'clear' | 'issue-found' | 'inconclusive';
      note: string;
      timestamp: number;
    }>;
    reasons: string[];
  };
}

const EVIDENCE_START = '<!-- omega-playtest-session';
const EVIDENCE_END = 'omega-playtest-session -->';

function evidencePayload(summary: PlaytestSessionSummary): Record<string, unknown> {
  return {
    ok: summary.ok,
    completion_status: summary.completion_status ?? (summary.visual_qa.status === 'complete' ? 'verified' : 'incomplete-visual-qa'),
    errors: summary.errors,
    warnings: summary.warnings,
    playtest_integrity: summary.playtest_integrity,
    bypasses: summary.bypasses,
    audit: summary.audit,
    visual_qa: summary.visual_qa,
  };
}

export function canonicalSessionEvidence(summary: PlaytestSessionSummary): string {
  return `${EVIDENCE_START}\n${JSON.stringify(evidencePayload(summary), null, 2)}\n${EVIDENCE_END}`;
}

export function parseLastSessionSummary(transcript: string): PlaytestSessionSummary {
  const summaries = transcript
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const value = JSON.parse(line) as Partial<PlaytestSessionSummary>;
        return value.cmd === 'session_summary' ? [value] : [];
      } catch {
        return [];
      }
    });
  const summary = summaries.at(-1);
  if (!summary?.visual_qa || !summary.playtest_integrity || !Array.isArray(summary.bypasses) || !Array.isArray(summary.audit)) {
    throw new Error('Transcript does not contain a complete playtest session_summary line.');
  }
  return summary as PlaytestSessionSummary;
}

export function validatePlaytestReport(
  report: string,
  summary: PlaytestSessionSummary,
  transcriptPath: string,
): string[] {
  const errors: string[] = [];
  const start = report.indexOf(EVIDENCE_START);
  const end = report.indexOf(EVIDENCE_END);
  if (start < 0 || end < start) {
    errors.push('Report is missing the canonical omega-playtest-session evidence block.');
  } else {
    const jsonStart = start + EVIDENCE_START.length;
    const raw = report.slice(jsonStart, end).trim();
    try {
      const embedded = JSON.parse(raw);
      if (JSON.stringify(embedded) !== JSON.stringify(evidencePayload(summary))) {
        errors.push('Embedded session evidence does not exactly match the transcript session_summary.');
      }
    } catch (err) {
      errors.push(`Embedded session evidence is invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!report.includes(`Raw execution trace: \`${transcriptPath}\``)) {
    errors.push(`Report must cite the raw execution trace exactly: ${transcriptPath}`);
  }

  const pendingLabel = summary.visual_qa.pending.length > 0
    ? summary.visual_qa.pending.join(', ')
    : 'none';
  if (!report.includes(`Pending checkpoints: ${pendingLabel}`)) {
    errors.push(`Report must state "Pending checkpoints: ${pendingLabel}".`);
  }

  if (summary.visual_qa.status === 'incomplete' && /Reached:.*—\s*COMPLETED/im.test(report)) {
    errors.push('Report cannot claim COMPLETED while visual_qa.status is incomplete.');
  }
  if (summary.visual_qa.status === 'complete' && !/Reached:.*—\s*COMPLETED/im.test(report)) {
    errors.push('A verified session report must explicitly claim COMPLETED in its Reached line.');
  }

  if (!report.includes(`Run integrity: ${summary.playtest_integrity}`)) {
    errors.push(`Report must state "Run integrity: ${summary.playtest_integrity}".`);
  }
  return errors;
}
