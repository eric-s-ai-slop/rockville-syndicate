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
    for (const cmd of ['savestate', 'loadstate', 'advance', 'walkto', 'observe', 'reviewcheckpoint', 'skipbeat 1', 'restart']) {
      expect(SKILL).toContain(cmd);
    }
    expect(SKILL).toContain('`walkTarget` is an internal state field, not a protocol command');
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

  it('all playtest artifacts share the report directory on canonical repo-relative paths', () => {
    for (const doc of [SKILL, PROMPT]) {
      expect(doc).toContain('--out "qa/<chapter-id>"');
      expect(doc).toContain('--transcript "qa/<chapter-id>/session.jsonl"');
      expect(doc).toContain('qa/<chapter-id>/report.md');
      expect(doc).toContain('agent:verify-report -- qa/<chapter-id>/report.md qa/<chapter-id>/session.jsonl');
      expect(doc).not.toMatch(/--out\s+"\//);
      expect(doc).not.toContain('agent-artifacts/<chapter-id>');
    }
  });

  it('the reusable prompt distinguishes permitted bypass commands from blocked mutations', () => {
    expect(PROMPT).toContain('There is no command named `_bypass` or `bypass`');
    expect(PROMPT).toContain('exactly `skipbeat 1` for a proven stuck non-mode beat and `winmode`/`losemode`');
    expect(PROMPT).toContain('never chain `skipbeat 1` through a minigame');
    expect(PROMPT).toContain('quote the exact command and error');
  });

  it('the reusable prompt requires checkpoint receipts and complete visual QA', () => {
    expect(PROMPT).toContain('reviewcheckpoint <id> clear|issue-found|inconclusive <observation-note>');
    expect(PROMPT).toContain('Every verdict, including `clear`, requires a concrete note');
    expect(PROMPT).toContain('`visual_qa.pending` must be empty');
    expect(PROMPT).toContain('one newline-terminated JSONL command at a time');
    expect(PROMPT).toContain('The CLI blocks progression while checkpoints are pending');
    expect(PROMPT).toContain('`quit`/EOF fails closed and exits nonzero');
  });

  it('all playtesting instruction surfaces require fail-closed report verification', () => {
    for (const doc of [SKILL, PROMPT, TOOLKIT]) {
      expect(doc).toContain('agent:verify-report');
      expect(doc).toContain('incomplete visual QA');
    }
  });

  it('the reusable prompt authorizes direct toolkit-complaint updates', () => {
    expect(PROMPT).toContain('create or update `docs/toolkit_complaints.md` directly');
    expect(PROMPT).toContain('do not ask for permission again');
  });
});
