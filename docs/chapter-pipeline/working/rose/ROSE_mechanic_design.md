# Step 2b Output — Mechanic Design for "ROSE"

---

## STAGE 1 — CONFLICT RECAP

**What the player is fighting:** Not Maharko. The four defenses — the four things Maharko says to keep himself upright. The boss is the rhetoric, not the man. The man doesn't change. The rhetoric is what gets broken.

**What it should feel like:** Confrontational but hollow. The player names each defense as the defense it is, feels the satisfaction of saying it out loud, then feels the satisfaction curdle when the car keeps moving anyway. Body feeling: *I said it. It didn't matter. I'm still in the car.*

**What winning means emotionally:** The accounting is on the record. Four defenses named, four defenses broken, out loud, in the back seat, while the car was moving. The player did the one thing the group didn't do that night. But the makeout still happened, Rose is still in the back seat, the photos are still on Nick F's phone, and the player is now estranged from the Boca Syndicate with no ride home. Winning is the right thing done too late to change anything.

**What losing means emotionally:** The accounting is never said (or only partially said). The defenses stand. The Boca Syndicate closes ranks. The player goes home to Rockville knowing what happened and knowing no one in Boca will ever speak to them about it again. Losing is the right thing attempted and not landed.

**Real-world action mapped:** Arguing with someone who will not concede, in a closed space, while the space is moving. The car is literal. You can't leave. He won't stop. The fight is the saying.

---

## STAGE 2 — THREE CONCEPTS

### Concept A — Standard bossFight variant (CONSERVATIVE)

**The loop:** Standard bossFight. Player dodges Maharko's projectiles in the back-seat arena, fires back, triggers a single QTE near the end of the fight. Two phase barks (66%, 33%). One QTE question.

**Win condition:** Maharko's HP depleted.

**Lose condition:** Player HP depleted (standard bossFight lose).

**Emotional argument:** The standard fight can be themed to the chapter through content — Maharko's combat barks and the QTE question are tailored. But the standard two-phase structure can't deliver the four-defense arc the brief requires. The fight feels like a Project Omega boss fight, but it doesn't feel like *this* chapter's fight.

**Implementation cost:** LOW (content only — uses existing boss_maharko, only needs new barks and QTE).

**What it needs:** Nothing new. Just content.

**Verdict:** Doesn't deliver on the brief. The four defenses are the chapter's spine. Two phases can't carry them.

---

### Concept B — Modified bossFight: four phases, four QTEs, literal timer (RECOMMENDED — user pre-confirmed)

**The loop:** Modified bossFight. HP bar divided into four segments (25% each). Each segment triggers a phase bark (the defense) and a QTE (the break). Player dodges Maharko's projectiles and fires back between QTEs. A literal countdown timer ticks down — the car is going home. If the timer expires before all four defenses are broken, the fight ends and the player loses (partial accounting at best).

**Win condition:** All four defenses broken (all four QTEs answered correctly) before the timer expires.

**Lose condition:** Timer expires. Whatever defenses weren't broken stand. The car arrives home. The chapter proceeds to the drive home with a partial (or empty) accounting.

**Emotional argument:** The four-phase structure makes the chapter's rhetoric playable — each defense is a thing the player has to name out loud, in order, while the clock runs. The literal timer is the closed system made mechanical: the car is moving, you can't stop it, you have a finite window to say what needs saying before the night ends and the group absorbs what happened. Winning feels like the satisfaction of saying the thing curdling when the car keeps moving anyway. Losing feels like running out of time to say what you needed to say.

**Implementation cost:** MEDIUM (adapt existing bossFight mode — add four-segment HP, four QTE triggers, countdown timer UI).

**What it needs:** Modified bossFight mode (or a new mode extending bossFight), countdown timer UI element, four QTE configs instead of one.

**Verdict:** Delivers the brief. Unique and fresh. The four-phase + timer structure is bespoke to this chapter's argument.

---

### Concept C — New minigame mode: "The Car Ride" (AMBITIOUS)

**The loop:** A new mode built from `_template`. No shooting, no dodging. Pure real-time dialogue battle. The player faces Maharko in the back seat. Maharko delivers a defense (text appears, voiced if possible). The player has a timed menu of three responses. The correct response breaks the defense and advances to the next phase. Wrong responses cause Maharko to double down (his defense gets louder, the timer ticks faster). Four phases. Same literal countdown timer as Concept B.

**Win condition:** All four defenses broken before the timer expires.

**Lose condition:** Timer expires.

**Emotional argument:** The conflict is verbal, not physical. The player isn't shooting Maharko — they're arguing with him. This is the most thematically pure version. The fight feels like the actual thing: trying to break through to someone who will not concede, in a closed space, while the clock runs.

**Implementation cost:** HIGH (new mode from template — needs full GameMode lifecycle, dialogue UI, response menu, timer).

**What it needs:** New `carRide` mode in `src/game/modes/`, dialogue UI component, response menu component, timer.

**Verdict:** Most thematically pure. But the implementation cost is significant, and the standard bossFight's dodge-and-shoot loop already carries the "confrontation under pressure" feeling well. Concept B delivers 90% of Concept C's thematic weight at half the implementation cost.

---

## RECOMMENDATION

**Concept B.** User pre-confirmed interest in the four-phase modified bossFight. Concept C is thematically purer but the implementation cost is hard to justify when Concept B already delivers the chapter's argument. Concept A doesn't deliver the brief.

Proceeding to spec Concept B.

---

## STAGE 3 — FULL IMPLEMENTATION SPEC (Concept B)

### Beat config

```typescript
{
  type: 'bossFight',
  bossId: 'boss_maharko',
  arena: { x: 460, y: 430, w: 700, h: 320 },  // back seat open floor, from map spec
  introLines: [
    'MAHARKO — The Florida Wildcard',
    'Defeat him before the car gets home.',
  ],
}
```

### BossConfig draft (modified — four-segment HP, four QTEs, timer)

> **Note for schema agent:** The standard BossConfig schema supports a single `weaknessQTE`. This chapter requires four QTEs, one per phase. The schema agent will need to extend the BossConfig to accept `phaseQTEs: { [phase: number]: QTEConfig }` — or, if extending the schema is undesirable, the four QTEs can be triggered via four sequential `triggerQTE` calls handled in the bossFight mode's phase-transition logic. Recommend the latter (mode-side handling) to avoid schema changes.

```typescript
{
  id: 'boss_maharko',
  name: 'Maharko',
  title: 'The Florida Wildcard',
  maxHp: 400,  // 100 HP per phase — four segments
  combatBarks: [
    "Bro you weren't even there when I met her.",
    "Stop tripping. She's into it.",
    "I haven't had a W in months, let me have this.",
    "Why are you doing this in the car, bro? Read the room.",
    "Alex already tried this. Look where it got him.",
    "You don't get it. You're from Rockville.",
  ],
  // Four phase barks — one per segment. Triggered at 75%, 50%, 25%, and final.
  phaseBarks: {
    1: "I needed this. You don't understand what it's been like.",        // at 75% HP (phase 1 begins)
    2: "She liked me, bro. I could tell.",                                 // at 50% HP (phase 2 begins)
    3: "She's into it. Look at her. Look.",                                // at 25% HP (phase 3 begins)
    4: "Stop cockblocking me. I swear to god.",                            // at 0% HP (phase 4 begins — final defense)
  },
  // Four QTEs — one per phase. Each QTE is the act of naming the defense.
  // Schema agent: see note above re: phaseQTEs vs. mode-side triggerQTE handling.
  phaseQTEs: {
    1: {
      question: "Maharko says he needed this. What do you say?",
      options: [
        "Need doesn't create right.",              // correct — names the defense
        "I get it. We've all been desperate.",     // wrong — agrees with the defense
        "Calm down, bro.",                         // wrong — defuses without confronting
      ],
      correctAnswer: "Need doesn't create right.",
      damage: 0,  // phase already broken by HP depletion; QTE confirms the break
    },
    2: {
      question: "Maharko says she liked him. He could tell. What do you say?",
      options: [
        "A half-conscious 16-year-old can't like you in a way that means anything.",  // correct
        "Maybe she did. Who knows.",                                                    // wrong — agrees
        "That's between you and her.",                                                  // wrong — defers
      ],
      correctAnswer: "A half-conscious 16-year-old can't like you in a way that means anything.",
      damage: 0,
    },
    3: {
      question: "Maharko points at Rose. 'She's into it. Look at her.' What do you say?",
      options: [
        "That's incapacitation, not consent.",     // correct
        "She's drunk, not dead.",                  // wrong — minimizes
        "I'm not looking.",                        // wrong — refuses to engage
      ],
      correctAnswer: "That's incapacitation, not consent.",
      damage: 0,
    },
    4: {
      question: "Maharko turns on you. 'Stop cockblocking me.' What do you do?",
      options: [
        "I'm not going to stop.",                  // correct — doesn't back down
        "Fine. Do what you want.",                 // wrong — backs down (loses the fight)
        "Calm down, you're being aggressive.",     // wrong — defuses without confronting
      ],
      correctAnswer: "I'm not going to stop.",
      damage: 0,
    },
  },
  // Boss death quote — delivered after the fourth phase breaks.
  // Maharko doesn't die. He just stops defending. The car keeps moving.
  deathQuote: "Whatever, bro. You said your piece. The car's still moving.",
  actions: [],  // standard bossFight actions — projectile patterns, etc.
  // TIMER — non-standard. Schema agent: this needs to be added to the bossFight mode
  // for this chapter. See timer spec below.
  timer: {
    durationMs: 180000,  // 3 minutes — the drive home
    expiredOutcome: 'lose',  // timer expires = player loses
  },
}
```

### Timer mechanic spec

> **Note for schema agent / developer:** The standard bossFight mode does not have a countdown timer. This chapter requires one. Two implementation paths:
> - **(a) Extend bossFight mode** to accept an optional `timer` field in the BossConfig. If present, render a countdown UI element and end the fight with `outcome: 'lose'` when the timer expires. This is the cleaner path — future chapters can use the same field.
> - **(b) Create a chapter-specific bossFight variant** (e.g., `bossFightTimed`) that wraps the standard mode and adds the timer. Less reusable but lower risk to existing chapters.
>
> Recommend (a). The timer field is opt-in; existing chapters are unaffected.

**Timer behavior:**
- Timer starts when the boss fight begins (after `introLines`).
- Timer counts down from 180000ms (3 minutes).
- Timer UI: a thin bar at the top of the arena, labeled "DRIVE HOME" or similar. Depletes left-to-right.
- When timer reaches 0: fight ends immediately. `outcome: 'lose'`. Whatever defenses weren't broken stand.
- The chapter then proceeds to the drive-home beat with a partial (or empty) accounting. The narrator notes what was said and what wasn't.

**Win path:** All four QTEs answered correctly (which requires depleting all four HP segments, since each QTE triggers at a phase transition). Player HP can be low, but as long as the player survives and the timer hasn't expired, the fight continues. Winning = all four phases broken before timer expires.

**Lose path (timer):** Timer expires. Fight ends. Player loses. Partial accounting at best.

**Lose path (player HP):** Standard bossFight player-HP-depletion lose. The fight ends, the player is "down," the car keeps moving. This is functionally the same as the timer-expire lose — the accounting is incomplete. (Recommend making player HP generous — 5-6 hits — so the timer is the primary lose condition, not HP. The pressure should be time, not damage.)

### Difficulty note

**Is this fair on first attempt?** Yes, if tuned correctly.
- 3 minutes is tight but winnable for a competent player who engages with the QTEs.
- Player HP should be generous (the pressure is time, not damage).
- Maharko's projectile patterns should be standard difficulty — not a difficulty spike.
- The QTEs are the real challenge. A player who picks wrong answers will lose — not because the fight is hard, but because they didn't name the defenses correctly. This is thematically correct: the fight is about saying the right thing, not about dodging.
- **Should it be hard?** Medium. The timer creates pressure, but the fight itself shouldn't be a difficulty spike. The chapter's weight is in the content, not the mechanics.
- **Is there a "losing" that still feels like a valid ending?** Yes. If the timer expires, the chapter doesn't game-over. It proceeds to the drive home with a partial accounting. The narrator notes what was said and what wasn't. The player carries the partial accounting home. This is a real loss but not a game-over — it's a "you didn't get to say all of it" ending, which is its own kind of devastating.

### IntroLines

```typescript
introLines: [
  'MAHARKO — The Florida Wildcard',
  'Defeat him before the car gets home.',
]
```

First line: names the combatant (Maharko) and his archetype (Florida Wildcard — his character roster title).
Second line: names what's at stake — not the game mechanic, the emotional thing. The car is moving. You have until it gets home.

---

## OPTION B — HEAVIER CONSEQUENCES (revised per user request)

The brief's original Option B (stay silent) was a clean skip — no boss fight, same last line. User requested heavier consequences. Revised spec:

### Option B path

1. **No boss fight.** The choice beat ends. Straight to the drive-home beat.
2. **Different narrator lines in the drive-home beat.** The narrator indicts the player's silence directly. The narrator, who has been gossipy and taking sides all chapter, turns and addresses the player. Example lines (schema agent will finalize):
   - "You stayed silent. The car kept moving."
   - "Alex tried. You didn't."
   - "Jordan said nothing. You said nothing. The car arrived home."
   - "You are one of them now."
3. **Different last line.** Heavier. Names the player.
   - **A/C last line (for comparison):** "Rose is 16. She is in the back seat of a car going home. She does not know about the photos."
   - **B last line (heavier):** "Rose is 16. She is in the back seat of a car going home. She does not know about the photos. You are in the back seat with her. You said nothing."
   - Four sentences. The fourth is the indictment. The player is named.
4. **Persistent game-state flag.** The player who chooses B is marked with `rose_silence: true` in the game state. Future chapters can check this flag. Examples:
   - **Cabin chapter (Chapter 8, May 2026):** If `rose_silence: true`, the narrator mentions the player's silence when Maharko is at the firepit. The "villain was Inertia" line lands differently — the player is part of the inertia.
   - **Future Florida chapters:** The player is treated as a Boca insider rather than a Rockville visitor. NPCs reference the player's presence that night.
   - **Future Rockville chapters:** Nick F's relationship with the player is subtly different — Nick F knows the player stayed silent, and this affects their dynamic.

> **Note for schema agent:** The `rose_silence` flag needs to be set in the game state when Option B is chosen. The flag should be readable by future chapters' beat logic. This is a cross-chapter persistence requirement — confirm the game state system supports it. If not, the flag can be approximated via localStorage or a save-game field.

### Why this is heavier

The original B was "you skip the fight, same ending." The revised B is "you skip the fight, the narrator indicts you, the last line names you, and you carry a flag forever that future chapters will check." B is no longer the easy exit. B is the choice that costs the most *over time* — the player who picks A or C loses the night but is clean going forward; the player who picks B keeps their ride home but carries the silence for the rest of the game.

The canon outcome is still B (the group chose silence). But the player who chooses B now feels the weight of that choice, instead of feeling like they got away with the easy exit.

---

## HERO PICKER NOTE — NICK F DOUBLING

The playable characters are Nick F, Eric, Jacob, and Nick H. Two of these (Nick F and Maharko) are in the car. Maharko is not playable, so no conflict there. But Nick F is both playable AND in the front seat.

**The doubling rule:** If the player picks Nick F as their hero, Nick F also appears in the front seat as the canonical archivist. The hero is the player (Nick F); the front-seat Nick F is the NPC (Nick F). They're both Nick F. The chapter doesn't address the split — it just exists.

**Thematic read:** The player is Nick F. The player is the photographer. The player is the archivist. The chapter becomes about Nick F's split self — the hero Nick F who chose (Option A or C) to confront Maharko, vs. the canonical front-seat Nick F who chose to document and stay silent. The player is literally playing against the version of themselves that did the wrong thing. The last line — "she does not know about the photos" — hits differently when the player IS the person who took the photos.

**Implementation note for map agent / schema agent:** The front-seat Nick F placement (from the map spec) stands regardless of hero pick. If the player picks Nick F, the hero sprite and the front-seat NPC sprite are both Nick F. No understudy swap needed. The engine should handle two sprites with the same character id — confirm this is supported. If not, the front-seat NPC can use a `nameOverride` like `'Nick F (front seat)'` with a different internal id (e.g., `nick_f_front`) while keeping the `nick_f` sprite.

---

## FLAGS FOR THE SCHEMA AGENT (Step 3)

1. **Four-segment HP bar with four QTEs.** Standard BossConfig supports one QTE. This chapter needs four. Either extend the schema (`phaseQTEs` field) or handle via mode-side `triggerQTE` calls at phase transitions. Recommend mode-side handling.
2. **Countdown timer.** Standard bossFight has no timer. Add an optional `timer` field to BossConfig, or create a chapter-specific bossFight variant. Recommend extending bossFight mode with opt-in `timer` field.
3. **Option B persistent flag (`rose_silence: true`).** Cross-chapter persistence. Confirm game state system supports it.
4. **Option B different last line.** The chapter's `endChapter` beat needs to branch on the choice. The schema agent will need to write two versions of the final narrator beat — one for A/C, one for B.
5. **Nick F doubling.** Confirm the engine supports two sprites with the same character id, or use a `nick_f_front` id with `nameOverride`.
6. **Alex as canonical speaker.** (Carried over from map spec.) Alex has speaking dialogue in beat 4. Add `alex` to the canonical speaker list, or route Alex's dialogue through the narrator with attribution.

---

## WHAT THIS SPEC DOES NOT COVER

- **Boss sprite assets.** `boss_maharko` already exists per user confirmation. No new sprite needed. Asset agent (Step 4) will confirm.
- **SFX / music.** Asset agent handles. Recommend: no phonk during this fight. The music should be sparse — maybe just the car engine, low in the mix. The silence between barks is the point.
- **Projectile patterns.** Standard bossFight actions. The schema agent can use Maharko's existing action set from `boss_maharko`, or design new ones thematically (e.g., " defensiveness" projectiles that look like deflections). Recommend keeping it simple — the fight's weight is in the QTEs, not the dodging.
- **QTE wrong-answer consequences.** What happens when the player picks a wrong QTE answer? Recommend: Maharko's defense gets louder (he barks a follow-up line), the player takes a small HP hit (1-2 hits worth), and the QTE closes. The fight continues — the player can still win if they survive and the timer hasn't expired. Wrong answers cost time and HP, not the fight. This keeps the fight fair while making wrong answers feel consequential.
