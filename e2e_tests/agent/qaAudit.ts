import fs from 'node:fs';
import path from 'node:path';
import { parseLastSessionSummary, validatePlaytestReport } from './playtestReport';
import { checkpointManifestPath, validateCheckpointManifest } from './checkpointManifest';

export interface QaAuditIssue {
  code: string;
  message: string;
  path?: string;
  checkpointId?: number;
  commandId?: string;
}

export interface QaAuditResult {
  cmd: 'qa-audit';
  ok: boolean;
  report: string;
  transcript: string;
  checkpoints: number;
  findings: number;
  warnings: number;
  errors?: QaAuditIssue[];
  truncated?: { shown: number; total: number };
}

function issue(code: string, message: string, extra: Partial<QaAuditIssue> = {}): QaAuditIssue {
  return { code, message, ...extra };
}

function isPng(filePath: string): boolean {
  try {
    const header = fs.readFileSync(filePath).subarray(0, 8);
    return header.length === 8 && header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  } catch {
    return false;
  }
}

function readJsonLines(transcript: string, errors: QaAuditIssue[]): Record<string, unknown>[] {
  return transcript.split(/\r?\n/).filter(Boolean).flatMap((line, index) => {
    try {
      const parsed = JSON.parse(line);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? [parsed as Record<string, unknown>]
        : (errors.push(issue('INVALID_RECEIPT', `Transcript line ${index + 1} is not a JSON object.`)), []);
    } catch (err) {
      errors.push(issue('INVALID_RECEIPT', `Transcript line ${index + 1} is not valid JSON: ${err instanceof Error ? err.message : String(err)}.`));
      return [];
    }
  });
}

function resolveTranscriptPath(report: string, explicit: string | undefined): string | null {
  if (explicit) return path.resolve(explicit);
  const match = report.match(/Raw execution trace: `([^`]+)`/i);
  if (!match) return null;
  return path.resolve(process.cwd(), match[1]);
}

function artifactPath(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? path.resolve(value) : null;
}

export function auditQaReport(reportPathArg: string, transcriptPathArg?: string, verbose = false): QaAuditResult {
  const reportPath = path.resolve(reportPathArg);
  const errors: QaAuditIssue[] = [];
  const warnings: QaAuditIssue[] = [];
  if (!fs.existsSync(reportPath)) {
    return { cmd: 'qa-audit', ok: false, report: reportPath, transcript: transcriptPathArg ? path.resolve(transcriptPathArg) : '', checkpoints: 0, findings: 0, warnings: 0, errors: [issue('REPORT_NOT_FOUND', `Report does not exist: ${reportPath}`, { path: reportPath })] };
  }

  const report = fs.readFileSync(reportPath, 'utf8');
  const transcriptPath = resolveTranscriptPath(report, transcriptPathArg);
  if (!transcriptPath) {
    errors.push(issue('TRANSCRIPT_NOT_DECLARED', 'Report does not declare a canonical raw execution trace.'));
    return { cmd: 'qa-audit', ok: false, report: reportPath, transcript: '', checkpoints: 0, findings: 0, warnings: 0, errors };
  }
  if (!fs.existsSync(transcriptPath)) {
    errors.push(issue('TRANSCRIPT_NOT_FOUND', `Transcript does not exist: ${transcriptPath}`, { path: transcriptPath }));
    return { cmd: 'qa-audit', ok: false, report: reportPath, transcript: transcriptPath, checkpoints: 0, findings: 0, warnings: 0, errors };
  }

  const transcript = fs.readFileSync(transcriptPath, 'utf8');
  const summary = parseLastSessionSummary(transcript);
  const records = readJsonLines(transcript, errors);
  const reportErrors = validatePlaytestReport(report, summary, path.relative(process.cwd(), transcriptPath));
  errors.push(...reportErrors.map((message) => issue('REPORT_INVALID', message)));
  const diagnosticEvidence = records.some((record) => record.evidenceClass === 'targeted-diagnostic' || record.completionEligible === false && record.cmd === 'session_summary');
  if (diagnosticEvidence && /Reached:.*—\s*COMPLETED/im.test(report)) {
    errors.push(issue('DIAGNOSTIC_COMPLETION_CLAIM', 'A report cannot claim natural completion when its transcript contains targeted-diagnostic evidence.'));
  }

  const accepted = new Set(records.filter((record) => record.status === 'accepted' && typeof record.cmd_id === 'string').map((record) => record.cmd_id as string));
  const completed = new Set(records.filter((record) => (record.status === 'completed' || record.status === 'failed') && typeof record.cmd_id === 'string').map((record) => record.cmd_id as string));
  const checkpoints = records.filter((record) => record.cmd === 'visual_checkpoint' && record.ok === true && Number.isInteger(record.checkpointId));
  const checkpointPaths = new Map<number, string>();
  for (const record of checkpoints) {
    const checkpointId = record.checkpointId as number;
    const imagePath = artifactPath(record.path);
    if (!imagePath) {
      errors.push(issue('CHECKPOINT_PATH_MISSING', `Checkpoint ${checkpointId} has no absolute image path.`, { checkpointId }));
      continue;
    }
    const prior = checkpointPaths.get(checkpointId);
    if (prior && prior !== imagePath) errors.push(issue('CHECKPOINT_CONFLICT', `Checkpoint ${checkpointId} points to conflicting images.`, { checkpointId }));
    checkpointPaths.set(checkpointId, imagePath);
    if (!fs.existsSync(imagePath)) errors.push(issue('ARTIFACT_NOT_FOUND', `Checkpoint image does not exist: ${imagePath}`, { checkpointId, path: imagePath }));
    else if (!isPng(imagePath)) errors.push(issue('MIME_MISMATCH', `Checkpoint image is not a PNG: ${imagePath}`, { checkpointId, path: imagePath }));

    const manifestPath = artifactPath(record.manifestPath) ?? checkpointManifestPath(imagePath);
    if (!fs.existsSync(manifestPath)) {
      errors.push(issue('MANIFEST_NOT_FOUND', `Checkpoint manifest does not exist: ${manifestPath}`, { checkpointId, path: manifestPath }));
      continue;
    }
    let manifest: unknown;
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
    catch (err) {
      errors.push(issue('MANIFEST_INVALID_JSON', `Checkpoint manifest is not valid JSON: ${manifestPath} (${err instanceof Error ? err.message : String(err)}).`, { checkpointId, path: manifestPath }));
      continue;
    }
    for (const message of validateCheckpointManifest(manifest, imagePath)) errors.push(issue('MANIFEST_INVALID', `Checkpoint ${checkpointId}: ${message}`, { checkpointId, path: manifestPath }));
    const typedManifest = manifest as { sourceFramePaths?: unknown[]; commandId?: unknown; scene?: { index?: unknown }; beat?: { index?: unknown }; mode?: { id?: unknown } | null; settling?: { timedOut?: unknown } };
    for (const source of typedManifest.sourceFramePaths ?? []) {
      const sourcePath = artifactPath(source);
      if (!sourcePath || !fs.existsSync(sourcePath)) errors.push(issue('ARTIFACT_NOT_FOUND', `Checkpoint ${checkpointId} source frame does not exist: ${String(source)}`, { checkpointId, path: sourcePath ?? undefined }));
      else if (!isPng(sourcePath)) errors.push(issue('MIME_MISMATCH', `Checkpoint ${checkpointId} source frame is not a PNG: ${sourcePath}`, { checkpointId, path: sourcePath }));
    }
    if (typeof typedManifest.commandId === 'string' && (!accepted.has(typedManifest.commandId) || !completed.has(typedManifest.commandId))) {
      errors.push(issue('COMMAND_RECEIPT_MISSING', `Checkpoint ${checkpointId} references command ${typedManifest.commandId} without accepted and terminal receipts.`, { checkpointId, commandId: typedManifest.commandId }));
    }
    if (record.sceneIndex !== undefined && typedManifest.scene?.index !== record.sceneIndex) errors.push(issue('LOCATION_MISMATCH', `Checkpoint ${checkpointId} scene index differs between receipt and manifest.`, { checkpointId }));
    if (record.mode !== undefined && typedManifest.mode?.id !== record.mode && record.mode !== null) errors.push(issue('LOCATION_MISMATCH', `Checkpoint ${checkpointId} mode differs between receipt and manifest.`, { checkpointId }));
    const review = records.find((entry) => entry.cmd === 'reviewcheckpoint' && (entry.review as { checkpointId?: unknown } | undefined)?.checkpointId === checkpointId);
    if (typedManifest.settling?.timedOut === true && (review?.review as { verdict?: unknown } | undefined)?.verdict === 'clear') {
      errors.push(issue('SETTLING_TIMEOUT_REQUIRES_REVIEW', `Checkpoint ${checkpointId} timed out while settling and cannot be marked clear without conclusive follow-up evidence.`, { checkpointId }));
    }
  }

  const findingCount = records.filter((record) => record.cmd === 'recordfinding' && record.finding && typeof record.finding === 'object').length;
  const total = errors.length;
  const result: QaAuditResult = {
    cmd: 'qa-audit',
    ok: total === 0,
    report: reportPath,
    transcript: transcriptPath,
    checkpoints: checkpoints.length,
    findings: findingCount,
    warnings: warnings.length,
  };
  if (total > 0) {
    const shown = verbose ? errors : errors.slice(0, 20);
    result.errors = shown;
    if (!verbose && total > shown.length) result.truncated = { shown: shown.length, total };
  }
  return result;
}
