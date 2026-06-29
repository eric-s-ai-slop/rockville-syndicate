> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# SPRINT 2 MASTER PLAN — Complete asset overhaul (kill the primitive props)

**Audience:** the human integrator coordinating an isolated agent swarm. Hand each agent **only its
`TASK-S2-XX.md`** plus the repo. Keep this master file for yourself (architecture + merge order + the
missing-asset report you asked for).

---

## 0. The problem, precisely

Almost every in-world object is drawn as a **code-generated primitive** (colored rectangle + a few lines)
by `ChapterScene.drawPropShape()` — couches, TVs, desks, fridges, beds, counters, the toll booth, guardrails,
plus dozens of bare colored rectangles (windows, walls, "the squares"). The repo ships a full furniture art pack
that is **almost entirely unused**.

Two screenshots from the owner confirm it: the apartment (Ch1) shows rectangle couches/TVs/fridge/windows; the
highway (Ch2) shows a rectangle "toll booth," rectangle guardrails, and a stray green square.

### Why it's unused
The art is **packed tilesheets**, and the codebase has **no slicing system**:
- `src/assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png` — **768×4272** furniture sheet
  (16 cols × 89 rows at 48px). Living room, bedroom, kitchen, bathroom, office furniture.
- `.../Room_Builder_free_48x48.png` — **816×1104** walls + floor tiles (+ a door/ceiling section).
- (32×32 and 16×16 variants of both also exist — prefer **48×48** for crispness at this zoom.)
- `src/assets/images/game_decor/nature/` — bushes + flowers (already wired for outdoor scatter).

The existing `generatePropsAtlas()` only repacks **whole-image** showcase props (cars, hospital items). It does
**not** slice furniture out of the tilesheets. That pipeline is what Sprint 2 builds.

---

## 1. Architecture (what we're building)

```
TASK-01  Furniture pipeline + catalog        ← FOUNDATION (everything depends on this)
   │       • slice the LimeZu sheets into individual, background-trimmed sprites
   │       • a labeled catalog: semantic name → sprite (stable names = the contract below)
   ▼
TASK-02  Renderer rewire (drawPropShape)      ← consumes the catalog by semantic name
   │       • propType → default catalog sprite; propKey → specific catalog sprite
   │       • aspect-correct, Y-sorted, shadowed; primitive shape only as last-resort fallback
   ▼
TASK-03..07  Per-chapter prop passes          ← assign propType/propKey to every rect, tune sizes
TASK-08      Asset-pack props (UNBLOCKED)      ← toll booth, guardrail, hot tub, arcade (firepit=procedural)
```

**Key de-risking decision — auto-slice, don't hand-pick pixels.** The furniture in the LimeZu sheet sits on a
transparent background with gaps between items. Rather than have agents eyeball pixel coordinates for ~hundreds of
items (error-prone, inconsistent across a swarm), **TASK-01 reuses the existing connected-component extractor**
(`src/game/SpritePreprocessor.ts` BFS islands / the Sprint-1 `PropExtractor`) to auto-cut each item into its own
trimmed sprite, then a human/agent **labels** them once via a generated numbered preview. This reuses proven code
and removes pixel-precision guesswork. (A manual coordinate fallback is allowed where auto-slice merges adjacent
items — see TASK-01.)

### 1.1 The Catalog Naming Contract (STABLE — downstream tasks reference these names)
TASK-01 must expose these semantic keys (omit any genuinely absent from the free pack and note it). TASK-02 maps
`propType` → these; per-chapter tasks may target a specific key via `propKey: 'furn:<name>'`.

```
Living/office: couch, couch_long, armchair, ottoman, coffee_table, tv, tv_stand,
               bookshelf, desk, office_chair, chair, stool, floor_lamp, table_lamp,
               rug_small, rug_large, plant_small, plant_tall, plant_palm, globe, chalkboard
Bedroom:       bed_single, bed_double, nightstand, wardrobe, dresser, mirror
Kitchen:       counter, counter_corner, sink, fridge, stove, cabinet_upper, fruit_bowl
Bathroom:      toilet, bathtub, bath_sink
Structure:     window, door_closed, door_open   (door/window from Room_Builder sheet)
```
Naming convention for the texture/atlas frames: **`furn_<name>`** (e.g. `furn_couch`, `furn_bed_double`).
Per-chapter authors reference them in `chapters.ts` as `propKey: 'furn_couch'` (TASK-02 makes `propKey` values
starting with `furn_` resolve against the catalog atlas).

### 1.2 propType → catalog mapping (TASK-02 implements; per-chapter tasks may override per-rect)
| propType | default catalog sprite | notes |
|---|---|---|
| couch | `furn_couch` (or `furn_couch_long` if w>150) | |
| tv | `furn_tv` | optionally place `furn_tv_stand` under it |
| desk | `furn_desk` | pair with `furn_office_chair` |
| counter | `furn_counter` | tile horizontally if wide |
| sink | `furn_sink` | |
| fridge | `furn_fridge` | |
| bed | `furn_bed_single`/`furn_bed_double` by width | |
| rug | `furn_rug_large` | keep as floor decal (depth −10) |
| bench | `furn_bench` | |
| window | `furn_window` | from Room_Builder |
| door | `furn_door_closed` / `furn_door_open` | |
| car | existing car showcase sprites / generic — see §4 | |
| tree | nature pack / procedural (keep) | |
| junglebox | existing `prop_jungle_gym` showcase (keep) | |
| tollbooth, guardrail, firepit, hottub, arcade, road | **NO interior asset** — see §4 | |

---

## 2. Files & ownership (conflict map)

| Task | Primary files | Touches `drawPropShape`? | Touches `chapters.ts`? |
|---|---|---|---|
| 01 | NEW `src/game/furnitureCatalog.ts`, NEW slicing in `ChapterScene` preload/create | no | no |
| 02 | `ChapterScene.ts` `drawPropShape` + `drawDecorativeRect` + `PROP_DISPLAY` | **yes (owns it)** | no |
| 03 | `chapters.ts` Ch1 + Ch7 blocks | no | yes (apartment blocks) |
| 04 | `chapters.ts` Ch8 cabin block | no | yes (cabin block) |
| 05 | `chapters.ts` Ch3 hospital block | no | yes (hospital block) |
| 06 | `chapters.ts` Ch2 + Ch5 (highway/florida) | no | yes (those blocks) |
| 07 | `chapters.ts` Ch4 + Ch6 (park/suburb) | no | yes (those blocks) |
| 08 | `ChapterScene.ts` (new propType renderers) + possibly `chapters.ts` | yes (adds cases) | maybe |

**Only TASK-02 and TASK-08 touch `drawPropShape`.** Per-chapter tasks (03–07) only edit **data** in
`chapters.ts` — different chapter blocks = different regions = git auto-merges. This is deliberate: the swarm can
run all five chapter passes in parallel without colliding, because the renderer contract is fixed by 01+02 first.

---

## 3. Merge order (you, the integrator)

```
1. TASK-01  (catalog + slicing)          — must land first; produces furn_* textures
2. TASK-02  (renderer rewire)            — rebase on 01; everything visible flips to sprites here
   └─ After 02 lands, props already look real wherever propType is set, with primitive fallback.
3. TASK-03..07  (per-chapter passes)     — parallel; each rebases on 02. Different chapter blocks.
4. TASK-08  (asset-pack props)           — ✅ unblocked; rebase on 02. Toll booth/guardrail/hottub/arcade
```
TASK-02 alone makes the existing ~44 propType'd rects render as sprites. TASKS 03–07 are about **coverage**:
giving the remaining ~86 bare rectangles a real identity and tuning sizes/positions.

---

## 4. MISSING-ASSET REPORT (you asked me to flag these)

Present in the repo and usable now: all interior furniture (living/bed/kitchen/bath/office), walls + floor tiles
(Room_Builder), bushes + flowers (nature), and the existing showcase props (3 cars, hospital bed/IV/cabinet/toilet,
jungle gym, watchwater house).

**NOT present in any pack — decisions needed (TASK-08 covers each with a recommended fallback):**

| Missing prop | Where used | Recommendation |
|---|---|---|
| **Toll booth** | Ch2 highway | No asset. Build a *better composed* prop from primitives (booth body + window + striped barrier arm + roof) OR source a roadside-prop pack. **Flagging for you** — cheapest is an upgraded procedural; best is a new asset pack. |
| **Guardrail** | Ch2/Ch5 highway shoulders | No asset. Upgraded procedural (metal rail + posts), or a tiled rail sprite if you add one. |
| **Road / lane tiles** | Ch2/Ch5 | Procedural stripes already exist and read fine; low priority. |
| **Generic cars** (getaway/parked, no propKey) | Ch2, Ch6 | Reuse the 3 existing car showcase sprites (recolor/tint) as stand-ins, or add more car art. |
| **Firepit** | Ch8 cabin | No asset. Upgraded procedural (stone ring + animated flame particles — the scene already has a particle system) OR new asset. |
| **Hot tub** | Ch8 cabin | No asset. Upgraded procedural (tub + water + steam particles) OR new asset. |
| **Arcade cabinet** | Ch8 cabin | No asset. Upgraded procedural OR new asset (an arcade/electronics pack). |
| **Street lamp** | Ch6 suburb | Minor; procedural pole + `light_glow` (already used) is fine. |

**DECISION (owner, 2026-06-13):** the owner added 5 asset packs (`toolbooth.jpg`, `rail.jpg`, `pool.jpg`,
`arcade cab.jpg`, `cars.jpg` under `special/`). The architect pinned every needed sprite — see
**`asset_pack_seed.json`**. **TASK-08 is now UNBLOCKED** and is a concrete extraction+wire task. Toll booth uses
BOTH a flat front-elevation backdrop + barrier arms across the lane. **Firepit still has NO asset** → stays
procedural (stone ring + flame particles). Cars: reuse the existing 3 hero cars for stubs (the new cars pack is a
messy parking-lot scene; optional).

**Catalog labeling (owner, 2026-06-13):** the architect hand-labeled the furniture from the sheet. A verified seed
catalog with exact coordinates lives at **`plans/sprint2/furniture_catalog_seed.json`**, with tooling + montages in
`plans/sprint2/assets/`. TASK-01 starts from that seed and only needs to finish the kitchen/bath/plant/lamp tail.

---

## 5. House Rules (in every task brief; enforce on review)
- **Never change physics/collision rects.** Visual is decoupled from the body (`addMapObject` makes an invisible
  body; `drawPropShape` draws the visual). Sprites may visually exceed the body — that's fine and intended.
- Every asset load has a graceful fallback (`safeLoadImage` + `this.textures.exists(...)`). A missing sprite must
  fall back to the existing primitive shape, never crash.
- Filenames with spaces/parens → Vite `?url` import. No new heavy deps. Phaser **3.88.2** (no Phaser 4 APIs).
- **No side effects inside React setState updaters** (StrictMode double-fires) — not relevant to most S2 tasks but
  holds if you touch React.
- Respect the **Y-sort depth budget** (floor −200; props/chars ~0–700; see top of `ChapterScene.ts`). Props use
  `setDepth(y)`; tall props (wardrobes, trees) may add a small offset so the player can walk behind them.
- Done = `npx tsc --noEmit` clean **and** `npm run build` clean. Run the affected chapter(s) and report what you
  saw. Keep diffs surgical; don't reformat untouched code.

## 6. Verification
`npx tsc --noEmit` · `npm run build` · `npm test` · then `tsx server.ts` (port 3000 / vite dev 5173) and walk the
chapter. A prop change is only "done" when you've looked at it in-game and it's a sprite, not a rectangle.