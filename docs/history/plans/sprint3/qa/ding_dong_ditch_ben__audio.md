# QA Report — ding_dong_ditch_ben (Operation Ding Dong Ditch Ben) — lens: audio
Agent: Jules  |  Date: 2024-06-13  |  Build: 0cfcc14

## Verdict: FAIL

## Steps played
1. Run `npm run dev` and open `http://localhost:3000/`.
2. Press 'f' to enter Free Play mode.
3. Select chapter 6: `ding_dong_ditch_ben`.
4. Dismiss initial dialogue and walk Maharko up to the front door of 12 Watchwater Way.
5. Watch the approach beat finish and dialogue begin.
6. Observe the door opening and the chase starting.
7. Monitor all audio network requests and log Phaser console output.

## Bugs found
### BUG-1 — Knock SFX does not play
- Severity: major
- Where: At the front door (Beat 6 completion, transitioning into door open)
- Repro:
  1. Start chapter 6 (`ding_dong_ditch_ben`).
  2. Walk the player character to the front door (`walkTo` marker).
  3. Observe when the knock sound is supposed to play as the beat advances.
- Expected vs actual: The game is expected to play a series of knock sound effects (`sfx_knock`) using `impactPlank_medium_001.ogg`. However, the sound effect is never requested or played by the client (no network request for `.ogg` file is seen).
- Evidence: Playwright trace logs no network requests for `impactPlank_medium_001.ogg`.
- Suspected area (optional): `src/game/audio.ts` uses `import knockUrl from '../assets/audio/kenney_impact-sounds/Audio/impactPlank_medium_001.ogg';` (missing `?url` suffix, so Vite doesn't serve the raw URL string). This causes the `this.safeLoadAudio('sfx_knock', KNOCK_URL)` in `src/game/ChapterScene.ts` to fail silently.

### BUG-2 — No "door open" SFX
- Severity: polish
- Where: At the front door (Beat 7 - narrator dialogue "The door opens.")
- Repro: Walk up to the door and complete the dialog. Observe the door opening.
- Expected vs actual: There is a visual "door opening" narrative beat, but no specific door opening sound is loaded or triggered. The task suggests watching the "door-open", which currently happens in silence.
- Evidence: No door sound effect is configured in `src/game/audio.ts` or played in `src/game/ChapterScene.ts`.
- Suspected area (optional): Need to add a door open SFX and trigger it during beat 7.

## Console warnings/errors
- None specific to audio out of the ordinary.

## Notes / things that felt off (not necessarily bugs)
- The dialogue "blip" sounds play correctly.
- Background music does not seem to play initially during the walk up (no music track request). Chapter uses `ben_music(in the hall of the mountian king).mp3`.
