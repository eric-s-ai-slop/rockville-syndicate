# Chapter Pipeline — Step 5: Integration Checklist

Run this after you have:
- `beats[]` + `MapConfig` + `actors[]` from Step 3 (SCHEMA)
- Asset spec + `BossConfig` from Step 4 (ASSETS)
- All new asset files sourced and placed

Work through the checklist in order. Each item links to the exact file to edit.

---

## 1. CREATE THE CHAPTER FILE

Create `src/data/chapters/chapterN_name.ts` (e.g. `chapter10_maria-brooke.ts`).

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

---

## 4. ADD BOSS CONFIG (if chapter has a bossFight beat)

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

## 6. TYPECHECK

```bash
npm run lint
```

Fix any type errors before testing. Common ones:
- Missing required `ChapterConfig` fields
- `bossId` in a `bossFight` beat that doesn't exist in `BOSSES`
- Invalid speaker id in a `dialogue` beat

---

## 7. RUN AND TEST

```bash
npm run dev
```

Open `localhost:3000`. Play through the chapter. Check:

- [ ] Stage music starts and fades in correctly
- [ ] Player spawns in the right place
- [ ] All `walkTo` markers appear and trigger correctly
- [ ] All `dialogue` beats fire in order, no skips
- [ ] `choice` beat shows all options; reactions play correctly
- [ ] `ledger` ticks display correctly
- [ ] If using `changeScene`: location transition fades cleanly, new map loads, player respawns at new `playerSpawn`
- [ ] Boss fight triggers, boss id resolves, QTE works
- [ ] Chapter ends cleanly (`endChapter` fires)
- [ ] No console errors

Use `window.__OMEGA_GAME__` in the browser console to inspect live scene state if something feels off.

---

## 8. REFINE

Use `DEEPEN.md` for any beats that felt flat during playtesting.
Targeted changes only — don't rewrite the whole chapter, find the one moment that isn't landing.
