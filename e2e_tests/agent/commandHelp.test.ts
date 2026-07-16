import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMMAND_HELP,
  PUBLIC_COMMAND_NAMES,
  formatCommandHelp,
  formatCommandHelpJson,
  formatGlobalCommandHelp,
  getCommandHelp,
} from './commandHelp';

describe('command help registry', () => {
  it('covers every public runCommand command and alias', () => {
    const source = fs.readFileSync(path.resolve('e2e_tests/agent/cli.ts'), 'utf8');
    const runCommandStart = source.indexOf('async function runCommand(');
    const switchStart = source.indexOf('switch (verb)', runCommandStart);
    const switchEnd = source.indexOf('\n      default:', switchStart);
    const dispatchedNames = source.slice(switchStart, switchEnd)
      .split('\n')
      .filter((line) => line.startsWith('      case '))
      .flatMap((line) => [...line.matchAll(/case '([^']+)'/g)].map((match) => match[1]))
      .sort();

    expect(runCommandStart).toBeGreaterThan(-1);
    expect(switchStart).toBeGreaterThan(runCommandStart);
    expect(switchEnd).toBeGreaterThan(switchStart);
    expect(PUBLIC_COMMAND_NAMES).toEqual(dispatchedNames);
  });

  it('has no duplicate canonical names or aliases', () => {
    const allNames = COMMAND_HELP.flatMap((help) => [help.command, ...help.aliases]);
    expect(new Set(allNames).size).toBe(allNames.length);
  });

  it('generates global help from every registry entry', () => {
    const output = formatGlobalCommandHelp();
    for (const help of COMMAND_HELP) {
      expect(output).toContain(`    ${help.syntax}`);
      for (const alias of help.aliases) expect(output).toContain(alias);
    }
  });
});

describe('command-scoped help', () => {
  it('keeps walkto help limited to syntax, arguments, and one example', () => {
    const output = formatCommandHelp('walkto');
    expect(output).toContain('walkto <worldX> <worldY> [radius] [maxSeconds]');
    expect(output).toContain('worldX');
    expect(output).toContain('walkto 640 360 24 30');
    expect(output?.match(/^(SYNTAX|ARGUMENTS|EXAMPLE)$/gm)).toEqual([
      'SYNTAX',
      'ARGUMENTS',
      'EXAMPLE',
    ]);
    expect(output).not.toContain('GameAgent CLI');
  });

  it('resolves aliases through their canonical metadata', () => {
    expect(getCommandHelp('obs')?.command).toBe('observe');
    expect(formatCommandHelp('KEY')).toBe(formatCommandHelp('tap'));
  });

  it('supports machine-readable scoped help', () => {
    expect(JSON.parse(formatCommandHelpJson('walkto'))).toEqual(expect.objectContaining({
      cmd: 'help',
      ok: true,
      command: 'walkto',
      aliases: [],
      syntax: 'walkto <worldX> <worldY> [radius] [maxSeconds]',
    }));
  });

  it('returns a machine-readable error for an unknown command', () => {
    expect(JSON.parse(formatCommandHelpJson('missing'))).toEqual({
      cmd: 'help',
      ok: false,
      error: 'No scoped help is registered for "missing".',
    });
  });
});
