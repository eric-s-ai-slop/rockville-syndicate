# HANDOFF — Project Omega: The Rockville Syndicate

Last session ended: 2026-06-12. This file is the single entry point for the next agent.
Read this, then `VISUAL_OVERHAUL_PLAN.md` for phase specs, then the source files you're touching. Storyboards (all lore/dialogue source material) are in `storyboard/storyboard_0.txt`–`storyboard_8.txt`.

---

## 0. P0 — FIX FIRST: Chapter 1 breaks at the Eric boss fight

**User report:** "The game breaks during chapter 1 once you talk to eric."

**Where:** The chapter soft-locks somewhere in beats 6–9 of Chapter 1
(beat layout: `0:dialogue, 1:walkTo, 2:dialogue, 3:ledger, 4:dialogue, 5:walkTo, 6:dialogue(eric), 7:choice, 8:dialogue(eric), 9:bossFight(boss_eric), 10–11:dialogue, 12:endChapter`).

**Captured state at the lock** (via `window.__OMEGA_GAME__.scene.getScene('ChapterScene')`):
`{ beatIndex: 9, beatActive: true, dialogueOpen: true, isBossActive: false }` and **no** React dialogue box on screen. So the `bossFight` beat started, `freeze()` ran, but `summonBossMatch` never fired — the player is frozen staring at an empty room. No console errors.

**Prime suspect — the new Phase D boss-intro sequence** in `runBossFightBeat()` (`src/game/ChapterScene.ts`, search `launchFight`). It was added last session and is the newest code in that path:

1. The sequence is: VS intro dialogue → `launchFight()` → `freeze()` + `showLetterbox()` + `cam.stopFollow()` + `cam.pan(ax, ay, 550, ..., true, callback)` → on `progress === 1`: name-slam labels → 900ms later `hideLetterbox()` → 320ms later `startFollow` + `unfreeze()` + `summonBossMatch()`.
2. Suspect (a): the `cam.pan()` completion callback may never report `progress === 1` (e.g. pan target already equals camera position, or a competing camera effect eats the tween). Everything downstream, including `summonBossMatch`, hangs off that callback. **Make the sequence robust: drive it with `this.time.delayedCall` chains instead of relying on the pan callback, or add a watchdog fallback that forces `summonBossMatch` after ~2s.**
3. Suspect (b) — real but secondary: the name-slam labels use `cam.midPoint` (world coords) with `.setScrollFactor(0)` (screen-space). With 2× zoom these are misplaced/off-screen. Screen-space placement should use `cam.width/2, cam.height/2`.
4. Note: `freeze()` is called twice on this path (once before VS dialogue, again inside `launchFight`) — harmless by itself (`freeze` is idempotent) but check `unfreeze` pairing.

**Repro:** Pick Eric → Chapter 1 → space through dialogue, walk to markers (or teleport: `s = window.__OMEGA_GAME__.scene.getScene('ChapterScene'); s.player.setPosition(s.walkTarget.x, s.walkTarget.y)`), answer the choice, advance past "I AM THE AUDIT" → screen letterboxes/pans and then nothing.

**After fixing, verify the same sequence in Chapter 3, 5, 6, 7 boss beats** (they all share `runBossFightBeat`), and run `npx tsc --noEmit`.

---

## 1. Where the project stands

Visual overhaul phases (spec: `VISUAL_OVERHAUL_PLAN.md`):

| Phase | Status |
|---|---|
| A — Tilemap floors/walls | **SKIPPED for now** — procedural floor patterns shipped in B instead. New tileset assets (see §3) make this viable; revisit after P0+E. |
| B — Props, shadows, label removal | ✅ Done. Y-sorting, shadow ellipses, `propType` shapes, BotW area-title toast. |
| C — Lighting & atmosphere | ✅ Done. Per-theme ambient overlay + vignette + fake additive lights + ambient particles. Verified in browser. |
| D — Game feel & cinematics | ⚠️ **Implemented but broken** — the boss-intro sequence causes the P0 soft-lock. Everything else verified: typewriter dialogue, portraits, chapter title card, camera fades, damage numbers, footstep dust. |
| E — Audio | ❌ Not started. **All raw audio assets now exist** (see §3). This is the highest-value next phase after P0. |
| F — React UI skin + QA | ❌ Not started. Font assets now exist for the heading-font swap. |

Key depth conventions (do not violate): floor −200 · props/chars Y-sorted (~0–700) · ambient overlay 800 · fake lights 850 · particles 860 · bubble/passive text 2000 · damage numbers 3000 · area title 5000 · vignette 6000 · walk markers 8000 · letterbox 9500 · boss HP 10000–10002 · boss name slam 12000.

---

## 2. What the next agent should do, in order

1. **P0 bug** (§0). Fix `runBossFightBeat`, play Chapter 1 start→finish in the browser, confirm chapter completes and progress saves.
2. **Quick QA sweep of Phase D** while you're in there: confirm letterbox cleans up after `cameraPan` beats (Ch2/Ch5 use them heavily), confirm title card doesn't block input, confirm damage numbers appear in the Eric fight.
3. **Phase E — Audio.** All files are already in `src/assets/audio/` (inventory in §3). Implementation notes:
   - Per-theme looping stage music: see the `stage_music/` filename → chapter mapping in §3. Start playback on first user gesture (chapter start click satisfies autoplay policy). Crossfade to `boss_music/Prowler Sound Effect.mp3` on `bossFight` beat, back after.
   - SFX from the Kenney packs (all CC0): footsteps (`kenney_impact-sounds/Audio/footstep_*`), UI clicks/confirms (`kenney_interface-sounds/Audio/`), doors/books/coins (`kenney_rpg-audio/Audio/`), jingles for chapter-complete (`kenney_music-jingles/`).
   - Wire a mute toggle in the React header, persist to localStorage.
   - MP3 filenames contain spaces and parens — import via Vite `?url` imports or rename; don't hand-build URL strings.
4. **Phase A revisit — real tilesets.** `game_decor/Interiors_free/` is the LimeZu "Modern Interiors" free pack: `Room_Builder_free_*.png` (floors/walls) + `Interiors_free_*.png` (furniture) at 16/32/48px. Use the 32×32 versions to replace the procedural apartment/cabin floors and the `drawPropShape` rectangles for interior chapters. Grid-sliced (uniform cells) — simpler than the BFS slicer. Keep procedural fallbacks; never touch collision geometry.
5. **Phase F — UI skin.** `src/assets/fonts/` has ~40 pixel webfonts (each folder: `Web Open Font Format (.woff)/<Name>.woff` + PNG previews; `PREVIEW.png` shows all). Pick ONE display font for headings (Jupiteroid, Pixelzone, and Home Video are good candidates — check `PREVIEW.png`), `@font-face` it in `index.css`, keep JetBrains Mono for numbers/ledger. Then hero-card portraits (reuse `portraitDataUrls` pattern), chapter thumbnails, title-screen polish, delete dead `GameScene.ts` + `buildNeighborhoodMap()`.

---

## 3. NEW ASSETS (user-provided, mostly unwired)

### `src/assets/audio/stage_music/` — chapter music (MP3)
| File | Intended chapter |
|---|---|
| `commons1522(coffee beabadobee).mp3` | Ch1 (and likely Ch7) — Apartment 1522 |
| `night_highway(nightcall kavinsky).mp3` | Ch2 — I-95 night drive |
| `hospital(flight from the city).mp3` | Ch3 — hospital |
| `jungle_gym(BorderlineTameImpala).mp3` | Ch4 — park/jungle gym |
| `Jordan_and_maharko_music_for_map (6).mp3` | Ch5 — Florida duel (Jordan vs Maharko) |
| `ben_music.mp3` / `ben_music(in the hall of the mountian king).mp3` | Ch6 — Ding Dong Ditch Ben (two options; pick one, likely Mountain King for the chase) |
| `chapter7PASTEL GHOST  DARK BEACH.mp3` | Ch7 — Spain betrayal |
| *(no Ch8 track yet — ask user or reuse commons1522)* | Ch8 — cabin |

### `src/assets/audio/` — SFX packs (Kenney, CC0)
- `kenney_impact-sounds/Audio/` — footsteps (snow/wood…), glass/wood/plate impacts → combat hits, footsteps
- `kenney_interface-sounds/Audio/` — clicks, confirms, backs → React UI + dialogue blips
- `kenney_rpg-audio/Audio/` — doors open/close, creaks, book flips, knife draws, cloth → diegetic SFX (doorbell stand-in for Ch6 until a real ding-dong exists)
- `kenney_music-jingles/` — short jingles → chapter-complete / victory stings
- `boss_music/Prowler Sound Effect.mp3` — boss fight music

### `src/assets/images/game_decor/` — tilesets
- `Interiors_free/{16x16,32x32,48x48}/` — LimeZu Modern Interiors free pack: `Room_Builder_free_*` (floors/walls/doors) + `Interiors_free_*` (furniture sprites). **This unblocks Phase A and prop sprites for interior chapters.**
- `Old/` — RPG Maker-style tilesets + 16/32/48px character templates (`Tileset_*`, `idle_*`, `run_horizontal_*`, `doors.png`, `statics.png`). Secondary option; check license before shipping (RPGMAKER-named files may be engine-restricted).

### `src/assets/fonts/` — ~40 pixel/display webfonts
Each folder has `Web Open Font Format (.woff)/` (+ some TTF) and numbered PNG previews; root `PREVIEW.png` is a contact sheet. For Phase F headings.

### `src/assets/images/micheal_bersofsky.jpg`
New portrait/sprite for Michael Bersofsky (= Ben, the Ch6 boss `boss_ben`). Likely intended to replace or supplement `boss_ben.jpg`. Wire through the existing raw-image → `preprocessShowcaseSheet` path in `ChapterScene.preload()` if it's a sprite sheet; if it's a single portrait, use it as Ben's dialogue portrait.

---

## 4. Architecture crib sheet (unchanged, for orientation)

- **Stack:** React 19 + Phaser 3.88.2 (runtime reports 3.90) + Vite + TS + Tailwind v4. No Phaser 4 APIs, no new heavy deps.
- **`src/game/ChapterScene.ts`** (~2400 lines) — the entire game scene: beat engine (`startBeat`/`advanceBeat`), data-driven maps (`buildMapFromConfig`), atmosphere (`buildAtmosphere`), cinematics (`showLetterbox`/`showDamageNumber`/`extractPortraits`), boss system. Dev hook: `window.__OMEGA_GAME__`.
- **`src/data/chapters.ts`** — all 8 chapters: `MapConfig` (+ `theme`, `areaTitle`, `propType` on rects; `tag` is deprecated/ignored), `Beat[]`, actors.
- **`src/components/GameLayout.tsx`** — state machine (hero → chapters → playing → chapterComplete), Phaser boot, title card, QTE modal, ledger header.
- **`src/components/DialogueBox.tsx`** — typewriter (22ms/char, Space skips then advances), portraits (`portraitDataUrl`), choices (keys 1–9).
- **Progress:** localStorage `omega-progress-v1`. To unlock all chapters for testing, write `completedChapters` **before** the ChapterSelect screen mounts (it reads once), then reload.

### Hard constraints (from the plan — do not violate)
- Don't touch: canvas sizing (`syncCanvasToParent` + RAF), physics/collision geometry, beat engine contract, `preprocessShowcaseSheet`, localStorage keys.
- Every image/audio asset needs a graceful fallback — a missing file must never crash a chapter.
- **Restart the Vite dev server after edits** (port 3000, `omega-dev` launch config) — it caches transforms. Verify with the preview tools; `npx tsc --noEmit` + `vite build` clean before calling a phase done.
- Browser-drive testing: select hero (button index 0) → "Begin the Story" (last button) → chapter card. Dialogue advances with synthetic `Space` keydown on `window`.

## 5. Known cosmetic issues (non-blocking, fix opportunistically)
- Console warns `Texture "hero_nick_f_sheet" has no frame "96"/"97"` — an anim registered for nick_f references frames past the sliced sheet's count. Clamp frame ranges in `registerAnim` callers.
- Boss name-slam label placement uses world coords with `setScrollFactor(0)` (see P0 suspect b).
- `chapters.ts` chapters 2–8 still use deprecated `tag:` fields on rects (ignored by renderer); migrate to `propType` whenever touching those chapters.
