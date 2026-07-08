# Origins — Art Order Sheet

Everything visual this chapter needs to look great, with a complete AI-generation prompt for each asset. Pulled from `08_maps.md` (rects, dimensions, themes), the four prose batches in `06_scenes/` (sensory detail), and `07_mechanics.md` §0 (the `doubleCall` UI). Unlike the cabin chapter, **nothing here hard-blocks the build** — the maps in `08_maps.md` were designed to ship fully procedural — so MUST HAVE means "the chapter does not read as intended without it," not "the build breaks." This is a shopping list: generating these images is the whole task; wiring them is Step 5 (see INTEGRATION NOTES at the bottom).

**5 MUST HAVE — the chapter's signature imagery. 3 NICE TO HAVE. 1 CAN DEFER.**

Global constraints honored throughout (do not violate when re-rolling):
- **The website/tool is NEVER named, branded, or logo'd.** Any UI art is a generic gray dialer — no wordmark, no URL, no favicon.
- **No cruel imagery.** No caricature of any real person; Chris Rivas gets a normal, dignified sprite.
- **The void's blackness is a feature.** Scenes 3–6, 9, and 10 depend on darkness the engine already provides for free. Two locations are explicitly ruled NO ART below — do not "improve" them.
- **No characters in any background image.** Actors are sprites; a baked-in person will fight the placed actors.
- All main-cast sheets exist (`hero_eric`, `hero_jacob`, `hero_nick_f`, `hero_nick_h`, `hero_maharko`, `ben`/`micheal_bersofsky`) — zero re-requests. `stage_car_interior.jpg` exists and is REUSED for Scene 2. Generic furniture comes from the procedural prop atlas.

---

## MUST HAVE

### 1. The 3 a.m. McDonald's — `stage_mcdonalds_night.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_mcdonalds_night.jpg`
**Type:** full-scene stage background.
**Where used:** `MAP_L1` — the single highest-mileage image in the chapter. Serves THREE scenes[] entries on one map: scenes[1] (Scene 1, the founding night), scenes[5] (Scene 7, the call-logs booth), scenes[7] (Scene 8b, the first-hangout booth). The Scene 7/8b "booth" is NOT a separate asset — same room, same image, different actors.
**Map rect:** one invisible rect covering the whole map — `{ x: 450, y: 310, w: 900, h: 620, fill: 0x000000, propKey: 'stage_mcdonalds_night', invisible: true }`. Target rect is **900×620 → generate at ~3:2 landscape** (900/620 = 1.45; the engine hard-stretches with no cropping, so 3:2 lands within ~3% distortion — invisible).
**Layout must match the rects in `08_maps.md` §3** so actor coordinates line up: window wall across the top; booth cluster left; counter top-right; door bottom-center.

> Top-down pixel art interior floorplan of a fast-food burger restaurant lobby at 3 a.m., clean top-down view with thick dark wall outlines and a visible floor-tile grid. The whole frame is the interior — walls at the image edges. No people anywhere. No brand logos, no wordmarks, no legible signage text — generic fast-food design only (red and warm-yellow accents are fine).
>
> Along the entire top wall: a band of floor-to-ceiling windows showing pure black night outside, with faint cold reflections of the interior lights on the glass.
>
> Left side, against the windows: the hero booth — two red vinyl bench seats facing each other across a cream laminate table (a four-seat window booth). Center: a second, smaller red booth as set dressing, and near it a small cream two-top table with a loose chair.
>
> Top-right: a stainless-steel ordering counter with registers, and behind/above it dark menu boards and a soda fountain machine; the counter area gets the brightest overhead fluorescent pool of light.
>
> Bottom-center: the entrance — glass double door in a gray frame. Lower-middle of the floor, off to one side: a single yellow wet-floor cone, and a subtle wet sheen streak on the tile near it.
>
> Lighting: harsh, even fluorescent white-cyan — the "never fully closes, never fully opens" 3 a.m. state. Nothing warm, nothing cozy. Greige/beige floor tile with a clear repeating tile grid, slightly reflective as if freshly mopped.
>
> 16-bit RPG top-down interior floorplan style: soft pixel outlines, muted palette (greige tile, red vinyl, steel gray, black window band), no characters, no text. Generate at a 3:2 landscape aspect ratio (wider than tall, not ultra-wide).

### 2. Eric's room, present day — `stage_eric_room_present.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_eric_room_present.jpg`
**Type:** full-scene stage background.
**Where used:** `MAP_L0` — scenes[0] (Scene 0, "The Last Save Slot," the cold open) and scenes[10] (Scene 11, "Does It Matter," the coda). The chapter's first and last image; the coda's long protected hold happens on top of it, so it has to sustain a minute-plus of staring.
**Map rect:** `{ x: 350, y: 260, w: 700, h: 520, fill: 0x000000, propKey: 'stage_eric_room_present', invisible: true }`. Target rect **700×520 → generate at ~4:3 landscape** (700/520 = 1.35).
**Layout must match `08_maps.md` §2:** desk upper-center, bed lower-left, window right, door bottom-center. Note the engine adds `screenTint(0x000014, 0.35)` on top and deepens it in the coda — so the image itself should be dark but legible; the tint does the final crush.

> Top-down pixel art floorplan of a small bedroom at night, lit only by a computer monitor — clean top-down view, thick dark wall outlines, visible dark wood plank floor. The whole frame is the room; walls at the image edges. No people. No text.
>
> Upper-center: a wooden desk with a desk chair pulled slightly out. On the desk: one monitor, glowing — the ONLY light source in the room — casting a cold pale blue pool of light onto the desk surface and a soft falloff circle onto the floor around the chair. Beside the monitor on the desk: a phone lying face-down (a small dark rectangle), and a mouse and keyboard.
>
> Lower-left: a bed against the wall, covers in a lived-in state (neither hospital-neat nor a disaster), rendered in deep desaturated blue-gray because it sits outside the monitor light. Right wall: one window with blinds, showing near-black night with the faintest suggestion of streetlight. Bottom-center: a plain closed wooden door.
>
> Everything outside the monitor's pool of light falls off into heavy shadow — the room should read as "shapes": furniture silhouettes legible, colors almost gone, corners genuinely dark. Bare walls — no posters, no decorations.
>
> Palette: very dark warm wood browns (floor near-black coffee tones), slate blues, one cold blue-white light source. 16-bit RPG top-down interior floorplan style: soft pixel outlines, visible plank/tile grid where the light reaches, no characters. Generate at a 4:3 landscape aspect ratio.

### 3. The third island — Eric's 2024 bedroom — `stage_void_eric_room.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_void_eric_room.jpg`
**Type:** stage background for ONE island (not the whole void — see the warning in INTEGRATION NOTES).
**Where used:** `MAP_L2_ACT1` (hidden/dark), `MAP_L2_ACT2` (the reveal, Scenes 5–6), `MAP_L2_WINTER` (Scene 10, with winter deltas on top). This is the room the entire chapter pivots on — "Look at the room, since you're finally allowed to."
**Map rect:** the island spans x 1050–1350, y 1040–1260 → `{ x: 1200, y: 1150, w: 300, h: 220, fill: 0x000000, propKey: 'stage_void_eric_room', invisible: true }`. Target rect **300×220 → generate at ~4:3 landscape** (300/220 = 1.36).
**THE DARK/LIT REQUIREMENT (per `08_maps.md` §4.2):** do NOT generate two images. Generate ONE lit image and let the engine handle the two states: in `MAP_L2_ACT1` the island is covered by an opaque near-black rect (`0x050505`, constructed with `fillAlpha: 1` per the root-CLAUDE.md rectangle gotcha) drawn above the image, so the room is literally present at final coordinates but illegible — the maps doc's belt-and-suspenders lock, preserved. `MAP_L2_ACT2` simply omits the cover. The reveal pan lands on pixels that were always there, which is the thesis.
**Layout must match `08_maps.md` §4.1:** desk center-upper with monitor, phone FACE-UP on the desk's right side, half-full glass of water left of the desk, bed lower-left periphery, bare walls.

> Top-down pixel art floorplan of a small, ordinary bedroom at 11:40 p.m., summer — clean top-down view, thick dark wall outlines, dark wood plank floor with a visible grid. The whole frame is the room; walls at the image edges. No people. No text.
>
> Center, upper half: a wooden desk — the desk is clearly the most important thing in the room, the capital. On it: a monitor glowing a cool desaturated blue (a browser-light glow, not a gaming rainbow), a keyboard, a phone lying FACE-UP just right of the keyboard (tiny lit rectangle), and a drinking glass of water filled exactly halfway, left of the keyboard. A plain desk chair.
>
> Lower-left, pushed to the room's periphery: a bed that is neither made nor unmade — covers pulled roughly up, one fold wrong. The bed reads as an afterthought; the desk reads as the point.
>
> Walls: completely bare. No posters, no photos, no shelves, no flags — nothing on the walls confesses to anything. A verdict of "a guy." One small warm desk lamp OFF; the light is monitor-blue plus a soft neutral ambient so the furniture stays legible.
>
> Palette: muted warm dark browns for wood, slate blue-grays, one cool blue light pool at the desk. 16-bit RPG top-down interior floorplan style: soft pixel outlines, muted colors, warm-dark room with a cold-lit center, no characters. Generate at a 4:3 landscape aspect ratio (slightly wider than tall).

### 4. Nick F's room island — `stage_void_nickf_room.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_void_nickf_room.jpg`
**Type:** stage background for one island.
**Where used:** left island of `MAP_L2_ACT1` / `MAP_L2_ACT2` (Scenes 3, 4, 5, 6) — on screen through the funniest, longest stretch of the chapter; also present (near-black) in `MAP_L2_WINTER`. Items 3–5 ship as a SET: if the reveal pan lands on a painted room while the two Act I rooms are colored rectangles, the mismatch itself telegraphs the reveal. All three islands or none.
**Map rect:** island spans x 210–510, y 510–730 → `{ x: 360, y: 620, w: 300, h: 220, fill: 0x000000, propKey: 'stage_void_nickf_room', invisible: true }`. Target rect **300×220 → generate at ~4:3 landscape**.
**Layout must match `08_maps.md` §4.1:** desk + gaming chair upper-RIGHT, monitor glow, phone on the desk, unmade bed lower-left, hoodie on the floor center-left. The prose spec: "a gaming chair that cost more than the desk it sits at, a monitor doing most of the lighting, a hoodie on the floor still holding the shape of its owner, a fitted sheet in a long-term dispute with its mattress."

> Top-down pixel art floorplan of a messy gamer's bedroom at night — clean top-down view, thick dark wall outlines, dark wood plank floor with a visible grid. The whole frame is the room; walls at the image edges. No people. No text.
>
> Upper-right: a cheap desk with an expensive black-and-red racing-style gaming chair — the chair visibly nicer than the desk. On the desk: a large monitor mid-game, glowing bright blue-white (the room's main light source), a headset hooked on the monitor corner, a phone lying flat beside the keyboard, an energy-drink can. Cables spilling off the desk edge.
>
> Lower-left: an unmade single bed — fitted sheet half peeled off the mattress corner, blanket twisted, pillow askew. Center-left floor: a gray hoodie dropped in a heap that still holds a body's shape. One or two more small floor items (a sock, a crumpled wrapper) — lived-in, not a dump.
>
> Lighting: monitor blue-white dominating from the upper-right, thin warm spill from a small lamp, corners dim. Palette: dark warm browns, charcoal, one hot blue light pool, a red accent on the chair. 16-bit RPG top-down interior floorplan style: soft pixel outlines, muted colors, no characters. Generate at a 4:3 landscape aspect ratio (slightly wider than tall).

### 5. Jacob's room island — `stage_void_jacob_room.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_void_jacob_room.jpg`
**Type:** stage background for one island.
**Where used:** right island of `MAP_L2_ACT1` / `MAP_L2_ACT2` (Scenes 3, 4, 5, 6); near-black in `MAP_L2_WINTER`. Part of the three-island set (see item 4). This room does silent character work the sprites can't: "the room testifies to a careful person" — it is the only rebuttal Jacob ever gets, so the neatness must read at a glance, in contrast with item 4.
**Map rect:** island spans x 1890–2190, y 510–730 → `{ x: 2040, y: 620, w: 300, h: 220, fill: 0x000000, propKey: 'stage_void_jacob_room', invisible: true }`. Target rect **300×220 → generate at ~4:3 landscape**.
**Layout must match `08_maps.md` §4.1:** MADE bed lower-right, desk upper-left with open stats textbook + highlighter + phone on the textbook, keys on a hook by the left (door) edge. The ringOnly mode anchors a ring-glow at the phone (world coords 1972, 566 → upper-left desk area) and the voicemail night darkens this whole island with an overlay — the image needs no dark variant.
**Ethics note baked into the art:** tidy and dignified, never fussy or comic. No visual joke anywhere in this room.

> Top-down pixel art floorplan of a tidy, careful person's bedroom at 11:40 p.m. — clean top-down view, thick dark wall outlines, warm dark wood plank floor with a visible grid. The whole frame is the room; walls at the image edges. No people. No text (book pages may show abstract line-suggestions, not readable words).
>
> Lower-right: a neatly MADE single bed — covers squared and tucked, pillow centered, visibly the neatest object in the frame. The made bed is the room's thesis; render it with care.
>
> Upper-left: a modest wooden desk with a straight-backed chair pushed in. On the desk: an open textbook lying flat (cream pages, two visible column blocks suggesting statistics tables), a yellow highlighter resting in the gutter of the spine, and a phone lying face-down ON the open textbook. A small warm desk lamp, ON — the room's light: warm, even, domestic.
>
> On the left wall near the door edge: a small hook with a car-key fob and two keys hanging from it — the keys have a hook, and they are on it. Floor: clean, nothing dropped, nothing draped.
>
> Palette: warm muted browns and soft navy bedding, cream pages, one warm lamp pool — warmer and calmer than a gamer's room, but still nighttime-dim at the corners. 16-bit RPG top-down interior floorplan style: soft pixel outlines, muted colors, no characters, no visual jokes. Generate at a 4:3 landscape aspect ratio (slightly wider than tall).

---

## NICE TO HAVE

### 6. Chris Rivas sprite sheet — `npc_chris_rivas_sheet.jpg`

**Target file:** `src/assets/images/npc_chris_rivas_sheet.jpg` (repo root images folder, alongside `npc_rose_sheet.jpg` / `npc_alex_sheet.jpg` — NOT in game_decor).
**Type:** character sprite sheet (the chapter's ONE new character).
**Where used:** Scene 1 only — actor placement `{ id: 'chris_rivas', nameOverride: 'Chris Rivas', x: 470, y: 520 }` in scenes[1]. He currently falls back to a tinted blob, which `08_maps.md` calls acceptable — but the prose builds four protected beats around him ("the only person who will enter this McDonald's tonight because he wanted food"), and a colored blob undercuts the dignity the ethics gate promises him. One scene, but a load-bearing one.
**Pipeline facts:** `SpritePreprocessor.ts` auto-slices sheets by BFS island detection into 128×128 frames, and `SpriteLoader.ts` registers NPC sheets by column count (existing sheets are 4–6 columns, front-facing pose in the first column). So: frames must be cleanly separated on a solid flat background, uniform size, front-facing pose leftmost in its row.

> Pixel art character sprite sheet for a 16-bit top-down RPG, on a solid plain white background. One character repeated in a clean grid of separated full-body poses — 4 columns × 4 rows, every frame the same size, generous even white gaps between frames so each pose is a fully isolated island of pixels. Rows top to bottom: facing the viewer (front), facing left, facing right, facing away (back). Columns within each row: standing idle, then three walk-cycle frames.
>
> The character: a college-age guy in a plain oversized hoodie (muted olive-gray or faded navy), hood DOWN, dark jeans, ordinary sneakers. Short dark hair, unremarkable friendly face, relaxed posture — the vibe of a polite kid who came along for food, holding nothing (or a phone loosely in one hand in the idle frame only). Not a caricature, not comic, not sad — just a normal person.
>
> Style: 16-bit RPG character sprite, chunky readable proportions (roughly 3 heads tall), soft dark pixel outlines, muted palette, small but expressive. Must read clearly at small on-screen sizes. No text, no background art, no props between frames.

### 7. Dogwood Park lookout, night — `stage_dogwood_lookout_night.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_dogwood_lookout_night.jpg`
**Type:** full-scene stage background.
**Where used:** `MAP_L4`, scenes[6] (Scene 8a, "First Time For Everybody") — the warmest scene in the chapter and its only exterior set piece. The map is currently `park` theme + `screenTint` night grade, which is serviceable; a painted night exterior upgrades the chapter's emotional peak from "county park at noon wearing sunglasses" to an actual night.
**Map rect:** `{ x: 500, y: 360, w: 1000, h: 720, fill: 0x000000, propKey: 'stage_dogwood_lookout_night', invisible: true }`. Target rect **1000×720 → generate at ~1.4:1 landscape** (between 4:3 and 3:2 — prefer 3:2 and accept a hair of vertical stretch, or crop the render to 1.39:1 before saving).
**Layout must match `08_maps.md` §7:** lookout building upper-right with a flat walkable roof and a stair block at its southeast corner; baseball infield lower-left with backstop above it; parking lot bottom-center with ONE sedan parked between the lines. If this image ships, set `noNatureScatter: true` on `MAP_L4` (see INTEGRATION NOTES) and keep the `screenTint` beat — the image should be painted AS night, with the tint as reinforcement.

> Top-down pixel art map of a small county park at night — clean top-down view, no people, no text. The whole frame is the park.
>
> Ground: dark night grass (deep desaturated green, moonlit, NOT daytime green) covering most of the frame, with a worn dirt footpath running from the bottom area up toward the upper-right.
>
> Lower-left: a baseball diamond with the lights off — a flat dirt-brown infield arc and home-plate area, faint pale baselines barely catching moonlight, and a chain-link backstop rendered as a dark gray frame above/behind the plate. All geometry, no game: no bases lit, no chalk-fresh lines, everything slightly faded.
>
> Upper-right: a squat one-story concrete utility building with a FLAT ROOF seen from directly above — the roof is a clean walkable slab of medium blue-gray concrete with a slightly lighter surface panel, a low parapet edge line all the way around, and a small darker stairway block attached at its southeast corner leading down. This roof is the scene's stage; keep its surface open and uncluttered.
>
> Bottom-center: a small paved parking lot — dark asphalt with faint white parking lines, and ONE ordinary gray-blue sedan parked neatly centered between two lines. The lot has one dim pole light casting a weak warm cone.
>
> A few dark tree canopies around the outer edges of the frame only, leaving the center open. Sky/lighting: full night — cool blue-violet ambient, soft moonlight from above, deep shadows east of objects.
>
> 16-bit RPG top-down exterior style: soft pixel outlines, visible ground texture, muted night palette (deep greens, blue-grays, dirt brown, asphalt), no characters. Generate at a 3:2 landscape aspect ratio, then crop slightly toward 1.4:1 if possible (target rect is 1000×720).

### 8. The gray dialer — `prop_dialer_site.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/prop_dialer_site.jpg`
**Type:** screen-space UI prop (NOT a stage background — no `stage_` prefix, so it will not trigger the fullscreen-stretch path).
**Where used:** the `doubleCall` mode's `founding` / `rerun` / `unsent` variants (Scenes 5, 6, 10) — the two-fields-and-a-button website the player stares at for whole minutes across three scenes. `07_mechanics.md` §0.3 specs this UI as rects + `label()` and that is a legitimate ship state; **my assessment: this one image is the single cheapest polish win in the mode.** The interface IS a character ("a website with a gray, dated interface — the kind of site that has looked five years old for fifteen years"), and hand-drawn rects read as debug UI, not as a crusty real website. The phone-side UI (reply/capital variants) should NOT get art — the capital's bare-light spareness is a design rule (Scene 9 subtext notes), and the phone panels are fine as rects.
**Hard constraints:** the fields and button must be EMPTY and TEXT-FREE — the engine draws all labels, ghosts, and typed digits on top via `ctx.label()`. Baked-in text would fight the typing mechanic and risk naming the tool. No logo, no URL bar contents, no brand color.
**Sizing:** screen-space via `screenSpace()` helpers; aspect is flexible. Generate at **4:3 landscape** and let the mode scale it with `s()`; it reads at roughly 40–50% of screen width.

> Pixel art image of a single dated, generic gray website panel, front-on, filling the frame — the kind of utility web page that has looked five years old for fifteen years. No logo, no brand name, no URL text, no words anywhere: every text area must be blank.
>
> Composition: a plain browser-tab card with a thin darker gray border and a barely-rounded corner radius. Inside, stacked vertically with clumsy spacing: two identical wide EMPTY input fields — white/off-white boxes inset with a 1-pixel sunken border, completely blank — and below them one wide flat gray button with a slightly darker bevel edge, also completely blank. Around the elements: flat #d/dcdcdc-style gray background, maybe one thin horizontal divider line. The layout should feel like default-styled HTML from 2009: functional, artless, slightly misaligned.
>
> Style: crisp 16-bit pixel rendering, flat grays and off-whites only (no accent color, no blue links, no icons), soft 1px pixel outlines, subtle dither on the panel background for texture. Front-on, no perspective, no drop shadow drama. Generate at a 4:3 landscape aspect ratio.

---

## CAN DEFER

### 9. Winter variant of the third island — `stage_void_eric_room_winter.jpg`

**Target file:** `src/assets/images/game_decor/stages/origins/stage_void_eric_room_winter.jpg`
**Where used:** `MAP_L2_WINTER`, scenes[9] (Scene 10, "Self-Sustaining," Feb 2025). Same rect as item 3 (300×220, ~4:3).
**Why deferrable:** `08_maps.md` §9 already rules the winter dressing is "three tiny rect deltas, not an art pass" — hoodie over the chair, the water glass moved, a laptop replacing the monitor. Those three small prop rects drawn ON TOP of item 3's image read fine at zoom 2 in a near-black scene. Order this only if the deltas look cheap in playtest.
**If generated:** re-roll item 3's prompt with these edits — replace the monitor with an open laptop (smaller, dimmer cool glow), drape a gray hoodie over the back of the desk chair, move the half-glass of water to the desk's far left corner, make the ambient a notch colder/bluer (February), everything else identical, same 4:3 aspect, same furniture positions.

---

## RULED: NO ART (do not generate — these fight the design)

- **The void itself / the Act I corridor** (`MAP_L2_*`, everything between the islands): NO background image, ever. The blackness is backdrop `0x000000` + the new `'void'` theme, both free. A painted "void" would (a) add texture that makes the hidden third island's cover legible, (b) cost a giant 2400×1400 image for nothing, and (c) caption the emptiness the prose refuses to caption. The islands are the only painted things in the dark.
- **L2_CHAT, "The Capital" (Scene 9):** NO background. The scene is a black map with the `doubleCall 'capital'` mode rendering chat-light in screen space — "Present: Nobody. Names only." Any set dressing here breaks the quietest big moment in the chapter.
- **Scene 2, Nick F's car / night street:** REUSE the existing `stage_car_interior.jpg` (already in `game_decor/stages/`) exactly as prior chapters use it. The street map's rects + `suburb_night` theme carry the rest; no new asset.
- **Phone/chat panels for the `reply` and `capital` variants:** rects + `label()` per `07_mechanics.md` §0.3. Only the gray dialer (item 8) earns art, and only as NICE TO HAVE.
- **Jacob:** existing `hero_jacob_*.jpg` sheet, unchanged. Do not redesign him.

**Not in scope here (already flagged in `07_mechanics.md` §0.3, audio not art):** `sfx_phone_ring`, `sfx_phone_buzz`, `sfx_laptop_close`, optional `sfx_key_clack`, and the `music_origins` track.

---

## INTEGRATION NOTES (for the builder, Step 5)

1. **Wiring pattern (every `stage_` asset):** import in `ChapterScene.ts` and register via `this.safeLoadImage('<key>', url)` (key = filename base, e.g. `stage_mcdonalds_night`), then drop into the map as an invisible rect: `{ x, y, w, h, fill: 0x000000, propKey: 'stage_<name>', invisible: true }`. `MapBuilder` detects `propKey.startsWith('stage_')` (`isFullscreenBg`) and **hard-stretches the image to the rect with no cropping** — which is why every prompt above pins an aspect ratio. If a generated image comes back at the wrong ratio, crop it before committing; do not let the engine stretch it more than a few percent.
2. **Aspect recap:** McDonald's 900×620 (~3:2) · Eric present 700×520 (~4:3) · each void island 300×220 (~4:3) · Dogwood 1000×720 (~1.4:1) · dialer free (4:3 suggested, screen-space).
3. **The void islands are three SMALL rects, not one map-sized image.** Each island gets its own `stage_` rect at its own span (§4.1 coordinates). The backdrop stays `0x000000`; the darkness between islands must remain engine-black, not painted.
4. **Third-island dark/lit states:** one image (item 3) in ALL THREE void configs. `MAP_L2_ACT1` adds an opaque near-black cover rect (`0x050505`, `fillAlpha: 1` — remember the root-CLAUDE.md gotcha: a rect constructed with fill alpha 0 can never fade in) at the island span, depth above the image; `MAP_L2_ACT2` omits the cover; `MAP_L2_WINTER` keeps the image + the three winter delta rects (or swaps to item 9 if generated). This preserves both hiding locks from `08_maps.md` §4.2 — the geometry lock is untouched, and the lighting lock becomes "covered" instead of "near-black fills."
5. **Retire procedural doubles.** Once a stage image is in, the decorative rects it replaces (desk/tv/bed/couch/counter fills and `propType`s) should become `invisible: true` physics-only colliders (keep `solid: true` and positions) so procedural furniture sprites don't draw on top of the painted furniture. Keep the tiny anchor rects the `doubleCall` mode targets (`leftPhone`/`rightPhone` points are coordinates, not rects — unaffected).
6. **Dogwood only:** set `noNatureScatter: true` on `MAP_L4` if item 7 ships (the `park` theme scatters 40 flora sprites that would land ON the painted image), and keep the `screenTint(0x0a1030, 0.38)` beat — the image is painted as night, the tint unifies actor sprites with it. Also keep the roof-walkability build note from `08_maps.md` §7 (non-solid base + invisible roof-edge walls).
7. **Coordinate realignment pass — expected, budgeted, small.** `08_maps.md` numbers are start points "at the fidelity of chapter11's file"; once images exist, nudge actor spawns, `walkTo` targets, phone anchor points, and furniture colliders ±20px to sit on the PAINTED furniture (e.g. if the generated McDonald's booth bench lands 15px lower than rect 190,150, move the actor at (150,185), not the image). Cross-reference `08_maps.md` — do not rewrite it; annotate deltas in the chapter file if they exceed ±20px.
8. **McDonald's theme interaction:** `MAP_L1` keeps `theme: 'hospital'` (the white-cyan fluorescent overlay + light vignette flatter the image); the hospital `drawFloorLines` tile lines will draw over the painted tile — if they visibly double-grid in playtest, that is the one case where switching the theme fallback per `08_maps.md` §9.1 is pre-approved.
9. **Dialer prop (item 8):** loaded as a plain image (no `stage_` prefix — must NOT trigger fullscreen-stretch), added by the `doubleCall` mode in screen space: `setScrollFactor(0)`, depth ≥ 9600, positioned/sized exclusively through `screenSpace()`'s `zx()/zy()/s()` (the permanent-zoom HUD gotcha; `_template/` shows the pattern). All field text, ghosts, and the button label render via `ctx.label()` on top of the image.
10. **Do not gold-plate the dark.** No asset here may add light, texture, or art to Scenes 9's chat-space, the corridor black, or the coda's post-question hold. The chapter's biggest images are the ones it withholds.
