> **ARCHIVED** — Historical planning/handoff doc. May not reflect current code; verify against the source before acting on any item.

# Track D — Audio Completeness (Execution Spec)

**Lane:** 🟩 Engineer B (audio is content-adjacent, low contention) · **Budget:** ~5h · **Phase:** 1
**Owns (with B):** `src/game/audio.ts`, `src/game/scene/AudioController.ts`, audio assets.

> **Reality check — most of "Track D" from the old roadmap is already done.** The boss-music
> sting→loop **crossfade exists** (`AudioController.startBossMusic`, lines 134-159, fades the
> Prowler sting at 3127ms into the Techno-Tetris loop over 1000ms). `crossfadeToMusic` exists
> for scene transitions (lines 96-124), including the `music_ch6 → 0.70` per-track volume
> special-case. `sfx_knock` is loaded (`AudioController.ts:47`) and the Ch6 door-knock fires
> 3× on the front-door `walkTo` (`ChapterScene.ts:1283-1286`). So this track is **two small
> real gaps**, not a rebuild.

## Hard rules
`?url` imports for every audio file (the whole module already follows this — `audio.ts:1`).
Per-track volume fixes go inline in `AudioController` (e.g. the `music_ch6` case), not by
changing the global 0.30 default. Every `safeLoadAudio` failure must degrade silently. Honor
the Track C volume settings once they land (scale the fixed targets by `musicVolume`/`sfxVolume`).

---

## D1 — Ch8 "The Cabin" gets its own track (~1.5h)

**Goal:** Stop the epilogue reusing Chapter 1's frantic track. QA flagged the mismatch: the
"The Syndicate is whole" cabin epilogue currently plays `commons1522(coffee beabadobee).mp3`.

**Current state:** `CHAPTER_MUSIC_KEY.cabin_basye = 'music_ch1'` with the comment
*"no ch8 track yet — reuse commons1522"* (`audio.ts:51`).

**Work:**
1. Source a fitting mellow/warm cabin-epilogue track (friend pick is ideal — this is *their*
   game; ask the group for the song that means "the trip ended well").
2. Add it: `import ch8Url from '.../stage_music/<file>.mp3?url';`, register `music_ch8` in
   `STAGE_MUSIC_URL`, and point `CHAPTER_MUSIC_KEY.cabin_basye` at it.
3. If the track is mastered hot/quiet, add an inline volume case in `crossfadeToMusic`/
   `startStageMusic` like the existing `music_ch6` one — **don't** change the global default.

**Acceptance:** Ch8 plays its own track; network shows the new file, not `commons1522`;
volume sits right against the rest of the game.

---

## D2 — Diegetic SFX pass (~2.5h)

**Goal:** Fill the small silent moments with in-world sound. The unused Kenney RPG pack
(`kenney_rpg-audio/` — doors/books, noted as available in HANDOFF) is the source.

**Work:**
1. **Door-open SFX** on Ch6 (the narrator "The door opens." beat) — currently silent. Add a
   door-open sound to the `ambientSfx` config and fire it on that beat (the `onDoor` hook
   already exists; this is a second door event). Use `seek` if the asset has a slow head, per
   the jumpscare-audio gotcha in CLAUDE.md.
2. **Audit each chapter for an obvious missing diegetic cue** during the Phase-2 QA pass
   (e.g. a UI/impact sound on key story beats) and wire the highest-impact 2-3, reusing
   already-loaded Kenney keys where possible to avoid new assets.
3. Every new SFX: `safeLoadAudio` + existence check before `play`, and route volume through
   the Track C `sfxVolume` once available.

**Acceptance:** Ch6 door opens audibly; the 2-3 chosen diegetic cues fire reliably; no console
errors from missing audio; all honor mute/SFX volume.

---

## D3 (optional / stretch) — Per-boss loop selection (~1h)

**Goal:** Not every boss shares the single Techno-Tetris loop.

**Current state:** `startBossLoop` always plays `boss_loop` (`AudioController.ts:162-169`).

**Work:** Allow a boss to specify its own loop key (e.g. on `BossConfig`), with the current
loop as the default/fallback. Only worth doing if a fitting per-boss track exists — otherwise
leave the shared loop (it works) and spend the hour on D2.

**Acceptance:** A boss with a custom loop key plays it; bosses without one fall back to
`boss_loop`; no regression to the sting→loop crossfade.

## Budget
D1 1.5 · D2 2.5 · D3 1 (optional) = ~5h. Cut D3 first if the lane runs long.
