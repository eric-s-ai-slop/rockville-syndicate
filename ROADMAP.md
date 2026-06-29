# Roadmap

Forward-looking tech debt and feature work. Items here are **verified against current
source**, not copied from stale handoff docs. For the detailed execution specs see the
`docs/TRACK_*.md` set; this file is the lightweight, prioritized index.

Legend: 🔴 player-visible bug · 🟠 real debt · 🟡 nice-to-have · ⚪ speculative

---

## Tech Debt

### 🔴 Boss sprite loads as static image, not spritesheet
`src/game/ChapterScene.ts` — `boss_audrey` is loaded via `safeLoadImage('boss_audrey', …)`
instead of as a sliced spritesheet. When the preprocess fallback in
`src/game/scene/SpriteLoader.ts:86` triggers, the raw image is added as a 128×128 grid,
which can render the boss as a giant overlapping sprite. This is the one item from external
critique that affects what players actually see. **Fix:** load `boss_audrey` through the
normal sheet pipeline, or give the fallback a sane single-frame crop instead of a 128×128
grid assumption.

### 🟠 Hardcoded `height / 4` row assumption in sprite slicing
`src/game/SpritePreprocessor.ts` — `preprocessStandardSheet` assumes 4 rows. Any sheet with
a different row count slices wrong. **Fix:** derive row count from sheet metadata or a
per-sheet override, the same way `SpriteLoader.ts` already carries per-NPC `cols`.

### 🟠 Per-NPC sprite config is a hardcoded table
`src/game/scene/SpriteLoader.ts:192` — `npcSheets` hardcodes `cols`/`frontCol` per NPC.
Fine for the current fixed roster; revisit only if NPC count grows or art is added by
someone who can't edit TS. **Lightest fix when needed:** colocate the per-sheet metadata
with the sheet asset rather than a JSON pipeline.

### 🟡 Theme lighting is coupled to the engine
`src/game/scene/Atmosphere.ts:84` — `lightsByTheme` hardcodes light positions/tints per
theme. Acceptable for a solo project with a closed chapter list. Refactor to chapter/map
config **only** when adding a new theme starts to feel painful — it's a ~20-minute job at
that point, premature now.

### 🟡 ESLint warnings (~108)
Mostly `@typescript-eslint/no-explicit-any` (often honest types in Phaser callbacks) and
`no-unused-vars` (Phaser callback signatures). Low value. If addressed, batch the unused-arg
ones with a `_` prefix; don't force types where `any` is genuinely correct. One worth a real
look: the `react-hooks/exhaustive-deps` warning in `GameLayout.tsx` (stale-closure risk).

### 🟡 `ChapterScene.ts` still ~1,420 lines
Down from ~2,700 after the decomposition. No longer a god object but still the largest file.
Further extraction only if a coherent subsystem emerges — don't split for line-count's sake.

### ⚪ Boot-time asset pipeline cost
In-browser BFS slicing / atlas baking during `create()` causes first-paint jank and GPU
readback stalls. Detailed in `docs/TRACK_E_TECHDEBT_PERF.md` (E2). Largest perf lever but
also the largest effort; defer until first-load time is an actual complaint.

---

## Features / Developments

(Existing detailed specs — pull into active work as capacity allows.)

- **Combat depth** — `docs/COMBAT_DEPTH_PLAN.md`
- **Turn-based battle mode** — `docs/TURN_BATTLE_GAMEMODE_PLAN.md`
- **Narration system** — `docs/NARRATION_PLAN.md`
- **External-game pipeline** — `docs/EXTERNAL_GAME_PIPELINE_PLAN.md`
- **Signature feature** — `docs/TRACK_F_SIGNATURE_FEATURE.md`
- **Content / visual track** — `docs/TRACK_B_CONTENT_VISUAL.md`
- **Systems / UI track** — `docs/TRACK_C_SYSTEMS_UI.md`
- **Audio track** — `docs/TRACK_D_AUDIO.md`

---

## Open questions

- **`rose_florida` plays in silence** — Chapter 5b has no music key in `CHAPTER_MUSIC_KEY`
  and no per-scene `music:` field. Could be intentional given the chapter's subject matter;
  confirm with the group and add a track if needed.

---

## Done (recent)

- ✅ Decomposed `ChapterScene` god object into `scene/` subsystems (Actors, AudioController,
  BeatEngine, MapBuilder, Atmosphere, SpriteLoader)
- ✅ Expanded Playwright E2E suite (4 → 16 specs); E2E gate now required in CI
- ✅ Fixed loot collection bug surfaced during the decomposition
- ✅ Save schema v2 + unified settings store (`settings.ts`) with migration + corruption guard
- ✅ Settings panel with music/SFX/master volume sliders, reduce-motion, colorblind, difficulty
- ✅ Hall of Records + scoring system (`scoring.ts`) with ghost targets
- ✅ Ch8 music: `cabin_basye` now plays Dark Beach (Pastel Ghost) instead of Ch1 track
- ✅ Door-open SFX on "The door opens." beat in Ch6; new `sfx` beat type added
- ✅ Portrait pop animation on speaker change in `DialogueBox.tsx`
- ✅ All prop types have real art or characterful procedural draws (B1 complete)
- ✅ `tag:` deprecated field fully removed from all chapter files (B3)
- ✅ Nick-F frame clamp via `frameTotal` (B4)
- ✅ `willReadFrequently` set on all pixel-readback canvases (E1)
- ✅ Border-shorthand React warning fixed in `ChapterSelect.tsx` (E1)
