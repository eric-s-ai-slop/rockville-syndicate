/** Pure data loader for D5's curated context-map.json — no side effects, safe
 *  to import from both the CLI (context-map.ts) and its drift-guard test. */
import fs from 'node:fs';
import path from 'node:path';

export interface ContextMapEntry {
  description: string;
  registrationFile: string;
  registrationSymbol: string;
  relatedFiles: string[];
  relatedSymbols: string[];
  howTo: string;
  verificationCommands: string[];
}

export function loadContextMap(): Record<string, ContextMapEntry> {
  return JSON.parse(fs.readFileSync(path.resolve('e2e_tests/agent/context-map.json'), 'utf8'));
}
