# Origins — Phase 6: MAPS (buildable MapConfig sketches + scenes[] wiring)

Process: `../../MAGNUM_OPUS.md` Phase 6 at `02a` rigor. Inputs: `05_structure.md` §4
(six engine locations, twelve story-scenes), the prose staging in `06_scenes/`, and the
engine as it actually is — every claim below was verified against
`src/data/chapters/types.ts`, `src/game/scene/Atmosphere.ts`,
`src/game/scene/MapBuilder.ts`, `src/game/scene/BeatEngine.ts`, and
`chapter11.cabin-from-hell.ts` (the shipped multi-scene reference) on 2026-07-06.

## 0. ENGINE FACTS THIS DESIGN IS BUILT ON (do not re-derive)

- **Theme fallback trap:** `Atmosphere.build` does `map.theme ?? 'apartment'` — a map
  with NO theme gets apartment's warm overlay, vignette, dust motes, and two fake light
  glows. You cannot "just omit theme" for the void.
- **Unknown theme = clean fall-through (the void solution):** for a theme string with
  no table entry, Atmosphere yields overlay `[0x000000, 0]` (invisible), vignette
  `0.30` (good), NO fake lights (`lightsByTheme[theme] ?? []`), NO particles (no
  if-branch matches); MapBuilder's `drawFloorLines` switch has no case (nothing drawn)
  and `scatterNature`'s outdoor list doesn't include it (nothing scattered).
  **Therefore: add one literal, `'void'`, to the `MapTheme` union in
  `src/data/chapters/types.ts`. Zero changes to Atmosphere.ts or MapBuilder.ts.**
  This is the flagged "new-theme risk" resolved: the risk is nil because the new theme
  intentionally matches no branch anywhere.
- **Camera:** `cameraZoom` defaults to 2.0 (`chapter.cameraZoom ?? 2.0`). At zoom 2 on
  a 1280×720 canvas the world view is 640×360 (±320 x, ±180 y around center); on a
  1280×900 canvas, ±225 y. All hide-the-island math below assumes worst case ±300 y
  (a 1200px-tall canvas) and keeps ≥ 120px of slack beyond that.
- **`cameraPan` re-follows the player after `holdMs`** — so between beats the frame
  is wherever the PLAYER is. Player spawns/`walkTo` targets below are chosen so the
  resting frame is always a frame we want.
- **Camera-bounds ban:** no `setBounds` anywhere (lint-enforced). Confinement is
  invisible perimeter/corridor walls + physics world bounds, per house style.
  Oversized backdrop is automatic (MapBuilder draws `backdrop` at 6× map size).
- **Actors are static per scene config.** A character who must "be somewhere else"
  within one engine scene is handled by staging text or by splitting into another
  scenes[] entry (cheap — map consts are shared and spread).
- **`changeScene` tears down `activeMode` unconditionally** and crossfades music ONLY
  if the target scene sets `music:`. After `stopAllAudio`, silence carries across every
  later `changeScene` that omits `music` — this chapter's post-snap dryness is free.

**Palette convention:** `C` from `src/data/chapters/palette.ts` where it fits; raw hex
where the void needs exact darkness. Numbers below are start-point coordinates at the
fidelity of chapter11's file — the builder nudges ±20px during playtest, nothing more.

---

## 1. THE SIX LOCATIONS → ELEVEN ENGINE SCENES

| scenes[] index | Location | Story scene(s) | Map const | Notes |
|---|---|---|---|---|
| 0 | L0 Eric's room, present | Scene 0 | `MAP_L0` | NO `music` key (silent open) |
| 1 | L1 McDonald's 3am | Scene 1 | `MAP_L1` | `music: 'music_origins'` (the needle drop = the game starting) |
| 2 | L3 Nick F's car / street | Scene 2 | `MAP_L3` | `music: 'music_origins'` |
| 3 | L2 void — ACT I dressing | Scenes 3 + 4 | `MAP_L2_ACT1` | `music: 'music_origins'`; Eric's island present, near-black fills |
| 4 | L2 void — ACT II dressing | Scenes 5 + 6 | `MAP_L2_ACT2` | NO music, ever (snap `stopAllAudio` lands here) |
| 5 | L1 McDonald's — the booth, mid-era | Scene 7 | `MAP_L1` | no music (Phase 8 MAY add a sparse low key; default silent) |
| 6 | L4 Dogwood lookout | Scene 8a | `MAP_L4` | no music (roof phone speaker is staged in dialogue, not the score) |
| 7 | L1 McDonald's — the booth, first hangout | Scene 8b | `MAP_L1` | no music |
| 8 | L2 chat-space | Scene 9 | `MAP_L2_CHAT` | no music (hard rule: nothing scored from Scene 9 on) |
| 9 | L2 void — winter, Eric alone | Scene 10 | `MAP_L2_WINTER` | no music |
| 10 | L0 Eric's room, present (coda) | Scene 11 | `MAP_L0` (re-spread) | no music |

`changeScene` fires at every index boundary; the only story-scene pairs sharing an
index are 3+4 (continuous beats on the Act I void) and 5+6 (continuous on the Act II
void). Scene 8 changes scene MID story-scene (6→7, the drive to the Pike).
Top-level `map`/`actors` fields = copy of scenes[0] (required by the type; chapter11
precedent).

**Music/test wiring:** because scenes[0] is deliberately silent, add `'origins'` to
`INTENTIONALLY_SILENT` in `src/data/chapters.test.ts` with a comment ("cold open is
scored by room tone; Act I music enters per-scene at scenes[1]"), and register
`music_origins` in `STAGE_MUSIC_URL` only (NO `CHAPTER_MUSIC_KEY` entry — umbc
precedent for per-scene-only music). AudioController preloads per-scene keys
automatically.

---

## 2. L0 — ERIC'S ROOM, PRESENT DAY (scenes[0] and scenes[10])

Theme `'apartment'` (correct: planks, warm overlay, TV-glow fake light reads as the
monitor). Small and close — this room is a held breath.

```typescript
const MAP_L0: MapConfig = {
  width: 700, height: 520,
  backdrop: 0x241a10,                    // dark wood, darker than house apartment
  theme: 'apartment',
  areaTitle: '3:12 AM',                  // scenes[10] variant: no areaTitle (we're back; it knows us)
  rects: [
    // perimeter (invisible physics walls, chapter11 pattern)
    { x: 350, y: 6,   w: 700, h: 12, fill: 0x000000, solid: true, invisible: true },
    { x: 350, y: 514, w: 700, h: 12, fill: 0x000000, solid: true, invisible: true },
    { x: 6,   y: 260, w: 12,  h: 520, fill: 0x000000, solid: true, invisible: true },
    { x: 694, y: 260, w: 12,  h: 520, fill: 0x000000, solid: true, invisible: true },
    // the desk is the capital
    { x: 350, y: 150, w: 180, h: 70, fill: 0x3b2f23, propType: 'desk', solid: true },
    { x: 350, y: 128, w: 90,  h: 40, fill: 0x0f172a, propType: 'tv' },       // the monitor (the only light)
    { x: 415, y: 165, w: 26,  h: 16, fill: 0x111827 },                       // the phone, face-down
    // bed on the periphery
    { x: 120, y: 400, w: 190, h: 95, fill: 0x334155, propType: 'bed', solid: true },
    { x: 560, y: 300, w: 60,  h: 90, fill: 0x1f2937, propType: 'window' },
    // the door — SOLID in both L0 scenes ("The door doesn't go anywhere.");
    // the coda exit is performed by the doubleCall 'reply' mode tweening the player
    // through it, not by physics.
    { x: 350, y: 505, w: 90, h: 22, fill: 0x4a3623, propType: 'door', solid: true },
  ],
  labels: [],
  playerSpawn: { x: 350, y: 260 },       // between desk and door; the whole room walkable
};
```

- **Actors:** none, both scenes. Eric alone is the point; the player IS Eric
  (`protagonistOverride: 'eric'`).
- **Lighting staging:** open both L0 scenes with `screenTint(0x000014, 0.35)` — the
  room is "shapes." The coda deepens it (`screenTint` toward 0.55) during the long
  hold, per structure §8.
- **`doorPoint` for the coda-exit mode config:** `{ x: 350, y: 505 }`.

## 3. L1 — THE McDONALD'S ON THE PIKE (scenes[1], scenes[5], scenes[7])

**Theme flag, resolved:** no shipped theme is a McDonald's. Recommendation:
**`'hospital'`** — verified in Atmosphere.ts it gives a white-cyan overlay at 0.05
(fluorescence), the LIGHTEST vignette (0.22), an overhead white glow at (0.5W, 0.3H) —
which lands over the counter below — and it is not in `scatterNature`'s outdoor list,
so no flora. That is a 3am McDonald's lobby: lights on, floor wet, nothing warm.
`drawFloorLines`'s hospital case draws tile-style lines — correct for the lobby.
(Runner-up `'suburb_night'` + `noNatureScatter` reads as a parking lot, not a lobby,
and its heavy 0.42 dark overlay fights the "never fully closes" fluorescence. If the
hospital tile pattern reads too clinical in playtest, THEN fall back and raise the
backdrop brightness.) No Atmosphere.ts edit either way.

```typescript
const MAP_L1: MapConfig = {
  width: 900, height: 620,
  backdrop: 0x8a7f6a,                    // greige tile
  theme: 'hospital',
  areaTitle: 'Rockville Pike — 3:00 AM', // scenes[5]: 'The Booth You Know'; scenes[7]: none
  rects: [
    // perimeter
    { x: 450, y: 6,   w: 900, h: 12, fill: 0x000000, solid: true, invisible: true },
    { x: 450, y: 614, w: 900, h: 12, fill: 0x000000, solid: true, invisible: true },
    { x: 6,   y: 310, w: 12,  h: 620, fill: 0x000000, solid: true, invisible: true },
    { x: 894, y: 310, w: 12,  h: 620, fill: 0x000000, solid: true, invisible: true },
    // the window wall (booth side) — night outside
    { x: 450, y: 40, w: 900, h: 60, fill: 0x0b1220, propType: 'window' },
    // THE BOOTH BY THE WINDOW (four seats — the fourth seat is load-bearing)
    { x: 190, y: 150, w: 150, h: 70, fill: 0xb03a2e, propType: 'couch', solid: true },  // bench, window side
    { x: 190, y: 290, w: 150, h: 70, fill: 0xb03a2e, propType: 'couch', solid: true },  // bench, lobby side
    { x: 190, y: 222, w: 130, h: 56, fill: 0xd9c8a9, propType: 'counter', solid: true },// booth table
    // second booth (set dressing) + the two-top Eric's chair gets dragged from (Scene 7)
    { x: 520, y: 170, w: 120, h: 60, fill: 0xb03a2e, propType: 'couch', solid: true },
    { x: 700, y: 300, w: 70,  h: 50, fill: 0xd9c8a9, propType: 'counter', solid: true },
    // ordering counter + kitchen line (north-east)
    { x: 640, y: 90,  w: 380, h: 50, fill: 0x9aa2ad, propType: 'counter', solid: true },
    { x: 840, y: 60,  w: 100, h: 40, fill: 0x374151, propType: 'fridge', solid: true }, // menu boards / machines
    // door, south — the chime everyone enters through
    { x: 450, y: 560, w: 90, h: 30, fill: 0x475569, propType: 'door' },
    // wet-floor cone gag, uncaptioned
    { x: 560, y: 430, w: 24, h: 24, fill: 0xf59e0b, propType: 'cone', solid: true },
  ],
  labels: [],
  playerSpawn: { x: 450, y: 520 },       // scenes[5]/[7] respawn nearer the booth: { x: 400, y: 360 }
};
```

**Actor sets (same map, three scene entries):**
- **scenes[1] (Scene 1, the founding night):** `maharko` at (150, 185) — the window
  seat/throne; `nick_h` (255, 185); `nick_f` (150, 300); `jacob` (350, 250) — the end
  of the table, "where standing becomes hovering"; `chris_rivas` (470, 520) →
  staging keeps him doorway/counter side. Chris has no sheet — placement
  `{ id: 'chris_rivas', nameOverride: 'Chris Rivas', x: 470, y: 520 }` falls back to a
  tinted blob (acceptable; Phase 8 may supply a hoodie sprite). One `employee` blob at
  (720, 130), nameOverride 'on headset'. Player-Eric walks unacknowledged (M1).
- **scenes[5] (Scene 7, the call logs):** `nick_f` (150, 185) — window seat NOW HIS
  (the throne migrated; uncaptioned); `nick_h` (150, 300); `jacob` (255, 185) — IN the
  booth, fourth seat filled; player spawn (400, 360) = the dragged chair at the end of
  the table. No Maharko, no Chris.
- **scenes[7] (Scene 8b, first-hangout booth):** `nick_f` (150, 185), `nick_h`
  (255, 185), `jacob` (150, 300); player joins the fourth spot — "they sit in the
  order the door delivers them."

## 4. L2 — THE VOID OF ISLANDS (the signature set) — FULL SPEC

**One geometry, four dressings** (`MAP_L2_ACT1`, `MAP_L2_ACT2`, `MAP_L2_WINTER` share
every coordinate; `MAP_L2_CHAT` is a separate empty black map). Theme **`'void'`**
(the new union literal — see §0). Backdrop `0x000000`. `noNatureScatter` unnecessary
('void' matches no scatter branch) but set it anyway as documentation.

### 4.1 The geometry (identical across ACT1/ACT2/WINTER)

```
Map: width 2400, height 1400. Zoom 2.0.

                x=210      x=510            x=1050     x=1350          x=1890     x=2040
   y=510  ┌──────────────┐                                        ┌──────────────┐
          │  NICK F'S    │                                        │   JACOB'S    │
   y=620  │  ROOM        │   ← the corridor (pan line, y=620) →   │   ROOM       │   y=620
   y=730  └──────────────┘                                        └──────────────┘
          center (360,620)                                        center (2040,620)

                                     ┌──────────────┐  y=1040
                                     │  ERIC'S ROOM │
                                     │  (the third  │  center (1200,1150)
                                     │   island)    │
                                     └──────────────┘  y=1260
```

- **Left island — Nick F's room:** rect span x 210–510, y 510–730 (300×220), floor
  fill `0x2a2118` (dark wood). Furniture: gaming chair + desk `{ x: 430, y: 575, w: 95,
  h: 55, fill: 0x3b2f23, propType: 'desk', solid: true }`; monitor glow
  `{ x: 430, y: 552, w: 60, h: 26, fill: 0x1e3a5f, propType: 'tv' }`; unmade bed
  `{ x: 280, y: 690, w: 130, h: 70, fill: 0x334155, propType: 'bed', solid: true }`;
  hoodie-on-floor rect (36×20, `0x475569`) at (330, 600). **Nick F's phone:**
  `{ x: 436, y: 560, w: 12, h: 8, fill: 0x0f172a }` → `leftPhone: { x: 436, y: 554 }`
  in every `doubleCall` config.
- **Right island — Jacob's room:** rect span x 1890–2190, y 510–730, floor fill
  `0x2d2a24`. THE MADE BED `{ x: 2110, y: 695, w: 130, h: 60, fill: 0x3f4d63,
  propType: 'bed', solid: true }` (visibly neater fill than Nick F's); desk + stats
  textbook `{ x: 1960, y: 575, w: 95, h: 55, fill: 0x40342a, propType: 'desk',
  solid: true }` with a small open-book rect (28×18, `0xd6cfae`) at (1958, 566) and a
  highlighter dot (8×4, `0xfde047`); keys-on-hook `{ x: 1902, y: 545, w: 10, h: 14,
  fill: 0x9ca3af }` by the door edge. **Jacob's phone (on the textbook):**
  `{ x: 1972, y: 566 }` → `rightPhone`. Jacob's island NEVER renders a caller-ID —
  mode config rule, restated here because it is the planted evidence's armor.
- **Eric's island — the third island:** rect span x 1050–1350, y 1040–1260, floor fill
  (ACT2/WINTER) `0x28211a`. Desk `{ x: 1200, y: 1105, w: 110, h: 55, fill: 0x3b2f23,
  propType: 'desk', solid: true }`; monitor `{ x: 1200, y: 1082, w: 64, h: 28,
  fill: 0x14324f, propType: 'tv' }`; phone FACE-UP `{ x: 1238, y: 1112, w: 12, h: 8,
  fill: 0x0f172a }`; half-glass of water (8×10, `0x93c5fd`) at (1165, 1108); bed on
  the periphery `{ x: 1085, y: 1225, w: 130, h: 62, fill: 0x334155, propType: 'bed',
  solid: true }`. Nothing on the walls confesses to anything — no posters, no labels.
  WINTER deltas: hoodie-over-chair rect (30×22, `0x475569`) at (1230, 1130); water
  glass moved to (1150, 1090); a laptop rect replaces the monitor `{ x: 1200, y: 1090,
  w: 46, h: 30, fill: 0x1f2937 }`.

### 4.2 How the third island stays hidden in Act I (two independent locks)

1. **Geometry (primary):** every Act I camera position — player spawn, `walkTo`
   targets, and all `cameraPan` beats — sits ON the corridor `y = 620`. Worst-case
   view half-height at zoom 2 is ~±300 (a 1200px-tall canvas); the deepest visible
   world-y from the corridor is 920. Eric's island's topmost pixel is y = 1040.
   **Slack: 120px beyond the worst case** (comfortably 375px at a normal 720p canvas).
   Act I pans DO cross x=1200 — "the long stretch of nothing the camera has been
   panning across all night" — they just never descend. That is the prose's exact
   claim: you hide a room by deciding where everyone will look.
2. **Lighting (belt-and-suspenders):** in `MAP_L2_ACT1`, Eric's island uses near-black
   fills (floor `0x050505`, furniture `0x0a0a0a`, no `propType` on the desk/bed so no
   procedural detail renders) — literally present at final coordinates, illegible even
   if a stretched viewport grazes it. `MAP_L2_ACT2` swaps the fills to the lit values
   above. The swap is invisible because…
3. **…the `changeScene` hides in blackness:** Scene 4's last beats are
   `cameraPan(1200, 620, 2200, holdMs 2600)` (the held empty dark) → narrator "There
   is nothing there." → `wait 1600` → `changeScene(4, transitionMs 400)`. The ACT2
   config's `playerSpawn` is **(1200, 620)** — the very point the camera was holding —
   so the post-transition follow-cam frame is the same black frame. No fade is
   perceptible; the reveal pan that follows is continuous and real.

### 4.3 Player containment & movement paths

- **ACT1 (`scenes[3]`, story-scenes 3–4):** spawn `(700, 620)`. Invisible corridor
  walls confine the player to the strip `x 530–1880, y 560–680` — four rects:
  `{ x: 1205, y: 550, w: 1350, h: 12 }` (top), `{ x: 1205, y: 690, w: 1350, h: 12 }`
  (bottom), `{ x: 524, y: 620, w: 12, h: 140 }` (left cap — the player may LOOK at the
  left island, never walk into it), `{ x: 1886, y: 620, w: 12, h: 140 }` (right cap);
  all `solid: true, invisible: true`. The player can pace the whole dark corridor —
  directly over the hidden island, 360px above its roof — and see nothing. Viewing
  stations for dialogue blocks (follow-cam!): `walkTo(560, 620)` frames Nick F's room;
  `walkTo(1840, 620)` frames Jacob's. Between calls the beats park the player at
  whichever island is talking.
- **ACT2 (`scenes[4]`, story-scenes 5–6):** same corridor walls PLUS an opened
  vertical passage `x 1160–1240` from corridor to island (delete a 80px gap in the
  bottom corridor wall: split it into `{ x: 843, y: 690, w: 626, h: 12 }` →
  actually two rects `{ x: 843, y: 690, w: 634, h: 12 }` and `{ x: 1560, y: 690,
  w: 652, h: 12 }` leaving the gap at x 1160–1240) and passage side-walls down to the
  island (`{ x: 1154, y: 870, w: 12, h: 372 }`, `{ x: 1246, y: 870, w: 12, h: 372 }`)
  plus island perimeter walls. The reveal sequence: camera pans down (beat), then
  `walkTo(1200, 1180, markerLabel: 'Sit down.')` — the player walks the dark passage
  into the lit room on foot. Spawn (1200, 620).
- **WINTER (`scenes[9]`, story-scene 10):** spawn `(1200, 1180)` — at the desk
  already. Confinement: island only. Left/right islands keep their rects with ACT1's
  near-black fills ("the left and right islands do not light tonight"). M5's
  walk-away is mode-tweened, so no passage is needed.

### 4.4 Camera paths (exact, so the reveal mechanism works)

| Moment | Beat | Notes |
|---|---|---|
| Scene 3, each double-ring | `cameraPan(360, 620, 1400, holdMs 1800)` then `cameraPan(2040, 620, 2600, holdMs 1800)` | the L→R crossing at "walking speed"; `ringOnly` bg mode pulses both phones under it |
| Scene 3, voicemail night | pans as above; `ringOnly.darkenIsland` covers Jacob's island | right room dark, phone glowing face-down |
| Scene 4, Ben call | camera mostly resting on player at (560, 620) (Nick F framed); ONE pan `cameraPan(2040, 620, 2600, holdMs 2400)` for Jacob watching his phone ring | "he looks tired" is dialogue, not zoom |
| Scene 4, act break | `cameraPan(1200, 620, 2200, holdMs 2600)` → "There is nothing there." → `wait 1600` | the held empty dark, one pan-width wide |
| **THE REVEAL** | `changeScene(4, 400)` → `stopAllAudio(fadeMs 0)` → handoff dialogues → `cameraPan(1200, 1150, 3800, holdMs 2000)` | the pan DOWN into the dark; lands on coordinates present since scenes[3] |
| Scene 5, the wiring's ring pan | inside `doubleCall 'founding'` (mode-owned `cam.pan` L→R→desk) | beats resume with camera back on the seated player |
| Scene 7 held silence | `cameraPan(booth center ≈ (215, 240), 800, holdMs 8000)` | cameraPan freezes the player = "your hands are taken away" — this is the engine's native gesture for it |

## 5. L2_CHAT — THE CAPITAL (scenes[8], story-scene 9)

"The void, no islands: chat-space." A separate tiny black map; everything visible is
rendered screen-space by `doubleCall 'capital'`.

```typescript
const MAP_L2_CHAT: MapConfig = {
  width: 800, height: 600,
  backdrop: 0x000000,
  theme: 'void',
  rects: [ /* four invisible perimeter walls only */ ],
  labels: [],
  playerSpawn: { x: 400, y: 300 },       // frozen by the blocking mode immediately
};
```
Actors: none. "Present: Nobody. Names only."

## 6. L3 — NICK F'S CAR / SIDE STREET (scenes[2], story-scene 2)

Theme `'suburb_night'` — genuinely correct here (porch-light and window-glow fake
lights land on the houses; heavy dark overlay; dust). `noNatureScatter: false` is fine
(street shoulders get sparse flora).

```typescript
const MAP_L3: MapConfig = {
  width: 800, height: 560,
  backdrop: 0x141a22,                    // asphalt night
  theme: 'suburb_night',
  areaTitle: '1:00 AM — technically a Friday',
  rects: [
    // perimeter walls (invisible) …
    // the road band
    { x: 400, y: 330, w: 800, h: 150, fill: 0x1f2630, propType: 'road' },
    // THE CAR — parked, not going anywhere
    { x: 400, y: 330, w: 170, h: 80, fill: 0x233043, propType: 'car', solid: true },
    // the closed 7-Eleven (north): storefront + dark window band
    { x: 400, y: 120, w: 360, h: 90, fill: 0x2a2f38, propType: 'wall', solid: true },
    { x: 400, y: 105, w: 320, h: 30, fill: 0x0e1420, propType: 'window' },
    // curb / sidewalk
    { x: 400, y: 240, w: 800, h: 30, fill: 0x39404b },
  ],
  labels: [],
  playerSpawn: { x: 470, y: 380 },       // the back seat's window-side door
};
```
- **Actors:** `nick_f` (360, 320) driver's seat; `nick_h` (440, 320) shotgun. The
  player (Eric) is confined by invisible walls to a small back-seat box
  `x 440–510, y 360–400` — the whole scene is heard from the back seat; the "held one
  beat too long" ending is `cameraPan(470, 380, 700, holdMs 3200)` on the player
  himself (camera rule, first firing — the frame IS Eric).
- Two slushie rects in cupholders (8×10, `0xef4444` / `0x3b82f6`) — set dressing,
  uncaptioned.

## 7. L4 — DOGWOOD PARK LOOKOUT (scenes[6], story-scene 8a)

Theme `'park'` + **night grade via a `screenTint` beat** (`screenTint(0x0a1030, 0.38)`
as the scene's first beat) — park's golden-hour ambient is daytime; the tint is the
cheap, house-pattern fix (Atmosphere.setScreenTint works post-fix). `park` scatters
40 flora and avoids the central path — acceptable for a county park at night.

```typescript
const MAP_L4: MapConfig = {
  width: 1000, height: 720,
  backdrop: 0x16331a,                    // house grass green (root CLAUDE.md's own color)
  theme: 'park',
  areaTitle: 'Dogwood Park — after hours',
  rects: [
    // perimeter …
    // the diamond, lights off ("all geometry, no game") — infield arc as a flat fill
    { x: 320, y: 500, w: 300, h: 200, fill: 0x6b5b3e },
    // backstop
    { x: 320, y: 392, w: 160, h: 16, fill: 0x475569, propType: 'guardrail', solid: true },
    // THE LOOKOUT — squat concrete building, flat roof (the stage)
    { x: 700, y: 250, w: 260, h: 150, fill: 0x565f6b, propType: 'wall', solid: true },
    { x: 700, y: 250, w: 236, h: 126, fill: 0x6b7480 },        // the roof surface (walkable — drawn over the solid base? NO:
    // BUILD NOTE: make the BASE non-solid and ring the roof with invisible walls
    // instead, so the player can stand "on" it: perimeter walls at the roof edge
    // with a gap at the stairway (south-east corner, x 810–840).
    { x: 940, y: 340, w: 40, h: 60, fill: 0x3f4854, propType: 'wall', solid: true },   // the stairway that "makes no real effort"
    // the parking lot, far south — where the Camry noses in
    { x: 500, y: 660, w: 400, h: 90, fill: 0x1f2630, propType: 'road' },
    { x: 470, y: 660, w: 110, h: 52, fill: 0x2d3a4f, propType: 'car', solid: true },   // the Camry, between the lines
    // the phone playing music, face-up on the concrete
    { x: 780, y: 300, w: 12, h: 8, fill: 0x0f172a },
  ],
  labels: [],
  playerSpawn: { x: 760, y: 320 },       // on the roof, with the group
};
```
- **Actors:** `nick_f` (720, 290), `nick_h` (820, 290) on the roof; `jacob` — NOT
  placed at scene start; he arrives. **Engine constraint: actors are static.** Staging:
  place `jacob` at (560, 640) — beside the Camry in the lot — and script his climb as
  `cameraPan` to the lot (headlights beat, `sfx` car door) then a narrator line
  covering the walk, then `cameraPan` back to the roof where a SECOND placement can't
  exist… **so instead:** place `jacob` at (700, 330) on the roof from the start, and
  keep the camera OFF the roof's south edge until his arrival beat (open the scene
  framed tight on the player + Nicks via `cameraPan(770, 285, 600, holdMs …)` and
  play the headlights arrival as lot pans + sfx; when the camera returns, Jacob is in
  frame and the narrator marks it). This is the same static-actor sleight every
  chapter uses; do not build actor pathing for one beat. ASSUMPTION flagged.
- `maharko` is NOT an actor (Florida; his verdict lands as texts in Scene 8b).

## 8. GOTCHA COMPLIANCE CHECKLIST (maps)

- **No `cameras.main.setBounds` anywhere** — confinement is invisible walls (lint
  would catch it anyway).
- **`screenTint` beats** are used for L4 night grade and L0 darkness — the
  `fillAlpha` bug is already fixed in Atmosphere; beats work as speced.
- **Void theme:** `'void'` must be added to the `MapTheme` union or `tsc` fails the
  chapter file — it is a types.ts-only change (verified fall-through in Atmosphere +
  MapBuilder, §0).
- **The oversized-backdrop rule** is automatic (MapBuilder 6× backdrop) — the void's
  blackness extends past every island naturally; no extra rects needed.
- **All mode UI on these maps is screen-space** (`screenSpace()`), never keyed to map
  pixels except the ring glows/darken overlays, which are world-space on purpose.
- **areaTitle** is a fading toast (safe); no permanent in-world text labels anywhere
  (`labels: []` throughout — the void must not caption itself).

## 9. ASSUMPTIONS MADE HERE (veto points)

1. **'hospital' theme for the McDonald's** (fluorescent lobby read). Fallback:
   `'suburb_night'` + brighter backdrop. Either way zero engine edits.
2. **Corridor/island numbers** (2400×1400, corridor y=620, island y=1150) assume the
   shipped zoom 2.0 and canvases up to 1200px tall. If Origins overrides `cameraZoom`
   below ~1.6, re-run the §4.2 math.
3. **Scene 8 Jacob staging** (static actor + camera discipline instead of pathing).
4. **Scene 7's "hands removed" hold uses `cameraPan holdMs`** (which letterboxes).
   The letterbox is a cinematic frame the game already speaks; if Eric wants the hold
   letterbox-free, the alternative is a `wait` stack + accepting that the player can
   fidget-walk (which Scene 11 wants, but Scene 7 must not allow — hence the pan).
5. **Feb-era winter dressing** is three tiny rect deltas, not an art pass — Phase 8
   may upgrade.
