/**
 * ast.ts — shared ts-morph helpers for static, browser-free analysis of the
 * game's source: chapter data, the mode registry, and asset imports.
 *
 * Why AST and not regex: C6's original static audit (audit.ts) regex-parsed
 * import statements and object literals, which is brittle against reordering,
 * multi-line formatting, or a new import style. ts-morph gives a real syntax
 * tree so these checks survive routine refactors. Everything here only reads
 * source text — never imports game *engine* code into this Node process
 * (lesson 1): Phaser touches `window` at import time and crashes outside a
 * browser. Chapter *data* (`src/data/chapters`) is safe to import directly and
 * several tools here do; `src/game/modes/**` and `src/game/ChapterScene.ts`
 * are only ever read as text/AST, never imported.
 */
import { Project, SyntaxKind, Node } from 'ts-morph';
import fs from 'node:fs';
import path from 'node:path';

let sharedProject: Project | null = null;

/** Lazily-built, process-wide ts-morph Project over the whole repo tsconfig. */
export function getProject(): Project {
  if (!sharedProject) {
    sharedProject = new Project({
      tsConfigFilePath: path.resolve('tsconfig.json'),
    });
  }
  return sharedProject;
}

export interface SymbolRange {
  file: string;
  symbol: string;
  kind: string;
  startLine: number;
  endLine: number;
}

/**
 * Return exact source ranges for the named declarations an agent should read.
 * The range is intentionally metadata rather than source text: callers can
 * fetch only the relevant slice with `sed`, keeping context-map output small.
 */
export function extractSymbolRanges(filePath: string, symbols: string[]): SymbolRange[] {
  const project = getProject();
  const file = project.getSourceFileOrThrow(filePath);
  const exported = file.getExportedDeclarations();
  const ranges: SymbolRange[] = [];
  for (const symbol of [...new Set(symbols)]) {
    const declarations = exported.get(symbol) ?? [];
    const declaration = declarations[0] ?? file.getVariableDeclaration(symbol) ?? file.getInterface(symbol) ?? file.getTypeAlias(symbol) ?? file.getClass(symbol) ?? file.getFunction(symbol);
    if (!declaration) continue;
    ranges.push({
      file: filePath,
      symbol,
      kind: declaration.getKindName(),
      startLine: declaration.getStartLineNumber(),
      endLine: declaration.getEndLineNumber(),
    });
  }
  return ranges;
}

function literalIdFromClass(cls: import('ts-morph').ClassDeclaration): string | null {
  const prop = cls.getProperty('id');
  if (!prop) return null;
  const initializer = prop.getInitializer();
  if (!initializer || !Node.isStringLiteral(initializer)) return null;
  return initializer.getLiteralValue();
}

function literalIdFromObjectLiteral(obj: Node): string | null {
  if (!Node.isObjectLiteralExpression(obj)) return null;
  const prop = obj.getProperty('id');
  if (!prop || !Node.isPropertyAssignment(prop)) return null;
  const initializer = prop.getInitializer();
  if (!initializer || !Node.isStringLiteral(initializer)) return null;
  return initializer.getLiteralValue();
}

/**
 * Statically extract every registered mode id from `src/game/modes/index.ts`,
 * resolving through both shapes the codebase uses: class-instance modes
 * (`export const fooMode = new FooMode()`, with `id = '...'` as a class
 * field) and object-literal modes (`export const barMode = { id: '...' }`),
 * plus the `createExternalGameMode({ id: '...' })` factory call. This is the
 * B3/C6/H1 "enumerate real mode ids without importing Phaser" requirement.
 */
export function extractRegisteredModeIds(): string[] {
  const project = getProject();
  const indexFile = project.getSourceFileOrThrow('src/game/modes/index.ts');
  const calls = indexFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => c.getExpression().getText() === 'registerMode');

  const ids: string[] = [];
  for (const call of calls) {
    const arg = call.getArguments()[0];
    if (!arg) continue;

    if (Node.isCallExpression(arg)) {
      // registerMode(createExternalGameMode({ id: '...', ... }))
      const objArg = arg.getArguments()[0];
      const id = objArg ? literalIdFromObjectLiteral(objArg) : null;
      if (id) ids.push(id);
      continue;
    }

    if (!Node.isIdentifier(arg)) continue;
    for (const def of arg.getDefinitionNodes()) {
      const varDecl = Node.isVariableDeclaration(def)
        ? def
        : def.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
      const initializer = varDecl?.getInitializer();
      if (!initializer) continue;

      if (Node.isNewExpression(initializer)) {
        const classIdentifier = initializer.getExpression();
        const classDefs = Node.isIdentifier(classIdentifier) ? classIdentifier.getDefinitionNodes() : [];
        for (const classDef of classDefs) {
          const classDecl =
            classDef.asKind(SyntaxKind.ClassDeclaration) ?? classDef.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
          const id = classDecl ? literalIdFromClass(classDecl) : null;
          if (id) ids.push(id);
        }
      } else {
        const id = literalIdFromObjectLiteral(initializer);
        if (id) ids.push(id);
      }
    }
  }
  return [...new Set(ids)];
}

/** All `import x from '...'` module specifiers + resolved absolute paths in a file. */
export function extractImportPaths(filePath: string): { importPath: string; resolvedPath: string | null }[] {
  const project = getProject();
  const file = project.getSourceFileOrThrow(filePath);
  return file.getImportDeclarations().map((decl) => {
    const importPath = decl.getModuleSpecifierValue();
    const resolved = decl.getModuleSpecifierSourceFile();
    return { importPath, resolvedPath: resolved ? resolved.getFilePath().toString() : null };
  });
}

/**
 * Every top-level default import in a file, keyed by local binding name, with
 * the raw module-specifier path and whether it resolves to a real file on
 * disk (import assertions like `?url` stripped before checking). Used by the
 * asset audit (C6) to verify e.g. `import ch1Url from '...mp3?url'` actually
 * points at a file, without regex-parsing the import statement.
 */
export function extractDefaultImportsByName(filePath: string): Record<string, { importPath: string; existsOnDisk: boolean }> {
  const project = getProject();
  const file = project.getSourceFileOrThrow(filePath);
  const out: Record<string, { importPath: string; existsOnDisk: boolean }> = {};
  for (const decl of file.getImportDeclarations()) {
    const defaultImport = decl.getDefaultImport();
    if (!defaultImport) continue;
    const importPath = decl.getModuleSpecifierValue();
    const cleanPath = importPath.replace(/\?url$/, '');
    const absolutePath = path.resolve(path.dirname(filePath), cleanPath);
    out[defaultImport.getText()] = { importPath: cleanPath, existsOnDisk: fs.existsSync(absolutePath) };
  }
  return out;
}

/**
 * A top-level `export const NAME: Record<string, string> = {...}` object
 * literal, read back as a plain object. Values that are string literals are
 * taken verbatim; values that are bare identifiers (e.g. `STAGE_MUSIC_URL`'s
 * `music_ch1: ch1Url`) are returned as the identifier's text so the caller can
 * cross-reference it against {@link extractDefaultImportsByName}.
 */
export function extractStringRecord(filePath: string, exportName: string): Record<string, string> {
  const project = getProject();
  const file = project.getSourceFileOrThrow(filePath);
  const out: Record<string, string> = {};
  const varDecl = file.getVariableDeclaration(exportName);
  const initializer = varDecl?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
  if (!initializer) return out;
  for (const prop of initializer.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const name = prop.getName().replace(/^['"]|['"]$/g, '');
    const init = prop.getInitializer();
    if (!init) continue;
    if (Node.isStringLiteral(init)) out[name] = init.getLiteralValue();
    else if (Node.isIdentifier(init)) out[name] = init.getText();
  }
  return out;
}
