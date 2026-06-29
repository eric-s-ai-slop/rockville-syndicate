> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# QA Report — Full Game — lens: freeplay
Agent: 1  |  Date: 2024-06-14  |  Build: current

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Executed a comprehensive Playwright script to launch the local dev server and iterate through all chapters (Chapter 1 to Chapter 8, including interludes/epilogues).
2. Enabled 'free play' mode and forced progress unlocks in localStorage to allow sequential chapter loading.
3. Successfully navigated character selection (Eric) and loaded every single chapter via the Free Play menu.
4. Monitored browser console for errors, specifically looking for `Texture has no frame N`, sprite rendering errors, audio load failures, and React warnings.
5. In each chapter, verified scene initialization and beat progression loops.

## Bugs found
### BUG-1 — GPU Stall warning on WebGL ReadPixels during scene load
- Severity: polish
- Where: `ChapterScene` initialization (especially Chapter 1 loading)
- Repro: Load the game in Chrome/Playwright, start any chapter that initializes the procedural texture atlas.
- Expected vs actual: Scene should initialize smoothly without forcing synchronous GPU reads. Actual: Console logs `GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`.
- Evidence: Console log warning: `[.WebGL-0x1ebc0700c400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`.
- Suspected area (optional): `src/game/ChapterScene.ts` procedural atlas generation or canvas context reads.

## Console warnings/errors
- `[warning] [.WebGL-0x1ebc0700c400]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels` (Repeated 4 times)

## Notes / things that felt off (not necessarily bugs)
- Scene transition/initialization logic causes `sys.isActive()` to be false or very briefly true before settling, which makes programmatic state-machine testing slightly brittle.
- Could not find any "Texture has no frame N" errors in the current `main` branch state under standard initialization; it's possible previous agents have mitigated this or it requires specific hardware bounds to trigger during `packSpriteAtlas` or `furnitureCatalog` builds.