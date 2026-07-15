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
import { Jimp, loadFont } from 'jimp';
import { SANS_10_BLACK } from 'jimp/fonts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { GameAgent, MouseButton, ScreenshotError } from './GameAgent';
import { navigateToChapter, advanceUntil, AdvanceTimeoutError, AdvanceTimeoutDiagnostics } from '../helpers';
import { CHAPTERS } from '../../src/data/chapters';
import type { Beat, ChapterConfig } from '../../src/data/chapters/types';
import type { BridgeBeatTraceEntry, ChapterSceneBridge, DevBridgeWindow } from './DevBridge';
import { classifyBeat } from './beatClassification';
import { checkPlaytestPolicy, parseWatchExpression } from './playtestPolicy';
import { PlaytestCompliance, playtestCompletionVerdict } from './playtestCompliance';
import { PlaytestCoverageTracker } from './playtestCoverage';
import { PlaytestFindingTracker } from './playtestFindings';
import { PlaytestProgressWriter, type PlaytestProgressStatus } from './playtestProgress';
import { deriveCoverageManifest, CoverageManifest } from './coverageManifest';
import {
  checkpointIdentity,
  checkpointTransitions,
  coalesceCheckpointTransitions,
  contactSheetChunks,
  isCheckpointIdentityReady,
  passiveVisualEventKey,
  persistentEvidenceEvent,
  persistentEvidenceMode,
  visualEventsFromBeatTrace,
  type PassiveVisualBeatType,
  type PassiveVisualEvent,
  type CheckpointIdentity,
} from './visualCheckpoint';
import {
  createCheckpointManifest,
  writeCheckpointManifest,
  type CheckpointManifestV1,
} from './checkpointManifest';
import {
  OMEGA_AGENT_PROTOCOL,
  AgentCommand,
  AgentCommandOptions,
  CommandRequest,
  parseAgentCommandLine,
  parseLegacyCommandLine,
} from './protocol';

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
  seed: number | null;
  record: string | null;
  transcript: string | null;
  gauntlet: boolean;
  chapters: string | null;
  shots: boolean;
  maxErrors: number | null;
  checkpoints: boolean;
  coverage: boolean;
  transitions: boolean;
  branches: string | null; // 'all' or a numeric cap, with --gauntlet (G7)
  parallel: number; // concurrent gauntlet workers (G8)
  fuzz: number | null; // seconds of seeded fuzzing (I2)
  gif: string | null; // output path for a session recording (I3)
  gauntletMax: number | null; // hard override for the per-chapter gauntlet timeout budget (H5)
  speed: number | null; // Phaser time/tween/physics timeScale multiplier (H2)
  repl: boolean; // explicit alias for --keep-open's stdin loop, plus a ready signal (C3)
  playtest: boolean; // restrict debug-only mutations and surface bypassed coverage
  playtestSmoke: boolean; // chapter-agnostic playtest-mode advance() sweep, with --gauntlet
  diagnostic: boolean; // controlled scene/beat navigation; never completion evidence
  reuseSafeSave: string | null;
  verbose: boolean;
  allowSkippedPrerequisites: boolean;
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
    seed: null,
    record: null,
    transcript: null,
    gauntlet: false,
    chapters: null,
    shots: false,
    maxErrors: null,
    checkpoints: false,
    coverage: false,
    transitions: false,
    branches: null,
    parallel: 1,
    fuzz: null,
    gif: null,
    gauntletMax: null,
    speed: null,
    repl: false,
    playtest: false,
    playtestSmoke: false,
    diagnostic: false,
    reuseSafeSave: null,
    verbose: false,
    allowSkippedPrerequisites: false,
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
      case '--seed': f.seed = Number(argv[++i]); break;
      case '--record': f.record = argv[++i]; break;
      case '--transcript': f.transcript = argv[++i]; break;
      case '--gauntlet': f.gauntlet = true; break;
      case '--chapters': f.chapters = argv[++i]; break;
      case '--shots': f.shots = true; break;
      case '--coverage': f.coverage = true; break;
      case '--max-errors': f.maxErrors = Number(argv[++i]); break;
      case '--checkpoints': f.checkpoints = true; break;
      case '--transitions': f.transitions = true; break;
      case '--branches': f.branches = argv[++i]; break;
      case '--parallel': f.parallel = Math.max(1, Number(argv[++i]) || 1); break;
      case '--fuzz': f.fuzz = Number(argv[++i]); break;
      case '--gif': f.gif = argv[++i]; break;
      case '--gauntlet-max': f.gauntletMax = Number(argv[++i]); break;
      case '--speed': f.speed = Number(argv[++i]); break;
      case '--repl': f.repl = true; f.keepOpen = true; break;
      case '--playtest': f.playtest = true; break;
      case '--playtest-smoke': f.playtestSmoke = true; break;
      case '--diagnostic': f.diagnostic = true; break;
      case '--reuse-safe-save': f.reuseSafeSave = argv[++i]; break;
      case '--verbose': f.verbose = true; break;
      case '--allow-skipped-prerequisites': f.allowSkippedPrerequisites = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
        positional.push(a);
    }
  }
  if (positional.length) f.inline = positional.join(' ');
  if (f.playtestSmoke && !f.gauntlet) {
    throw new Error('--playtest-smoke requires --gauntlet');
  }
  if (f.diagnostic && f.playtest) {
    throw new Error('--diagnostic cannot be combined with --playtest. Diagnostic evidence is never completion evidence.');
  }
  if (f.diagnostic && f.playtestSmoke) {
    throw new Error('--diagnostic cannot be combined with --playtest-smoke.');
  }
  if (f.diagnostic && f.gauntlet) {
    throw new Error('--diagnostic cannot be combined with --gauntlet.');
  }
  if (f.allowSkippedPrerequisites && !f.diagnostic) {
    throw new Error('--allow-skipped-prerequisites requires --diagnostic.');
  }
  return f;
}

const HELP = `
GameAgent CLI — drive the Phaser game from the terminal.

USAGE
  npm run agent -- [flags] ["command; command; ..."]
  npm run agent -- [flags] --script commands.txt
  <no command>  → reads commands from stdin (one per line; interactive or piped)

FLAGS
  --chapter "<title|id|index>"  Navigate to a chapter after boot (e.g. "The Spotify Family Insurgency")
  --classified          Force-break the chapter-select seal during navigation. Auto-detected from
                         the chapter's config (ChapterConfig.classified or .seal) whenever --chapter
                         resolves to a known chapter, so this flag is only needed for --url-only sessions
                         or a --chapter value that doesn't match anything in src/data/chapters
                         (e.g. a custom deployment)
  --url <url>           Base URL (default http://localhost:3324 — start it with 'npm run dev')
  --out <dir>           Folder for screenshots (default ./agent-artifacts)
  --script <file>       Read commands from a file (one per line; '#' comments allowed)
  --headed              Show the browser window (default headless)
  --slowmo <ms>         Delay every Playwright action by <ms> (visual debugging)
  --keep-open           After running inline/script commands, stay open and read stdin
  --repl                Alias for --keep-open that also emits {"repl":"ready"} once the stdin
                        loop is actually listening, so a driving process knows exactly when it's
                        safe to start writing lines (C3). Same runCommand/JSONL/--record behavior
                        as --keep-open — no parallel implementation, just a ready signal + name.
                        'exit'/'quit'/EOF closes the browser. In --playtest, incomplete visual QA
                        emits session_summary.ok:false and exits nonzero.
  --playtest            Safety mode for autonomous chapter QA, enforced by playtestPolicy.ts's central
                        gate. Blocks eval/injectbeat/modify/direct mode launch/goto, chapterflag writes
                        (complete/uncomplete/freeplay-on/freeplay-off — bare reads still allowed),
                        settings writes (bare reads still allowed), and rejects multi-beat skipbeat
                        (only 'skipbeat 1' is allowed; larger skips throw). Also audits (allows but
                        records) watch predicates (and separately rejects any watch expression that
                        isn't read-only — e.g. '=', '++'/'--', or a compound-assignment operator),
                        loadstate from a file (bare in-memory loadstate stays unaudited), and
                        speed/timescale changes. Marks any skipbeat/winmode/losemode use as a bypass in
                        session_summary's 'bypasses', and lists every audited command in its 'audit'
                        array (both only emitted when --playtest is set). Every visual_checkpoint must
                        be acknowledged with a concrete reviewcheckpoint note; while any checkpoint is
                        pending, state-changing/progression commands are blocked. Incomplete visual QA
                        makes quit/session_summary fail closed. skipbeat cannot bypass a foreground mode,
                        and winmode/losemode require a normal input attempt first. Use with --repl --checkpoints.
  --diagnostic          Controlled localized investigation mode (requires --chapter). Enables 'goto scene' and
                        'goto beat' targets; every artifact is labeled targeted-diagnostic and completion-ineligible.
  --reuse-safe-save <file>  Opt-in restore of a branch-safe save after compatibility fingerprints are checked.
  --verbose              Include full command diagnostics and console deltas in receipts (default output stays compact).
  --allow-skipped-prerequisites
                         (diagnostic only) acknowledge that goto scene/beat skips earlier story side effects.
  --seed <n>            Boot with a seeded Mulberry32 PRNG (replaces Math.random) for determinism
  --record <file>       Record executed commands + inter-command delays to <file>
  --transcript <file>   Mirror every public JSONL receipt (including visual_checkpoint and
                        session_summary) to a durable raw execution trace
  --gauntlet            Run every chapter end-to-end via advanceUntil, report completed/stalled.
                         Each attempt gets a per-chapter timeout budget computed from the chapter's
                         own beat/scene count (base 45s + 0.75s/beat + 20s per minigame/bossFight
                         beat + 10s/scene, capped at 300s unless --gauntlet-max overrides it) instead
                         of one flat number, so short chapters fail fast and finales aren't falsely
                         killed halfway through (H5). The computed budget is included in each
                         chapter's JSONL result as 'timeoutBudget'. On a timeout, the result is
                         classified 'stall: soft-lock' (beatIndex frozen >=10s — likely an engine
                         bug at 'stuckBeatIndex'/'stuckBeatType') vs 'stall: global-timeout' (beats
                         were still advancing when the budget ran out) (H1). A stalled result also
                         carries a 'diagnostics' dump from advanceUntil itself — player vs walkTarget
                         position/distance, movementFrozen, activeMode, dialogue/choice visibility (H3)
  --gauntlet-max <s>    (with --gauntlet) hard override for the per-chapter timeout budget — skips
                         the computed budget and its 300s cap entirely (H5)
  --chapters "<list>"   Comma-separated chapter title/id filter for --gauntlet
  --playtest-smoke      (requires --gauntlet) chapter-agnostic sweep proving the playtest-mode
                         reachWalkControl() classification never dead-ends, instead of driving each
                         chapter to completion via advanceUntil({skipModes:['*']}). Per chapter, loops
                         reachWalkControl (cap 200 iterations, same computed --gauntlet timeout budget):
                         clicks option 0 on choice-present, real-walks (GameAgent.walkTo) on
                         walk-target-present (teleport fallback + 'walkFallbacks' count on failure),
                         force-completes via harnessForceComplete on mode-active, loops on
                         ambient-dialogue, and fails the chapter if walk-control repeats on the same
                         beatIndex 3 times in a row (a beat-driven chapter should always be progressing
                         or stopping on something classified) or reachWalkControl itself times out.
                         Emits one 'playtest_smoke' JSONL line per chapter (statusCounts, expected
                         coverage from deriveCoverageManifest vs what was actually exercised, and a
                         'finding' on failure) plus a final 'playtest_smoke_summary' line; exits
                         non-zero if any chapter failed. --chapters still filters which chapters run.
  --shots               (with --gauntlet) capture a stabilized screenshot per scene + a contact-sheet index.html (N1)
  --max-errors <n>      (with --gauntlet) fail the run if any chapter's console error count exceeds <n>
  --coverage            (with --gauntlet) record which beats/modes/choice branches were exercised;
                         emit a 'coverage' line per chapter and a report under agent-artifacts/gauntlet (G6).
                         Without --branches, choice beats only ever have their first option taken by
                         advanceUntil's auto-driver, so every other branch reports as never-taken.
  --transitions         (with --gauntlet) record the observed beat-index jump graph and diff it against
                         the graph implied by the chapter config; 'unexpectedTransitions' is a routing-bug
                         signal (e.g. the routeOnMinigame gotcha), 'neverTakenEdges' is graph-level coverage (I4)
  --branches all|<n>    (with --gauntlet) replay each chapter once per option of its first choice beat
                         (bounded to <n> options if given instead of 'all') — the only automated way to
                         catch branch-specific breakage (e.g. the historical Ch8 endings bug) (G7)
  --parallel <n>        (with --gauntlet) run up to <n> chapter/branch attempts concurrently, each in its
                         own browser context — only reduces wall-clock, does not change what's tested (G8)
  --fuzz <seconds>      Seeded random key/click/mode-launch mashing for <seconds>, watching console errors;
                         stops and reports on the first new error. Pair with --record for a committed repro
                         script of exactly the actions that crashed it (I2)
  --gif <file>          THE tool for animation/motion bugs (flicker, stalled walk cycles, misaligned
                         frames) — static screenshots can't show these. Captures raw frames for the
                         whole session and assembles them into a GIF at <file> via a system 'ffmpeg'
                         (must be on PATH; soft-fails with frames kept if it's missing) (I3). For a
                         shorter, scoped clip instead of the whole session, use the 'gifstart'/'gifstop'
                         commands below (H6) — do not combine --gif with gifstart/gifstop, they share
                         the same capture and gifstart will error out while --gif is active
  --checkpoints         Auto-capture a stabilized screenshot + emit 'visual_checkpoint' on every
                        chapter/scene/mode transition during a normal (non-gauntlet) session (N3);
                        each PNG gets a versioned JSON manifest sidecar
  --speed <n>           Set Phaser's scene.time/scene.tweens/arcade-physics timeScale to <n> once the
                        chapter scene has booted (via GameAgent.setTimeScale) — applies to both normal
                        sessions and --gauntlet runs (H2). Re-applied on every observed scene-index
                        change (gauntlet only; scene restarts can reset timeScale to 1). Only speeds up
                        Phaser tweens/waits (cameraPan, wait beats) — it does NOT accelerate
                        advanceUntil's own ~150ms polling loop or React-side timers (e.g. the dialogue
                        typewriter), so wall-clock wins are real but sub-linear. Tested stable (--speed
                        1/3/4 always completed) against the heaviest cameraPan/wait chapter in the repo;
                        --speed 5 crashed on one of two repeated runs (page navigation context destroyed
                        mid-evaluate) despite completing the other. Recommended max: 3 — see
                        AGENT_TOOLKIT.md for full numbers.
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
    click <x> <y> [left|right] [--world]   down+up at one point; --world treats x/y as world
                               coordinates (like 'state'/'targets' report) instead of viewport
                               pixels, translated via the same camera math as clickworld (C2)
    drag <sx> <sy> <ex> <ey> [ms] [--world]   smooth click-drag (e.g. drag 200 300 500 300 400);
                               --world treats both points as world coordinates (C2)
  State / bridge (§3)
    state                      print snapshotGameState() JSON (scene, player, velocity, hp, mode, loop)
    text                       extract visible text from Phaser canvas and DOM (A2)
    targets                    dump active walk target and NPCs with screen/world coordinates (A3)
    observe | obs [--shot]     print composite observation snapshot, incl. console errors/warnings since last observe (A5);
                               --shot attaches a stabilized screenshot path as "shot" (N3)
    reviewcheckpoint <id> clear|issue-found|inconclusive <concrete-visual-note>
                               acknowledge that an emitted visual_checkpoint PNG was inspected;
                               vague placeholders are rejected. In --playtest, progression is
                               blocked until every pending checkpoint has a review receipt
    recordfinding              JSON-only: args are severity, category, title, location,
                               reproduction, expected, actual, evidence. Records a structured
                               live finding without editing report prose during the run
    verdict <bug-reproduced|not-reproduced|not-verified|inconclusive> [note]
                               assign the investigation verdict used by the generated report
    dismissfinding <id> <reason>  dismiss a disproven finding while preserving its audit history
    listfindings               print the current structured finding ledger
    diff                       like observe, but omits any field unchanged since the last diff/observe call (N4/E5)
    watch <jsExpr> [timeoutMs] block until a predicate on the live scene is true (scene/game in scope), e.g.
                               watch "scene.activeHp < 50" 10000 — polls ~100ms in one round-trip, attaches a
                               final observation on timeout so the stuck state is visible (N4/E6)
    beat | beats               print current and upcoming narrative beats (A4)
    skipbeat [n]               force-advance n beats (default 1) past one that can never complete normally (A4)
    logs | console [clear]     print buffered console errors/warnings/failed requests since boot or last clear (A1)
    audio                      print playing audio state and master volume (B4)
    audio assert silent | playing <key> | stopped <key>   scriptable audio assertion, ok:false on violation (G3)
    camera                     print camera zoom, center, and dimensions (B5)
    camera zoom <factor>       set camera zoom factor (B5)
    camera center <x> <y>      center camera on world coordinates (B5)
    camera fit                 stop follow, zoom+centerOn the whole current-scene map rect (B5)
    camera follow              restore startFollow(player) at the chapter's configured zoom (B5)
    goto <sceneIndex>          jump to a specific scene index instantly (B1) — mutates, carries a
                               "skipped-state" warning: beats before the target scene didn't run
    savestate [file]           quick-save current state in-memory, or dump to <file> incl. the
                               omega-save-v2 blob and branch-safety metadata if a path is given (B2)
    loadstate [file]           quick-restore in-memory state, or restore + re-navigate from <file> (B2)
    modes                      list every registered minigame mode id (B3)
    winmode | losemode         force-complete the foreground mode via its own harnessForceComplete (B3/F1)
    modify hp|ledger|shards <value>  directly set a stat, bypassing normal game logic (D4) — mutates,
                               carries a "skipped-state" warning
    choose <index|text>        click a dialogue-choice button by index or fuzzy text match (D3)
    settings [key] [value]     print live settings, or patch one key via settings.ts's updateSettings (D2)
    chapterflag [chapterId] [complete|uncomplete|freeplay-on|freeplay-off]   print/set Hall-of-Records
                               progress via settings.ts (F2); omit args to print current progress
    anim                       per-actor animation state: key, frame, isPlaying, flipX (E1)
    depth [worldX worldY]      visible objects sorted by depth; filtered to a world point if given (E2)
    hitreport <worldX> <worldY>  composite of depth + physics bodies + DOM element at a world point (E3)
    fx                         camera flash/fade/shake running state + screen-tint effective alpha (E4)
    walkto <worldX> <worldY> [radius] [maxSeconds]  cheap directional walk (hold + re-evaluate), no
                               pathfinding — stops in radius or gives up with ok:false (D1) — mutates
    injectbeat <json>          execute one beat object through the engine's own dispatch (F3) — mutates
    clickworld <x> <y> [left|right]   convert world coords to viewport pixels and click there (B6)
    where <x> <y>              print both world and viewport-pixel coordinates for a world point (B6)
    eval <js>                  run JS in the page, print the result (e.g. eval window.__OMEGA_GAME__.scene.keys.length)
    screenshot [name] [--annotate]  save a PNG to --out, print its path; --annotate draws each visible
                               actor's bounding box + name + depth, and the walk target, onto the image (N3)
    gifstart                  begin a scoped GIF capture mid-session (H6) — for verifying animation/
                               motion bugs (flicker, stalled walk cycles, misaligned frames) over just
                               the window you care about, instead of the whole session (see --gif).
                               Errors (ok:false) instead of crashing if --gif is already capturing the
                               whole session, or a gifstart capture is already running — mutates
    gifstop [file]             stop a gifstart capture and assemble it into a GIF, printing the path.
                               <file> is resolved under --out; omitted defaults to a timestamped
                               'gif-<timestamp>.gif'. Errors (ok:false) if no gifstart capture is
                               running. Same ffmpeg-on-PATH soft-fail behavior as --gif (frames are
                               kept on disk if ffmpeg is missing or fails) — mutates
  Time (§4)
    pause | resume             sleep / wake the Phaser loop
    loop                       print whether the loop is running
    restart | refresh          reload the page and re-enter --chapter after a React/Phaser unmount
    step <frames> [fps]        advance exactly <frames> fixed-timestep frames (loop auto-pauses)
    speed | timescale <num>    set timescale multiplier for physics/tweens/timers (B7)
  Debug (C1)
    debug on | off             toggle physics debug graphics
  Flow / misc
    advance [maxSeconds]       skip dialogue/intro until the player has free walk control AND no
                               dialogue line is visible (default 60) (C1). It waits for the first story
                               beat to begin so the chapter's initial boot window is never mistaken for
                               free play. It always stops before auto-selecting a dialogue choice and
                               returns status: 'choice-present'.
                               On timeout, the failure
                               line includes a 'diagnostics' dump (beatIndex/type, player vs
                               walkTarget position + distance, movementFrozen, activeMode, dialogue/
                               choice visibility) (H3)
    advance-to scene <index> [beat <index>]  diagnostic-only helper that reuses advance and real
                               walk input until a requested scene/beat boundary
    wait <ms>                  sleep <ms> of real time
    help                       print this menu
    quit | exit                close the browser and end

OTHER SCRIPTS (no browser needed)
  npm run agent:audit                          static asset audit (C6) — audio/image imports, music
                                                keys, and minigame modeIds referenced by chapters, all
                                                registered/on-disk
  npm run agent:validate-chapter -- [id]       typed chapter linter (H1) — unknown speakers, unreachable
                                                beats, broken goto targets, out-of-bounds walkTo, unknown
                                                mode ids / music keys, missing map.theme (omit id for all)
  npm run agent:write-report -- <report.md> <session.jsonl>
                                                generate the final report once from structured live
                                                findings and the authoritative session summary

OUTPUT
  One JSON line per command on stdout: {"cmd":"...","ok":true, ...result}. Errors are
  {"cmd":"...","ok":false,"error":"..."} and never crash the session. Screenshots are
  written to the --out folder and their absolute path is printed in the result.
  External agents may send JSON lines:
    {"protocol":"omega-agent-v1","cmd_id":"s1","action":"state","args":[]}
  JSON commands emit accepted, then completed/failed with the same cmd_id. Options:
    snapshot:"after", annotate:true, telemetry:true, console_delta:true

EXAMPLES
  # Load a chapter, walk to control, hold W for 2s, dump state + a screenshot
  npm run agent -- --chapter "The Spotify Family Insurgency" "advance; press w 2000; state; screenshot walked.png"

  # Pipe a script
  printf 'advance\\nhold d\\nstep 30\\nstate\\nrelease d\\n' | npm run agent -- --chapter "The Spotify Family Insurgency"

  # Interactive REPL (type commands, watch the --headed window)
  npm run agent -- --chapter "The Spotify Family Insurgency" --headed --keep-open
`;

// ── Command execution ─────────────────────────────────────────────────────────

let recordStream: fs.WriteStream | null = null;
let transcriptStream: fs.WriteStream | null = null;
let lastCommandTime = Date.now();
let emitSink: ((obj: Record<string, unknown>) => void) | null = null;
const playtestBypasses: { command: string; reason: string; timestamp: number }[] = [];
type InvestigationVerdict = 'bug-reproduced' | 'not-reproduced' | 'not-verified' | 'inconclusive';
let investigationVerdict: InvestigationVerdict = 'inconclusive';
let investigationNote: string | null = null;
let lastProtocolCommandId: string | null = null;
let protocolInFlight = false;
// Commands that were allowed to run under --playtest but are worth surfacing
// in session_summary (e.g. a read-only watch predicate, or a time-scale
// change) — distinct from playtestBypasses, which is only ever a genuine
// bypass of untested content (skipbeat/winmode/losemode).
const playtestAudit: { command: string; note: string; timestamp: number }[] = [];
const playtestCompliance = new PlaytestCompliance();
const playtestCoverage = new PlaytestCoverageTracker();
const playtestFindings = new PlaytestFindingTracker();
let playtestProgress: PlaytestProgressWriter | null = null;

function emit(obj: Record<string, unknown>): void {
  if (emitSink) {
    emitSink(obj);
    return;
  }
  const line = JSON.stringify(obj) + '\n';
  process.stdout.write(line);
  transcriptStream?.write(line);
}

function recordPlaytestBypass(flags: Flags, command: string, reason: string): Record<string, unknown> {
  if (!flags.playtest) return {};
  playtestBypasses.push({ command, reason, timestamp: Date.now() });
  playtestCoverage.recordBypass(command);
  return {
    playtest_integrity: 'partially-bypassed',
    bypasses: [...playtestBypasses],
  };
}

/**
 * Condition used by `advance`: scene booted, player spawned, not frozen, AND
 * no dialogue line currently visible (C1). Chapters whose opening dialogue
 * doesn't freeze movement used to satisfy the old (weaker) condition while
 * the first line was still typing, so `advance` returned with a dialogue box
 * still on screen — this closes that gap using the same `p.font-pixel` +
 * `offsetParent` check `advanceUntil` itself uses to decide whether to press
 * Space.
 *
 * The ChapterScene starts its first beat after a short delayed call. Track that
 * the story has actually started before accepting a dialogue-free frame as
 * walk control; otherwise a playtester can be returned during the boot window
 * before the first dialogue mounts.
 */
async function reachWalkControl(
  page: Page,
  maxSeconds: number,
  options: {
    onTick?: (info: {
      sceneIndex: number | null;
      mode: string | null;
      beatIndex: number | null;
      beatType: string | null;
      background: boolean;
      modeKind: 'foreground' | 'background' | null;
    }) => Promise<void>;
  } = {},
): Promise<{
  status:
    | 'walk-control'
    | 'choice-present'
    | 'walk-target-present'
    | 'mode-active'
    | 'ambient-dialogue'
    | 'chapter-ended';
  modeId?: string | null;
  beat?: { index: number | null; type: string | null; expectation: string | null };
}> {
  let storyStarted = false;
  // Distinguishes *why* the condition below returned true: normal walk
  // control reached vs. the ambient-dialogue bailout tripping. advanceUntil
  // only ever reports back 'condition-met' for either case, so this closure
  // flag is how the two are told apart afterward (same pattern the earlier,
  // since-removed ambient bailout used).
  let exitReason: 'walk-control' | 'ambient-dialogue' | null = null;
  // Ticks since the very first observation, used only for the free-play
  // escape below (distinct from ambientTicks, which counts *consecutive*
  // ambient-dialogue ticks and resets whenever that pattern breaks).
  let ticksSoFar = 0;
  let ambientTicks = 0;

  const result = await advanceUntil(
    page,
    () =>
      page.evaluate(() => {
        const s = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene(
          'ChapterScene',
        );
        const walkOk = !!(s && s.levelStarted && s.player && !s.movementFrozen);
        const line = document.querySelector('p.font-pixel') as HTMLElement | null;
        const dialogueVisible = !!(line && line.offsetParent !== null);
        const choicePresent = document.querySelectorAll('[data-testid="dialogue-choice"]').length > 0;
        const walkTargetPresent = !!s?.walkTarget;
        const foregroundModeActive = !!(
          s?.activeMode &&
          s.activeModeBeatIndex === s.beatIndex &&
          s.activeModeBackground !== true
        );
        // runEndChapter() doesn't freeze movement, so without this the generic
        // walk-control acceptance below can win the per-tick race against
        // advanceUntil's stopOnChapterEnd check and report `walk-control`
        // while sitting on the terminal beat.
        const chapterEnded =
          (s?.chapter?.beats?.[s.beatIndex ?? -1]?.type ?? null) === 'endChapter';
        const storyActive = !!(s?.beatActive || s?.dialogueOpen || choicePresent || s?.movementFrozen);
        return { walkOk, dialogueVisible, choicePresent, walkTargetPresent, foregroundModeActive, chapterEnded, storyActive };
      }).then(({ walkOk, dialogueVisible, choicePresent, walkTargetPresent, foregroundModeActive, chapterEnded, storyActive }) => {
        // Never let the generic flow helper consume a branch, walk objective,
        // blocking mode, or the terminal beat — the interaction step inside
        // advanceUntil classifies each of those into its named status.
        if (choicePresent || walkTargetPresent || foregroundModeActive || chapterEnded) return false;
        storyStarted ||= storyActive;
        ticksSoFar++;

        if (storyStarted && walkOk && !dialogueVisible) {
          exitReason = 'walk-control';
          return true;
        }

        // Free-play escape: chapters that boot straight into free play never
        // raise a `storyActive` signal (no dialogue/choice/frozen movement
        // ever observed), so the check above would otherwise never fire and
        // `advance` would hang for the full timeout. Accept walk control once
        // ~5 seconds (33 ticks at 150ms) have passed with no story start and
        // the player is free to move with nothing on screen to read.
        if (!storyStarted && ticksSoFar >= 33 && walkOk && !dialogueVisible) {
          exitReason = 'walk-control';
          return true;
        }

        // Bounded ambient-dialogue bailout: reinstated (more strictly than
        // before) for chapters with looping ambient dialogue over otherwise-free
        // walk control. Only counts ticks that can't possibly be a pending
        // choice or walk target (both already excluded above), so this can
        // never swallow one of those.
        if (storyStarted && walkOk && dialogueVisible && !choicePresent && !walkTargetPresent) {
          ambientTicks++;
          if (ambientTicks >= 5) {
            exitReason = 'ambient-dialogue';
            return true;
          }
        } else {
          ambientTicks = 0;
        }

        return false;
      }),
    {
      maxSeconds,
      stopOnChoice: true,
      stopOnWalkTarget: true,
      stopOnMode: true,
      stopOnChapterEnd: true,
      onTick: options.onTick,
    },
  );

  const beatInfo = await page.evaluate(() => {
    const s = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    const beatIndex = typeof s?.beatIndex === 'number' ? s.beatIndex : null;
    const beat = beatIndex !== null ? s?.chapter?.beats?.[beatIndex] : undefined;
    return {
      beatIndex,
      beatType: (beat?.type as string | undefined) ?? null,
      background: !!beat?.background,
    };
  });
  const beat = {
    index: beatInfo.beatIndex,
    type: beatInfo.beatType,
    expectation: classifyBeat(beatInfo.beatType, { background: beatInfo.background }),
  };

  if (result.status === 'choice-present') return { status: 'choice-present', beat };
  if (result.status === 'walk-target-present') return { status: 'walk-target-present', beat };
  if (result.status === 'mode-active') return { status: 'mode-active', modeId: result.modeId, beat };
  if (result.status === 'chapter-ended') return { status: 'chapter-ended', beat };
  // 'condition-met': disambiguate via exitReason set inside the condition above.
  return { status: exitReason ?? 'walk-control', beat };
}

let screenshotCount = 0;

async function diagnosticGotoBeat(page: Page, target: string, allowSkippedPrerequisites: boolean): Promise<{
  sceneIndex: number;
  beatIndex: number;
  beatId: string | null;
  beatType: string | null;
  prerequisiteWarning: string | null;
}> {
  return page.evaluate(({ rawTarget, allowSkippedPrerequisites }) => {
    const game = (window as unknown as DevBridgeWindow).__OMEGA_GAME__;
    const scene = game?.scene.getScene('ChapterScene');
    if (!scene) throw new Error('ChapterScene not found');
    const beats = scene.chapter?.beats ?? [];
    const numeric = /^\d+$/.test(rawTarget) ? Number(rawTarget) : null;
    const matches = numeric !== null
      ? (Number.isInteger(numeric) && numeric >= 0 && numeric < beats.length ? [numeric] : [])
      : beats.flatMap((beat, index) => beat.id === rawTarget ? [index] : []);
    if (matches.length === 0) throw new Error(`Diagnostic beat target not found: ${rawTarget}`);
    if (matches.length > 1) throw new Error(`Diagnostic beat target is ambiguous: ${rawTarget}`);
    const beatIndex = matches[0];
    if (beatIndex > 0 && !allowSkippedPrerequisites) {
      throw new Error('DIAGNOSTIC_PREREQUISITE_REQUIRED: goto beat skips earlier actor, flag, ledger, and mode side effects. Re-run with --allow-skipped-prerequisites to acknowledge.');
    }
    const beat = beats[beatIndex];
    if (typeof scene.restoreBeat !== 'function') {
      throw new Error('DIAGNOSTIC_PREREQUISITE_UNAVAILABLE: ChapterScene restoreBeat bridge is unavailable.');
    }
    scene.restoreBeat(beatIndex);
    const warning = beatIndex > 0
      ? 'skipped-state: beats before this target did not run; prerequisite actor/flag/ledger state may be absent'
      : null;
    return {
      sceneIndex: typeof scene.currentSceneIndex === 'number' ? scene.currentSceneIndex : 0,
      beatIndex,
      beatId: typeof beat.id === 'string' ? beat.id : null,
      beatType: typeof beat.type === 'string' ? beat.type : null,
      prerequisiteWarning: warning,
    };
  }, { rawTarget: target, allowSkippedPrerequisites });
}

async function advanceToDiagnosticTarget(
  agent: GameAgent,
  page: Page,
  targetScene: number,
  targetBeat: string | null,
): Promise<Record<string, unknown>> {
  const resolvedBeat = targetBeat === null ? null : await page.evaluate((raw) => {
    const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    const beats = scene?.chapter?.beats ?? [];
    const numeric = /^\d+$/.test(raw) ? Number(raw) : null;
    const matches = numeric !== null ? (numeric >= 0 && numeric < beats.length ? [numeric] : []) : beats.flatMap((beat, index) => beat.id === raw ? [index] : []);
    if (matches.length !== 1) throw new Error(`Diagnostic beat target ${matches.length === 0 ? 'not found' : 'is ambiguous'}: ${raw}`);
    return matches[0];
  }, targetBeat);
  for (let iteration = 0; iteration < 200; iteration++) {
    const current = await readCurrentBeatInfo(page);
    const sceneReached = current.sceneIndex === targetScene;
    const beatReached = resolvedBeat === null || current.beatIndex === resolvedBeat;
    if (sceneReached && beatReached) return { status: 'target-reached', iteration, state: await agent.snapshotGameState() };
    const result = await reachWalkControl(page, 60);
    if (result.status === 'choice-present' || result.status === 'mode-active' || result.status === 'chapter-ended') {
      return { status: result.status, iteration, beat: result.beat, state: await agent.snapshotGameState() };
    }
    if (result.status === 'walk-target-present') {
      const target = await page.evaluate(() => {
        const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.walkTarget ? { x: scene.walkTarget.x, y: scene.walkTarget.y, radius: scene.walkTarget.radius ?? 24 } : null;
      });
      if (!target) continue;
      const walked = await agent.walkTo(target.x, target.y, target.radius, 20);
      await agent.resumeLoop().catch(() => {});
      if (!walked.ok) return { status: 'walk-failed', iteration, state: await agent.snapshotGameState() };
    }
  }
  throw new Error('advance-to timed out after 200 iterations');
}

// ── N3: visual checkpoints for a normal (non-gauntlet) session ────────────
// Auto-captures a stabilized screenshot + emits a `visual_checkpoint` JSONL
// line whenever the active scene/mode identity changes, so the multimodal
// driver sees a fresh image at the moments visual bugs actually appear
// without deciding to screenshot itself. Detection reads scene/mode identity
// off the live bridge (dev-only) rather than patching game code to emit
// events (cross-cutting rule 3). Gated behind --checkpoints; off by default
// for scripted/inline sessions where every extra screenshot costs wall time.
let checkpointCount = 0;
let lastCheckpointState: CheckpointIdentity | null = null;

type PassiveEvidenceStatus = 'captured' | 'missed';

interface PassiveEvidenceRecord {
  status: PassiveEvidenceStatus;
  evidence: 'live' | 'post-advance' | 'missed';
  path?: string;
}

interface PassiveEvidenceFrame {
  path: string;
  label: string;
}

const SUSTAINED_PASSIVE_TYPES = new Set<PassiveVisualBeatType>([
  'cameraPan',
  'moveActor',
  'chase',
  'screenTint',
]);
const PERSISTENT_PASSIVE_TYPES = new Set<PassiveVisualBeatType>([
  'hideActor',
  'showActor',
  'ledger',
]);
const passiveEvidence = new Map<string, PassiveEvidenceRecord>();
let passiveSourceCount = 0;
let passiveContactCount = 0;
const checkpointFrames: PassiveEvidenceFrame[] = [];
let lastDeliveredBeatTraceSequence = 0;

function resetPassiveEvidence(): void {
  passiveEvidence.clear();
  passiveSourceCount = 0;
  passiveContactCount = 0;
  lastDeliveredBeatTraceSequence = 0;
  checkpointFrames.length = 0;
}

function passiveLabel(event: Pick<PassiveVisualEvent, 'sceneIndex' | 'beatIndex' | 'beatType'>): string {
  return `scene ${event.sceneIndex} beat ${event.beatIndex} ${event.beatType}`;
}

function safeArtifactName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'visual';
}

async function readCheckpointIdentity(page: Page): Promise<CheckpointIdentity | null> {
  const probe = await page
    .evaluate(() => {
      const game = (window as unknown as DevBridgeWindow).__OMEGA_GAME__;
      if (!game) return null;
      const chapterScene = game.scene.getScene('ChapterScene');
      const active = game.scene.getScenes(true);
      if (!chapterScene || !active.includes(chapterScene)) return null;
      const configuredKey = (chapterScene as { sys?: { settings?: { key?: unknown } } }).sys?.settings?.key;
      return {
        sceneKey: typeof configuredKey === 'string' ? configuredKey : 'ChapterScene',
        sceneIndex: typeof chapterScene?.currentSceneIndex === 'number' ? chapterScene.currentSceneIndex : null,
        activeModeId: chapterScene?.activeMode?.id ?? null,
        activeModeBeatIndex: typeof chapterScene?.activeModeBeatIndex === 'number'
          ? chapterScene.activeModeBeatIndex
          : null,
        activeModeBackground: chapterScene?.activeModeBackground === true,
      };
    })
    .catch(() => null);
  if (!probe) return null;
  const identity = checkpointIdentity(probe);
  return isCheckpointIdentityReady(identity) ? identity : null;
}

/** Read the runtime fields that make a visual checkpoint auditable. This stays
 * structural and dev-only: the browser owns the canonical chapter/map config. */
async function readCheckpointManifestContext(page: Page): Promise<{
  chapter: { id: string; title: string };
  scene: { index: number; name: string | null; key: string | null };
  beat: { index: number | null; id: string | null; type: string | null };
  player: { x: number; y: number } | null;
  camera: CheckpointManifestV1['camera'];
  map: CheckpointManifestV1['map'];
} | null> {
  return page.evaluate(() => {
    const game = (window as unknown as DevBridgeWindow).__OMEGA_GAME__;
    const scene = game?.scene.getScene('ChapterScene') as ChapterSceneBridge | undefined;
    const activeScenes = game?.scene.getScenes(true) ?? [];
    if (!game || !scene || !activeScenes.includes(scene)) return null;
    const top = activeScenes[activeScenes.length - 1];
    const chapter = scene.chapter as Record<string, unknown> | undefined;
    const sceneIndex = typeof scene.currentSceneIndex === 'number' ? scene.currentSceneIndex : 0;
    const beats = Array.isArray(chapter?.beats) ? chapter.beats as Array<Record<string, unknown>> : [];
    const beatIndex = typeof scene.beatIndex === 'number' ? scene.beatIndex : null;
    const beat = beatIndex !== null ? beats[beatIndex] : undefined;
    const activeConfig = typeof scene.getActiveSceneConfig === 'function'
      ? scene.getActiveSceneConfig()
      : undefined;
    const map = activeConfig?.map;
    const camera = scene.cameras?.main;
    const follow = camera && ((camera as unknown as { _follow?: unknown })._follow ?? (camera as unknown as { followTarget?: unknown }).followTarget);
    const followTarget = follow
      ? follow === scene.player
        ? { kind: 'player' as const, id: null }
        : { kind: 'other' as const, id: null }
      : null;
    return {
      chapter: {
        id: typeof chapter?.id === 'string' ? chapter.id : 'unknown',
        title: typeof chapter?.title === 'string' ? chapter.title : 'Unknown chapter',
      },
      scene: {
        index: sceneIndex,
        name: typeof activeConfig?.map?.areaTitle === 'string'
          ? activeConfig.map.areaTitle
          : typeof chapter?.location === 'string'
            ? chapter.location
            : `Scene ${sceneIndex}`,
        key: top?.sys?.settings?.key ?? null,
      },
      beat: {
        index: beatIndex,
        id: typeof beat?.id === 'string' ? beat.id : null,
        type: typeof beat?.type === 'string' ? beat.type : null,
      },
      player: scene.player ? { x: scene.player.x, y: scene.player.y } : null,
      camera: camera && Number.isFinite(camera.scrollX) && Number.isFinite(camera.scrollY)
        ? {
            scrollX: camera.scrollX,
            scrollY: camera.scrollY,
            zoom: Number.isFinite(camera.zoom) ? camera.zoom : 1,
            width: camera.width,
            height: camera.height,
            effectiveViewport: {
              x: camera.scrollX,
              y: camera.scrollY,
              width: camera.zoom ? camera.width / camera.zoom : camera.width,
              height: camera.zoom ? camera.height / camera.zoom : camera.height,
            },
            followTarget,
          }
        : null,
      map: {
        theme: typeof map?.theme === 'string' ? map.theme : null,
        noNatureScatter: map?.noNatureScatter === true,
        bounds: typeof map?.width === 'number' && typeof map?.height === 'number'
          ? { x: 0, y: 0, width: map.width, height: map.height }
          : null,
      },
    };
  }).catch(() => null);
}

async function writeCheckpointManifestForImage(
  page: Page,
  flags: Flags,
  checkpointId: number,
  imagePath: string,
  reason: string,
  reasons: string[],
  transitions: unknown[],
  mode: CheckpointManifestV1['mode'],
  sourceFramePaths: string[] = [],
  settling: CheckpointManifestV1['settling'] = {
    strategy: 'phaser-stable-frames-v1', framesObserved: 0, elapsedMs: 0, timedOut: false,
  },
  commandId: string | null = lastProtocolCommandId,
): Promise<string | null> {
  const context = await readCheckpointManifestContext(page);
  if (!context) return null;
  const manifest = createCheckpointManifest({
    checkpointId,
    evidenceClass: flags.diagnostic ? 'targeted-diagnostic' : flags.playtest ? 'natural-playtest' : 'debug',
    completionEligible: flags.playtest && !flags.diagnostic,
    commandId,
    imagePath: path.resolve(imagePath),
    sourceFramePaths: sourceFramePaths.map((source) => path.resolve(source)),
    chapter: context.chapter,
    scene: context.scene,
    beat: context.beat,
    player: context.player,
    camera: context.camera,
    map: context.map,
    mode,
    trigger: { reason, reasons, transitions },
    settling,
  });
  return writeCheckpointManifest(manifest);
}

async function readBeatTrace(page: Page): Promise<BridgeBeatTraceEntry[]> {
  return page
    .evaluate(() => {
      const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      return Array.isArray(scene?.playtestBeatTrace) ? scene.playtestBeatTrace : [];
    })
    .catch(() => []);
}

async function readCurrentBeatInfo(page: Page): Promise<{
  sceneIndex: number | null;
  beatIndex: number | null;
  beatType: string | null;
}> {
  return page
    .evaluate(() => {
      const scene = (window as unknown as DevBridgeWindow).__OMEGA_GAME__?.scene.getScene('ChapterScene');
      const beatIndex = typeof scene?.beatIndex === 'number' ? scene.beatIndex : null;
      const beat = beatIndex !== null ? scene?.chapter?.beats?.[beatIndex] : undefined;
      return {
        sceneIndex: typeof scene?.currentSceneIndex === 'number' ? scene.currentSceneIndex : null,
        beatIndex,
        beatType: (beat?.type as string | undefined) ?? null,
      };
    })
    .catch(() => ({ sceneIndex: null, beatIndex: null, beatType: null }));
}

async function updatePlaytestProgress(
  page: Page,
  flags: Flags,
  status: PlaytestProgressStatus = 'running',
) {
  if (!flags.playtest || !playtestProgress) return null;
  try {
    const current = await readCurrentBeatInfo(page);
    return playtestProgress.update({
      currentBeat: current.beatIndex,
      coverage: playtestCoverage.summary(),
      visualQa: playtestCompliance.summary(flags.checkpoints),
      findings: playtestFindings.summary(),
      status,
    });
  } catch (err) {
    // Progress is a monitoring convenience, not authority. Report one failure
    // and disable further writes so an unwritable output directory cannot
    // interrupt the playtest or suppress its final session_summary.
    playtestProgress = null;
    emit({
      cmd: 'playtest_progress',
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ...(err instanceof ScreenshotError
        ? { screenshot: { code: err.code, path: err.artifactPath, expectedMime: 'image/png', actualMime: err.actualMime, remediation: err.remediation } }
        : {}),
    });
    return null;
  }
}

function traceEntriesAfter(trace: BridgeBeatTraceEntry[], sequence: number): BridgeBeatTraceEntry[] {
  return trace.filter(entry => entry.sequence > sequence);
}

class PassiveEvidenceCollector {
  private readonly frames: PassiveEvidenceFrame[] = [];
  private readonly missed: PassiveVisualEvent[] = [];

  constructor(
    private readonly agent: GameAgent,
    private readonly flags: Flags,
  ) {}

  async observeTick(info: {
    sceneIndex: number | null;
    beatIndex: number | null;
    beatType: string | null;
  }): Promise<void> {
    if (!this.flags.checkpoints || info.sceneIndex === null || info.beatIndex === null || !info.beatType) return;
    if (!(SUSTAINED_PASSIVE_TYPES as Set<string>).has(info.beatType)) return;
    const event = {
      sceneIndex: info.sceneIndex,
      beatIndex: info.beatIndex,
      beatType: info.beatType as PassiveVisualBeatType,
    };
    const key = passiveVisualEventKey(event);
    if (passiveEvidence.has(key)) return;

    const file = path.resolve(
      this.flags.out,
      `passive-source-${String(++passiveSourceCount).padStart(3, '0')}-${safeArtifactName(passiveLabel(event))}.png`,
    );
    fs.mkdirSync(this.flags.out, { recursive: true });
    try {
      await this.agent.liveScreenshot(file);
      passiveEvidence.set(key, { status: 'captured', evidence: 'live', path: file });
      this.frames.push({ path: file, label: passiveLabel(event) });
    } catch {
      passiveEvidence.set(key, { status: 'missed', evidence: 'missed' });
      this.missed.push({ ...event, captureMissed: true, evidence: 'missed' });
    }
  }

  async finish(
    entries: BridgeBeatTraceEntry[],
    activeSceneIndex: number | null,
  ): Promise<{ events: PassiveVisualEvent[]; frames: PassiveEvidenceFrame[]; missed: PassiveVisualEvent[] }> {
    const events = visualEventsFromBeatTrace(entries);
    if (!this.flags.checkpoints) return { events, frames: this.frames, missed: this.missed };
    const persistent = events.filter(event => PERSISTENT_PASSIVE_TYPES.has(event.beatType));
    const uncapturedPersistent = persistent.filter(
      event => !passiveEvidence.has(passiveVisualEventKey(event)) &&
        persistentEvidenceMode(event, activeSceneIndex) === 'post-advance',
    );

    if (uncapturedPersistent.length > 0) {
      const file = path.resolve(
        this.flags.out,
        `passive-source-${String(++passiveSourceCount).padStart(3, '0')}-post-advance.png`,
      );
      fs.mkdirSync(this.flags.out, { recursive: true });
      try {
        await this.agent.liveScreenshot(file);
        const label = `post-advance: ${uncapturedPersistent.map(passiveLabel).join(', ')}`;
        this.frames.push({ path: file, label });
        for (const event of uncapturedPersistent) {
          passiveEvidence.set(passiveVisualEventKey(event), { status: 'captured', evidence: 'post-advance', path: file });
        }
      } catch {
        for (const event of uncapturedPersistent) {
          passiveEvidence.set(passiveVisualEventKey(event), { status: 'missed', evidence: 'missed' });
          this.missed.push({ ...event, captureMissed: true, evidence: 'missed' });
        }
      }
    }

    for (const event of events) {
      const key = passiveVisualEventKey(event);
      let record = passiveEvidence.get(key);
      if (!record) {
        // A scene transition may have produced a perfectly valid checkpoint,
        // but that image belongs to the new scene and cannot prove an effect
        // that started in the old one. Never turn that boundary into evidence.
        const marked = PERSISTENT_PASSIVE_TYPES.has(event.beatType)
          ? persistentEvidenceEvent(event, activeSceneIndex)
          : { ...event, captureMissed: true, evidence: 'missed' as const };
        record = { status: 'missed', evidence: 'missed' };
        passiveEvidence.set(key, record);
        this.missed.push(marked);
      }
      if (record.status === 'missed') {
        event.captureMissed = true;
        event.evidence = 'missed';
      } else {
        event.evidence = record.evidence;
      }
    }

    return { events, frames: this.frames, missed: this.missed };
  }
}

async function writePassiveContactSheet(
  flags: Flags,
  frames: PassiveEvidenceFrame[],
  prefix = 'passive-contact',
): Promise<string> {
  const tileWidth = 400;
  const tileHeight = 225;
  const labelHeight = 28;
  const columns = Math.min(3, frames.length);
  const rows = Math.ceil(frames.length / columns);
  const sheet = new Jimp({
    width: columns * tileWidth,
    height: rows * (tileHeight + labelHeight),
    color: 0xffffffff,
  });
  const font = await loadFont(SANS_10_BLACK);
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index];
    const image = await Jimp.read(frame.path);
    image.resize({ w: tileWidth, h: tileHeight });
    const x = (index % columns) * tileWidth;
    const y = Math.floor(index / columns) * (tileHeight + labelHeight);
    sheet.print({ x: x + 4, y: y + 4, text: frame.label, font });
    sheet.composite(image, x, y + labelHeight);
  }
  fs.mkdirSync(flags.out, { recursive: true });
  const file = path.resolve(flags.out, `${prefix}-${String(++passiveContactCount).padStart(3, '0')}.png`);
  await sheet.write(file as `${string}.${string}`);
  return file;
}

async function emitPassiveEvidence(
  page: Page,
  flags: Flags,
  result: { events: PassiveVisualEvent[]; frames: PassiveEvidenceFrame[]; missed: PassiveVisualEvent[] },
  current: CheckpointIdentity | null,
): Promise<void> {
  if (!flags.checkpoints || result.frames.length === 0) return;
  const chunks = contactSheetChunks(result.frames);
  for (const chunk of chunks) {
    const pathName = chunk.length === 1 ? chunk[0].path : await writePassiveContactSheet(flags, chunk);
    const checkpointId = ++checkpointCount;
    const captureMissed = result.missed.length > 0;
    const manifestPath = await writeCheckpointManifestForImage(
      page,
      flags,
      checkpointId,
      pathName,
      `passive visual evidence: ${chunk.map(frame => frame.label).join(', ')}`,
      [`passive visual evidence: ${chunk.map(frame => frame.label).join(', ')}`],
      [],
      null,
      chunk.map(frame => frame.path),
    );
    const passiveContext = await readCheckpointManifestContext(page);
    emit({
      cmd: 'visual_checkpoint',
      ok: true,
      checkpointId,
      path: pathName,
      manifestPath,
      reason: `passive visual evidence: ${chunk.map(frame => frame.label).join(', ')}`,
      sceneKey: current?.sceneKey ?? null,
      sceneIndex: current?.sceneIndex ?? null,
      sceneName: passiveContext?.scene.name ?? null,
      beatIndex: passiveContext?.beat.index ?? null,
      beatId: passiveContext?.beat.id ?? null,
      beatType: passiveContext?.beat.type ?? null,
      mode: null,
      modeKind: null,
      modeBeatIndex: null,
      passive: true,
      captureMissed,
      missedEvents: captureMissed ? result.missed : [],
      sourceFrames: chunk,
      review_required: flags.playtest,
      review_command: `reviewcheckpoint ${checkpointId} clear|issue-found|inconclusive <observation-note>`,
    });
    playtestCompliance.captureCheckpoint(checkpointId, current?.foregroundModeId ?? null, null);
    playtestCoverage.recordCheckpoint(checkpointId, current?.sceneIndex ?? null, []);
  }
}

async function emitCheckpointContactSheet(flags: Flags): Promise<void> {
  if (!flags.checkpoints || checkpointFrames.length < 2) return;
  try {
    const file = await writePassiveContactSheet(flags, checkpointFrames, 'checkpoint-contact');
    emit({ cmd: 'checkpoint_contact_sheet', ok: true, path: file, sourceFrames: checkpointFrames });
  } catch (error) {
    emit({ cmd: 'checkpoint_contact_sheet', ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

async function maybeEmitCheckpoint(agent: GameAgent, page: Page, flags: Flags): Promise<void> {
  if (!flags.checkpoints) return;
  const current = await readCheckpointIdentity(page);
  if (!current) return;

  const transitions = checkpointTransitions(lastCheckpointState, current);
  lastCheckpointState = current;
  if (transitions.length === 0) return;

  fs.mkdirSync(flags.out, { recursive: true });
  const checkpointId = ++checkpointCount;
  const file = path.resolve(flags.out, `checkpoint-${String(checkpointId).padStart(3, '0')}.png`);
  const receipt = coalesceCheckpointTransitions(transitions);
  const complianceModeKind = transitions.some(transition => transition.modeKind === 'foreground')
    ? 'foreground'
    : transitions.some(transition => transition.modeKind === 'background')
      ? 'background'
      : null;
  const receiptFields = {
    reason: receipt.reason,
    reasons: receipt.reasons,
    transitions: receipt.transitions,
    sceneKey: current.sceneKey,
    sceneIndex: current.sceneIndex,
    mode: receipt.modeId,
    modeKind: receipt.modeKind,
    modeBeatIndex: receipt.modeBeatIndex,
    foregroundModeId: current.foregroundModeId,
    foregroundModeBeatIndex: current.foregroundModeBeatIndex,
    backgroundModeId: current.backgroundModeId,
    backgroundModeBeatIndex: current.backgroundModeBeatIndex,
  };
  try {
    // All transitions observed in this poll describe one rendered state. Take
    // one image and attach the complete transition set to that receipt.
    await agent.stabilizedScreenshot(file);
  } catch (err) {
    // A React/Phaser unmount can happen between the bridge probe and the
    // screenshot. Checkpoint capture is diagnostic and must never take down
    // the REPL or hide the original command failure.
    emit({
      cmd: 'visual_checkpoint',
      ok: false,
      checkpointId,
      error: err instanceof Error ? err.message : String(err),
      ...receiptFields,
    });
    return;
  }
  const manifestPath = await writeCheckpointManifestForImage(
    page,
    flags,
    checkpointId,
    file,
    receipt.reason,
    receipt.reasons,
    receipt.transitions,
    receipt.modeId && receipt.modeKind
      ? { id: receipt.modeId, kind: receipt.modeKind, beatIndex: receipt.modeBeatIndex }
      : null,
    [],
    { strategy: 'phaser-stable-frames-v1', ...agent.getLastSettling() },
  );
  const manifestContext = await readCheckpointManifestContext(page);
  emit({
    cmd: 'visual_checkpoint',
    ok: true,
    checkpointId,
    path: file,
    manifestPath,
    ...receiptFields,
    sceneName: manifestContext?.scene.name ?? null,
    beatIndex: manifestContext?.beat.index ?? null,
    beatId: manifestContext?.beat.id ?? null,
    beatType: manifestContext?.beat.type ?? null,
    review_required: flags.playtest,
    review_command: `reviewcheckpoint ${checkpointId} clear|issue-found|inconclusive <observation-note>`,
  });
  checkpointFrames.push({ path: file, label: `checkpoint ${checkpointId}: ${receipt.reason}` });
  // A background checkpoint remains in visual QA, but it is deliberately
  // invisible to the foreground-mode input/bypass state machine.
  playtestCompliance.captureCheckpoint(
    checkpointId,
    current.foregroundModeId,
    complianceModeKind,
  );
  playtestCoverage.recordCheckpoint(checkpointId, current.sceneIndex, receipt.transitions);
}

async function restartSession(page: Page, flags: Flags): Promise<void> {
  resetPassiveEvidence();
  lastCheckpointState = null;
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (!flags.chapter) {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    return;
  }

  const matchedChapter = CHAPTERS.find(
    (c) => c.title.toLowerCase() === flags.chapter!.toLowerCase() || c.id.toLowerCase() === flags.chapter!.toLowerCase(),
  );
  await navigateToChapter(page, matchedChapter?.title ?? flags.chapter, {
    classified: flags.classified || !!matchedChapter?.classified,
    sealed: !!matchedChapter?.seal,
  });
  await page.waitForSelector('canvas', { timeout: 15000 });
}

// ── I3: session-to-GIF ────────────────────────────────────────────────────────
// Captures raw (unstabilized — motion is the point) page.screenshot frames to a
// temp directory for the life of the session, then shells out to a system
// `ffmpeg` to assemble them into a GIF at --gif <file>. No new JS dependency:
// ffmpeg is a much better encoder than anything in package.json (jimp has no
// animated-GIF writer), and this is a dev-only tool, not a CI or runtime path.

let gifFrameDir: string | null = null;
let gifFrameCount = 0;
let gifCapturing = false;
let gifLoopPromise: Promise<void> | null = null;
// H6: distinguishes a whole-session `--gif` capture (finished automatically in
// main()'s `finally`) from a scoped `gifstart`/`gifstop` capture started mid-session
// via a command. Both reuse the exact same module-level frame-loop state above —
// there is only ever one capture in flight at a time (see startGifCapture/
// finishGifCapture, unchanged) — so this flag exists purely to pick the right
// error/cleanup behavior for whichever caller (flag vs command) is in play, not
// to run two captures concurrently.
let gifStartedByCommand = false;

function startGifCapture(page: Page): void {
  gifFrameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-gif-'));
  gifFrameCount = 0;
  gifCapturing = true;
  gifLoopPromise = (async () => {
    while (gifCapturing) {
      const file = path.join(gifFrameDir!, `frame-${String(++gifFrameCount).padStart(5, '0')}.png`);
      await page.screenshot({ path: file }).catch(() => {});
      await new Promise((r) => setTimeout(r, 200));
    }
  })();
}

async function finishGifCapture(outPath: string): Promise<void> {
  gifCapturing = false;
  if (gifLoopPromise) await gifLoopPromise.catch(() => {});
  if (!gifFrameDir || gifFrameCount === 0) {
    emit({ cmd: 'gif', ok: false, error: 'no frames captured' });
    return;
  }
  const check = spawnSync('ffmpeg', ['-version']);
  if (check.error || check.status !== 0) {
    emit({ cmd: 'gif', ok: false, error: `ffmpeg not found on PATH — ${gifFrameCount} frames kept at ${gifFrameDir}` });
    return;
  }
  const resolved = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const result = spawnSync('ffmpeg', [
    '-y',
    '-framerate', '5',
    '-i', path.join(gifFrameDir, 'frame-%05d.png'),
    '-vf', 'fps=8,scale=480:-1:flags=lanczos',
    resolved,
  ]);
  if (result.status !== 0) {
    emit({
      cmd: 'gif',
      ok: false,
      error: `ffmpeg failed — ${gifFrameCount} frames kept at ${gifFrameDir}: ${result.stderr?.toString().slice(-500) ?? 'unknown error'}`,
    });
    return;
  }
  fs.rmSync(gifFrameDir, { recursive: true, force: true });
  emit({ cmd: 'gif', ok: true, path: resolved, frames: gifFrameCount });
}

/** Execute one command line. Returns false to signal the session should end. */
async function runCommand(
  agent: GameAgent,
  page: Page,
  flags: Flags,
  input: string | CommandRequest,
): Promise<boolean> {
  const request = typeof input === 'string' ? parseLegacyCommandLine(input) : input;
  if (!request) return true;

  if (
    recordStream &&
    !request.sourceLine.startsWith('replay') &&
    !request.sourceLine.startsWith('quit') &&
    !request.sourceLine.startsWith('exit')
  ) {
    const now = Date.now();
    const delta = now - lastCommandTime;
    if (delta > 10) {
      recordStream.write(`wait ${delta}\n`);
    }
    recordStream.write(`${request.sourceLine}\n`);
    lastCommandTime = now;
  }

  const verb = request.action;
  const rest = request.rest; // raw remainder (for eval)
  const args = request.args;
  const num = (i: number) => Number(args[i]);
  const btn = (v: string | undefined): MouseButton => (v === 'right' ? 'right' : 'left');

  try {
    if (flags.playtest) {
      playtestCompliance.assertCommandAllowed(verb, args);
      const decision = checkPlaytestPolicy(verb, args, rest);
      if (decision.kind === 'blocked') {
        throw new Error(decision.error);
      }
      if (decision.kind === 'audited') {
        playtestAudit.push({ command: verb, note: decision.note, timestamp: Date.now() });
      }
      if (verb === 'skipbeat' || verb === 'winmode' || verb === 'losemode') {
        playtestCompliance.assertBypassAllowed(verb);
      }
    }

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
      case 'click': {
        // C2: --world lets click take world coordinates (the same ones
        // `state`/`targets` report) instead of requiring the caller to
        // mentally invert the camera zoom/scroll math. Strip the flag before
        // the usual positional parsing so default (viewport) behavior is
        // untouched byte-for-byte when --world is absent.
        const world = args.includes('--world');
        const cargs = args.filter((a) => a !== '--world');
        const cnum = (i: number) => Number(cargs[i]);
        let x = cnum(0);
        let y = cnum(1);
        if (world) {
          const vp = await agent.worldToViewport(x, y);
          const wx = x;
          const wy = y;
          x = vp.x;
          y = vp.y;
          await agent.mouseDown(x, y, btn(cargs[2]));
          await agent.mouseUp(x, y, btn(cargs[2]));
          emit({ cmd: 'click', ok: true, world: { x: wx, y: wy }, viewport: vp, button: btn(cargs[2]) });
        } else {
          await agent.mouseDown(x, y, btn(cargs[2]));
          await agent.mouseUp(x, y, btn(cargs[2]));
          emit({ cmd: 'click', ok: true, x, y, button: btn(cargs[2]) });
        }
        break;
      }
      case 'drag': {
        const world = args.includes('--world');
        const dargs = args.filter((a) => a !== '--world');
        const dnum = (i: number) => Number(dargs[i]);
        const sx = dnum(0);
        const sy = dnum(1);
        const ex = dnum(2);
        const ey = dnum(3);
        const ms = dargs[4] ? dnum(4) : 400;
        if (world) {
          const startVp = await agent.worldToViewport(sx, sy);
          const endVp = await agent.worldToViewport(ex, ey);
          await agent.dragMouse(startVp.x, startVp.y, endVp.x, endVp.y, ms);
          emit({
            cmd: 'drag',
            ok: true,
            world: { from: [sx, sy], to: [ex, ey] },
            viewport: { from: [startVp.x, startVp.y], to: [endVp.x, endVp.y] },
          });
        } else {
          await agent.dragMouse(sx, sy, ex, ey, ms);
          emit({ cmd: 'drag', ok: true, from: [sx, sy], to: [ex, ey] });
        }
        break;
      }

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
        const annotate = args.includes('--annotate');
        const nameArg = args.find(a => a !== '--annotate');
        const name = nameArg || `shot-${String(++screenshotCount).padStart(3, '0')}.png`;
        const file = path.resolve(flags.out, name);
        if (annotate) await agent.annotateScreenshot(file);
        else await page.screenshot({ path: file });
        emit({ cmd: 'screenshot', ok: true, path: file, annotated: annotate });
        break;
      }
      // H6: scoped animation capture — begins/ends a GIF recording mid-session
      // instead of requiring the whole-session --gif flag, for when you only
      // want to capture a specific moment (e.g. right around a walk cycle or a
      // scene transition) rather than the entire run. Reuses startGifCapture/
      // finishGifCapture verbatim — see the I3 comment block above for the
      // frame-loop + ffmpeg-assembly details.
      case 'gifstart': {
        if (gifCapturing) {
          emit({
            cmd: 'gifstart',
            ok: false,
            error: flags.gif
              ? 'a --gif whole-session capture is already running; gifstart/gifstop cannot run alongside --gif'
              : 'a gif capture is already in progress (call gifstop first)',
          });
          break;
        }
        gifStartedByCommand = true;
        startGifCapture(page);
        emit({ cmd: 'gifstart', ok: true, mutates: true });
        break;
      }
      case 'gifstop': {
        if (!gifCapturing || !gifStartedByCommand) {
          emit({ cmd: 'gifstop', ok: false, error: 'no gifstart capture is in progress' });
          break;
        }
        fs.mkdirSync(flags.out, { recursive: true });
        const outFile = args[0]
          ? path.resolve(flags.out, args[0])
          : path.resolve(flags.out, `gif-${new Date().toISOString().replace(/[:.]/g, '-')}.gif`);
        await finishGifCapture(outFile);
        gifStartedByCommand = false;
        break;
      }

      case 'pause': await agent.pauseLoop(); emit({ cmd: 'pause', ok: true }); break;
      case 'resume': await agent.resumeLoop(); emit({ cmd: 'resume', ok: true }); break;
      case 'loop': emit({ cmd: 'loop', ok: true, running: await agent.isLoopRunning() }); break;
      case 'restart': case 'refresh':
        await agent.releaseAllKeys().catch(() => {});
        await restartSession(page, flags);
        agent.clearConsoleLogs();
        emit({ cmd: verb, ok: true, chapter: flags.chapter, mutates: true });
        break;
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
      case 'observe': case 'obs': {
        const res = await agent.observeComposite();
        let shot: string | undefined;
        if (args.includes('--shot')) {
          fs.mkdirSync(flags.out, { recursive: true });
          shot = path.resolve(flags.out, `observe-shot-${String(++screenshotCount).padStart(3, '0')}.png`);
          await agent.stabilizedScreenshot(shot);
        }
        emit({ cmd: 'observe', ok: true, ...res, ...(shot ? { shot } : {}) });
        break;
      }
      case 'reviewcheckpoint': {
        const checkpointId = num(0);
        if (!Number.isInteger(checkpointId) || checkpointId < 1) {
          throw new Error('Usage: reviewcheckpoint <id> clear|issue-found|inconclusive <observation-note>');
        }
        const review = playtestCompliance.reviewCheckpoint(checkpointId, args[1] ?? '', args.slice(2).join(' '));
        playtestCoverage.recordCheckpointReview(checkpointId);
        emit({ cmd: 'reviewcheckpoint', ok: true, review });
        break;
      }
      case 'recordfinding': {
        if (!flags.playtest) throw new Error('recordfinding requires --playtest.');
        if (args.length !== 8) {
          throw new Error(
            'recordfinding is JSON-only and requires 8 args: severity, category, title, location, reproduction, expected, actual, evidence.',
          );
        }
        const result = playtestFindings.record({
          severity: args[0],
          category: args[1],
          title: args[2],
          location: args[3],
          reproduction: args[4],
          expected: args[5],
          actual: args[6],
          evidence: args[7],
        });
        emit({ cmd: 'recordfinding', ok: true, ...result });
        break;
      }
      case 'verdict': case 'investigation-verdict': {
        const verdict = args[0] as InvestigationVerdict | undefined;
        if (!['bug-reproduced', 'not-reproduced', 'not-verified', 'inconclusive'].includes(verdict ?? '')) {
          throw new Error('Usage: verdict <bug-reproduced|not-reproduced|not-verified|inconclusive> [note]');
        }
        investigationVerdict = verdict!;
        investigationNote = args.slice(1).join(' ') || null;
        emit({
          cmd: 'verdict',
          ok: true,
          investigation_verdict: investigationVerdict,
          ...(investigationNote ? { note: investigationNote } : {}),
          evidenceClass: flags.diagnostic ? 'targeted-diagnostic' : undefined,
          completionEligible: flags.diagnostic ? false : undefined,
        });
        break;
      }
      case 'dismissfinding': {
        if (!flags.playtest) throw new Error('dismissfinding requires --playtest.');
        if (!args[0] || args.length < 2) throw new Error('Usage: dismissfinding <id> <reason>');
        const finding = playtestFindings.dismiss(args[0], args.slice(1).join(' '));
        emit({ cmd: 'dismissfinding', ok: true, finding });
        break;
      }
      case 'listfindings': {
        if (!flags.playtest) throw new Error('listfindings requires --playtest.');
        emit({ cmd: 'listfindings', ok: true, findings: playtestFindings.summary() });
        break;
      }
      case 'diff': {
        const res = await agent.observeDiff();
        emit({ cmd: 'diff', ok: true, ...res });
        break;
      }
      case 'watch': {
        // jsExpr can contain spaces ('scene.activeHp < 50'), so read it from the
        // raw remainder (like 'eval') rather than the whitespace-split args —
        // parseWatchExpression pulls a trailing bare integer off as timeoutMs
        // if present and strips surrounding quotes. Shared with playtestPolicy
        // so the expression that's linted under --playtest is byte-for-byte
        // the same one that actually runs here.
        if (!rest) throw new Error('Usage: watch <jsExpr> [timeoutMs]');
        const { expr, timeoutMs } = parseWatchExpression(rest);
        const res = await agent.watch(expr, timeoutMs);
        emit({ cmd: 'watch', ...res });
        break;
      }
      case 'beat': case 'beats': {
        const res = await agent.inspectBeats();
        emit({ cmd: 'beat', ok: true, ...res });
        break;
      }
      case 'skipbeat': {
        const n = args[0] ? num(0) : 1;
        if (!Number.isInteger(n) || n < 1) throw new Error('skipbeat count must be a positive integer.');
        const res = await agent.skipBeat(n);
        emit({
          cmd: 'skipbeat',
          ok: true,
          ...res,
          mutates: true,
          warning: 'skipped-state: beat side effects (ledger deltas, flags, spawns) between the skipped beats were not executed',
          ...recordPlaytestBypass(flags, 'skipbeat', 'A beat was force-skipped before natural verification.'),
        });
        break;
      }
      case 'logs': case 'console': {
        if (args[0] === 'clear') {
          agent.clearConsoleLogs();
          emit({ cmd: 'logs', ok: true, action: 'clear', mutates: true });
        } else {
          const entries = agent.getConsoleLogs();
          const errors = entries.filter(e => e.type === 'error').length;
          const warnings = entries.filter(e => e.type === 'warning').length;
          emit({ cmd: 'logs', ok: true, errors, warnings, entries });
        }
        break;
      }
      case 'audio': {
        if (args[0] === 'assert') {
          const kind = args[1] as 'silent' | 'playing' | 'stopped';
          if (!['silent', 'playing', 'stopped'].includes(kind)) {
            throw new Error('Usage: audio assert silent | playing <key> | stopped <key>');
          }
          const res = await agent.assertAudio(kind, args[2]);
          emit({ cmd: 'audio', ok: res.ok, action: 'assert', kind, key: args[2], ...res });
        } else {
          const res = await agent.inspectAudio();
          emit({ cmd: 'audio', ok: true, ...res });
        }
        break;
      }
      case 'camera': {
        if (args[0] === 'zoom') {
          const factor = num(1);
          await agent.setCameraZoom(factor);
          emit({ cmd: 'camera', ok: true, action: 'zoom', factor });
        } else if (args[0] === 'center') {
          const cx = num(1);
          const cy = num(2);
          await agent.setCameraCenter(cx, cy);
          emit({ cmd: 'camera', ok: true, action: 'center', x: cx, y: cy });
        } else if (args[0] === 'fit') {
          const res = await agent.cameraFit();
          emit({ cmd: 'camera', ok: true, action: 'fit', ...res });
        } else if (args[0] === 'follow') {
          await agent.cameraFollow();
          emit({ cmd: 'camera', ok: true, action: 'follow' });
        } else {
          const cam = await agent.inspectCamera();
          emit({ cmd: 'camera', ok: true, ...cam });
        }
        break;
      }
      case 'speed': case 'timescale': {
        const factor = num(0);
        await agent.setTimeScale(factor);
        emit({ cmd: 'speed', ok: true, timescale: factor });
        break;
      }
      case 'goto': {
        if (flags.diagnostic) {
          const beatOnly = args[0] === 'beat';
          const sceneArgs = args[0] === 'scene' ? args.slice(1) : beatOnly ? [] : args;
          const beatMarker = sceneArgs.indexOf('beat');
          const sceneTarget = beatMarker >= 0 ? sceneArgs.slice(0, beatMarker) : sceneArgs;
          const beatTarget = beatOnly ? args[1] : beatMarker >= 0 ? sceneArgs[beatMarker + 1] : null;
          if (beatOnly && !beatTarget) throw new Error('Usage: goto beat <beatIndex-or-id>');
          if (!beatOnly && sceneTarget.length > 0 && sceneTarget[0] !== '') {
            const sceneIndex = Number(sceneTarget[0]);
            if (!Number.isInteger(sceneIndex)) throw new Error('Usage: goto scene <sceneIndex> [beat <beatIndex-or-id>]');
            if (sceneIndex > 0 && !flags.allowSkippedPrerequisites) {
              throw new Error('DIAGNOSTIC_PREREQUISITE_REQUIRED: goto scene skips earlier scene side effects. Re-run with --allow-skipped-prerequisites to acknowledge.');
            }
            await agent.warpScene(sceneIndex);
          }
          const resolved = beatTarget !== null
            ? await diagnosticGotoBeat(page, beatTarget, flags.allowSkippedPrerequisites)
            : {
                sceneIndex: Number.isInteger(Number(sceneTarget[0])) ? Number(sceneTarget[0]) : 0,
                beatIndex: null,
                beatId: null,
                beatType: null,
                prerequisiteWarning: flags.allowSkippedPrerequisites
                  ? 'skipped-state: side effects of beats before this scene were not executed'
                  : null,
              };
          emit({
            cmd: 'goto',
            ok: true,
            evidenceClass: 'targeted-diagnostic',
            completionEligible: false,
            mutates: true,
            ...resolved,
          });
        } else {
          const idx = num(0);
          await agent.warpScene(idx);
          emit({
            cmd: 'goto',
            ok: true,
            sceneIndex: idx,
            mutates: true,
            warning: 'skipped-state: side effects of beats before this scene (ledger deltas, flags, spawns) were not executed',
          });
        }
        break;
      }
      case 'savestate': {
        const file = args[0];
        if (file) {
          const filePath = path.resolve(file);
          const save = await agent.saveFileState(filePath);
          emit({ cmd: 'savestate', ok: true, file: filePath, ...save });
        } else {
          const save = await agent.saveQuickState();
          emit({ cmd: 'savestate', ok: true, ...save });
        }
        break;
      }
      case 'loadstate': {
        const file = args[0];
        if (file) {
          const filePath = path.resolve(file);
          await agent.loadFileState(filePath);
          emit({ cmd: 'loadstate', ok: true, file: filePath, mutates: true });
        } else {
          const load = await agent.loadQuickState();
          emit({ cmd: 'loadstate', ok: true, mutates: true, ...load });
        }
        break;
      }
      case 'mode': {
        const modeId = args[0];
        if (!modeId) throw new Error('Usage: mode <modeId> [configJson]');
        let config = {};
        if (args[1]) {
          try {
            config = JSON.parse(args.slice(1).join(' '));
          } catch (err) {
            throw new Error(`Invalid config JSON: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        await agent.launchMinigame(modeId, config);
        playtestCoverage.observeMode('foreground', modeId, null);
        emit({ cmd: 'mode', ok: true, modeId, config, mutates: true });
        break;
      }
      case 'modes': {
        const ids = await agent.listModes();
        emit({ cmd: 'modes', ok: true, ids });
        break;
      }
      case 'winmode': case 'losemode': {
        const outcome = verb === 'winmode' ? 'win' : 'lose';
        const res = await agent.completeMode(outcome);
        emit({
          cmd: verb,
          ok: true,
          ...res,
          mutates: true,
          ...recordPlaytestBypass(flags, verb, `Minigame was force-completed with outcome "${outcome}".`),
        });
        break;
      }
      case 'clickworld': {
        const wx = num(0);
        const wy = num(1);
        const vp = await agent.worldToViewport(wx, wy);
        await agent.mouseDown(vp.x, vp.y, btn(args[2]));
        await agent.mouseUp(vp.x, vp.y, btn(args[2]));
        emit({ cmd: 'clickworld', ok: true, world: { x: wx, y: wy }, viewport: vp });
        break;
      }
      case 'where': {
        const wx = num(0);
        const wy = num(1);
        const vp = await agent.worldToViewport(wx, wy);
        emit({ cmd: 'where', ok: true, world: { x: wx, y: wy }, viewport: vp });
        break;
      }
      case 'modify': {
        const stat = args[0] as 'hp' | 'ledger' | 'shards';
        if (!['hp', 'ledger', 'shards'].includes(stat)) {
          throw new Error('Usage: modify hp|ledger|shards <value>');
        }
        const value = num(1);
        const res = await agent.modifyStat(stat, value);
        emit({
          cmd: 'modify',
          ok: true,
          ...res,
          mutates: true,
          warning: 'skipped-state: this stat was set directly, bypassing whatever beat/combat logic would normally change it',
        });
        break;
      }
      case 'choose': {
        if (!rest) throw new Error('Usage: choose <index|text>');
        const before = await agent.inspectBeats();
        const sceneIndex = (await readCheckpointIdentity(page))?.sceneIndex ?? null;
        const res = await agent.chooseOption(rest);
        const options = Array.isArray(before.currentBeat?.options) ? before.currentBeat.options : [];
        const optionIndex = options.findIndex((option: { text?: string }) => option.text === res.matched);
        if (before.currentBeat?.type === 'choice' && optionIndex >= 0) {
          playtestCoverage.recordChoice(sceneIndex, before.currentBeatIndex, optionIndex, res.matched);
        }
        emit({ cmd: 'choose', ok: true, ...res, mutates: true });
        break;
      }
      case 'settings': {
        if (!args[0]) {
          const res = await agent.getSettingsBridge();
          emit({ cmd: 'settings', ok: true, settings: res });
        } else {
          const key = args[0];
          const rawValue = args.slice(1).join(' ');
          let value: unknown = rawValue;
          if (rawValue === 'true') value = true;
          else if (rawValue === 'false') value = false;
          else if (rawValue !== '' && !isNaN(Number(rawValue))) value = Number(rawValue);
          const res = await agent.updateSettingsBridge({ [key]: value });
          emit({ cmd: 'settings', ok: true, settings: res, mutates: true });
        }
        break;
      }
      case 'chapterflag': {
        if (!args[0]) {
          const res = await agent.getProgressBridge();
          emit({ cmd: 'chapterflag', ok: true, progress: res });
        } else {
          const chapterId = args[0];
          const action = args[1] as 'complete' | 'uncomplete' | 'freeplay-on' | 'freeplay-off';
          if (!['complete', 'uncomplete', 'freeplay-on', 'freeplay-off'].includes(action)) {
            throw new Error('Usage: chapterflag <chapterId> complete|uncomplete|freeplay-on|freeplay-off');
          }
          const res = await agent.setChapterFlag(chapterId, action);
          emit({ cmd: 'chapterflag', ok: true, progress: res, mutates: true });
        }
        break;
      }
      case 'anim': {
        const res = await agent.inspectAnimations();
        emit({ cmd: 'anim', ok: true, actors: res });
        break;
      }
      case 'depth': {
        const wx = args[0] ? num(0) : undefined;
        const wy = args[1] ? num(1) : undefined;
        const res = await agent.inspectDepth(wx, wy);
        emit({ cmd: 'depth', ok: true, objects: res });
        break;
      }
      case 'hitreport': {
        const wx = num(0);
        const wy = num(1);
        const res = await agent.hitReport(wx, wy);
        emit({ cmd: 'hitreport', ok: true, world: { x: wx, y: wy }, ...res });
        break;
      }
      case 'fx': {
        const res = await agent.inspectFx();
        emit({ cmd: 'fx', ok: true, ...res });
        break;
      }
      case 'walkto': {
        const wx = num(0);
        const wy = num(1);
        const radius = args[2] ? num(2) : 24;
        const maxSeconds = args[3] ? num(3) : 8;
        const before = await readCurrentBeatInfo(page);
        const res = await agent.walkTo(wx, wy, radius, maxSeconds);
        // walkTo uses deterministic frame stepping and leaves the Phaser loop
        // paused. Wake real-time beats (camera pans, waits, tweens, dialogue)
        // before returning to the REPL, otherwise the next `advance` appears
        // to soft-lock on a passive beat.
        await agent.resumeLoop().catch(() => {});
        playtestCoverage.recordWalk(before.sceneIndex, before.beatIndex, before.beatType, res.ok);
        emit({ cmd: 'walkto', ok: res.ok, target: { x: wx, y: wy }, player: res.player, mutates: true });
        break;
      }
      case 'injectbeat': {
        if (!rest) throw new Error('Usage: injectbeat <json>');
        let beat: Record<string, unknown>;
        try {
          beat = JSON.parse(rest);
        } catch (err) {
          throw new Error(`Invalid beat JSON: ${err instanceof Error ? err.message : String(err)}`);
        }
        const res = await agent.injectBeat(beat);
        emit({ cmd: 'injectbeat', ok: true, ...res, mutates: true });
        break;
      }
      case 'reseed': {
        const seedVal = num(0);
        await agent.reseed(seedVal);
        emit({ cmd: 'reseed', ok: true, seed: seedVal, mutates: true });
        break;
      }
      case 'perf': {
        const res = await agent.inspectPerf();
        emit({ cmd: 'perf', ok: true, ...res });
        break;
      }
      case 'golden': {
        const action = args[0];
        const name = args[1];
        if (!action || !name) throw new Error('Usage: golden save|check <name> [threshold]');
        const chapterName = flags.chapter || 'unknown';
        if (action === 'save') {
          const file = await agent.saveGolden(chapterName, name);
          emit({ cmd: 'golden', ok: true, action: 'save', name, file });
        } else if (action === 'check') {
          const threshold = args[2] ? Number(args[2]) : 0.01;
          const res = await agent.checkGolden(chapterName, name, threshold);
          emit({ cmd: 'golden', ok: true, action: 'check', name, ...res });
        } else {
          throw new Error(`Unknown golden action: ${action}`);
        }
        break;
      }
      case 'replay': {
        const file = args[0];
        if (!file) throw new Error('Usage: replay <file>');
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) throw new Error(`Replay file not found: ${filePath}`);
        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
          if (!(await runCommand(agent, page, flags, line))) break;
        }
        emit({ cmd: 'replay', ok: true, file });
        break;
      }

      case 'advance': {
        // A preceding walkto/step command may have paused Phaser. Advance is
        // the boundary where passive story time is allowed to run.
        await agent.resumeLoop().catch(() => {});
        const traceCursor = lastDeliveredBeatTraceSequence;
        const passiveCapture = new PassiveEvidenceCollector(agent, flags);
        await passiveCapture.observeTick(await readCurrentBeatInfo(page));
        const advance = await reachWalkControl(page, args[0] ? num(0) : 60, {
          onTick: info => passiveCapture.observeTick(info),
        });
        // `advanceUntil` checks its stop condition before invoking onTick. If
        // a sustained beat begins on the final tick, take its current live
        // frame here before reporting it as missed; this still never pauses,
        // steps, or retimes the Phaser loop.
        await passiveCapture.observeTick(await readCurrentBeatInfo(page));
        const traceAfter = await readBeatTrace(page);
        const tracedEntries = traceEntriesAfter(traceAfter, traceCursor);
        lastDeliveredBeatTraceSequence = traceAfter.reduce(
          (max, entry) => Math.max(max, entry.sequence),
          traceCursor,
        );
        const identityAfter = await readCheckpointIdentity(page);
        if (identityAfter?.foregroundModeId) {
          playtestCoverage.observeMode(
            'foreground',
            identityAfter.foregroundModeId,
            identityAfter.foregroundModeBeatIndex,
          );
        }
        if (identityAfter?.backgroundModeId) {
          playtestCoverage.observeMode(
            'background',
            identityAfter.backgroundModeId,
            identityAfter.backgroundModeBeatIndex,
          );
        }
        const passiveEvidence = await passiveCapture.finish(
          tracedEntries,
          identityAfter?.sceneIndex ?? null,
        );
        playtestCoverage.recordPassiveEvents(passiveEvidence.events);
        if (advance.status === 'chapter-ended' || advance.beat?.type === 'endChapter') {
          playtestCoverage.recordTerminalObservation();
        }
        await emitPassiveEvidence(page, flags, passiveEvidence, identityAfter);
        emit({
          cmd: 'advance',
          ok: true,
          status: advance.status,
          ...(advance.modeId !== undefined ? { modeId: advance.modeId } : {}),
          beat: advance.beat,
          ...(passiveEvidence.events.length > 0 ? { visual_events: passiveEvidence.events } : {}),
          state: await agent.snapshotGameState(),
          ...(advance.status === 'mode-active'
            ? {
                required_next: [
                  'Inspect the emitted visual_checkpoint PNG and acknowledge it with reviewcheckpoint.',
                  'Attempt the visible minigame with normal keyboard or mouse input.',
                  'Use winmode/losemode only if it remains blocking; skipbeat is not a minigame bypass.',
                ],
              }
            : {}),
          ...(advance.status === 'chapter-ended'
            ? {
                required_next: [
                  'Review every pending visual_checkpoint.',
                  'Quit to obtain the authoritative session_summary.',
                  'Write the required report to qa/<chapter-id>/report.md using SKILL.md\'s template.',
                ],
              }
            : {}),
        });
        break;
      }
      case 'advance-to': {
        if (!flags.diagnostic) throw new Error('advance-to requires --diagnostic.');
        if (args[0] !== 'scene' || !Number.isInteger(Number(args[1]))) {
          throw new Error('Usage: advance-to scene <sceneIndex> [beat <beatIndex>]');
        }
        const marker = args.indexOf('beat');
        const targetBeat = marker >= 0 ? args[marker + 1] ?? null : null;
        const result = await advanceToDiagnosticTarget(agent, page, Number(args[1]), targetBeat);
        emit({ cmd: 'advance-to', ok: true, evidenceClass: 'targeted-diagnostic', completionEligible: false, ...result });
        break;
      }
      case 'wait':
        await agent.resumeLoop().catch(() => {});
        await page.waitForTimeout(num(0));
        emit({ cmd: 'wait', ok: true, ms: num(0) });
        break;

      case 'quit': case 'exit': {
        if (flags.playtest) {
          const visualQa = playtestCompliance.summary(flags.checkpoints);
          const coverage = playtestCoverage.summary();
          const integrity = playtestBypasses.length === 0 ? 'natural' : 'partially-bypassed';
          const findings = playtestFindings.summary();
          const completion = playtestCompletionVerdict(visualQa, coverage, integrity, findings);
          if (!completion.ok) {
            const unlinkedIssues = visualQa.reviews
              .filter(review => review.verdict === 'issue-found')
              .filter(review => !findings.some(finding => finding.evidence.toLowerCase().includes(`checkpoint:${review.checkpointId}`)));
            process.exitCode = completion.exitCode;
            emit({
              cmd: verb,
              ok: false,
              error:
                `Cannot verify playtest (${completion.status}): ` +
                `${[...visualQa.reasons, ...(unlinkedIssues.length ? [`issue-found checkpoint(s) lack linked findings: ${unlinkedIssues.map(review => review.checkpointId).join(', ')}`] : []), ...(coverage.terminalObserved ? [] : ['terminal beat was not observed']), ...(integrity === 'natural' ? [] : ['run was bypassed'])].join('; ')}. ` +
                'The session will close as unsuccessful and preserve the authoritative session_summary.',
              visual_qa: visualQa,
              coverage,
            });
            return false;
          }
        }
        emit({ cmd: verb, ok: true });
        return false;
      }

      default:
        emit({ cmd: verb, ok: false, error: `unknown command (try 'help')` });
    }
    playtestCompliance.recordSuccessfulCommand(verb);
    playtestCoverage.recordInput(verb);
  } catch (err) {
    // H3: surface advanceUntil's stall diagnostics on the failure line so a
    // caller doesn't have to blindly guess why 'advance' (or any other
    // command built on advanceUntil) timed out.
    emit({
      cmd: verb,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ...(err instanceof AdvanceTimeoutError ? { diagnostics: err.diagnostics } : {}),
      ...(flags.verbose ? { console: agent.getConsoleLogs() } : {}),
    });
  }
  return true;
}

function protocolError(code: string, message: string): { code: string; message: string } {
  return { code, message };
}

function protocolSafeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'cmd';
}

async function captureProtocolArtifact(
  agent: GameAgent,
  flags: Flags,
  command: AgentCommand,
): Promise<{ type: 'image'; path: string; annotated?: boolean } | undefined> {
  const options = command.options ?? {};
  if (options.snapshot !== 'after' && !options.annotate) return undefined;

  fs.mkdirSync(flags.out, { recursive: true });
  const suffix = options.annotate ? 'annotated' : 'shot';
  const file = path.resolve(
    flags.out,
    `protocol-${protocolSafeName(command.cmd_id)}-${suffix}-${String(++screenshotCount).padStart(3, '0')}.png`,
  );
  if (options.annotate) await agent.annotateScreenshot(file);
  else await agent.stabilizedScreenshot(file);
  return { type: 'image', path: file, ...(options.annotate ? { annotated: true } : {}) };
}

async function runProtocolCommand(
  agent: GameAgent,
  page: Page,
  flags: Flags,
  command: AgentCommand,
  request: CommandRequest,
): Promise<boolean> {
  const startedAt = Date.now();
  const consoleStart = agent.getConsoleLogs().length;
  const outputs: Record<string, unknown>[] = [];

  emit({ protocol: OMEGA_AGENT_PROTOCOL, cmd_id: command.cmd_id, status: 'accepted', timestamp: startedAt });
  lastProtocolCommandId = command.cmd_id;

  const previousSink = emitSink;
  emitSink = (obj) => outputs.push(obj);
  let keepGoing = true;
  let thrown: unknown = null;
  try {
    keepGoing = await runCommand(agent, page, flags, request);
  } catch (err) {
    thrown = err;
  } finally {
    emitSink = previousSink;
  }

  const durationMs = Date.now() - startedAt;
  const options: AgentCommandOptions = command.options ?? {};
  const lastOutput = outputs[outputs.length - 1];
  const outputFailed = outputs.some((obj) => obj.ok === false);
  const status = thrown || outputFailed ? 'failed' : 'completed';
  const extras: Record<string, unknown> = {};

  if (options.snapshot === 'after' || options.annotate) {
    try {
      const artifact = await captureProtocolArtifact(agent, flags, command);
      if (artifact) extras.artifact = artifact;
    } catch (err) {
      extras.artifact_error = err instanceof Error ? err.message : String(err);
    }
  }
  if (options.telemetry) {
    try {
      extras.telemetry = await agent.inspectPerf();
    } catch (err) {
      extras.telemetry = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  if (options.console_delta) {
    const entries = agent.getConsoleLogs().slice(consoleStart);
    extras.console_delta = {
      errors: entries.filter((e) => e.type === 'error').length,
      warnings: entries.filter((e) => e.type === 'warning').length,
      entries,
    };
  }
  if (flags.verbose) {
    extras.console = agent.getConsoleLogs();
    extras.command_outputs = outputs;
  }

  if (status === 'failed') {
    const message = thrown instanceof Error
      ? thrown.message
      : thrown
        ? String(thrown)
        : typeof lastOutput?.error === 'string'
          ? lastOutput.error
          : 'Command failed.';
    emit({
      protocol: OMEGA_AGENT_PROTOCOL,
      cmd_id: command.cmd_id,
      status,
      action: command.action,
      duration_ms: durationMs,
      error: protocolError(thrown ? 'COMMAND_ERROR' : 'COMMAND_FAILED', message),
      ...extras,
    });
    return keepGoing;
  }

  emit({
    protocol: OMEGA_AGENT_PROTOCOL,
    cmd_id: command.cmd_id,
    status,
    action: command.action,
    duration_ms: durationMs,
    result: outputs.length === 0
      ? { cmd: request.action, ok: true }
      : outputs.length === 1
        ? outputs[0]
        : { outputs },
    ...extras,
  });
  return keepGoing;
}

function protocolInFlightReceipt(command: AgentCommand): void {
  const sink = emitSink;
  emitSink = null;
  try {
    emit({
      protocol: OMEGA_AGENT_PROTOCOL,
      cmd_id: command.cmd_id,
      status: 'rejected',
      error: protocolError('COMMAND_IN_FLIGHT', 'Another JSONL command is still running; wait for its completed/failed receipt before sending the next command.'),
    });
  } finally {
    emitSink = sink;
  }
}

async function processCommandLine(
  agent: GameAgent,
  page: Page,
  flags: Flags,
  line: string,
): Promise<boolean> {
  const trimmed = line.trim();
  if (trimmed.startsWith('{')) {
    const parsed = parseAgentCommandLine(trimmed);
    if (parsed.ok === false) {
      emit({
        protocol: OMEGA_AGENT_PROTOCOL,
        cmd_id: parsed.cmd_id,
        status: 'rejected',
        error: protocolError(parsed.code, parsed.message),
      });
      return true;
    }
    if (protocolInFlight) {
      protocolInFlightReceipt(parsed.command);
      return true;
    }
    protocolInFlight = true;
    try {
      return await runProtocolCommand(agent, page, flags, parsed.command, parsed.request);
    } finally {
      protocolInFlight = false;
    }
  }
  return runCommand(agent, page, flags, line);
}

/** Filesystem-safe folder name for a chapter title (N1 --shots per-chapter folder). */
function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'chapter';
}

interface GauntletResult {
  chapter: string;
  status: 'completed' | 'stalled';
  errors: number;
  duration: number;
  stallInfo?: string;
  shots?: { sceneIndex: number; path: string }[];
  coverage?: CoverageReport;
  transitions?: TransitionReport;
  /** H5: the per-chapter timeout budget this attempt ran under, for auditability. */
  timeoutBudget?: number;
  /**
   * H1: on a timeout failure, whether beatIndex was still changing
   * ('global-timeout' — the chapter is just long/slow) or had been frozen for
   * >=10s at the moment of failure ('soft-lock' — likely an engine bug, since
   * a healthy chapter always eventually dismisses dialogue/completes a mode).
   * Absent on a completed run.
   */
  stall?: 'soft-lock' | 'global-timeout';
  /** H1: the beatIndex the chapter was stuck on when a soft-lock was detected. */
  stuckBeatIndex?: number;
  /** H1: that beat's `type`, if cheaply available from the loaded chapter config. */
  stuckBeatType?: string;
  /** H3: raw advanceUntil diagnostics dump, present whenever the timeout came from an AdvanceTimeoutError. */
  diagnostics?: AdvanceTimeoutDiagnostics;
}

/**
 * H5: replace the old flat 180s gauntlet budget with one scaled to the shape
 * of the chapter actually being tested — a one-scene dialogue-only chapter
 * shouldn't get the same runway as a multi-scene finale stacked with
 * minigames/boss fights. Coefficients are the blessed spec's (docs/toolkit_
 * complaints.md Triage/Blessing, H5): 45s base + 0.75s/beat + 20s per
 * minigame/bossFight beat + 10s/scene, rounded up and capped at 300s so a
 * pathological config can't make a single gauntlet job run unbounded — pass
 * --gauntlet-max to override the cap (and the computed budget) entirely.
 */
function computeGauntletBudget(chapter: (typeof CHAPTERS)[number], flags: Flags): number {
  if (flags.gauntletMax !== null && !Number.isNaN(flags.gauntletMax)) return flags.gauntletMax;
  const beats = chapter.beats;
  const heavyBeats = beats.filter((b) => b.type === 'minigame' || b.type === 'bossFight').length;
  const sceneCount = chapter.scenes?.length ?? 1;
  const budget = 45 + 0.75 * beats.length + 20 * heavyBeats + 10 * sceneCount;
  return Math.min(300, Math.ceil(budget));
}

interface CoverageReport {
  chapter: string;
  beatsTotal: number;
  beatsVisited: number;
  neverVisitedBeats: number[];
  choiceGaps: string[];
  modesTotal: string[];
  modesVisited: string[];
  modesNeverEntered: string[];
}

/**
 * G6: compare what a gauntlet run actually exercised (visitedBeats/visitedModes,
 * recorded live via advanceUntil's onTick) against the chapter's static config,
 * so branch-specific stalls (the historical Ch8 endings bug) are surfaced as
 * data instead of requiring someone to notice a bug report about an unplayed path.
 * Sampled at the ~150ms poll interval, so a non-blocking beat (`ledger`, `sfx`,
 * `changeMusic`, …) that executes and falls through inside one tick can be
 * missed — this is a best-effort trace, not an exact one. Blocking beats
 * (dialogue, choice, walkTo, minigame, bossFight) always hold the beatIndex
 * across at least one tick and are reliably captured.
 */
function computeCoverage(
  chapter: (typeof CHAPTERS)[number],
  visitedBeats: Set<number>,
  visitedModes: Set<string>,
): CoverageReport {
  const beats = chapter.beats;
  const neverVisitedBeats = beats.map((_, i) => i).filter((i) => !visitedBeats.has(i));
  const choiceGaps: string[] = [];
  const modesTotal = new Set<string>();
  beats.forEach((beat, i) => {
    if (beat.type === 'choice' && visitedBeats.has(i)) {
      // advanceUntil's auto-driver always clicks the first rendered option
      // (see helpers.ts) — every other option is definitionally never taken
      // until G7 (choice-matrix gauntlet) replays alternate branches.
      beat.options.forEach((opt, optIdx) => {
        if (optIdx !== 0) {
          choiceGaps.push(`beat ${i}: choice branch ${optIdx + 1}/${beat.options.length} ("${opt.text}") never taken`);
        }
      });
    }
    if (beat.type === 'minigame') modesTotal.add(beat.modeId);
    if (beat.type === 'bossFight') modesTotal.add('bossFight');
  });
  const modesNeverEntered = [...modesTotal].filter((m) => !visitedModes.has(m));
  return {
    chapter: chapter.title,
    beatsTotal: beats.length,
    beatsVisited: visitedBeats.size,
    neverVisitedBeats,
    choiceGaps,
    modesTotal: [...modesTotal],
    modesVisited: [...visitedModes],
    modesNeverEntered,
  };
}

interface TransitionReport {
  chapter: string;
  edgesImplied: number;
  edgesObserved: number;
  neverTakenEdges: string[];
  unexpectedTransitions: string[];
}

/**
 * I4: the graph of beat-index jumps a chapter's config *could* produce,
 * derived from the same jump semantics BeatEngine itself implements
 * (runChoiceBeat/runRouteOnMinigame/runMinigameBeat in BeatEngine.ts) —
 * fallthrough to i+1 unless a beat resolves a `goto`/`loseGoto`/case target by
 * id, in which case that's an additional (or, for routeOnMinigame with no
 * matching case and no default, the only) edge. Returned as an adjacency list
 * (not just a flat edge set) so multi-hop reachability can be checked —
 * needed because the ~150ms poll can skip over an instantaneous beat (see
 * computeCoverage's doc comment), which would otherwise make a legitimate
 * two-hop fallthrough look like a single illegal jump.
 */
function buildImpliedGraph(beats: Beat[]): Map<number, number[]> {
  const idIndex = (id: string): number | null => {
    const i = beats.findIndex((b) => b.id === id);
    return i === -1 ? null : i;
  };
  const graph = new Map<number, number[]>();
  const addEdge = (from: number, to: number | null) => {
    if (to === null) return;
    const list = graph.get(from);
    if (list) list.push(to);
    else graph.set(from, [to]);
  };
  beats.forEach((beat, i) => {
    if (beat.type === 'endChapter') return; // terminal — no outgoing edge
    if (beat.type === 'choice') {
      beat.options.forEach((opt) => addEdge(i, opt.goto ? idIndex(opt.goto) : i + 1));
      return;
    }
    if (beat.type === 'routeOnMinigame') {
      Object.values(beat.cases).forEach((target) => addEdge(i, idIndex(target)));
      if (beat.default) addEdge(i, idIndex(beat.default));
      // runRouteOnMinigame falls through to i+1 when no case matches and no
      // default is set (or an id doesn't resolve) — always a possible edge.
      addEdge(i, i + 1);
      return;
    }
    addEdge(i, i + 1);
    if (beat.type === 'minigame' && beat.loseGoto) addEdge(i, idIndex(beat.loseGoto));
  });
  return graph;
}

/** BFS reachability over the implied graph — used so a poll gap that skips a
 * beat (see buildImpliedGraph's doc comment) doesn't register as a routing bug. */
function reachableInGraph(graph: Map<number, number[]>, from: number, to: number): boolean {
  if (from === to) return true;
  const seen = new Set<number>([from]);
  const queue = [from];
  for (let qi = 0; qi < queue.length; qi++) {
    for (const next of graph.get(queue[qi]) ?? []) {
      if (next === to) return true;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

/**
 * I4: diff the observed beat-index transitions (recorded live via
 * advanceUntil's onTick, same instrumentation as G6) against the graph
 * implied by the static config. `unexpectedTransitions` — an observed jump
 * with no path at all in the implied graph — is the routing-bug signal (the
 * `routeOnMinigame` gotcha in CLAUDE.md is exactly this class); everything
 * else in `neverTakenEdges` is single-hop coverage, same caveats as G6
 * (choice branches beyond the first are never taken without --branches).
 */
function computeTransitionReport(
  chapter: (typeof CHAPTERS)[number],
  observedEdges: Set<string>,
): TransitionReport {
  const graph = buildImpliedGraph(chapter.beats);
  const impliedEdgeSet = new Set<string>();
  graph.forEach((tos, from) => tos.forEach((to) => impliedEdgeSet.add(`${from}->${to}`)));
  const neverTakenEdges = [...impliedEdgeSet].filter((e) => !observedEdges.has(e));
  const unexpectedTransitions = [...observedEdges].filter((e) => {
    const [from, to] = e.split('->').map(Number);
    return !reachableInGraph(graph, from, to);
  });
  return {
    chapter: chapter.title,
    edgesImplied: impliedEdgeSet.size,
    edgesObserved: observedEdges.size,
    neverTakenEdges,
    unexpectedTransitions,
  };
}

/** Plain generated HTML contact sheet (N1) — chapter x scene thumbnail grid, no framework. */
function writeContactSheet(runDir: string, results: GauntletResult[]): void {
  const rows = results
    .map((r) => {
      const badge = r.status === 'completed' ? '✅ completed' : '❌ stalled';
      const info = r.status === 'stalled' ? `<div class="stall">${escapeHtml(r.stallInfo ?? '')}</div>` : '';
      const thumbs = (r.shots ?? [])
        .map((s) => {
          const rel = path.relative(runDir, s.path).split(path.sep).join('/');
          return `<a href="${rel}" target="_blank"><figure><img src="${rel}" loading="lazy"><figcaption>scene ${s.sceneIndex}</figcaption></figure></a>`;
        })
        .join('\n');
      return `<section>
  <h2>${escapeHtml(r.chapter)} — ${badge} <small>(${r.errors} console errors, ${r.duration}s)</small></h2>
  ${info}
  <div class="thumbs">${thumbs || '<em>no screenshots captured</em>'}</div>
</section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Gauntlet contact sheet</title>
<style>
  body { font-family: system-ui, sans-serif; background: #111; color: #eee; margin: 2rem; }
  h1 { font-size: 1.4rem; }
  section { border-top: 1px solid #333; padding: 1rem 0; }
  .stall { color: #ff6b6b; font-family: monospace; margin: 0.5rem 0; }
  .thumbs { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  figure { margin: 0; width: 220px; }
  figure img { width: 100%; border: 1px solid #444; display: block; }
  figcaption { font-size: 0.8rem; opacity: 0.8; text-align: center; }
  a { color: inherit; text-decoration: none; }
</style></head>
<body>
<h1>Chapter Gauntlet — ${new Date().toISOString()}</h1>
${rows}
</body></html>`;

  fs.writeFileSync(path.resolve(runDir, 'index.html'), html);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

interface GauntletJob {
  chapter: (typeof CHAPTERS)[number];
  label: string;
  forceChoice?: { beatIndex: number; optionIndex: number };
}

/**
 * G7: one job per chapter normally; with --branches, one job per option of
 * the chapter's *first* choice beat only ("vary the first divergence only"
 * per the spec — full choice-permutation replay is combinatorially
 * unbounded, this is the bounded approximation). Chapters with no choice
 * beat get a single unvaried job regardless of --branches.
 */
function buildGauntletJobs(chapters: (typeof CHAPTERS)[number][], flags: Flags): GauntletJob[] {
  const jobs: GauntletJob[] = [];
  for (const chapter of chapters) {
    const firstChoiceIdx = flags.branches ? chapter.beats.findIndex((b) => b.type === 'choice') : -1;
    const firstChoice = firstChoiceIdx !== -1 ? chapter.beats[firstChoiceIdx] : null;
    if (flags.branches && firstChoice && firstChoice.type === 'choice') {
      const total = firstChoice.options.length;
      const cap = flags.branches === 'all' ? total : Math.max(1, Math.min(total, Number(flags.branches) || total));
      for (let k = 0; k < cap; k++) {
        jobs.push({
          chapter,
          label: `${chapter.title} [branch ${k + 1}/${total}]`,
          forceChoice: { beatIndex: firstChoiceIdx, optionIndex: k },
        });
      }
    } else {
      jobs.push({ chapter, label: chapter.title });
    }
  }
  return jobs;
}

/** Run a simple bounded worker pool over `items`, preserving input order in the returned array. */
async function runPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runOne = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runOne));
  return results;
}

/**
 * Run one chapter (or, under --branches, one forced-choice variant of one
 * chapter) to completion or stall, on its own fresh page — extracted from the
 * pre-G7/G8 single-chapter loop body so --branches (G7) and --parallel (G8)
 * can both reuse it without duplicating the advanceUntil wiring.
 */
async function runChapterAttempt(
  browser: Browser,
  flags: Flags,
  runDir: string | null,
  job: GauntletJob,
): Promise<GauntletResult> {
  const { chapter, label, forceChoice } = job;
  process.stderr.write(`Gauntlet running: ${label}...\n`);

  const context = await browser.newContext({ baseURL: flags.url });
  const page = await context.newPage();
  let consoleErrors = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors++;
      process.stderr.write(`[${label}] [Browser Console Error] ${msg.text()}\n`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors++;
    process.stderr.write(`[${label}] [Browser Page Error] ${err.stack || err.message}\n`);
  });

  const start = Date.now();
  let status: 'completed' | 'stalled' = 'stalled';
  let stallInfo = '';
  const shots: { sceneIndex: number; path: string }[] = [];
  const visitedBeats = new Set<number>();
  const visitedModes = new Set<string>();
  const observedEdges = new Set<string>();
  let lastBeatIndex: number | null = null;
  // H1: track when beatIndex last actually changed (as opposed to just being
  // observed) so a timeout can be classified as a true soft-lock (engine
  // frozen on one beat) vs a global-timeout (beats kept advancing, the
  // chapter is just longer than its budget). Seeded at attempt start so a
  // chapter that never advances past beat 0 still measures elapsed time
  // correctly instead of comparing against `null`.
  let lastBeatChangeAt = Date.now();
  let lastObservedBeatIndex: number | null = null;
  const timeoutBudget = computeGauntletBudget(chapter, flags);
  let stall: 'soft-lock' | 'global-timeout' | undefined;
  let stuckBeatIndex: number | undefined;
  let stuckBeatType: string | undefined;
  let diagnostics: AdvanceTimeoutDiagnostics | undefined;

  const chapterDir = runDir ? path.resolve(runDir, slugify(label)) : null;
  if (chapterDir) fs.mkdirSync(chapterDir, { recursive: true });

  const captureScene = async (agent: GameAgent, sceneIndex: number) => {
    if (!chapterDir) return;
    const shotPath = path.resolve(chapterDir, `scene-${sceneIndex}.png`);
    await agent.stabilizedScreenshot(shotPath);
    shots.push({ sceneIndex, path: shotPath });
    emit({
      cmd: 'visual_checkpoint',
      ok: true,
      checkpointId: ++checkpointCount,
      path: shotPath,
      chapter: label,
      sceneIndex,
      mode: null,
      modeKind: null,
      modeBeatIndex: null,
    });
  };

  let agent: GameAgent | null = null;
  try {
    await navigateToChapter(page, chapter.title, { classified: !!chapter.classified, sealed: !!chapter.seal });
    await page.waitForSelector('canvas', { timeout: 15000 });

    agent = new GameAgent(page);
    // H2: apply once right after boot. Gauntlet attempts don't go through
    // main()'s normal-session 'ready' point, so this is the equivalent spot —
    // ChapterScene exists (canvas is up) but advanceUntil hasn't started yet.
    if (flags.speed !== null && !Number.isNaN(flags.speed)) {
      await agent.setTimeScale(flags.speed).catch(() => {});
    }
    if (flags.reuseSafeSave) {
      await agent.loadFileState(path.resolve(flags.reuseSafeSave));
    }
    if (chapterDir) await captureScene(agent, 0); // one at chapter start (N1)
    let lastSceneIndex = 0;
    let lastSpeedSceneIndex = 0;
    const tracking = flags.coverage || flags.transitions;

    // Reuse the proven advanceUntil per-tick logic (dismiss dialogue via a
    // trusted Space dispatch, click choices, auto-win skipModes, teleport onto
    // walk targets) instead of a parallel loop that pokes BeatEngine directly —
    // calling beatEngine.advanceBeat() out from under the React dialogue overlay
    // desyncs UI from engine state (see CLAUDE.md's StrictMode gotcha).
    try {
      await advanceUntil(
        page,
        () =>
          page.evaluate(() => {
            const game = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__;
            if (!game) return true; // game unmounted — flow ended, back at chapter select
            const scene = game.scene.getScene('ChapterScene');
            if (!scene) return true;
            const beats = scene.chapter?.beats;
            if (!scene.levelStarted || !beats) return false;
            if (scene.beatIndex >= beats.length) return true;
            // runEndChapter() plays victory FX then calls onLevelCompleted via a
            // React callback — it never advances beatIndex past this beat, so
            // "beatIndex >= beats.length" alone can never fire once reached.
            return beats[scene.beatIndex]?.type === 'endChapter';
          }),
        {
          maxSeconds: timeoutBudget,
          skipModes: ['*'],
          forceChoice,
          // H1's stall classification needs beatIndex-change tracking on
          // every attempt (not just --coverage/--transitions/--shots runs),
          // so onTick is now unconditional; the tracking-gated work inside it
          // is unchanged.
          onTick: async (info) => {
            if (info.beatIndex !== null && info.beatIndex !== lastObservedBeatIndex) {
              lastObservedBeatIndex = info.beatIndex;
              lastBeatChangeAt = Date.now();
            }
            if (tracking && info.beatIndex !== null) {
              visitedBeats.add(info.beatIndex);
              if (flags.transitions && lastBeatIndex !== null && lastBeatIndex !== info.beatIndex) {
                observedEdges.add(`${lastBeatIndex}->${info.beatIndex}`);
              }
              lastBeatIndex = info.beatIndex;
            }
            if (tracking && info.mode) visitedModes.add(info.mode);
            if (chapterDir && info.sceneIndex !== null && info.sceneIndex !== lastSceneIndex) {
              lastSceneIndex = info.sceneIndex;
              await captureScene(agent!, info.sceneIndex);
            }
            // H2: scene restarts can reset a fresh ChapterScene's timeScale to
            // Phaser's default (1), silently dropping --speed partway through
            // a multi-scene chapter. Re-apply whenever onTick observes a new
            // sceneIndex (already how --shots detects scene changes above) —
            // independent of --shots/chapterDir since this must run for every
            // gauntlet attempt that sets --speed, not just --shots ones.
            if (
              flags.speed !== null &&
              !Number.isNaN(flags.speed) &&
              info.sceneIndex !== null &&
              info.sceneIndex !== lastSpeedSceneIndex
            ) {
              lastSpeedSceneIndex = info.sceneIndex;
              await agent!.setTimeScale(flags.speed).catch(() => {});
            }
          },
        },
      );
      status = 'completed';
      // advanceUntil's condition check runs before onTick each iteration, so
      // the tick where beatIndex first reaches the terminal `endChapter` beat
      // exits the loop before that beat is ever recorded as visited. H1's
      // linter requires endChapter to be the chapter's last beat, so it's
      // safe to credit it here on a completed run.
      if (tracking) visitedBeats.add(chapter.beats.length - 1);
    } catch (timeoutErr) {
      status = 'stalled';
      const beatInfo = await agent.inspectBeats().catch(() => null);
      stallInfo = beatInfo
        ? `Beat ${beatInfo.currentBeatIndex}/${beatInfo.totalBeats} (type: ${beatInfo.currentBeat?.type}, speaker: ${beatInfo.currentBeat?.speaker ?? 'n/a'})`
        : timeoutErr instanceof Error
          ? timeoutErr.message
          : String(timeoutErr);

      // H1: classify why the attempt timed out. beatIndex frozen for >=10s at
      // the moment of failure means the engine itself stopped progressing
      // (a true soft-lock) — anything else means beats were still advancing
      // and this chapter simply needs more of its (already-scaled, H5)
      // budget than it got. stuckBeatIndex/stuckBeatType come from the same
      // beatInfo dump used for stallInfo above, so no extra round-trip.
      const stuckForMs = Date.now() - lastBeatChangeAt;
      if (stuckForMs >= 10_000) {
        stall = 'soft-lock';
        stuckBeatIndex = lastObservedBeatIndex ?? beatInfo?.currentBeatIndex;
        stuckBeatType = beatInfo?.currentBeat?.type;
      } else {
        stall = 'global-timeout';
      }

      // H3: additive to H1's stall/stuckBeatIndex — a raw diagnostics dump
      // from advanceUntil itself when the timeout came from an
      // AdvanceTimeoutError (it always does here, since this is the only
      // throw site inside advanceUntil, but guard defensively anyway).
      if (timeoutErr instanceof AdvanceTimeoutError) {
        diagnostics = timeoutErr.diagnostics;
      }
    }
  } catch (err) {
    stallInfo = err instanceof Error ? err.message : String(err);
  } finally {
    if (agent) await agent.dispose().catch(() => {});
    await context.close().catch(() => {});
  }

  const duration = Math.round((Date.now() - start) / 1000);
  const coverage = flags.coverage ? computeCoverage(chapter, visitedBeats, visitedModes) : undefined;
  const transitions = flags.transitions ? computeTransitionReport(chapter, observedEdges) : undefined;
  const result: GauntletResult = {
    chapter: label,
    status,
    errors: consoleErrors,
    duration,
    timeoutBudget,
    ...(status === 'stalled' ? { stallInfo } : {}),
    // H1: only meaningful on a stalled attempt — a completed run never hit
    // the timeout path that sets these.
    ...(status === 'stalled' && stall ? { stall } : {}),
    ...(status === 'stalled' && stuckBeatIndex !== undefined ? { stuckBeatIndex } : {}),
    ...(status === 'stalled' && stuckBeatType !== undefined ? { stuckBeatType } : {}),
    ...(status === 'stalled' && diagnostics ? { diagnostics } : {}),
    ...(chapterDir ? { shots } : {}),
    ...(coverage ? { coverage } : {}),
    ...(transitions ? { transitions } : {}),
  };
  emit({ ...result });
  if (coverage) emit({ cmd: 'coverage', ok: true, ...coverage });
  if (transitions) emit({ cmd: 'transitions', ok: true, ...transitions });
  return result;
}

// ── --playtest-smoke: chapter-agnostic playtest-mode advance() sweep ──────────
// Unlike the normal gauntlet (which drives advanceUntil with skipModes:['*']
// all the way to chapter-ended), this proves that reachWalkControl's own
// status classification — the same one the interactive `advance` command and
// the omega-agent-v1 protocol's playtest mode rely on — never dead-ends for a
// chapter. It resolves every status reachWalkControl can return instead of
// letting a lower-level helper paper over a stuck one.

interface PlaytestSmokeResult {
  chapter: string;
  id: string;
  ok: boolean;
  durationMs: number;
  statusCounts: Record<string, number>;
  coverage: {
    expected: CoverageManifest;
    exercised: { choices: number; walks: number; modesForced: number; walkFallbacks: number };
  };
  finding?: Record<string, unknown>;
}

async function runPlaytestSmokeAttempt(
  browser: Browser,
  flags: Flags,
  chapter: (typeof CHAPTERS)[number],
): Promise<PlaytestSmokeResult> {
  const label = chapter.title;
  process.stderr.write(`Playtest smoke running: ${label}...\n`);

  const context = await browser.newContext({ baseURL: flags.url });
  const page = await context.newPage();

  const start = Date.now();
  const timeoutBudget = computeGauntletBudget(chapter, flags);
  const statusCounts: Record<string, number> = {};
  const bump = (status: string) => { statusCounts[status] = (statusCounts[status] ?? 0) + 1; };

  let ok = false;
  let finding: Record<string, unknown> | undefined;
  let choices = 0;
  let walks = 0;
  let modesForced = 0;
  let walkFallbacks = 0;

  let agent: GameAgent | null = null;
  try {
    await navigateToChapter(page, chapter.title, { classified: !!chapter.classified, sealed: !!chapter.seal });
    await page.waitForSelector('canvas', { timeout: 15000 });
    agent = new GameAgent(page);

    let lastBeatIndex: number | null | undefined;
    let sameBeatStreak = 0;

    for (let iter = 0; iter < 200; iter++) {
      if (Date.now() - start > timeoutBudget * 1000) {
        finding = { budgetExceeded: { timeoutBudget, iterationsSoFar: iter } };
        break;
      }

      let step: Awaited<ReturnType<typeof reachWalkControl>>;
      try {
        step = await reachWalkControl(page, 60);
      } catch (err) {
        finding = {
          stall: err instanceof AdvanceTimeoutError ? { diagnostics: err.diagnostics } : { message: err instanceof Error ? err.message : String(err) },
        };
        break;
      }

      bump(step.status);

      if (step.status === 'chapter-ended') {
        ok = true;
        break;
      }

      // Belt-and-braces: reachWalkControl's condition now refuses to accept
      // walk-control while the live beat is `endChapter` (the race where
      // `runEndChapter()` never freezes movement, so the generic condition
      // could beat advanceUntil's stopOnChapterEnd check), but recognize the
      // terminal beat off the returned beat type anyway so a future condition
      // regression degrades this sweep's accuracy, not its verdict.
      if (step.beat?.type === 'endChapter') {
        ok = true;
        break;
      }

      if (step.status === 'choice-present') {
        await page.evaluate(() => {
          const el = document.querySelectorAll('[data-testid="dialogue-choice"]')[0] as HTMLElement | undefined;
          el?.click();
        });
        choices++;
        sameBeatStreak = 0;
        continue;
      }

      if (step.status === 'walk-target-present') {
        const target = await page.evaluate(() => {
          const scene = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene('ChapterScene');
          const wt = scene?.walkTarget;
          return wt ? { x: wt.x, y: wt.y, radius: wt.radius ?? 24 } : null;
        });
        sameBeatStreak = 0;
        if (!target) continue; // walkTarget vanished between the check and the read — loop again
        const res = await agent.walkTo(target.x, target.y, target.radius, 20);
        // GameAgent.walkTo drives movement via stepFrames (fixed-timestep
        // stepping while the Phaser RAF loop is asleep, for determinism) and
        // — same as the interactive `walkto` command — leaves the loop
        // asleep on return instead of waking it. Left alone, that silently
        // freezes every subsequent wall-clock-driven beat (cameraPan's
        // delayedCall, dialogue typewriters, tweens…), which otherwise reads
        // as an unrelated soft-lock several beats later. Explicitly resume
        // real-time ticking here so the sweep can keep progressing.
        await agent.resumeLoop().catch(() => {});
        if (res.ok) {
          walks++;
        } else {
          const distance = res.player ? Math.hypot(res.player.x - target.x, res.player.y - target.y) : null;
          finding = { walkFailure: { x: target.x, y: target.y, distance } };
          // Recovery so the sweep can keep going: teleport onto the target,
          // same mechanism advanceUntil itself uses for non-playtest sessions.
          await page.evaluate(({ x, y }) => {
            const scene = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene('ChapterScene');
            if (scene?.player) { scene.player.x = x; scene.player.y = y; }
          }, { x: target.x, y: target.y });
          walkFallbacks++;
        }
        continue;
      }

      if (step.status === 'mode-active') {
        await page.evaluate(() => {
          const scene = (window as unknown as { __OMEGA_GAME__?: any }).__OMEGA_GAME__?.scene.getScene('ChapterScene');
          scene?.activeMode?.harnessForceComplete?.({ outcome: 'win' });
        });
        modesForced++;
        sameBeatStreak = 0;
        continue;
      }

      if (step.status === 'ambient-dialogue') {
        sameBeatStreak = 0;
        continue;
      }

      // 'walk-control': beat-driven chapters should always either keep
      // progressing or stop on something classified above — three
      // consecutive walk-control ticks on the same (unchanged) beatIndex
      // means nothing is happening at all.
      //
      // Passive beats intentionally resolve on their own while player movement
      // remains available. Some are short tweens, but chase/wait timelines can
      // last several seconds; applying the three-poll walk-control stall rule
      // to them creates a false failure long before their timer is due. Let the
      // chapter budget bound passive waits and reserve the streak detector for
      // beats that are expected to stop on an interaction/status.
      if (step.beat?.expectation === 'passive') {
        await page.waitForTimeout(400);
        sameBeatStreak = 0;
        lastBeatIndex = step.beat.index;
        continue;
      }

      await page.waitForTimeout(400);
      const beatIndex = step.beat?.index ?? null;
      if (beatIndex !== null && beatIndex === lastBeatIndex) {
        sameBeatStreak++;
      } else {
        sameBeatStreak = 1;
        lastBeatIndex = beatIndex;
      }
      if (sameBeatStreak >= 3) {
        finding = { stall: { beat: step.beat } };
        break;
      }
    }
  } catch (err) {
    if (!finding) finding = { error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (agent) await agent.dispose().catch(() => {});
    await context.close().catch(() => {});
  }

  const durationMs = Date.now() - start;
  const result: PlaytestSmokeResult = {
    chapter: label,
    id: chapter.id,
    ok,
    durationMs,
    statusCounts,
    coverage: {
      expected: deriveCoverageManifest(chapter),
      exercised: { choices, walks, modesForced, walkFallbacks },
    },
    ...(finding ? { finding } : {}),
  };
  emit({ cmd: 'playtest_smoke', ...result });
  return result;
}

async function runPlaytestSmokeGauntlet(
  browser: Browser,
  flags: Flags,
  chapters: (typeof CHAPTERS)[number][],
): Promise<void> {
  const results = await runPool(chapters, flags.parallel, (chapter) => runPlaytestSmokeAttempt(browser, flags, chapter));
  await browser.close().catch(() => {});

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).map((r) => r.chapter);
  emit({ cmd: 'playtest_smoke_summary', ok: failed.length === 0, chapters: results.length, passed, failed });
  process.exit(failed.length === 0 ? 0 : 1);
}

async function runGauntlet(flags: Flags): Promise<void> {
  const browser = await chromium.launch({ headless: !flags.headed, slowMo: flags.slowmo });

  const targetChapters = flags.chapters
    ? flags.chapters.split(',').map(s => s.trim())
    : [];
  const chapters = CHAPTERS.filter((chapter) =>
    targetChapters.length === 0 || targetChapters.some(t =>
      chapter.title.toLowerCase().includes(t.toLowerCase()) ||
      chapter.id.toLowerCase().includes(t.toLowerCase())
    )
  );

  if (flags.playtestSmoke) {
    await runPlaytestSmokeGauntlet(browser, flags, chapters);
    return;
  }

  // N1: --shots writes one timestamped run folder under agent-artifacts/gauntlet/,
  // one subfolder per chapter (or per-branch job), with a per-scene stabilized
  // screenshot + a generated contact-sheet index.html at the end.
  const runDir = flags.shots
    ? path.resolve('agent-artifacts/gauntlet', new Date().toISOString().replace(/[:.]/g, '-'))
    : null;
  if (runDir) fs.mkdirSync(runDir, { recursive: true });

  const jobs = buildGauntletJobs(chapters, flags);
  // G8: chapter/branch attempts are independent (each gets its own browser
  // context), so --parallel just widens the worker pool below wall-clock;
  // it changes nothing about what's tested. Defaults to 1 (sequential, as before).
  const results = await runPool(jobs, flags.parallel, (job) => runChapterAttempt(browser, flags, runDir, job));

  await browser.close().catch(() => {});

  if (runDir) {
    writeContactSheet(runDir, results);
    process.stderr.write(`\nContact sheet: ${path.resolve(runDir, 'index.html')}\n`);
  }

  if (flags.coverage || flags.transitions) {
    const reportDir = runDir ?? path.resolve('agent-artifacts/gauntlet', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(reportDir, { recursive: true });
    if (flags.coverage) {
      const coveragePath = path.resolve(reportDir, 'coverage.json');
      fs.writeFileSync(coveragePath, JSON.stringify(results.map((r) => r.coverage), null, 2));
      process.stderr.write(`Coverage report: ${coveragePath}\n`);
    }
    if (flags.transitions) {
      const transitionsPath = path.resolve(reportDir, 'transitions.json');
      fs.writeFileSync(transitionsPath, JSON.stringify(results.map((r) => r.transitions), null, 2));
      process.stderr.write(`Transition report: ${transitionsPath}\n`);
    }
  }

  process.stderr.write('\n=== GAUNTLET SUMMARY ===\n');
  console.table(results.map(({ shots, coverage, transitions, ...r }) => ({
    ...r,
    shots: shots?.length ?? 0,
    ...(coverage ? { beatsVisited: `${coverage.beatsVisited}/${coverage.beatsTotal}` } : {}),
    ...(transitions ? { unexpectedTransitions: transitions.unexpectedTransitions.length } : {}),
  })));

  const anyStalled = results.some(r => r.status === 'stalled');
  const overErrorBudget =
    flags.maxErrors !== null && !Number.isNaN(flags.maxErrors) && results.some(r => r.errors > flags.maxErrors!);
  const anyUnexpectedTransition = results.some(r => (r.transitions?.unexpectedTransitions.length ?? 0) > 0);
  if (anyStalled || overErrorBudget) {
    if (anyStalled) process.stderr.write('Gauntlet failed! One or more chapters stalled.\n');
    if (overErrorBudget) process.stderr.write(`Gauntlet failed! A chapter exceeded --max-errors ${flags.maxErrors}.\n`);
    process.exit(1);
  } else {
    if (anyUnexpectedTransition) {
      process.stderr.write('Gauntlet passed, but --transitions found unexpected beat jumps — see transitions.json.\n');
    }
    process.stderr.write('Gauntlet passed successfully!\n');
    process.exit(0);
  }
}

// ── I2: fuzz mode ──────────────────────────────────────────────────────────────
// Seeded random key/click/mode-launch mashing, watching the console (A1's hook,
// already wired into GameAgent) for a new error. Reuses runCommand for every
// action it takes, so --record captures the exact action sequence — pairing
// --fuzz with --record turns a crash into a committed, deterministic repro
// script for free (C3 + C2), per the spec. Stall-finding (A4) is out of scope
// here: this loop's own actions never block, so there's nothing to detect a
// stall against — it either crashes or it doesn't.
function makeMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FUZZ_KEYS = ['w', 'a', 's', 'd', 'Space', 'e', 'Escape'];

async function runFuzz(agent: GameAgent, page: Page, flags: Flags, seconds: number): Promise<void> {
  const seed = flags.seed ?? Date.now();
  const rand = makeMulberry32(seed);
  const endAt = Date.now() + seconds * 1000;
  let priorErrors = agent.getConsoleLogs().filter((e) => e.type === 'error').length;
  let actionCount = 0;
  emit({ cmd: 'fuzz', ok: true, status: 'started', seed, seconds });

  while (Date.now() < endAt) {
    const roll = rand();
    let cmd: string;
    if (roll < 0.5) {
      const key = FUZZ_KEYS[Math.floor(rand() * FUZZ_KEYS.length)];
      const ms = 100 + Math.floor(rand() * 400);
      cmd = `press ${key} ${ms}`;
    } else if (roll < 0.85) {
      const x = Math.floor(rand() * 800);
      const y = Math.floor(rand() * 600);
      cmd = `click ${x} ${y}`;
    } else {
      // Try to shake loose a foreground minigame if one launched; otherwise a
      // harmless beat to keep the loop from spinning on nothing.
      const modeId = await page
        .evaluate(() => (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene')?.activeMode?.id ?? null)
        .catch(() => null);
      cmd = modeId ? 'winmode' : 'wait 200';
    }

    actionCount++;
    const keepGoing = await runCommand(agent, page, flags, cmd);
    if (!keepGoing) break;

    const errors = agent.getConsoleLogs().filter((e) => e.type === 'error');
    if (errors.length > priorErrors) {
      emit({
        cmd: 'fuzz',
        ok: false,
        status: 'crash',
        actionCount,
        seed,
        newErrors: errors.slice(priorErrors).map((e) => e.text),
      });
      return;
    }
    priorErrors = errors.length;
    await new Promise((r) => setTimeout(r, 50));
  }
  emit({ cmd: 'fuzz', ok: true, status: 'completed', actionCount, seed, seconds });
}

// ── Session bootstrap ─────────────────────────────────────────────────────────

async function readStdin(agent: GameAgent, page: Page, flags: Flags): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const interactive = process.stdin.isTTY;
  if (interactive) process.stderr.write('agent> ');
  // C3: --repl is an explicit alias for the same stdin loop --keep-open already
  // runs (readline over runCommand, ';'-splitting and --record handled inside
  // runCommand itself — nothing new there). The one thing it adds is this
  // ready-signal line, emitted once the readline interface is actually
  // listening, so a process piping commands into stdin line-by-line knows the
  // exact moment it's safe to start writing instead of guessing/sleeping.
  if (flags.repl) emit({ repl: 'ready' });
  const pending = new Set<Promise<void>>();
  let legacyChain = Promise.resolve();
  let closed = false;
  await new Promise<void>((resolve) => {
    const settle = () => {
      if (closed && pending.size === 0) resolve();
    };
    const runLine = (line: string) => {
      const isProtocol = line.trim().startsWith('{');
      const execute = async () => {
        const keepGoing = await processCommandLine(agent, page, flags, line);
        if (!keepGoing) {
          rl.close();
          return;
        }
        await maybeEmitCheckpoint(agent, page, flags);
        await updatePlaytestProgress(page, flags);
        if (interactive) process.stderr.write('agent> ');
      };
      // JSONL commands are dispatched immediately so a second line can be
      // rejected deterministically while the first is still running. Legacy
      // interactive lines retain their historical one-at-a-time ordering.
      const task = isProtocol ? execute() : (legacyChain = legacyChain.then(execute));
      pending.add(task);
      void task.then(
        () => { pending.delete(task); settle(); },
        () => { pending.delete(task); settle(); },
      );
    };
    rl.on('line', runLine);
    rl.on('close', () => {
      closed = true;
      settle();
    });
  });
  try {
    // The promise above drains every dispatched command before teardown.
  } finally {
    // `readline` over a PTY leaves stdin in flowing mode after an early
    // `quit`/`exit` break on some Node versions. That keeps the otherwise-
    // finished CLI alive after session_summary, hiding its final exit code.
    rl.close();
    process.stdin.pause();
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    process.stdout.write(HELP + '\n');
    return;
  }

  if (flags.diagnostic && !flags.chapter) {
    throw new Error('--diagnostic requires --chapter <id-or-title>.');
  }

  if (flags.gauntlet) {
    await runGauntlet(flags);
    return;
  }

  let browser: Browser | null = null;
  let agent: GameAgent | null = null;
  let page: Page | null = null;
  let selectedChapter: ChapterConfig | null = null;
  try {
    if (flags.transcript) {
      const transcriptPath = path.resolve(flags.transcript);
      fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
      transcriptStream = fs.createWriteStream(transcriptPath);
    }
    browser = await chromium.launch({ headless: !flags.headed, slowMo: flags.slowmo });
    const context = await browser.newContext({ baseURL: flags.url });
    page = await context.newPage();

    if (flags.seed !== null) {
      await page.addInitScript((seedVal) => {
        function mulberry32(a: number) {
          return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }
        Math.random = mulberry32(seedVal);
      }, flags.seed);
    }

    if (flags.record) {
      const recordPath = path.resolve(flags.record);
      fs.mkdirSync(path.dirname(recordPath), { recursive: true });
      recordStream = fs.createWriteStream(recordPath);
      lastCommandTime = Date.now();
    }

    // Get to the game canvas.
    if (flags.chapter) {
      // Auto-detect chapter-select seals from the chapter's own config so
      // `--classified` doesn't need to be remembered/passed by hand for the
      // UMBC/Rose/Origins chapters — but still honor an explicit --classified
      // for a --chapter
      // value that doesn't resolve to a known chapter (e.g. --url pointed at
      // a custom deployment with its own chapter list).
      const matchedChapter = CHAPTERS.find(
        (c) =>
          c.title.toLowerCase() === flags.chapter!.toLowerCase() ||
          c.id.toLowerCase() === flags.chapter!.toLowerCase() ||
          String(c.index) === flags.chapter,
      );
      selectedChapter = matchedChapter ?? null;
      const classified = flags.classified || !!matchedChapter?.classified;
      await navigateToChapter(page, matchedChapter?.title ?? flags.chapter, {
        classified,
        sealed: !!matchedChapter?.seal,
      });
    } else {
      await page.goto(flags.url);
    }
    await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => {});
    agent = new GameAgent(page);
    if (flags.playtest && selectedChapter) {
      playtestProgress = new PlaytestProgressWriter(
        selectedChapter,
        deriveCoverageManifest(selectedChapter),
        flags.out,
      );
    }
    if (flags.seed !== null) agent.setSeed(flags.seed);
    // Soft-fail: a session with no --chapter (e.g. one whose first real
    // command is `loadstate <file>`, which does its own navigation) starts on
    // the canvas-less chapter-select menu — focusCanvas() would otherwise
    // hang on Playwright's default actionability timeout waiting for a canvas
    // that will never appear without a command running first.
    await agent.focusCanvas().catch(() => {});
    // H2: applied once here, right after the chapter scene has booted (same
    // point 'ready' is emitted). Only meaningful when a chapter is actually
    // loaded (ChapterScene exists) — soft-fails on the canvas-less
    // chapter-select menu for the same reason focusCanvas() does above.
    if (flags.speed !== null && !Number.isNaN(flags.speed)) {
      await agent.setTimeScale(flags.speed).catch(() => {});
    }
    emit({ cmd: 'ready', ok: true, url: flags.url, chapter: flags.chapter, seed: flags.seed, speed: flags.speed, verbose: flags.verbose });
    await maybeEmitCheckpoint(agent, page, flags); // chapter-load checkpoint (N3)
    await updatePlaytestProgress(page, flags);

    if (flags.gif) startGifCapture(page); // I3

    if (flags.fuzz !== null) await runFuzz(agent, page, flags, flags.fuzz); // I2

    // Source of commands: --script file, inline positional, or stdin.
    let lines: string[] | null = null;
    if (flags.script) lines = fs.readFileSync(flags.script, 'utf8').split('\n');
    else if (flags.inline) lines = flags.inline.split(/;|\n/);

    if (lines) {
      for (const line of lines) {
        if (!(await processCommandLine(agent, page, flags, line))) break;
        await maybeEmitCheckpoint(agent, page, flags);
        await updatePlaytestProgress(page, flags);
      }
      if (flags.keepOpen) await readStdin(agent, page, flags);
    } else if (flags.fuzz === null || flags.keepOpen) {
      // A --fuzz-only session (no --script/--inline/--keep-open) ends after
      // fuzzing instead of hanging on stdin that will never arrive in an
      // unattended overnight run.
      await readStdin(agent, page, flags);
    }
  } finally {
    if (flags.gif) {
      await finishGifCapture(flags.gif).catch(() => {});
    } else if (gifCapturing && gifStartedByCommand) {
      // H6: a gifstart capture that never got a matching gifstop before the
      // session ended (e.g. `quit`/EOF cut it short). --gif (whole-session)
      // was NOT set, so there's no caller-declared output path — finishing to
      // a default timestamped file under --out is strictly more useful than
      // silently discarding the frames already captured, and matches what
      // gifstop itself would have chosen as a default name.
      fs.mkdirSync(flags.out, { recursive: true });
      const defaultFile = path.resolve(
        flags.out,
        `gif-${new Date().toISOString().replace(/[:.]/g, '-')}.gif`,
      );
      await finishGifCapture(defaultFile).catch(() => {});
    }
    if (recordStream) {
      recordStream.end();
      recordStream = null;
    }
    if (agent) {
      const entries = agent.getConsoleLogs();
      await emitCheckpointContactSheet(flags);
      const visualQa = flags.playtest ? playtestCompliance.summary(flags.checkpoints) : null;
      const coverage = flags.playtest ? playtestCoverage.summary() : null;
      const findings = flags.playtest ? playtestFindings.summary() : [];
      const integrity = playtestBypasses.length === 0 ? 'natural' : 'partially-bypassed';
      const completion = visualQa === null || coverage === null
        ? null
        : playtestCompletionVerdict(visualQa, coverage, integrity, findings);
      const progress = completion && page
        ? await updatePlaytestProgress(page, flags, completion.status)
        : null;
      const sessionOk = completion?.ok ?? true;
      if (completion && !completion.ok) process.exitCode = completion.exitCode;
      emit({
        cmd: 'session_summary',
        ok: sessionOk,
        errors: entries.filter(e => e.type === 'error').length,
        warnings: entries.filter(e => e.type === 'warning').length,
        ...(flags.playtest
          ? {
              completion_status: completion!.status,
              playtest_integrity: integrity,
              bypasses: [...playtestBypasses],
              audit: [...playtestAudit],
              ...(selectedChapter
                ? { chapter: { id: selectedChapter.id, title: selectedChapter.title } }
                : {}),
              findings,
              investigation_verdict: investigationVerdict,
              ...(investigationNote ? { investigation_note: investigationNote } : {}),
              progress,
              visual_qa: visualQa,
              coverage,
            }
          : flags.diagnostic
            ? {
                evidenceClass: 'targeted-diagnostic',
                completionEligible: false,
                completion_status: 'targeted-diagnostic',
                investigation_verdict: investigationVerdict,
                ...(investigationNote ? { investigation_note: investigationNote } : {}),
                playtest_integrity: 'not-applicable',
                chapter: selectedChapter ? { id: selectedChapter.id, title: selectedChapter.title } : undefined,
              }
            : {}),
      });
      await agent.dispose().catch(() => {});
    }
    if (transcriptStream) {
      await new Promise<void>((resolve) => transcriptStream!.end(resolve));
      transcriptStream = null;
    }
    if (browser) await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  emit({ cmd: 'fatal', ok: false, error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
