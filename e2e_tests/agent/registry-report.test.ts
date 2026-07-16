import { describe, expect, it } from 'vitest';
import { listRegisteredChapters, listRegisteredModes } from './context-map-resolution';
import { buildRegistryReport } from './registry-report';

describe('registry report inputs', () => {
  it('discovers non-empty chapter and mode registries', () => {
    expect(listRegisteredChapters(process.cwd()).length).toBeGreaterThan(10);
    expect(listRegisteredModes(process.cwd()).length).toBeGreaterThan(5);
  });

  it('keeps the default inventory compact and reserves AST ranges for opt-in output', () => {
    const report = buildRegistryReport();
    const json = JSON.stringify(report);
    expect(json).not.toContain('symbolRanges');
    expect(json.length).toBeLessThan(5600);
    expect(JSON.stringify(buildRegistryReport(true))).toContain('symbolRanges');
  }, 30_000);
});
