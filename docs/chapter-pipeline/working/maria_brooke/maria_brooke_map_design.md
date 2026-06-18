# Chapter: Maria Brooke — Map Design Output
## Step 2a — Final

Two scenes. Background images attached and confirmed. Procedural UI elements (group chat panel, Ben's phone glow) are layered by the engine on top of these backgrounds at runtime.

---

## SCENE 0 — Classroom
**File:** `highschool.jpg`
**Theme:** `hospital` (closest to institutional tile — concrete footsteps)
**Area Title:** `Walter Johnson High School — Period 4`
**Dimensions:** 920 × 660

### What's in the image
- Warm beige speckled tile floor
- Whiteboard centered across the top wall
- Teacher's desk upper-left with chair, supplies on top
- 4 columns of student desks, 4 rows deep
- Rightmost column has only 2 desks (rows 1–2) — bottom-right quadrant is open floor
- Backpacks on some chairs
- Fluorescent lights hanging from ceiling (visual only)
- Bulletin boards and posters on upper-right wall

### Coordinate notes (aligned to image)
The image is 920×660. Key reference points:
- **Whiteboard:** approximately x: 300–800, y: 30–120 (top wall, center-right)
- **Teacher's desk:** approximately x: 60–220, y: 160–280
- **Desk column 1 (leftmost):** x ≈ 110, rows at y ≈ 360, 490, 620, 750 (rows 1–4)
- **Desk column 2:** x ≈ 290, same rows
- **Desk column 3:** x ≈ 470, rows 1–3 only (row 4 present but sparse)
- **Desk column 4 (rightmost):** x ≈ 650, rows 1–2 only — bottom-right is open
- **Open floor (boss arena):** right half, below row 2 — roughly x: 500–890, y: 380–630

### Actor placements (6 characters)
Placed at desks. Spread across the room — nobody sitting next to who they'd choose.

| Character | Desk position | Notes |
|---|---|---|
| `eric` | Column 1, Row 1 (front left) | Of course. |
| `jordan` | Column 2, Row 1 (front, second) | Adjacent to Eric. Auditing in real time. |
| `nick_f` | Column 3, Row 2 (mid, third column) | Warm, invested, leaning forward. |
| `maharko` | Column 2, Row 3 (mid-back, offset) | Slightly off from everyone else. |
| `nick_h` | Column 1, Row 4 (back left) | Allegedly doing something else. |
| `sean` | Column 3, Row 4 (back, third column) | In the room. Laughing. For now. |

### Procedural overlays (engine-rendered, not in background image)
- **Group chat panel** — left wall, mid-height. TV prop, `C.tv`. Live group chat feed appears here as beats progress.
- **Ben's phone glow** — right side open floor, center-right. Isolated prop. Represents the other side of the conversation. Player walks to it to see Ben's DMs.

### Boss arena
```
Scene 0: { x: 690, y: 500, w: 380, h: 260 }
```
Open floor, bottom-right quadrant. Clear of desks. Enough space for combat.

### playerSpawn
```
{ x: 460, y: 620 }
```
Bottom-center, walking in like they just sat down.

---

## SCENE 1 — Track
**File:** `rm_track.jpg`
**Theme:** `park` (grass footsteps)
**Area Title:** `Track Practice — WJ`
**Dimensions:** 1200 × 660 (wide)

### What's in the image
- Full oval running track, top-down pixel art
- Dark green grass field inside the oval
- Straight lanes top and bottom, numbered 1–5 (top) and 1–4 (bottom)
- Lane lines in cream/off-white on black track surface
- Bleacher structures on left and right sides (dark grey-blue, isometric)
- Outer border: dark green grass
- Wide open interior field — the infield grass

### Coordinate notes (aligned to image)
The image is 1200×660 (approximately — wide format). Key reference points:
- **Top straight (lanes 1–5):** y ≈ 130–250, full width x: 160–1040
- **Bottom straight (lanes 1–4):** y ≈ 560–660, full width x: 160–1040
- **Left curve:** x ≈ 160–380, y ≈ 130–560
- **Right curve:** x ≈ 1020–1240, y ≈ 130–560
- **Interior infield (open grass):** x ≈ 380–1020, y ≈ 250–560
- **Left bleachers:** x ≈ 30–130, y ≈ 280–500
- **Right bleachers:** x ≈ 1070–1170, y ≈ 280–500

### Actor placements (2 characters)
Sean and Ben on the bottom straight. They're the only ones here. The space is large and empty around them — intentional.

| Character | Position | Notes |
|---|---|---|
| `sean` | x: 420, y: 610 | Left side of the bottom straight. He starts this. |
| `ben` | x: 780, y: 610 | Right side. He doesn't know yet. |

### playerSpawn
```
{ x: 600, y: 620 }
```
Bottom-center of the bottom straight. Player walks up into the conversation.

### Collision notes
- Track oval edges (inner and outer) should be solid — player stays on the bottom straight and infield
- Bleachers solid — impassable
- Interior infield walkable but empty — no story reason to go there; the scene is on the straight

### Boss arena
N/A — no boss fight in Scene 1. This is a two-character conversation scene. Short. Sparse. It ends with a block.

---

## PROP KEYS FLAGGED — PROCEDURAL FALLBACK

These propTypes used in the engine overlay layer have no confirmed sprite:

| propType | Usage | Status |
|---|---|---|
| `tv` | Group chat panel (Scene 0, left wall) | No sprite — procedural fallback |
| `tv` | Ben's phone glow (Scene 0, right floor) | No sprite — procedural fallback |
| `chair` | Student chairs at desks | No sprite — procedural fallback |
| `bench` | Bleachers (Scene 1) | Background image — no engine rect needed |

Note: bleachers and desks are part of the background image in both scenes. Engine rects are only needed for **solid collision boundaries** and **procedural overlay elements**. The furniture does not need to be re-drawn by the engine — just blocked off with invisible solid rects where appropriate.

---

## HANDOFF NOTES FOR STEP 3 (SCHEMA)

- Scene 0 background: `highschool.jpg` → register as `stage_wj_classroom` (or equivalent key)
- Scene 1 background: `rm_track.jpg` → register as `stage_wj_track` (or equivalent key)
- Both scenes use `invisible: true` background rect covering full map dimensions to load the stage image
- Procedural overlays (group chat panel, Ben's phone) are engine-rendered on top — use rect coordinates from this doc
- `changeScene` beat triggers transition from Scene 0 → Scene 1 when Ben tells Sean he's skipping practice
- Sean is present in **both** scenes — he's in the classroom for the early beats, then on the track for the collapse
