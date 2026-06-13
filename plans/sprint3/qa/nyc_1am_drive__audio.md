# QA Report — nyc_1am_drive (Operation Inertia) — lens: audio
Agent: jules  |  Date: 2026-06-13  |  Build: da02370

## Verdict: PASS-WITH-ISSUES

## Steps played
1. Opened the game, cleared local storage, navigated to main menu, chose "Eric Huang" as the crew member, hit "Begin the Story".
2. Toggled Free Play mode and loaded `nyc_1am_drive`.
3. Skipped through dialogue to reach the walking segment.
4. Walked the character left and right to trigger footsteps.
5. Observed the audio state via injected console scripts.

## Bugs found
### BUG-1 — Wrong chapter music plays during nyc_1am_drive
- Severity: major
- Where: Chapter initialization
- Repro: Load `nyc_1am_drive` chapter.
- Expected vs actual: The track `music_ch2` (nightcall kavinsky) should be playing. Instead, the track `music_ch1` (commons1522 coffee) from Chapter 1 is playing.
- Evidence: Captured audio logs show `music_ch1` playing instead of `music_ch2`.
- Suspected area: `ChapterScene.ts` possibly preloading or not switching audio tracks correctly, or an issue in `loadChapterAudio`. (In `ChapterScene.ts`, `CHAPTER_MUSIC_KEY['nyc_1am_drive']` returns `music_ch2`, but the actual audio played and logged by Phaser is `music_ch1`).

## Console warnings/errors
- None related to audio loading specifically observed.

## Notes / things that felt off (not necessarily bugs)
- Preloading of the current track and the next track might be causing `music_ch1` to either be playing over it or not being stopped from a previous chapter.
