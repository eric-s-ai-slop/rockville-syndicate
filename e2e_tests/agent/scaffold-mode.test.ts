import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { addModeConfigContract } from './scaffold-mode';

describe('scaffold-mode typed registration', () => {
  it('adds the import, runtime id, and mapped config entry together', () => {
    const source = fs.readFileSync('src/contracts/mode-configs.ts', 'utf8');
    const result = addModeConfigContract(source, 'testScaffoldMode', 'TestScaffoldModeConfig');

    expect(result).toContain("import type { TestScaffoldModeConfig } from '../game/modes/testScaffoldMode';");
    expect(result).toContain("'testScaffoldMode',");
    expect(result).toContain('testScaffoldMode: TestScaffoldModeConfig;');
  });

  it('rejects a mode id already represented in the typed contract', () => {
    const source = fs.readFileSync('src/contracts/mode-configs.ts', 'utf8');
    expect(() => addModeConfigContract(source, 'doubleCall', 'DoubleCallConfig')).toThrow(/already appears/);
  });

  it('fails before producing partial output when a registration anchor drifts', () => {
    const source = fs.readFileSync('src/contracts/mode-configs.ts', 'utf8');
    const missingIdsAnchor = source.replace('] as const;', '] as const satisfies readonly string[];');
    const missingMapAnchor = source.replace('export type ModeId', 'export type RenamedModeId');

    expect(() => addModeConfigContract(missingIdsAnchor, 'anchorProbe', 'AnchorProbeConfig')).toThrow(/MODE_IDS insertion anchor/);
    expect(() => addModeConfigContract(missingMapAnchor, 'anchorProbe', 'AnchorProbeConfig')).toThrow(/ModeConfigMap insertion anchor/);
  });
});
