/**
 * scaffold-mode.ts (H2) — removes every manual step in
 * docs/ADDING_A_MINIGAME.md's "1. Copy the Template Mode" / "3. Register the
 * Mode" sections: copies `_template/`, renames the class/const/id, registers
 * it in the runtime registry and typed `ModeConfigMap`/`MODE_IDS` contracts,
 * and adds a placeholder row to
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

function repoPath(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
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

export function addModeConfigContract(source: string, id: string, configName: string): string {
  const idLiteral = `'${id}'`;
  const modeIdsAnchor = '\n] as const;';
  const configMapAnchor = '\n}\n\nexport type ModeId';
  if (source.includes(idLiteral)) throw new Error(`Mode id ${id} already appears in src/contracts/mode-configs.ts`);
  if (!source.includes(modeIdsAnchor)) throw new Error('Could not find the MODE_IDS insertion anchor in src/contracts/mode-configs.ts');
  if (!source.includes(configMapAnchor)) throw new Error('Could not find the ModeConfigMap insertion anchor in src/contracts/mode-configs.ts');

  let updated = insertAfterLastMatch(source, /^import type .+;$/, `import type { ${configName} } from '../game/modes/${id}';`);
  updated = updated.replace(modeIdsAnchor, `\n  ${idLiteral},${modeIdsAnchor}`);
  updated = updated.replace(configMapAnchor, `\n  ${id}: ${configName};${configMapAnchor}`);

  if (!updated.includes(`import type { ${configName} } from '../game/modes/${id}';`) ||
      !updated.includes(`  ${idLiteral},`) ||
      !updated.includes(`  ${id}: ${configName};`)) {
    throw new Error(`Mode contract insertion verification failed for ${id}`);
  }
  return updated;
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
  const configName = `${className}Config`;

  const templateSource = fs.readFileSync(templateFile, 'utf8');
  const rewritten = templateSource
    .replace(/TemplateMode/g, className)
    .replace(/id = 'template'/, `id = '${id}'`)
    .replace(/templateMode/g, varName);

  // Prepare every registration edit before writing anything, so a missing
  // anchor cannot leave a half-scaffolded mode behind.
  const registryPath = path.join(modesDir, 'index.ts');
  let registry = fs.readFileSync(registryPath, 'utf8');
  registry = insertAfterLastMatch(registry, /^import .+ from '\.\/.+';$/, `import { ${varName} } from './${id}';`);
  registry = insertAfterLastMatch(registry, /^registerMode\(.+\);$/, `registerMode(${varName});`);

  const contractsPath = path.resolve('src/contracts/mode-configs.ts');
  const contracts = addModeConfigContract(fs.readFileSync(contractsPath, 'utf8'), id, configName);

  // Placeholder row in the CLAUDE.md reference table so modesDoc.test.ts's
  // "every registered mode id appears in backticks" guard passes immediately.
  const claudeMdPath = path.join(modesDir, 'CLAUDE.md');
  let claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
  claudeMd = insertAfterLastMatch(
    claudeMd,
    /^\| `[a-zA-Z0-9-]+` \|/,
    `| \`${id}\` | TODO: invoked from | TODO: config | TODO: blocking/background/unwired |`,
  );

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, rewritten);
  fs.writeFileSync(registryPath, registry);
  fs.writeFileSync(contractsPath, contracts);
  fs.writeFileSync(claudeMdPath, claudeMd);

  const targetRepoPath = repoPath(targetFile);
  const registryRepoPath = repoPath(registryPath);
  const contractsRepoPath = repoPath(contractsPath);
  const docsRepoPath = repoPath(claudeMdPath);

  emit({
    ok: true,
    modeId: id,
    className,
    varName,
    created: targetRepoPath,
    registered: registryRepoPath,
    typedContractUpdated: contractsRepoPath,
    docUpdated: docsRepoPath,
    nextSteps: [
      `Implement ${className} in ${targetRepoPath} (preload/start/update/teardown)`,
      `Define the real fields for ${configName} in ${targetRepoPath}; the typed contract is already registered`,
      'Add a `minigame` beat referencing this modeId in a chapter file, or wire it per docs/ADDING_A_MINIGAME.md',
      `Replace the TODO placeholders in the CLAUDE.md table row for "${id}"`,
      `Playtest with: npm run agent -- --chapter "<any>" "advance; mode ${id}"`,
      `Validate with: npm run agent:check -- ${targetRepoPath} ${contractsRepoPath}`,
    ],
  });
}

if (process.argv[1]?.endsWith('scaffold-mode.ts')) main();
