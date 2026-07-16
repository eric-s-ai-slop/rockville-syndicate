export interface CommandArgumentHelp {
  name: string;
  description: string;
}

export interface CommandHelp {
  command: string;
  aliases: readonly string[];
  category: CommandCategory;
  syntax: string;
  arguments: readonly CommandArgumentHelp[];
  example: string;
  summary: string;
}

type CommandCategory =
  | 'Keyboard'
  | 'Mouse'
  | 'State / bridge'
  | 'Capture'
  | 'Time'
  | 'Debug'
  | 'Flow / misc';

const argument = (name: string, description: string): CommandArgumentHelp => ({ name, description });

/**
 * Canonical public REPL command registry. Keep dispatch-only implementation
 * details in cli.ts; all user-facing command names and help live here.
 */
export const COMMAND_HELP = [
  { command: 'hold', aliases: [], category: 'Keyboard', syntax: 'hold <key>', arguments: [argument('key', 'Key to hold down until release.')], example: 'hold w', summary: 'Hold a key down until release.' },
  { command: 'release', aliases: [], category: 'Keyboard', syntax: 'release <key>', arguments: [argument('key', 'Held key to release.')], example: 'release w', summary: 'Release one held key.' },
  { command: 'releaseall', aliases: [], category: 'Keyboard', syntax: 'releaseall', arguments: [], example: 'releaseall', summary: 'Release every held key.' },
  { command: 'press', aliases: [], category: 'Keyboard', syntax: 'press <key> [ms]', arguments: [argument('key', 'Key to press.'), argument('ms', 'Optional hold duration in milliseconds; omitted means a tap.')], example: 'press w 2000', summary: 'Press a key, optionally holding it first.' },
  { command: 'tap', aliases: ['key'], category: 'Keyboard', syntax: 'tap <key>', arguments: [argument('key', 'Key to tap.')], example: 'tap space', summary: 'Send a discrete key down/up.' },

  { command: 'mousedown', aliases: [], category: 'Mouse', syntax: 'mousedown <x> <y> [left|right]', arguments: [argument('x', 'Viewport X coordinate.'), argument('y', 'Viewport Y coordinate.'), argument('left|right', 'Optional mouse button; defaults to left.')], example: 'mousedown 200 300 left', summary: 'Press a mouse button at viewport coordinates.' },
  { command: 'mousemove', aliases: [], category: 'Mouse', syntax: 'mousemove <x> <y>', arguments: [argument('x', 'Viewport X coordinate.'), argument('y', 'Viewport Y coordinate.')], example: 'mousemove 500 300', summary: 'Move the pointer, dragging if a button is held.' },
  { command: 'mouseup', aliases: [], category: 'Mouse', syntax: 'mouseup [x] [y] [left|right]', arguments: [argument('x', 'Optional viewport X coordinate.'), argument('y', 'Optional viewport Y coordinate.'), argument('left|right', 'Optional mouse button; defaults to left.')], example: 'mouseup 500 300 left', summary: 'Release a mouse button.' },
  { command: 'click', aliases: [], category: 'Mouse', syntax: 'click <x> <y> [left|right] [--world]', arguments: [argument('x', 'Viewport X, or world X with --world.'), argument('y', 'Viewport Y, or world Y with --world.'), argument('left|right', 'Optional mouse button; defaults to left.'), argument('--world', 'Interpret coordinates in world space.')], example: 'click 640 360 --world', summary: 'Click a viewport or world point.' },
  { command: 'drag', aliases: [], category: 'Mouse', syntax: 'drag <sx> <sy> <ex> <ey> [ms] [--world]', arguments: [argument('sx sy', 'Start coordinates.'), argument('ex ey', 'End coordinates.'), argument('ms', 'Optional drag duration; defaults to 400.'), argument('--world', 'Interpret both points in world space.')], example: 'drag 200 300 500 300 400', summary: 'Smoothly drag between two points.' },

  { command: 'state', aliases: [], category: 'State / bridge', syntax: 'state', arguments: [], example: 'state', summary: 'Print the current game-state snapshot.' },
  { command: 'text', aliases: [], category: 'State / bridge', syntax: 'text', arguments: [], example: 'text', summary: 'Extract visible Phaser and DOM text.' },
  { command: 'targets', aliases: [], category: 'State / bridge', syntax: 'targets', arguments: [], example: 'targets', summary: 'List the walk target and NPC coordinates.' },
  { command: 'observe', aliases: ['obs'], category: 'State / bridge', syntax: 'observe [--shot]', arguments: [argument('--shot', 'Attach a stabilized screenshot path.')], example: 'observe --shot', summary: 'Print a composite observation and console delta.' },
  { command: 'reviewcheckpoint', aliases: [], category: 'State / bridge', syntax: 'reviewcheckpoint <id> <clear|issue-found|inconclusive> <note>', arguments: [argument('id', 'Checkpoint receipt ID.'), argument('verdict', 'Visual review verdict.'), argument('note', 'Concrete visual inspection note.')], example: 'reviewcheckpoint 3 clear "layout and sprites render correctly"', summary: 'Acknowledge an inspected visual checkpoint.' },
  { command: 'recordfinding', aliases: [], category: 'State / bridge', syntax: 'recordfinding <severity> <category> <title> <location> <reproduction> <expected> <actual> <evidence>', arguments: [argument('fields', 'JSON command arguments for one structured finding.')], example: '{"action":"recordfinding","args":["major","visual","HUD overlap","scene 2","open scene","separate labels","labels overlap","checkpoint:3"]}', summary: 'Record a structured live finding (JSON input).' },
  { command: 'verdict', aliases: ['investigation-verdict'], category: 'State / bridge', syntax: 'verdict <bug-reproduced|not-reproduced|not-verified|inconclusive> [note]', arguments: [argument('verdict', 'Investigation outcome.'), argument('note', 'Optional supporting note.')], example: 'verdict not-reproduced "three clean attempts"', summary: 'Set the investigation verdict.' },
  { command: 'dismissfinding', aliases: [], category: 'State / bridge', syntax: 'dismissfinding <id> <reason>', arguments: [argument('id', 'Finding ID.'), argument('reason', 'Reason the finding was disproven.')], example: 'dismissfinding 2 "expected transition"', summary: 'Dismiss a finding while preserving its history.' },
  { command: 'listfindings', aliases: [], category: 'State / bridge', syntax: 'listfindings', arguments: [], example: 'listfindings', summary: 'Print the structured finding ledger.' },
  { command: 'diff', aliases: [], category: 'State / bridge', syntax: 'diff', arguments: [], example: 'diff', summary: 'Observe only fields changed since the last diff or observation.' },
  { command: 'watch', aliases: [], category: 'State / bridge', syntax: 'watch <jsExpr> [timeoutMs]', arguments: [argument('jsExpr', 'Read-only predicate with scene and game in scope.'), argument('timeoutMs', 'Optional timeout in milliseconds.')], example: 'watch "scene.activeHp < 50" 10000', summary: 'Wait for a live-scene predicate.' },
  { command: 'beat', aliases: ['beats'], category: 'State / bridge', syntax: 'beat', arguments: [], example: 'beat', summary: 'Inspect current and upcoming narrative beats.' },
  { command: 'skipbeat', aliases: [], category: 'State / bridge', syntax: 'skipbeat [n]', arguments: [argument('n', 'Positive number of beats; defaults to 1.')], example: 'skipbeat 1', summary: 'Force-advance past blocking beats.' },
  { command: 'logs', aliases: ['console'], category: 'State / bridge', syntax: 'logs [clear]', arguments: [argument('clear', 'Clear buffered entries instead of printing them.')], example: 'logs', summary: 'Print or clear buffered browser diagnostics.' },
  { command: 'audio', aliases: [], category: 'State / bridge', syntax: 'audio [assert <silent|playing|stopped> [key]]', arguments: [argument('assert', 'Optionally assert an audio state.'), argument('key', 'Track key for playing or stopped assertions.')], example: 'audio assert playing battle-theme', summary: 'Inspect or assert audio state.' },
  { command: 'camera', aliases: [], category: 'State / bridge', syntax: 'camera [zoom <factor>|center <x> <y>|fit|follow]', arguments: [argument('action', 'Optional camera mutation.'), argument('factor|x y', 'Values required by zoom or center.')], example: 'camera fit', summary: 'Inspect or control the camera.' },
  { command: 'goto', aliases: [], category: 'State / bridge', syntax: 'goto <sceneIndex> | goto scene <sceneIndex> [beat <index|id>] | goto beat <index|id>', arguments: [argument('target', 'Scene/beat target; named forms require --diagnostic.')], example: 'goto scene 2 beat 4', summary: 'Jump to a scene or diagnostic beat target.' },
  { command: 'savestate', aliases: [], category: 'State / bridge', syntax: 'savestate [file]', arguments: [argument('file', 'Optional persistent save file; omitted uses memory.')], example: 'savestate /tmp/omega-save.json', summary: 'Quick-save state in memory or to a file.' },
  { command: 'loadstate', aliases: [], category: 'State / bridge', syntax: 'loadstate [file]', arguments: [argument('file', 'Optional persistent save file; omitted uses memory.')], example: 'loadstate /tmp/omega-save.json', summary: 'Restore state from memory or a file.' },
  { command: 'mode', aliases: [], category: 'State / bridge', syntax: 'mode <modeId> [configJson]', arguments: [argument('modeId', 'Registered mode ID.'), argument('configJson', 'Optional JSON configuration object.')], example: 'mode chase {"speed":2}', summary: 'Launch a registered minigame directly.' },
  { command: 'modes', aliases: [], category: 'State / bridge', syntax: 'modes', arguments: [], example: 'modes', summary: 'List registered minigame IDs.' },
  { command: 'winmode', aliases: [], category: 'State / bridge', syntax: 'winmode', arguments: [], example: 'winmode', summary: 'Force-complete the foreground mode as a win.' },
  { command: 'losemode', aliases: [], category: 'State / bridge', syntax: 'losemode', arguments: [], example: 'losemode', summary: 'Force-complete the foreground mode as a loss.' },
  { command: 'modify', aliases: [], category: 'State / bridge', syntax: 'modify <hp|ledger|shards> <value>', arguments: [argument('stat', 'Stat to set directly.'), argument('value', 'New numeric value.')], example: 'modify hp 50', summary: 'Directly set a game stat.' },
  { command: 'choose', aliases: [], category: 'State / bridge', syntax: 'choose <index|text>', arguments: [argument('index|text', 'Choice index or fuzzy text match.')], example: 'choose 0', summary: 'Select a dialogue option.' },
  { command: 'settings', aliases: [], category: 'State / bridge', syntax: 'settings [key] [value]', arguments: [argument('key', 'Optional setting key.'), argument('value', 'Optional boolean, number, or string value.')], example: 'settings musicVolume 0.5', summary: 'Print or update live settings.' },
  { command: 'chapterflag', aliases: [], category: 'State / bridge', syntax: 'chapterflag [chapterId] [complete|uncomplete|freeplay-on|freeplay-off]', arguments: [argument('chapterId', 'Chapter whose progress should change.'), argument('action', 'Progress mutation; omit all arguments to inspect.')], example: 'chapterflag chapter-1 complete', summary: 'Print or update Hall-of-Records progress.' },
  { command: 'anim', aliases: [], category: 'State / bridge', syntax: 'anim', arguments: [], example: 'anim', summary: 'Inspect per-actor animation state.' },
  { command: 'depth', aliases: [], category: 'State / bridge', syntax: 'depth [worldX worldY]', arguments: [argument('worldX worldY', 'Optional world point filter.')], example: 'depth 640 360', summary: 'List visible objects ordered by depth.' },
  { command: 'hitreport', aliases: [], category: 'State / bridge', syntax: 'hitreport <worldX> <worldY>', arguments: [argument('worldX', 'World X coordinate.'), argument('worldY', 'World Y coordinate.')], example: 'hitreport 640 360', summary: 'Inspect render, physics, and DOM hits at a world point.' },
  { command: 'fx', aliases: [], category: 'State / bridge', syntax: 'fx', arguments: [], example: 'fx', summary: 'Inspect camera effects and tint state.' },
  { command: 'walkto', aliases: [], category: 'State / bridge', syntax: 'walkto <worldX> <worldY> [radius] [maxSeconds]', arguments: [argument('worldX', 'Target world-space X coordinate.'), argument('worldY', 'Target world-space Y coordinate.'), argument('radius', 'Optional arrival radius; defaults to 24.'), argument('maxSeconds', 'Optional timeout; defaults to 8.')], example: 'walkto 640 360 24 30', summary: 'Walk directionally toward a world point.' },
  { command: 'injectbeat', aliases: [], category: 'State / bridge', syntax: 'injectbeat <json>', arguments: [argument('json', 'Beat object to dispatch directly.')], example: 'injectbeat {"type":"wait","duration":500}', summary: 'Dispatch one beat object directly.' },
  { command: 'clickworld', aliases: [], category: 'State / bridge', syntax: 'clickworld <x> <y> [left|right]', arguments: [argument('x', 'World X coordinate.'), argument('y', 'World Y coordinate.'), argument('left|right', 'Optional mouse button.')], example: 'clickworld 640 360', summary: 'Translate a world point and click it.' },
  { command: 'where', aliases: [], category: 'State / bridge', syntax: 'where <x> <y>', arguments: [argument('x', 'World X coordinate.'), argument('y', 'World Y coordinate.')], example: 'where 640 360', summary: 'Translate a world point to viewport coordinates.' },
  { command: 'eval', aliases: [], category: 'State / bridge', syntax: 'eval <js>', arguments: [argument('js', 'JavaScript expression to run in the page.')], example: 'eval window.__OMEGA_GAME__.scene.keys.length', summary: 'Evaluate JavaScript in the game page.' },
  { command: 'reseed', aliases: [], category: 'State / bridge', syntax: 'reseed <seed>', arguments: [argument('seed', 'New numeric PRNG seed.')], example: 'reseed 42', summary: 'Reset the seeded random generator.' },
  { command: 'perf', aliases: [], category: 'State / bridge', syntax: 'perf', arguments: [], example: 'perf', summary: 'Inspect runtime performance metrics.' },

  { command: 'screenshot', aliases: [], category: 'Capture', syntax: 'screenshot [name] [--annotate]', arguments: [argument('name', 'Optional output filename.'), argument('--annotate', 'Draw actor bounds, names, depth, and walk target.')], example: 'screenshot scene2.png --annotate', summary: 'Save a normal or annotated PNG.' },
  { command: 'gifstart', aliases: [], category: 'Capture', syntax: 'gifstart', arguments: [], example: 'gifstart', summary: 'Begin a scoped GIF frame capture.' },
  { command: 'gifstop', aliases: [], category: 'Capture', syntax: 'gifstop [file]', arguments: [argument('file', 'Optional output name under --out.')], example: 'gifstop movement.gif', summary: 'Stop and assemble a scoped GIF capture.' },
  { command: 'golden', aliases: [], category: 'Capture', syntax: 'golden <save|check> <name> [threshold]', arguments: [argument('save|check', 'Create or compare a golden image.'), argument('name', 'Golden image name.'), argument('threshold', 'Optional difference threshold; defaults to 0.01.')], example: 'golden check title-screen 0.01', summary: 'Save or compare a golden screenshot.' },

  { command: 'pause', aliases: [], category: 'Time', syntax: 'pause', arguments: [], example: 'pause', summary: 'Pause the Phaser loop.' },
  { command: 'resume', aliases: [], category: 'Time', syntax: 'resume', arguments: [], example: 'resume', summary: 'Resume the Phaser loop.' },
  { command: 'loop', aliases: [], category: 'Time', syntax: 'loop', arguments: [], example: 'loop', summary: 'Report whether the Phaser loop is running.' },
  { command: 'restart', aliases: ['refresh'], category: 'Time', syntax: 'restart', arguments: [], example: 'restart', summary: 'Reload and re-enter the selected chapter.' },
  { command: 'step', aliases: [], category: 'Time', syntax: 'step <frames> [fps]', arguments: [argument('frames', 'Number of fixed-timestep frames.'), argument('fps', 'Optional simulated frames per second; defaults to 60.')], example: 'step 30 60', summary: 'Advance a fixed number of frames.' },
  { command: 'speed', aliases: ['timescale'], category: 'Time', syntax: 'speed <factor>', arguments: [argument('factor', 'Physics, tween, and timer multiplier.')], example: 'speed 3', summary: 'Set the Phaser time-scale multiplier.' },
  { command: 'wait', aliases: [], category: 'Time', syntax: 'wait <ms>', arguments: [argument('ms', 'Real-time delay in milliseconds.')], example: 'wait 500', summary: 'Wait in real time.' },

  { command: 'debug', aliases: [], category: 'Debug', syntax: 'debug <on|off>', arguments: [argument('on|off', 'Whether physics debug graphics are enabled.')], example: 'debug on', summary: 'Toggle physics debug graphics.' },

  { command: 'advance', aliases: [], category: 'Flow / misc', syntax: 'advance [maxSeconds]', arguments: [argument('maxSeconds', 'Optional timeout; defaults to 60.')], example: 'advance 30', summary: 'Advance dialogue and passive beats to the next interaction boundary.' },
  { command: 'advance-to', aliases: [], category: 'Flow / misc', syntax: 'advance-to scene <sceneIndex> [beat <index|id>]', arguments: [argument('sceneIndex', 'Diagnostic target scene.'), argument('index|id', 'Optional target beat.')], example: 'advance-to scene 2 beat 4', summary: 'Use normal progression to reach a diagnostic target.' },
  { command: 'replay', aliases: [], category: 'Flow / misc', syntax: 'replay <file>', arguments: [argument('file', 'Command file to execute line by line.')], example: 'replay repro.commands', summary: 'Replay commands from a file.' },
  { command: 'help', aliases: [], category: 'Flow / misc', syntax: 'help [command] | help --json <command>', arguments: [argument('command', 'Optional command whose concise help should be shown.')], example: 'help walkto', summary: 'Print global or command-scoped help.' },
  { command: 'quit', aliases: ['exit'], category: 'Flow / misc', syntax: 'quit', arguments: [], example: 'quit', summary: 'Close the browser and end the session.' },
] as const satisfies readonly CommandHelp[];

const CATEGORY_ORDER: readonly CommandCategory[] = [
  'Keyboard',
  'Mouse',
  'State / bridge',
  'Capture',
  'Time',
  'Debug',
  'Flow / misc',
];

const HELP_BY_NAME = new Map<string, CommandHelp>();
for (const help of COMMAND_HELP) {
  for (const name of [help.command, ...help.aliases]) {
    if (HELP_BY_NAME.has(name)) throw new Error(`Duplicate command help name: ${name}`);
    HELP_BY_NAME.set(name, help);
  }
}

/** Every command and alias accepted by runCommand. */
export const PUBLIC_COMMAND_NAMES = [...HELP_BY_NAME.keys()].sort();

export function getCommandHelp(command: string): CommandHelp | null {
  return HELP_BY_NAME.get(command.trim().toLowerCase()) ?? null;
}

export function formatCommandHelp(command: string): string | null {
  const help = getCommandHelp(command);
  if (!help) return null;
  const args = help.arguments.length
    ? help.arguments.map((item) => `  ${item.name} — ${item.description}`).join('\n')
    : '  (none)';
  return [`SYNTAX\n  ${help.syntax}`, `ARGUMENTS\n${args}`, `EXAMPLE\n  ${help.example}`].join('\n');
}

export function formatCommandHelpJson(command: string): string {
  const help = getCommandHelp(command);
  return JSON.stringify({
    cmd: 'help',
    ok: !!help,
    ...(help ?? { error: `No scoped help is registered for "${command}".` }),
  });
}

/** The global command menu is generated from the same data as scoped help. */
export function formatGlobalCommandHelp(): string {
  const lines = ["COMMANDS (one per line; ';' also separates them on a single line)"];
  for (const category of CATEGORY_ORDER) {
    lines.push(`  ${category}`);
    for (const help of COMMAND_HELP.filter((entry) => entry.category === category)) {
      const aliases = help.aliases.length ? ` (aliases: ${help.aliases.join(', ')})` : '';
      lines.push(`    ${help.syntax}${aliases}`);
      lines.push(`      ${help.summary}`);
    }
  }
  return lines.join('\n');
}
