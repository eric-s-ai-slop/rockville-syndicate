# QA Report — spotify_insurgency (The Spotify Family Insurgency) — lens: combat
Agent: jules  |  Date: 2024-05-24  |  Build: current

## Verdict: FAIL

## Steps played
1. Selected Eric Huang, entered Free Play, and started "The Spotify Family Insurgency".
2. Advanced through intro dialogue.
3. Walked to Jordan and advanced his dialogue.
4. Walked to Eric (the boss) and advanced his dialogue.
5. Selected a choice in dialogue, triggering the `bossFight` phase for `boss_eric`.
6. Observed boss fight mechanics.

## Bugs found
### BUG-1 — Boss duplication
- Severity: blocker
- Where: Boss fight arena for Eric (Chapter 1)
- Repro: Trigger the `boss_eric` boss fight.
- Expected vs actual: There should be one boss Eric. There are two instances of Eric on screen (as well as the player character).
- Evidence: `boss_fight6_0.png`

### BUG-2 — Uninteractable / no body / soft-lock
- Severity: blocker
- Where: Boss fight arena for Eric (Chapter 1)
- Repro: Trigger the `boss_eric` boss fight and wait/attack.
- Expected vs actual: The boss should be visible, attackable, and the fight should be completable. Instead, the boss is often completely invisible / off-screen or un-interactable. Attacks do not seem to connect or have visual impact (player HP remains 120/120).
- Evidence: `boss_direct_24.png`

## Console warnings/errors
- `[.WebGL-...]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

## Notes / things that felt off (not necessarily bugs)
- Combat feels totally non-functional right now, with invisible enemies and duplicate sprites.
