# Project Omega — Visual Overhaul Plan ("Stop Looking Like AI Slop")

This document is a self-contained work order. Any agent picking up a phase should read this file, the listed source files, and nothing else to get started. Phases are ordered by visual impact per hour of work. **Do each phase in its own session/branch and verify in the browser before moving on.**

---

## 0. Diagnosis — why it currently looks like slop

What's already good (do not redo):
- Hero/boss/enemy pixel-art sprite sheets in `src/assets/images/` are real art, auto-sliced by `src/game/SpritePreprocessor.ts` (BFS island detection → 128×128 frames, idle/walk/attack/hurt/victory/defeat anims).
- Text crispness (`label()` helper, 2× DPR), canvas sizing, the beat-driven story engine, and the React UI shell are solid.

What makes it read as AI slop:
1. **Every map is flat colored `add.rectangle()` calls** (68 of them in `ChapterScene.ts` map configs) — a couch is a red rectangle with the word "COUCH" printed on it.
2. **In-world ALL-CAPS debug labels everywhere** ("🍴 SINK (25 FORKS)", "SPOTIFY ADMIN DESK") — real games show, they don't caption.
3. **Zero lighting/atmosphere** — every scene is uniformly lit regardless of "midnight raid" or "3AM hot tub".
4. **No shadows under any sprite** — characters float on the floor plane.
5. **Zero audio.**
6. **No scene transitions** — chapters cut hard from React UI to gameplay.
7. **Particles/juice almost absent** — no dust, no impact frames, no ambient motion.

The fix is NOT more rectangles with better colors. It is: real tile/prop art, lighting, shadows, motion, and sound.

---

## 1. Art pipeline & non-negotiable art direction rules

**Style target:** top-down 2D pixel art, Stardew Valley / Eastward / CrossCode interior quality. 32×32 base tile. Camera is zoomed 2× so on-screen tiles render 64px — art must hold up at that size.

**Palette:** one global palette of ~48 colors (recommend "Apollo" or "Resurrect 64" — both free). EVERY generated asset gets quantized to this palette in the slicing step. Consistent palette is the single biggest "this is a real game" signal.

**Asset generation workflow (the user generates images with AI, agents wire them in):**
1. Agent writes a precise prompt spec for each needed sheet (exact grid layout, tile size, transparent or solid-magenta background, "no text, no labels, no watermark, single consistent palette").
2. User generates and drops files into `src/assets/images/` (or `src/assets/tiles/`).
3. Agent slices them with a new `preprocessTileSheet()` (grid-based, simpler than the BFS one — tiles are uniform 32×32 cells) and quantizes to the global palette.
4. **Every asset must have a procedural fallback** so the game never breaks when an image is missing — keep the current pattern.

**Rules for all phases:**
- ❌ No in-world UPPERCASE text labels on furniture/props. Delete the `tag:` rendering for solid objects. Story conveys what things are.
- ❌ No `add.rectangle()` visible to the player by the end of Phase A (collision-only invisible rects are fine).
- ✅ Room names may appear ONCE as a fading "area title" toast when the player enters (bottom-left, small caps, fades after 2s — like Breath of the Wild area names), not as permanent floating signs.
- ✅ Every visible object casts a soft shadow ellipse.
- ✅ Dialogue keeps the existing React DialogueBox (it's good) but gains character portraits (Phase D).

---

## 2. Phase A — Tilemap floors & walls (biggest single win)

**Goal:** replace flat-color backdrops and wall rects with real tiled floors/walls.

**Files:** `src/game/ChapterScene.ts` (`buildMapFromConfig`), `src/data/chapters.ts` (`MapConfig`), new `src/game/TilePreprocessor.ts`.

1. Extend `MapConfig` with `theme: MapTheme` where `MapTheme = 'apartment' | 'highway_night' | 'hospital' | 'park' | 'florida' | 'suburb_night' | 'cabin'`. Each theme maps to a tileset sheet + ambient settings (Phase B).
2. Needed tilesets (one 256×256 sheet each = 8×8 grid of 32px tiles). Write generation prompts, user generates:
   - `tiles_apartment.png` — wood floor (4 variants), rug center/edges/corners (9-slice), wall top, wall face, baseboard, door frame
   - `tiles_highway.png` — asphalt, lane line variants, shoulder grass, guardrail, rumble strip
   - `tiles_hospital.png` — linoleum checker, wall, window, curtain
   - `tiles_park.png` — grass (4 variants), dirt path + edges, mulch
   - `tiles_florida.png` — light asphalt, sandy shoulder, palm shadow, parking lines
   - `tiles_suburb_night.png` — dark asphalt, sidewalk, lawn, driveway
   - `tiles_cabin.png` — plank floor, stone hearth, deck boards, snow-grass outside
3. Implement floor painting: deterministic-RNG scatter of the 4 floor variants per cell (seeded by cell coords so it's stable), 9-slice rugs/paths from rect regions. Use `Phaser.GameObjects.TileSprite` or a single pre-baked `RenderTexture` per map (pre-baking the whole floor into one RenderTexture at create() is the fast path — one draw call).
4. Walls: replace boundary + interior wall rects with wall-face + wall-top tiles (2-tile tall look for the classic top-down depth illusion). Keep invisible static physics bodies exactly where the rects were — **do not touch collision geometry, it's tuned.**
5. Procedural fallback: if a tileset image is missing, generate a 2-color checker + noise tile in code (still better than flat fill).

**Acceptance:** screenshot of Ch.1 and Ch.8 shows zero flat-color floors; floors have visible tile variation; walls have a top/face. `npx tsc --noEmit` clean.

---

## 3. Phase B — Props, shadows, and label removal

**Goal:** every piece of furniture/scenery is a sprite, everything casts a shadow, all permanent in-world labels are gone.

**Files:** `ChapterScene.ts`, `chapters.ts`, new `src/assets/images/props_*.png`.

1. Extend `MapRect` → allow `propKey?: string`. When present, render a sprite from the props atlas instead of a rectangle; rect dims become only the physics body.
2. Prop sheets needed (showcase-sheet style, BFS-sliceable with the EXISTING `preprocessShowcaseSheet`): `props_interior.png` (couch front/side, TV + stand, desk + monitor glow, kitchen counter, sink with dish pile, fridge, beds king/queen/twin, arcade cabinet, hot tub), `props_exterior.png` (trees 3 sizes, bushes, street lamp ON, mailbox, bench, jungle gym, tollbooth, firepit lit/unlit), `props_vehicles.png` (C55 AMG, Tucson, Mustang red, Camaro black, GLI — top-down and side views).
3. Shadows: one shared radial-gradient `shadow` texture (generated procedurally once). Under every actor, the player, the boss, and every prop: `add.image(x, y+h/2, 'shadow').setAlpha(0.3).setScale(...)` at depth just under the sprite. Player shadow follows in `update()`.
4. **Delete permanent labels:** remove the `tag` text rendering from `addMapObject` and decorative rects; remove `createRoomLabel` signs. Implement the fading area-title toast (screen-space, `setScrollFactor(0)`, triggered by `walkTo`-style invisible zones or simply on chapter start).
5. Y-sorting: set `sprite.setDepth(sprite.y)` for player, actors, and props so characters walk behind/in front of furniture correctly. (Currently everything has hardcoded depths — this is the standard top-down fix.)

**Acceptance:** Ch.1 screenshot shows a real couch/TV/desk with shadows, no floating ALL-CAPS text anywhere in-world; player visibly passes behind tall props.

---

## 4. Phase C — Lighting, atmosphere, and per-chapter mood

**Goal:** each chapter has a distinct cinematic mood. This is the phase that makes screenshots look AAA.

**Files:** `ChapterScene.ts`, `chapters.ts` (theme → ambient config).

1. **Ambient color grade:** full-screen `setScrollFactor(0)` rectangle with `BlendModes.MULTIPLY` tinted per theme + a subtle vignette texture (procedural radial gradient, alpha ~0.35):
   - apartment: warm 0xfff1d6 @ low strength · highway_night: deep blue 0x2a3a6a strong · hospital: cold white-green · park: golden-hour 0xffd9a0 · florida: saturated sunset 0xff9a5a · suburb_night: near-black blue + strong vignette · cabin: amber firelight
2. **Point lights:** Phaser Light2D pipeline (`this.lights.enable()`, sprites `setPipeline('Light2D')`) for night chapters — headlight cones on cars (Ch.2/5), porch light + window glow (Ch.6), firepit flicker + hot-tub glow (Ch.8), TV glow (Ch.1/7). If Light2D fights with the canvas-derived textures, fallback: additive-blend radial-gradient sprites as fake lights with a flicker tween — visually 90% as good, zero pipeline risk.
3. **Ambient particles** (Phaser particle emitters, all subtle): dust motes drifting in interiors, fireflies in park/cabin-night, passing-car light streaks on highway, leaves in suburb, steam wisps over hot tub.
4. **Animated environment:** TV screens get a 2-frame flicker; sink drips; firepit gets a 4-frame flame strip (procedural orange flicker is fine); car headlights pulse subtly.

**Acceptance:** side-by-side screenshots of Ch.2 (night highway) vs Ch.5 (Florida sunset) look like different times of day; Ch.6 reads as genuinely dark with pooled lamp light; at least 3 chapters have visible ambient particles.

---

## 5. Phase D — Game feel, transitions, and cinematic dressing

**Goal:** motion quality. Everything that moves should feel intentional.

**Files:** `ChapterScene.ts`, `GameLayout.tsx`, `DialogueBox.tsx`, `index.css`.

1. **Chapter title cards:** on chapter start, 1.8s full-screen card (black, chapter number in small caps, title in large serif/pixel font, location + date below, fade in/out). Do it in React over the canvas — cheap and crisp.
2. **Transitions:** `camera.fadeOut/fadeIn(400)` around chapter start/end; iris-wipe or fade between React screens (hero select → chapters → game) instead of hard cuts.
3. **Letterbox bars** (top/bottom 10% black, tweened in) during `cameraPan` beats and boss intros — instant "cutscene" signal.
4. **Boss intro juice:** on `bossFight` beat — letterbox in, camera punches to boss, boss name appears with a heavy slam (scale 3→1 + shake 150ms), red flash, THEN fight starts.
5. **Combat feel:** 40ms hitstop on projectile hits; enemy white-flash tint on damage (already partial — verify); knockback impulse; damage numbers as small floating pixel text; boss death = slow-mo 300ms (`physics.world.timeScale`) + white flash + particle burst.
6. **Movement feel:** footstep dust puffs every ~250ms while walking; landing squash after dash (scaleY 0.85→1 spring); walk-direction sprite flipping verified everywhere.
7. **Dialogue portraits:** extract frame 0 of each character's processed sheet to a `portrait_<id>` texture in ChapterScene, expose via the story payload, render a 64×64 pixelated portrait (CSS `image-rendering: pixelated`) in DialogueBox next to the name. Typewriter text effect (~25ms/char, skippable).
8. **DialogueBox restyle:** since this game is about a group chat, style story dialogue as an iMessage-adjacent bubble (rounded, tail, speaker color edge) — diegetic and on-theme; keep the choices UI.

**Acceptance:** video/gif of Ch.1 boss intro shows letterbox + name slam; dialogue shows portraits + typewriter; chapter start shows title card with fade.

---

## 6. Phase E — Audio (currently the game is silent)

**Goal:** sound floor. Use Phaser's audio. Source: user generates with Suno/free packs (Kenney.nl SFX are free + good), or agent synthesizes simple SFX with WebAudio.

1. SFX: footsteps (per-surface: wood/asphalt/grass), dialogue blip (per-character pitch), choice select, coin-shot, hit, boss roar, victory sting, UI hover/click, doorbell (Ch.6 NEEDS the ding-dong), car engine idle/rev (Ch.2/5), crickets night loop, fire crackle.
2. Music: one looping track per theme (7 total) + a boss loop + a title theme. Crossfade on beat transitions (`bossFight` swaps to boss loop, fades back after).
3. Mute toggle in the React header, persisted to localStorage. Autoplay policy: start audio on first user gesture (hero confirm click).

**Acceptance:** full Ch.1 playthrough has continuous music, footsteps, dialogue blips, boss music swap, victory sting; mute toggle works and persists.

---

## 7. Phase F — React UI skin pass + final QA

1. Replace emoji icons (📊🚗🐔❄️) on hero cards with the actual `portrait_<id>` sprite frames; add idle-animated sprite preview on hover.
2. Chapter select: each chapter card gets a thumbnail (take an in-engine screenshot of each map once, save as static asset) + completion stamp.
3. Title screen: animated background (slow camera drift over the Ch.8 cabin map at night with fireflies) behind the hero select.
4. Consistent font stack: one pixel/display font for headings (e.g. "Press Start 2P" is too harsh — use "Pixelify Sans" or "Silkscreen"), keep JetBrains Mono for numbers/ledger.
5. QA sweep: play all 8 chapters end-to-end; check texture memory (pre-baked RenderTextures destroyed on shutdown); `npx tsc --noEmit` + `vite build`; delete dead `GameScene.ts` + `buildNeighborhoodMap()` + brainrot HUD remnants from `ChapterScene.ts`.

---

## 8. Per-chapter mood reference (for prompt writing & lighting values)

| Ch | Scene | Time | Mood / key light sources |
|----|-------|------|--------------------------|
| 1 | Apartment 1522 | evening | warm lamps, TV glow, cozy clutter |
| 2 | I-95 highway | 1AM | headlight cones, toll booth sodium-orange, deep blue night |
| 3 | Hospital room | morning | cold flat fluorescent, one warm window beam |
| 4 | Park / jungle gym | golden hour | long shadows, warm orange grade |
| 5 | Boca highway | sunset | hot pink/orange sky grade, palm silhouettes, neon |
| 6 | Suburban street | midnight | near-black, porch light pool, one lit window — tensest scene |
| 7 | Apartment 1522 | late night | same set as Ch.1 but colder grade + harsher contrast (betrayal) |
| 8 | Cabin, Basye VA | night | amber firelight, hot tub cyan glow, fireflies, snow-dusted exterior |

Ch.1 and Ch.7 sharing a set with different grades is intentional — it's a cheap, very cinematic trick.

---

## 9. Hard constraints (do not violate)

- Phaser **3.88.2**. No Phaser 4 APIs. No new heavy deps (no Spine, no pixi).
- Don't touch: canvas sizing logic (`syncCanvasToParent` + RAF), physics/collision geometry, the beat engine contract, `preprocessShowcaseSheet` hero slicing, localStorage progress keys.
- Every image asset needs a procedural fallback — missing file must never crash or blank a chapter.
- Verify each phase in the browser (dev server port 3000, `omega-dev` launch config; **restart the server after edits — Vite caches transforms**) and screenshot before/after.
- TS + `vite build` clean at the end of every phase.
