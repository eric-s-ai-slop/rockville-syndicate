# QA Report — spain_betrayal (The Spain Betrayal) — lens: audio
Agent: jules  |  Date: 2024-05-24  |  Build: (local)

## Verdict: PASS-WITH-ISSUES

## Steps played
1. `npm run dev`, opened game to chapter select.
2. Selected "Eric Huang", started the story, and used 'f' for Free Play.
3. Started Chapter 7 (The Spain Betrayal).
4. Progressed dialogue to initiate the boss fight with "boss_nick_f".
5. Walked around to test surface walking audio during fight.
6. Defeated boss using Space attacks.

## Bugs found
### BUG-1 — Boss music does not start during Spain Betrayal fight
- Severity: major
- Where: Chapter 7 boss fight start
- Repro: Enter Chapter 7, advance dialogue to trigger the "boss_nick_f" fight. Observe the audio tracks playing.
- Expected vs actual: When the boss appears, `startBossMusic()` should be called (Prowler sting, followed by Techno-Tetris loop). Actual: `startBossMusic()` is never called when `boss_nick_f` spawns. The stage music (`music_ch7`) continues playing uninterrupted throughout the entire boss fight.
- Evidence: Playwright console log reveals `SOUND TRACKS PLAYING DURING FIGHT: [music_ch7]`. (When testing `startBossMusic()` manually via devtools, it works perfectly).
- Suspected area (optional): In `ChapterScene.ts`, `bossBeatResolve` and `launchFight` may not be properly hooking up for `boss_nick_f`, or the beat `bossFight` configuration in `src/data/chapters.ts` for chapter 7 lacks something, or `startBossMusic` isn't triggered for this specific boss sequence.

## Console warnings/errors
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

## Notes / things that felt off (not necessarily bugs)
- Footstep, typewriter, and dialogue blip audio played normally. Boss defeat/loot drops audio and victory music play normally. The main issue is strictly the missing Prowler sting + Techno Tetris loop transitioning.
