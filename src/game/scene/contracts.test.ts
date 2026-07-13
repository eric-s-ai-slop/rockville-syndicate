import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const subsystemContracts = {
  'Actors.ts': 'ActorsContext',
  'Atmosphere.ts': 'AtmosphereContext',
  'AudioController.ts': 'AudioContext',
  'MapBuilder.ts': 'MapBuilderContext',
  'PlayerController.ts': 'PlayerControllerContext',
  'SpriteLoader.ts': 'SpriteLoaderContext',
} as const;

describe('narrow scene subsystem contracts', () => {
  for (const [file, contract] of Object.entries(subsystemContracts)) {
    it(`${file} depends on ${contract}, not the full ChapterScene`, () => {
      const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
      expect(source).toContain(contract);
      expect(source).not.toMatch(/from ['"]\.\.\/ChapterScene['"]/);
    });
  }
});
