import { ChapterConfig, MapConfig, ActorPlacement } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 12 — ORIGINS
// "Rockville Syndicate: Origins" — the only story Eric never pitched.
//
// Build translated straight from docs/chapter-pipeline/working/origins/
// (09_build_handoff.md is authoritative; 07_mechanics.md for the doubleCall mode;
// 08_maps.md for every coordinate below; 06_scenes/*.md for the prose beats are
// distilled from). Do not deviate from verbatim lines or protected silences
// without checking those docs first.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── L0 — Eric's room, present day (scenes[0] cold open, scenes[10] coda) ──────

function buildMapL0(variant: 'open' | 'coda'): MapConfig {
  return {
    width: 700,
    height: 520,
    backdrop: 0x241a10,
    theme: 'apartment',
    areaTitle: variant === 'open' ? '3:12 AM' : undefined,
    rects: [
      { x: 350, y: 6, w: 700, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 350, y: 514, w: 700, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 6, y: 260, w: 12, h: 520, fill: 0x000000, solid: true, invisible: true },
      { x: 694, y: 260, w: 12, h: 520, fill: 0x000000, solid: true, invisible: true },
      { x: 350, y: 260, w: 700, h: 520, fill: 0x000000, propKey: 'stage_eric_room_present', invisible: true },
      // stage_eric_room_present paints the desk/monitor/phone/bed/window. Only
      // solid+invisible rects render as collision-only (MapBuilder skips drawing);
      // a non-solid rect always draws regardless of `invisible`, so purely
      // decorative duplicates (monitor, phone, window) are dropped entirely rather
      // than marked invisible.
      // the desk is the capital
      { x: 350, y: 150, w: 180, h: 70, fill: 0x3b2f23, propType: 'desk', solid: true, invisible: true },
      { x: 120, y: 400, w: 190, h: 95, fill: 0x334155, propType: 'bed', solid: true, invisible: true },
      // the door — SOLID in both L0 scenes; the coda exit is performed by the
      // doubleCall 'reply' mode tweening the player through it, not by physics.
      { x: 350, y: 505, w: 90, h: 22, fill: 0x4a3623, propType: 'door', solid: true, invisible: true },
    ],
    labels: [],
    // The desk chair (painted into stage_eric_room_present) sits at roughly
    // y194-241; y260 stood Eric a full body-length south of it, in front of the
    // chair rather than in it. y222 overlaps the seat.
    playerSpawn: { x: 350, y: 222 },
  };
}

// ─── L1 — the McDonald's on the Pike (scenes[1] founding night, [5] call logs, [7] first hangout) ──

function l1Rects() {
  return [
    { x: 450, y: 6, w: 900, h: 12, fill: 0x000000, solid: true, invisible: true },
    { x: 450, y: 614, w: 900, h: 12, fill: 0x000000, solid: true, invisible: true },
    { x: 6, y: 310, w: 12, h: 620, fill: 0x000000, solid: true, invisible: true },
    { x: 894, y: 310, w: 12, h: 620, fill: 0x000000, solid: true, invisible: true },
    { x: 450, y: 310, w: 900, h: 620, fill: 0x000000, propKey: 'stage_mcdonalds_night', invisible: true },
    // stage_mcdonalds_night paints the full lobby (window, booths, counter, cone).
    // Only solid+invisible rects render as collision-only; a non-solid rect always
    // draws regardless of `invisible` (MapBuilder), so the window — purely
    // decorative, no collision — is dropped entirely rather than marked invisible.
    // the booth by the window (four seats — the fourth seat is load-bearing)
    { x: 190, y: 150, w: 150, h: 70, fill: 0xb03a2e, propType: 'couch' as const, solid: true, invisible: true },
    { x: 190, y: 290, w: 150, h: 70, fill: 0xb03a2e, propType: 'couch' as const, solid: true, invisible: true },
    { x: 190, y: 222, w: 130, h: 56, fill: 0xd9c8a9, propType: 'counter' as const, solid: true, invisible: true },
    // second booth (set dressing) + the two-top Eric's chair gets dragged from
    { x: 520, y: 170, w: 120, h: 60, fill: 0xb03a2e, propType: 'couch' as const, solid: true, invisible: true },
    { x: 700, y: 300, w: 70, h: 50, fill: 0xd9c8a9, propType: 'counter' as const, solid: true, invisible: true },
    // ordering counter + kitchen line
    { x: 640, y: 90, w: 380, h: 50, fill: 0x9aa2ad, propType: 'counter' as const, solid: true, invisible: true },
    { x: 840, y: 60, w: 100, h: 40, fill: 0x374151, propType: 'fridge' as const, solid: true, invisible: true },
    // wet-floor cone gag, uncaptioned
    { x: 560, y: 430, w: 24, h: 24, fill: 0xf59e0b, propType: 'cone' as const, solid: true, invisible: true },
  ];
}

function buildMapL1(variant: 'founding' | 'callLogs' | 'firstHangout'): MapConfig {
  return {
    width: 900,
    height: 620,
    backdrop: 0x8a7f6a,
    theme: 'hospital',
    areaTitle: variant === 'founding' ? 'Rockville Pike — 3:00 AM' : variant === 'callLogs' ? 'The Booth You Know' : undefined,
    rects: l1Rects(),
    labels: [],
    playerSpawn: variant === 'founding' ? { x: 450, y: 520 } : { x: 400, y: 360 },
  };
}

const L1_ACTORS_FOUNDING: ActorPlacement[] = [
  { id: 'maharko', x: 150, y: 185 }, // the window seat / throne
  { id: 'nick_h', x: 255, y: 185 },
  { id: 'nick_f', x: 150, y: 300 },
  // Placed at the door, just off chris_rivas's spot so the two don't overlap;
  // hidden until the "headlights" beat, then walked to the booth via a
  // moveActor beat — the end of the table, where standing becomes hovering.
  { id: 'jacob', x: 500, y: 540 },
  // npc_chris_rivas_sheet.jpg is supplied at 2816×1536 — 2x the 1408×768 the other
  // npcSheets (alex/benji/rose) ship at — so the default 0.5 actor scale renders him
  // 2x too big (0.25 still left him taller than the rest of the cast, since his
  // sheet is also a 3-row grid vs. their 4-row grid, i.e. taller frames to begin
  // with). 0.1875 lands his display height at ~96px, matching alex/benji's
  // rendered size (their 768/4-row frames at the default 0.5 scale).
  { id: 'chris_rivas', nameOverride: 'Chris Rivas', x: 470, y: 520, spriteKey: 'npc_chris_rivas_sheet', spriteScale: 0.1875 },
  { id: 'employee', nameOverride: 'on headset', x: 720, y: 130 },
];

const L1_ACTORS_CALL_LOGS: ActorPlacement[] = [
  { id: 'nick_f', x: 150, y: 185 }, // the throne migrated — uncaptioned
  { id: 'nick_h', x: 150, y: 300 },
  { id: 'jacob', x: 255, y: 185 }, // in the booth, fourth seat filled
];

const L1_ACTORS_FIRST_HANGOUT: ActorPlacement[] = [
  { id: 'nick_f', x: 150, y: 185 },
  { id: 'nick_h', x: 255, y: 185 },
  { id: 'jacob', x: 150, y: 300 },
];

// ─── L2 — the void of islands (the signature set: one geometry, dressings differ) ──

const LEFT_ISLAND_CENTER = { x: 360, y: 620 };
const RIGHT_ISLAND_CENTER = { x: 2040, y: 620 };
const ERIC_ISLAND_CENTER = { x: 1200, y: 1150 };

/** Nick F's phone world coords, used in every doubleCall config's `leftPhone`. */
export const LEFT_PHONE = { x: 436, y: 554 };
/** Jacob's phone world coords, used in every doubleCall config's `rightPhone`. */
export const RIGHT_PHONE = { x: 1972, y: 566 };

function leftIslandRects(dressing: 'lit' | 'dark') {
  if (dressing === 'dark') {
    return [
      { x: LEFT_ISLAND_CENTER.x, y: LEFT_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x050505 },
      { x: 430, y: 575, w: 95, h: 55, fill: 0x0a0a0a, solid: true },
      { x: 280, y: 690, w: 130, h: 70, fill: 0x0a0a0a, solid: true },
    ];
  }
  return [
    { x: LEFT_ISLAND_CENTER.x, y: LEFT_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x000000, propKey: 'stage_void_nickf_room', invisible: true },
    // stage_void_nickf_room paints the desk/monitor/bed/hoodie/phone. Only
    // solid+invisible rects render as collision-only (MapBuilder); non-solid
    // decorative duplicates (tv glow, hoodie, phone) are dropped entirely.
    { x: 430, y: 575, w: 95, h: 55, fill: 0x3b2f23, propType: 'desk' as const, solid: true, invisible: true },
    { x: 280, y: 690, w: 130, h: 70, fill: 0x334155, propType: 'bed' as const, solid: true, invisible: true },
  ];
}

function rightIslandRects(dressing: 'lit' | 'dark') {
  if (dressing === 'dark') {
    return [
      { x: RIGHT_ISLAND_CENTER.x, y: RIGHT_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x050505 },
      { x: 2110, y: 695, w: 130, h: 60, fill: 0x0a0a0a, solid: true },
      { x: 1960, y: 575, w: 95, h: 55, fill: 0x0a0a0a, solid: true },
    ];
  }
  return [
    { x: RIGHT_ISLAND_CENTER.x, y: RIGHT_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x000000, propKey: 'stage_void_jacob_room', invisible: true },
    // stage_void_jacob_room paints the made bed/desk/textbook/keys/phone. Only
    // solid+invisible rects render as collision-only (MapBuilder); non-solid
    // decorative duplicates (textbook, highlighter, keys, phone) are dropped.
    { x: 2110, y: 695, w: 130, h: 60, fill: 0x3f4d63, propType: 'bed' as const, solid: true, invisible: true }, // the made bed
    { x: 1960, y: 575, w: 95, h: 55, fill: 0x40342a, propType: 'desk' as const, solid: true, invisible: true },
  ];
}

function ericIslandRects(dressing: 'dark' | 'act2' | 'winter') {
  if (dressing === 'dark') {
    // ACT1: present at final coordinates, illegible — no propType so no
    // procedural detail renders even if a stretched viewport grazes it.
    return [
      { x: ERIC_ISLAND_CENTER.x, y: ERIC_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x050505 },
      { x: 1200, y: 1105, w: 110, h: 55, fill: 0x0a0a0a, solid: true },
      { x: 1085, y: 1225, w: 130, h: 62, fill: 0x0a0a0a, solid: true },
    ];
  }
  if (dressing === 'act2') {
    // The reveal — stage_void_eric_room now lands (12_asset_wireup.md §2), so the
    // island is painted rather than procedural. Rects below are collision-only.
    return [
      { x: ERIC_ISLAND_CENTER.x, y: ERIC_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x000000, propKey: 'stage_void_eric_room', invisible: true },
      // Only solid+invisible rects render as collision-only (MapBuilder); non-solid
      // decorative duplicates (phone, monitor, water glass) are dropped entirely.
      { x: 1085, y: 1225, w: 130, h: 62, fill: 0x334155, propType: 'bed' as const, solid: true, invisible: true }, // periphery bed
    ];
  }
  // winter — no art delivered (order sheet item 9, CAN-DEFER); stays procedural.
  return [
    { x: ERIC_ISLAND_CENTER.x, y: ERIC_ISLAND_CENTER.y, w: 300, h: 220, fill: 0x28211a },
    { x: 1200, y: 1105, w: 110, h: 55, fill: 0x3b2f23, propType: 'desk' as const, solid: true },
    { x: 1238, y: 1112, w: 12, h: 8, fill: 0x0f172a }, // phone FACE-UP
    { x: 1085, y: 1225, w: 130, h: 62, fill: 0x334155, propType: 'bed' as const, solid: true }, // periphery bed
    { x: 1200, y: 1090, w: 46, h: 30, fill: 0x1f2937 }, // laptop replaces the monitor
    { x: 1230, y: 1130, w: 30, h: 22, fill: 0x475569 }, // hoodie over the chair
    { x: 1150, y: 1090, w: 8, h: 10, fill: 0x93c5fd }, // water glass, moved
  ];
}

/** ACT1 — story-scenes 3+4. Corridor-only confinement; the third island sits
 *  360px below the corridor's worst-case view, never crossed by a camera path. */
function buildMapL2Act1(): MapConfig {
  return {
    width: 2400,
    height: 1400,
    backdrop: 0x000000,
    theme: 'void',
    noNatureScatter: true,
    rects: [
      ...leftIslandRects('lit'),
      ...rightIslandRects('lit'),
      ...ericIslandRects('dark'),
      // corridor confinement — the whole dark strip is walkable; the player can
      // pace directly over the hidden island, 360px above its roof, and see nothing.
      { x: 1205, y: 550, w: 1350, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 1205, y: 690, w: 1350, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 524, y: 620, w: 12, h: 140, fill: 0x000000, solid: true, invisible: true },
      { x: 1886, y: 620, w: 12, h: 140, fill: 0x000000, solid: true, invisible: true },
    ],
    labels: [],
    playerSpawn: { x: 700, y: 620 },
  };
}

/** ACT2 — story-scenes 5+6. The reveal: Eric's island is lit, and a passage
 *  opens south from the corridor down into it. Spawn (1200,620) is the exact
 *  point the Act I closing pan held on — the changeScene hides in blackness. */
function buildMapL2Act2(): MapConfig {
  return {
    width: 2400,
    height: 1400,
    backdrop: 0x000000,
    theme: 'void',
    noNatureScatter: true,
    rects: [
      ...leftIslandRects('lit'),
      ...rightIslandRects('lit'),
      ...ericIslandRects('act2'),
      // corridor, with a gap at x1160-1240 opening south to the island
      { x: 1205, y: 550, w: 1350, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 843, y: 690, w: 634, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 1560, y: 690, w: 652, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 524, y: 620, w: 12, h: 140, fill: 0x000000, solid: true, invisible: true },
      { x: 1886, y: 620, w: 12, h: 140, fill: 0x000000, solid: true, invisible: true },
      // passage side-walls, corridor down to the island
      { x: 1154, y: 870, w: 12, h: 372, fill: 0x000000, solid: true, invisible: true },
      { x: 1246, y: 870, w: 12, h: 372, fill: 0x000000, solid: true, invisible: true },
      // Eric's island perimeter, gap at the top where the passage enters
      { x: 1105, y: 1035, w: 110, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 1295, y: 1035, w: 110, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 1045, y: 1150, w: 12, h: 220, fill: 0x000000, solid: true, invisible: true },
      { x: 1355, y: 1150, w: 12, h: 220, fill: 0x000000, solid: true, invisible: true },
      { x: 1200, y: 1265, w: 310, h: 12, fill: 0x000000, solid: true, invisible: true },
    ],
    labels: [],
    playerSpawn: { x: 1200, y: 620 },
  };
}

/** WINTER — story-scene 10, Eric alone. The left and right islands do not
 *  light tonight; confinement is the island only (M5's walk-away is
 *  mode-tweened, so no passage is needed). */
function buildMapL2Winter(): MapConfig {
  return {
    width: 2400,
    height: 1400,
    backdrop: 0x000000,
    theme: 'void',
    noNatureScatter: true,
    rects: [
      ...leftIslandRects('dark'),
      ...rightIslandRects('dark'),
      ...ericIslandRects('winter'),
      // Eric's island fully enclosed — no corridor, no passage this scene.
      { x: 1200, y: 1035, w: 310, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 1045, y: 1150, w: 12, h: 220, fill: 0x000000, solid: true, invisible: true },
      { x: 1355, y: 1150, w: 12, h: 220, fill: 0x000000, solid: true, invisible: true },
      { x: 1200, y: 1265, w: 310, h: 12, fill: 0x000000, solid: true, invisible: true },
    ],
    labels: [],
    playerSpawn: { x: 1200, y: 1180 },
  };
}

/** L2_CHAT — story-scene 9, "The Capital." The void, no islands: chat-space.
 *  Everything visible is rendered screen-space by the doubleCall 'capital' variant. */
function buildMapL2Chat(): MapConfig {
  return {
    width: 800,
    height: 600,
    backdrop: 0x000000,
    theme: 'void',
    noNatureScatter: true,
    rects: [
      { x: 400, y: 6, w: 800, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 400, y: 594, w: 800, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 6, y: 300, w: 12, h: 600, fill: 0x000000, solid: true, invisible: true },
      { x: 794, y: 300, w: 12, h: 600, fill: 0x000000, solid: true, invisible: true },
    ],
    labels: [],
    playerSpawn: { x: 400, y: 300 }, // frozen by the blocking mode immediately
  };
}

// ─── L3 — Nick F's car / side street (scenes[2], "The Trophy") ─────────────────

function buildMapL3(): MapConfig {
  return {
    width: 800,
    height: 560,
    backdrop: 0x141a22,
    theme: 'suburb_night',
    areaTitle: '1:00 AM — technically a Friday',
    rects: [
      { x: 400, y: 6, w: 800, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 400, y: 554, w: 800, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 6, y: 280, w: 12, h: 560, fill: 0x000000, solid: true, invisible: true },
      { x: 794, y: 280, w: 12, h: 560, fill: 0x000000, solid: true, invisible: true },
      { x: 400, y: 330, w: 800, h: 150, fill: 0x1f2630, propType: 'road' },
      // the car — parked, not going anywhere
      { x: 400, y: 330, w: 170, h: 80, fill: 0x233043, propType: 'car', solid: true },
      // the closed 7-Eleven (north)
      { x: 400, y: 120, w: 360, h: 90, fill: 0x2a2f38, propType: 'wall', solid: true },
      { x: 400, y: 105, w: 320, h: 30, fill: 0x0e1420, propType: 'window' },
      { x: 400, y: 240, w: 800, h: 30, fill: 0x39404b },
      // two slushies in the cupholders — set dressing, uncaptioned
      { x: 455, y: 375, w: 8, h: 10, fill: 0xef4444 },
      { x: 485, y: 375, w: 8, h: 10, fill: 0x3b82f6 },
      // the back seat's window-side door — a tight invisible box confines Eric
      // to the back seat; the whole scene is heard from there.
      { x: 475, y: 358, w: 74, h: 4, fill: 0x000000, solid: true, invisible: true },
      { x: 475, y: 402, w: 74, h: 4, fill: 0x000000, solid: true, invisible: true },
      { x: 438, y: 380, w: 4, h: 44, fill: 0x000000, solid: true, invisible: true },
      { x: 512, y: 380, w: 4, h: 44, fill: 0x000000, solid: true, invisible: true },
    ],
    labels: [],
    playerSpawn: { x: 470, y: 380 },
  };
}

const L3_ACTORS: ActorPlacement[] = [
  // Spaced wide enough (150px) that the two nameplates — "Nick Farrar" /
  // "Nick Hedgecock", ~93px combined half-width at this zoom — don't overlap.
  { id: 'nick_f', x: 330, y: 320 }, // driver's seat
  { id: 'nick_h', x: 480, y: 320 }, // shotgun
];

// ─── L4 — Dogwood Park lookout (scenes[6], "First Time For Everybody" — the roof) ──

function buildMapL4(): MapConfig {
  return {
    width: 1000,
    height: 720,
    backdrop: 0x16331a,
    theme: 'park',
    noNatureScatter: true, // stage_dogwood_lookout_night's painted trees replace procedural scatter
    areaTitle: 'Dogwood Park — after hours',
    rects: [
      { x: 500, y: 6, w: 1000, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 500, y: 714, w: 1000, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 6, y: 360, w: 12, h: 720, fill: 0x000000, solid: true, invisible: true },
      { x: 994, y: 360, w: 12, h: 720, fill: 0x000000, solid: true, invisible: true },
      { x: 500, y: 360, w: 1000, h: 720, fill: 0x000000, propKey: 'stage_dogwood_lookout_night', invisible: true },
      // stage_dogwood_lookout_night paints the backstop, lookout building, and
      // parking lot/car. MapBuilder only skips rendering a rect when `invisible`
      // is paired with `solid` (collision-only path) — a non-solid rect always
      // draws regardless of `invisible`, so purely-decorative duplicates (the
      // diamond fill, the roof-surface color patch, the road/phone flats) are
      // dropped entirely here rather than marked invisible (which would be a no-op
      // and double-paint a flat box over the art, as it did over this roof).
      { x: 320, y: 392, w: 160, h: 16, fill: 0x475569, propType: 'guardrail', solid: true, invisible: true },
      // THE LOOKOUT — squat concrete building; base is walkable (the roof),
      // ringed by invisible walls at the roof edge with a gap toward the stairway.
      { x: 700, y: 187, w: 236, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 582, y: 250, w: 12, h: 126, fill: 0x000000, solid: true, invisible: true },
      { x: 818, y: 218, w: 12, h: 62, fill: 0x000000, solid: true, invisible: true }, // leaves the SE gap open
      { x: 700, y: 313, w: 236, h: 12, fill: 0x000000, solid: true, invisible: true },
      { x: 940, y: 340, w: 40, h: 60, fill: 0x3f4854, propType: 'wall', solid: true, invisible: true }, // the stairway
      // the parking lot, far south — where the Camry noses in
      { x: 470, y: 660, w: 110, h: 52, fill: 0x2d3a4f, propType: 'car', solid: true, invisible: true },
    ],
    labels: [],
    playerSpawn: { x: 760, y: 320 },
  };
}

const L4_ACTORS: ActorPlacement[] = [
  { id: 'nick_f', x: 720, y: 290 },
  { id: 'nick_h', x: 820, y: 290 },
  // static placement from scene start (engine constraint: actors don't path) —
  // camera stays off the roof's south edge until the headlights/arrival beat,
  // per 08_maps.md §7's flagged assumption.
  { id: 'jacob', x: 700, y: 330 },
];

// ═══════════════════════════════════════════════════════════════════════════════

const chapter12: ChapterConfig = {
  id: 'origins',
  index: 12,
  title: 'Rockville Syndicate: Origins',
  subtitle: 'The Twelfth Slot',
  location: 'Rockville, MD — summer 2024 → tonight',
  description:
    'The only story Eric never pitched. Two phones ring at the same time, all era, ' +
    'in frame, and everyone believes the wrong caller. Play it together.',
  kind: 'chapter',
  protagonistOverride: 'eric',
  quietEnd: true,

  scenes: [
    { map: buildMapL0('open'), actors: [] }, // 0 — Scene 0, cold open. NO music key.
    { map: buildMapL1('founding'), actors: L1_ACTORS_FOUNDING, music: 'music_origins' }, // 1 — Scene 1
    { map: buildMapL3(), actors: L3_ACTORS, music: 'music_origins' }, // 2 — Scene 2
    { map: buildMapL2Act1(), actors: [], music: 'music_origins' }, // 3 — Scenes 3+4
    { map: buildMapL2Act2(), actors: [] }, // 4 — Scenes 5+6. NO music, ever (snap lands here).
    { map: buildMapL1('callLogs'), actors: L1_ACTORS_CALL_LOGS }, // 5 — Scene 7
    { map: buildMapL4(), actors: L4_ACTORS }, // 6 — Scene 8a
    { map: buildMapL1('firstHangout'), actors: L1_ACTORS_FIRST_HANGOUT }, // 7 — Scene 8b
    { map: buildMapL2Chat(), actors: [] }, // 8 — Scene 9
    { map: buildMapL2Winter(), actors: [] }, // 9 — Scene 10
    { map: buildMapL0('coda'), actors: [] }, // 10 — Scene 11, coda
  ],

  // Required by the type — mirrors scenes[0].
  map: buildMapL0('open'),
  actors: [],

  beats: [
    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 0 — "The Last Save Slot" (scenes[0], L0) — no music, no narrator.
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'screenTint', color: 0x000014, alpha: 0.35, durationMs: 800 },
    { type: 'wait', ms: 1800 },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'reply',
        reply: { draft: { text: 'I need to tell you guys something.', holdMs: 2500, deleteCharByChar: true } },
      },
    },
    { type: 'dialogue', speaker: 'eric', lines: ['So. The summer Maharko left for Florida. What happened was, I simply—'] },
    { type: 'wait', ms: 2400 }, // PROTECTED — the pause after "I simply—"
    { type: 'dialogue', speaker: 'eric', lines: ["You're going to laugh at the first part."] },
    { type: 'wait', ms: 1000 },
    { type: 'dialogue', speaker: 'eric', lines: ['You should. It was funny. That was never the problem.'] },
    { type: 'sfx', key: 'ui_select' },
    { type: 'screenTint', color: 0x000000, alpha: 1.0, durationMs: 600 },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 400 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 1 — "Two Ladders, One McDonald's" (scenes[1], L1) — music enters here.
    // ═══════════════════════════════════════════════════════════════════════
    // Jacob and Chris Rivas are placed (static, per the engine's no-pathing
    // constraint) but shouldn't be seen until the "headlights" door-open beat —
    // they haven't arrived yet.
    { type: 'hideActor', id: 'jacob' },
    { type: 'hideActor', id: 'chris_rivas' },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'Summer 2024. Rockville Pike, three in the morning.',
        "The McDonald's on the Pike never fully closes and never fully opens. It exists around the clock in a third state — lights on, floor wet, one employee on headset who has chosen, wisely, to believe the lobby is empty.",
        'Tonight, the lobby is not empty.',
      ],
    },
    { type: 'walkTo', x: 450, y: 480, markerLabel: 'the lobby' },
    { type: 'walkTo', x: 330, y: 320, markerLabel: 'the booth by the window' },
    { type: 'dialogue', speaker: 'narrator', lines: ['Why are they here? The official record says nothing. The parking lot, if you could depose it, would say slightly more.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["Okay, so it's like two in the morning—"] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['Three.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["—it's three in the morning, and we're just posted at the McDonald's, right? For no reason. That's important. There was no reason."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["You're getting this night the way everyone got this night: secondhand. The Nicks tell it well. They've had practice."] },
    { type: 'dialogue', speaker: 'maharko', lines: ["This location has the best Sprite in the county. That's a fact. I'm not discussing it."] },
    { type: 'dialogue', speaker: 'nick_h', lines: ["It's the carbonation."] },
    { type: 'dialogue', speaker: 'maharko', lines: ["It's the carbonation."] },
    // M1, glance #1 — upgraded per the FUN AUDIT: the player picks how to watch,
    // never what gets said. All options converge on the same scored result.
    {
      type: 'choice', speaker: 'narrator', prompt: 'Nick H checks whether it scored.',
      options: [
        { text: "[ Watch Maharko's face. ]", reactionSpeaker: 'narrator', reactionLines: ['(a single nose-exhale.)'] },
        { text: '[ Watch Nick H watch him. ]', reactionSpeaker: 'narrator', reactionLines: ['(a single nose-exhale.)'] },
        { text: "[ You already know how this lands. ]", reactionSpeaker: 'narrator', reactionLines: ['(a single nose-exhale.)'] },
      ],
    },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Honestly the ice hits different here too, I feel like the Pike locations just care more, like as a region—'] },
    {
      type: 'choice', speaker: 'narrator', prompt: 'Nick F rallies for another one.',
      options: [
        { text: '[ Watch for the exhale. ]', reactionSpeaker: 'narrator', reactionLines: ['(nothing.)'] },
        { text: '[ Watch Nick F not get it. ]', reactionSpeaker: 'narrator', reactionLines: ['(nothing.)'] },
      ],
    },
    { type: 'dialogue', speaker: 'narrator', lines: ['Then: headlights.'] },
    { type: 'cameraPan', x: 470, y: 660, durationMs: 1200, holdMs: 1400 },
    { type: 'sfx', key: 'sfx_door_open' },
    { type: 'showActor', id: 'jacob' },
    { type: 'showActor', id: 'chris_rivas' },
    // Jacob crosses from the door to the end of the table while the narrator
    // introduces them; Chris hangs back near the door — he's not sitting down.
    { type: 'moveActor', id: 'jacob', x: 350, y: 250, durationMs: 900 },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'The one with the keys is Jacob. You know Jacob.',
        'The other one — hold on. His name is Chris Rivas, and he is the only person who will enter this McDonald\'s tonight because he wanted food.',
      ],
    },
    { type: 'dialogue', speaker: 'nick_f', lines: ['JACOB? No. No way. NO way.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ["The warmth is real. Keep that somewhere safe. It's real, and it will not help."] },
    { type: 'dialogue', speaker: 'narrator', lines: ['There is room in the booth. There has been room in the booth for about a year.', '(Nobody moves over.)'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["What are you doing here, man?! It's three in the morning!"] },
    { type: 'dialogue', speaker: 'jacob', lines: ['Chris was hungry. I was up anyway, so I drove us.'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['At least he drove himself.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["No, that's honestly so responsible—"] },
    { type: 'dialogue', speaker: 'nick_h', lines: ["But like — who's at a McDonald's at three in the morning, man?"] },
    // M1, glance #3 — the detonation.
    {
      type: 'choice', speaker: 'narrator', prompt: 'The booth detonates. Check the scoreboard.',
      options: [
        { text: '[ Watch Maharko. ]', reactionSpeaker: 'narrator', reactionLines: ['(two nose-exhales. A standing ovation.)'] },
        { text: '[ Watch the Nicks watch Maharko. ]', reactionSpeaker: 'narrator', reactionLines: ['(two nose-exhales. A standing ovation.)'] },
      ],
    },
    // Chris walks himself to the counter to order — he's the only one of the
    // group who's here for the food, not the bit.
    { type: 'moveActor', id: 'chris_rivas', x: 700, y: 190, durationMs: 1300 },
    { type: 'walkTo', x: 700, y: 200, markerLabel: 'the counter' },
    { type: 'dialogue', speaker: 'narrator', lines: ['At the counter, Chris orders. He orders like a person who knew his order in the car.'] },
    { type: 'dialogue', speaker: 'chris_rivas', lines: ['(says thank you to the cashier — once at the start, once at the end)'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["Who's the friend?"] },
    { type: 'dialogue', speaker: 'jacob', lines: ["That's Chris. We're not really — he lives near me. He was hungry, so."] },
    { type: 'dialogue', speaker: 'narrator', lines: ['The same move, one rung down. Nobody at the table notices, because from inside a ladder all anyone ever looks is up.'] },
    { type: 'dialogue', speaker: 'maharko', lines: ["You're the same as junior year, bro."] },
    { type: 'dialogue', speaker: 'jacob', lines: ["I don't think that's true. I have a job this summer. I'm taking a stats class. People change. I don't think I'm the same."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["For the record: it wasn't a bit. / For the other record — the one this group actually keeps — it was."] },
    { type: 'dialogue', speaker: 'chris_rivas', lines: ['Jacob. Food.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['(Nobody is charting it yet.)'] },
    { type: 'dialogue', speaker: 'jacob', lines: ["We're around all summer. If you guys are ever doing something — I'm around."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Yes. Dude. For sure. For sure, for sure.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['Nick F means it the way you mean things at three in the morning: completely, and not at all.'] },
    { type: 'cameraPan', x: 470, y: 660, durationMs: 1200, holdMs: 1600 },
    // He walks himself back out the door he walked in through — the clean exit.
    { type: 'moveActor', id: 'chris_rivas', x: 470, y: 560, durationMs: 1000 },
    { type: 'dialogue', speaker: 'narrator', lines: ['That is the last time the group ever sees Chris Rivas. He got his food. He said thank you twice. As exits from this story go, his is the clean one.'] },
    { type: 'hideActor', id: 'chris_rivas' },
    { type: 'wait', ms: 1800 },
    { type: 'dialogue', speaker: 'nick_f', lines: ['BRO.'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['The stats class.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["'I'm around all summer' — bro, he came BACK to say it. He had the food. He was OUT. He came back—"] },
    { type: 'dialogue', speaker: 'maharko', lines: ["He'd come back tomorrow if you texted him."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['And that\'s the funniest part though. Like — think about it. WHO is at a McDonald\'s at three in the morning?'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['On a Tuesday.'] },
    { type: 'cameraPan', x: 215, y: 240, durationMs: 800, holdMs: 3000 }, // PROTECTED — 3:11, one second past comfortable
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        "The Nicks will tell this story for weeks, to anybody who missed it.",
        "Eventually they'll tell it to exactly the right person.",
        "That's next.",
      ],
    },
    { type: 'changeScene', sceneIndex: 2, transitionMs: 500 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 2 — "The Trophy" (scenes[2], L3)
    // ═══════════════════════════════════════════════════════════════════════
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'Three weeks later. Maharko is in Florida now, posting sunsets like a man doing a job.',
        'One in the morning, a Thursday — technically a Friday. Nick F\'s car, parked on the street outside the 7-Eleven. The 7-Eleven is closed.',
        'Why are they here? For no reason. That\'s important. There was no reason.',
      ],
    },
    { type: 'dialogue', speaker: 'narrator', lines: ['You know Eric.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["Okay, so it's like two in the morning—"] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['Three.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["—it's three in the morning, and we're just posted at the McDonald's, right? For no reason. That's important. There was no reason."] },
    { type: 'dialogue', speaker: 'narrator', lines: ['You\'ve heard this before. You heard it laid over the night itself, a scene ago. This is the room it was recorded in.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["And the door goes — and I look up — and it's JACOB. Keys in his hand. Three in the morning. And some — there's a whole other kid with him, doesn't say a word, orders food like it's noon—"] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['Says thank you twice.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Says thank you TWICE. And Jacob just — he comes over, right, and he plants at the end of the table, and he goes—'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["'Chris was hungry. I was up anyway, so I drove us.'"] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['And then the stats class.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["THE STATS CLASS. Bro, Maharko goes — Maharko looks at him dead in the eye and goes, 'You're the same as junior year, bro' — and Jacob, no hesitation, starts listing EVIDENCE. He's got a job this summer. He's taking a stats class. People change."] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['Closing arguments. At the McDonald\'s.'] },
    { type: 'dialogue', speaker: 'eric', lines: ['Wait — go back. He had the food. He was out the door. And he came back in?'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["Came BACK. Full turnaround. Comes all the way back to the table to go—", "'We're around all summer. If you guys are ever doing something — I'm around.'"] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['Around, twice.'] },
    { type: 'dialogue', speaker: 'eric', lines: ['And he drove himself.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Drove himself! His own car! Signaled on the way out — Nick watched him do it — signaled, at three in the morning, to nobody—'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ["And that's the funniest part, though. Like — think about it. WHO is at a McDonald's at three in the morning?"] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['On a Tuesday.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['It is one in the morning. The car is parked outside a closed 7-Eleven. It is, technically, a Friday.', 'Nobody in the car runs the numbers.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["And then Maharko — this is the part — Maharko waits till he's gone, right, waits till the car pulls out, and just goes—", "'He'd come back tomorrow if you texted him.'"] },
    { type: 'dialogue', speaker: 'narrator', lines: ["Eric's laugh comes half a beat late."] },
    { type: 'dialogue', speaker: 'eric', lines: ['Who else have you told?'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Bro, everyone. This story kills. I told my brother. He doesn\'t know who Jacob is and it still killed.'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ["It works without context. That's how you know it's good."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["It's a good story. It gets a little better every time they tell it.", "It never occurs to either of them that it's worth anything."] },
    { type: 'cameraPan', x: 470, y: 380, durationMs: 700, holdMs: 3200 }, // PROTECTED — nothing plays over the held back seat
    { type: 'changeScene', sceneIndex: 3, transitionMs: 500 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 3 — "The Bit That Runs Itself" (scenes[3], L2_ACT1)
    // ═══════════════════════════════════════════════════════════════════════
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'A few days later.',
        "Two bedrooms, eleven-forty on a Wednesday night. On the left: Nick F's room. On the right: Jacob's room.",
        'Between them: nothing. Rockville, presumably.',
      ],
    },
    { type: 'walkTo', x: 560, y: 620 },
    { type: 'dialogue', speaker: 'narrator', lines: ['The left room you could reconstruct from sound alone: a gaming chair that cost more than the desk it sits at, a monitor doing most of the lighting, a hoodie on the floor still holding the shape of its owner.'] },
    { type: 'walkTo', x: 1840, y: 620 },
    { type: 'dialogue', speaker: 'narrator', lines: ["The right room is made. That's the word for it. The bed is made — at eleven-forty at night, the bed is made. On the desk there is a stats textbook, open, a highlighter lying in the gutter of the spine. Car keys on a hook by the door, because the keys have a hook."] },
    // Recurrence 1 — the founding text.
    {
      type: 'minigame', modeId: 'doubleCall', background: true,
      config: { variant: 'ringOnly', leftPhone: LEFT_PHONE, rightPhone: RIGHT_PHONE, ring: { left: true, right: true, callerIdLeft: 'JACOB', durationMs: 5200 } },
    },
    { type: 'dialogue', speaker: 'narrator', lines: ['Then — at the same moment — a phone lights up in each one, and both of them start ringing.'] },
    { type: 'cameraPan', x: 360, y: 620, durationMs: 1400, holdMs: 1800 },
    { type: 'cameraPan', x: 2040, y: 620, durationMs: 2600, holdMs: 1800 },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Jacob?'] },
    { type: 'dialogue', speaker: 'jacob', lines: ["Hey. Hi. What's up?"] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['What\'s up with YOU, man. You called me.'] },
    { type: 'dialogue', speaker: 'jacob', lines: ['No — you called me. My phone rang, and it was your name, so I picked it up. That\'s the whole thing that happened on my end.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Why would I call you?'] },
    { type: 'dialogue', speaker: 'jacob', lines: ["I don't know why. That's why I answered by saying 'what's up.'"] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Okay. Okay, Jacob. Good talk.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['bro why did jacob call me'] },
    { type: 'dialogue', speaker: 'eric', lines: ['what did he want'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['NOTHING bro'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['he said I called HIM'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['he just wanted to hear your voice'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['STOP'] },
    {
      type: 'choice', speaker: 'narrator', prompt: 'The chat settles what this was.',
      options: [
        { text: 'he just misses you guys', reactionSpeaker: 'narrator', reactionLines: ['The chat agrees. It always agrees.'] },
        { text: 'he wanted to hear your voice', reactionSpeaker: 'narrator', reactionLines: ['The chat agrees. It always agrees.'] },
      ],
    },
    { type: 'dialogue', speaker: 'narrator', lines: ['It feels like a Wednesday.'] },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'It happens again the next week. Then twice in one night. Then not at all for nine days — long enough for someone to type it like reporting a ceasefire —',
      ],
    },
    { type: 'dialogue', speaker: 'nick_h', lines: ["jacob's been quiet"] },
    { type: 'dialogue', speaker: 'narrator', lines: ['— and then three in one week. One of the three, in full: both phones ring. Both islands answer. Nobody says anything.'] },
    // Recurrence 2 — the silent call.
    {
      type: 'minigame', modeId: 'doubleCall', background: true,
      config: { variant: 'ringOnly', leftPhone: LEFT_PHONE, rightPhone: RIGHT_PHONE, ring: { left: true, right: true, callerIdLeft: 'JACOB', durationMs: 4200 } },
    },
    { type: 'wait', ms: 2500 }, // PROTECTED — two bedrooms breathing
    { type: 'dialogue', speaker: 'nick_f', lines: ['…I can hear you, bro.'] },
    { type: 'dialogue', speaker: 'jacob', lines: ['You called me. You go first.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Unbelievable.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['he did it again'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['called and said NOTHING for like a full minute'] },
    {
      type: 'choice', speaker: 'narrator', prompt: 'The chat settles what this was.',
      options: [
        { text: 'he panicked', reactionSpeaker: 'narrator', reactionLines: ['The model holds either way.'] },
        { text: "he's committed to the bit", reactionSpeaker: 'narrator', reactionLines: ['The model holds either way.'] },
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'By October, the calls are an institution, and the group has a complete working model of Jacob: he calls because he misses them; he says nothing because he panics; he denies it because he\'s committed to the bit.',
        'They built it together, out of the parts of him that arrived by phone. Jacob has never once been consulted on it.',
      ],
    },
    // Recurrence 3 — the voicemail masterpiece.
    {
      type: 'minigame', modeId: 'doubleCall', background: true,
      config: {
        variant: 'ringOnly', leftPhone: LEFT_PHONE, rightPhone: RIGHT_PHONE,
        ring: { left: true, right: true, callerIdLeft: 'JACOB', durationMs: 5600, darkenIsland: { x: 2040, y: 620, w: 300, h: 220 } },
      },
    },
    { type: 'cameraPan', x: 360, y: 620, durationMs: 1000 },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Jacob! My guy. Talk to me.'] },
    { type: 'dialogue', speaker: 'jacob', lines: ["\"Hi, you've reached Jacob. I can't come to the phone right now. Leave a message and I'll call you back. Thanks.\""] },
    { type: 'cameraPan', x: 2040, y: 620, durationMs: 1400, holdMs: 2000 },
    { type: 'dialogue', speaker: 'nick_f', lines: ['No way.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['He just called me and had a voice script to pretend i went to his voicemail'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['at least he was creative'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['but how do you not have anything better to do'] },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'Take a second with what the group is doing right now, because in the entire recorded history of this group chat they will never do it again: they are impressed by Jacob.',
        "It's the first respect he's ever been paid here. He wasn't there for it.",
      ],
    },
    {
      type: 'minigame', modeId: 'doubleCall', background: true,
      config: { variant: 'ringOnly', rightPhone: RIGHT_PHONE, ring: { left: false, right: true, durationMs: 1800 } },
    },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'So far, the bit has only ever rung two phones.',
        'The week after, it finds a third.',
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 4 — "The Wrong Man Confesses For You" (scenes[3] continued)
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'dialogue', speaker: 'narrator', lines: ["October, still. A Sunday, late. The two rooms again. Then the left phone rings — and for the first time all era, the screen doesn't say JACOB."] },
    { type: 'dialogue', speaker: 'narrator', lines: ['The screen says BEN.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['You know Ben. Or — the group used to know Ben. He used to be around. Then he was around less. Nobody remembers deciding that, either.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['…Ben?'] },
    { type: 'dialogue', speaker: 'ben', lines: ["Yeah. Hey. Sorry — I know it's late."] },
    { type: 'dialogue', speaker: 'ben', lines: ["Is something going on with Jacob?"] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["What do you mean, what's going on with Jacob?"] },
    { type: 'dialogue', speaker: 'ben', lines: ['He keeps calling me, man. A lot. Fourteen times since Tuesday — I counted, that\'s not a guess. I pick up, there\'s nothing. I call him back, he swears he never called me. Every single time.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Why would Jacob be calling YOU?'] },
    { type: 'dialogue', speaker: 'ben', lines: ["That's my whole point. He wouldn't. I barely know the guy.", "Somebody's making this happen. And I think it's you guys."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Ben. Bro. Listen to what you\'re saying. Why would we make Jacob call you? How would that even work?'] },
    { type: 'dialogue', speaker: 'ben', lines: ["I don't know how it works. I know the shape of it. That's all I'm telling you — I know the shape."] },
    {
      type: 'minigame', modeId: 'doubleCall', background: true,
      config: { variant: 'ringOnly', rightPhone: RIGHT_PHONE, ring: { left: false, right: true, durationMs: 3000 } },
    },
    { type: 'cameraPan', x: 2040, y: 620, durationMs: 2600, holdMs: 2400 },
    { type: 'dialogue', speaker: 'ben', lines: ["He's calling me again. Right now — do you hear that? I'm holding the phone up. That's him. While I'm on with you, telling you it's happening, it's happening."] },
    { type: 'dialogue', speaker: 'narrator', lines: ['He looks tired.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['This is insane.'] },
    { type: 'dialogue', speaker: 'ben', lines: ["It's not funny. Whatever this is. Just—", '—whoever\'s doing it. Tell them I asked them to stop. You don\'t have to believe me. Just tell them I asked.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["There's no 'them,' bro."] },
    { type: 'dialogue', speaker: 'ben', lines: ['Yeah. Okay. Good night, Nick.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Bro Ben just called me'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['(The reply comes fast.)'] },
    { type: 'dialogue', speaker: 'eric', lines: ['why'] },
    { type: 'dialogue', speaker: 'eric', lines: ['💀'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Apperantly Jacob is spamming him and he thinks were causing it'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Bro Jacob is a LOSER'] },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'Run the exchange back, if you want. Ben said: I think it\'s you guys. And the group chat answered: Jacob is a loser.',
        'Those two sentences never touch. Nobody needs them to.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator', lines: [
        'For the record: that is the last time Ben ever calls anyone in this group.',
        'For the other record —',
      ],
    },
    { type: 'cameraPan', x: 1200, y: 620, durationMs: 2200, holdMs: 2600 }, // PROTECTED — the held empty dark
    { type: 'dialogue', speaker: 'narrator', lines: ['There is nothing there.'] },
    { type: 'wait', ms: 1600 },
    { type: 'changeScene', sceneIndex: 4, transitionMs: 400 }, // the hidden cut, camera on black

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 5 — "The Third Island" (scenes[4], L2_ACT2) — THE REVEAL.
    // From here to the Scene 11 question, every narration beat is narrator_eric.
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'wait', ms: 1200 },
    { type: 'stopAllAudio', fadeMs: 0 }, // a CUT, not a fade
    { type: 'dialogue', speaker: 'narrator', lines: ['For the other record—'] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['—there is no other record.', "There's mine."] }, // THE HANDOFF
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'A minute ago I told you there was nothing there.',
        'Twelve chapters of this game, and that is the one lie I have ever told you to your face. That one.',
        'Everything else, I just let you believe.',
      ],
    },
    { type: 'cameraPan', x: 1200, y: 1150, durationMs: 3800, holdMs: 2000 }, // THE REVEAL PAN
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'I told you once what was between them. Nothing, I said. Rockville, presumably.',
        'It was my bedroom.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Which is accurate, for the record. That\'s what was in here. A guy.',
        'No admin. No plan, no process, no eras, no \'simply.\' All of that got built later — you build the office after you find out what the work is. I was a guy at a desk with a browser tab open.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        "The monitor. One tab. A website with a gray, dated interface — the kind of site that has looked five years old for fifteen years. This game is not going to tell you its name. It did one thing: you give it two phone numbers, and it rings them both, and it stitches the two lines together — so that each phone lights up with the other one's name, and neither one placed the call.",
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        "I'd known about it for years. No target, no plan. I just knew it existed, the way you know where the fire axe is.",
        "Then two guys I knew came back from a McDonald's with a story, and told it to the back seat of a parked car, and the part of me that laughs went to bed that night. The other part sat down here.",
      ],
    },
    { type: 'walkTo', x: 1200, y: 1180, markerLabel: 'Sit down.' },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['This is the part you do. Not watch — do. Take your time. The chapter will wait. It\'s been waiting two years.'] },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'founding',
        wire: { field1Label: 'NICK F', field2Label: 'JACOB', typing: 'full', blindWaitMs: 6000, ringPanMs: 5200 },
        typedReply: [{ kind: 'auto', text: 'what did he want' }],
        leftPhone: LEFT_PHONE, rightPhone: RIGHT_PHONE,
      },
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'The founding document. I told you that already, back when I was the group chat — I said it doesn\'t feel like one, it feels like a Wednesday.',
        "It's a receipt. It was always a receipt. Delivery confirmed.",
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'The question I knew the answer to. I\'d like to tell you it felt like lying. It felt like nothing. Four words, and they kept the story going, and the story was the point.',
        'So here is the motive, on the record, in the words I actually used at the time: I thought I could milk a lot more content out of Jacob than just letting them meet him once.',
        "That's it. That's the founding principle of everything this game calls a syndicate. Not hate. Not loneliness. Not revenge. Content.",
        'I saw so much potential in this.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'So now you know the thing Act I knew and didn\'t say. Both phones rang; you watched them ring; the proof was on screen the entire time — and you read a story over it instead.',
        'You believed the wrong caller. Which — I want to be fair to you — is exactly what everyone did.',
      ],
    },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['(He does not close the tab.)'] },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 6 — "Dead Air, With Applause" (scenes[4] continued)
    // ═══════════════════════════════════════════════════════════════════════
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'So now we do the era again. Same nights. Same lines — I\'m not changing a word; the words are the evidence. The only thing different is where you\'re sitting.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'People imagine a schedule. There was no schedule. Once a week, on average — bursty. If you\'re looking for the reason each call happened on the night it happened: there was no reason. That\'s important.',
        'The cause is sitting in your chair.',
      ],
    },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: { variant: 'rerun', run: 'routine', wire: { field1Label: 'NICK F', field2Label: 'JACOB', typing: 'full' } },
    },
    { type: 'dialogue', speaker: 'nick_h', lines: ["jacob's been quiet"] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        "He hadn't gone quiet. I'd had a busy week.",
        "Every silence I produced got filed under his personality. He 'missed them.' He 'was committed to the bit.' He 'went quiet.' The man had weather, and the weather was me.",
      ],
    },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['Now the night you already know. You can see that. The operator couldn\'t. Type the numbers anyway. He did.'] },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'rerun', run: 'voicemail',
        wire: { field1Label: 'NICK F', field2Label: 'JACOB', typing: 'autofill', deadAirHoldMs: 6000 },
        ring: { left: true, right: true, darkenIsland: { x: 2040, y: 620, w: 300, h: 220 } },
        leftPhone: LEFT_PHONE, rightPhone: RIGHT_PHONE,
      },
    },
    { type: 'dialogue', speaker: 'nick_f', lines: ['He just called me and had a voice script to pretend i went to his voicemail'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['at least he was creative'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['but how do you not have anything better to do'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'The one act of respect this group ever paid Jacob was applause for dead air. They heard nothing, and they decided the nothing was brilliant.',
        'Give this group nothing, and they will invent a whole man out of it. And then they will grade him.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Inventory of that night, for the record. Jacob: did nothing, and wasn\'t there. Nick H: graded him for it. And a third guy, at a desk, arranging a phone call between a video game and an empty bedroom.',
        'One of the three of us did not have anything better to do.',
      ],
    },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ["Then there's the other night.", "Field two — field two is not Nick F's number tonight. The contact card says BEN."] },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'rerun', run: 'ben',
        wire: { field1Label: 'JACOB', field2Label: 'BEN', typing: 'oneKey' },
        typedReply: [{ kind: 'exact', text: 'why' }, { kind: 'chip', text: '💀' }],
      },
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        "That's the whole play. That is the entire counterintelligence apparatus of an eight-month operation: play dumb in four characters and let the room do the rest.",
        'There was Ben — alone, correct, at the bottom of the ladder — and the room had a policy for correct people at the bottom of the ladder.',
      ],
    },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Apperantly Jacob is spamming him and he thinks were causing it'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Bro Jacob is a LOSER'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'I watched it happen live. Not "found out about later" — watched. I read Ben\'s accusation, correct in every particular but one, and I watched it bounce off contempt and land on Jacob, and I added a skull.',
        "You've now done everything I did. Notice how little of it felt like anything. Not that it was cruel. That it was easy.",
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Up to here, everything I did, I did to people I couldn\'t see.',
        'The next part, I did in person.',
      ],
    },
    { type: 'changeScene', sceneIndex: 5, transitionMs: 600 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 7 — "The Call Logs" (scenes[5], L1 booth)
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['Mid-era. Deep enough in that nobody dates things anymore. A booth you know.'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'All four seats are taken. Nobody offered it to him tonight — at some point, offering stopped being a thing that had to happen.',
        'First time this chapter has put me in a room with him. Nick F: knew Jacob kept calling him. Nick H: knew the bit was the group\'s best-running show. Jacob: knew — exactly, precisely, correctly — that something in the world was rigged.',
        'And the end of the table knew everything, and had a Sprite.',
      ],
    },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Oh — wait. Jacob. Bro. Real question. Are you ever going to tell us what the calls are? It\'s been months, man. What is the bit?'] },
    { type: 'dialogue', speaker: 'jacob', lines: ['There\'s no bit. I\'ve told you this every time. I have never called you. Not once. My phone rings, it\'s your name on it, I pick it up — and then you tell everyone I called you.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['Why would I be calling YOU, bro?'] },
    { type: 'dialogue', speaker: 'jacob', lines: ['Why would I be calling YOU? Do you hear it? It\'s the same question. It is exactly the same question — and when you ask it, it\'s obvious, and when I ask it, it\'s funny.'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'He was heated. We logged it as delivery. By then there was no version of Jacob that arrived at this table as information. And I knew the true thing, and I was in the booth.',
      ],
    },
    { type: 'dialogue', speaker: 'jacob', lines: ["I'm not doing a bit."] },
    { type: 'dialogue', speaker: 'nick_h', lines: ["That's the bit."] },
    { type: 'dialogue', speaker: 'jacob', lines: ['Okay. Fine. Look — I\'ll show you. Call logs.', 'Incoming. Every single one of them — incoming, your name, the date, the time. Months of it. It\'s thirty seconds. Look at it one time, and then tell me I called you.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["Bro. Nobody wants to see your phone. It's fine. We love the bit."] },
    { type: 'dialogue', speaker: 'nick_h', lines: ['The prep is crazy.'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'And that\'s the whole trial. Evidence offered, never entered. Somebody asks whether Maharko\'s right that the Sprite in Florida is worse, and the table moves to carbonation — which is somehow always where this table goes when the truth is out on it.',
      ],
    },
    { type: 'dialogue', speaker: 'jacob', lines: ['Then one more.'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Say it. Whatever you\'re saying at your screen right now — that\'s the one. Three words would have done it. \'Show me the logs.\' Not a confession. Not even a risk. Curiosity, performed once, in public.',
        'I had the three words. I have had them every night for two years.',
      ],
    },
    { type: 'cameraPan', x: 215, y: 240, durationMs: 800, holdMs: 8000 }, // THE SILENCE — PROTECTED
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['(Jacob puts the phone away. And then he stays.)'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Jacob was never fooled. Not for a day. He knew the world was rigged; he said so, repeatedly, with heat, in complete sentences, and he offered the receipts. He was not deceived. He was disbelieved.',
        'The trick was never protected by cleverness. Two fields and a gray button. A child could have caught it. The trick was protected by contempt.',
        'I built the machine. I never built the shield. The shield was already at the table when I sat down.',
      ],
    },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['Two men, both outside, both correct, both offering the receipts up the ladder with both hands. Neither of them ever found out about the other.'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'It was also friendship. Both of those are true at once, and nobody at that table will ever have to choose between them — except one.',
        'He got two years to choose. He built a video game instead.',
      ],
    },
    { type: 'cameraPan', x: 215, y: 240, durationMs: 800, holdMs: 3200 },
    { type: 'changeScene', sceneIndex: 6, transitionMs: 600 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 8 — "First Time For Everybody" (scenes[6] roof → scenes[7] booth)
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'screenTint', color: 0x0a1030, alpha: 0.38 },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['This one is out of order. It belongs weeks before the booth. I had to work up to it. The first hangout.'] },
    { type: 'cameraPan', x: 770, y: 285, durationMs: 600, holdMs: 900 },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['The invitation had gone out from the group — the whole chat, all our names on it. He wasn\'t lured out by one guy. He was invited by an institution.'] },
    { type: 'cameraPan', x: 470, y: 660, durationMs: 1200, holdMs: 1000 },
    { type: 'sfx', key: 'sfx_door_open' },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'A man drives himself — correctly, signaling, to an audience of nobody — to a dark park, because the people who had spent a season making him the bit invited him, all together, at last.',
        'Call it his initiation if you want the warm word. I\'ll say the other one: it was a hazing, and he supplied his own transportation to it.',
        'And here is the thing that will not resolve tonight, or ever: it was also, start to finish, a genuinely good night. Both of those. Keep both hands full.',
      ],
    },
    { type: 'cameraPan', x: 770, y: 300, durationMs: 900 },
    { type: 'dialogue', speaker: 'nick_f', lines: ['He came! Bro. He CAME.'] },
    { type: 'dialogue', speaker: 'jacob', lines: ['You invited me.'] },
    { type: 'dialogue', speaker: 'jacob', lines: ["I've never done this."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["That's fine, man. There's a first time for everybody."] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['(Nobody is being cruel on this roof tonight. Save that sentence.)'] },
    { type: 'dialogue', speaker: 'nick_h', lines: ["Better than Nick's first one."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["That's — okay. That's true."] },
    { type: 'dialogue', speaker: 'eric', lines: ['Same, for what it\'s worth. First one.'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        "It wasn't my first time. Everyone on that roof knew it wasn't, except the one person the sentence was for.",
        "I can get it down to two candidates, both real. One: camouflage — matching his inexperience was the best cover available. Two: kindness — I moved down to where he was standing so the bottom rung would have two people on it.",
        "I know which one you want it to be. So do I. I'm not going to pick. I could not do a kind thing that wasn't also cover, and I could not run cover without meaning some of it. That's not a confession about me; that's the water this whole group drinks.",
      ],
    },
    { type: 'dialogue', speaker: 'jacob', lines: ['These are my hands. I know that. But I\'m really knowing it right now.'] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['(Both of those, one more time, and I promise that\'s the last time I\'ll say it: from here you count them yourself.)'] },
    { type: 'changeScene', sceneIndex: 7, transitionMs: 600 },

    { type: 'dialogue', speaker: 'narrator_eric', lines: ['No vote, no toast. One night the geometry just includes you.'] },
    { type: 'dialogue', speaker: 'jacob', lines: ["These are the best fries I've ever had. I understand everything now."] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['(Not Jacob\'s.)'] },
    { type: 'dialogue', speaker: 'maharko', lines: ['no way you guys are acc hanging out with jacob he is such a loser'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["i don't think he's a loser, but he's def not a winner"] },
    { type: 'cameraPan', x: 215, y: 240, durationMs: 800, holdMs: 3500 }, // PROTECTED — both things, one frame
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Maharko first, because it\'s the easy one to misread: he wasn\'t escalating. That\'s loyalty, quoted verbatim, by the only founder who wasn\'t in the room when everyone quietly stopped enforcing it.',
        'Now Nick F\'s answer. It\'s built like fairness. Not a loser — he\'s defending him. Def not a winner — he\'s filing him. That is the machine at cruising altitude. That sentence was the era\'s version of love, and it was also the other thing, at the same time, in the same eleven words. What it is still like.',
      ],
    },
    { type: 'cameraPan', x: 470, y: 660, durationMs: 1200 },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'He was on that roof because of me. I made him invitable, and I did it for content, and the night you just watched was the project going well.',
        'It was a good night. Real, all of it, all the way down. It was also a yield. Both. The whole time. That\'s the chapter. From here on, it\'s just the paperwork.',
      ],
    },
    { type: 'changeScene', sceneIndex: 8, transitionMs: 700 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 9 — "The Capital" (scenes[8], L2_CHAT)
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['One more thing got built that year. It\'s the biggest thing in this story, and it has no location, so I\'ll show it to you the only way it can be shown.'] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['electric vehicle squad'] },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'capital',
        capital: { oldThreadName: 'electric vehicle squad', newThreadName: 'Sub Zero Squad', memberCount: 6, driftMs: 12000, postRenameHoldMs: 8000 },
      },
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'You know that chat. It\'s on your phone. Your actual phone — the one next to you right now.',
        'It just became everything else on top, the way a fort becomes a city, and nobody was ever told. Now you have been.',
      ],
    },
    { type: 'wait', ms: 2000 },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        "If you were waiting for the moment of no return, it wasn't a call and it wasn't a night. It was a rename.",
        'The machine had a capital now. The next thing it stopped needing was me.',
      ],
    },
    { type: 'changeScene', sceneIndex: 9, transitionMs: 700 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 10 — "Self-Sustaining" (scenes[9], L2_WINTER)
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['February 2025. Last one. The era doesn\'t end with an event. Here is everything that was in the pockets.'] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['A Tuesday.'] },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['The bit, running clean, with the machine nowhere in sight. Watch. This is me, on the record, in the chat:'] },
    { type: 'dialogue', speaker: 'eric', lines: ['bro i was just taking a walk getting something for my girl and then GUESS WHO I SEE WALK TO THE FIVE GUYS'] },
    { type: 'dialogue', speaker: 'eric', lines: ['WHO TREKS TO MCDONALDS AT 3 AM'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['IS IT THE BIG L?'] },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Read the caps. That\'s me at performance pitch. Now read the craft. He was walking into a Five Guys. I typed McDonald\'s anyway. By February the bit didn\'t run on facts. It ran on the seat.',
        'And "the Big L." We had a name for him. With a definite article, like a landmark. He was IN by then, and the name was still on the books, and I was still feeding it.',
        'I was on an errand for someone I loved when I sent it. Both currents, one sidewalk, no machine required. The machine had done its work: the work was me.',
      ],
    },
    { type: 'wait', ms: 1500 },
    { type: 'dialogue', speaker: 'narrator_eric', lines: ['Now the part you\'re actually here for, which is the part where nothing happens.'] },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'unsent',
        wire: { field1Label: 'NICK F', field2Label: 'JACOB', typing: 'autofill' },
        unsent: { minStillMs: 1500, rewindLine: "That's not how it happened.", walkAwayHoldMs: 500, closeSfx: 'sfx_laptop_close' },
      },
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Here\'s what the calls were for — the only job they ever had: keep Jacob arriving.',
        'It had become a self-sustaining system.',
        'The operator inspected the output, found the process no longer required him, and initiated shutdown.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'The calls stopped that month. Now the important part. Here is everything that happened next:',
        'Nothing.',
        'They were weather. The weather cleared, and you don\'t text the chat about a clear day. He was never even acquitted. Some of you had it on the books until about an hour ago.',
      ],
    },
    {
      type: 'dialogue', speaker: 'narrator_eric', lines: [
        'Don\'t hand me anything for the call I didn\'t place. Walking away from a machine you built, after it works, isn\'t stopping. It\'s shipping.',
        'The product was live. The system sustained itself. The author signed off — without, it goes without saying, signing.',
      ],
    },
    { type: 'screenTint', color: 0x000000, alpha: 1.0, durationMs: 1200 },
    { type: 'changeScene', sceneIndex: 10, transitionMs: 600 },

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE 11 — "Does It Matter" — THE CODA (scenes[10], L0)
    // ═══════════════════════════════════════════════════════════════════════
    { type: 'screenTint', color: 0x000014, alpha: 0.35, durationMs: 800 },
    { type: 'wait', ms: 1500 },
    { type: 'dialogue', speaker: 'eric', lines: ['So. The summer Maharko left for Florida. What happened was—'] },
    { type: 'wait', ms: 1400 },
    {
      type: 'dialogue', speaker: 'eric', lines: [
        "—I did it. The calls were me. Both phones, every time, all eight months. Jacob never called anyone. Nobody ever called anyone. There was a website, and there was me, and I thought he'd be good content.",
        'And he was.',
        "That's the whole sentence. It was never long. It was just heavy.",
      ],
    },
    { type: 'wait', ms: 1200 },
    { type: 'dialogue', speaker: 'eric', lines: ['You were made.', 'Does it matter?'] }, // narrator retires after this
    { type: 'stopAllAudio', fadeMs: 400 },
    { type: 'screenTint', color: 0x000000, alpha: 0.55, durationMs: 2000 },
    { type: 'wait', ms: 25000 }, // THE LONG HOLD — PROTECTED, deliberately over-long
    { type: 'sfx', key: 'sfx_phone_buzz' },
    {
      type: 'minigame', modeId: 'doubleCall', background: false,
      config: {
        variant: 'reply',
        reply: {
          threadHeader: 'Sub Zero Squad',
          incoming: { sender: 'JACOB', text: 'who tryna go to mcdonalds tn?' },
          reply: { kind: 'exact', text: 'omw' },
          codaExit: { doorPoint: { x: 350, y: 505 }, finalHoldMs: 4000 },
        },
      },
    },
    { type: 'endChapter' },
  ],
};

export default chapter12;
