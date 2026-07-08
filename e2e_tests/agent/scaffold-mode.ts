/**
 * scaffold-mode.ts (H2) — removes every manual step in
 * docs/ADDING_A_MINIGAME.md's "1. Copy the Template Mode" / "3. Register the
 * Mode" sections: copies `_template/`, renames the class/const/id, registers
 * it in `src/game/modes/index.ts`, and adds a placeholder row to
 * `src/game/modes/CLAUDE.md`'s reference table (which `modesDoc.test.ts`
 * guards — it only requires the id to appear in backticks somewhere, so a
 * placeholder row satisfies it; fill in the real "invoked from"/config/kind
 * columns once the mode is wired into a chapter).
 *
 * Usage: npm run agent:scaffold-mode -- <modeId>
 * <modeId> must be camelCase alphanumeric (e.g. `speakerDuel`), matching the
 * codebase's existing mode id convention.
 */
import fs from 'node:fs';
import path from 'node:path';

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function toPascalCase(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function insertAfterLastMatch(source: string, lineRegex: RegExp, newLine: string): string {
  const lines = source.split('\n');
  let lastIndex = -1;
  lines.forEach((line, i) => {
    if (lineRegex.test(line)) lastIndex = i;
  });
  if (lastIndex === -1) throw new Error(`Could not find an anchor line matching ${lineRegex} to insert after`);
  lines.splice(lastIndex + 1, 0, newLine);
  return lines.join('\n');
}

function main() {
  const id = process.argv[2];
  if (!id || !/^[a-z][a-zA-Z0-9]*$/.test(id)) {
    emit({ ok: false, error: 'Usage: npm run agent:scaffold-mode -- <modeId> (camelCase, e.g. speakerDuel)' });
    process.exit(1);
  }

  const modesDir = path.resolve('src/game/modes');
  const templateFile = path.join(modesDir, '_template', 'index.ts');
  const targetDir = path.join(modesDir, id);
  const targetFile = path.join(targetDir, 'index.ts');

  if (fs.existsSync(targetDir)) {
    emit({ ok: false, error: `${targetDir} already exists` });
    process.exit(1);
  }

  const className = `${toPascalCase(id)}Mode`;
  const varName = `${id}Mode`;

  const templateSource = fs.readFileSync(templateFile, 'utf8');
  const rewritten = templateSource
    .replace(/TemplateMode/g, className)
    .replace(/id = 'template'/, `id = '${id}'`)
    .replace(/templateMode/g, varName);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, rewritten);

  // Register in src/game/modes/index.ts: one import line, one registerMode() call.
  const registryPath = path.join(modesDir, 'index.ts');
  let registry = fs.readFileSync(registryPath, 'utf8');
  registry = insertAfterLastMatch(registry, /^import .+ from '\.\/.+';$/, `import { ${varName} } from './${id}';`);
  registry = insertAfterLastMatch(registry, /^registerMode\(.+\);$/, `registerMode(${varName});`);
  fs.writeFileSync(registryPath, registry);

  // Placeholder row in the CLAUDE.md reference table so modesDoc.test.ts's
  // "every registered mode id appears in backticks" guard passes immediately.
  const claudeMdPath = path.join(modesDir, 'CLAUDE.md');
  let claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
  claudeMd = insertAfterLastMatch(
    claudeMd,
    /^\| `[a-zA-Z0-9-]+` \|/,
    `| \`${id}\` | TODO: invoked from | TODO: config | TODO: blocking/background/unwired |`,
  );
  fs.writeFileSync(claudeMdPath, claudeMd);

  emit({
    ok: true,
    modeId: id,
    className,
    varName,
    created: targetFile,
    registered: registryPath,
    docUpdated: claudeMdPath,
    nextSteps: [
      `Implement ${className} in ${targetFile} (preload/start/update/teardown)`,
      'Add a `minigame` beat referencing this modeId in a chapter file, or wire it per docs/ADDING_A_MINIGAME.md',
      `Replace the TODO placeholders in the CLAUDE.md table row for "${id}"`,
      `Playtest with: npm run agent -- --chapter "<any>" "advance; mode ${id}"`,
    ],
  });
}

main();
