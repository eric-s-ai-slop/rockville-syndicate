# New Chapter Implementation Framework

**Purpose:** Step-by-step recipe for adding a chapter. Follow in order. Do not skip steps. Each step names the exact file, exact location, and exact code to write.

> **DUMB-AGENT RULE:** Never edit a file that isn't listed in this document. Never guess. If a step says "copy the template", copy the template exactly and only change the `ALL_CAPS` placeholders.

---

## Quick Reference: Which Files Get Touched

| Step | File | What You Add |
|------|------|-------------|
| 1 | `src/data.ts` | Boss definition (skip if no boss) |
| 2 | `src/game/audio.ts` | Music import + two map entries |
| 3 | `src/data/chapters.ts` | Chapter definition + one line in CHAPTERS array |
| 4 | `src/game/ChapterScene.ts` | Sprite preload calls (skip if no new sprites) |

That's it. **4 files max.** Nothing else.

---

## Pre-Flight Checklist

Before writing any code, answer these questions:

```
[ ] What is the chapter ID?         → CHAPTER_ID   (e.g. 'my_chapter')
[ ] What is the chapter number?     → CHAPTER_INDEX (e.g. 9)
[ ] Is it a chapter, interlude, or epilogue?  → CHAPTER_KIND
[ ] What theme does the map use?    → MAP_THEME
    Options: 'apartment' | 'highway_night' | 'hospital' | 'park'
             'florida' | 'suburb_night' | 'cabin'
[ ] Does this chapter have a boss?  → YES / NO
[ ] What MP3 file is the music?     → MUSIC_FILENAME (e.g. 'my_song.mp3')
[ ] What is the Phaser audio key?   → MUSIC_KEY (e.g. 'music_ch9')
[ ] Are there new sprites to load?  → YES / NO
```

Fill these in on paper before touching any code.

---

## Step 1 — Boss Definition (SKIP IF NO BOSS)

**File:** `src/data.ts`
**Location:** Inside the `BOSSES` array, after the last existing boss entry (before the closing `];`)

```typescript
  {
    id: 'BOSS_ID',                          // e.g. 'boss_my_character'
    name: 'BOSS_DISPLAY_NAME',             // e.g. 'Alex the Rival'
    title: 'BOSS_TITLE',                   // e.g. 'The Shadow Operator'
    maxHp: BOSS_MAX_HP,                    // e.g. 800  (range: 400–1200)
    combatBarks: [
      'LINE_1',
      'LINE_2',
      'LINE_3',
      // Add 4–10 taunts the boss says during combat
    ],
    weaknessQTE: {
      question: 'QTE_QUESTION_TEXT',
      options: [
        'CORRECT_ANSWER',                  // ← always put correct answer FIRST
        'WRONG_ANSWER_2',
        'WRONG_ANSWER_3',
        'WRONG_ANSWER_4',
      ],
      correctAnswer: 'CORRECT_ANSWER',    // must match exactly one of the options above
      damage: DAMAGE_ON_CORRECT,          // e.g. 300  (range: 200–500)
    },
    actions: [
      'ACTION_1_DESCRIPTION',
      'ACTION_2_DESCRIPTION',
    ],
    phaseBarks: {
      2: 'PHASE_2_BARK',                  // spoken when boss falls below 2/3 hp
      1: 'PHASE_1_BARK',                  // spoken when boss falls below 1/3 hp
    }
  },
```

> ⚠️ DANGER: `correctAnswer` must be an exact string match to one of the `options`. If they differ by even one character, the QTE can never be won.

---

## Step 2 — Music Registration

**File:** `src/game/audio.ts`

### 2a — Import the MP3

Add this import with the other chapter imports at the top of the file. Put it directly after the last existing `import chXUrl` line:

```typescript
import chNEWUrl from '../assets/audio/stage_music/MUSIC_FILENAME?url';
```

Example:
```typescript
import ch9Url from '../assets/audio/stage_music/my_song.mp3?url';
```

> ⚠️ DANGER: The filename is case-sensitive and must match the actual file on disk exactly, including spaces. The `?url` suffix is required — Vite uses it to produce a URL instead of bundling the file.

### 2b — Register in CHAPTER_MUSIC_KEY

Find this object in `src/game/audio.ts`:
```
export const CHAPTER_MUSIC_KEY: Record<string, string> = {
```

Add one line for your chapter:
```typescript
  CHAPTER_ID: 'MUSIC_KEY',
```

Example:
```typescript
  my_chapter: 'music_ch9',
```

### 2c — Register in STAGE_MUSIC_URL

Find this object in `src/game/audio.ts`:
```
export const STAGE_MUSIC_URL: Record<string, string> = {
```

Add one line for your music key:
```typescript
  MUSIC_KEY: chNEWUrl,
```

Example:
```typescript
  music_ch9: ch9Url,
```

> ⚠️ DANGER: The key in `CHAPTER_MUSIC_KEY` must match `CHAPTER_ID` in chapters.ts exactly. The value in `CHAPTER_MUSIC_KEY` must match the key in `STAGE_MUSIC_URL` exactly. If either of these don't match, the chapter loads in silence without crashing (hard to debug).

---

## Step 3 — Chapter Definition

**File:** `src/data/chapters.ts`

### 3a — Add the chapter constant

Find the section comment before the last chapter, for example:
```
// ═══════════════════════════════════════
// CHAPTER 8 — ...
// ═══════════════════════════════════════
```

Add your chapter **below** the last existing chapter, above the `// ─── Registry` comment.

Copy this full template and fill in every `ALL_CAPS` value:

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER CHAPTER_INDEX — CHAPTER_TITLE
// ═══════════════════════════════════════════════════════════════════════════════

const chapterCHAPTER_INDEX: ChapterConfig = {
  id: 'CHAPTER_ID',
  index: CHAPTER_INDEX,
  title: 'CHAPTER_TITLE',
  subtitle: 'CHAPTER_SUBTITLE',
  location: 'LOCATION_TEXT',
  description: 'ONE_SENTENCE_SPOILER_FREE_DESCRIPTION',
  kind: 'CHAPTER_KIND',                // 'chapter' | 'interlude' | 'epilogue'

  // Optional: force a specific hero for this chapter
  // protagonistOverride: 'eric',      // ← uncomment and set if needed

  map: {
    width: MAP_WIDTH,                  // e.g. 960
    height: MAP_HEIGHT,                // e.g. 640
    backdrop: MAP_BACKDROP_COLOR,      // hex e.g. 0x1a2a1a
    theme: 'MAP_THEME',
    areaTitle: 'AREA_TITLE_TEXT',      // shown as fading toast at chapter start

    rects: [
      // ── Floor / ground ──────────────────────────────────────────────────
      // Always start with a floor that covers the whole map
      { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, w: MAP_WIDTH, h: MAP_HEIGHT, fill: FLOOR_COLOR },

      // ── Walls (solid: true blocks movement) ─────────────────────────────
      // Top wall
      { x: MAP_WIDTH / 2, y: 8,               w: MAP_WIDTH, h: 16, fill: 0x2a3d18, solid: true },
      // Bottom wall
      { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 8,  w: MAP_WIDTH, h: 16, fill: 0x2a3d18, solid: true },
      // Left wall
      { x: 8,             y: MAP_HEIGHT / 2,  w: 16, h: MAP_HEIGHT, fill: 0x2a3d18, solid: true },
      // Right wall
      { x: MAP_WIDTH - 8, y: MAP_HEIGHT / 2,  w: 16, h: MAP_HEIGHT, fill: 0x2a3d18, solid: true },

      // ── Props (add your scene furniture/decor below) ─────────────────────
      // { x: 200, y: 300, w: 100, h: 60, fill: 0x334155, propType: 'couch', solid: true },
    ],

    labels: [
      // These show as permanent room signs in-world
      { x: MAP_WIDTH / 2, y: 60, name: 'AREA_NAME', detail: 'AREA_DETAIL', color: '#c8e89a' },
    ],

    playerSpawn: { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 100 },
  },

  actors: [
    // Each actor is an NPC standing in the world
    // { id: 'nick_h', x: 400, y: 300, understudyId: 'eric' },
    // understudyId: if the player's chosen hero matches 'nick_h', place 'eric' there instead
  ],

  beats: [
    // ── Opening narration ────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'OPENING_LINE_1',
        'OPENING_LINE_2',
      ]
    },

    // ── NPC dialogue ─────────────────────────────────────────────────────
    // {
    //   type: 'dialogue',
    //   speaker: 'SPEAKER_ID',   // matches actor id or 'narrator'
    //   lines: ['LINE_1', 'LINE_2'],
    // },

    // ── Player choice ────────────────────────────────────────────────────
    // {
    //   type: 'choice',
    //   speaker: 'narrator',
    //   prompt: 'QUESTION_TEXT',
    //   options: [
    //     {
    //       text: 'CHOICE_A_TEXT',
    //       reactionSpeaker: 'SPEAKER_ID',
    //       reactionLines: ['REACTION_LINE_1'],
    //       ledgerDelta: 0,    // ← add/subtract from the Ledger (optional)
    //     },
    //     {
    //       text: 'CHOICE_B_TEXT',
    //       reactionSpeaker: 'SPEAKER_ID',
    //       reactionLines: ['REACTION_LINE_1'],
    //     },
    //   ],
    // },

    // ── Walk trigger ─────────────────────────────────────────────────────
    // {
    //   type: 'walkTo',
    //   x: 400,
    //   y: 200,
    //   markerLabel: 'OPTIONAL_✦_LABEL',
    // },

    // ── Camera pan ───────────────────────────────────────────────────────
    // {
    //   type: 'cameraPan',
    //   x: 400, y: 200,
    //   durationMs: 1200,
    //   holdMs: 800,
    // },

    // ── Boss fight (only if this chapter has a boss) ──────────────────────
    // {
    //   type: 'bossFight',
    //   bossId: 'BOSS_ID',          // must match id in BOSSES (src/data.ts)
    //   arena: { x: 480, y: 300, w: 900, h: 200 },
    //   introLines: [
    //     'BOSS_INTRO_LINE_1',
    //     'BOSS_INTRO_LINE_2',
    //   ],
    // },

    // ── Ledger adjustment ─────────────────────────────────────────────────
    // { type: 'ledger', delta: 12.50, note: 'Jordan owes Eric gas money' },

    // ── Wait (pause before next beat) ────────────────────────────────────
    // { type: 'wait', ms: 1000 },

    // ── REQUIRED: always end with this ───────────────────────────────────
    { type: 'endChapter' },
  ],
};
```

### 3b — Register in the CHAPTERS array

Find at the bottom of the file:
```typescript
export const CHAPTERS: ChapterConfig[] = [
  chapter1,
  chapter2,
  // ...
  chapter8,
];
```

Add your chapter variable name at the end of the array:
```typescript
export const CHAPTERS: ChapterConfig[] = [
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapterCHAPTER_INDEX,  // ← add this line
];
```

> ⚠️ DANGER: Every chapter MUST end with `{ type: 'endChapter' }`. Forgetting it will hang the chapter with no way to proceed.

> ⚠️ DANGER: The variable name in `CHAPTERS` must match exactly what you named the `const` above (e.g. `chapter9`).

---

## Step 4 — Sprite Preloads (SKIP IF NO NEW SPRITES)

**File:** `src/game/ChapterScene.ts`

### 4a — Import the sprite file

Add at the top of the file, with the other asset imports:

```typescript
import myPropUrl from '../assets/images/game_decor/stages/CHAPTER_ID/FILENAME.jpg?url';
```

### 4b — Preload in create()

Find this section in `create()`:
```typescript
    // R1: watchwater house (Ch6)
    this.safeLoadImage('prop_watchwater', propWatchwaterUrl);
```

Add your sprite below the last existing safeLoadImage call:
```typescript
    // R1: YOUR_DESCRIPTION (ChCHAPTER_INDEX)
    this.safeLoadImage('PROP_KEY', myPropUrl);
```

The `PROP_KEY` here is what you'll use in your MapRect's `propKey` field.

### 4c — Background extraction (if the sprite has a solid-color background)

Find the `CAR_PROP_KEYS` block in `create()`:
```typescript
    const CAR_PROP_KEYS = ['prop_jordan_mustang', 'prop_maharko_camero', 'prop_nick_f_corolla'];
```

If your sprite is a **showcase JPG with a gray/white background**, add your key:
```typescript
    const CAR_PROP_KEYS = ['prop_jordan_mustang', 'prop_maharko_camero', 'prop_nick_f_corolla', 'PROP_KEY'];
```

This auto-removes the background and creates a `PROP_KEY_crop` texture. Your MapRect then uses `propKey: 'PROP_KEY'` and the renderer picks up `PROP_KEY_crop` automatically.

> ⚠️ DANGER: Only add to `CAR_PROP_KEYS` if the image has a **solid color background** (gray, white). Character sprite sheets with transparency do NOT go here.

---

## Prop Type Reference

Use `propType` on any MapRect to get the right procedural fallback if the sprite isn't loaded:

| propType | What it renders | Notes |
|----------|----------------|-------|
| `'couch'` | Red padded cushion | Use `solid: true` |
| `'tv'` | Dark screen rectangle | |
| `'desk'` | Blue-grey desk | Use `solid: true` |
| `'counter'` | Kitchen counter | Use `solid: true` |
| `'bed'` | Dark rectangle | Use `solid: true` |
| `'door'` | Brown door | |
| `'rug'` | Dark rectangle with low opacity | Do NOT use `solid: true` |
| `'car'` | Dark grey box | Use `solid: true` |
| `'tree'` | Dark green rectangle | |
| `'bench'` | Brown rectangle | Use `solid: true` |
| `'hottub'` | Rendered from pack_atlas | propType alone is enough — no propKey |
| `'arcade'` | Rendered from pack_atlas | propType alone is enough — no propKey |
| `'junglebox'` | Rendered from pack_atlas | propType alone is enough — no propKey |

**Furniture sprite keys** (use as `propKey`, no sprite preload needed — already in atlas):
```
furn_couch_long    furn_couch_small   furn_chair        furn_desk
furn_coffee_table  furn_bookshelf     furn_plant_tall   furn_rug_large
furn_cabinet_tall  furn_sink          furn_bathtub      furn_toilet
```

---

## Speaker ID Reference

Use these in `speaker:` fields of beats and `reactionSpeaker:` fields of choice options:

| ID | Name | Notes |
|----|------|-------|
| `'narrator'` | The Group Chat | Use for scene-setting narration |
| `'eric'` | Eric Huang | Playable hero |
| `'nick_f'` | Nick Farrar | Playable hero |
| `'nick_h'` | Nick Hedgecock | Playable hero |
| `'jacob'` | Jacob Lebby | Playable hero |
| `'maharko'` | Maharko | Roaming NPC |
| `'audrey'` | Audrey | Canadian phantom |
| `'ben'` | Ben Bersofsky | 12 Watchwater |
| `'jordan'` | Jordan Divband | Shadow admin |
| `'vs'` | VS | Boss intro speaker |

For any new character not in this list, add them to `EXTRA_SPEAKERS` in `src/data/chapters.ts`:
```typescript
{ id: 'my_character', name: 'My Character', emoji: '👤', color: '#60a5fa' },
```

---

## Map Color Palette

Pre-defined colors available via the `C` constant (already in scope inside `chapters.ts`):

```typescript
C.floorWood   // 0x3a2a1a — dark wood floor
C.floorTile   // 0x1f2933 — dark tile floor
C.rug         // 0x4b2e2e — dark red rug
C.wall        // 0x2a3d18 — dark green wall
C.couch       // 0x991b1b — red couch
C.desk        // 0x334155 — blue-grey desk
C.counter     // 0x475569 — grey counter
C.sink        // 0x0369a1 — blue sink
C.tv          // 0x111827 — near-black TV screen
C.door        // 0x78350f — brown door
C.fridge      // 0xe2e8f0 — off-white fridge
C.grass       // 0x16331a — dark grass
```

---

## Validation Checklist

Run through this after writing all code, before committing:

```
[ ] CHAPTER_ID is lowercase_snake_case and unique (not used by any other chapter)
[ ] CHAPTER_INDEX is unique and one higher than the previous chapter
[ ] The chapter variable name matches what's in the CHAPTERS array
[ ] Every beat has a valid `type` field
[ ] The beats array ends with { type: 'endChapter' }
[ ] All speaker IDs in beats exist in the speaker reference above
[ ] If boss fight: bossId matches exactly the id field in BOSSES (src/data.ts)
[ ] If boss fight: correctAnswer is an exact string copy of one of the options
[ ] Music import uses ?url suffix
[ ] CHAPTER_MUSIC_KEY entry key matches chapter id exactly
[ ] STAGE_MUSIC_URL entry key matches the value in CHAPTER_MUSIC_KEY
[ ] All new sprite imports use ?url suffix
[ ] All new propKey values in MapRects match safeLoadImage key from Step 4
[ ] No TypeScript errors (run: npx tsc --noEmit)
```

---

## Minimal Working Example

The smallest possible chapter (no boss, no new sprites):

### `src/game/audio.ts` additions:
```typescript
// Add import at top:
import ch9Url from '../assets/audio/stage_music/my_track.mp3?url';

// Add to CHAPTER_MUSIC_KEY:
  my_chapter: 'music_ch9',

// Add to STAGE_MUSIC_URL:
  music_ch9: ch9Url,
```

### `src/data/chapters.ts` addition:
```typescript
const chapter9: ChapterConfig = {
  id: 'my_chapter',
  index: 9,
  title: 'The Next Thing',
  subtitle: 'Act VII — Something Happened',
  location: 'Somewhere',
  description: 'Something went down.',
  kind: 'chapter',
  map: {
    width: 960, height: 640,
    backdrop: 0x1a2a1a,
    theme: 'apartment',
    areaTitle: 'The Place',
    rects: [
      { x: 480, y: 320, w: 960, h: 640, fill: C.floorWood },
      { x: 480, y: 8,   w: 960, h: 16,  fill: C.wall, solid: true },
      { x: 480, y: 632, w: 960, h: 16,  fill: C.wall, solid: true },
      { x: 8,   y: 320, w: 16,  h: 640, fill: C.wall, solid: true },
      { x: 952, y: 320, w: 16,  h: 640, fill: C.wall, solid: true },
    ],
    labels: [],
    playerSpawn: { x: 480, y: 500 },
  },
  actors: [
    { id: 'nick_h', x: 480, y: 300 },
  ],
  beats: [
    { type: 'dialogue', speaker: 'narrator', lines: ['It happened again.'] },
    { type: 'dialogue', speaker: 'nick_h',   lines: ['🐔'] },
    { type: 'endChapter' },
  ],
};

// In the CHAPTERS array, add:
// chapterN,
```

---

## If Something Is Broken

| Symptom | Most Likely Cause |
|---------|-------------------|
| Chapter doesn't appear in chapter select | Not added to `CHAPTERS` array |
| Chapter appears but crashes on load | TypeScript error — run `npx tsc --noEmit` |
| Chapter loads but no music | `CHAPTER_MUSIC_KEY` key doesn't match `id` |
| Dialogue box never appears | Missing `{ type: 'endChapter' }` at end? No — check beat ordering |
| Sprites show gray background | Add key to `CAR_PROP_KEYS` in ChapterScene.ts |
| Sprites don't show at all | `propKey` doesn't match `safeLoadImage` key |
| Boss QTE always fails | `correctAnswer` doesn't exactly match the option string |
| Chapter hangs after last dialogue | Missing `{ type: 'endChapter' }` beat |
