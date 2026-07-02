# Shenandoah Cabin — Mechanic Design (Step 2b)

Chapter: `cabin_from_hell_2025` (Summer 2025 — Ocean City & Shenandoah Cabin)
Feeds Step 3 (SCHEMA) alongside the creative brief (`shenandoah_cabin_brief.md`) and the map design (`shenandoah_cabin_map_design.md`).

This is a big, siege-structured chapter, so the mechanic isn't one encounter — it's five small, cheap activities spread across the whole arc, most of them reusing or lightly adapting existing modes rather than building new ones. No standard `bossFight` beat is used anywhere — the cabin was never a person to fight.

**Master timeline (all playable moments, in story order):**

| # | Story beat | Mode | New / reused |
|---|---|---|---|
| — | After the bedroom claim (scene 5) | `cabinCollapse` starts (background) | New |
| 1 | Hospital call (scene 6) | `silentDrive` | Reused, needs generalizing |
| — | Day 2 water-out (scene 7) | `cabinCollapse` (live, `onDialogue`) | — |
| 2 | Day 2 deck + lanternflies (scene 8) | `cabinCollapse` (ambient spawn) | — |
| 3 | Night 1 — Rung 1 (scene 9) | `speakerHunt` (night: 1) | New |
| — | Day 3, 90° living room (scene 10) | `cabinCollapse` (live) | — |
| 4 | Day 3 shroom freakout (scene 11) | `storyFractures` | Reused as-is |
| 5 | Night 2 — Rung 2 (scene 12) | `speakerHunt` (night: 2) | New |
| — | Day 4 third sick (scene 13) | `cabinCollapse` (live) | — |
| 6 | Night 3 — Rung 3 (scene 14) | `speakerHunt` (night: 3, + lockpick) | New |
| — | Day 5 fusion / retreat (scenes 15–16) | `cabinCollapse` self-resolves | — |

`cabinCollapse` is background and gets torn down by every foreground mode **and every `changeScene` transition** (confirmed in `ChapterScene.ts` — `transitionToScene` tears down `activeMode` unconditionally). It has to be re-registered after each interruption; see the timeline at the end of its section.

---

## Stage 1 — the conflict (recap)

- **What the player fights:** each night — finding the speaker(s) before patience runs out. Overall — the cabin's compounding systems failure, which nobody can fight, only watch.
- **Feel:** nights should feel like actually searching a dark room by ear. The siege overall is attritional — a checklist that keeps re-breaking.
- **Winning, emotionally:** each night's find is a small, real, funny relief. The siege has no win — "winning" is redefined as leaving together, which the chapter denies as a real victory.
- **Losing, emotionally:** running out of time on a night isn't a fail state, it's the joke running longer. The siege's "loss" is the retreat — recognition, not defeat.

---

## 1. `speakerHunt` — recurring mode, escalating config (Nights 1–3)

One implementation, three deployments, each adding one new layer of texture on top of the last — matching the brief's rung table almost verbatim.

### Night 1 — Rung 1: the introduction

One real speaker near the TV (100, 350). To sell "searching a real room" instead of "walk toward the loud rectangle," add 3–4 **red herring spots** at furniture already on the map:

- Under the rug (250, 650)
- Behind the grandfather clock (130, 90)
- Inside the recliner (280, 350)

Walking into a red herring zone fires a quick in-character bark ("Nick H checks under the rug. Nothing.") and a "cold" audio cue; the real spot gets progressively "warmer" via the proximity-volume cue (see loop below).

### Night 2 — Rung 2: the escalation

Two speakers — under the pullout (190, 520) and the corner (80, 720) — and the brief is specific that someone has to *realize* the bass is under them, get out of bed, and extract it, twice:

- The mode opens with a forced beat: player sprite starts in an "asleep" pose on the pullout, then a jolt (screen shake + bass sting) wakes them.
- Each speaker location becomes a two-step interaction instead of walk-and-done: reach the zone, then hold an input for ~1.5s to "yank it out" (a short tug-of-war beat — just enough resistance to sell "extract," not a full minigame).

### Night 3 — Rung 3: the peak

Follow the sound down the hallway to the bathroom door (950, 405). On the way, **Eric & Alex's door (950, 690) is a hard-blocked, visible barricade** — a barricade prop appears over the gap once Night 1 starts (see barricade note below) and stays solid for the duration of every `speakerHunt` mode. A player who tries that door first just bounces off it — free characterization, no extra mechanic needed.

Reaching the bathroom door triggers the **lockpick puzzle** (replaces the earlier QTE-modal idea):

- A horizontal gauge appears (`ctx.add.rectangle` track + marked "sweet spot" zone + a thin moving indicator).
- The indicator auto-sweeps back and forth (`Math.sin(time * speed)`); holding `[SPACE]` slows the sweep.
- Landing the indicator in the sweet spot and holding it fills a 3-segment progress bar. Completing a segment increases sweep speed for the next one (it gets harder the longer this goes on, mirroring the brief's "15 minutes, all hands on deck").
- A slip resets only the *current* segment's progress, never the whole bar — this rung succeeding is canon, so the puzzle is for texture and tension, not a real fail state. If `speakerHunt`'s overall time budget expires mid-puzzle, auto-resolve as solved ("they get there, just louder").

**Barricade implementation note:** scoped to when a `speakerHunt` mode is active (spawned in `start()`, destroyed in `teardown()`) rather than a true always-on map change, since there's no first-class beat type for permanently mutating map collision mid-chapter. This blocks the door during all three nights, which is when it narratively matters most. Flag for Step 3 if you want it solid during the daytime too — that would need a different implementation (e.g. baking it into the map as solid from the start, with the "claim" framed as happening before Day 2 rather than after Night 1).

### `speakerHunt` — loop, config, lifecycle

**Loop:**
1. On start: dim the screen (fullscreen semi-transparent black overlay, `scrollFactor(0)`, high depth), duck/pause the active stage track via `ctx.audioController`, start the Ultraphonk audio loop, spawn trigger zones for every entry in `config.speakers[]` plus `config.redHerrings[]` (Night 1 only). Ultraphonk plays only inside this mode — nowhere else in the chapter — since it's diegetically "time to go to sleep and the prank starts."
2. Every frame: measure distance from `ctx.player` to the nearest un-found real speaker, pan the Ultraphonk volume by proximity (louder = closer) — the "follow the source material" cue, no on-screen marker.
3. On overlap with a red herring: bark + cold cue, zone stays interactive (can re-trigger, harmless).
4. On overlap with a real speaker: mark found, stop contributing to the volume cue, `ctx.showPassiveIconText('FOUND IT', ...)`, short sting. Night 2 speakers require the extra hold-to-extract step first.
5. Night 3 only: the trigger zone at the door opens the lockpick puzzle instead of instant-resolving.
6. All speakers found (+ Night 3's puzzle resolved): `onComplete({ outcome: 'win' })`, fade out audio, remove overlay, destroy barricade.
7. Timer expiry (Nights 1–2 only): `onComplete({ outcome: 'lose' })` → routes to a short "found it late" reaction beat, not a real failure.

**Config schema:**
```typescript
interface SpeakerHuntConfig {
  night: 1 | 2 | 3;
  speakers: { x: number; y: number; id: string; requiresExtract?: boolean }[];
  redHerrings?: { x: number; y: number; bark: string }[]; // Night 1
  locked?: { doorX: number; doorY: number }; // Night 3 — triggers the lockpick puzzle
  barricade: { doorX: number; doorY: number }; // Eric & Alex's door, all nights
  timeLimitMs: number;
}
```

**`preload(ctx)`:** nothing new — overlay and lockpick UI are drawn primitives, no new sprites. Needs an `Ultraphonk`-style audio loop (flagged below).

**`start`/`update`/`teardown`:** as described in the loop above; `teardown()` must destroy the overlay, all trigger zones, the barricade collider/prop, the lockpick UI (if mid-puzzle), stop the Ultraphonk loop, and restore the ducked stage track.

---

## 2. Leo's ER wait (scene 6) — reusing `silentDrive`

`silentDrive` (a fullscreen "pick a prompt, get a terse reply" tension beat) fits Jordan calling Nick H at urgent care well. **But the current implementation is not actually config-driven** — I read the source (`src/game/modes/silentDrive/index.ts`) and it hardcodes the speaker names ("Maharko"/"Ben"), the prompt list, and always resolves `outcome: 'win'` after exactly 3 exchanges with a fixed `"..."` reply. Reusing it here means generalizing the mode first — this is a real code change, not free config wiring. Cost: LOW-MEDIUM, but not zero.

**Proposed generalized config:**
```typescript
interface SilentDriveConfig {
  title: string;
  askerId: string; askerLabel: string; askerColor: string;
  responderId: string; responderLabel: string; responderColor: string;
  promptOptions: string[];   // 3 shown at random per round
  responsePool: string[];    // one picked at random per round
  rounds?: number;           // default 3, always resolves 'win'
}
```

**Beat config for our chapter:**
```typescript
{
  type: 'minigame',
  modeId: 'silentDrive',
  config: {
    title: 'THE CALL FROM URGENT CARE',
    askerId: 'jordan', askerLabel: 'Jordan', askerColor: '#a78bfa',
    responderId: 'nick_h', responderLabel: 'Nick H', responderColor: '#94a3b8',
    promptOptions: [
      'What happened?',
      'Is he okay?',
      'Should we come get you?',
      'How long is this going to take?',
      'Do you need anything?',
    ],
    responsePool: [
      'Kidney stones, apparently.',
      "He's fine. Loud about it, but fine.",
      "No, stay — we've still got to grab groceries.",
      'No idea. Rural urgent care hours.',
      'Just... time, I guess.',
    ],
    rounds: 3,
  },
  introLines: ["Jordan's phone buzzes.", "Car 2's pin is dropped on a hospital."],
  background: false,
}
```

Always resolves `win` — no fail state needed, it's pure tension/texture ("why is this happening"), not a challenge.

---

## 3. Nick F's shroom freakout (scene 11) — reusing `storyFractures` as-is

This one needs **no code changes** — `storyFractures` is already fully config-driven (`storySegments[]` with optional `fractureId`/`fractureHint`), and its actual mechanic ("the group tells a story, mark the details that don't add up, miss one and you get a forgiving retry — 3 attempts by default") maps almost exactly onto Nick H trolling Nick F while he's tripping.

**Two of the story beats below stand in for the brief's explicitly flagged `[ANCHOR NEEDED]` lines** ("one specific Nick F line during the freakout, or one specific Nick H troll beyond 'you peed yourself'") — these are placeholders, not final content. Swap them for the real lines when you have them.

```typescript
{
  type: 'minigame',
  modeId: 'storyFractures',
  config: {
    storySegments: [
      { speaker: 'nick_h', text: "You're doing great, man. Real steady." },
      { speaker: 'nick_h', text: "So, full disclosure — you peed yourself about ten minutes ago.", fractureId: 'peed', fractureHint: "That didn't happen." },
      { speaker: 'nick_f', text: '...I did?' },
      { speaker: 'nick_h', text: "Yeah. The bathroom's actually right there now — Jordan and Maharko's bed. That's the bathroom.", fractureId: 'bathroom_bed', fractureHint: 'That is definitely a bed.' },
      { speaker: 'jordan', text: '(from the bed, not moving) ...yeah that tracks.' },
      { speaker: 'nick_h', text: 'Also — quick heads up — your hands have been a different color this whole conversation.', fractureId: 'hands', fractureHint: "His hands are normal." },
      { speaker: 'nick_h', text: "You've actually been standing here for like forty minutes.", fractureId: 'time', fractureHint: "It's been four minutes, tops." },
      { speaker: 'nick_f', text: "I don't feel good." },
    ],
    reviewWindow: 4000,
    allowReplay: true,
    maxAttempts: 3,
  },
  introLines: ['Nick H is the trip setter.', 'Nick F is not doing great.'],
  background: false,
  loseGoto: 'nickf_freakout_believes_it', // he actually goes looking for the "bathroom" — converges back after
}
```

---

## 4. Deck lanternflies (scene 8) — ambient only, no new mode

Since `ModeContext` has no `currentSceneIndex`, a background mode can't ask "am I on the deck right now" — so this is wired as a one-shot reaction inside `cabinCollapse`'s existing `onDialogue` hook rather than anything scene-aware. When the Day 2 narrator line introducing the lanternflies plays (the story has the player physically on the deck at that point, so this is safe to assume), `cabinCollapse` spawns 3–5 wandering fly sprites at fixed deck coordinates (roughly the open floor between the gazebo and the railing, x: 500–750, y: 200–500) with simple idle-wander tweens, sized by the current `bugs` meter value (`count = max(2, round(bugs / 20))`). No interaction, no win/lose — pure atmosphere, torn down along with everything else in `cabinCollapse.teardown()`.

This isn't built for repeat deck visits — the brief only calls for one (Day 2). If a later beat sends the player back to the deck, it'll need its own trigger; flagged below.

---

## `cabinCollapse` — the actual boss, background mode across Days 2–5

Four meters (water / AC / bugs / illness) rendered as a small top-right HUD, escalating only in response to narrator day-cut lines it watches for via `onDialogue`. It cannot be won. It self-resolves on Day 5 and is the only place the chapter is genuinely unwinnable by design.

**Config schema:**
```typescript
interface CabinCollapseConfig {
  startDay: number;
  meters: {
    water: number;   // 0-100, % functional
    ac: number;      // 0-100, % functional
    bugs: number;    // 0-100, infestation severity
    illness: number; // 0-4, sick-body count
  };
}
```

**`onDialogue` matches (illustrative — tune exact strings at Step 3):**
- "water is out" → `water -= 50`
- "Maharko" + sick/bed-bound language → `illness = 1`
- lanternfly narrator line (Day 2) → spawn ambient flies (see above)
- "AC" + "90" → `ac -= 60`
- "water out again" → `water -= 25`
- Jordan sick language → `illness = 2`
- Nick F sick language → `illness = 3`
- Alex + Leo sick language (Day 5) → `illness = 4`, flash all bars red, hold 1.5s, `onComplete({ outcome: 'lose' })` (hygiene marker only — the retreat beats are scripted directly, not gated by this).

**Full re-registration timeline** (every foreground mode *and* every `changeScene` tears this down — six registrations total):

```typescript
// R0 — after the bedroom claim (scene 5), before the hospital call
{ type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 2, meters: { water: 100, ac: 100, bugs: 15, illness: 0 } }, introLines: [...], background: true }

// R1 — after silentDrive (hospital call) resolves, before Day 2 water-out narration
{ type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 2, meters: { water: 100, ac: 100, bugs: 15, illness: 0 } }, introLines: [], background: true }

// R2 — after Night 1 speakerHunt resolves, before Day 3 AC beat
{ type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 3, meters: { water: 50, ac: 100, bugs: 20, illness: 1 } }, introLines: [], background: true }

// R3 — after Nick F's storyFractures resolves, before Night 2
{ type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 3, meters: { water: 25, ac: 40, bugs: 20, illness: 2 } }, introLines: [], background: true }

// R4 — after Night 2 speakerHunt resolves, before Day 4
{ type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 4, meters: { water: 25, ac: 40, bugs: 30, illness: 2 } }, introLines: [], background: true }

// R5 — after Night 3 speakerHunt resolves, before Day 5 fusion
{ type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 4, meters: { water: 25, ac: 40, bugs: 30, illness: 3 } }, introLines: [], background: true }
```

Exact meter numbers are illustrative and safe to tune at Step 3 — what matters structurally is that a re-registration beat lands on **every** branch after **every** foreground interruption (including Choice 2's Option B/C shortcuts, which skip Night 3 entirely and need their own re-registration before Day 4).

---

## QTE carrier — no longer needed

Earlier drafts used `ctx.triggerQTE` with a placeholder `boss_bathroom_door_qte` `BossConfig` for the fork-unlock. That's replaced by the in-mode lockpick puzzle above — no `BossConfig` entry needed for this chapter at all.

---

## IntroLines

- **Siege start:** "The cabin has been failing since you arrived." / "You just haven't noticed yet."
- **Hospital call:** "Jordan's phone buzzes." / "Car 2's pin is dropped on a hospital."
- **Night 1:** "Eric and Alex flip the switch." / "Somewhere in the living room, Ultraphonk starts blasting."
- **Nick F freakout:** "Nick H is the trip setter." / "Nick F is not doing great."
- **Night 2:** "Night two." / "It's under someone this time."
- **Night 3:** "Night three." / "This time, it's behind a locked door."

## Difficulty note

Every playable moment except the siege meter is designed to be close to unlosable — timeouts and slips make scenes funnier and longer, not failures, because the canon outcomes (Rung 3 succeeding, the group getting through the freakout) are fixed points the story needs regardless of player skill. The `cabinCollapse` meter is the one place the chapter is actually unwinnable, on purpose: the player can ace every night and still lose the war.

---

## Flags for Step 3 (schema)

- Choice 2's three options: **A** → Night 3's `speakerHunt` (canon), **B** → skip straight to Day 4 narration, **C** → a short divergent reaction beat (speaker hidden in the sick room instead) converging back to Day 4. **All three branches need their own `cabinCollapse` re-registration beat** before Day 4 narration — B and C skip Night 3's R5 entirely and would otherwise leave the meter stale.
- `silentDrive` needs real code changes (generalized config per the schema above) before it can be reused here — not a drop-in, budget dev time accordingly.
- `speakerHunt` is a new mode — needs its own folder under `src/game/modes/speakerHunt/`, registration in `src/game/modes/index.ts`, and a doc entry in `src/game/modes/CLAUDE.md`.
- `Ultraphonk`-style audio loop needs to exist or be added for `speakerHunt`'s dark-search sting — check `CHAPTER_MUSIC_KEY` / sfx loading in `src/game/audio.ts` before assuming a key exists.
- Two `storyFractures` segments above are placeholders standing in for the brief's `[ANCHOR NEEDED]` flags — get the real lines from the user before this locks.
- The Night 3 barricade on Eric & Alex's door is only solid while a `speakerHunt` mode is active (spawned/destroyed per-mode) — it is *not* solid during daytime beats. Flag if you want it permanently solid from Night 1 onward regardless of time of day; that needs a different implementation (baked into the map as solid from the start).
- Deck lanternflies are wired as a one-shot reaction inside `cabinCollapse.onDialogue`, not scene-aware — if any later beat revisits the deck, it needs its own trigger to redraw the flies at updated density.
- No `bossFight` beat or boss arena is used anywhere in this chapter — the map doc's living-room rect (`{ x: 255, y: 470, w: 380, h: 480 }`) is just the general Night 1/2 search zone, not a combat arena.
