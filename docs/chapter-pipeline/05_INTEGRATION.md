# Chapter Pipeline — Step 5: Integration Checklist

Run this after you have:
- `beats[]` + `MapConfig` + `actors[]` from Step 3 (SCHEMA)
- Asset spec + `BossConfig` from Step 4 (ASSETS)
- All new asset files sourced and placed

Work through the checklist in order. Each item links to the exact file to edit.

---

## 1. CREATE THE CHAPTER FILE

Create `src/data/chapters/chapterN.kebab-name.ts` (e.g. `chapter10.oc-cabin-trip.ts` — dot after the number, kebab-case name, matching the existing files like `chapter8.the-cabin.ts`).

Paste in the full `ChapterConfig` from Step 3. Minimum structure:

```typescript
import { ChapterConfig } from './types';
import { C } from './palette';

const chapterN: ChapterConfig = {
  id: 'your_chapter_id',   // snake_case, matches CHAPTER_MUSIC_KEY below
  index: N,
  title: '',
  subtitle: '',
  location: '',
  description: '',
  kind: 'chapter',
  map: { /* from Step 3 — scene 0 map, or the single map */ },
  actors: [ /* from Step 3 — scene 0 actors, or the single actor list */ ],
  // Multi-location only: include scenes[] and populate map/actors above with scenes[0]'s values.
  // scenes: [ /* from Step 3 */ ],
  beats: [ /* from Step 3 */ ],
};

export default chapterN;
```

---

## 2. REGISTER THE CHAPTER

Edit `src/data/chapters/index.ts`:

```typescript
import chapterN from './chapterN_name';   // add import

export const CHAPTERS: ChapterConfig[] = [
  chapter1,
  // ...
  chapterN,   // add to array in narrative order
];
```

**Ordering matters — array position, not the `index` field, drives the game.**
The menu renders chapters in `CHAPTERS` array order, and linear unlock checks the
*previous array entry* (`progress.ts` → `isChapterUnlocked`). The `index:` field is
only the number printed on the card. So to insert a chapter mid-sequence:
1. Place it at the right spot in the `CHAPTERS` array (not just appended at the end).
2. Renumber the `index:` field of it **and every chapter after it** so the displayed
   numbers stay sequential (e.g. inserting at slot 6 bumps the old 6→7, 7→8, …).

---

## 3. WIRE STAGE MUSIC

Edit `src/game/audio.ts`. Two places:

**Add the import** (use `?url` — Vite handles special characters in filenames):
```typescript
import chNUrl from '../assets/audio/stage_music/your_track_filename.mp3?url';
```

**Add to both maps:**
```typescript
export const CHAPTER_MUSIC_KEY: Record<string, string> = {
  // existing entries...
  your_chapter_id: 'music_chN',   // chapter id → audio key
};

export const STAGE_MUSIC_URL: Record<string, string> = {
  // existing entries...
  music_chN: chNUrl,              // audio key → URL
};
```

If reusing an existing track, just add the `CHAPTER_MUSIC_KEY` entry pointing to the existing key. No new URL import needed.

**Per-scene music (multi-location chapters).** A chapter with `scenes[]` can set
`music` on any scene (`scenes[N].music: 'music_key'`). That overrides the chapter-level
`CHAPTER_MUSIC_KEY` and crossfades in on the `changeScene` beat. The key must exist in
`STAGE_MUSIC_URL` (add the import + entry as above). `scenes[0].music` is the opening track.

---

## 4. ADD BOSS CONFIG (if chapter has a bossFight beat)

**Check for id collisions first.** Grep for the intended `bossId` in `entities.ts` before adding:
```bash
grep "'boss_yourcharacter'" src/data/entities.ts
```
Existing entries (as of 2026-07 — the grep above is what's authoritative): `boss_eric`, `boss_audrey`, `boss_florida`, `boss_ben` (Michael Bersofsky — Ch6), `boss_ben_umbc` (Ch3b), `boss_nick_f`. If the id is taken, use a context suffix (`boss_eric_round2`, `boss_nick_f_cabin`, etc.) and update the `bossFight` beat in the chapter file to match.

Edit `src/data/entities.ts`. Add to the `BOSSES` array:

```typescript
export const BOSSES: BossConfig[] = [
  // existing bosses...
  {
    id: 'boss_yourcharacter',   // must match bossId in the bossFight beat
    name: '',
    title: '',
    maxHp: 300,
    combatBarks: [],            // from Step 4 (ASSETS)
    weaknessQTE: {
      question: '',
      options: ['', '', ''],
      correctAnswer: '',
      damage: 50,
    },
    actions: [],
    phaseBarks: { 2: '', 3: '' },
  },
];
```

---

## 5. LOAD NEW PROP SPRITES (if any)

`furn_*` keys resolve automatically from the LimeZu atlas — no action needed.

For any custom `propKey` values (stage backgrounds, cars, new sprites):

Find where other custom props are loaded in `src/game/ChapterScene.ts` — look for `this.load.image(` or `this.load.spritesheet(` calls in the `preload()` method. Add your new key following the same pattern.

Place the asset file in the appropriate directory:
- Stage backgrounds → `src/assets/images/game_decor/stages/`
- Cars → `src/assets/images/game_decor/special/cars/`
- Other → `src/assets/images/game_decor/`

---

## 6. REGISTER NEW CHARACTERS (if the chapter introduces any)

A speaker id that isn't registered still renders (generic 🗨️ bubble, id as the display name) — no crash, but it looks broken. If the brief added guest characters:

**Speaker entry** — add to `EXTRA_SPEAKERS` in `src/data/chapters/types.ts`:
```typescript
{ id: 'your_id', name: 'Display Name', emoji: '🎯', color: '#hexcolor' },
```
Update the speaker list in `src/data/chapters/CLAUDE.md` in the same change (that file's rule).

**Actor sprite** — if the character stands in the world (an `ActorPlacement`), pick one:
- *Stand-in*: reuse an existing sprite with `nameOverride` — fine for one-scene characters.
- *Real sheet*: place the image in `src/assets/images/`, add the import + `safeLoadImage('<key>_raw_jpg', url)` in `ChapterScene.ts` preload (follow the `npc_alex_sheet` pattern), and register the frame config (`{ key, cols, frontCol }`) in `src/game/scene/SpriteLoader.ts`.

Already wired: `npc_alex_sheet`, `npc_benji_sheet`. `leo` has a speaker entry but no sprite sheet yet — needs one of the two options above the first time he's placed as an actor.

---

## 7. REGISTER A NEW MINIGAME MODE (if Step 2b produced one)

If the chapter has a `{ type: 'minigame', modeId: '...' }` beat whose mode is **new**
(not `bossFight`/`poolParty`/an existing mode), that mode must be registered or the
beat is silently skipped (`[BeatEngine] Unknown minigame modeId`).

The mode implementation lives at `src/game/modes/<modeId>/index.ts` (a developer writes
it — see `docs/ADDING_A_MINIGAME.md`). To register it, edit `src/game/modes/index.ts`:

```typescript
import { yourModeNameMode } from './yourModeName';   // add import
// ...with the other registerMode(...) calls:
registerMode(yourModeNameMode);
```

Notes:
- A foreground mode (`background: false`) freezes the player and blocks story beats until
  it calls `onComplete(...)` exactly once. A `background: true` mode runs alongside beats.
- Modes load no assets of their own — the `ModeContext` facade exposes no loader. Any
  textures/audio a mode needs must be loaded in `ChapterScene.ts` preload (Step 5) and
  the mode reuses those keys.

---

## 8. TYPECHECK

```bash
npm run lint
```

Fix any type errors before testing. Common ones:
- Missing required `ChapterConfig` fields
- `bossId` in a `bossFight` beat that doesn't exist in `BOSSES`
- Invalid speaker id in a `dialogue` beat
- A `minigame` beat whose `modeId` was never registered (Section 7)

---

## 9. RUN AND TEST

```bash
npm run dev
```

Open `localhost:3324`. Play through the chapter. Check:

- [ ] Stage music starts and fades in correctly
- [ ] Player spawns in the right place
- [ ] All `walkTo` markers appear and trigger correctly
- [ ] All `dialogue` beats fire in order, no skips
- [ ] `choice` beat shows all options; reactions play correctly
- [ ] `ledger` ticks display correctly
- [ ] If using `changeScene`: location transition fades cleanly, new map loads, player respawns at new `playerSpawn`; per-scene `music:` crossfades if set
- [ ] Any `sfx` beats actually fire (unloaded keys skip silently — check the key spelling if you hear nothing)
- [ ] New guest speakers show their name/emoji, not the generic 🗨️ bubble (Section 6)
- [ ] Boss fight triggers, boss id resolves, QTE works
- [ ] Chapter ends cleanly (`endChapter` fires)
- [ ] No console errors

Use `window.__OMEGA_GAME__` in the browser console to inspect live scene state if something feels off.

---

## 10. REFINE

Use `DEEPEN.md` for any beats that felt flat during playtesting.
Targeted changes only — don't rewrite the whole chapter, find the one moment that isn't landing.
