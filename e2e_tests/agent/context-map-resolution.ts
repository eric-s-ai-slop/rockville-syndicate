import fs from 'node:fs';
import path from 'node:path';
import type { ContextMapEntry } from './context-map-data';
import { CHAPTERS } from '../../src/data/chapters';
import { extractSymbolRanges, type SymbolRange } from './ast';

export interface RegisteredSource {
  id: string;
  sourceFile: string;
  directory: string;
}

function read(root: string, file: string): string {
  return fs.readFileSync(path.resolve(root, file), 'utf8');
}

function relativeFile(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join('/');
}

function resolveModule(root: string, importer: string, specifier: string): string {
  const base = path.resolve(root, path.dirname(importer), specifier);
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
  const match = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!match) throw new Error(`Unable to resolve registry import ${specifier} from ${importer}`);
  return relativeFile(root, match);
}

function sourceId(root: string, file: string, seen = new Set<string>()): string {
  if (seen.has(file)) throw new Error(`Cyclic registry re-export while resolving ${file}`);
  seen.add(file);
  const content = read(root, file);
  const match = content.match(/^\s*(?:public\s+readonly\s+)?id\s*[:=]\s*['"]([^'"]+)['"]/m);
  if (match) return match[1];
  const reexport = content.match(/export\s+\{[^}]+\}\s+from\s+['"](\.[^'"]+)['"]/);
  if (reexport) return sourceId(root, resolveModule(root, file, reexport[1]), seen);
  throw new Error(`Unable to discover registered id in ${file}`);
}

function resolveEntrypoint(root: string, file: string, seen = new Set<string>()): string {
  if (seen.has(file)) throw new Error(`Cyclic registry re-export while resolving ${file}`);
  seen.add(file);
  const content = read(root, file);
  if (/^\s*(?:public\s+readonly\s+)?id\s*[:=]\s*['"]/m.test(content)) return file;
  const reexport = content.match(/export\s+\{[^}]+\}\s+from\s+['"](\.[^'"]+)['"]/);
  if (reexport) return resolveEntrypoint(root, resolveModule(root, file, reexport[1]), seen);
  return file;
}

function parseDefaultImports(root: string, registryFile: string): Map<string, string> {
  const source = read(root, registryFile);
  const imports = new Map<string, string>();
  for (const match of source.matchAll(/^import\s+(\w+)\s+from\s+['"](\.[^'"]+)['"];?/gm)) {
    imports.set(match[1], resolveModule(root, registryFile, match[2]));
  }
  return imports;
}

function parseNamedImports(root: string, registryFile: string): Map<string, string> {
  const source = read(root, registryFile);
  const imports = new Map<string, string>();
  for (const match of source.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?/gm)) {
    const moduleFile = resolveModule(root, registryFile, match[2]);
    for (const binding of match[1].split(',')) {
      const name = binding.trim().split(/\s+as\s+/)[0];
      if (name && name !== 'type') imports.set(name, moduleFile);
    }
  }
  return imports;
}

function siblingTests(root: string, directory: string): string[] {
  const absolute = path.resolve(root, directory);
  if (!fs.existsSync(absolute)) return [];
  const found: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (/\.test\.tsx?$/.test(entry.name)) found.push(relativeFile(root, child));
    }
  };
  visit(absolute);
  return found.sort();
}

function chapterSources(root: string): RegisteredSource[] {
  const registryFile = 'src/data/chapters/index.ts';
  const source = read(root, registryFile);
  const imports = parseDefaultImports(root, registryFile);
  const array = source.match(/export const (?:ALL_CHAPTERS|CHAPTERS)[\s\S]*?=\s*\[([\s\S]*?)\];/);
  if (!array) throw new Error(`Unable to locate chapter registry in ${registryFile}`);
  const registered = new Set<string>();
  for (const alias of array[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
    if (imports.has(alias[1])) registered.add(alias[1]);
  }
  const aliases = [...registered];
  const imported = aliases.map(alias => {
    const sourceFile = imports.get(alias)!;
    return { id: sourceId(root, sourceFile), sourceFile };
  });
  const byId = new Map(imported.map(entry => [entry.id, entry]));
  const missing = CHAPTERS.filter(chapter => !byId.has(chapter.id)).map(chapter => chapter.id);
  if (missing.length > 0) {
    throw new Error(`CHAPTERS registry/source imports missing: ${missing.join(', ')}`);
  }
  return CHAPTERS.map(chapter => {
    const sourceFile = byId.get(chapter.id)!.sourceFile;
    return { id: chapter.id, sourceFile, directory: path.dirname(sourceFile) };
  });
}

function modeSources(root: string): RegisteredSource[] {
  const registryFile = 'src/game/modes/index.ts';
  const source = read(root, registryFile);
  const imports = parseNamedImports(root, registryFile);
  const found: RegisteredSource[] = [];
  const registrations = /registerMode\(\s*(?:([A-Za-z_$][\w$]*)\s*\)|createExternalGameMode\(\s*\{\s*id:\s*['"]([^'"]+)['"])/g;
  for (const match of source.matchAll(registrations)) {
    const alias = match[1];
    const externalId = match[2];
    const importedFile = imports.get(alias ?? 'createExternalGameMode');
    const sourceFile = importedFile && (alias ? resolveEntrypoint(root, importedFile) : importedFile);
    if (!sourceFile) throw new Error('Unable to resolve createExternalGameMode');
    found.push({ id: externalId ?? sourceId(root, sourceFile), sourceFile, directory: path.dirname(sourceFile) });
  }
  return found;
}

function chapterModeIds(root: string, sourceFile: string): string[] {
  const source = read(root, sourceFile);
  const ids = [...source.matchAll(/\bmodeId:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
  if (/\btype:\s*['"]bossFight['"]/.test(source)) ids.push('bossFight');
  return [...new Set(ids)].sort();
}

function hasChapterAssets(root: string, id: string): boolean {
  return new RegExp(`^\\s*${id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}:`, 'm').test(read(root, 'src/game/assets/chapter/index.ts'));
}

function compactEntry(target: 'chapter' | 'mode', sourceFile: string, relatedFiles: string[], relatedSymbols: string[], id: string, verificationCommands: string[]) {
  return {
    ok: true,
    target,
    id,
    sourceFile,
    relatedFiles: [...new Set(relatedFiles)],
    relatedSymbols,
    verificationCommands,
  };
}

function symbolRanges(sourceFile: string, relatedFiles: string[], symbols: string[]): SymbolRange[] {
  const files = [sourceFile, ...relatedFiles];
  const ranges: SymbolRange[] = [];
  for (const file of [...new Set(files)]) {
    try {
      const found = extractSymbolRanges(file, symbols);
      if (found.length) ranges.push(...found);
    } catch {
      // A related file may be a data/asset file outside the TypeScript project.
    }
  }
  return ranges;
}

export function resolveChapter(root: string, entry: ContextMapEntry, id: string, includeSymbols = false) {
  const registered = chapterSources(root);
  const chapter = registered.find(item => item.id === id);
  if (!chapter) throw new Error(`Unknown chapter "${id}". Valid IDs: ${registered.map(item => item.id).join(', ')}`);
  const relatedFiles = [chapter.sourceFile, 'src/data/chapters/types.ts', 'src/data/chapters/CLAUDE.md', 'src/data/chapters.test.ts', 'e2e_tests/agent/scaffold-chapter.ts'];
  if (hasChapterAssets(root, id)) relatedFiles.push('src/game/assets/chapter/index.ts');
  return {
    ...compactEntry('chapter', chapter.sourceFile, relatedFiles, ['ChapterConfig', 'Beat'], id, [
      `npm run -s agent:validate-chapter -- ${id}`,
      `npm run -s agent:check -- ${chapter.sourceFile}`,
    ]),
    target: 'chapter',
    howTo: entry.howTo,
    referencedModeIds: chapterModeIds(root, chapter.sourceFile),
    ...(includeSymbols ? { symbolRanges: symbolRanges(chapter.sourceFile, relatedFiles, ['ChapterConfig', 'Beat']) } : {}),
  };
}

export function resolveMode(root: string, entry: ContextMapEntry, id: string, includeSymbols = false) {
  const registered = modeSources(root);
  const mode = registered.find(item => item.id === id);
  if (!mode) throw new Error(`Unknown mode "${id}". Valid IDs: ${registered.map(item => item.id).join(', ')}`);
  const tests = siblingTests(root, mode.directory);
  const relatedFiles = [mode.sourceFile, ...tests, 'src/game/modes/types.ts', 'src/contracts/mode-configs.ts', 'src/game/modes/CLAUDE.md'];
  return {
    ...compactEntry('mode', mode.sourceFile, relatedFiles, ['GameMode', 'ModeContext', 'ModeResult', 'ModeConfigMap'], id, [
      `npm run -s agent:check -- ${mode.sourceFile}`,
      ...(tests.length ? [`npm test -- ${tests.join(' ')}`] : []),
    ]),
    target: 'mode',
    howTo: entry.howTo,
    ...(includeSymbols ? { symbolRanges: symbolRanges(mode.sourceFile, relatedFiles, ['GameMode', 'ModeContext', 'ModeResult', 'ModeConfigMap']) } : {}),
  };
}

export function listRegisteredChapters(root: string): string[] {
  return chapterSources(root).map(item => item.id);
}

export function listRegisteredModes(root: string): string[] {
  return modeSources(root).map(item => item.id);
}
