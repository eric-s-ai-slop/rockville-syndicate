/**
 * context-map.ts (D5) — a curated, hand-maintained JSON of registration
 * points per domain (`context-map.json`), instead of a general AST dependency
 * mapper: 90% of the value, 10% of the machinery. A narrow AST helper adds
 * declaration ranges only when `--symbols` is requested. Validated by
 * `src/agentContextMap.test.ts` so it can't silently rot — that test fails if
 * a listed file or exported symbol stops existing. Do not turn this into a
 * general dependency graph without measured evidence that the curated map is
 * insufficient.
 *
 * Usage: npm run agent:map -- --target=weapon
 * Add `--symbols` to chapter/mode lookups when exact AST declaration ranges are needed.
 * Run without a target to print the currently supported domains.
 */
import { loadContextMap } from './context-map-data';
import { resolveChapter, resolveMode } from './context-map-resolution';

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function main() {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  const target = arg?.split('=')[1];
  const id = process.argv.find((a) => a.startsWith('--id='))?.split('=').slice(1).join('=');
  const includeSymbols = process.argv.includes('--symbols');
  const map = loadContextMap();

  if (!target) {
    emit({ ok: true, domains: Object.keys(map) });
    return;
  }

  if (!map[target]) {
    emit({ ok: false, error: `Usage: --target=${Object.keys(map).join('|')}` });
    process.exit(1);
  }

  if (id && target === 'chapter') {
    try {
      emit(resolveChapter(process.cwd(), map.chapter, id, includeSymbols));
    } catch (error) {
      emit({ ok: false, error: error instanceof Error ? error.message : String(error) });
      process.exitCode = 1;
    }
    return;
  }
  if (id && target === 'mode') {
    try {
      emit(resolveMode(process.cwd(), map.mode, id, includeSymbols));
    } catch (error) {
      emit({ ok: false, error: error instanceof Error ? error.message : String(error) });
      process.exitCode = 1;
    }
    return;
  }

  emit({ ok: true, target, ...map[target] });
}

main();
