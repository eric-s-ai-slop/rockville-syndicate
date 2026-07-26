/**
 * agent-refs.ts — AST-based symbol reference investigator CLI tool.
 */
import { investigateSymbol, type SymbolInvestigationResult } from './ast';

export function parseArgs(args: string[]): { symbolName: string } {
  let symbolName: string | null = null;
  let symbolCount = 0;
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--symbol') {
      symbolCount++;
      const val = args[i + 1];
      if (val === undefined || val.startsWith('--')) {
        throw new Error('Usage error: --symbol requires a non-empty symbol name.\nUsage: npm run agent:refs -- --symbol <symbolName>');
      }
      symbolName = val.trim();
      if (!symbolName) {
        throw new Error('Usage error: --symbol cannot be empty.\nUsage: npm run agent:refs -- --symbol <symbolName>');
      }
      i += 2;
    } else if (arg.startsWith('--symbol=')) {
      symbolCount++;
      const val = arg.slice('--symbol='.length).trim();
      if (!val) {
        throw new Error('Usage error: --symbol cannot be empty.\nUsage: npm run agent:refs -- --symbol <symbolName>');
      }
      symbolName = val;
      i += 1;
    } else {
      throw new Error(`Usage error: unrecognized argument "${arg}".\nUsage: npm run agent:refs -- --symbol <symbolName>`);
    }
  }

  if (symbolCount === 0) {
    throw new Error('Usage error: missing required --symbol <name> argument.\nUsage: npm run agent:refs -- --symbol <symbolName>');
  }
  if (symbolCount > 1) {
    throw new Error('Usage error: multiple --symbol arguments provided.\nUsage: npm run agent:refs -- --symbol <symbolName>');
  }
  if (!symbolName) {
    throw new Error('Usage error: symbol name cannot be empty.');
  }

  return { symbolName };
}

export function formatSymbolInvestigation(res: SymbolInvestigationResult): string {
  const lines: string[] = [];
  lines.push(`Symbol: ${res.symbolName}`);
  lines.push(`Declaration: ${res.declarationFile}:${res.declarationLine}`);
  lines.push(res.declarationExcerpt);
  lines.push('');
  lines.push(`References (${res.references.length}):`);
  if (res.references.length === 0) {
    lines.push('(no references found)');
  } else {
    for (const ref of res.references) {
      lines.push(`${ref.file}:${ref.line}: ${ref.lineText}`);
    }
  }
  return lines.join('\n');
}

export function main(argv: string[] = process.argv.slice(2)): void {
  try {
    const { symbolName } = parseArgs(argv);
    const result = investigateSymbol(symbolName);
    process.stdout.write(`${formatSymbolInvestigation(result)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`agent:refs error: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('agent-refs.ts')) {
  main();
}
