import { loadContextMap } from './context-map-data';
import { listRegisteredChapters, listRegisteredModes, resolveChapter, resolveMode } from './context-map-resolution';
import { CHAPTERS } from '../../src/data/chapters';

/** Machine-readable registry inventory for agents and generated documentation. */
export function buildRegistryReport(includeSymbols = false): { schema: string; chapters: unknown[]; modes: unknown[] } {
  const root = process.cwd();
  const map = loadContextMap();
  const chapters = listRegisteredChapters(root).map(id => {
    const chapter = CHAPTERS.find(item => item.id === id);
    const resolved = resolveChapter(root, map.chapter, id, includeSymbols);
    return { id, title: chapter?.title, sourceFile: resolved.sourceFile, modeIds: resolved.referencedModeIds, ...(includeSymbols ? { symbolRanges: resolved.symbolRanges } : {}) };
  });
  const modes = listRegisteredModes(root).map(id => {
    const resolved = resolveMode(root, map.mode, id, includeSymbols);
    return { id, sourceFile: resolved.sourceFile, tests: resolved.relatedFiles.filter(file => file.endsWith('.test.ts') || file.endsWith('.test.tsx')), ...(includeSymbols ? { symbolRanges: resolved.symbolRanges } : {}) };
  });
  return { schema: 'omega-registry-v1', chapters, modes };
}

function main(): void {
  process.stdout.write(JSON.stringify(buildRegistryReport(process.argv.includes('--symbols'))) + '\n');
}

if (process.argv[1]?.endsWith('registry-report.ts')) main();
