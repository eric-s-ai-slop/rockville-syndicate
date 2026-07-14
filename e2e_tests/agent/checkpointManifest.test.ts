import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkpointManifestPath,
  createCheckpointManifest,
  validateCheckpointManifest,
  writeCheckpointManifest,
} from './checkpointManifest';

function sample(imagePath: string) {
  return createCheckpointManifest({
    checkpointId: 1,
    evidenceClass: 'debug',
    completionEligible: false,
    commandId: null,
    imagePath,
    sourceFramePaths: [],
    chapter: { id: 'fixture', title: 'Fixture' },
    scene: { index: 0, name: 'Fixture scene', key: 'ChapterScene' },
    beat: { index: 1, id: null, type: 'dialogue' },
    player: { x: 10, y: 20 },
    camera: { scrollX: 0, scrollY: 0, zoom: 2, width: 800, height: 600, effectiveViewport: { x: 0, y: 0, width: 400, height: 300 }, followTarget: { kind: 'player', id: null } },
    map: { theme: 'park', noNatureScatter: false, bounds: { x: 0, y: 0, width: 800, height: 600 } },
    mode: null,
    trigger: { reason: 'scene loaded', reasons: ['scene loaded'], transitions: [] },
    settling: { strategy: 'phaser-stable-frames-v1', framesObserved: 5, elapsedMs: 20, timedOut: false },
  });
}

describe('checkpoint manifests', () => {
  it('writes a versioned sidecar next to the image', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-checkpoint-'));
    const imagePath = path.join(dir, 'checkpoint-001.png');
    const manifest = sample(imagePath);
    expect(writeCheckpointManifest(manifest)).toBe(checkpointManifestPath(imagePath));
    expect(JSON.parse(fs.readFileSync(checkpointManifestPath(imagePath), 'utf8'))).toMatchObject({
      schema: 'omega-checkpoint-v1',
      imagePath,
    });
    expect(validateCheckpointManifest(manifest, imagePath)).toEqual([]);
  });

  it('rejects relative image paths and mismatched receipt paths', () => {
    const manifest = sample('/tmp/checkpoint.png');
    expect(validateCheckpointManifest({ ...manifest, imagePath: 'checkpoint.png' })).toContain('imagePath must be absolute');
    expect(validateCheckpointManifest(manifest, '/tmp/other.png')).toContain('imagePath does not match checkpoint receipt');
  });
});
