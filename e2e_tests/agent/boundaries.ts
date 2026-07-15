/** Static dependency-direction checks for the agent-native architecture. */
import path from 'node:path';
import { getProject } from './ast';

export interface BoundaryViolation {
  file: string;
  imported: string;
  rule: string;
}

const toRepoPath = (filePath: string): string => path.relative(process.cwd(), filePath).split(path.sep).join('/');

export function findBoundaryViolations(): BoundaryViolation[] {
  const project = getProject();
  const violations: BoundaryViolation[] = [];

  for (const file of project.getSourceFiles()) {
    const source = toRepoPath(file.getFilePath());
    if (!source.startsWith('src/') || /\.test\.[tj]sx?$/.test(source)) continue;

    for (const declaration of file.getImportDeclarations()) {
      const importedFile = declaration.getModuleSpecifierSourceFile();
      const imported = importedFile ? toRepoPath(importedFile.getFilePath()) : declaration.getModuleSpecifierValue();

      if (source.startsWith('src/data/') && (
        imported === 'phaser' || imported === 'react' || imported.startsWith('src/game/') || imported.startsWith('src/components/')
      )) {
        violations.push({ file: source, imported, rule: 'content cannot depend on runtime or UI modules' });
      }

      if (source.startsWith('src/game/modes/') && imported === 'src/game/ChapterScene.ts') {
        violations.push({ file: source, imported, rule: 'modes depend on ModeContext/contracts, never ChapterScene' });
      }

      if (source.startsWith('src/components/') && !source.endsWith('GameLayout.tsx') && imported.startsWith('src/game/scene/')) {
        violations.push({ file: source, imported, rule: 'UI components cannot reach into scene internals' });
      }
    }
  }

  return violations;
}

function main(): void {
  const violations = findBoundaryViolations();
  if (violations.length) {
    for (const violation of violations) {
      process.stdout.write(`${violation.file} -> ${violation.imported}: ${violation.rule}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write('boundaries PASS  content/runtime/UI import directions are clean\n');
}

if (process.argv[1]?.endsWith('boundaries.ts')) main();
