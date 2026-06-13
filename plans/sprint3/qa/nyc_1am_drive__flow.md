# QA Report — nyc_1am_drive (I-95 Northbound) — lens: flow
Agent: jules  |  Date: 2024-06-13  |  Build: da02370

## Verdict: FAIL

## Steps played
1. `npm run dev` and open game.
2. Started chapter "nyc_1am_drive" (I-95 Northbound) via Free Play.
3. Advanced initial dialogues ("August, 2024. Nick F drops 'WTM'...")
4. Received the choice: "Nick H initiates Bedtime Protocol. He's offering $40 to turn around. What do you do?"
5. Clicked "Accept the $40 bribe. The group turns back."
6. Also observed subsequent frames via Playwright.

## Bugs found
### BUG-1 — Choice loops and does not advance
- Severity: blocker
- Where: Dialogue choice regarding the $40 bribe
- Repro: Advance dialogue until the choice about the $40 bribe appears. Click "Accept the $40 bribe" (or any other choice if presented).
- Expected vs actual: It should register the choice and advance the story flow. Actual: It repeatedly stays stuck on the choice, preventing progress, as shown by screenshots.
- Evidence: Playwright script clicking it hangs over time because the UI never progresses beyond the choice.
- Suspected area (optional): src/game/ChapterScene.ts `advanceBeat()` or `selectOption()` handling of choices.

## Console warnings/errors
- BROWSER CONSOLE: Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.
- BROWSER CONSOLE: [.WebGL-0x...]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels

## Notes / things that felt off (not necessarily bugs)
- The dialogue choice mechanism appears fully unresponsive and leaves the player effectively soft-locked.
