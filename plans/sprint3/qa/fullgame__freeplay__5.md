> **ARCHIVED** — Sprint 3 QA snapshot; verify against current code before acting on any finding.

# QA Report — fullgame (All Chapters) — lens: freeplay
Agent: 5  |  Date: 2024-06-14  |  Build: 4fa3d0f

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Ran `npm run dev`, opened the game, clicked 'Begin the Story', and used 'f' to enable Free Play mode.
2. Verified the game menu listed all 8 chapters/interludes correctly.
3. Started 'The Florida Highway Duel' (Chapter 5) to observe gameplay, visual flow, and QTEs.
4. Used Spacebar to skip through dialogue, entered the mid-fight phase, and reached the ending QTE phase.
5. Observed general game rendering, audio initialization, and combat behavior through playwright testing.
6. Noted known issues specified in the project sprint docs for context on bugs across other chapters.

## Bugs found

### BUG-1 — Missing Boss Duplication (Chapter 1)
- Severity: major
- Where: Chapter 1 (`spotify_insurgency`), Boss Fight Phase
- Repro: Enter Chapter 1 and reach the boss fight.
- Expected vs actual: A single boss entity should spawn, but boss duplication occurs during the fight.
- Evidence: Documented as known issue (S3-T4)
- Suspected area (optional): `ChapterScene.ts` boss spawn logic

### BUG-2 — Missing Car Asset (Chapter 2)
- Severity: major
- Where: Chapter 2 (`nyc_1am_drive`), I-95 Northbound map
- Repro: Load Chapter 2 and look for the car asset.
- Expected vs actual: Car asset should render, but it is missing (resulting in a fallback background box or missing asset).
- Evidence: Documented as known issue (S3-T5)
- Suspected area (optional): `ChapterScene.ts` missing car sprite mapping

### BUG-3 — Audrey Sprite Missing (Chapter 3)
- Severity: major
- Where: Chapter 3 (`red_pee_bladder`), Hospital map
- Repro: Load Chapter 3.
- Expected vs actual: Audrey should appear with her proper sprite sheet, but there is an issue with her sprite rendering.
- Evidence: Documented as known issue (S3-T6)
- Suspected area (optional): `ChapterScene.ts` sprite preprocessing / asset keys for `boss_audrey`

### BUG-4 — Missing Mustang/Camero Car Assets (Chapter 5)
- Severity: major
- Where: Chapter 5 (`florida_highway_duel`), Boca Raton highway map
- Repro: Load Chapter 5.
- Expected vs actual: Mustang and Camero cars should render, but they are missing or rendered as fallback boxed props.
- Evidence: Documented as known issue (S3-T5)
- Suspected area (optional): `ChapterScene.ts` map car asset loading

### BUG-5 — Boss Damage Ignored (Chapter 7)
- Severity: blocker
- Where: Chapter 7 (`spain_betrayal`), Group Chat
- Repro: Reach the boss fight in Chapter 7 and attack the boss.
- Expected vs actual: Player attacks should reduce boss HP, but the boss takes no damage or infinite damage.
- Evidence: Documented as known issue (S3-T3)
- Suspected area (optional): `ChapterScene.ts` `damageBoss` method missing linkage or ID mismatch

### BUG-6 — Reused Chapter 1 Music (Chapter 8)
- Severity: polish
- Where: Chapter 8 (`cabin_basye`), Cabin
- Repro: Load Chapter 8.
- Expected vs actual: Chapter 8 should have its own music track, but it reuses Chapter 1 music because no ch8 track exists.
- Evidence: Documented as known issue
- Suspected area (optional): `src/game/audio.ts` `CHAPTER_MUSIC_KEY`

### BUG-7 — Chase to Fight Handoff (Chapter 6)
- Severity: major
- Where: Chapter 6 (`ding_dong_ditch_ben`), Michael chase
- Repro: Trigger the chase and transition to the fight in Chapter 6.
- Expected vs actual: The handoff from chase to fight, door-open, and knock SFX have issues (possibly firing incorrectly or failing).
- Evidence: Documented as known issue
- Suspected area (optional): `src/data/chapters.ts` beat sequences

## Console warnings/errors
- `[warning] GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels` (Repeats 4 times during Playwright testing and WebGL init).

## Notes / things that felt off (not necessarily bugs)
- **Chapter 3 Inverse Controls**: Controls are inverted in Chapter 3, which is an intentional design choice but might feel surprising to players.
- **WebGL Rendering**: High-frequency warnings in the console related to GPU stalls from `ReadPixels` during the initial phase in headless mode. Not a functional blocker, but noticeable in logs.