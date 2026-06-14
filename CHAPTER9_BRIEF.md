# Chapter 9 Implementation Brief: The Suds & Soles Pool Party

**Status:** Ready for agent implementation. All pre-flight information extracted and validated.

---

## Pre-Flight Checklist (COMPLETED)

```
[✓] Chapter ID:                  'suds_and_soles_pool_party'
[✓] Chapter number:              9
[✓] Kind:                        'chapter'
[✓] Map theme:                   'park'  (outdoor pool party environment)
[✓] Title:                       'The Suds & Soles Pool Party'
[✓] Subtitle:                    'The Summer Siege'
[✓] Location:                    'Nick F\'s Backyard Pool'
[✓] Description:                 'The annual Suds & Soles 5K marathon blocks Jacob\'s street. A pool party becomes the lure.'
[✓] Has boss?                    NO (dialogue-driven chapter, no combat)
[✓] Music file:                  'SUMMER2026_FIRSTPOOLPARTY(Glass Animals - Heat Waves).mp3'
[✓] Music Phaser key:            'music_ch9'
[✓] Chapter-specific assets:     6 character sprites + 1 map sprite (all .jpg in SUMMER2026_FIRSTPOOLPARTY folder)
```

---

## Chapter Metadata

| Field | Value |
|-------|-------|
| **Chapter ID** | `suds_and_soles_pool_party` |
| **Chapter Index** | `9` |
| **Title** | `The Suds & Soles Pool Party` |
| **Subtitle** | `The Summer Siege` |
| **Location** | `Nick F's Backyard Pool` |
| **Description** | `The annual Suds & Soles 5K marathon blocks Jacob's street. A pool party becomes the lure.` |
| **Kind** | `chapter` |
| **Theme** | `park` |
| **Area Title** | `Suds & Soles Backyard` |
| **Has Boss** | NO |

---

## Story Summary (from SUMMER2026_FIRSTPARTY.txt)

### Act 1: The Blockade
- Jacob is trapped by the annual Suds & Soles 5K marathon blocking his street
- He claims he's having dinner with his grandma instead
- He's about to bail to watch basketball
- Then Eric confirms: "The girls are single"
- Jacob's attitude instantly flips — he's on his way

### Act 2: The Party Logistics
- Eric successfully deploys 20 lbs of ice to cool the pool from 87°F
- Nick F mans the grill to cook the Franks (hotdogs)
- Sam Ferretti arrives but feels nauseous, sits out on the patio
- Jacob arrives at 9:00 PM completely empty-handed (no Peach Red Bulls he was supposed to bring)
- Jacob didn't bring swim trunks either

### Act 3: The Hot Tub Arena
- Party migrates to hot tub with projector
- First, they watch the Knicks game (morale boost)
- Then they switch to "Heated Rivalry" (gay hockey romance)
- Jacob starts publicly calculating his sexuality on a scale: starting at 1%, climbs to 4%, claims 10% is his absolute maximum
- Sam watches from the patio, nauseous, ignoring Jacob's unhinged rant

### Act 4: The "Urban" Pool Jump
- Jacob finally decides to jump into the main pool
- He refuses to remove his hat, keeps his baseball cap on while submerged (wants to look "urban")
- He's still in his street clothes, shorts soaked
- He's clearly expecting attention from Anastasia and Sophia
- They completely ignore him — no laugh, no comment, nothing
- His Jestermaxxing attack fails completely

### Act 5: Epilogue
- Despite Jacob's missing Red Bulls, the 87°F pool hazard, and the chaos, the night is a success
- The Franks and ice were MVP moves
- Next morning at 1:40 AM, Eric drops the final verdict: "that party was so tuff"

---

## Map Layout

**Dimensions:** 960×640 (standard)
**Theme:** `park`
**Backdrop Color:** `0x1a5d4d` (dark pool water)
**Area Title:** `Suds & Soles Backyard`

### Map Structure:
- **Centerpiece:** In-ground pool (main render surface)
- **Prop:** Hot tub with projector setup (east side)
- **Seating:** Lounge chairs (south side, where Sam sits nauseous)
- **Grill Station:** Nick F mans the grill (west side, cooking Franks)
- **Patio Area:** Spectator zone (northeast corner)
- **Walls/Boundaries:** Fenced backyard perimeter (soft barriers, not solid)

---

## Actors & NPCs

| Actor ID | Name | Position Notes | Sprite |
|----------|------|-----------------|--------|
| `'nick_f'` | Nick F | At grill station (west), manning the Franks | `Nick_F(Pool).jpg` |
| `'nick_h'` | Nick H | Party crowd (central pool area) | `Nick_H(Pool).jpg` |
| `'jacob'` | Jacob | Arrives late (9:00 PM), moves to hot tub, then jumps in pool | `jacob(pool).jpg` |
| `'eric'` | Eric | Lounging, observing (motion arbitrage), ice deployment | `Eric(pool).jpg` |
| `'anastasia'` | Anastasia (Nick F's girlfriend) | VIP guest, bypasses motion arbitrage | `anastasia(pool).jpg` |
| `'sophia'` | Sophia (invited by Anastasia) | VIP guest, single, ignores Jacob's pool jump | `sophia(pool).jpg` |
| `'sam_ferretti'` | Sam Ferretti | Nauseous, sits on patio in spectator mode | (use procedural blob) |

---

## Story Beats Outline

### Beat 1: The Blockade Narrative
```
Speaker: narrator
Lines: [
  "The annual Suds & Soles 5K marathon was running directly past Jacob's house.",
  "The street was completely blocked. Police barricades. Thousands of runners.",
  "Jacob complained to the group chat. He couldn't leave. Dinner with grandma, he said."
]
```

### Beat 2: Jacob's Moment of Truth (Choice)
```
Speaker: narrator
Prompt: "Jacob was on the verge of bailing. He wanted to watch basketball instead. But then, the group chat shifted. Who showed up?"

Options:
  A) "The boys" → Jacob stays home (bad ending)
  B) "The boys and girls" → Jacob asks: "Girls? Are they single?" → Eric confirms: YES → Jacob: "I'm on my way"
```

### Beat 3: Party Setup Sequence
```
Speaker: eric
Lines: ["I got 20 lbs of ice. That pool is sitting at 87 degrees."]

Speaker: nick_f
Lines: ["Where are the Red Bulls? Where's the ice? Franks are on the grill."]

Speaker: eric
Lines: ["The ice just dropped. Pool's cooling down."]
```

### Beat 4: Jacob's Late Arrival
```
Speaker: jacob
Lines: ["Finally here. What'd I miss?"]

Speaker: nick_f
Lines: ["Where are the four Peach Red Bulls I asked you for?"]

Speaker: jacob
Lines: ["Uh... I brought my own beer."]
(Silent Disappointment passive triggers — nick_f absorbs it)
```

### Beat 5: Hot Tub Migration & Projector Setup
```
Speaker: narrator
Lines: [
  "The party moved to the hot tub.",
  "The Knicks game played on the projector. Vibes were great.",
  "Then the entertainment switched. They put on Heated Rivalry."
]
```

### Beat 6: The 10% Sexuality Scale (Mini-Boss Dialogue)
```
Speaker: jacob
Lines: [
  "That's... I'm like 1% right now.",
  "Wait, no. Maybe 4%. I'm definitely at 4%.",
  "But my absolute maximum? Hardcoded at 10%. That's it. That's the limit.",
  (More unhinged un-PC commentary continues)
]

Speaker: narrator
Lines: ["Sam Ferretti watched from the patio, nauseous, saying nothing."]
```

### Beat 7: Pool Jump Sequence
```
Speaker: narrator
Lines: ["Jacob finally decided to jump into the main pool."]

Speaker: jacob
Lines: ["I'm jumping in with my shorts on. And my hat stays on — it makes me look urban."]

Speaker: narrator
Lines: [
  "He jumped in soaking wet street clothes, hat still on his head.",
  "Anastasia and Sophia watched.",
  "They said nothing. They looked the other way.",
  "Jacob's Jestermaxxing attack hit zero."
]
```

### Beat 8: Epilogue (Victory)
```
Speaker: narrator
Lines: [
  "Despite the missing Red Bulls, despite Jacob's late arrival, despite the chaos in the hot tub...",
  "The Franks were perfect. The ice was perfect. The vibes were tight."
]

Speaker: eric
Lines: ["That party was so tuff."]
```

### Beat 9: End Chapter
```
{ type: 'endChapter' }
```

---

## Asset Files (Validated in Repo)

**Location:** `src/assets/chapters/SUMMER2026_FIRSTPOOLPARTY/`

| Filename | Use | Size |
|----------|-----|------|
| `Eric(pool).jpg` | Eric sprite (lounging) | 4.3 MB |
| `Nick_H(Pool).jpg` | Nick H sprite (party crowd) | 4.0 MB |
| `jacob(pool).jpg` | Jacob sprite (arrives late, pool jump) | 4.9 MB |
| `nick_f(pool).jpg` | Nick F sprite (grill station) | 5.7 MB |
| `anastasia(pool).jpg` | Anastasia sprite (VIP guest) | 3.8 MB |
| `sophia(pool).jpg` | Sophia sprite (VIP guest) | 3.8 MB |
| `pool_map.jpg` | Pool arena background/map | 7.4 MB |

**Music:** `src/assets/audio/stage_music/SUMMER2026_FIRSTPOOLPARTY(Glass Animals - Heat Waves).mp3` (3.7 MB)

---

## Implementation Checklist for Agent

```
BEFORE WRITING CODE:
[ ] Read ARCHITECTURE.md for technical overview
[ ] Read NEW_CHAPTER_FRAMEWORK.md for exact step-by-step recipe
[ ] Verify all files above exist in the repo

STEP 1 (src/data.ts):
[ ] NO BOSS → SKIP this step

STEP 2 (src/game/audio.ts):
[ ] Import: import ch9Url from '../assets/audio/stage_music/SUMMER2026_FIRSTPOOLPARTY(Glass Animals - Heat Waves).mp3?url';
[ ] Add to CHAPTER_MUSIC_KEY: suds_and_soles_pool_party: 'music_ch9',
[ ] Add to STAGE_MUSIC_URL: music_ch9: ch9Url,

STEP 3 (src/data/chapters.ts):
[ ] Create chapter9 constant with all metadata above
[ ] Copy dialogue beats from "Story Beats Outline" section
[ ] Add all 6 actors to actors[] array
[ ] Create map with park theme, pool centerpiece
[ ] Add chapter9 to CHAPTERS export array

STEP 4 (src/game/ChapterScene.ts):
[ ] Import all 6 character sprites:
      import eric9Url from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/Eric(pool).jpg?url';
      import nickH9Url from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/Nick_H(Pool).jpg?url';
      import jacob9Url from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/jacob(pool).jpg?url';
      import nickF9Url from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/nick_f(pool).jpg?url';
      import anastasia9Url from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/anastasia(pool).jpg?url';
      import sophia9Url from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/sophia(pool).jpg?url';
[ ] Preload each sprite in create() via safeLoadImage()

VALIDATION:
[ ] Run: npx tsc --noEmit (no TypeScript errors)
[ ] Test: Load chapter select, pick chapter 9, verify it loads without crashing
[ ] Test: Navigate to an NPC, verify dialogue triggers
[ ] Test: Advance through all beats to endChapter
[ ] Test: Audio plays (🔊 button in header)
[ ] Verify all character sprites render (check they show up on map)
```

---

## Quick Reference Tables

### Map Theme Color Palettes (Already Defined in chapters.ts)

```typescript
const C = {
  grass: 0x16331a,           // Dark grass (use for floor)
};
```

For pool water, use a darker blue-green: `0x1a5d4d` (dark teal/pool water)

### Speaker IDs (Pre-Existing in Game)

```
'eric'       → Eric Huang
'nick_f'     → Nick Farrar
'nick_h'     → Nick Hedgecock
'jacob'      → Jacob Lebby
'narrator'   → The Group Chat (system narration)
```

**NEW SPEAKERS** (add to EXTRA_SPEAKERS in chapters.ts):
```typescript
{ id: 'anastasia', name: 'Anastasia', emoji: '👰', color: '#f472b6' },
{ id: 'sophia', name: 'Sophia', emoji: '✨', color: '#a78bfa' },
{ id: 'sam_ferretti', name: 'Sam Ferretti', emoji: '🤢', color: '#8b5cf6' },
```

---

## Notes for Agent

1. **No Boss Fight** — This is a dialogue/narrative-driven chapter. No combat mechanics.
2. **Silent Disappointment Mechanic** — When Jacob arrives without the Red Bulls, Nick F absorbs the disappointment passively. This is a beat that advances without player choice.
3. **The 10% Scale** — Jacob's unhinged sexuality commentary is a joke/moment where the party reacts to his shenanigans. Keep it comedic.
4. **Sam's Spectator Mode** — Sam Ferretti should sit out on the patio (procedural blob, not a sprite) to observe the chaos while nauseous.
5. **The "Urban" Pool Jump Fails** — Jacob expects a reaction from Anastasia/Sophia. They give none. His Jestermaxxing attack backfires. This is the comedic peak.
6. **Victory Condition** — Despite all the chaos, the party is a success. End on Eric's line: "that party was so tuff."
7. **Sprite Import Names** — The filenames have spaces and parentheses. Use `?url` suffix in imports to handle special characters via Vite.

---

## Go/No-Go Decision

✅ **READY FOR IMPLEMENTATION**

All pre-flight information is complete, validated, and extracted. Agent can follow NEW_CHAPTER_FRAMEWORK.md mechanically with zero ambiguity.
