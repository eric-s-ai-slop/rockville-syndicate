/**
 * skillDocSync.test.ts — guards the playtesting instruction surfaces against
 * drifting from the harness (in the spirit of chaptersDoc.test.ts /
 * modesDoc.test.ts, but for docs the playtest agent is REQUIRED to obey).
 *
 * The one unforgivable failure mode this prevents: the harness grows or
 * renames an `advance` status and the skill keeps teaching the old
 * vocabulary, so the next playtest agent meets an exit status its
 * instructions never mention and starts improvising — which is exactly how
 * the original skipbeat-past-the-choice incident happened.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADVANCE_STATUSES } from './beatClassification';

const repoRoot = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(repoRoot, rel), 'utf8');

const SKILL = read('.agents/skills/playtesting/SKILL.md');
const PROMPT = read('.agents/skills/playtesting/prompt.md');
const TOOLKIT = read('docs/AGENT_TOOLKIT.md');

describe('playtesting docs stay in sync with the advance status vocabulary', () => {
  for (const status of ADVANCE_STATUSES) {
    it(`SKILL.md documents advance status "${status}"`, () => {
      expect(SKILL).toContain(`\`${status}\``);
    });
    it(`AGENT_TOOLKIT.md documents advance status "${status}"`, () => {
      expect(TOOLKIT).toContain(`\`${status}\``);
    });
  }

  it('SKILL.md command table covers the commands its own loop prescribes', () => {
    for (const cmd of ['savestate', 'loadstate', 'advance', 'walkto', 'observe', 'skipbeat 1', 'restart']) {
      expect(SKILL).toContain(cmd);
    }
  });

  it('the run-integrity vocabulary matches the CLI session_summary fields', () => {
    for (const doc of [SKILL, PROMPT, TOOLKIT]) {
      expect(doc).toContain('playtest_integrity');
    }
    for (const doc of [SKILL, TOOLKIT]) {
      expect(doc).toContain('partially-bypassed');
      expect(doc).toContain('audit');
    }
  });
});
