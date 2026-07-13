import type { PlaytestCoverageSummary } from './playtestCoverage';
import type { PlaytestFinding } from './playtestFindings';
import type { PlaytestProgressSnapshot } from './playtestProgress';

export interface PlaytestSessionSummary {
  cmd: 'session_summary';
  ok: boolean;
  completion_status?: 'verified' | 'incomplete-visual-qa' | 'incomplete-integrity' | 'incomplete-coverage';
  errors: number;
  warnings: number;
  playtest_integrity: 'natural' | 'partially-bypassed';
  bypasses: Array<{ command: string; reason: string; timestamp: number }>;
  audit: Array<{ command: string; note: string; timestamp: number }>;
  chapter?: { id: string; title: string };
  findings?: PlaytestFinding[];
  progress?: PlaytestProgressSnapshot;
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
  coverage: PlaytestCoverageSummary;
}

const EVIDENCE_START = '<!-- omega-playtest-session';
const EVIDENCE_END = 'omega-playtest-session -->';

function evidencePayload(summary: PlaytestSessionSummary): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ok: summary.ok,
    completion_status: summary.completion_status ?? 'incomplete-coverage',
    errors: summary.errors,
    warnings: summary.warnings,
    playtest_integrity: summary.playtest_integrity,
    bypasses: summary.bypasses,
    audit: summary.audit,
    visual_qa: summary.visual_qa,
    coverage: summary.coverage,
  };
  if (summary.chapter) payload.chapter = summary.chapter;
  if (summary.findings) payload.findings = summary.findings;
  if (summary.progress) payload.progress = summary.progress;
  return payload;
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
  if (
    !summary?.visual_qa ||
    !summary.coverage ||
    !Array.isArray(summary.bypasses) ||
    !Array.isArray(summary.audit) ||
    !summary.playtest_integrity
  ) {
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

  const claimsCompleted = /Reached:.*—\s*COMPLETED/im.test(report);
  if (summary.completion_status !== 'verified' && claimsCompleted) {
    errors.push(`Report cannot claim COMPLETED while completion_status is ${summary.completion_status ?? 'missing'}.`);
  }
  if (summary.completion_status === 'verified' && !claimsCompleted) {
    errors.push('A verified session report must explicitly claim COMPLETED in its Reached line.');
  }

  if (
    summary.completion_status === 'verified' &&
    (summary.visual_qa.status !== 'complete' ||
      summary.playtest_integrity !== 'natural' ||
      !summary.coverage.terminalObserved ||
      !summary.ok)
  ) {
    errors.push('Transcript cannot mark a session verified without complete visual QA, natural integrity, terminal observation, and ok:true.');
  }

  if (summary.playtest_integrity !== 'natural' && claimsCompleted) {
    errors.push('A report cannot claim natural completion when the playtest was bypassed.');
  }

  if (!report.includes(`Run integrity: ${summary.playtest_integrity}`)) {
    errors.push(`Report must state "Run integrity: ${summary.playtest_integrity}".`);
  }

  const evidenceStripped = start >= 0 && end >= start
    ? `${report.slice(0, start)}${report.slice(end + EVIDENCE_END.length)}`
    : report;
  const findings = summary.findings ?? [];
  for (const finding of findings.filter((entry) => entry.status === 'open')) {
    if (!evidenceStripped.includes(`### ${finding.id} —`)) {
      errors.push(`Report must include open finding ${finding.id} in its visible Findings section.`);
    }
  }
  for (const review of summary.visual_qa.reviews.filter((entry) => entry.verdict === 'issue-found')) {
    if (!findings.some((finding) => finding.evidence.toLowerCase().includes(`checkpoint:${review.checkpointId}`))) {
      errors.push(`Checkpoint ${review.checkpointId} was marked issue-found but is not linked by any recorded finding evidence.`);
    }
  }
  return errors;
}

export function renderPlaytestReport(summary: PlaytestSessionSummary, transcriptPath: string): string {
  const pending = summary.visual_qa.pending.length > 0 ? summary.visual_qa.pending.join(', ') : 'none';
  const reached = summary.completion_status === 'verified'
    ? 'terminal state — COMPLETED'
    : summary.progress?.story.farthestBeat !== null && summary.progress?.story.farthestBeat !== undefined
      ? `beat ${summary.progress.story.farthestBeat + 1} of ${summary.progress.story.totalBeats} — ${summary.completion_status ?? 'incomplete-coverage'}`
      : `unverified runtime state — ${summary.completion_status ?? 'incomplete-coverage'}`;
  const openFindings = (summary.findings ?? []).filter((finding) => finding.status === 'open');
  const findings = openFindings.length === 0
    ? ['No actionable findings were recorded.']
    : openFindings.flatMap((finding) => [
        `### ${finding.id} — [${finding.severity}] ${finding.title}`,
        '',
        `- Category: ${finding.category}`,
        `- Location: ${finding.location}`,
        `- Reproduction: ${finding.reproduction}`,
        `- Expected: ${finding.expected}`,
        `- Actual: ${finding.actual}`,
        `- Evidence: ${finding.evidence}`,
        '',
      ]);
  const coverage = summary.coverage;
  return [
    `# Playthrough: ${summary.chapter?.title ?? summary.chapter?.id ?? 'Chapter'}`,
    '',
    `Reached: ${reached}`,
    `Pending checkpoints: ${pending}`,
    `Run integrity: ${summary.playtest_integrity}`,
    ...(summary.progress ? [`Overall progress: ${summary.progress.overallPercent}%`] : []),
    '',
    '## Findings',
    '',
    ...findings,
    '## Coverage',
    '',
    ...(summary.progress
      ? [`- Coverage obligations: ${summary.progress.coverage.completed}/${summary.progress.coverage.total}`]
      : []),
    `- Scenes reviewed: ${coverage.scenes.reviewed.length}/${summary.progress?.coverage.breakdown.scenes.total ?? coverage.scenes.checkpointed.length}`,
    `- Choice options exercised: ${coverage.choices.length}`,
    `- Walk objectives observed: ${coverage.walks.length}`,
    `- Mode attempts observed: ${coverage.modes.length}`,
    `- Passive evidence: ${coverage.passive.captured.length} captured, ${coverage.passive.missed.length} missed`,
    `- Terminal observed: ${coverage.terminalObserved ? 'yes' : 'no'}`,
    '',
    `Raw execution trace: \`${transcriptPath}\``,
    '',
    canonicalSessionEvidence(summary),
    '',
  ].join('\n');
}
