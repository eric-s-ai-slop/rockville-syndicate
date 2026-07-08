# Origins — Asset Wire-Up Verification (2026-07-07)

Eric generated the art; images were visually inspected and checked against
`11_art_order_sheet.md`, `08_maps.md`, and the engine. **Six of seven assets are correct
and have been COPIED into their engine locations.** One MUST-HAVE image is missing (a
decision for Eric, below). One minor aspect note. Nothing blocks the build.

## STATUS OF EACH DELIVERED ASSET

| Asset | Visual check | Placed at (engine path) | Aspect vs rect |
|---|---|---|---|
| `stage_mcdonalds_night.jpg` | ✅ correct — red booths, counter/soda fountain, menu boards, night windows, entrance doors, wet-floor cone; layout matches §3 rects | `src/assets/images/game_decor/stages/origins/` | img 1.49 vs rect 900×620 (1.45) → ~3%, invisible |
| `stage_eric_room_present.jpg` | ✅ correct — dark room, monitor is the only light, desk + face-down phone, bed, night window, door | same dir | img 1.34 vs rect 700×520 (1.35) → exact |
| `stage_void_nickf_room.jpg` | ✅ correct — desk/monitor with chat glow, phone on desk, unmade bed, chair | same dir | img 1.34 vs island rect 300×220 (1.36) → ~2% |
| `stage_void_jacob_room.jpg` | ✅ correct — MADE bed, open textbook on desk, keys on a hook by the door (all prose details present) | same dir | img 1.34 vs 300×220 (1.36) → ~2% |
| `stage_dogwood_lookout_night.jpg` | ✅ correct — baseball backstop, concrete lookout w/ stairs, parking lot + lone car under a lamp, night | same dir | ⚠️ img 1.49 vs rect 1000×720 (1.39) → ~7% vertical stretch (see note) |
| `prop_dialer_site.jpg` | ✅ correct — two blank fields + one gray button, NO text/logo/brand (as required) | same dir | n/a (screen-space, not stretched) |
| `npc_chris_rivas_sheet.jpg` | ✅ correct — olive hoodie, front/side/back walk rows; ratio **1.833 = identical to existing `npc_rose/alex/benji` sheets** | `src/assets/images/` (root, alongside other npc sheets) | n/a (auto-sliced) |

## ⚠️ ONE MISSING MUST-HAVE IMAGE — ERIC DECIDES

`stage_void_eric_room.jpg` (order sheet MUST-HAVE **item 3**) — **the third island, Eric's
2024 operator bedroom, i.e. the reveal room in Scene 5** — was NOT among the delivered
files. This is the single most important location in the chapter (the pan that lands on
it IS the reveal).

**DECISION (Eric, 2026-07-07): Eric will GENERATE it.** Target file:
`src/assets/images/game_decor/stages/origins/stage_void_eric_room.jpg`, ~4:3 (300×220
rect). Generation prompt is `11_art_order_sheet.md` item 3 (also pasted for Eric in chat).
ONE lit image only — the engine handles the dark (Act I cover rect) / lit (Act II) states
per §4.2; do NOT generate a dark variant. Until the file lands, the build agent ships the
third island procedural (rects in §4.1) so the chapter still runs; swap the `stage_` rect
in when the image arrives.

The CAN-DEFER winter variant (`stage_void_eric_room_winter.jpg`, item 9) is also absent —
correctly, it was deferred; the winter dressing is three rect deltas per §9.

## ⚠️ MINOR — DOGWOOD ASPECT

`stage_dogwood_lookout_night.jpg` is 1.49; its map rect is 1000×720 (1.39) → ~7% vertical
stretch. It's an outdoor night scene (no straight-line/face reference), so the stretch is
mild, but cleaner options: (a) accept it; (b) center-crop the image to 1.39 (2356×1696,
trims ~86px of edge trees each side); or (c) set the Dogwood **stage rect** to `h: 670`
(keep the map 1000×720; the painted rect covers 1000×670 centered, leaving a thin
engine-black top/bottom margin that reads as night). Recommend (a) or (b). Not a blocker.

## WIRE-UP INSTRUCTIONS FOR THE BUILD AGENT

Assets are already in the engine dirs above. In `chapter12.origins.ts` / `ChapterScene.ts`:

1. **Import + register each `stage_`/`prop_` image** following the existing pattern in
   `ChapterScene.ts` (ES import of the `.jpg` + `this.safeLoadImage('<key>', url)`; key =
   filename base, e.g. `stage_mcdonalds_night`). Existing chapter-11 stage imports are the
   reference.
2. **Attach each stage image via an invisible fullscreen rect** in the matching map (exact
   rects are in `11_art_order_sheet.md` per item and `08_maps.md`):
   `{ x, y, w, h, fill: 0x000000, propKey: 'stage_<name>', invisible: true }`. `MapBuilder`
   sees `propKey.startsWith('stage_')` and hard-stretches to the rect.
   - McDonald's (MAP_L1): `{ x:450, y:310, w:900, h:620, propKey:'stage_mcdonalds_night', invisible:true }`
   - Eric room present (MAP_L0, scenes 0 & 11): `{ x:350, y:260, w:700, h:520, propKey:'stage_eric_room_present', invisible:true }`
   - Nick F island (MAP_L2_ACT1/ACT2): `{ x:360, y:620, w:300, h:220, propKey:'stage_void_nickf_room', invisible:true }`
   - Jacob island (MAP_L2_ACT1/ACT2): `{ x:2040, y:620, w:300, h:220, propKey:'stage_void_jacob_room', invisible:true }`
   - Eric third island (MAP_L2_ACT2): per Eric's decision above — if image, `{ x:1200, y:1150, w:300, h:220, propKey:'stage_void_eric_room', invisible:true }`; in MAP_L2_ACT1 it stays the near-black rects (the hidden-island lock in §4.2 — do NOT paint it in Act I).
   - Dogwood (MAP_L4): `{ x:500, y:360, w:1000, h:720, propKey:'stage_dogwood_lookout_night', invisible:true }` + set `noNatureScatter: true` on MAP_L4 (the painted trees replace procedural scatter). Adjust `h` per the aspect note if cropping isn't done.
3. **Chris Rivas:** register `npc_chris_rivas_sheet.jpg` the same way existing npc sheets
   are registered in `ChapterScene.ts` (they go through `SpritePreprocessor` auto-slicing;
   the sheet's 1.833 ratio matches `npc_rose/alex/benji` exactly, so it slices the same
   way). Speaker/actor id `chris_rivas`. **Verify in playtest that he animates** (walk
   cycle) — if the 3-row sheet only yields a front idle, that's an acceptable fallback for
   a one-scene background character (he was a tinted blob before). Scene 1 only.
4. **Dialer (`prop_dialer_site.jpg`):** NOT a stage bg — do not give it a `stage_` prefix.
   Load as a plain image; the `doubleCall` mode draws it in **screen space**
   (`setScrollFactor(0)`, depth ≥ 9600, all coords/sizes via `screenSpace()` `zx/zy/s`),
   with every field/ghost/button label rendered on top via `ctx.label()` (per
   `07_mechanics.md` §0.3). Used by the founding/rerun/unsent variants.
5. **Once images are in, run the map-coordinate realignment pass** (`08_maps.md` INTEGRATION
   NOTE): the actor/prop coordinates were authored to the painted layouts, but eyeball each
   stage in playtest and nudge actor coords to sit on the painted furniture (booth seats,
   desks, the car).

## STILL PROCEDURAL (no art, by design — do not add)
The void/corridor between islands (engine-black + `'void'` theme), the Sub Zero Squad
"capital" scene, the coda dressing, and Scene 2's car (reuses existing
`stage_car_interior.jpg`). Painting any of these fights the reveal or the cold ending
(order sheet INTEGRATION NOTES).
