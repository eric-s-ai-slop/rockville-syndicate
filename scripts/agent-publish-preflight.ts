import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export type Category = 'modified' | 'deleted' | 'untracked' | 'generated QA' | 'binary assets';

export interface StatusItem {
  statusCode: string;
  indexStatus: string;
  worktreeStatus: string;
  path: string;
  oldPath?: string;
  category: Category;
}

export interface GitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PublishReceipt {
  branch: string;
  upstream: string;
  localSha: string;
  remoteSha: string;
  equal: boolean;
  timestamp: string;
}

export interface CLIArgs {
  verifyPushed: boolean;
  all: boolean;
  paths: string[];
  help: boolean;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.tif', '.avif',
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  '.mp4', '.webm', '.mov', '.avi', '.mkv',
  '.ttf', '.woff', '.woff2', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2',
  '.bin', '.exe', '.so', '.dylib', '.dll', '.dat', '.wasm', '.pdf', '.psd',
]);

export function runGitCommand(args: string[], cwd: string = process.cwd()): GitResult {
  try {
    const result = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      shell: false,
      maxBuffer: 10 * 1024 * 1024,
    });
    const stdout = (result.stdout || '').toString();
    const rawStderr = (result.stderr || '').toString();
    const stderr = rawStderr.replace(/https?:\/\/[^\s@]+@/g, 'https://<redacted>@');
    return {
      stdout,
      stderr,
      exitCode: result.status ?? 1,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      stdout: '',
      stderr: message.replace(/https?:\/\/[^\s@]+@/g, 'https://<redacted>@'),
      exitCode: 1,
    };
  }
}

export function parseArgs(args: string[]): CLIArgs {
  const result: CLIArgs = {
    verifyPushed: false,
    all: false,
    paths: [],
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--verify-pushed') {
      result.verifyPushed = true;
    } else if (arg === '--all') {
      result.all = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--path' || arg === '-p') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        result.paths.push(nextArg);
        i++;
      } else {
        throw new Error(`${arg} requires a non-empty repository path.`);
      }
    } else if (arg.startsWith('--path=')) {
      const val = arg.slice('--path='.length);
      if (!val) throw new Error('--path requires a non-empty repository path.');
      result.paths.push(val);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (result.verifyPushed && (result.all || result.paths.length > 0)) {
    throw new Error('--verify-pushed cannot be combined with --all or --path.');
  }

  return result;
}

export function isGeneratedQaPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('agent-artifacts/')) return true;
  if (normalized.startsWith('qa/') || normalized.startsWith('playtest/') || normalized.startsWith('playtests/')) return true;
  if (normalized.startsWith('e2e_tests/agent/goldens/')) return true;
  const basename = path.basename(normalized);
  if (/^playtest[-_]/i.test(basename)) return true;
  if (/playtest[-_]report/i.test(normalized) || /playtest[-_]evidence/i.test(normalized)) return true;
  if (/qa[-_]report/i.test(basename)) return true;
  if (/^session.*\.jsonl$/i.test(basename)) return true;
  if (/\.playtest\./i.test(basename)) return true;
  return false;
}

export function isBinaryPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export function classifyFile(filePath: string, statusCode: string): Category {
  if (isGeneratedQaPath(filePath)) {
    return 'generated QA';
  }
  if (isBinaryPath(filePath)) {
    return 'binary assets';
  }
  if (statusCode === '??') {
    return 'untracked';
  }
  const indexStatus = statusCode[0] || ' ';
  const worktreeStatus = statusCode[1] || ' ';
  if (indexStatus === 'D' || worktreeStatus === 'D') {
    return 'deleted';
  }
  return 'modified';
}

export function parsePorcelainStatus(output: string): StatusItem[] {
  if (!output || !output.trim()) return [];

  const items: StatusItem[] = [];

  if (output.includes('\0')) {
    const tokens = output.split('\0');
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (!token) {
        i++;
        continue;
      }

      const statusCode = token.slice(0, 2);
      const filePath = token.slice(3);
      const indexStatus = statusCode[0] || ' ';
      const worktreeStatus = statusCode[1] || ' ';

      let oldPath: string | undefined;
      if (indexStatus === 'R' || indexStatus === 'C' || worktreeStatus === 'R' || worktreeStatus === 'C') {
        if (i + 1 < tokens.length) {
          oldPath = tokens[i + 1];
          i++;
        }
      }

      if (filePath) {
        items.push({
          statusCode,
          indexStatus,
          worktreeStatus,
          path: filePath,
          ...(oldPath ? { oldPath } : {}),
          category: classifyFile(filePath, statusCode),
        });
      }
      i++;
    }
  } else {
    const lines = output.split(/\r?\n/).filter(line => line.trim().length > 0);
    for (const line of lines) {
      const statusCode = line.slice(0, 2);
      let filePath = line.slice(3).trim();
      let oldPath: string | undefined;

      if (filePath.includes(' -> ')) {
        const parts = filePath.split(' -> ');
        oldPath = parts[0].trim();
        filePath = parts[1].trim();
      }

      filePath = filePath.replace(/^"|"$/g, '');
      if (oldPath) oldPath = oldPath.replace(/^"|"$/g, '');

      if (filePath) {
        items.push({
          statusCode,
          indexStatus: statusCode[0] || ' ',
          worktreeStatus: statusCode[1] || ' ',
          path: filePath,
          ...(oldPath ? { oldPath } : {}),
          category: classifyFile(filePath, statusCode),
        });
      }
    }
  }

  return items;
}

export function calculateBinarySize(
  items: StatusItem[],
  getFileSize?: (filePath: string) => number,
): number {
  let totalBytes = 0;
  for (const item of items) {
    if (isBinaryPath(item.path) || item.category === 'binary assets') {
      try {
        if (getFileSize) {
          totalBytes += getFileSize(item.path);
        } else if (fs.existsSync(item.path)) {
          const stat = fs.statSync(item.path);
          if (stat.isFile()) {
            totalBytes += stat.size;
          }
        }
      } catch {
        // Ignore stat errors for non-existent files
      }
    }
  }
  return totalBytes;
}

export interface ScopeValidationResult {
  ok: boolean;
  error?: string;
  categoriesPresent: Category[];
  selectedPaths?: string[];
}

export function validateWorktreeScope(
  items: StatusItem[],
  options: { all?: boolean; paths?: string[] },
): ScopeValidationResult {
  if (items.length === 0) {
    if (options.paths && options.paths.length > 0) {
      return {
        ok: false,
        error: `[preflight:invalid-path] Specified path "${options.paths[0]}" not found in git status.`,
        categoriesPresent: [],
      };
    }
    return {
      ok: true,
      categoriesPresent: [],
      selectedPaths: options.all ? ['<all>'] : [],
    };
  }

  const categorySet = new Set<Category>();
  for (const item of items) {
    categorySet.add(item.category);
  }
  const categoriesPresent = Array.from(categorySet);

  const itemPaths = new Set<string>();
  for (const item of items) {
    itemPaths.add(item.path);
    if (item.oldPath) itemPaths.add(item.oldPath);
  }

  if (options.paths && options.paths.length > 0) {
    for (const userPath of options.paths) {
      const normalized = userPath.replace(/\\/g, '/');
      if (!itemPaths.has(normalized)) {
        return {
          ok: false,
          error: `[preflight:invalid-path] Specified path "${userPath}" not found in git status.`,
          categoriesPresent,
        };
      }
    }
    return {
      ok: true,
      categoriesPresent,
      selectedPaths: options.paths,
    };
  }

  if (categoriesPresent.length > 1) {
    if (!options.all) {
      return {
        ok: false,
        error: `[preflight:ambiguous-scope] Worktree contains changes across ${categoriesPresent.length} categories (${categoriesPresent.join(', ')}). Specify --all or explicit --path <path> selections.`,
        categoriesPresent,
      };
    }
    return {
      ok: true,
      categoriesPresent,
      selectedPaths: ['<all>'],
    };
  }

  return {
    ok: true,
    categoriesPresent,
    selectedPaths: options.all ? ['<all>'] : items.map(i => i.path),
  };
}

export async function runVerifyPushed(options: {
  cwd?: string;
  gitFn?: typeof runGitCommand;
  receiptDir?: string;
} = {}): Promise<{ ok: boolean; code: number; message: string; receipt?: PublishReceipt }> {
  const cwd = options.cwd ?? process.cwd();
  const git = options.gitFn ?? ((args: string[]) => runGitCommand(args, cwd));
  const outputDir = options.receiptDir ?? path.join(cwd, 'agent-artifacts', 'publish');

  const branchRes = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchRes.exitCode !== 0 || !branchRes.stdout.trim() || branchRes.stdout.trim() === 'HEAD') {
    return {
      ok: false,
      code: 1,
      message: `[preflight:verify-pushed-failed] Unable to resolve current Git branch (detached HEAD or not a repo): ${branchRes.stderr.trim() || 'HEAD is detached'}`,
    };
  }
  const branch = branchRes.stdout.trim();

  const upstreamRes = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstreamRes.exitCode !== 0 || !upstreamRes.stdout.trim()) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:verify-pushed-failed] Branch "${branch}" has no tracked upstream remote configured.`,
    };
  }
  const upstream = upstreamRes.stdout.trim();

  let remoteName = 'origin';
  const remoteRes = git(['config', `branch.${branch}.remote`]);
  if (remoteRes.exitCode === 0 && remoteRes.stdout.trim()) {
    remoteName = remoteRes.stdout.trim();
  } else if (upstream.includes('/')) {
    remoteName = upstream.split('/')[0];
  }

  const fetchRes = git(['fetch', remoteName]);
  if (fetchRes.exitCode !== 0) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:fetch-failed] Failed to fetch remote "${remoteName}": ${fetchRes.stderr.trim() || 'fetch failed'}`,
    };
  }

  const localShaRes = git(['rev-parse', 'HEAD']);
  if (localShaRes.exitCode !== 0) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:verify-pushed-failed] Failed to resolve local HEAD SHA: ${localShaRes.stderr.trim()}`,
    };
  }
  const localSha = localShaRes.stdout.trim();

  const remoteShaRes = git(['rev-parse', '@{u}']);
  if (remoteShaRes.exitCode !== 0) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:verify-pushed-failed] Failed to resolve upstream SHA for "${upstream}": ${remoteShaRes.stderr.trim()}`,
    };
  }
  const remoteSha = remoteShaRes.stdout.trim();

  const equal = localSha === remoteSha;
  const timestamp = new Date().toISOString();

  const receipt: PublishReceipt = {
    branch,
    upstream,
    localSha,
    remoteSha,
    equal,
    timestamp,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const receiptPath = path.join(outputDir, 'publish-receipt.json');
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`);

  if (!equal) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:verify-pushed-failed] Local HEAD (${localSha.slice(0, 8)}) does not match upstream ${upstream} (${remoteSha.slice(0, 8)}). Receipt written to ${path.relative(cwd, receiptPath)}.`,
      receipt,
    };
  }

  return {
    ok: true,
    code: 0,
    message: `[preflight:verify-pushed-ok] Local HEAD matches upstream ${upstream} (${localSha.slice(0, 8)}). Receipt written to ${path.relative(cwd, receiptPath)}.`,
    receipt,
  };
}

export async function runPreflight(options: {
  cwd?: string;
  gitFn?: typeof runGitCommand;
  getFileSize?: (p: string) => number;
  cliArgs?: CLIArgs;
} = {}): Promise<{ ok: boolean; code: number; message: string; data?: unknown }> {
  const cwd = options.cwd ?? process.cwd();
  const git = options.gitFn ?? ((args: string[]) => runGitCommand(args, cwd));
  const args = options.cliArgs ?? { verifyPushed: false, all: false, paths: [], help: false };

  const branchRes = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchRes.exitCode !== 0 || !branchRes.stdout.trim() || branchRes.stdout.trim() === 'HEAD') {
    return {
      ok: false,
      code: 1,
      message: '[preflight:no-branch] Unable to resolve current Git branch (detached HEAD or not in a repository).',
    };
  }
  const branch = branchRes.stdout.trim();

  const upstreamRes = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstreamRes.exitCode !== 0 || !upstreamRes.stdout.trim()) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:no-upstream] Branch "${branch}" has no tracked upstream remote.`,
    };
  }
  const upstream = upstreamRes.stdout.trim();

  let remoteName = 'origin';
  const remoteRes = git(['config', `branch.${branch}.remote`]);
  if (remoteRes.exitCode === 0 && remoteRes.stdout.trim()) {
    remoteName = remoteRes.stdout.trim();
  } else if (upstream.includes('/')) {
    remoteName = upstream.split('/')[0];
  }

  const fetchRes = git(['fetch', remoteName]);
  if (fetchRes.exitCode !== 0) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:fetch-failed] Failed to fetch remote "${remoteName}": ${fetchRes.stderr.trim() || 'unknown fetch error'}`,
    };
  }

  const countsRes = git(['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
  if (countsRes.exitCode !== 0) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:rev-list-failed] Could not compare HEAD with ${upstream}: ${countsRes.stderr.trim()}`,
    };
  }

  const parts = countsRes.stdout.trim().split(/\s+/);
  const ahead = parseInt(parts[0] || '0', 10);
  const behind = parseInt(parts[1] || '0', 10);

  if (behind > 0) {
    const commitsRes = git(['log', '--oneline', 'HEAD..@{u}']);
    const diffRes = git(['diff', '--name-status', 'HEAD..@{u}']);

    const remoteCommits = commitsRes.stdout.trim();
    const changedPaths = diffRes.stdout.trim();

    const summaryLines = [
      `[preflight:behind] Branch "${branch}" is behind upstream "${upstream}" by ${behind} commit(s). (Ahead: ${ahead})`,
      'Remote-only commits (HEAD..@{u}):',
      remoteCommits ? remoteCommits : '  (none)',
      'Paths changed (HEAD..@{u}):',
      changedPaths ? changedPaths : '  (none)',
      'Resolution required: Pull or rebase manually before pushing. Never force-push or auto-merge.',
    ];

    return {
      ok: false,
      code: 1,
      message: summaryLines.join('\n'),
      data: { branch, upstream, ahead, behind, remoteCommits, changedPaths },
    };
  }

  const statusRes = git(['status', '--porcelain=v1', '-z']);
  if (statusRes.exitCode !== 0) {
    return {
      ok: false,
      code: 1,
      message: `[preflight:status-failed] Could not get git status: ${statusRes.stderr.trim()}`,
    };
  }

  const items = parsePorcelainStatus(statusRes.stdout);
  const binaryBytes = calculateBinarySize(items, options.getFileSize ?? ((filePath) => {
    const stat = fs.statSync(path.join(cwd, filePath));
    return stat.isFile() ? stat.size : 0;
  }));

  const grouped: Record<Category, StatusItem[]> = {
    'modified': [],
    'deleted': [],
    'untracked': [],
    'generated QA': [],
    'binary assets': [],
  };

  for (const item of items) {
    grouped[item.category].push(item);
  }

  const scopeValidation = validateWorktreeScope(items, { all: args.all, paths: args.paths });
  if (!scopeValidation.ok) {
    return {
      ok: false,
      code: 1,
      message: scopeValidation.error || '[preflight:scope-error] Scope validation failed.',
      data: { branch, upstream, ahead, behind, items, grouped, scopeValidation },
    };
  }

  const summarizeGroup = (label: string, category: Category, suffix = ''): string => {
    const paths = grouped[category].map(item => item.path);
    return `  - ${label} (${paths.length})${suffix}: ${paths.join(', ') || '(none)'}`;
  };

  const lines = [
    `Preflight Check Passed for branch "${branch}" (tracking "${upstream}")`,
    `Sync status: Ahead: ${ahead} | Behind: ${behind}`,
    `Worktree status (${items.length} changed items):`,
    summarizeGroup('Modified', 'modified'),
    summarizeGroup('Deleted', 'deleted'),
    summarizeGroup('Untracked', 'untracked'),
    summarizeGroup('Generated QA', 'generated QA'),
    summarizeGroup('Binary assets', 'binary assets', `, ${binaryBytes} bytes total`),
    `Selected Scope: ${scopeValidation.selectedPaths?.join(', ') || 'clean'}`,
  ];

  return {
    ok: true,
    code: 0,
    message: lines.join('\n'),
    data: {
      branch,
      upstream,
      ahead,
      behind,
      itemsCount: items.length,
      binaryBytes,
      groupedCounts: {
        modified: grouped['modified'].length,
        deleted: grouped['deleted'].length,
        untracked: grouped['untracked'].length,
        generatedQa: grouped['generated QA'].length,
        binaryAssets: grouped['binary assets'].length,
      },
      selectedScope: scopeValidation.selectedPaths,
    },
  };
}

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isDirectRun) {
  let cliArgs: CLIArgs | undefined;
  try {
    cliArgs = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[preflight:usage] ${message}\nUsage: npm run agent:publish-preflight -- [--all | --path <path>...]\n       npm run agent:publish-preflight -- --verify-pushed\n`);
    process.exitCode = 2;
  }

  if (!cliArgs) {
    // The usage error above already set the exit code.
  } else if (cliArgs.help) {
    process.stdout.write('Usage: npm run agent:publish-preflight [-- [--verify-pushed] [--all] [--path <path>]]\n');
    process.exit(0);
  }

  if (cliArgs.verifyPushed) {
    runVerifyPushed()
      .then(res => {
        if (res.ok) {
          process.stdout.write(`${res.message}\n`);
          process.exit(0);
        } else {
          process.stderr.write(`${res.message}\n`);
          process.exit(res.code);
        }
      })
      .catch(err => {
        process.stderr.write(`[preflight:unexpected-error] ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
      });
  } else {
    runPreflight({ cliArgs })
      .then(res => {
        if (res.ok) {
          process.stdout.write(`${res.message}\n`);
          process.exit(0);
        } else {
          process.stderr.write(`${res.message}\n`);
          process.exit(res.code);
        }
      })
      .catch(err => {
        process.stderr.write(`[preflight:unexpected-error] ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
      });
  }
}
