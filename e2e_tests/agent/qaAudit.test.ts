import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditQaReport } from './qaAudit';
import { createCheckpointManifest, writeCheckpointManifest } from './checkpointManifest';

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

  it('rejects reviews without captures and inconsistent scene/beat references', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-audit-crossref-'));
    const reportPath = path.join(dir, 'report.md');
    const transcriptPath = path.join(dir, 'session.jsonl');
    fs.writeFileSync(reportPath, `Raw execution trace: \`${transcriptPath}\`\n`);
    fs.writeFileSync(transcriptPath, `${JSON.stringify({ cmd: 'reviewcheckpoint', ok: true, review: { checkpointId: 9, verdict: 'clear', note: 'A concrete visual review note is present here.', timestamp: 1 } })}\n`);
    const result = auditQaReport(reportPath, transcriptPath, true);
    expect(result.errors?.map((entry) => entry.code)).toContain('REVIEW_WITHOUT_CAPTURE');

    const imagePath = path.join(dir, 'checkpoint-001.png');
    fs.writeFileSync(imagePath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    writeCheckpointManifest(createCheckpointManifest({
      checkpointId: 1,
      evidenceClass: 'debug',
      completionEligible: false,
      commandId: null,
      imagePath,
      sourceFramePaths: [],
      chapter: { id: 'fixture', title: 'Fixture' },
      scene: { index: 0, name: 'Scene A', key: 'ChapterScene' },
      beat: { index: 1, id: 'beat-a', type: 'dialogue' },
      player: null,
      camera: null,
      map: { theme: 'park', noNatureScatter: false, bounds: null },
      mode: null,
      trigger: { reason: 'test', reasons: ['test'], transitions: [] },
      settling: { strategy: 'phaser-stable-frames-v1', framesObserved: 1, elapsedMs: 1, timedOut: false },
    }));
    fs.writeFileSync(transcriptPath, `${JSON.stringify({ cmd: 'visual_checkpoint', ok: true, checkpointId: 1, path: imagePath, sceneIndex: 2, sceneName: 'Scene B', beatIndex: 4, beatId: 'beat-b', beatType: 'choice' })}\n`);
    const mismatch = auditQaReport(reportPath, transcriptPath, true);
    expect(mismatch.errors?.map((entry) => entry.code)).toEqual(expect.arrayContaining(['SCENE_NAME_MISMATCH', 'BEAT_INDEX_MISMATCH', 'BEAT_ID_MISMATCH', 'BEAT_TYPE_MISMATCH']));
  });
});
