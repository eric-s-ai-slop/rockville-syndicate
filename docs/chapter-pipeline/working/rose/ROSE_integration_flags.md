# Step 3 Output — Integration Flags for Step 5

> **For the integration step (Step 5).** These are the things the schema agent's output requires that can't be done from the chapter file alone. Each flag lists the file to edit and the exact change needed.

---

## FLAG 1 — Register the chapter in `index.ts`

**File:** `src/data/chapters/index.ts`

**Change:** Import `chapter5b` and insert it into the `CHAPTERS` array after `chapter5`, before `chapterUmbc`.

```typescript
import chapter5b from './chapter5b.rose';
// ...
export const CHAPTERS: ChapterConfig[] = [
  chapterMariaBrooke,
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter5b,      // ← insert here
  chapterUmbc,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
];
```

**Note:** This changes the unlock chain. `chapterUmbc` now requires `chapter5b` to be complete (previously required `chapter5`). This is intended — chapter 5b sits between 5 and the rest narratively. If you want to preserve the old unlock chain, insert `chapter5b` after `chapterUmbc` instead.

---

## FLAG 2 — Add Alex to `EXTRA_SPEAKERS` in `types.ts`

**File:** `src/data/chapters/types.ts`

**Change:** Add Alex to the `EXTRA_SPEAKERS` array.

```typescript
const EXTRA_SPEAKERS: Speaker[] = [
  // ... existing entries ...
  { id: 'alex', name: 'Alex', emoji: '🌴', color: '#fbbf24' },
];
```

Alex is a recurring Florida character (Meat Market coworker, former Rockville resident). He'll appear in future Florida chapters. The emoji/color are suggestions — adjust to match his sprite/personality.

---

## FLAG 3 — Add `boss_maharko` to `BOSSES` in `entities.ts`

**File:** `src/data/entities.ts`

**Change:** The chapter uses `modeId: 'carRide'` (a minigame), NOT `bossFight`. So `boss_maharko` is NOT needed in the `BOSSES` array for this chapter. The carRide mode consumes its own config object, not a BossConfig.

**However:** If `boss_maharko` doesn't exist yet in `BOSSES` and a future chapter uses the standard `bossFight` beat with Maharko, it will need to be added. For now, no change needed for this chapter.

**What IS needed:** The Maharko actor sprite (`hero_maharko_sheet` or equivalent) must exist for the in-world placement. The user confirmed the sprite exists. No action.

---

## FLAG 4 — Build and register the `carRide` minigame mode

**Files:**
- `src/game/modes/carRide/carRide.ts` — new file, the GameMode implementation
- `src/game/modes/carRide/index.ts` — new file, exports
- `src/game/modes/index.ts` — register the mode

**Change:** Build the carRide mode per `ROSE_carRide_mode_spec.md`. Register it in the mode registry. Follow `docs/ADDING_A_MINIGAME.md`.

This is the largest integration task. The mode is a four-phase dialogue battle with a countdown timer. Full spec in `ROSE_carRide_mode_spec.md`.

**The chapter will not run without this mode.** The `minigame` beat with `modeId: 'carRide'` will fail if the mode isn't registered.

---

## FLAG 5 — Add `rose_silence` persistent flag to progress system

**File:** `src/game/progress.ts`

**Change:** Extend the `Progress` interface and add a setter.

```typescript
export interface Progress {
  completedChapters: string[];
  hero?: string;
  freePlay?: boolean;
  rose_silence?: boolean;  // ← add this
}

export function setRoseSilence(): void {
  const progress = loadProgress();
  progress.rose_silence = true;
  saveProgress(progress);
}
```

**Hook needed:** When the player chooses Option B (stay silent) in the Rose chapter, call `setRoseSilence()`. This requires either:
- **(a)** A hook in the beat engine that calls `setRoseSilence()` when the choice's Option B is selected. This would need a new beat type or a side-effect field on `ChoiceOption`.
- **(b)** A check in `markChapterComplete('rose_florida')` that inspects... something. But the progress system doesn't track which choice was made.
- **(c)** A custom event emitted by the choice beat that the progress system listens for.

**Recommend (a):** Add an optional `sideEffect?: string` field to `ChoiceOption` in `types.ts`. When the choice is selected, the beat engine fires the side effect. For Option B: `sideEffect: 'rose_silence'`. The beat engine maps known side effects to progress functions.

**This is the most complex integration flag.** It requires changes to `types.ts`, `progress.ts`, and the beat engine (`BeatEngine.ts`). Flag for developer attention.

**Future chapters can check `progress.rose_silence`** to adjust behavior:
- Cabin chapter (Ch8): narrator mentions the player's silence when Maharko is at the firepit.
- Future Florida chapters: player treated as Boca insider.
- Future Rockville chapters: Nick F's relationship subtly different.

---

## FLAG 6 — Audio map entry (optional)

**File:** `src/game/audio.ts`

**Change:** The chapter uses `scenes[].music` for per-scene tracks. The current chapter file does NOT set `music` on any scene — Scenes 1 and 2 have no music (ambient only), Scene 0 reuses... actually, the chapter file doesn't set music on Scene 0 either.

**Decision needed (Step 4 — Assets):**
- Scene 0 (party): reuse `music_ch5` (Jordan/Maharko Florida track) or spec new party music?
- Scene 1 (lawn): no music (ambient crickets/night sounds).
- Scene 2 (car): no music (engine ambience only — the silence is the point).

If reusing `music_ch5` for Scene 0, add to `ChapterSceneConfig`:
```typescript
{
  map: { ... },
  actors: [ ... ],
  music: 'music_ch5',  // ← add this
}
```

If speccing new music, the asset agent (Step 4) handles sourcing. Add the new key to `CHAPTER_MUSIC_KEY` and `STAGE_MUSIC_URL` in `audio.ts`.

**No `CHAPTER_MUSIC_KEY` entry needed for `rose_florida`** if all scenes use per-scene music. The chapter-level key is only needed if scenes don't override.

---

## FLAG 7 — Sprite assets for non-canonical actors

**File:** `src/game/scene/Actors.ts` (or wherever actor sprites are resolved)

**Change:** The chapter places several non-canonical actor ids: `rose`, `alex`, `benji`, `rose_sister`, `party1`, `party2`, `party3`, `nick_f_front`.

- `nick_f_front` — uses `spriteKey: 'hero_nick_f_sheet'` to render as Nick F. No new asset needed.
- `rose`, `alex`, `benji`, `rose_sister` — no `spriteKey` set. The `Actors.ts` system falls back to a tinted blob for unknown ids. If proper sprites are wanted, the asset agent (Step 4) specs them and the chapter file is updated with `spriteKey` fields.
- `party1`, `party2`, `party3` — background partygoers. Tinted blobs are fine. No asset needed.

**Step 4 handles this.** No code change needed unless sprites are sourced.

---

## FLAG 8 — Maharko sprite for carRide mode

**File:** (handled by carRide mode implementation)

The carRide mode spec recommends using the in-world Maharko actor sprite for the fight. The Maharko sprite already exists (user confirmed). The mode finds the sprite in the scene by actor id. No new asset needed.

If the developer chooses to use a dedicated portrait instead, the asset agent (Step 4) specs it.

---

## SUMMARY — Integration Priority

| Flag | Priority | Effort | Blocks chapter? |
|------|----------|--------|-----------------|
| 1. Register chapter in index.ts | HIGH | 2 min | Yes |
| 2. Add Alex to EXTRA_SPEAKERS | HIGH | 2 min | No (falls back to generic) |
| 4. Build carRide minigame mode | HIGH | 2-3 days | **Yes — chapter won't run** |
| 5. rose_silence persistent flag | MEDIUM | 2-4 hours | No (B path works, flag just doesn't persist) |
| 3. boss_maharko in BOSSES | LOW | N/A | No (not needed for this chapter) |
| 6. Audio map entry | LOW | 5 min | No (silent scenes work) |
| 7. Sprite assets | LOW | Step 4 | No (tinted blobs work) |
| 8. Maharko portrait | LOW | Step 4 | No (in-world sprite works) |

**Minimum viable chapter:** Flags 1 + 4. The chapter will run with just those two. Everything else is polish or future-proofing.
