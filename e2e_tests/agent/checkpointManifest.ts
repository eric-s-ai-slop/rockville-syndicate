import fs from 'node:fs';
import path from 'node:path';

export type CheckpointEvidenceClass = 'natural-playtest' | 'targeted-diagnostic' | 'debug';

export interface CheckpointRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CheckpointManifestV1 {
  schema: 'omega-checkpoint-v1';
  checkpointId: number;
  evidenceClass: CheckpointEvidenceClass;
  completionEligible: boolean;
  commandId: string | null;
  imagePath: string;
  sourceFramePaths: string[];
  capturedAt: string;
  chapter: { id: string; title: string };
  scene: { index: number; name: string; key: string | null };
  beat: { index: number | null; id: string | null; type: string | null };
  player: { x: number; y: number } | null;
  camera: {
    scrollX: number;
    scrollY: number;
    zoom: number;
    width: number;
    height: number;
    effectiveViewport: CheckpointRect;
    followTarget: { kind: 'player' | 'actor' | 'other'; id: string | null } | null;
  } | null;
  map: { theme: string | null; noNatureScatter: boolean; bounds: CheckpointRect | null };
  mode: { id: string; kind: 'foreground' | 'background'; beatIndex: number | null } | null;
  trigger: { reason: string; reasons: string[]; transitions: unknown[] };
  settling: {
    strategy: 'phaser-stable-frames-v1';
    framesObserved: number;
    elapsedMs: number;
    timedOut: boolean;
  };
}

export interface CheckpointManifestInput extends Omit<CheckpointManifestV1, 'schema' | 'capturedAt'> {
  capturedAt?: string;
}

export function createCheckpointManifest(input: CheckpointManifestInput): CheckpointManifestV1 {
  return {
    schema: 'omega-checkpoint-v1',
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    ...input,
  };
}

export function checkpointManifestPath(imagePath: string): string {
  return `${imagePath.replace(/\.[^.]+$/, '')}.json`;
}

export function writeCheckpointManifest(manifest: CheckpointManifestV1): string {
  const filePath = checkpointManifestPath(manifest.imagePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
  return filePath;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateCheckpointManifest(value: unknown, expectedImagePath?: string): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['manifest must be an object'];
  const manifest = value as Partial<CheckpointManifestV1>;
  if (manifest.schema !== 'omega-checkpoint-v1') errors.push('schema must be omega-checkpoint-v1');
  if (!Number.isInteger(manifest.checkpointId) || (manifest.checkpointId ?? 0) < 1) errors.push('checkpointId must be a positive integer');
  if (!['natural-playtest', 'targeted-diagnostic', 'debug'].includes(manifest.evidenceClass ?? '')) errors.push('evidenceClass is invalid');
  if (typeof manifest.completionEligible !== 'boolean') errors.push('completionEligible must be boolean');
  if (manifest.commandId !== null && typeof manifest.commandId !== 'string') errors.push('commandId must be a string or null');
  if (typeof manifest.imagePath !== 'string' || !path.isAbsolute(manifest.imagePath)) errors.push('imagePath must be absolute');
  if (expectedImagePath && path.resolve(manifest.imagePath ?? '') !== path.resolve(expectedImagePath)) errors.push('imagePath does not match checkpoint receipt');
  if (!Array.isArray(manifest.sourceFramePaths) || manifest.sourceFramePaths.some((entry) => typeof entry !== 'string' || !path.isAbsolute(entry))) errors.push('sourceFramePaths must contain absolute paths');
  if (!manifest.chapter || typeof manifest.chapter.id !== 'string' || typeof manifest.chapter.title !== 'string') errors.push('chapter id/title are required');
  if (!manifest.scene || !Number.isInteger(manifest.scene.index) || typeof manifest.scene.name !== 'string' || manifest.scene.name.length === 0) errors.push('scene.index/name are required');
  if (!manifest.beat || (manifest.beat.index !== null && !Number.isInteger(manifest.beat.index)) || (manifest.beat.id !== null && typeof manifest.beat.id !== 'string') || (manifest.beat.type !== null && typeof manifest.beat.type !== 'string')) errors.push('beat index/id/type metadata is invalid');
  if (manifest.camera && (!finite(manifest.camera.scrollX) || !finite(manifest.camera.scrollY) || !finite(manifest.camera.zoom) || !finite(manifest.camera.width) || !finite(manifest.camera.height) || !manifest.camera.effectiveViewport || !finite(manifest.camera.effectiveViewport.x) || !finite(manifest.camera.effectiveViewport.y) || !finite(manifest.camera.effectiveViewport.width) || !finite(manifest.camera.effectiveViewport.height))) errors.push('camera metadata is invalid');
  if (!manifest.map || typeof manifest.map.noNatureScatter !== 'boolean') errors.push('map metadata is invalid');
  if (!manifest.trigger || typeof manifest.trigger.reason !== 'string' || !Array.isArray(manifest.trigger.reasons)) errors.push('trigger metadata is invalid');
  if (!manifest.settling || manifest.settling.strategy !== 'phaser-stable-frames-v1' || !finite(manifest.settling.framesObserved) || !finite(manifest.settling.elapsedMs) || typeof manifest.settling.timedOut !== 'boolean') errors.push('settling metadata is invalid');
  return errors;
}
