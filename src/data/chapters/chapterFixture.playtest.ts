import { ChapterConfig } from './types';
import { C } from './palette';

// ─────────────────────────────────────────────────────────────────────────────
// DEV-ONLY PLAYTEST FIXTURE — not a story chapter.
//
// Exercises every Beat type in the vocabulary (types.ts) so the terminal
// playtest harness (docs/AGENT_TOOLKIT.md) and the correlated-agent playtesting
// protocol have a stable, synthetic target to drive — instead of having to
// puppet shipped story content just to validate the harness itself.
//
// Registration is DEV/Node-only (see src/data/chapters/index.ts) and must
// never reach a production bundle. All dialogue is deliberately marked
// "[fixture]" so nobody mistakes it for game content.
//
// Intentional omissions (see also docs/AGENT_TOOLKIT.md-adjacent report):
//   - `chase`: tonally reserved for Ch6's jumpscare per chapters/CLAUDE.md — skipped.
//   - `routeOnMinigame`: hardcoded to groupChat's saidTrueThing/when payload
//     (BeatEngine.runRouteOnMinigame) — not generically safe, skipped in favor
//     of `loseGoto` on the minigame beat, which routing is designed for.
// ─────────────────────────────────────────────────────────────────────────────

const chapterFixturePlaytest: ChapterConfig = {
  id: 'fixture-playtest',
  index: 99,
  title: 'Playtest Fixture',
  subtitle: 'DEV-only — beat vocabulary smoke test',
  location: 'Rockville Park (synthetic)',
  description:
    '[fixture] A synthetic chapter that exercises every story-beat type for the playtest harness. Never ships in production.',
  kind: 'chapter',

  // Required by the type — mirrors scenes[0]; scenes[] takes precedence at runtime.
  map: {
    width: 800,
    height: 600,
    backdrop: C.grass,
    theme: 'park',
    areaTitle: '[fixture] Scene 1 — The Clearing',
    rects: [
      { x: 400, y: 16, w: 784, h: 16, fill: 0x14532d, solid: true },
      { x: 400, y: 584, w: 784, h: 16, fill: 0x14532d, solid: true },
      { x: 16, y: 300, w: 16, h: 584, fill: 0x14532d, solid: true },
      { x: 784, y: 300, w: 16, h: 584, fill: 0x14532d, solid: true },
      { x: 400, y: 300, w: 60, h: 60, fill: 0x365314, propType: 'bench' },
    ],
    labels: [
      { x: 400, y: 80, name: '[FIXTURE]', detail: 'Playtest smoke-test scene', color: '#c8e89a' },
    ],
    playerSpawn: { x: 200, y: 500 },
  },
  actors: [
    { id: 'jordan', x: 400, y: 200 },
  ],

  scenes: [
    {
      map: {
        width: 800,
        height: 600,
        backdrop: C.grass,
        theme: 'park',
        areaTitle: '[fixture] Scene 1 — The Clearing',
        rects: [
          { x: 400, y: 16, w: 784, h: 16, fill: 0x14532d, solid: true },
          { x: 400, y: 584, w: 784, h: 16, fill: 0x14532d, solid: true },
          { x: 16, y: 300, w: 16, h: 584, fill: 0x14532d, solid: true },
          { x: 784, y: 300, w: 16, h: 584, fill: 0x14532d, solid: true },
          { x: 400, y: 300, w: 60, h: 60, fill: 0x365314, propType: 'bench' },
        ],
        labels: [
          { x: 400, y: 80, name: '[FIXTURE]', detail: 'Playtest smoke-test scene', color: '#c8e89a' },
        ],
        playerSpawn: { x: 200, y: 500 },
      },
      actors: [
        { id: 'jordan', x: 400, y: 200 },
      ],
    },
    {
      map: {
        width: 700,
        height: 520,
        backdrop: C.grass,
        theme: 'park',
        areaTitle: '[fixture] Scene 2 — The Arena',
        rects: [
          { x: 350, y: 16, w: 684, h: 16, fill: 0x14532d, solid: true },
          { x: 350, y: 504, w: 684, h: 16, fill: 0x14532d, solid: true },
          { x: 16, y: 260, w: 16, h: 504, fill: 0x14532d, solid: true },
          { x: 684, y: 260, w: 16, h: 504, fill: 0x14532d, solid: true },
        ],
        labels: [
          { x: 350, y: 70, name: '[FIXTURE]', detail: 'Boss-fight smoke test', color: '#c8e89a' },
        ],
        playerSpawn: { x: 350, y: 440 },
      },
      actors: [],
    },
  ],

  beats: [
    // ── Ambient/rapid-fire opening ──────────────────────────────────────────
    // Note: chapter7.spain-betrayal.ts's actual opening is a plain sequence of
    // short narrator/character `dialogue` beats (no distinct "loop" construct
    // exists in the Beat vocabulary or that file — verified, not assumed).
    // Replicated here as its closest analogue: two short, quick-succession
    // dialogue beats before the "real" content starts.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        '[fixture] Ambient opening line one.',
        '[fixture] Ambient opening line two.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: ['[fixture] Ambient opening line three — rapid follow-up.'],
    },

    // ── Plain dialogue ───────────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['[fixture] testing plain dialogue beat.'],
    },

    // ── Choice: 2 fall-through options + 1 converge-pattern goto ────────────
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: '[fixture] testing choice beat',
      options: [
        {
          text: '[fixture] option A (falls through, reactionLines)',
          reactionSpeaker: 'jordan',
          reactionLines: ['[fixture] reaction to option A.'],
        },
        {
          text: '[fixture] option B (falls through, ledgerDelta)',
          ledgerDelta: 1,
          reactionSpeaker: 'jordan',
          reactionLines: ['[fixture] reaction to option B.'],
        },
        {
          text: '[fixture] option C (goto branch block, converges below)',
          goto: 'fixtureBranchBlock',
        },
      ],
    },
    {
      id: 'fixtureRejoin',
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['[fixture] all choice paths converge here.'],
    },

    // ── walkTo / cameraPan / wait / sfx / ledger / screenTint / stopAllAudio ─
    { type: 'walkTo', x: 400, y: 300, radius: 60, markerLabel: '[fixture] walk to bench' },
    { type: 'cameraPan', x: 400, y: 200, durationMs: 400, holdMs: 200 },
    { type: 'wait', ms: 300 },
    { type: 'sfx', key: 'ui_select', volume: 0.7 },
    { type: 'ledger', delta: 1, note: '[fixture] ledger beat' },
    { type: 'screenTint', color: 0x000000, alpha: 0.3, durationMs: 200 },
    { type: 'stopAllAudio', fadeMs: 200 },

    // ── hideActor / showActor / moveActor ───────────────────────────────────
    { type: 'hideActor', id: 'jordan' },
    { type: 'showActor', id: 'jordan' },
    // Move left so the saved visual state has a non-default facing value.
    { type: 'moveActor', id: 'jordan', x: 350, y: 250, durationMs: 500 },

    // Stable safe branch boundary after actor mutations. The two options
    // exercise both kinds of side effect that PR 1 must restore: a transient
    // Maria Brooke stat and the persisted rose_silence progress flag.
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: '[fixture] actor mutations complete; test safe branch save now',
      options: [
        { text: '[fixture] increment Maria lookup', sideEffect: 'maria_lookup' },
        { text: '[fixture] persist Rose silence', sideEffect: 'rose_silence' },
      ],
    },

    // ── Foreground minigame (benTrivia — unwired mode, fully optional config) ─
    {
      type: 'minigame',
      modeId: 'benTrivia',
      // Keep the DEV fixture independent of agent/image-review latency. The
      // normal game defaults stay fast; this synthetic mode waits long enough
      // for its required checkpoint to be inspected before normal input.
      config: { count: 3, perPromptMs: 60_000, minPromptMs: 60_000, strikesAllowed: 3, seed: 1 },
      introLines: ['[fixture] testing foreground minigame beat (benTrivia).'],
      loseGoto: 'fixtureRejoin',
    },

    // ── Background minigame (poolParty — background:true, no config needed) ─
    {
      type: 'minigame',
      modeId: 'poolParty',
      background: true,
      introLines: ['[fixture] testing background minigame beat (poolParty, inert here).'],
    },

    // Stable interactive boundary while the background mode is still active.
    // PR 1 uses this point to prove `savestate` reports branchSafe:false
    // instead of pretending it can reconstruct arbitrary mode internals.
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: '[fixture] background mode is active; test unsafe branch save now',
      options: [{ text: '[fixture] continue to scene 2' }],
    },

    // ── changeScene ──────────────────────────────────────────────────────────
    { type: 'changeScene', sceneIndex: 1, transitionMs: 300 },

    // ── bossFight ────────────────────────────────────────────────────────────
    {
      type: 'bossFight',
      bossId: 'boss_eric',
      arena: { x: 350, y: 260, w: 660, h: 480 },
      introLines: ['[fixture] testing bossFight beat.'],
    },

    { type: 'endChapter' },

    // ── Unreachable-by-fall-through branch block (converge pattern) ────────
    // Only reachable via option C's goto above; rejoins the mainline via a
    // single-option choice pointing back at 'fixtureRejoin'.
    {
      id: 'fixtureBranchBlock',
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['[fixture] branch block reached via option C goto.'],
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: '[fixture] converge back to mainline',
      options: [
        { text: '[fixture] continue', goto: 'fixtureRejoin' },
      ],
    },
  ],
};

export default chapterFixturePlaytest;
