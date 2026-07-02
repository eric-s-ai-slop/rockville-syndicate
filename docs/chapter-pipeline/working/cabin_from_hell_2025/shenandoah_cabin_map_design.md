# Shenandoah Cabin — Map Design (Step 2a)

Chapter: `cabin_from_hell_2025` (Summer 2025 — Ocean City & Shenandoah Cabin)
Feeds Step 3 (SCHEMA) alongside the creative brief (`shenandoah_cabin_brief.md`) and the mechanic spec (Step 2b, not yet written).

Three scenes, `scenes[]` array:

0. **OC Balcony** — Act 1, Choice 1 (the kiss)
1. **Cabin Interior** — Act 2, the siege (kitchen/living room/hallway/three bedrooms)
2. **Cabin Deck** — Act 2 texture (lanternflies), reached from the Interior via `changeScene`

Scene 1 was redesigned after reviewing a real walkthrough video (`IMG_2039.MOV`) of the cabin interior, and Scene 2 after reviewing a second video (`IMG_2091.MOV`) of the actual deck — see notes at the end of each section. Scene 0 is unchanged from the first pass (no reference footage yet).

---

## Scene 0 — OC Balcony (700×660, `suburb_night`)

```typescript
map: {
  width: 700,
  height: 660,
  backdrop: C.floorTile,
  theme: 'suburb_night',
  areaTitle: 'The Balcony — One Floor Up',
  rects: [
    { x: 350, y: 8,   w: 700, h: 16, fill: C.wall, solid: true },
    { x: 350, y: 652, w: 700, h: 16, fill: C.wall, solid: true },
    { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
    { x: 692, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
    { x: 350, y: 330, w: 700, h: 660, fill: 0x000000, propKey: 'stage_oc_balcony_night', invisible: true },
    { x: 350, y: 622, w: 700, h: 40, fill: C.wall, propType: 'wall', solid: true },   // building wall, slider door
    { x: 350, y: 48,  w: 700, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true }, // railing, outer edge
    { x: 550, y: 500, w: 80,  h: 60, fill: C.desk, propType: 'desk', invisible: true },    // patio table
  ],
  labels: [],
  playerSpawn: { x: 350, y: 590 },
},

actors: [
  { id: 'benji',           x: 250, y: 560, nameOverride: 'Benji' },
  { id: 'maharko',         x: 400, y: 320 },
  { id: 'girl_chopped',    x: 460, y: 160, nameOverride: 'the chopped girl' },
  { id: 'girl_nonchopped', x: 260, y: 150, nameOverride: 'the other girl' },
],
```

No boss arena — dialogue/choice only (Choice 1).

---

## Scene 1 — Cabin Interior (1200×800, `cabin`)

**Real floorplan (per walkthrough video + user description):** front door opens onto the kitchen straight ahead. Turn left → open living room. From the living room, turn right into a hallway; the first door is Eric & Alex's room, next along the hall is the bathroom, and farthest is Jordan & Maharko's room.

```typescript
map: {
  width: 1200,
  height: 800,
  backdrop: C.floorWood,
  theme: 'cabin',
  areaTitle: 'The Shenandoah Cabin',
  rects: [
    // border walls (front door gap in south wall, x:600-700)
    { x: 600, y: 8,   w: 1200, h: 16, fill: C.wall, solid: true },
    { x: 310, y: 792, w: 580,  h: 16, fill: C.wall, solid: true },   // south wall, west of front door
    { x: 940, y: 792, w: 460,  h: 16, fill: C.wall, solid: true },   // south wall, east of front door
    { x: 8,   y: 195, w: 16,   h: 330, fill: C.wall, solid: true },  // west wall, north of deck door
    { x: 8,   y: 615, w: 16,   h: 310, fill: C.wall, solid: true },  // west wall, south of deck door
    { x: 1192, y: 400, w: 16,  h: 800, fill: C.wall, solid: true },
    // ⚠ mechanic-relevant: front door gap (600, 792) — entrance, kitchen dead ahead
    // ⚠ deck door gap (8, 410) — middle of the living room's outer (west) wall, directly across
    //   the house from the kitchen; leads to scene 2 via changeScene

    // Background art — full cabin floorplan
    { x: 600, y: 400, w: 1200, h: 800, fill: 0x000000, propKey: 'stage_cabin_interior', invisible: true },

    // ── Hallway corridor (x:820-950), connects kitchen/living room to the three bedrooms ──
    { x: 820, y: 290, w: 16, h: 520, fill: C.wall, solid: true },    // west wall of hallway, gap at y:550-770 (entry from kitchen/living room)
    { x: 950, y: 65,  w: 16, h: 70,  fill: C.wall, solid: true },    // east wall segment (above Jordan/Maharko door)
    { x: 950, y: 275, w: 16, h: 190, fill: C.wall, solid: true },    // east wall segment (between JM door and bathroom door)
    { x: 950, y: 545, w: 16, h: 210, fill: C.wall, solid: true },    // east wall segment (between bathroom door and Eric/Alex door)
    { x: 950, y: 750, w: 16, h: 40,  fill: C.wall, solid: true },    // east wall segment (below Eric/Alex door)
    { x: 1060, y: 280, w: 220, h: 16, fill: C.wall, solid: true },   // divider: Jordan/Maharko room | bathroom
    { x: 1060, y: 520, w: 220, h: 16, fill: C.wall, solid: true },   // divider: bathroom | Eric/Alex room

    // ── Jordan & Maharko's room (sick room) — far end of hall, y:30-280 ──
    { x: 1060, y: 150, w: 90, h: 70, fill: C.desk, propType: 'bed', propKey: 'furn_bed_double', solid: true },
    { x: 1130, y: 80,  w: 30, h: 40, fill: C.desk, propType: 'desk', propKey: 'furn_nightstand', solid: true },
    // ⚠ mechanic-relevant: JM room door gap (950, 135)

    // ── Bathroom — middle of hall, y:280-520 ──
    { x: 1000, y: 400, w: 50, h: 70, fill: 0xffffff, propKey: 'prop_red_toilet', solid: true },
    { x: 1120, y: 340, w: 40, h: 40, fill: 0xe2e8f0, propType: 'sink', solid: true },
    // ⚠ mechanic-relevant: bathroom door (lockable, fork-unlock) — gap centered (950, 405)

    // ── Eric & Alex's room — closest to living room, y:520-770 ──
    { x: 1000, y: 640, w: 40, h: 60, fill: C.desk, propType: 'bed', propKey: 'furn_bed_single', solid: true },
    { x: 1120, y: 640, w: 40, h: 60, fill: C.desk, propType: 'bed', propKey: 'furn_bed_single', solid: true },
    // ⚠ mechanic-relevant: Eric/Alex door (barricade-able) — gap centered (950, 690)

    // ── Kitchen — directly ahead of the front door ──
    { x: 650, y: 650, w: 260, h: 40, fill: C.counter, propType: 'counter', solid: true },  // peninsula counter (first thing you see)
    { x: 780, y: 600, w: 50,  h: 70, fill: C.fridge, propType: 'fridge', solid: true },
    { x: 550, y: 600, w: 50,  h: 40, fill: C.sink, propType: 'sink', solid: true },

    // ── Living room — open area to the left ──
    { x: 150, y: 110, w: 70, h: 50, fill: C.desk, propType: 'desk', solid: true },              // dining table
    { x: 130, y: 90,  w: 20, h: 60, fill: 0x3b2a1a, propType: 'desk', solid: true },             // grandfather clock
    { x: 280, y: 350, w: 90, h: 80, fill: 0x8b1a1a, propType: 'couch', solid: true },            // brick-red recliner
    { x: 190, y: 520, w: 220, h: 70, fill: C.couch, propType: 'couch', propKey: 'furn_couch_long', solid: true }, // olive pullout sectional
    { x: 60,  y: 300, w: 20, h: 60, fill: C.tv, propType: 'tv', solid: true },                   // wall-mounted TV
    { x: 250, y: 650, w: 260, h: 120, fill: C.rug, propType: 'rug' },                            // area rug, not solid
    // ⚠ mechanic-relevant: Rung 1 speaker (hidden near TV) — (100, 350)
    // ⚠ mechanic-relevant: Rung 2 speaker under pullout mattress — same coords as sectional (190, 520)
    // ⚠ mechanic-relevant: Rung 2 corner speaker — bottom-left living room corner (80, 720)
  ],
  labels: [],
  playerSpawn: { x: 650, y: 740 },
},

actors: [
  { id: 'eric',    x: 1000, y: 690 },
  { id: 'alex',    x: 1120, y: 690 },
  { id: 'jordan',  x: 1000, y: 180 },
  { id: 'maharko', x: 1120, y: 180, nameOverride: 'Maharko (bed-bound)' },
  { id: 'nick_h',  x: 200,  y: 560 },
  { id: 'nick_f',  x: 350,  y: 600 },
  { id: 'leo',     x: 420,  y: 650 },
  { id: 'benji',   x: 550,  y: 550, nameOverride: 'Benji (smoking)' },
],
```

**No boss arena / bossFight beat.** Per the mechanic spec (Step 2b), this chapter uses no standard `bossFight` beat anywhere — the cabin's antagonism runs entirely through the recurring `speakerHunt` mode (Nights 1–3, searching the living room and, on Night 3, the hallway/bathroom door) and the background `cabinCollapse` meter (the day-side siege). The living room's open floor (roughly `x: 255, y: 470, w: 380, h: 480`) is just the Night 1/2 search zone, not a combat arena — no special rect needed beyond the furniture/wall collision already placed above.

### Notes from the reference video (`IMG_2039.MOV`)

- Real cabin is a wood-paneled single-story trailer/cabin: exposed wood beam ceiling, plaid/flannel curtains on the windows, ceiling fans, wood-paneled walls throughout.
- Living room furniture confirmed from footage: a wood dining table with matching chairs and a **tall grandfather clock** in the corner (not in the original brief — added here), a brick-red leather recliner, an olive-suede sectional/pullout (matches "the pullout" from the brief), a wall-mounted flatscreen TV.
- Confirmed: the bedroom at the end of the run is **Eric & Alex's** (has a wall-mounted TV, a window AC unit, plaid curtains).
- The deck door is in the **middle of the living room's outer wall** — the wall you face when you turn to look into the living room from the entrance, on the opposite side of the house from the kitchen. Modeled as a gap in the west border wall at (8, 410), centered on the living room's height.

---

## Scene 2 — Deck (800×600, `cabin`)

**Real deck (per `IMG_2091.MOV`):** a large elevated deck with a panoramic Blue Ridge / Shenandoah valley view over the railing — hazy layered mountains, dense treeline. A black-metal-framed gazebo with a solid roof covers roughly half the deck, furnished underneath with black metal patio chairs, a wooden rocking chair, and a round glass-top table. A black gas grill sits in one corner (with a wisp of smoke). A red Adirondack chair sits near the railing outside the gazebo. String/post lights line the railing. No lanternflies visible in this clip — kept in the design per the brief as decorative texture, but they may not read strongly in the actual art.

The cabin wall (with the door back to the Interior scene) is on the **east** side, opposite the living room's door — railing wraps the other three sides overlooking the valley.

```typescript
map: {
  width: 800,
  height: 600,
  backdrop: C.floorWood,
  theme: 'cabin',
  areaTitle: 'The Deck — Blue Ridge Overlook',
  rects: [
    // Railing — north, west, south (overlooking the valley)
    { x: 400, y: 8,   w: 800, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true },
    { x: 8,   y: 300, w: 16,  h: 600, fill: 0x64748b, propType: 'guardrail', solid: true },
    { x: 400, y: 592, w: 800, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true },
    // Cabin exterior wall (east) — door back to Interior scene, gap y:270-370
    { x: 792, y: 139, w: 16, h: 262, fill: C.wall, solid: true },
    { x: 792, y: 481, w: 16, h: 222, fill: C.wall, solid: true },
    // ⚠ mechanic-relevant: door gap (792, 320) — back to scene 1's living-room door

    // Background art — full deck
    { x: 400, y: 300, w: 800, h: 600, fill: 0x000000, propKey: 'stage_cabin_deck', invisible: true },

    // Gazebo posts (black metal frame, solid corners) — covers roughly x:150-450, y:100-380
    { x: 150, y: 100, w: 20, h: 20, fill: 0x1e293b, solid: true },
    { x: 450, y: 100, w: 20, h: 20, fill: 0x1e293b, solid: true },
    { x: 150, y: 380, w: 20, h: 20, fill: 0x1e293b, solid: true },
    { x: 450, y: 380, w: 20, h: 20, fill: 0x1e293b, solid: true },
    // Round glass-top table under the gazebo
    { x: 300, y: 240, w: 60, h: 60, fill: C.desk, propType: 'desk', solid: true },
    // Gas grill (back-right corner, near railing)
    { x: 680, y: 120, w: 60, h: 50, fill: 0x1a1a1a, propType: 'firepit', solid: true },
    // Red Adirondack chair (near south railing, outside gazebo)
    { x: 150, y: 500, w: 40, h: 40, fill: 0x8b1a1a, propType: 'bench', invisible: true },
  ],
  labels: [],
  playerSpawn: { x: 740, y: 320 },
},

actors: [],
```

`playerSpawn` is near the east door (back to the Interior) since this scene is entered *from* the cabin via `changeScene`.

No boss arena — atmosphere/texture only ("outside is not an escape").

---

## Image generation prompts

Top-down / bird's-eye pixel art for all three, matching the existing LimeZu-style interior asset (soft dark outlines, muted warm palette, visible floor-tile grid, ambient lamp lighting) so collision rects line up cleanly.

**`stage_oc_balcony_night`** (700×660):
> Top-down pixel art view of a narrow condo balcony at night. Warm string lights strung along a low waist-height railing spanning the top edge, overlooking a soft glow of nightlife/skyline lights beyond (ambient color bleed only, no detailed buildings). A sliding glass door centered in the bottom wall, warm interior light spilling onto the balcony floor near it. A small round patio table with two chairs to the right side. Composite decking floor, weathered gray-brown planks. Muted late-night palette — deep blues, warm yellow light pools. 16-bit RPG top-down interior rendering style: soft pixel outlines, subtle floor-tile texture, no characters.

**`stage_cabin_interior`** (1200×800) — updated to match the reference footage:
> Top-down pixel art floorplan of a cluttered, rustic single-story cabin interior, rendered as a clean architectural top-down view (thick dark wall outlines, distinct floor-tile zones per room). An open-plan living room fills the left half: a wood dining table with high-backed chairs and a tall grandfather clock in the back corner, a worn brick-red leather recliner, an olive-suede pullout sectional sofa with a blanket draped on it, a wall-mounted TV, a round area rug in the center, plaid/flannel curtains on the outer-wall windows, wood-paneled walls, exposed wood beam ceiling. A small kitchen peninsula sits directly ahead of the front door (bottom-center) with a counter, sink, and fridge, open to the living room. A hallway corridor runs along the right side, connecting near the kitchen to three bedroom doors in sequence: closest to the entrance is a bedroom with two single beds, then a small shared bathroom with a toilet and sink, then at the far end a bedroom with one double bed and a cluttered nightstand — tissues and water bottles scattered, looking like a sick room. Warm lamp lighting in the bedrooms, dimmer overhead light in the living room, wood plank flooring throughout. 16-bit RPG top-down interior floorplan style: soft pixel outlines, visible floor-tile grid, warm muted browns and reds, no characters.

**`stage_cabin_deck`** (800×600) — updated to match the reference footage:
> Top-down pixel art view of a large elevated wood cabin deck overlooking a hazy Blue Ridge / Shenandoah mountain valley — layered blue-green mountain silhouettes and dense treeline beyond the railing on three sides. A black-metal-framed gazebo with a solid dark roof covers about half the deck (rendered as a flat roof shape from above, edges visible), furnished underneath with black metal patio chairs, a dark wooden rocking chair, and a round glass-top table. A black gas grill sits in the back-right corner with a wisp of smoke rising. A red Adirondack chair sits near the railing outside the gazebo. Small string/post lights line the railing posts. The cabin's exterior wall with a door forms the right (east) edge, interior light spilling faintly onto the deck near it. A few scattered spotted lanternflies (small tan-and-red-spotted winged bugs) dot the deck planks, giving a faint infested texture. Weathered gray-brown wood planking, bright hazy summer daylight. 16-bit RPG top-down exterior rendering style: soft pixel outlines, visible plank-grain texture, no characters.

---

## Flags for Step 2b (mechanic) / Step 3 (schema)

- Bedroom 1 (Eric/Alex) door, bathroom door, Rung 1/2/3 speaker spots, and the corner-speaker location are called out with exact coordinates above — resolved in `shenandoah_cabin_mechanic.md` (Step 2b): all three rungs are the recurring `speakerHunt` mode (escalating config per night), Rung 3 adds a fork-unlock QTE at the bathroom door; the day-side siege is the separate background `cabinCollapse` mode, not tied to a specific rect.
- `stage_oc_balcony_night`, `stage_cabin_interior`, `stage_cabin_deck` are new propKeys — none exist yet in `ChapterScene.ts`'s preload list. Once the images exist, add `safeLoadImage` calls there (convention: `src/assets/chapters/cabin_from_hell_2025/`).
- `guardrail` and `firepit` (used here as a grill stand-in) propTypes have no confirmed sprite — procedural fallback, fine per pipeline convention.
- Lanternflies (brief's texture thread) weren't visible in the daytime reference clip — kept in the art prompt as a light decorative touch, but the mechanic/schema agents shouldn't rely on them being visually prominent.
- Deck is now bigger (800×600 vs. the original 700×500 guess) to fit the gazebo + grill + seating from the reference footage — if Day 5's siege or any beat needs the deck's open floor, note the gazebo posts (150/450, 100/380) and table (300, 240) eat into the west half.
