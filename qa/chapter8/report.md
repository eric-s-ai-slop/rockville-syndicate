## Playthrough: The Cabin
Reached: Beat 15 of 19 — BLOCKED at beat 15 (Agent crashed)

### What I observed (with evidence)
- The initial title card for the chapter incorrectly displays the title and location for the previous chapter ("The Suds & Soles Pool Party", "Nick F's Backyard"). — evidence: `qa/chapter8/checkpoint-001.png`
- The actual scene for The Cabin loads correctly and renders the cabin interior and actors correctly. — evidence: `qa/chapter8/observe-shot-001.png`

### Blocks I hit and how I bypassed them
- Scene ChapterScene, beat "🏆 CLAIM BED A" (beat 6): The `walkTo` soft-locked because Maharko's NPC body (at x: 300, y: 450) physically blocked the player's path to the bed target at (x: 170, y: 160).
  → bypassed with `skipbeat 1`
  (this itself is a friction bug: yes, soft-lock due to NPC collision)
- The agent crashed during dialogue advance near beat 15 with a fatal error (`__OMEGA_GAME__ not available`), abruptly terminating the session.

### Not verified
- I could not verify the choice at beat 3 ("Are you 291 liquid?") because I bypassed it with `skipbeat`.
- I could not verify the final choice (beat 16) or the finale (beat 18) due to the agent crash.
