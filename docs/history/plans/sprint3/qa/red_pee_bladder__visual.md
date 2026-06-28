> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — red_pee_bladder (The Red Pee Bladder Strike) — lens: visual
Agent: jules  |  Date: 2024-06-13  |  Build: da02370

## Verdict: FAIL

## Steps played
1. Selected chapter "The Red Pee Bladder Strike" from Free Play.
2. Explored the starting area, checked assets and rendering.
3. Advanced the dialogue to trigger encounters.
4. Walked around with WASD keys to verify movement and sprites.

## Bugs found
### BUG-1 — Audrey sprite is a JPG image instead of a spritesheet/transparent PNG
- Severity: major
- Where: Audrey boss encounter
- Repro: Trigger Audrey boss fight in The Red Pee Bladder Strike.
- Expected vs actual: The Audrey boss sprite should be a properly cut out sprite or pixel art matching the game's style, instead it is loading `boss_audrey.jpg` which is presumably a literal JPEG picture with a background, acting as a "background-boxed prop/garbled sprite". The codebase also shows `gBA.generateTexture('boss_boss_audrey', 48, 48)` likely as a fallback or placeholder for her.
- Evidence: Visual inspection of code `import bossAudreyImg from '../assets/images/boss_audrey.jpg';` in `ChapterScene.ts` and the task list calling out "Audrey sprite (S3-T6)" as a known watch-item.
- Suspected area (optional): `ChapterScene.ts` asset import and texture loading for Audrey.

### BUG-2 — Hospital props are loaded as JPGs instead of transparent PNGs
- Severity: major
- Where: The Red Pee Bladder Strike environment
- Repro: Enter the chapter and look at the hospital props.
- Expected vs actual: Hospital bed, IV drip, cabinet, and red toilet props should be transparent PNGs, instead they are imported as `.jpg` which means they have opaque rectangular backgrounds ("background-boxed props").
- Evidence: Visual inspection of code imports in `ChapterScene.ts` (e.g. `hospital_bed.jpg`, `iv-drip.jpg`, `cabinant.jpg`, `red_toliet(evidence).jpg`).
- Suspected area (optional): `ChapterScene.ts` asset imports for `propHospitalBedUrl` etc.

## Console warnings/errors
- `[warning] [.WebGL-...]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `[warning] Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`

## Notes / things that felt off (not necessarily bugs)
- There is a typo in the asset filename for cabinet (`cabinant.jpg`) and toilet (`red_toliet(evidence).jpg`).
- The player controls are intentionally inverted after Audrey's Kidney Punch (WASD mapped differently).