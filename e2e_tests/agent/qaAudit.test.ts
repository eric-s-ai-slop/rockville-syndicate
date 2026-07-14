import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditQaReport } from './qaAudit';

describe('qa audit', () => {
  it('reports missing reports and transcripts as structured failures', () => {
    const result = auditQaReport('/tmp/omega-report-that-does-not-exist.md', '/tmp/omega-transcript-that-does-not-exist.jsonl');
    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toMatchObject({ code: 'REPORT_NOT_FOUND' });
  });

  it('requires checkpoint artifacts and manifests when a checkpoint receipt exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-audit-'));
    const reportPath = path.join(dir, 'report.md');
    const transcriptPath = path.join(dir, 'session.jsonl');
    fs.writeFileSync(reportPath, `Raw execution trace: \`${transcriptPath}\`\n`);
    fs.writeFileSync(transcriptPath, `${JSON.stringify({ cmd: 'visual_checkpoint', ok: true, checkpointId: 1, path: path.join(dir, 'missing.png') })}\n`);
    const result = auditQaReport(reportPath, transcriptPath);
    expect(result.ok).toBe(false);
    expect(result.errors?.map((entry) => entry.code)).toEqual(expect.arrayContaining(['REPORT_INVALID', 'ARTIFACT_NOT_FOUND', 'MANIFEST_NOT_FOUND']));
  });
});
