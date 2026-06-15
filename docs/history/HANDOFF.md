# HANDOFF — Project Omega: The Rockville Syndicate

Last updated: 2026-06-12. Single entry point for the next agent.
Read this, then `SCRATCHPAD.md` (running work log), then `VISUAL_OVERHAUL_PLAN.md` (phase specs), then the source
files you're touching. All lore/dialogue source is in `storyboard/storyboard_0.txt`–`storyboard_8.txt`.

The old P0 boss soft-lock is **fixed** — do not go looking for it. See the changelog below for what actually broke
and how it was solved (it was a React StrictMode double-advance, not the camera pan).

---

## 1. Current status

Visual overhaul phases (spec: `VISUAL_OVERHAUL_PLAN.md`):

| Phase | Status |
|---|---|
| A — Tilemap floors/walls | Partially superseded. Procedural floors shipped in B. Real tilesets + per-stage textures now on disk → see **R1**. |
| B — Props, shadows, label removal | ✅ Done. Y-sorting, shadow ellipses, `propType` shapes, area-title toast. |
| C — Lighting & atmosphere | ✅ Done. Per-theme ambient overlay + vignette + fake lights + particles. |
| D — Game feel & cinematics | ✅ Done. Typewriter dialogue, portraits, chapter title card, camera fades, damage numbers, footstep dust, boss intro. |
| E — Audio | ✅ Done. Per-theme stage music, boss music, footsteps, victory jingle, mute toggle. Boss-music upgrade pending → **R3**. |
| F — UI skin | ◻️ Partial. Jupiteroid `--font-display` + theme accent strips shipped. Full 8-bit overhaul pending → **R6**. |

### Changelog — fixed this session (2026-06-12)
- **Chapter soft-lock ("Eric freezes the character")** — root cause was **not** the boss fight. `advanceStory`/
  `chooseStory` in `GameLayout.tsx` called the scene's `done()` side effect *inside* a `setActiveStory` updater;
  React `<StrictMode>` double-invokes updaters in dev → `advanceBeat()` fired twice → every dialogue skipped the next
  beat, vanishing `walkTo` beats and leaving a stale `walkTarget`. Fixed by moving `done()` out of the updater (read
  via `activeStoryRef`, null it before calling). **Never put a side effect in a setState updater in this codebase.**
- **Player sprite facing** — `ChapterScene.update()` now `setFlipX(vx<0)` (sprites drawn facing right).
- **Boss center-rotation** — `handleBossAI()` now `setFlipX(Math.cos(targetAngle)<0)` instead of `setRotation()`.
  Humanoid bosses no longer spin.
- **QTE freeze** — new `qteActive` flag fully pauses combat while the QTE modal is open (gates the combat block in
  `update()`, zeroes boss velocity, early-returns `damagePlayer()`, resets `lastBossAttackTime` on close). Fixes the
  "Audrey kills you during the April-Fools selection" bug.
- **Jordan & Maharko sprites** — wired into the hero showcase pipeline (`heroIds`); map actors + dialogue portraits
  derive automatically. **Michael's sprite** — `boss_ben` texture now loads `micheal_bersofsky.jpg`.

Depth conventions (do not violate): floor −200 · props/chars Y-sorted (~0–700) · ambient 800 · lights 850 ·
particles 860 · bubble text 2000 · damage numbers 3000 · area title 5000 · vignette 6000 · walk markers 8000 ·
letterbox 9500 · boss HP 10000–10002 · boss name slam 12000.

---

## 2. Roadmap (updated 2026-06-12, session 2)

| R | Status |
|---|--------|
| R1 | ✅ Done — prop sprites + per-stage hero textures |
| R2 | ✅ Done — crew cars (Ch2 + Ch5) |
| R3 | ✅ Done — Prowler sting → Techno-Tetris loop |
| R4 | ✅ Done — NPCs static frame 0 |
| R5 | ✅ Done — understudyId roster + Eric in Ch2/Ch6 |
| R6 | ✅ Done — 8-bit/Pokémon UI (Public Pixel, pixel-panel, dialogue, QTE, end screens) |
| R7 | ✅ Done — Linear / Free Play toggle |
| R8–R19 | ◻️ TODO — see §3 below (R11 is the last P0 user request) |

## 3. Remaining work (priority order — for the next agent)

Each item names the files to touch and the approach. **Hard rules:** never change physics/collision rects; every
image/audio asset needs a graceful fallback; filenames with spaces/parens must be `?url`-imported, never hand-built.
No new heavy deps (no Phaser 4 APIs). `npx tsc --noEmit` + `vite build` must be clean before calling anything done.

| R | Priority | Status |
|---|----------|--------|
| **R9 — Kill rounded corners (bit aesthetic)** | 🔴 P0 (user) | ✅ Done |
| **R10 — Yoster Island font everywhere** | 🔴 P0 (user) | ✅ Done |
| **R11 — Ben's house: extract one view from contact sheet** | 🔴 P0 (user) | ✅ Done |
| R8 — Michael chase phase before Ch6 fight | 🟡 P1 | ✅ Done |
| R12 — Nick-F anim frame clamp (console warns) | 🟢 P2 quick | ◻️ TODO |
| R13 — Migrate deprecated `tag:` fields → `propType`/`propKey` | 🟢 P2 quick | ◻️ TODO |
| R14 — LimeZu furniture sprites (generic props) | 🟢 P2 | ◻️ TODO |
| R15 — Boss-music polish (crossfade, per-boss loop) | ⚪ P3 | ◻️ TODO |
| R16 — Nature-pack flora on outdoor maps | ⚪ P3 | ◻️ TODO |
| R17 — Dialogue polish (typewriter SFX, portrait pop) | ⚪ P3 | ◻️ TODO |
| R18 — Interactive QA play-through (all 8 chapters) | ⚪ P3 | ◻️ TODO |
| R19 — Perf / accessibility pass | ⚪ P4 | ◻️ TODO |

---

### R9 — Remove ALL rounded corners; commit to the bit aesthetic 🔴 P0
**User intent:** the smoothed corners "look like AI slop." Make it read like a polished retro game — sharp,
bordered, pixel-style boxes everywhere (the `pixel-panel` look from R6 is the target; apply it universally).

Files & what to change:
- **`src/components/GameLayout.tsx`** — hero-select cards, "Begin the Story" button, header chips, title card pill,
  HP bar, ledger chip. Replace every `rounded-*` (`rounded-2xl`, `rounded-xl`, `rounded-full`, `rounded-lg`) with
  square corners. Convert the gradient/soft cards to `pixel-panel` / `pixel-panel-dark` (defined in `index.css`).
  The HP bar and QTE timer bar should be square with a 2px border, not `rounded-full`.
- **`src/components/ChapterSelect.tsx`** — chapter cards (`rounded-2xl`), the index badge (`rounded-xl`), the
  Free-Play toggle pill (`rounded-full` track + knob). Square everything; the toggle can become a chunky 2-state
  bordered switch instead of a pill.
- **`src/components/DialogueBox.tsx`** — already `pixel-panel` from R6, but re-check choice buttons / portrait for
  any leftover rounding (`rounded` on the portrait img).
- **`src/index.css`** — audit `.pixel-panel*` (already square). Add a shared `.pixel-btn` class (square, 2–4px border,
  `image-rendering: pixelated`, hover = border/bg swap, no transition-blur) and use it for all buttons so the look is
  consistent. Remove `border-radius` from any custom classes. Keep scrollbar styling but square the thumb.
- **Phaser side (`ChapterScene.ts`)** — in-world boxes drawn with `fillRoundedRect`/`strokeRoundedRect`
  (rug in `drawDecorativeRect`, props in `drawPropShape`, the area-title toast, boss HP bar) use rounded radii.
  For full consistency switch these to `fillRect`/`strokeRect`. Grep: `RoundedRect`. ~8 call sites.

Acceptance: grep for `rounded-` in `src/components` and `RoundedRect` in `src/game` returns nothing (or only
deliberate exceptions). Verify in preview: hero select, chapter select, dialogue, QTE, end screens all square.

---

### R10 — Yoster Island as the single global font 🔴 P0
**User intent:** EVERY font — UI, headings, body, the intro/hero-select, in-game labels — becomes Yoster Island.
Replace Jupiteroid (`--font-display`), Public Pixel (`--font-pixel`), Inter (`--font-sans`), and JetBrains Mono
(`--font-mono`) usage so one pixel font rules the whole game.

Asset: **`src/assets/fonts/yoster-island/yoster.ttf`** — note it is **TTF only** (no `.woff`/`.woff2`, unlike
Jupiteroid/Public Pixel). The folder is lowercase-slugged `yoster-island/`. License at `yoster-island/license.txt`.

Steps:
1. **`src/index.css`** — add `@font-face { font-family:'Yoster'; src:url('./assets/fonts/yoster-island/yoster.ttf')
   format('truetype'); font-display:swap; }`. Then point every `@theme` font var at it:
   `--font-sans`, `--font-display`, `--font-mono`, `--font-pixel` → `"Yoster", monospace` (keep a generic fallback).
   Set `body { font-family: 'Yoster', monospace; }`. Decide on `font-mono` for numbers: Yoster digits may read poorly
   at tiny sizes — if HP/ledger numbers look bad, that's the one allowed exception (leave JetBrains Mono for digits).
   Document whichever choice you make.
2. **Tailwind classes** — `font-display`, `font-mono`, `font-pixel`, `font-medium`, `font-bold` will all now resolve
   to Yoster via the vars; no per-component edits needed for family, but check sizes — pixel fonts need larger
   `font-size` + `line-height` to stay legible. Bump cramped spots (10px → 11–12px) as needed.
3. **Phaser text (`ChapterScene.ts`)** — the `label()` helper and all `this.add.text(...)` calls set a `fontFamily`
   (or inherit the canvas default). Phaser cannot use a CSS `@font-face` until the font is actually loaded. Add a
   `document.fonts.load("16px 'Yoster'")` await (or the WebFontLoader pattern already noted in code comments) in
   `GameLayout` boot BEFORE `new Phaser.Game`, OR call `this.add.text` with `fontFamily:'Yoster'` and force a
   re-render once `document.fonts.ready` resolves. Without this the canvas falls back to a system font. Set the
   default font on every label: boss name-slam, area title, nameplates, damage numbers, walk markers, brainrot HUD.
4. **`vite build`** — confirm the TTF is emitted and the `@font-face` URL resolves (Vite fingerprints it).

Acceptance: hero-select, chapter-select, all dialogue/HUD/in-world text render in Yoster. No Inter/Jupiteroid/
JetBrains/Public-Pixel visible anywhere (except deliberate digit fallback if you kept one — document it).

---

### R11 — Ben's house: extract the correct sub-image from the contact sheet 🔴 P0
**The bug:** Ch6 currently renders the *entire reference contact sheet* (`watchwater way.jpg`) — a labeled grid of
6 views ("FULL SCENE", "FRONT VIEW", "ISOMETRIC BACK-RIGHT", "BACK VIEW", "SIDE (LEFT) VIEW", "TOP-DOWN VIEW") with
gridlines and text. We must show ONE clean view instead.

Findings (already verified this session):
- Both sheets are **1492 × 704** px, identical layout. Files in `src/assets/images/game_decor/stages/dingdongditchben/`:
  `watchwater way.jpg` (closed) and `watchwater way (door opened).jpg` (open). Layout is the same in both; the
  door-open difference (light spill from the front door) is visible in the FULL SCENE region.
- The **FULL SCENE (FRONT VIEW)** panel (top-left: house + yard + tree + garage + red car, no label/grid) lives at
  crop box **(left=22, top=22, right=690, bottom=312)** → a 668×290 image. This crop was tested and is clean.
  (If you prefer the bare house facade instead, the "FRONT VIEW" panel is the top-middle one — but FULL SCENE looks
  best as an establishing backdrop and shows the door-open light spill.)

Two ways to fix — **pick ONE**:

**Option A (preferred, no new shipped deps): Phaser texture frames.** Keep loading the full JPGs. In `create()`/
`preload()` after the texture exists, register a sub-frame:
```ts
const tex = this.textures.get('prop_watchwater');
tex.add('scene', 0, 22, 22, 668, 290);   // x,y,w,h within the sheet
// same for prop_watchwater_open
```
Then render with the frame: `this.add.image(x, y, 'prop_watchwater', 'scene')`. The R1 propKey path in
`drawPropShape`/`drawDecorativeRect` currently does `this.add.image(x,y,propKey).setDisplaySize(w,h)` with no frame —
extend it so a propKey can carry an optional frame name (e.g. a small `PROP_FRAMES: Record<string,[x,y,w,h]>` map),
or special-case the two watchwater keys. The door-open swap (already in `runBossFightBeat`) becomes
`houseSprite.setTexture('prop_watchwater_open','scene')`. **Aspect note:** the crop is ~2.3:1 landscape; the house
rect is 280×280. Don't stretch it square — render the visual larger/landscape (e.g. displayWidth≈360, keep ratio)
centered on the rect while leaving the invisible 280×280 physics body unchanged (hard rule: don't move collision).

**Option B (pre-crop the asset): commit real cropped files.** Pillow is installed locally (one-time tool). Generate
`watchwater_scene.jpg` + `watchwater_scene_open.jpg`:
```python
from PIL import Image
box=(22,22,690,312)
Image.open("watchwater way.jpg").crop(box).save("watchwater_scene.jpg",quality=92)
Image.open("watchwater way (door opened).jpg").crop(box).save("watchwater_scene_open.jpg",quality=92)
```
Then point the `?url` imports in `ChapterScene.ts` at the cropped files. Simpler runtime, but adds two asset files.

Acceptance: Ch6 shows a single clean house scene (no gridlines/labels), and it visibly changes to the door-open
version when Michael's `bossFight` beat fires.

---

### R8 — Michael chase phase before the Ch6 fight 🟡 P1
New `chase` beat: `{ type:'chase'; pursuerId:string; durationMs:number }` in `chapters.ts` Beat union. Handle in the
beat engine (`startBeat`/`advanceBeat`, `ChapterScene.ts`): spawn the pursuer reusing the boss spawn/AI but
**invulnerable, faster than the player, combat + QTE disabled**, contact = soft knockback (never a kill). After
`durationMs` (or a distance check), resolve into the existing VS-intro → `bossFight` for `boss_ben`. Insert the chase
beat in Ch6 right before the current `bossFight` beat. Reuse `freeze()`/`unfreeze()` and the letterbox helpers. Keep
the existing soft-lock-safe `delayedCall` timing pattern (never depend on `cam.pan` `p===1`).

### R12 — Clamp Nick-F anim frame ranges 🟢 P2 (quick)
Console warns `Texture "hero_nick_f_sheet" has no frame "96"/"97"`. An anim references frames past the sliced sheet.
In the `registerAnim` callers (`ChapterScene.ts`), clamp the frame list to the sheet's actual frame count
(`this.textures.get(key).frameTotal`). ~15 min; kills the console noise.

### R13 — Migrate deprecated `tag:` fields 🟢 P2 (quick)
Ch2–Ch8 rects still carry `tag:` strings (ignored by the renderer since Phase B). Replace each with the right
`propType` (and `propKey` where a sprite exists). Pure cleanup, no behavior change. Grep `tag:` in `chapters.ts`.

### R14 — LimeZu furniture sprites 🟢 P2
Wire generic furniture from `src/assets/images/game_decor/Interiors_free/32x32/` (uniform 32px grid → simple
grid-slice, no BFS slicer) so couch/desk/tv/fridge/counter rects render as real sprites via the R1 propKey path,
replacing the procedural shapes in `drawPropShape`. Keep procedural fallback. Biggest visual upgrade for the
apartment/cabin/hospital interiors.

### R15 — Boss-music polish ⚪ P3
R3 plays Prowler sting → Techno-Tetris loop with an abrupt cut. Add a short crossfade between sting-end and loop-start
in `startBossMusic`/`startBossLoop` (`ChapterScene.ts`). Optional: per-boss loop selection instead of one shared loop.

### R16 — Nature-pack flora ⚪ P3
`src/assets/images/game_decor/nature/` (flower/bush/tree packs) → scatter as decorative non-solid sprites on outdoor
maps (Ch2 highway shoulder, Ch4 park, Ch5 Florida, Ch8 cabin). Decorative only; no physics. Use the R1 sprite path
or a dedicated deterministic scatter (see `drawFloorLines` park case for the seeded-RNG pattern).

### R17 — Dialogue polish ⚪ P3
`DialogueBox.tsx`: optional per-char typewriter "blip" SFX (fits the 8-bit look; reuse a Kenney interface sound via
the audio layer), and a small portrait pop/scale-in on speaker change. Keep the 22ms/char default; make SFX
respectful of the mute toggle.

### R18 — Interactive QA play-through ⚪ P3
Play all 8 chapters end-to-end in a real browser (preview `canvasH=0` blocks full interactive testing — open
`http://localhost:3000` directly). Verify: R1 props at correct scale, R2 cars, R3 sting→loop timing, R4 NPCs not
cycling (Ch5 worst case Jordan/Maharko), R5 understudy fills for every hero pick, R6/R9 UI, R10 fonts, R11 house,
letterbox cleanup after `cameraPan` (Ch2/Ch5), damage numbers, victory jingle. Log results in SCRATCHPAD.

### R19 — Perf / accessibility ⚪ P4
Texture atlasing for small props; audio preload strategy; color-blind-safe accent option; text-scale setting for the
pixel font; keyboard-only chapter navigation. Lowest priority — polish only.

---

## 4. Archived roadmap specs (R1–R7 done; kept for reference)

### R1 — Furniture & prop sprites (incl. per-stage hero textures)
Replace procedural `drawPropShape` rectangles with real sprites. Two asset sources:
- **Generic furniture (LimeZu):** `src/assets/images/game_decor/Interiors_free/32x32/` — `Interiors_free_*` (furniture),
  `Room_Builder_free_*` (floors/walls/doors). Uniform 32px grid → simple grid-slice, no BFS slicer.
- **Per-stage hero textures (single JPGs, load like boss showcase images):** `src/assets/images/game_decor/stages/`
  - `audrey_hopsital/` → `hospital_bed.jpg`, `iv-drip.jpg`, `cabinant.jpg`, `red_toliet(evidence).jpg` (Ch3 hospital)
  - `beall/jungle gym.jpg` (also `special/jungle gym.jpg`) (Ch4)
  - `dingdongditchben/` → `watchwater way.jpg` + `watchwater way (door opened).jpg` (Ch6; swap on the door-open beat)

Approach: `MapRect` already supports a `propKey` (see `chapters.ts` `MapRect` interface). Load these JPGs in
`preload()` with `safeLoadImage(key, importedUrl)`; in `buildMapFromConfig`/`drawPropShape`, render the sprite when a
`propKey` is set and the texture exists, else fall back to the existing procedural shape. Keep the physics rect identical.

### R2 — Maharko / Jordan / Nick-F cars
`src/assets/images/game_decor/special/cars/` → `jordan's mustang.jpg`, `maharko's camero.jpg`, `nick f's corolla.jpg`.
Wire via the R1 sprite-prop path. Ch2 (I-95) already has a `propType:'car'` rect to host Nick F's Corolla; Ch5 (Florida
duel) needs car placements beside Jordan & Maharko.

### R3 — Boss music: Prowler one-shot → Techno-Tetris loop
`src/assets/audio/boss_music/` now has `Prowler Sound Effect.mp3` (sting) + `Techno - Tetris (Remix).mp3` (loop).
Rework `startBossMusic()` (`ChapterScene.ts`, ~line 1268) and `src/game/audio.ts`: play Prowler once (no loop) at full
volume; on its `complete` event start Techno-Tetris looping. Add a `BOSS_LOOP_URL` constant + key. `stopBossMusic()`
must stop whichever clip is currently active and resume stage music. Keep the existing try/catch fallbacks.

### R4 — Idle actors cycling through frames (NPCs "rotate through their icons"; Ch5/Boca Raton worst)
Cause: the `idle_<id>` anim is built from the **entire row-0** of the showcase sheet (up to 12 frames —
`SpritePreprocessor.ts:343`) and played at 4fps, so a standing NPC flips through every row-0 pose. Fix in
`placeActors()` (`ChapterScene.ts:1320`): render standing actors on a **static frame 0** (skip `.play('idle_…')`), or
register a short `idlePose` anim clamped to 1–2 frames for NPCs only. The player keeps the full idle. Verify Jordan &
Maharko specifically.

### R5 — Roster presence: keep the player's pick, fill the gap
Decision (user): the player always controls their chosen hero; when that hero would occupy an NPC slot, a stand-in
fills it (so no character ever vanishes).
- Add optional `understudyId?: string` to `ActorPlacement` (`src/data/chapters.ts`).
- In `placeActors()`, replace the `if (actor.id === this.playerClass.id) return;` skip (line 1324): when the actor *is*
  the player and `understudyId` is set, place the understudy's sprite + nameplate at that position instead of skipping.
- Fill rosters so each scene has the full crew, including the user-named gaps: **Eric on I-95 (Ch2)** and **Eric in
  Ding-Dong-Ditch (Ch6)**. Give player-eligible slots an `understudyId` so any hero pick leaves the scene populated.

### R6 — Full 8-bit / Pokémon-style UI overhaul (all React UI)
Pokémon-style framed dialogue box: chunky double border, solid (non-gradient) panel, pixel font, blinking ▼ advance
arrow. Apply the same skin to **every** surface: header/HUD, hero cards, chapter select, QTE modal, chapter-complete,
game-over, and all buttons. Pick a legible-at-small-size pixel body font from `src/assets/fonts/` (Jupiteroid is already
wired as `--font-display` for headings; numbers can stay JetBrains Mono if pixel digits read poorly). Use
`image-rendering: pixelated`; replace `rounded-2xl`/gradients with bordered boxes. Files: `DialogueBox.tsx`,
`GameLayout.tsx`, `ChapterSelect.tsx`, `index.css`.
- **Update the shield icon:** the QTE modal uses the lucide `ShieldAlert` (`GameLayout.tsx:422`). Replace with a pixel
  shield matching the new look — either the uploaded `src/assets/images/shield.jpg` or a drawn pixel-art shield.

### R7 — Linear Story vs Free Play mode
Start-screen/settings toggle: **Linear** (chapters unlock in order — current `isChapterUnlocked`, `src/game/progress.ts`)
vs **Free Play** (all chapters selectable). Persist the choice in the existing `omega-progress-v1` localStorage blob;
branch the unlock check in `ChapterSelect.tsx`.

### R8 — Michael boss chase phase (Ch6)
Before the `bossFight` beat, add a "RUN!" segment: Michael pursues (invulnerable, faster than the player); after a
timer/distance the crew realizes they can't escape and the real fight starts. Approach: new `chase` beat type
(`{ type:'chase', pursuerId, durationMs }`) in `chapters.ts`, handled in the beat engine, reusing the boss spawn/AI
with combat + QTE disabled and contact = soft knockback (never a kill). Resolves into the existing VS intro → `bossFight`.

---

## 3. Asset inventory (most now wired; remaining work flagged above)

### `src/assets/audio/`
- `stage_music/` — per-chapter MP3s, wired (`src/game/audio.ts`). Ch8 reuses Ch1's track (no Ch8 track yet).
- `boss_music/` — `Prowler Sound Effect.mp3` (current boss loop) + `Techno - Tetris (Remix).mp3` (new) → **R3**.
- `kenney_impact-sounds/` (footsteps, wired), `kenney_interface-sounds/` (UI select, wired),
  `kenney_music-jingles/` (victory jingle, wired), `kenney_rpg-audio/` (doors/books — unused, available for diegetic SFX).

### `src/assets/images/`
- Heroes wired: eric, jacob, nick_f, nick_h, **jordan, maharko**. Bosses wired: eric, audrey, florida, ben(=Michael), nick_f.
- `game_decor/Interiors_free/` — LimeZu Modern Interiors (furniture/floors) → **R1**.
- `game_decor/stages/` — per-level hero textures (hospital, jungle gym, watchwater house) → **R1**.
- `game_decor/special/cars/` — three crew cars → **R2**. `game_decor/nature/` — flower/bush/tree pixel packs (parks/cabin).
- `game_decor/Old/` — RPG-Maker tilesets (check license before shipping).
- `shield.jpg` — candidate for the QTE shield icon → **R6**.

### `src/assets/fonts/`
~40 pixel/display webfonts (each: `Web Open Font Format (.woff)/` + PNG previews; root `PREVIEW.png` is a contact sheet).
Jupiteroid wired as `--font-display`. Pick a body font for **R6**.

---

## 4. Architecture crib sheet

- **Stack:** React 19 + Phaser 3.90 + Vite + TS + Tailwind v4. No Phaser 4 APIs, no new heavy deps.
- **`src/game/ChapterScene.ts`** (~2400 lines) — the whole scene: beat engine (`startBeat`/`advanceBeat`), data-driven
  maps (`buildMapFromConfig`), atmosphere (`buildAtmosphere`), cinematics, boss system, audio. Dev hook:
  `window.__OMEGA_GAME__.scene.getScene('ChapterScene')`.
- **`src/data/chapters.ts`** — all 8 chapters: `MapConfig` (+ `theme`, `areaTitle`, `propType`/`propKey` on rects),
  `Beat[]`, `actors` (`ActorPlacement`), optional `protagonistOverride` (Ch3 forces Jacob).
- **`src/components/GameLayout.tsx`** — state machine (hero → chapters → playing → complete), Phaser boot, title card,
  QTE modal, ledger header, mute toggle. **Side effects never go inside setState updaters** (StrictMode — see changelog).
- **`src/components/DialogueBox.tsx`** — typewriter (22ms/char; Space skips then advances), portraits, choices (keys 1–9).
- **`src/game/SpritePreprocessor.ts`** — `preprocessShowcaseSheet` BFS-slices a showcase JPG into an 8-row grid;
  row 0 = idle, row 1 = walk, etc. Idle uses the full row-0 (cause of **R4**).
- **Progress:** localStorage `omega-progress-v1`. Unlock check `isChapterUnlocked` in `src/game/progress.ts` (→ **R7**).
- **Dev server:** Vite caches transforms — restart the `omega-dev` preview after edits. `npx tsc --noEmit` +
  `vite build` clean before calling anything done. Browser-drive: pick hero → "Begin the Story" → chapter card; advance
  dialogue with a synthetic `Space` keydown on `window`, or `s.player.setPosition(s.walkTarget.x, s.walkTarget.y)` to
  satisfy a walkTo.

## 5. Known cosmetic issues (non-blocking)
- Console warns `Texture "hero_nick_f_sheet" has no frame "96"/"97"` — an anim references frames past the sliced sheet;
  clamp frame ranges in `registerAnim` callers.
- `chapters.ts` Ch2–8 still use deprecated `tag:` fields on some rects (ignored by renderer); migrate to `propType`/
  `propKey` opportunistically while doing **R1**.
