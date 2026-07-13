export type FindingSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type FindingCategory = 'visual' | 'friction' | 'flow' | 'mode' | 'content' | 'audio' | 'performance' | 'other';
export type FindingStatus = 'open' | 'dismissed';

export interface PlaytestFinding {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  location: string;
  reproduction: string;
  expected: string;
  actual: string;
  evidence: string;
  status: FindingStatus;
  timestamp: number;
  dismissedReason?: string;
}

export interface FindingInput {
  severity: string;
  category: string;
  title: string;
  location: string;
  reproduction: string;
  expected: string;
  actual: string;
  evidence: string;
}

const SEVERITIES = new Set<FindingSeverity>(['P0', 'P1', 'P2', 'P3']);
const CATEGORIES = new Set<FindingCategory>([
  'visual', 'friction', 'flow', 'mode', 'content', 'audio', 'performance', 'other',
]);

function normalizeField(name: string, value: string, max: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 3) throw new Error(`${name} must contain at least 3 characters.`);
  if (normalized.length > max) throw new Error(`${name} must not exceed ${max} characters.`);
  return normalized;
}

/** Compact, append-only runtime issue ledger. Dismissals preserve the audit trail. */
export class PlaytestFindingTracker {
  private readonly findings: PlaytestFinding[] = [];

  record(input: FindingInput): { finding: PlaytestFinding; created: boolean } {
    const severity = input.severity.toUpperCase() as FindingSeverity;
    if (!SEVERITIES.has(severity)) throw new Error('severity must be P0, P1, P2, or P3.');
    const category = input.category.toLowerCase() as FindingCategory;
    if (!CATEGORIES.has(category)) {
      throw new Error(`category must be one of: ${[...CATEGORIES].join(', ')}.`);
    }
    const normalized = {
      severity,
      category,
      title: normalizeField('title', input.title, 160),
      location: normalizeField('location', input.location, 240),
      reproduction: normalizeField('reproduction', input.reproduction, 500),
      expected: normalizeField('expected', input.expected, 500),
      actual: normalizeField('actual', input.actual, 500),
      evidence: normalizeField('evidence', input.evidence, 300),
    };
    const duplicate = this.findings.find((finding) =>
      finding.status === 'open' &&
      finding.title === normalized.title &&
      finding.location === normalized.location &&
      finding.evidence === normalized.evidence
    );
    if (duplicate) return { finding: { ...duplicate }, created: false };

    const finding: PlaytestFinding = {
      id: `F${String(this.findings.length + 1).padStart(3, '0')}`,
      ...normalized,
      status: 'open',
      timestamp: Date.now(),
    };
    this.findings.push(finding);
    return { finding: { ...finding }, created: true };
  }

  dismiss(id: string, reason: string): PlaytestFinding {
    const finding = this.findings.find((entry) => entry.id === id.toUpperCase());
    if (!finding) throw new Error(`Unknown finding ${id}; run listfindings for recorded IDs.`);
    if (finding.status === 'dismissed') throw new Error(`Finding ${finding.id} is already dismissed.`);
    finding.status = 'dismissed';
    finding.dismissedReason = normalizeField('dismissal reason', reason, 300);
    return { ...finding };
  }

  summary(): PlaytestFinding[] {
    return this.findings.map((finding) => ({ ...finding }));
  }
}
