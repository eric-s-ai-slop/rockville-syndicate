// ─── Story Chapter System ──────────────────────────────────────────────────────
// The game is a linear, story-first playthrough: each chapter is one real event
// from the Rockville Syndicate's history. A chapter is a small bespoke map plus
// an ordered list of "beats" the ChapterScene runs one at a time. Combat only
// appears as short scripted `bossFight` beats — no wave spawning.

import { CHARACTER_CLASSES, NPC_CHARACTERS } from '../data';

// ─── Speaker resolution ─────────────────────────────────────────────────────────

export interface Speaker {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// Extra speakers that aren't playable heroes or roaming NPCs.
const EXTRA_SPEAKERS: Speaker[] = [
  { id: 'narrator', name: 'The Group Chat', emoji: '💬', color: '#c8e89a' },
  { id: 'audrey', name: 'Audrey', emoji: '🇨🇦', color: '#f472b6' },
  { id: 'maharko', name: 'Maharko', emoji: '🏎️', color: '#22d3ee' },
  { id: 'ben', name: 'Ben Bersofsky', emoji: '🧪', color: '#84cc16' },
  { id: 'michael_bersofsky', name: 'Michael Bersofsky', emoji: '🚪', color: '#ef4444' },
  { id: 'emily', name: 'Emily (Spain GF)', emoji: '✈️', color: '#f9a8d4' },
  { id: 'caleb', name: 'Caleb Allentuck', emoji: '🫧', color: '#a78bfa' },
  { id: 'vs', name: 'VS', emoji: '⚔️', color: '#ef4444' },
  { id: 'anastasia', name: 'Anastasia', emoji: '💅', color: '#f472b6' },
  { id: 'sophia', name: 'Sophia', emoji: '🌸', color: '#c084fc' },
  { id: 'sam_ferretti', name: 'Sam Ferretti', emoji: '🤢', color: '#94a3b8' },
];

export function resolveSpeaker(id: string): Speaker {
  const hero = CHARACTER_CLASSES.find(c => c.id === id);
  if (hero) return { id: hero.id, name: hero.name, emoji: hero.emoji, color: hero.color };
  const npc = NPC_CHARACTERS.find(c => c.id === id);
  if (npc) return { id: npc.id, name: npc.name, emoji: npc.emoji, color: npc.color };
  const extra = EXTRA_SPEAKERS.find(s => s.id === id);
  if (extra) return extra;
  return { id, name: id, emoji: '🗨️', color: '#c8e89a' };
}

// ─── Map config ─────────────────────────────────────────────────────────────────

/** Per-chapter visual theme — drives floor pattern and ambient lighting in Phase C. */
export type MapTheme =
  | 'apartment'
  | 'highway_night'
  | 'hospital'
  | 'park'
  | 'florida'
  | 'suburb_night'
  | 'cabin';

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: number;
  stroke?: number;
  /**
   * Semantic prop type — drives better procedural rendering when no sprite is
   * loaded. Removing all in-world text labels; this is the source of truth for
   * what a rect *is*.
   */
  propType?: 'couch' | 'tv' | 'desk' | 'counter' | 'sink' | 'fridge' | 'bed'
           | 'rug' | 'door' | 'window' | 'wall' | 'car' | 'tree' | 'road'
           | 'guardrail' | 'tollbooth' | 'firepit' | 'hottub' | 'arcade'
           | 'barrier_arm' | 'cone'
           | 'bench' | 'junglebox';
  /**
   * When a prop sprite sheet is loaded under this key, render the sprite
   * instead of a procedural shape. Physics body remains the same rectangle.
   */
  propKey?: string;
  /** Solid rects become collidable walls/objects. */
  solid?: boolean;
  /** Solid rects with invisible:true get physics but no visual (background image handles the look). */
  invisible?: boolean;
  /** @deprecated Legacy label field — ignored by renderer since Phase B. Use propType instead. */
  tag?: string;
}

export interface RoomLabel {
  x: number;
  y: number;
  name: string;
  detail: string;
  color: string;
}

export interface MapConfig {
  width: number;
  height: number;
  /** Floor / ground colour the whole map (and the overscan beyond it) sits on. */
  backdrop: number;
  /** Visual theme — selects floor pattern and ambient settings. */
  theme?: MapTheme;
  /** Shown as a fading area-title toast when the chapter starts (replaces permanent room signs). */
  areaTitle?: string;
  rects: MapRect[];
  labels: RoomLabel[];
  playerSpawn: { x: number; y: number };
}

// ─── Actors ──────────────────────────────────────────────────────────────────────

export interface ActorPlacement {
  /** Matches a hero id (uses processed sheet) or any id (falls back to a tinted blob). */
  id: string;
  x: number;
  y: number;
  /** Override the displayed nameplate (defaults to the resolved speaker name). */
  nameOverride?: string;
  /**
   * If the player's chosen hero matches `id`, place this character's sprite at
   * the same position instead of leaving the slot empty (R5 roster presence).
   */
  understudyId?: string;
}

// ─── Beats ─────────────────────────────────────────────────────────────────────

export interface ChoiceOption {
  text: string;
  /** Dollars added to the running Ledger gag when chosen. */
  ledgerDelta?: number;
  /** Lines spoken in reaction to this choice before the story continues. */
  reactionSpeaker?: string;
  reactionLines?: string[];
  /** Jump to the beat with this id instead of falling through. */
  goto?: string;
}

export type Beat = { id?: string } & (
  | { type: 'dialogue'; speaker: string; lines: string[] }
  | { type: 'choice'; speaker: string; prompt: string; options: ChoiceOption[] }
  | { type: 'walkTo'; x: number; y: number; radius?: number; markerLabel?: string }
  | { type: 'cameraPan'; x: number; y: number; durationMs: number; holdMs?: number }
  | { type: 'bossFight'; bossId: string; arena: { x: number; y: number; w: number; h: number }; introLines?: string[] }
  | { type: 'chase'; pursuerId: string; durationMs: number }
  | { type: 'wait'; ms: number }
  | { type: 'ledger'; delta: number; note: string }
  | { type: 'endChapter' }
);

// ─── Chapter ─────────────────────────────────────────────────────────────────────

export interface ChapterConfig {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  location: string;
  description: string;
  kind: 'chapter' | 'interlude' | 'epilogue';
  /** Force a specific protagonist for this chapter regardless of crew pick. */
  protagonistOverride?: string;
  map: MapConfig;
  actors: ActorPlacement[];
  beats: Beat[];
}

// ─── Palette helpers (shared so maps read consistently) ──────────────────────────

const C = {
  floorWood: 0x3a2a1a,
  floorTile: 0x1f2933,
  rug: 0x4b2e2e,
  wall: 0x2a3d18,
  couch: 0x991b1b,
  desk: 0x334155,
  counter: 0x475569,
  sink: 0x0369a1,
  tv: 0x111827,
  door: 0x78350f,
  fridge: 0xe2e8f0,
  grass: 0x16331a };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 1 — The Spotify Family Insurgency (Commons Apartment 1522)
// ═══════════════════════════════════════════════════════════════════════════════

const chapter1: ChapterConfig = {
  id: 'spotify_insurgency',
  index: 1,
  title: 'The Spotify Family Insurgency',
  subtitle: 'Act I — The Extortion Crisis',
  location: 'Commons Apartment 1522',
  description:
    'Eric charges $4.50 a month for a Spotify Family plan that costs $3.33. Jordan has the math. Tonight, the ledger gets audited.',
  kind: 'chapter',
  map: {
    width: 920,
    height: 660,
    backdrop: C.floorWood,
    theme: 'apartment',
    areaTitle: 'Commons Apartment 1522',
    rects: [
      // outer apartment shell
      { x: 460, y: 16, w: 880, h: 16, fill: C.wall, solid: true },
      { x: 460, y: 644, w: 880, h: 16, fill: C.wall, solid: true },
      { x: 16, y: 330, w: 16, h: 640, fill: C.wall, solid: true },
      { x: 904, y: 330, w: 16, h: 640, fill: C.wall, solid: true },
      // living-room rug
      { x: 460, y: 380, w: 320, h: 200, fill: C.rug, propType: 'rug', propKey: 'furn_rug_large' },
      // couch (top of living room)
      { x: 460, y: 300, w: 180, h: 40, fill: C.couch, stroke: 0xef4444, propType: 'couch', solid: true, propKey: 'furn_couch_long' },
      // TV (Heated Rivalry)
      { x: 460, y: 250, w: 120, h: 24, fill: C.tv, stroke: 0x8d6e63, propType: 'tv' },
      { x: 460, y: 250, w: 120, h: 24, fill: C.tv, stroke: 0x8d6e63, propKey: 'furn_cabinet_tall' },
      // Eric's command desk (top-left)
      { x: 180, y: 150, w: 140, h: 50, fill: C.desk, stroke: 0x64748b, propType: 'desk', solid: true, propKey: 'furn_desk' },
      { x: 180, y: 190, w: 40, h: 40, fill: C.desk, stroke: 0x64748b, propKey: 'furn_chair' },
      // kitchen counter + sink (top-right)
      { x: 720, y: 150, w: 150, h: 44, fill: C.counter, stroke: 0x94a3b8, propType: 'counter', solid: true },
      { x: 760, y: 150, w: 48, h: 36, fill: C.sink, stroke: 0x38bdf8, propType: 'sink' },
      // fridge
      { x: 860, y: 150, w: 40, h: 60, fill: C.fridge, stroke: 0x94a3b8, propType: 'fridge', solid: true },
      // front door (bottom center)
      { x: 460, y: 636, w: 60, h: 18, fill: C.door, stroke: 0x92400e, propType: 'door' },
      // Extra decor
      { x: 60, y: 400, w: 40, h: 80, fill: C.rug, propKey: 'furn_bookshelf' },
      { x: 80, y: 150, w: 40, h: 40, fill: C.rug, propKey: 'furn_plant_tall' },
      { x: 460, y: 360, w: 60, h: 40, fill: C.rug, propKey: 'furn_coffee_table' },
    ],
    labels: [
      { x: 250, y: 110, name: 'THE COMMAND DESK', detail: "Eric's Spotify throne", color: '#818cf8' },
      { x: 795, y: 110, name: 'THE KITCHEN', detail: '25 forks, 0 clean', color: '#38bdf8' },
      { x: 620, y: 600, name: 'LIVING ROOM', detail: 'Apartment 1522', color: '#c8e89a' },
    ],
    playerSpawn: { x: 460, y: 560 } },
  actors: [
    { id: 'eric', x: 250, y: 215, understudyId: 'nick_f' },
    { id: 'jordan', x: 600, y: 430, understudyId: 'maharko' },
    { id: 'nick_h', x: 520, y: 330, nameOverride: 'Nick H (asleep)', understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Apartment 1522. The dishes are a public-health emergency. The Spotify situation is worse.',
        'Eric charges everyone $4.50 a month for the Family plan. Jordan has been doing math.',
        'Walk over to Jordan. He has something to show you.',
      ] },
    { type: 'walkTo', x: 600, y: 460, radius: 70, markerLabel: 'Talk to Jordan' },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        'I ran the numbers. The plan is $20 a month, split six ways. That is $3.33 per person.',
        "Eric charges $4.50. That's a 35% markup on a streaming service he didn't build.",
        'I posted the forensic ledger in the GC. Everyone saw it. He went offline for two hours.',
      ] },
    { type: 'ledger', delta: 4.5, note: 'Spotify overcharge (per month)' },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['Eric is at the Command Desk. Time to confront the Admin himself.'] },
    { type: 'walkTo', x: 250, y: 270, radius: 70, markerLabel: 'Confront Eric' },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'So yes — I charge $4.50 for Spotify. The plan costs $3.33. I am aware of the discrepancy.',
        "I don't debate spreadsheets. You cannot gaslight a calculator.",
        'I simply blamed Joe Biden for inflation and moved on. The $4.50 era continues.',
      ] },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'How do you open the audit?',
      options: [
        {
          text: 'Present the forensic ledger: $20 ÷ 6 = $3.33.',
          reactionSpeaker: 'eric',
          reactionLines: ['That number means nothing to me. THE MATH IS EMOTIONAL.'] },
        {
          text: 'Just Zelle him the $4.50 and keep the peace.',
          ledgerDelta: 4.5,
          reactionSpeaker: 'eric',
          reactionLines: ['Smart. A subscriber who understands their place. Pleasure doing business.'] },
        {
          text: 'Threaten to switch everyone to Apple Music Lossless.',
          reactionSpeaker: 'eric',
          reactionLines: ['You wouldn\'t. The Dolby Atmos is a bluff. ...Is it a bluff?'] },
      ] },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: ['Fine. You want to audit me? Then audit me. I AM THE AUDIT.'] },
    {
      type: 'bossFight',
      bossId: 'boss_eric',
      arena: { x: 460, y: 360, w: 760, h: 520 },
      introLines: ['Eric Huang — The Spotify Insurgent', 'Land the audit. Deplete his BIQ.'] },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'FINE. FINE. You get nothing. I\'m migrating everyone to Apple Music out of spite.',
        '...The refund will process in 3-5 business decades.',
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['The $4.50 era is over. The ledger remembers. One down.'] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 2 — NYC 1AM Drive (Operation Inertia)
// ═══════════════════════════════════════════════════════════════════════════════

const chapter2: ChapterConfig = {
  id: 'nyc_1am_drive',
  index: 2,
  title: 'Operation Inertia',
  subtitle: 'Interlude I — The Baltimore Checkpoint',
  location: 'I-95 Northbound',
  description:
    'Nick F calls WTM at 1:00 AM. Destination: New York City. Jacob invests $100. Everything dissolves at the Baltimore toll.',
  kind: 'interlude',
  map: {
    width: 880,
    height: 620,
    backdrop: 0x060b14,
    theme: 'highway_night',
    areaTitle: 'I-95 Northbound',
    rects: [
      // highway road (vertical, center)
      { x: 440, y: 310, w: 180, h: 580, fill: 0x1c1c1c },
      { x: 440, y: 310, w: 4, h: 580, fill: 0xfbbf24 },
      // road lanes dashes
      { x: 380, y: 100, w: 4, h: 60, fill: 0xffffff },
      { x: 380, y: 250, w: 4, h: 60, fill: 0xffffff },
      { x: 380, y: 400, w: 4, h: 60, fill: 0xffffff },
      { x: 500, y: 100, w: 4, h: 60, fill: 0xffffff },
      { x: 500, y: 250, w: 4, h: 60, fill: 0xffffff },
      { x: 500, y: 400, w: 4, h: 60, fill: 0xffffff },
      // tollbooth — Baltimore checkpoint
      { x: 440, y: 200, w: 200, h: 50, fill: 0x374151, stroke: 0xf59e0b, propType: 'tollbooth', solid: true },
      // Nick F's C55 AMG (top of road)
      { x: 440, y: 320, w: 60, h: 90, fill: 0x111827, stroke: 0xf59e0b, propType: 'car', propKey: 'prop_nick_f_corolla' },
      { x: 440, y: 320, w: 50, h: 30, fill: 0x1e3a5f },
      // shoulder grass
      { x: 160, y: 310, w: 260, h: 620, fill: 0x0d2010 },
      { x: 720, y: 310, w: 260, h: 620, fill: 0x0d2010 },
      // trees on shoulder
      { x: 100, y: 200, w: 40, h: 40, fill: 0x14532d },
      { x: 200, y: 380, w: 40, h: 40, fill: 0x166534 },
      { x: 760, y: 180, w: 40, h: 40, fill: 0x14532d },
      { x: 820, y: 400, w: 40, h: 40, fill: 0x166534 },
      // barrier arm + cones at the toll line (non-solid decor)
      { x: 440, y: 225, w: 150, h: 20, fill: 0xdc2626, propType: 'barrier_arm' },
      { x: 370, y: 225, w: 20, h: 30, fill: 0xf97316, propType: 'cone' },
      { x: 510, y: 225, w: 20, h: 30, fill: 0xf97316, propType: 'cone' },
      // guardrails
      { x: 360, y: 310, w: 8, h: 560, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail', solid: true },
      { x: 520, y: 310, w: 8, h: 560, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail', solid: true },
    ],
    labels: [
      { x: 440, y: 80, name: 'NYC: 225 MILES', detail: '1:14 AM — full tank, zero plan', color: '#f59e0b' },
      { x: 440, y: 540, name: 'ROCKVILLE, MD', detail: 'Where we started', color: '#6b7280' },
      { x: 160, y: 310, name: 'SHOULDER OF DEFEAT', detail: 'Nick H territory', color: '#4ade80' },
    ],
    playerSpawn: { x: 440, y: 480 } },
  actors: [
    { id: 'nick_f', x: 380, y: 340, understudyId: 'jordan' },
    { id: 'nick_h', x: 500, y: 340, understudyId: 'maharko' },
    { id: 'jacob', x: 440, y: 390, understudyId: 'jordan' },
    { id: 'eric', x: 440, y: 460, understudyId: 'maharko' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'August, 2025. Nick F drops "WTM" at 12:47 AM. The move: drive to New York City.',
        'Jacob Lebby invests $100 into the venture without asking any questions.',
        'Nick H is in the car. This is already a mistake.',
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "I'm on my way! C55 is fueled. NYC by 4AM, back by 8. This is completely reasonable.",
        "Dolby Atmos on the speakers. Mancera Red Tobacco on the neck. We're going.",
      ] },
    { type: 'ledger', delta: 100, note: 'Jacob — NYC investment (non-refundable)' },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I'm 13x liquid. This $100 is nothing. Let's get it.",
        'Do they have Long John Silvers in New York?',
      ] },
    { type: 'cameraPan', x: 440, y: 200, durationMs: 1600, holdMs: 800 },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Wait.',
        "...We're at the Baltimore toll. It's 1:52 AM.",
        'I need to sleep.',
      ] },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Nick H initiates Bedtime Protocol. He's offering $40 to turn around. What do you do?",
      options: [
        {
          text: 'Accept the $40 bribe. The group turns back.',
          ledgerDelta: -100,
          reactionSpeaker: 'jacob',
          reactionLines: [
            "I JUST PUT IN A HUNDRED DOLLARS. WE'RE TWO HOURS FROM NYC.",
            "I'm getting hot now. I'm actually getting hot.",
          ] },
        {
          text: 'Override Nick H. Push to NYC.',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "Absolutely not. I'm not doing this. The Tucson is going home.",
            'The Bedtime Veto is absolute. This conversation is over.',
          ] },
        {
          text: 'Let Eric decide with cold math.',
          reactionSpeaker: 'eric',
          reactionLines: [
            'We have burned 90 minutes. Gas: $22. Jacob\'s "investment": $100. We are at Baltimore.',
            'The expected value of continuing is negative. The Bedtime Veto wins on forensic grounds.',
          ] },
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "I'll give everyone $40 and we call it a night.",
        'This was never going to happen. You knew that.',
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "You guys don't understand. $100. GONE. Systemic melt. I'm actually in a melt right now.",
        "Sub-zero moment incoming. I'm blocking everyone.",
        "...Goodnight.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The C55 AMG turns around at Exit 49, Baltimore.',
        'Jacob rejoins the group chat six hours later and says "good morning" as if nothing happened.',
        "The $100 was never recovered. It lives in the Ledger now.",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 3 — The Red Pee Bladder Strike (Shepherd University)
// ═══════════════════════════════════════════════════════════════════════════════

const chapter3: ChapterConfig = {
  id: 'red_pee_bladder',
  index: 3,
  title: 'The Red Pee Bladder Strike',
  subtitle: 'Act II — The 10-Year Phantom Reveals Herself',
  location: 'Shepherd University, WV',
  description:
    'August 16, 2025. Jacob drops a status update with photographic evidence. The group demands answers via 20 Questions.',
  kind: 'chapter',
  protagonistOverride: 'jacob',
  map: {
    width: 860,
    height: 640,
    backdrop: 0xe8e0d4,
    theme: 'hospital',
    areaTitle: 'Shepherd University Clinic',
    rects: [
      // hospital room walls
      { x: 430, y: 16, w: 844, h: 16, fill: 0xd1d5db, solid: true },
      { x: 430, y: 624, w: 844, h: 16, fill: 0xd1d5db, solid: true },
      { x: 16, y: 320, w: 16, h: 640, fill: 0xd1d5db, solid: true },
      { x: 844, y: 320, w: 16, h: 640, fill: 0xd1d5db, solid: true },
      // hospital bed
      { x: 430, y: 280, w: 200, h: 100, fill: 0xffffff, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'prop_hospital_bed' },
      // IV drip
      { x: 590, y: 230, w: 12, h: 80, fill: 0x9ca3af },
      { x: 590, y: 190, w: 30, h: 40, fill: 0xbfdbfe, stroke: 0x93c5fd, propType: 'sink', propKey: 'prop_iv_drip' },
      // toilet (evidence room)
      { x: 700, y: 300, w: 60, h: 70, fill: 0xf8fafc, stroke: 0x94a3b8, propType: 'tv', propKey: 'prop_red_toilet' },
      { x: 700, y: 265, w: 60, h: 20, fill: 0xe2e8f0, stroke: 0x94a3b8 },
      // window
      { x: 160, y: 200, w: 120, h: 80, fill: 0xbfdbfe, stroke: 0x93c5fd, propType: 'window' },
      // decor
      { x: 280, y: 280, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_chair' },
      { x: 300, y: 220, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      { x: 100, y: 400, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_plant_small' },
      // doctor's station
      { x: 220, y: 400, w: 160, h: 50, fill: 0xf1f5f9, stroke: 0x64748b, propType: 'desk', solid: true, propKey: 'furn_desk' },
      // floor tile pattern
      { x: 430, y: 320, w: 820, h: 600, fill: 0xf8fafc },
    ],
    labels: [
      { x: 430, y: 100, name: "SHEPHERD UNIVERSITY CLINIC", detail: "Spelld right or Jacob takes damage", color: '#6b7280' },
      { x: 700, y: 180, name: 'EXHIBIT A', detail: '"my pee is red"', color: '#ef4444' },
      { x: 220, y: 360, name: 'INTERROGATION ZONE', detail: '20 yes/no questions remaining', color: '#818cf8' },
    ],
    playerSpawn: { x: 430, y: 500 } },
  actors: [
    { id: 'nick_f', x: 300, y: 450 },
    { id: 'nick_h', x: 200, y: 450 },
    { id: 'eric', x: 560, y: 450 },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'August 16, 2025. Jacob drops the following status update in the group chat:',
        '"My pee is red 😐" — with photographic evidence.',
        'The group does not offer sympathy. They open an investigation.',
      ] },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Okay. 20 questions. Yes or No only.',
        'Did you get hit in the lower back or abdomen?',
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I got in a fight. My bladder got hit. That's all I'm saying.",
        "No I'm not telling you who it was. Ask your questions.",
      ] },
    {
      type: 'choice',
      speaker: 'eric',
      prompt: 'Interrogation: narrow down the assailant. Pick your question wisely.',
      options: [
        {
          text: 'Was it someone we know personally?',
          reactionSpeaker: 'jacob',
          reactionLines: [
            '...You might have met him.',
            "It's not Bryce. That's all I'll say.",
          ] },
        {
          text: 'Does this person have any relation to Audrey?',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'ZERO relation to Audrey.',
            "Why would you even — stop.",
          ] },
        {
          text: 'Was this at Shepherd University?',
          reactionSpeaker: 'jacob',
          reactionLines: [
            "...You're getting warm.",
            "I'm done answering questions. I need my phone back.",
          ] },
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "Bro this is actually insane. Your pee is LITERALLY RED.",
        "Did you take a photo? Send it to the GC right now.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "Jacob… are you okay? Actually genuinely.",
        "...Is this about Audrey?",
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "IT HAS NOTHING TO DO WITH AUDREY.",
        "She just… may have been in the vicinity. Of the fight. Coincidentally.",
        'Sub-Zero mode: activated.',
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The investigation concludes. The assailant: Audrey.',
        'The 10-Year Phantom has materialized. And she threw hands.',
        'Jacob is hospitalized. Day 4.5. Diagnosis: internal bleeding + delusion.',
      ] },
    {
      type: 'bossFight',
      bossId: 'boss_audrey',
      arena: { x: 430, y: 320, w: 780, h: 500 },
      introLines: [
        'AUDREY — The 10-Year Phantom',
        'Bladder Strike confirmed. Controls will be reversed.',
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I'm fine. The doctors said I'm fine.",
        'She just... hit me in the bladder. It happens.',
        "I'm still going to marry her in 10 years. The $1,500 bet stands.",
      ] },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Jacob. The math: $1,500 bet. 10 years. She hospitalized you.',
        "You cannot gaslight a urologist.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob was awarded the "Lebby Redemption Arc" buff upon discharge.',
        'He lost 20 lbs. His confidence increased.',
        "He texted Audrey the same night. She left him on delivered for 3 months.",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 4 — The Jungle Gym Gambit (Interlude)
// ═══════════════════════════════════════════════════════════════════════════════

const chapter4: ChapterConfig = {
  id: 'jungle_gym_gambit',
  index: 4,
  title: 'The Jungle Gym Gambit',
  subtitle: 'Interlude II — The Three Rules',
  location: 'Beall Elementary School, Rockville',
  description:
    'Nick H has a location. He has three rules. He has a 🐔. Jacob claims $3,900 in liquid reserves and absolute immunity to FOMO.',
  kind: 'interlude',
  map: {
    width: 840,
    height: 620,
    backdrop: C.grass,
    theme: 'park',
    areaTitle: 'Beall',
    rects: [
      // park ground / clearing
      { x: 420, y: 310, w: 600, h: 400, fill: 0x1a3d1a },
      // jungle gym structure
      { x: 420, y: 220, w: 140, h: 60, fill: 0x92400e, stroke: 0xd97706, propType: 'junglebox', solid: true },
      { x: 340, y: 250, w: 16, h: 80, fill: 0x92400e, solid: true },
      { x: 500, y: 250, w: 16, h: 80, fill: 0x92400e, solid: true },
      { x: 420, y: 290, w: 140, h: 14, fill: 0xb45309, solid: true },
      // bench
      { x: 600, y: 350, w: 100, h: 24, fill: 0x78350f, stroke: 0x92400e, propType: 'bench', solid: true },
      // extra decor
      { x: 600, y: 300, w: 40, h: 40, fill: 0x14532d, propKey: 'furn_plant_tall' },
      { x: 200, y: 350, w: 40, h: 40, fill: 0x14532d, propKey: 'furn_plant_tall' },
      // trees
      { x: 140, y: 200, w: 60, h: 60, fill: 0x14532d },
      { x: 700, y: 180, w: 60, h: 60, fill: 0x14532d },
      { x: 120, y: 450, w: 60, h: 60, fill: 0x14532d },
      { x: 720, y: 460, w: 60, h: 60, fill: 0x166534 },
      // street behind
      { x: 420, y: 580, w: 840, h: 80, fill: 0x374151 },
      { x: 420, y: 580, w: 840, h: 4, fill: 0xfbbf24 },
      // nick h's tucson (parked)
      { x: 180, y: 560, w: 80, h: 44, fill: 0x1e293b, stroke: 0x4ade80 },
    ],
    labels: [
      { x: 420, y: 80, name: '1202 PRINCETON PLACE', detail: 'The mystery destination', color: '#f59e0b' },
      { x: 420, y: 480, name: 'THE CLEARING', detail: 'Jacob arrived. He has questions.', color: '#c8e89a' },
    ],
    playerSpawn: { x: 420, y: 480 } },
  actors: [
    { id: 'nick_h', x: 420, y: 340, understudyId: 'eric' },
    { id: 'jacob', x: 420, y: 420, understudyId: 'maharko' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Nick H has a location. He will not say what it is.',
        'He issues three rules to Jacob Lebby before revealing it.',
        'Rule one: I sit in my seat.',
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Three rules. First: I sit in my seat. No argument.',
        'Second: ??',
        'Third: I smoke whatever you give me.',
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "What's rule two?",
        'What is this location? Why are there monkey bars?',
        "I'm 13x liquid and I don't FOMO. I'm not desperate for this.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        '🐔',
        '🐔🐔',
        '🐔🐔🐔🐔🐔',
      ] },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'The chicken emojis have been deployed. Jacob\'s FOMO meter is at critical mass. What does he do?',
      options: [
        {
          text: '"Okay FINE. What is this place. Why are we here."',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "Welcome to 1202 Princeton Place. The Jungle Gym.",
            "Rule two was: don't ask what rule two is. You failed.",
          ] },
        {
          text: '"I told you. I am $3,900 liquid. I don\'t need this."',
          ledgerDelta: 0,
          reactionSpeaker: 'nick_h',
          reactionLines: [
            '🐔🐔🐔🐔🐔🐔🐔🐔',
            "You drove here, Jacob. You're standing on the jungle gym.",
          ] },
        {
          text: '"Is Audrey going to be here?"',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "She lives in Canada, Jacob.",
            "She has a boyfriend. 🐔",
          ] },
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I drove an hour for a JUNGLE GYM.',
        "Why didn't you just TELL me what this was.",
        "...Fine. I'm sitting. What are we smoking.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "Loooove it here. Loooooove UMD.",
        "The Chicken Barrage wins every time.",
        "By the way — we're not giving you rule two.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The jungle gym session lasted two hours.',
        "Jacob's $3,900 in liquid reserves remained undeployed.",
        "The chicken emoji has a 100% conversion rate on Jacob. It has never failed.",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 5 — The Florida Highway Duel
// ═══════════════════════════════════════════════════════════════════════════════

const chapter5: ChapterConfig = {
  id: 'florida_highway_duel',
  index: 5,
  title: 'The Florida Highway Duel',
  subtitle: 'Act III — The Puppetmaster and the Camaro',
  location: 'Boca Raton, FL',
  description:
    "Jordan holds shadow admin privileges over Maharko. Maharko's SOL dropped 40%. Jordan's 5.0 Mustang is in the parking lot. This ends one way.",
  kind: 'chapter',
  map: {
    width: 960,
    height: 640,
    backdrop: 0x111827,
    theme: 'florida',
    areaTitle: 'Boca Raton, Florida',
    rects: [
      // main highway (horizontal)
      { x: 480, y: 320, w: 960, h: 200, fill: 0x1c1c1c },
      { x: 480, y: 320, w: 960, h: 4, fill: 0xfbbf24 },
      // road lanes
      { x: 480, y: 270, w: 960, h: 4, fill: 0xffffff },
      { x: 480, y: 370, w: 960, h: 4, fill: 0xffffff },
      // Meat Market building (left side)
      { x: 140, y: 170, w: 220, h: 180, fill: 0x1e293b, stroke: 0xf59e0b, solid: true },
      { x: 140, y: 120, w: 220, h: 40, fill: 0xb45309 },
      // parking lot
      { x: 140, y: 490, w: 260, h: 120, fill: 0x374151 },
      { x: 140, y: 490, w: 260, h: 4, fill: 0x6b7280 },
      // Jordan's 5.0 Mustang (red)
      { x: 140, y: 510, w: 90, h: 50, fill: 0x991b1b, stroke: 0xef4444, propType: 'car', propKey: 'prop_jordan_mustang' },
      // Maharko's Camaro (black)
      { x: 280, y: 510, w: 90, h: 50, fill: 0x111827, stroke: 0x22d3ee, propType: 'car', propKey: 'prop_maharko_camero' },
      // palm trees
      { x: 700, y: 170, w: 24, h: 100, fill: 0x92400e },
      { x: 700, y: 120, w: 50, h: 50, fill: 0x14532d },
      { x: 820, y: 180, w: 24, h: 100, fill: 0x92400e },
      { x: 820, y: 130, w: 50, h: 50, fill: 0x166534 },
      // Boca skyline (background rects)
      { x: 750, y: 200, w: 80, h: 160, fill: 0x1e3a5f, stroke: 0x3b82f6 },
      { x: 850, y: 180, w: 60, h: 180, fill: 0x1e3a5f, stroke: 0x3b82f6 },
      // guardrails
      { x: 480, y: 230, w: 960, h: 8, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail' },
      { x: 480, y: 410, w: 960, h: 8, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail' },
    ],
    labels: [
      { x: 480, y: 80, name: 'BOCA RATON, FL', detail: 'Jordan\'s dominion', color: '#22d3ee' },
      { x: 480, y: 560, name: 'THE HIGHWAY', detail: 'Mustang always wins first turn', color: '#ef4444' },
      { x: 140, y: 80, name: 'MEAT MARKET', detail: 'Jordan absorbs 15% of your Aura here', color: '#f59e0b' },
    ],
    playerSpawn: { x: 480, y: 490 } },
  actors: [
    { id: 'jordan', x: 250, y: 440, understudyId: 'nick_f' },
    { id: 'maharko', x: 380, y: 440, understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Boca Raton, Florida. Maharko moved here specifically because of Jordan.',
        "He broke up with his girlfriend Nelly and Jordan's gravity did the rest.",
        "He drops his Meat Market paycheck into $SOL. Market crashes 40% in 6 hours.",
      ] },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "JORDAN I'M DOWN BAD. SOL JUST CRASHED. I PUT IN MY WHOLE CHECK.",
        "Let's take the Camaro to Miami. I need to clear my head.",
        "I have headers coming. Once I get headers this car will—",
      ] },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "No. We're not going to Miami.",
        "We're going to the 5.0 spot. Get in.",
        "And I'm not paying for your gas.",
      ] },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "But I literally just — you know what, you're right. The 5.0 spot.",
        "Wait... was going to the 5.0 spot MY idea? Did I suggest this?",
        "I feel like I suggested this.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jordan did not suggest the 5.0 spot. Maharko did not suggest the 5.0 spot.',
        "Jordan used an Inception dialogue tree. Maharko now believes the plan was his.",
        "The Mustang pulls out of the Meat Market parking lot. The Camaro follows.",
      ] },
    { type: 'cameraPan', x: 480, y: 320, durationMs: 2000, holdMs: 1000 },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'On the highway: Jordan revs the 5.0.',
        "Crowd control. The parking lot disperses. Absolute dominance.",
        "Maharko decides to race. The Camaro does not win.",
      ] },
    {
      type: 'bossFight',
      bossId: 'boss_florida',
      arena: { x: 480, y: 320, w: 900, h: 180 },
      introLines: [
        'JORDAN DIVBAND — The Puppetmaster',
        "5.0 Mustang. First-turn win guaranteed. Prove the storyboard wrong.",
      ] },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "Bro you GAPPED me.",
        "That was not fair. You had a run on me.",
        "Just wait until I get headers. JUST WAIT UNTIL I GET HEADERS.",
      ] },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "Maharko. You don't need headers.",
        "You need to stop putting your paycheck in crypto.",
        "Also you owe me $40 for dinner.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The headers never arrived.',
        "Jordan siphoned 15% of Maharko's Aura across the evening.",
        "Maharko believes every decision he made tonight was his own.",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 6 — Operation Ding Dong Ditch Ben
// ═══════════════════════════════════════════════════════════════════════════════

const chapter6: ChapterConfig = {
  id: 'ding_dong_ditch_ben',
  index: 6,
  title: 'Operation Ding Dong Ditch Ben',
  subtitle: 'Act IV — The Pariah Zone',
  location: '12 Watchwater Way',
  description:
    "Midnight. The party has intel. The getaway car is running. Maharko must deliver the finishing blow.",
  kind: 'chapter',
  map: {
    width: 880,
    height: 660,
    backdrop: 0x060a0f,
    theme: 'suburb_night',
    areaTitle: '12 Watchwater Way',
    rects: [
      // street
      { x: 440, y: 600, w: 880, h: 120, fill: 0x1c1c1c },
      { x: 440, y: 600, w: 880, h: 4, fill: 0xfbbf24 },
      // sidewalk
      { x: 440, y: 530, w: 880, h: 30, fill: 0x374151 },
      // Ben's house (12 Watchwater Way)
      { x: 440, y: 300, w: 280, h: 280, fill: 0x1a2e1a, stroke: 0x84cc16, solid: true, propKey: 'prop_watchwater' },
      { x: 440, y: 170, w: 280, h: 50, fill: 0x166534 },
      // front door
      { x: 440, y: 435, w: 50, h: 60, fill: 0x78350f, stroke: 0xef4444, propType: 'door' },
      // windows (glowing faintly)
      { x: 340, y: 280, w: 50, h: 50, fill: 0xfef3c7, stroke: 0xfcd34d },
      { x: 540, y: 280, w: 50, h: 50, fill: 0xfef3c7, stroke: 0xfcd34d },
      { x: 340, y: 360, w: 50, h: 50, fill: 0x0f1a0f },
      { x: 540, y: 360, w: 50, h: 50, fill: 0x0f1a0f },
      // house mailbox
      { x: 330, y: 470, w: 20, h: 30, fill: 0x374151, stroke: 0x84cc16, propType: 'car' },
      // getaway car (Tucson, parked on street)
      { x: 680, y: 595, w: 120, h: 56, fill: 0x1e293b, stroke: 0x4ade80, propType: 'car', propKey: 'prop_maharko_camero' },
      // C55 AMG (Nick F's)
      { x: 200, y: 595, w: 120, h: 56, fill: 0x111827, stroke: 0xf59e0b, propType: 'car', propKey: 'prop_nick_f_corolla' },
      // neighboring yard trees
      { x: 150, y: 280, w: 80, h: 80, fill: 0x0f2a0f, propType: 'tree' },
      { x: 730, y: 300, w: 80, h: 80, fill: 0x0f2a0f, propType: 'tree' },
      // street lamp (dim circle above)
      { x: 150, y: 490, w: 12, h: 80, fill: 0x374151 },
      { x: 730, y: 490, w: 12, h: 80, fill: 0x374151 },
    ],
    labels: [
      { x: 440, y: 100, name: '12 WATCHWATER WAY', detail: 'The Pariah Zone — Enter at own risk', color: '#ef4444' },
      { x: 680, y: 560, name: 'EXTRACT POINT', detail: 'Sprint here after the shout', color: '#4ade80' },
    ],
    playerSpawn: { x: 440, y: 570 } },
  actors: [
    { id: 'maharko', x: 340, y: 500, understudyId: 'jacob' },
    { id: 'jordan', x: 540, y: 500, understudyId: 'nick_h' },
    { id: 'nick_f', x: 680, y: 570, understudyId: 'nick_h' },
    { id: 'eric', x: 200, y: 570, understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "12 Watchwater Way. The Pariah Zone.",
        "Ben Bersofsky: blacklisted. UMBC Pariah Event. Omega clearance required to discuss.",
        "The party has pulled up at 12:01 AM. Maharko is the designated finisher.",
      ] },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "His light is ON. He's awake.",
        "I can see him through the window. He's on his phone.",
        "Bro is he racing a go-kart? Wait—",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "Okay. One shot. Maharko, you're up.",
        "Go to the door. Say the words. Sprint back.",
        "Jordan — get the video.",
      ] },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "I got it. Recording.",
        "...Wait my phone is buffering.",
        "Okay. I'm good. Go.",
      ] },
    { type: 'walkTo', x: 440, y: 440, radius: 50, markerLabel: 'Approach the front door' },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "WE KNOW WHAT YOU DID.",
        "BEN BERSOFSKY. WE KNOW WHAT YOU DID AT UMBC.",
        "THE SYNDICATE SENDS ITS REGARDS.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The door opens.',
        'It is not Ben.',
      ] },
    { type: 'chase', pursuerId: 'boss_ben', durationMs: 7000 },
    {
      type: 'bossFight',
      bossId: 'boss_ben',
      arena: { x: 440, y: 400, w: 860, h: 560 },
      introLines: [
        'MICHAEL BERSOFSKY — The Pariah Father',
        '"HEY!" — AoE Fear Spell incoming. Run.',
      ] },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "OKAY I GOT THE VID— wait.",
        "I... I fat-fingered it.",
        "I sent the video to Ben.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "JORDAN. JORDAN WHAT DID YOU DO.",
        "GET IN THE CAR. GET IN THE CAR RIGHT NOW.",
        "GO GO GO —",
      ] },
    { type: 'ledger', delta: 0, note: 'Heat Level: MAXIMUM (Ben has the footage)' },
    { type: 'walkTo', x: 680, y: 595, radius: 60, markerLabel: 'Sprint to getaway car' },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben received the video.',
        'Ben cast: Police Threat.',
        "The party laid low for a week. Jordan never lived it down.",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 7 — The Cabin Betrayal / Spain Flight
// ═══════════════════════════════════════════════════════════════════════════════

const chapter7: ChapterConfig = {
  id: 'spain_betrayal',
  index: 7,
  title: 'The Spain Betrayal',
  subtitle: 'Act V — The Agent Buyback',
  location: 'Commons 1522 (Group Chat)',
  description:
    "Nick F collected $273.28 from everyone. The Cabin was booked. Then: a Zelle notification, a one-way ticket, and a message that changed everything.",
  kind: 'chapter',
  map: {
    width: 900,
    height: 640,
    backdrop: C.floorWood,
    theme: 'apartment',
    areaTitle: 'Commons Apartment 1522',
    rects: [
      // apartment walls (same as ch1)
      { x: 450, y: 16, w: 884, h: 16, fill: C.wall, solid: true },
      { x: 450, y: 624, w: 884, h: 16, fill: C.wall, solid: true },
      { x: 16, y: 320, w: 16, h: 628, fill: C.wall, solid: true },
      { x: 884, y: 320, w: 16, h: 628, fill: C.wall, solid: true },
      // rug
      { x: 450, y: 380, w: 360, h: 220, fill: C.rug, propType: 'rug', propKey: 'furn_rug_large' },
      // couch
      { x: 450, y: 300, w: 200, h: 40, fill: C.couch, stroke: 0xef4444, propType: 'couch', solid: true, propKey: 'furn_couch_long' },
      // Nick F's "Cabin Budget" spreadsheet (desk)
      { x: 160, y: 160, w: 180, h: 60, fill: C.desk, stroke: 0x64748b, propType: 'desk', solid: true, propKey: 'furn_desk' },
      // TV showing Spain flight
      { x: 450, y: 240, w: 140, h: 26, fill: C.tv, stroke: 0xef4444, propType: 'tv' },
      // Google Doc printout table
      { x: 710, y: 200, w: 200, h: 120, fill: 0x1e3a5f, stroke: 0x3b82f6, propType: 'desk', solid: true, propKey: 'furn_desk' },
      // Zelle notification (glowing)
      { x: 160, y: 320, w: 180, h: 60, fill: 0x0f2a1e, stroke: 0x22c55e },
      // front door
      { x: 450, y: 614, w: 60, h: 18, fill: C.door, stroke: 0x92400e, propType: 'door' },
      // extra decor
      { x: 60, y: 200, w: 40, h: 80, fill: C.rug, propKey: 'furn_bookshelf' },
      { x: 80, y: 400, w: 40, h: 40, fill: C.rug, propKey: 'furn_plant_tall' },
      { x: 840, y: 400, w: 40, h: 40, fill: C.rug, propKey: 'furn_plant_tall' },
      { x: 710, y: 160, w: 40, h: 40, fill: C.rug, propKey: 'furn_chair' },
      { x: 710, y: 240, w: 40, h: 40, fill: C.rug, propKey: 'furn_chair' },
      { x: 160, y: 200, w: 40, h: 40, fill: C.rug, propKey: 'furn_chair' },
    ],
    labels: [
      { x: 160, y: 110, name: 'THE EVIDENCE WALL', detail: 'All receipts. All Zelles.', color: '#22c55e' },
      { x: 710, y: 140, name: "NICK F'S GOOGLE DOC", detail: 'Option H: Basye, VA — chosen', color: '#3b82f6' },
      { x: 450, y: 550, name: 'THE GREAT BETRAYAL', detail: 'Apartment 1522', color: '#ef4444' },
    ],
    playerSpawn: { x: 450, y: 500 } },
  actors: [
    { id: 'nick_f', x: 300, y: 400, understudyId: 'nick_h' },
    { id: 'maharko', x: 550, y: 420, understudyId: 'jacob' },
    { id: 'jordan', x: 650, y: 380, understudyId: 'nick_h' },
    { id: 'eric', x: 160, y: 240, understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The cabin was real. Nick F built a 9-option Google Doc.",
        "Option H: Basye, VA. Four bedrooms, hot tub, firepit, arcade. $273.28 per person.",
        "He collected the money. All eight shares. Via Zelle.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "So... I have a situation.",
        "Emily is in Spain. I should go visit. It's actually an International Business trip.",
        "The cabin... is going to have to wait.",
      ] },
    { type: 'ledger', delta: 273.28, note: "Nick F's Cabin Fund — now stranded in Spain" },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'You collected $273.28 from eight people.',
        '$2,186.24 total. You have a flight to Ibiza booked.',
        'The refund will arrive when, exactly?',
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "I'll process it when I land. It's just a quick trip.",
        "Besides, I already found a new date for the cabin. August.",
        "Trust the process.",
      ] },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'Eric initiates the Agent Buyback. Choose your counter-attack.',
      options: [
        {
          text: 'Present forensic Zelle receipts. Demand refund in 24 hours.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            "I'll get to it. I'm in the boarding lounge.",
            "The money is not lost. It's invested in morale.",
          ] },
        {
          text: 'Threaten a Japan trip with the Boca Syndicate.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            "You're going to Japan? Really.",
            "...Okay I'll process the refunds.",
          ] },
        {
          text: 'Cast Infinite Deferral. Accept August. Move on.',
          ledgerDelta: -273.28,
          reactionSpeaker: 'maharko',
          reactionLines: [
            "We are NOT accepting August.",
            "We paid. We want the cabin. RIGHT NOW.",
          ] },
      ] },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        'Nick. The math is irrefutable. Eight payments. Eight refunds owed.',
        'The Japan threat is a bluff and you know it.',
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "You know what? Fine. FINE.",
        "You want the cabin? We're doing the cabin. NEW DATE. LOCKED IN.",
        "Now somebody needs to stop me before I spend this on phonk speakers.",
      ] },
    {
      type: 'bossFight',
      bossId: 'boss_nick_f',
      arena: { x: 450, y: 350, w: 860, h: 560 },
      introLines: [
        'NICK FARRAR — The Kinetic Warlord',
        'Defeat him before he books a second flight.',
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "Okay. Refunds processing. 3-5 business decades.",
        "The cabin is August. Basye, VA. Hot tub. Arcade. Firepit.",
        "This was always the plan. I never left.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The Infinite Deferral spell was cast anyway.",
        "The $273.28 remained in Nick F's inventory until May 15, 2026.",
        "On that day: 'WE IN THERE. THE CABIN IS SAVED.'",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 8 — The Cabin Trip (Basye, Virginia) — EPILOGUE
// ═══════════════════════════════════════════════════════════════════════════════

const chapter8: ChapterConfig = {
  id: 'cabin_basye',
  index: 8,
  title: 'The Cabin',
  subtitle: 'Epilogue — ARE YOU 291 LIQUID?',
  location: 'Basye, Virginia',
  description:
    "The cabin survived Spain. Four bedrooms. Hot tub. Arcade. Firepit. $273.28 per person. The Bed Draft awaits. The Syndicate is whole.",
  kind: 'epilogue',
  map: {
    width: 960,
    height: 700,
    backdrop: 0x2d1a0a,
    theme: 'cabin',
    areaTitle: 'Basye, Virginia',
    rects: [
      // cabin exterior walls
      { x: 480, y: 16, w: 944, h: 16, fill: 0x5c3d1e, solid: true },
      { x: 480, y: 684, w: 944, h: 16, fill: 0x5c3d1e, solid: true },
      { x: 16, y: 350, w: 16, h: 700, fill: 0x5c3d1e, solid: true },
      { x: 944, y: 350, w: 16, h: 700, fill: 0x5c3d1e, solid: true },
      // main cabin floor (wood)
      { x: 480, y: 350, w: 920, h: 660, fill: 0x3a2210 },
      // BEDROOM A (top-left — best bed)
      { x: 170, y: 160, w: 260, h: 200, fill: 0x4a2e14, stroke: 0xd97706 },
      { x: 170, y: 160, w: 160, h: 80, fill: 0xffffff, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'furn_bed_double' },
      { x: 70, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      { x: 270, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // BEDROOM B (top-right — second best)
      { x: 790, y: 160, w: 260, h: 200, fill: 0x4a2e14, stroke: 0xb45309 },
      { x: 790, y: 160, w: 160, h: 80, fill: 0xfafafa, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'furn_bed_double' },
      { x: 690, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      { x: 890, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // BEDROOM C (mid-right)
      { x: 790, y: 400, w: 260, h: 160, fill: 0x3d2210, stroke: 0x78350f },
      { x: 790, y: 400, w: 140, h: 70, fill: 0xe2e8f0, stroke: 0x9ca3af, propType: 'bed', propKey: 'furn_bed_single' },
      { x: 700, y: 400, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // BEDROOM D — the bad bed (share)
      { x: 170, y: 400, w: 260, h: 160, fill: 0x2d1a08, stroke: 0x78350f },
      { x: 170, y: 400, w: 220, h: 60, fill: 0xd1d5db, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'furn_bed_double' },
      { x: 40, y: 400, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // Living room / common area
      { x: 480, y: 350, w: 300, h: 180, fill: 0x3d2210, propType: 'rug', propKey: 'furn_rug_large' },
      { x: 480, y: 300, w: 160, h: 44, fill: 0x111827, stroke: 0x8d6e63, propType: 'tv' },
      { x: 480, y: 300, w: 160, h: 44, fill: 0x111827, stroke: 0x8d6e63, propKey: 'furn_cabinet_tall' },
      { x: 480, y: 360, w: 120, h: 36, fill: C.couch, stroke: 0xb45309, propType: 'couch', solid: true, propKey: 'furn_couch' },
      // Extra decor living room
      { x: 480, y: 420, w: 40, h: 40, fill: C.couch, propKey: 'furn_plant_tall' },
      { x: 380, y: 360, w: 40, h: 40, fill: C.couch, propKey: 'furn_plant_tall' },
      { x: 580, y: 360, w: 40, h: 40, fill: C.couch, propKey: 'furn_plant_tall' },
      { x: 60, y: 100, w: 40, h: 40, fill: C.couch, propKey: 'furn_wardrobe' },
      { x: 900, y: 100, w: 40, h: 40, fill: C.couch, propKey: 'furn_wardrobe' },
      // hot tub (bottom center)
      { x: 480, y: 580, w: 160, h: 100, fill: 0x0369a1, stroke: 0x38bdf8, propType: 'hottub' },
      { x: 480, y: 580, w: 144, h: 84, fill: 0x0284c7, stroke: 0x7dd3fc },
      // firepit (outside, bottom)
      { x: 480, y: 660, w: 80, h: 80, fill: 0x7c2d12, stroke: 0xef4444, propType: 'firepit' },
      // arcade machine
      { x: 750, y: 560, w: 60, h: 80, fill: 0x1e1b4b, stroke: 0x818cf8, propType: 'arcade' },
      // kitchen / food area
      { x: 210, y: 580, w: 160, h: 80, fill: C.counter, stroke: 0x94a3b8, propType: 'counter', solid: true },
      // front door (entry)
      { x: 480, y: 676, w: 70, h: 18, fill: C.door, stroke: 0x92400e, propType: 'door' },
    ],
    labels: [
      { x: 170, y: 80, name: 'BEDROOM A', detail: 'First one in gets it', color: '#d97706' },
      { x: 790, y: 80, name: 'BEDROOM B', detail: 'Second place', color: '#b45309' },
      { x: 170, y: 350, name: 'BEDROOM D', detail: 'Worst smelling person sleeps here', color: '#6b7280' },
      { x: 480, y: 200, name: 'BASYE, VA — THE CABIN', detail: 'Option H. $273.28 per head.', color: '#c8e89a' },
    ],
    playerSpawn: { x: 480, y: 620 } },
  actors: [
    { id: 'nick_f', x: 340, y: 380 },
    { id: 'nick_h', x: 560, y: 380 },
    { id: 'jacob', x: 480, y: 450 },
    { id: 'jordan', x: 680, y: 420 },
    { id: 'maharko', x: 300, y: 450 },
    { id: 'eric', x: 630, y: 350 },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "May 15, 2026. Nick F drops a message.",
        '"WE IN THERE. THE CABIN IS SAVED." — Nick Farrar, 11:43 PM.',
        "Basye, Virginia. Four bedrooms. Arcade. Hot tub. Firepit. The Syndicate is whole.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "WELCOME TO THE CABIN. Option H. The dream.",
        "Rules: No solo grocery shopping. (Jordan, I'm looking at you.)",
        "And before ANYONE picks a bed —",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "ARE YOU 291 LIQUID?",
      ] },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Nick F's gatekeeping check. Are you 291 liquid? Answer truthfully.",
      options: [
        {
          text: '"I\'m 13x that." — Jacob',
          reactionSpeaker: 'eric',
          reactionLines: [
            'Jacob. 291 liquid means willing to spend, not capacity to spend.',
            'You have $3,900 and have not deployed a dollar of it since 2023.',
          ] },
        {
          text: '"I check my brokerage..." — Eric',
          reactionSpeaker: 'eric',
          reactionLines: [
            "I have $250. Someone front me $40.",
            "I will repay it in 3-5 business decades.",
          ] },
        {
          text: '"Dolby Atmos. Lossless Audio. Let\'s go." — Nick F',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "Nobody asked about Apple Music.",
            "Put on the Ultraphonk and let's do the Bed Draft.",
          ] },
      ] },
    { type: 'ledger', delta: 273.28, note: 'Cabin entry fee — Basye, VA' },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The Bed Draft. Free-for-all. First to reach a bed claims it.",
        "The loser shares a bed with the worst-smelling party member.",
        "On your mark.",
      ] },
    { type: 'walkTo', x: 170, y: 160, radius: 80, markerLabel: '🏆 CLAIM BED A' },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "BED A. KING SIZE. CLAIMED.",
        "Wait, I got here first. This is mine. MINE.",
        "The Bed Draft protocol is clear. First in, first served.",
      ] },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I was HERE first. I had my hand on the post.",
        "Sub-Zero does not share a bed. I have standards.",
        "I WILL pay the Jacob Tax if that's what it takes.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "I love it here. Loooove Basye, VA.",
        "I claimed Bed C. I'm going to sleep at 10 PM and nobody can stop me.",
        "The Sleep Goblin has found his lair.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "It is 3:00 AM. The Ultraphonk playlist is active.",
        '"Y\'all already weren\'t gonna be allowed to sleep. Now NO one is sleeping. ALL 4 days."',
        "Eric and Alex have locked in Hyperphonk.",
      ] },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        "Nobody is sleeping. That's the new rule.",
        "The Hyperphonk doesn't stop until we figure out who took the last of the blueberry pancakes.",
        "Nick F. It was Nick F. He bought $300 in S'mores and nothing else.",
      ] },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "The S'mores were a COMMUNAL investment.",
        "And for the record, the salmon was for everyone.",
        "The Grocery Raid Ban is discriminatory and I'm appealing it.",
      ] },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "I haven't eaten since we got here.",
        "Jordan ate my food. I know he did. I just can't prove it.",
        "Also the hot tub hits different at 3AM.",
      ] },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "The final night. The group is whole. The cabin is real. How does it end?",
      options: [
        {
          text: 'Hot tub. Firepit. Phonk until dawn. This is what it was always about.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            "The Syndicate gathered at the firepit at 4:17 AM.",
            "Nobody talked about girls. Nobody talked about money.",
            "They just existed. The Physics of Friendship — in equilibrium.",
          ],
          goto: 'ending_good' },
        {
          text: 'Jacob calls his $1,500 bet on Audrey. Audrey does not pick up.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            "She'll text back. The 10-year plan is on track.",
            "Sub-Zero doesn't chase. Sub-Zero WAITS.",
            "...I'm going to text her again.",
          ],
          goto: 'ending_subzero' },
        {
          text: 'Deploy the Decades Schism. Where does the Syndicate go from here?',
          ledgerDelta: 0,
          reactionSpeaker: 'eric',
          reactionLines: [
            "I can't. And I'm not going to decades. ts is buns.",
            "...I'm leaving the chat.",
          ],
          goto: 'ending_decades' },
      ] },
    {
      id: 'ending_good',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Rockville. UMD. Shepherd. Boca. Spain. The highway at 2AM.",
        "The Spotify overcharge. The red pee. The $100 at Baltimore. The video Jordan sent to Ben.",
        "All of it. All of them. Here. At the firepit. 4:17 AM. Basye, Virginia.",
      ] },
    {
      id: 'ending_subzero',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Jacob texted Audrey at 4:19 AM from the cabin hot tub.",
        "She responded three months later with 'lol'.",
        "The $1,500 contract remains active. 8 years, 3 months remain.",
      ] },
    {
      id: 'ending_decades',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Eric left the chat at 4:22 AM.",
        "He rejoined at 4:23 AM and said 'goodnight.'",
        "The Syndicate endures.",
      ] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The true villain was never Ben.",
        "It was never Ticketmaster, or Eric's Spotify margin, or Audrey's boyfriend.",
        "The villain was Inertia. And tonight, Inertia lost.",
      ] },
    { type: 'endChapter' },
  ] };

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 9 — The Suds & Soles Pool Party
// ═══════════════════════════════════════════════════════════════════════════════

const chapter9: ChapterConfig = {
  id: 'suds_and_soles_pool_party',
  index: 9,
  title: 'The Suds & Soles Pool Party',
  subtitle: 'Act VII — Heat Waves & Social Miscalculations',
  location: "Nick F's Backyard — Rockville, MD",
  description:
    "Nick F throws a pool party. Jacob is trapped by a 5K marathon. Anastasia breaks Eric's motion monopoly. The hot tub sees a 10% revelation. The pool sees an Urban Cap Incident.",
  kind: 'chapter',

  map: {
    width: 1080,
    height: 760,
    backdrop: 0x0a1a0a,
    theme: 'pool_party' as any,
    areaTitle: "Nick F's Backyard — June 13, 2026",

    rects: [
      // ── Background: pool map overhead render (night version) ─────────────────
      { x: 540, y: 380, w: 1080, h: 760, fill: 0x0a1a0a, propKey: 'prop_pool_map_night' },

      // ── Boundary walls (invisible — pool_map fence/tree edge handles the look) ──
      { x: 540, y: 50,  w: 1080, h: 100, fill: 0x1a3a1a, solid: true, invisible: true },
      { x: 540, y: 748, w: 1080, h: 24,  fill: 0x1a3a1a, solid: true, invisible: true },
      { x: 12,  y: 380, w: 24,  h: 760, fill: 0x1a3a1a, solid: true, invisible: true },
      { x: 1068, y: 380, w: 24, h: 760, fill: 0x1a3a1a, solid: true, invisible: true },

      // ── Pool water collision (oval approximated — center-left of yard) ─────────
      { x: 352, y: 390, w: 420, h: 185, fill: 0x0891b2, solid: true, invisible: true },
      { x: 352, y: 308, w: 290, h: 98,  fill: 0x0891b2, solid: true, invisible: true },
      { x: 352, y: 468, w: 290, h: 92,  fill: 0x0891b2, solid: true, invisible: true },

      // ── Hot tub collision (connected right side of pool) ─────────────────────
      { x: 622, y: 470, w: 120, h: 105, fill: 0x0284c7, solid: true, invisible: true },

      // ── Character portrait rects ──────────────────────────────────────────────
      // Eric — hot tub (with everyone, motion arbitrage observer)
      { x: 570, y: 470, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_eric_pool' },
      // Nick F — BBQ grill (left side of yard, feeding everyone)
      { x: 118, y: 462, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_nick_f_pool' },
      // Nick H — hot tub area (right of pool)
      { x: 598, y: 440, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_nick_h_pool' },
      // Anastasia — hot tub (with Nick H)
      { x: 650, y: 418, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_anastasia_pool' },
      // Sophia — hot tub (with Anastasia)
      { x: 622, y: 498, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_sophia_pool' },
      // Jacob — lower deck near entrance gate (arrived late, street clothes + cap)
      { x: 464, y: 654, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'hero_jacob_sheet' },
      // Sam Ferretti — patio spectator (starts at gate or chairs)
      { x: 760, y: 680, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_chair' },
      { x: 760, y: 680, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_sam_pool' },
    ],

    labels: [
      { x: 540, y: 728, name: "NICK F'S BACKYARD", detail: 'June 13, 2026 — The Suds & Soles Pool Party', color: '#c8e89a' },
    ],

    playerSpawn: { x: 480, y: 645 },
  },

  actors: [],

  beats: [
    // ── OPENING NARRATION ──────────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'June 13, 2026. Rockville, MD. Nick F\'s backyard.',
        'The decision was simple: a pool party. The execution? Exactly as chaotic as expected.',
        'The pool is sitting at 87 degrees. The supply chain is a mess. The group chat is already spiraling.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Eric, who spent the afternoon testing Gemini Pro 3.1 AI agents, has the infrastructure to bring half of Rockville.',
        'He has chosen not to deploy it. This is called "Motion Arbitrage."',
        'Explore the backyard. When you\'re ready to start the party, head to Nick F\'s grill.',
      ]
    },

    // ── PLAYER EXPLORES, THEN WALKS TO GRILL ──────────────────────────────────
    { type: 'walkTo', x: 118, y: 462, radius: 95, markerLabel: '🍖 Find Nick F at the Grill' },

    // ── ACT I: THE LOGISTICS CRISIS ────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Okay. Okay. I need a headcount. Who confirmed? Who said "omw" in the last three hours?',
        'The pool is 87 degrees. I need ice. I need Red Bulls. I need chips. WHERE ARE THE CHIPS.',
        'I\'m firing questions into the GC every 10 minutes and getting single emoji responses back.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'I have hotdogs. The Franks are secured. That\'s all I have confirmed.',
        'If nobody brings ice, we\'re swimming in a warm bathtub all night.',
        'Eric. You\'re the closest. What are you actually contributing here?',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'The supply check. What do you bring to the party?',
      options: [
        {
          text: 'Deploy the nuclear option: 20 lbs of ice. Right now.',
          ledgerDelta: 15,
          reactionSpeaker: 'eric',
          reactionLines: [
            '20 lbs. Executed. Done. [ICE DROP] has been deployed.',
            'I have made my contribution. The pool is now an asset class.',
            'Do not ask me to bring chips. That is a separate deployment entirely.',
          ]
        },
        {
          text: 'Assign Jacob one specific job: 4 Peach Red Bulls.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'Perfect. One task. Four Peach Red Bulls. I\'m texting him right now.',
            '"Jacob. 4 Peach Red Bulls. That\'s it. That\'s the whole job."',
            '...He reacted with a thumbs up. That\'s either great or very, very bad.',
          ]
        },
        {
          text: 'Hoard your motion. You will observe and analyze.',
          reactionSpeaker: 'eric',
          reactionLines: [
            'I operate on Motion Arbitrage. My network is a finite resource.',
            'I will not deploy into an unproven 87-degree pool environment.',
            'I will sit here. I will watch. And when the time is right — I will act.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The ice drop lands. Eric\'s 20 lbs begins cooling the pool from 87 toward something survivable.',
        'Nick F lays the Franks on the grill. The party has a food supply and a cooling system.',
        'Everything else is unraveling in real time in the group chat.',
      ]
    },

    // ── ACT II: THE SUDS & SOLES BLOCKADE ─────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Meanwhile, on the other side of Rockville: Jacob\'s entire street has been annexed.',
        'The annual "Suds & Soles" 5K marathon has deployed police tape, orange cones,',
        'and approximately 10,000 runners directly through his block. He cannot leave.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'YO. I\'m literally blocked in. Police tape everywhere. Can\'t get my car out.',
        'There is a literal 5K marathon happening outside my window right now. This is insane.',
        'I think I\'m just gonna eat dinner with my grandma and watch the Knicks game. I\'ll sit this one out.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob. It\'s a 5K. It ends. They will clear the street.',
        'You live 12 minutes away. The math works.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Nah I\'m probably good man. Nick, I heard there might be "bathroom rules" at this party.',
        'I don\'t do bathroom rules. I have a decorum policy.',
        'Plus the Knicks game is on. I\'m like 50/50. Who\'s even there?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'The boys and girls.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Three words.',
        '"The boys AND girls."',
        'Jacob has acquired new information. His entire threat model is being recalculated.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Girls? Girls are there?',
        '...Are they single.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'Jacob needs confirmation. The next move matters.',
      options: [
        {
          text: '"Yeah, they\'re single." — Confirm the intel.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'Say less. I\'m on my way.',
            'THE STREETS WILL OPEN. The 5K cannot contain me.',
            'Give me 30 minutes. Actually — 10. I\'m leaving right now.',
          ]
        },
        {
          text: '"Not sure, just come through." — Soft confirm.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            '"Not sure" means yes. I am reading between the lines.',
            'I\'m coming. I don\'t need more information than this.',
            'Send me the address. I\'m getting in my car.',
          ]
        },
        {
          text: 'Leave him on read. Let the information marinate.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            'The read receipt does the work.',
            'Jacob has seen it. The data has been processed.',
            'Five minutes later — "omw."',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob Lebby\'s [Suds & Soles Paralysis] is instantly cured.',
        'The marathon blockade, which couldn\'t be defeated by any physical force, opens in exactly 10 minutes.',
        'The streets did not change. Jacob simply decided they were navigable. They became navigable.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'He also had one assigned task: 4 Peach Red Bulls. Confirmed with a thumbs-up emoji.',
        'We will return to this.',
      ]
    },

    // ── ACT III: THE ARRIVALS ──────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The core crew is already at the house. The vibes are forming.',
        'And then — Anastasia arrives.',
        'Nick H\'s girlfriend. In possession of an ability Eric has never encountered before.',
      ]
    },
    { type: 'cameraPan', x: 650, y: 428, durationMs: 1200, holdMs: 2700 },
    {
      type: 'dialogue',
      speaker: 'anastasia',
      lines: [
        'Hey! We made it! I brought Sophia — hope that\'s okay.',
        'Oh my god the pool is so clean. Is it warm?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Anastasia has activated [VIP Access].',
        'She has bypassed Eric\'s Motion Arbitrage and introduced a new faction into the party.',
        'The gender ratio of the entire event has been permanently altered.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Anastasia has deployed into my social network without a motion expenditure.',
        'She invited Sophia directly. Zero gatekeeping check. Zero approval from the motion hierarchy.',
        'I acknowledge this. She has leveled past me. Respect.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'sophia',
      lines: [
        'Omg the pool is so nice!! Is that a projector?! For the hot tub?!',
        'We are absolutely watching something good in that hot tub later. This is non-negotiable.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Then: Sam Ferretti appears at the gate.',
        'He doesn\'t look great.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'sam_ferretti',
      lines: [
        'Hey guys. I\'m here!',
        'YOOO Whats up!!!',
        ':D',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Sam you don\'t have to get in anything. Grab a chair. The Franks are almost done.',
        'Actually — FRANKS ARE DONE. Get a plate. Everyone was about to starve.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Franks land. The ice drop had already cooled the pool to 67 degrees.',
        'Starvation: neutralized. Pool biome: optimal.',
        'The party is now officially operational.',
      ]
    },

    // ── ACT IV: THE JACOB ARRIVAL ──────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        '9:00 PM. A car appears at the gate.',
        'Jacob has arrived.',
        'Nick F opens his mental inventory. Jacob had ONE task. One item.',
      ]
    },
    { type: 'cameraPan', x: 464, y: 654, durationMs: 1400, holdMs: 2200 },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'YOOO! I made it! The streets just... opened up. Like 10 minutes after I decided I was coming.',
        'Nick I told you the 5K couldn\'t stop me. Sub-Zero is HERE.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob.',
        'You had one job.',
        '...Where are the Peach Red Bulls.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Oh. Yeah. I... didn\'t get those.',
        'I got my own beers though. I brought a 6-pack for myself. That\'s fine right?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Nick F\'s [Silent Disappointment] passive activates.',
        'He does not yell. He does not flip the grill. He simply drops his shoulders approximately 3 inches.',
        'The rage is absorbed internally. The party has momentum. It continues.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'The Red Bull Deficit is official. What is the right response?',
      options: [
        {
          text: '"Jacob I literally texted you. Four. Peach. Red Bulls."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'I know. I KNOW. I had to navigate an active 5K marathon. Give me some grace.',
            'I brought myself. That\'s the contribution. I AM the Red Bull energy.',
          ]
        },
        {
          text: 'Let it go. Absorb the disappointment. The party has momentum.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'It\'s fine. The Franks saved us anyway. We didn\'t need Red Bulls.',
            'We have ice. We have Franks. We have each other.',
            '...We really needed those Red Bulls though.',
          ]
        },
        {
          text: 'Inspect Jacob\'s full loadout. Hold him accountable.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'Alright fine: no Red Bulls. Also no swim trunks. I\'m in street clothes.',
            'I have a 6-pack that\'s only for me, a baseball cap, and a lot of energy.',
            'Sub-Zero improvises. That is the brand. That\'s always been the brand.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob\'s full inventory: [Self-Sustaining Beer x6], [Street Clothes], [Baseball Cap].',
        'Not present: [Swim Trunks], [Peach Red Bulls x4].',
        'Nick F\'s [Silent Disappointment] passive reaches maximum charge.',
      ]
    },

    // ── ACT V: THE HOT TUB ARENA ───────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'As the night deepens, the group migrates from the pool deck to the hot tub.',
        'The projector fires up. On screen: the New York Knicks.',
        'The vibes are immaculate.',
      ]
    },
    { type: 'walkTo', x: 600, y: 445, radius: 100, markerLabel: '🌊 Join the crew at the Hot Tub' },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'This is it. This is the setup right here.',
        'Hot tub. Knicks game on the projector. Heat Waves by Glass Animals on between timeouts.',
        'This is what summer is supposed to be. I am never leaving this hot tub.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'anastasia',
      lines: [
        'This is honestly so good. The projector out here is so smart.',
        'Nick you need to do this every single weekend.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Every weekend. I\'m locking in. This is now my entire personality and I am fine with that.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Knicks are down by 10 in the third quarter.',
        'I\'m putting $3 on them. I\'m a lifelong Knicks fan. Always have been. They\'re coming back.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Jacob's $3 Knicks bet. They're down by 10 in the third.",
      options: [
        {
          text: '"I\'ll take that bet. $3 says they don\'t come back."',
          ledgerDelta: -3,
          reactionSpeaker: 'jacob',
          reactionLines: [
            'DONE. Easy money for me. Absolutely easy.',
            'The Knicks ALWAYS come back. This is historical fact.',
            'You are going to look very silly when this is over.',
          ]
        },
        {
          text: '"The Knicks haven\'t won a championship since 1973, Jacob."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'Those are IRRELEVANT statistics. I don\'t trade in stats. I trade in VIBES.',
            'The Knicks are ascending. I feel it in my soul.',
          ]
        },
        {
          text: '"$3 with you becomes a whole thing. I\'m out."',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'Smart move. With Jacob, $3 becomes a psychological event.',
            'Good call. Watch it unfold from a safe distance.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Knicks go on a 14-0 run in the fourth quarter.',
        'They win by 7. The projector explodes with celebration.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I TOLD YOU GUYS. I TOLD ALL OF YOU.',
        'I am a KNICKS FAN. Lifelong. From BIRTH. This was never in question.',
        'I\'m going to New York. I\'m buying Knicks gear. I might actually move there.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Jacob. You just said you were a "lifelong Knicks fan" 20 minutes ago while they were LOSING.',
        'You did not know who played point guard.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I knew in my SOUL. Statistics are not the only way to know a team.',
        'WE WON. The details are unimportant. WE WON.',
      ]
    },

    // ── ACT VI: HEATED RIVALRY & THE 10% SCALE ────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Knicks game ends. The projector switches to the next entertainment.',
        'On screen: "Heated Rivalry." A gay hockey romance series.',
        'The hot tub has entered a new era.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Okay. What IS this. What are we watching right now.',
        'Are these guys... is this a... ROMANCE? Between hockey players?',
        'I need everyone to know: I am at 1% on the scale right now. That\'s the baseline.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Wait. Wait wait wait. That scene right there.',
        'Okay I\'m recalculating. I am now at 4%. That specific scene moved the needle.',
        'But I need everyone to understand something: the MATHEMATICAL UPPER BOUND is 10%.',
        'That is the ceiling. It cannot be exceeded. I am stating this for the record.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Jacob's 10% Scale Commentary is in full effect. How do you respond?",
      options: [
        {
          text: '"Jacob. What in the world are you saying right now."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'I\'m saying what everyone is THINKING. I\'m the only honest person here.',
            '4% on the scale. Trending. But bounded.',
            'By end of season 2 I might be at 5, but the upper bound remains 10. Period.',
          ]
        },
        {
          text: '"I genuinely do not want to know your percentage, Jacob."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'You NEED to know. This is important public information.',
            'I\'m being transparent. 4%. And I am still 96% settled in the normal direction.',
            'Sam, back me up on this. SAM. Where is Sam.',
          ]
        },
        {
          text: '"Sam Ferretti needs to hear this from the patio."',
          reactionSpeaker: 'sam_ferretti',
          reactionLines: [
            'I can hear him perfectly from this patio chair. I have excellent hearing.',
            'I am choosing not to engage. This is my [Tactical Sit-Out] ability activating.',
            'You cannot pull me into that hot tub for this conversation. That is final.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'sam_ferretti',
      lines: [
        'From my position on the patio: I have heard every single word of this.',
        'I have no comment. I am nauseous, sitting in a lawn chair, watching Jacob do this in a hot tub,',
        'and I have never been more entertained in my life. This is enough for me.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'anastasia',
      lines: [
        'Jacob, I love that you\'re passionate about this.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The diplomatic non-engagement absorbs Jacob\'s [Un-PC Filibuster] without damage.',
        'He interprets this as a positive reaction. It is not a positive reaction.',
        'The hot tub continues.',
      ]
    },

    // ── ACT VII: THE URBAN CAP INCIDENT ───────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Hours pass. Jacob has spent the entire evening in his street clothes.',
        'He has sat in the hot tub fully clothed. He has eaten multiple Franks.',
        'Now, at last, Jacob looks at the main pool — cooled to 67 degrees by Eric\'s ice drop — and makes a decision.',
      ]
    },
    { type: 'walkTo', x: 180, y: 490, radius: 90, markerLabel: '🏊 Move to the Pool Edge' },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I\'m getting in the pool.',
        'I don\'t have trunks. These street clothes can handle it. I\'ll let them dry.',
        'And the cap stays ON. I\'m keeping the cap on. Trust the process.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob you don\'t have a towel. You don\'t have dry clothes. It\'s 11 PM.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'This is a commitment to the bit. The Urban Aura requires sacrifice.',
        'When Anastasia and Sophia see someone enter the pool fully clothed, in a cap,',
        'with complete confidence — that sends a signal. That\'s the theory.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Jacob is about to jump in with street clothes and his baseball cap. Your read?",
      options: [
        {
          text: '"That is not going to land the way you think, Jacob."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'You lack vision. The Urban Aura is about commitment.',
            'If you go all-in with the cap, it says something. Watch.',
            'Everyone is going to look over. I can feel it.',
          ]
        },
        {
          text: '"Leave it. I genuinely cannot wait to see this."',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            'I am going to watch this from the hot tub without saying a single word.',
            'This is a natural event. We do not interfere with natural events.',
            'History is being made. Right here.',
          ]
        },
        {
          text: '"The cap absolutely makes you look urban, Jacob. Go for it."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'EXACTLY. Someone gets it. That is the thesis.',
            'The Urban Aura is real. The cap is the vehicle.',
            'Three... two... one.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Alright. Cap on. Full commitment.',
        'Here we go.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob Lebby enters the pool.',
        'He is wearing dark street shorts, a t-shirt, socks still on — and his baseball cap.',
        'He is treading water. He is looking directly at hot tub.',
        'He is waiting for acknowledgment.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Anastasia continues her conversation with Sophia.',
        'Sophia laughs at something Anastasia said.',
        'Neither of them turns around.',
        'Jacob bobs in the water. The cap is soaked.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Bro.',
        'They didn\'t even look.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I meant to do that.',
        '...The cap is very heavy now.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob you are soaking wet in street clothes at 11 PM.',
        'Please tell me your phone is not in your pocket right now.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'It\'s waterproof.',
        'Probably.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'The Urban Cap Strategy has yielded zero social returns.',
        'I have observed this from my lounge chair. The data has been catalogued.',
        'This is why I practice Motion Arbitrage: you deploy into a proven environment.',
        'You do not simply jump in.',
      ]
    },

    // ── EPILOGUE ───────────────────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Franks fed everyone. The ice cooled the pool. The Knicks came back and won.',
        'Anastasia bypassed Eric\'s entire motion framework just by showing up.',
        'Sam Ferretti observed it all from a patio chair and did not suffer a single injury.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob arrived 3 hours late with no Red Bulls and only his own beer,',
        'sat in the hot tub in street clothes calculating his own sexuality out loud on a sliding scale,',
        'jumped into the pool with his baseball cap on trying to impress two girls who did not notice,',
        'and declared himself a lifelong Knicks fan at 9:47 PM.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        '1:40 AM. Eric opens the group chat.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        '"that party was so tuff"',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The verdict is logged. The record is sealed.',
        'The Suds & Soles Pool Party: certified tuff.',
        'The Syndicate endures.',
      ]
    },
    { type: 'endChapter' },
  ],
};

// ─── Registry ────────────────────────────────────────────────────────────────────

export const CHAPTERS: ChapterConfig[] = [
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
];

export function getChapter(id: string): ChapterConfig | undefined {
  return CHAPTERS.find(c => c.id === id);
}
