## Playthrough: The Spain Betrayal
Reached: End of Chapter (Beat 11 of 11) — COMPLETED

### What I observed (with evidence)
- Eric is spawned twice: once as the player character (at x:450, y:500) and once as an NPC using the understudy "Jacob Lebby" (at x:160, y:240). Due to the camera zoom, the NPC version is completely off-screen (viewport y: -136).
  — evidence: `qa/chapter7-spain-betrayal/observe-shot-001.png` and `observe` output: `{"id":"eric","name":"Jacob Lebby","x":160,"y":240,"viewport":{"x":60,"y":-136}}`
- Nick Farrar's sprite is deleted from the screen entirely after returning from the boss fight minigame. He does not respawn as an NPC for his post-fight dialogue.
  — evidence: `qa/chapter7-spain-betrayal/checkpoint-004.png` and `observe` output shows the `npcs` list after `winmode` is missing `nick_f`.

### Blocks I hit and how I bypassed them
- Scene 1, beat 1: Dialogue advanced slowly, so I jumped ahead. → bypassed with `skipbeat 5`
  (this itself is a friction bug: no, just slow pacing during test)
- Scene 1, beat 8: Hit the Boss Fight minigame. → bypassed with `winmode`
  (this itself is a friction bug: no, intended gameplay)

### Not verified
- The dialogue choice at Beat 5 and its branches, because I bypassed it with `skipbeat 5`.
- The actual boss fight gameplay, because I forced a win with `winmode`.
