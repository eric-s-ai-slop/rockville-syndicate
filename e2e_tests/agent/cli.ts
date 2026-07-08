/**
 * cli.ts — terminal driver for the GameAgent playtesting toolkit.
 *
 * Boots a Chromium browser, loads the game, and executes a stream of one-line
 * commands (from positional args, a --script file, or stdin) against the live
 * Phaser build via GameAgent. Every command prints a single JSON line to stdout
 * so the output is both human-readable and machine-parseable (JSONL).
 *
 * Run `npm run agent -- --help` (or `npx tsx e2e_tests/agent/cli.ts --help`) for
 * the full usage menu. See docs/AGENT_TOOLKIT.md for the walkthrough.
 */
import { chromium, Browser, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { GameAgent, MouseButton } from './GameAgent';
import { navigateToChapter, advanceUntil } from '../helpers';

// ── Flags ────────────────────────────────────────────────────────────────────

interface Flags {
  url: string;
  chapter: string | null;
  classified: boolean;
  headed: boolean;
  out: string;
  script: string | null;
  keepOpen: boolean;
  slowmo: number;
  help: boolean;
  inline: string | null; // positional command(s), ';'-separated
}

function parseFlags(argv: string[]): Flags {
  const f: Flags = {
    url: 'http://localhost:3324',
    chapter: null,
    classified: false,
    headed: false,
    out: 'agent-artifacts',
    script: null,
    keepOpen: false,
    slowmo: 0,
    help: false,
    inline: null,
  };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--help': case '-h': f.help = true; break;
      case '--headed': f.headed = true; break;
      case '--classified': f.classified = true; break;
      case '--keep-open': f.keepOpen = true; break;
      case '--url': f.url = argv[++i]; break;
      case '--chapter': f.chapter = argv[++i]; break;
      case '--out': f.out = argv[++i]; break;
      case '--script': f.script = argv[++i]; break;
      case '--slowmo': f.slowmo = Number(argv[++i]) || 0; break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
        positional.push(a);
    }
  }
  if (positional.length) f.inline = positional.join(' ');
  return f;
}

const HELP = `
GameAgent CLI — drive the Phaser game from the terminal.

USAGE
  npm run agent -- [flags] ["command; command; ..."]
  npm run agent -- [flags] --script commands.txt
  <no command>  → reads commands from stdin (one per line; interactive or piped)

FLAGS
  --chapter "<title>"   Navigate to a chapter after boot (e.g. "The Spotify Family Insurgency")
  --classified          Break the chapter's CLASSIFIED seal during navigation
  --url <url>           Base URL (default http://localhost:3324 — start it with 'npm run dev')
  --out <dir>           Folder for screenshots (default ./agent-artifacts)
  --script <file>       Read commands from a file (one per line; '#' comments allowed)
  --headed              Show the browser window (default headless)
  --slowmo <ms>         Delay every Playwright action by <ms> (visual debugging)
  --keep-open           After running inline/script commands, stay open and read stdin
  -h, --help            Show this menu

COMMANDS (one per line; ';' also separates them on a single line)
  Keyboard (§1)
    hold <key>                 keydown, held until 'release' (e.g. hold w)
    release <key>              keyup
    press <key> [ms]           hold for <ms> then release (e.g. press w 2000 = walk 2s). ms omitted = a tap
    tap <key>                  discrete down+up (alias: key)
    releaseall                 release every held key
  Mouse (§2) — X/Y are viewport CSS pixels
    mousedown <x> <y> [left|right]
    mousemove <x> <y>          drag step if a button is held, else a hover
    mouseup [x] [y] [left|right]
    click <x> <y> [left|right] down+up at one point
    drag <sx> <sy> <ex> <ey> [ms]   smooth click-drag (e.g. drag 200 300 500 300 400)
  State / bridge (§3)
    state                      print snapshotGameState() JSON (scene, player, velocity, hp, mode, loop)
    text                       extract visible text from Phaser canvas and DOM (A2)
    targets                    dump active walk target and NPCs with screen/world coordinates (A3)
    goto <sceneIndex>          jump to a specific scene index instantly (B1)
    savestate                  quick-save current game state in-memory (B2)
    loadstate                  quick-restore saved game state (B2)
    eval <js>                  run JS in the page, print the result (e.g. eval window.__OMEGA_GAME__.scene.keys.length)
    screenshot [name]          save a PNG to --out, print its path
  Time (§4)
    pause | resume             sleep / wake the Phaser loop
    loop                       print whether the loop is running
    step <frames> [fps]        advance exactly <frames> fixed-timestep frames (loop auto-pauses)
  Debug (C1)
    debug on | off             toggle physics debug graphics
  Flow / misc
    advance [maxSeconds]       skip dialogue/intro until the player has free walk control (default 60)
    wait <ms>                  sleep <ms> of real time
    help                       print this menu
    quit | exit                close the browser and end

OUTPUT
  One JSON line per command on stdout: {"cmd":"...","ok":true, ...result}. Errors are
  {"cmd":"...","ok":false,"error":"..."} and never crash the session. Screenshots are
  written to the --out folder and their absolute path is printed in the result.

EXAMPLES
  # Load a chapter, walk to control, hold W for 2s, dump state + a screenshot
  npm run agent -- --chapter "The Spotify Family Insurgency" "advance; press w 2000; state; screenshot walked.png"

  # Pipe a script
  printf 'advance\\nhold d\\nstep 30\\nstate\\nrelease d\\n' | npm run agent -- --chapter "The Spotify Family Insurgency"

  # Interactive REPL (type commands, watch the --headed window)
  npm run agent -- --chapter "The Spotify Family Insurgency" --headed --keep-open
`;

// ── Command execution ─────────────────────────────────────────────────────────

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/** Condition used by `advance`: scene booted, player spawned, not frozen. */
async function reachWalkControl(page: Page, maxSeconds: number): Promise<void> {
  await advanceUntil(
    page,
    () =>
      page.evaluate(() => {
        const s = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene(
          'ChapterScene',
        );
        return !!(s && s.levelStarted && s.player && !s.movementFrozen);
      }),
    { maxSeconds },
  );
}

let screenshotCount = 0;

/** Execute one command line. Returns false to signal the session should end. */
async function runCommand(
  agent: GameAgent,
  page: Page,
  flags: Flags,
  line: string,
): Promise<boolean> {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;

  const verb = trimmed.split(/\s+/)[0].toLowerCase();
  const rest = trimmed.slice(verb.length).trim(); // raw remainder (for eval)
  const args = rest.length ? rest.split(/\s+/) : [];
  const num = (i: number) => Number(args[i]);
  const btn = (v: string | undefined): MouseButton => (v === 'right' ? 'right' : 'left');

  try {
    switch (verb) {
      case 'help': process.stdout.write(HELP + '\n'); break;

      case 'hold': await agent.holdKey(args[0]); emit({ cmd: 'hold', ok: true, key: args[0] }); break;
      case 'release': await agent.releaseKey(args[0]); emit({ cmd: 'release', ok: true, key: args[0] }); break;
      case 'releaseall': await agent.releaseAllKeys(); emit({ cmd: 'releaseall', ok: true }); break;
      case 'press':
        await agent.pressKey(args[0], args[1] ? num(1) : 0);
        emit({ cmd: 'press', ok: true, key: args[0], durationMs: args[1] ? num(1) : 0 });
        break;
      case 'tap': case 'key':
        await agent.pressKey(args[0], 0);
        emit({ cmd: 'tap', ok: true, key: args[0] });
        break;

      case 'mousedown':
        await agent.mouseDown(num(0), num(1), btn(args[2]));
        emit({ cmd: 'mousedown', ok: true, x: num(0), y: num(1), button: btn(args[2]) });
        break;
      case 'mousemove':
        await agent.mouseMove(num(0), num(1));
        emit({ cmd: 'mousemove', ok: true, x: num(0), y: num(1) });
        break;
      case 'mouseup':
        if (args.length >= 2 && !isNaN(num(0))) await agent.mouseUp(num(0), num(1), btn(args[2]));
        else await agent.mouseUp(undefined, undefined, btn(args[0]));
        emit({ cmd: 'mouseup', ok: true });
        break;
      case 'click':
        await agent.mouseDown(num(0), num(1), btn(args[2]));
        await agent.mouseUp(num(0), num(1), btn(args[2]));
        emit({ cmd: 'click', ok: true, x: num(0), y: num(1), button: btn(args[2]) });
        break;
      case 'drag':
        await agent.dragMouse(num(0), num(1), num(2), num(3), args[4] ? num(4) : 400);
        emit({ cmd: 'drag', ok: true, from: [num(0), num(1)], to: [num(2), num(3)] });
        break;

      case 'state': {
        const s = await agent.snapshotGameState();
        emit({ cmd: 'state', ok: true, state: s });
        break;
      }
      case 'eval': {
        const result = await agent.executeJavascript(rest);
        emit({ cmd: 'eval', ok: true, result });
        break;
      }
      case 'screenshot': {
        fs.mkdirSync(flags.out, { recursive: true });
        const name = args[0] || `shot-${String(++screenshotCount).padStart(3, '0')}.png`;
        const file = path.resolve(flags.out, name);
        await page.screenshot({ path: file });
        emit({ cmd: 'screenshot', ok: true, path: file });
        break;
      }

      case 'pause': await agent.pauseLoop(); emit({ cmd: 'pause', ok: true }); break;
      case 'resume': await agent.resumeLoop(); emit({ cmd: 'resume', ok: true }); break;
      case 'loop': emit({ cmd: 'loop', ok: true, running: await agent.isLoopRunning() }); break;
      case 'step': {
        const frames = await agent.stepFrames(num(0), args[1] ? num(1) : 60);
        emit({ cmd: 'step', ok: true, frames });
        break;
      }
      case 'debug': {
        const on = args[0] === 'on';
        await agent.setPhysicsDebug(on);
        emit({ cmd: 'debug', ok: true, enabled: on, mutates: true });
        break;
      }
      case 'text': {
        const res = await agent.extractVisibleText();
        emit({ cmd: 'text', ok: true, ...res });
        break;
      }
      case 'targets': {
        const res = await agent.dumpWalkAndNpcTargets();
        emit({ cmd: 'targets', ok: true, ...res });
        break;
      }
      case 'goto': {
        const idx = num(0);
        await agent.warpScene(idx);
        emit({ cmd: 'goto', ok: true, sceneIndex: idx });
        break;
      }
      case 'savestate': {
        await agent.saveQuickState();
        emit({ cmd: 'savestate', ok: true });
        break;
      }
      case 'loadstate': {
        await agent.loadQuickState();
        emit({ cmd: 'loadstate', ok: true });
        break;
      }

      case 'advance':
        await reachWalkControl(page, args[0] ? num(0) : 60);
        emit({ cmd: 'advance', ok: true, state: await agent.snapshotGameState() });
        break;
      case 'wait':
        await page.waitForTimeout(num(0));
        emit({ cmd: 'wait', ok: true, ms: num(0) });
        break;

      case 'quit': case 'exit': return false;

      default:
        emit({ cmd: verb, ok: false, error: `unknown command (try 'help')` });
    }
  } catch (err) {
    emit({ cmd: verb, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
  return true;
}

// ── Session bootstrap ─────────────────────────────────────────────────────────

async function readStdin(agent: GameAgent, page: Page, flags: Flags): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const interactive = process.stdin.isTTY;
  if (interactive) process.stderr.write('agent> ');
  for await (const line of rl) {
    const keepGoing = await runCommand(agent, page, flags, line);
    if (!keepGoing) break;
    if (interactive) process.stderr.write('agent> ');
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    process.stdout.write(HELP + '\n');
    return;
  }

  let browser: Browser | null = null;
  let agent: GameAgent | null = null;
  try {
    browser = await chromium.launch({ headless: !flags.headed, slowMo: flags.slowmo });
    // baseURL lets navigateToChapter's `page.goto('/')` resolve (there is no
    // Playwright test config supplying it when run standalone).
    const context = await browser.newContext({ baseURL: flags.url });
    const page = await context.newPage();

    // Get to the game canvas.
    if (flags.chapter) {
      await navigateToChapter(page, flags.chapter, { classified: flags.classified });
    } else {
      await page.goto(flags.url);
    }
    await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => {});
    agent = new GameAgent(page);
    await agent.focusCanvas();
    emit({ cmd: 'ready', ok: true, url: flags.url, chapter: flags.chapter });

    // Source of commands: --script file, inline positional, or stdin.
    let lines: string[] | null = null;
    if (flags.script) lines = fs.readFileSync(flags.script, 'utf8').split('\n');
    else if (flags.inline) lines = flags.inline.split(/;|\n/);

    if (lines) {
      for (const line of lines) {
        if (!(await runCommand(agent, page, flags, line))) break;
      }
      if (flags.keepOpen) await readStdin(agent, page, flags);
    } else {
      await readStdin(agent, page, flags);
    }
  } finally {
    if (agent) await agent.dispose().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  emit({ cmd: 'fatal', ok: false, error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
