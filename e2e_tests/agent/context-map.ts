/**
 * context-map.ts (D5) — a curated, hand-maintained JSON of registration
 * points per domain (`context-map.json`), instead of a general AST dependency
 * mapper: 90% of the value, 10% of the machinery. Validated by
 * `src/agentContextMap.test.ts` so it can't silently rot — that test fails if
 * a listed file or exported symbol stops existing. Revisit generating this
 * from the AST if/when C6's audit moves further onto ts-morph (H1).
 *
 * Usage: npm run agent:map -- --target=weapon|boss|mode|chapter
 */
import { loadContextMap } from './context-map-data';

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function main() {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  const target = arg?.split('=')[1];
  const map = loadContextMap();

  if (!target || !map[target]) {
    emit({ ok: false, error: `Usage: --target=${Object.keys(map).join('|')}` });
    process.exit(1);
  }

  emit({ ok: true, target, ...map[target] });
}

main();
