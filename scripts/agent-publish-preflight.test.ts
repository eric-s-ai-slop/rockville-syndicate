import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parsePorcelainStatus,
  classifyFile,
  isGeneratedQaPath,
  isBinaryPath,
  calculateBinarySize,
  validateWorktreeScope,
  parseArgs,
  runPreflight,
  runVerifyPushed,
  runGitCommand,
  StatusItem,
} from './agent-publish-preflight';

describe('agent-publish-preflight pure helpers', () => {
  it('parseArgs correctly parses flags and options', () => {
    const args1 = parseArgs(['--verify-pushed']);
    expect(args1).toEqual({ verifyPushed: true, all: false, paths: [], help: false });

    const args2 = parseArgs(['--all', '--path', 'src/file.ts', '-p', 'src/other.ts']);
    expect(args2).toEqual({ verifyPushed: false, all: true, paths: ['src/file.ts', 'src/other.ts'], help: false });

    const args3 = parseArgs(['--path=src/equal.ts', '--help']);
    expect(args3).toEqual({ verifyPushed: false, all: false, paths: ['src/equal.ts'], help: true });

    expect(() => parseArgs(['--unknown'])).toThrow(/unknown argument/i);
    expect(() => parseArgs(['--path'])).toThrow(/requires a non-empty/i);
    expect(() => parseArgs(['--verify-pushed', '--all'])).toThrow(/cannot be combined/i);
  });

  it('isGeneratedQaPath identifies QA and playtest paths', () => {
    expect(isGeneratedQaPath('agent-artifacts/check/log.txt')).toBe(true);
    expect(isGeneratedQaPath('qa/screenshot.png')).toBe(true);
    expect(isGeneratedQaPath('playtest/session1.json')).toBe(true);
    expect(isGeneratedQaPath('e2e_tests/agent/goldens/snap.png')).toBe(true);
    expect(isGeneratedQaPath('playtest-report.md')).toBe(true);
    expect(isGeneratedQaPath('docs/playtest-evidence.json')).toBe(true);
    expect(isGeneratedQaPath('session_123.jsonl')).toBe(true);

    expect(isGeneratedQaPath('src/components/App.tsx')).toBe(false);
  });

  it('isBinaryPath identifies binary file extensions', () => {
    expect(isBinaryPath('assets/logo.png')).toBe(true);
    expect(isBinaryPath('audio/bgm.mp3')).toBe(true);
    expect(isBinaryPath('fonts/inter.ttf')).toBe(true);
    expect(isBinaryPath('bundle.zip')).toBe(true);

    expect(isBinaryPath('src/main.ts')).toBe(false);
    expect(isBinaryPath('package.json')).toBe(false);
  });

  it('classifyFile categorizes files properly', () => {
    expect(classifyFile('agent-artifacts/output.json', ' M')).toBe('generated QA');
    expect(classifyFile('src/assets/icon.png', ' M')).toBe('binary assets');
    expect(classifyFile('src/deleted.ts', 'D ')).toBe('deleted');
    expect(classifyFile('src/new.ts', '??')).toBe('untracked');
    expect(classifyFile('src/index.ts', ' M')).toBe('modified');
  });

  it('parsePorcelainStatus parses NUL-separated (-z) status', () => {
    const raw = ' M src/a.ts\0?? src/b.ts\0D  src/c.ts\0R  src/new.ts\0src/old.ts\0';
    const items = parsePorcelainStatus(raw);

    expect(items).toHaveLength(4);
    expect(items[0]).toEqual({
      statusCode: ' M',
      indexStatus: ' ',
      worktreeStatus: 'M',
      path: 'src/a.ts',
      category: 'modified',
    });
    expect(items[1]).toEqual({
      statusCode: '??',
      indexStatus: '?',
      worktreeStatus: '?',
      path: 'src/b.ts',
      category: 'untracked',
    });
    expect(items[2]).toEqual({
      statusCode: 'D ',
      indexStatus: 'D',
      worktreeStatus: ' ',
      path: 'src/c.ts',
      category: 'deleted',
    });
    expect(items[3]).toEqual({
      statusCode: 'R ',
      indexStatus: 'R',
      worktreeStatus: ' ',
      path: 'src/new.ts',
      oldPath: 'src/old.ts',
      category: 'modified',
    });
  });

  it('parsePorcelainStatus parses newline-separated status', () => {
    const raw = ' M src/a.ts\n?? src/b.ts\nR  old.ts -> new.ts';
    const items = parsePorcelainStatus(raw);

    expect(items).toHaveLength(3);
    expect(items[0].path).toBe('src/a.ts');
    expect(items[1].path).toBe('src/b.ts');
    expect(items[2].path).toBe('new.ts');
    expect(items[2].oldPath).toBe('old.ts');
  });

  it('calculateBinarySize sums sizes of binary assets', () => {
    const items: StatusItem[] = [
      { statusCode: ' M', indexStatus: ' ', worktreeStatus: 'M', path: 'image.png', category: 'binary assets' },
      { statusCode: ' M', indexStatus: ' ', worktreeStatus: 'M', path: 'doc.txt', category: 'modified' },
      { statusCode: ' M', indexStatus: ' ', worktreeStatus: 'M', path: 'audio.wav', category: 'binary assets' },
    ];

    const getFileSize = (p: string) => {
      if (p === 'image.png') return 1000;
      if (p === 'audio.wav') return 2500;
      return 500;
    };

    expect(calculateBinarySize(items, getFileSize)).toBe(3500);
  });

  it('validateWorktreeScope enforces scope requirements', () => {
    const items: StatusItem[] = [
      { statusCode: ' M', indexStatus: ' ', worktreeStatus: 'M', path: 'src/index.ts', category: 'modified' },
      { statusCode: '??', indexStatus: '?', worktreeStatus: '?', path: 'src/new.ts', category: 'untracked' },
    ];

    // Multi-category without --all or --path fails
    const res1 = validateWorktreeScope(items, {});
    expect(res1.ok).toBe(false);
    expect(res1.error).toContain('[preflight:ambiguous-scope]');

    // Multi-category with --all passes
    const res2 = validateWorktreeScope(items, { all: true });
    expect(res2.ok).toBe(true);
    expect(res2.selectedPaths).toEqual(['<all>']);

    // Multi-category with valid --path passes
    const res3 = validateWorktreeScope(items, { paths: ['src/index.ts'] });
    expect(res3.ok).toBe(true);
    expect(res3.selectedPaths).toEqual(['src/index.ts']);

    // Invalid --path fails
    const res4 = validateWorktreeScope(items, { paths: ['nonexistent.ts'] });
    expect(res4.ok).toBe(false);
    expect(res4.error).toContain('[preflight:invalid-path]');
  });
});

describe('agent-publish-preflight integration tests (temporary local repo)', () => {
  let tempDir: string;
  let remoteDir: string;
  let localDir: string;

  function runGitIn(dir: string, args: string[]): string {
    const res = spawnSync('git', args, { cwd: dir, encoding: 'utf8', shell: false });
    if (res.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed in ${dir}: ${res.stderr || res.stdout}`);
    }
    return (res.stdout || '').trim();
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-preflight-test-'));
    remoteDir = path.join(tempDir, 'remote.git');
    localDir = path.join(tempDir, 'local');

    fs.mkdirSync(remoteDir, { recursive: true });
    fs.mkdirSync(localDir, { recursive: true });

    runGitIn(remoteDir, ['init', '--bare']);

    runGitIn(localDir, ['init']);
    runGitIn(localDir, ['config', 'user.name', 'Test User']);
    runGitIn(localDir, ['config', 'user.email', 'test@example.com']);
    runGitIn(localDir, ['checkout', '-b', 'main']);

    fs.writeFileSync(path.join(localDir, 'README.md'), '# Initial Commit\n');
    runGitIn(localDir, ['add', 'README.md']);
    runGitIn(localDir, ['commit', '-m', 'Initial commit']);

    runGitIn(localDir, ['remote', 'add', 'origin', remoteDir]);
    runGitIn(localDir, ['push', '-u', 'origin', 'main']);
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects when local branch is behind upstream and lists remote commits and changed paths', async () => {
    // Create a clone to simulate remote work
    const otherDir = path.join(tempDir, 'other');
    runGitIn(tempDir, ['clone', remoteDir, 'other']);
    runGitIn(otherDir, ['config', 'user.name', 'Other User']);
    runGitIn(otherDir, ['config', 'user.email', 'other@example.com']);
    runGitIn(otherDir, ['checkout', 'main']);

    fs.writeFileSync(path.join(otherDir, 'remote-file.txt'), 'remote content\n');
    runGitIn(otherDir, ['add', 'remote-file.txt']);
    runGitIn(otherDir, ['commit', '-m', 'Remote feature update']);
    runGitIn(otherDir, ['push', 'origin', 'main']);

    // Now run preflight on localDir
    const result = await runPreflight({
      cwd: localDir,
      gitFn: args => runGitCommand(args, localDir),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('[preflight:behind]');
    expect(result.message).toContain('Remote feature update');
    expect(result.message).toContain('remote-file.txt');
  });

  it('enforces multi-category scope validation when worktree has changes across multiple groups', async () => {
    // Modify existing file
    fs.appendFileSync(path.join(localDir, 'README.md'), 'New line\n');
    // Add untracked file
    fs.writeFileSync(path.join(localDir, 'untracked.txt'), 'untracked\n');

    // Without --all or --path: fails scope validation
    const resNoArgs = await runPreflight({
      cwd: localDir,
      gitFn: args => runGitCommand(args, localDir),
      cliArgs: { verifyPushed: false, all: false, paths: [], help: false },
    });
    expect(resNoArgs.ok).toBe(false);
    expect(resNoArgs.message).toContain('[preflight:ambiguous-scope]');

    // With --all: succeeds
    const resAll = await runPreflight({
      cwd: localDir,
      gitFn: args => runGitCommand(args, localDir),
      cliArgs: { verifyPushed: false, all: true, paths: [], help: false },
    });
    expect(resAll.ok).toBe(true);
    expect(resAll.message).toContain('Preflight Check Passed');
    expect(resAll.message).toContain('README.md');
    expect(resAll.message).toContain('untracked.txt');

    // With --path README.md: succeeds
    const resPath = await runPreflight({
      cwd: localDir,
      gitFn: args => runGitCommand(args, localDir),
      cliArgs: { verifyPushed: false, all: false, paths: ['README.md'], help: false },
    });
    expect(resPath.ok).toBe(true);
    expect(resPath.message).toContain('Preflight Check Passed');
  });

  it('--verify-pushed writes receipt and returns ok when local matches remote', async () => {
    const res = await runVerifyPushed({
      cwd: localDir,
      gitFn: args => runGitCommand(args, localDir),
      receiptDir: path.join(localDir, 'agent-artifacts', 'publish'),
    });

    expect(res.ok).toBe(true);
    expect(res.code).toBe(0);
    expect(res.message).toContain('[preflight:verify-pushed-ok]');
    expect(res.receipt?.equal).toBe(true);

    const receiptFile = path.join(localDir, 'agent-artifacts', 'publish', 'publish-receipt.json');
    expect(fs.existsSync(receiptFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    expect(content.branch).toBe('main');
    expect(content.upstream).toBe('origin/main');
    expect(content.equal).toBe(true);
  });

  it('--verify-pushed writes receipt and exits nonzero when local does not match remote', async () => {
    // Create an unpushed local commit
    fs.writeFileSync(path.join(localDir, 'local-only.txt'), 'local\n');
    runGitIn(localDir, ['add', 'local-only.txt']);
    runGitIn(localDir, ['commit', '-m', 'Local commit']);

    const res = await runVerifyPushed({
      cwd: localDir,
      gitFn: args => runGitCommand(args, localDir),
      receiptDir: path.join(localDir, 'agent-artifacts', 'publish'),
    });

    expect(res.ok).toBe(false);
    expect(res.code).toBe(1);
    expect(res.message).toContain('[preflight:verify-pushed-failed]');
    expect(res.receipt?.equal).toBe(false);

    const receiptFile = path.join(localDir, 'agent-artifacts', 'publish', 'publish-receipt.json');
    expect(fs.existsSync(receiptFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    expect(content.equal).toBe(false);
  });
});
