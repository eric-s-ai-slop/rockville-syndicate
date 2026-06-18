# Chapter Pipeline — Step 4 Output: Asset Specification

**Chapter:** Maria Brooke (Ch7)
**Date:** 2026-06-18

**Total net new assets: 4**
- 2 background images (classroom, track)
- 1 character sprite (Sean)
- 1 SFX (`sfx_message_ding`)

No boss assets. No new music. No new props (all procedural fallback).

---

## 1. STAGE MUSIC

**Recommended track:** `Flashbacks (slowed)`

**Tone brief:** Something synthetic and slightly too warm — the dreamy, almost-too-pretty register that lets you forget you're inside a fiction. Slow tempo, synth pads, a sub-pulse underneath that feels like phone notifications you can't stop checking. The music should not tell you this is a tragedy. It should tell you this is a bit that's still funny. That's what makes the landing hurt. PASTEL GHOST's dream-pop register matches the chapter's central trick — Maria Brooke feels real because the soundtrack feels real, and the player doesn't notice the dissonance until "I didn't get to see you :(" lands.

**Cue notes:**
- Music plays continuously under the minigame (beat 14). Do not duck, do not swap. The minigame IS the chapter sonically — pulling the music out would break the dream.
- Consider a brief 1.5s music duck when Ben blocks the account (beat 21) — one beat of near-silence, then back. The block is the only moment in the chapter where the fiction actually dies, and the music should flinch.
- Fade music out completely before the last line (beat 31). The line "The Maria Brooke thing is still funny though." lands over silence. This is non-negotiable.
- No boss music. No `Prowler` sting. The minigame replaces the boss fight — do not trigger the boss music system.

**Source conflict flagged:** `04_ASSETS.md` lists both `commons1522 → Chapters 1 and 7` and `PASTEL GHOST → Chapter 7`. Commons1522 is the apartment track — wrong register for a classroom chapter. Recommend removing commons1522 from the Ch7 assignment and keeping PASTEL GHOST. Whoever owns `audio.ts` should confirm.

---

## 2. LOCATION ART

### `stage_wj_classroom` — NEEDED
- **Source:** `highschool.jpg` (referenced in map design, Step 2a)
- **Dimensions:** 920 × 660
- **Visual style:** Top-down pixel art classroom, warm beige speckled tile floor, whiteboard centered across the top wall, teacher's desk upper-left with chair and supplies, four columns of student desks (4 rows deep, rightmost column only 2 rows), backpacks on some chairs, fluorescent lights visible on ceiling, bulletin boards and posters on upper-right wall.
- **Critical detail:** The bottom-right quadrant must be open floor (no desks) — this is where the boss arena would have been and where Ben's phone glow prop sits. Do not fill it.
- **Tone reference:** Institutional but warm. The warmth is what makes the bit feel safe. If the classroom looks too cold, the player tenses up too early and the bit doesn't land. If it looks too cozy, the track scene feels wrong. Aim for "this is where you went to school and you didn't think about it."
- **Destination:** `src/assets/images/game_decor/stages/stage_wj_classroom.png` (or `.jpg`)

### `stage_wj_track` — NEEDED
- **Source:** `rm_track.jpg` (referenced in map design, Step 2a)
- **Dimensions:** 1200 × 660 (wide format)
- **Visual style:** Top-down pixel art running track, full oval, dark green grass infield, cream/off-white lane lines on black track surface, lanes numbered 1–5 top / 1–4 bottom, dark grey-blue isometric bleachers left and right, dark green grass border.
- **Critical detail:** The track must feel exposed and empty. This is the only scene in the chapter without an audience — no group chat on the wall, no audience of friends. The visual emptiness is doing narrative work. Do not add detail to the infield. Leave it bare.
- **Tone reference:** Cold open. After the warmth of the classroom, the track should feel like the temperature dropped. The green is the same green but the warmth is gone.
- **Destination:** `src/assets/images/game_decor/stages/stage_wj_track.png` (or `.jpg`)

### Map theme values
- **Scene 0 (classroom):** `hospital` — closest existing theme to institutional tile. Concrete footsteps. (Map design recommendation; no new theme needed.)
- **Scene 1 (track):** `park` — grass footsteps. (Existing theme.)

No new `MapTheme` value required.

---

## 3. PROP SPRITES

Scanning `map.rects` across both scenes:

| propKey / propType | Status | Notes |
|---|---|---|
| `stage_wj_classroom` | NEEDED | Background image — see §2 |
| `stage_wj_track` | NEEDED | Background image — see §2 |
| `propType: 'tv'` (group chat panel, Scene 0) | Procedural fallback | No sprite. Engine renders dark rect with live chat feed on top. Per map design. |
| `propType: 'tv'` (Ben's phone glow, Scene 0) | Procedural fallback | No sprite. Engine renders dark blue rect with subtle alpha pulse. Per map design. |
| `propType: 'bench'` (bleachers, Scene 1) | Background only | Part of `stage_wj_track` image. Engine rect is invisible collision boundary, no sprite needed. Per map design. |

**No new prop sprites required.** The chapter is intentionally light on props — the classroom is the background image plus two procedural overlays, the track is the background image plus invisible collision. The visual minimalism matches the chapter's subject (a chat interface, rectangles and text).

---

## 4. CHARACTER SPRITES

| Actor id | Status | Notes |
|---|---|---|
| `eric` | EXISTS | Main cast |
| `jordan` | EXISTS | Main cast |
| `nick_f` | EXISTS | Main cast |
| `maharko` | EXISTS | Main cast |
| `nick_h` | EXISTS | Main cast |
| `ben` | EXISTS | `michael_bersofsky.jpg` exists from Ch6; reuse overworld sprite sheet for classroom/track/coda scenes |
| `sean` | **NEW** | See below |

### Sean — NEW sprite sheet needed

**Appearance / vibe:** Late-high-school track kid. Not part of the core Rockville group but adjacent to it — getting closer during this period. Probably wears track gear or athletic casual. Vibe is closer to Nick F's warmth than Eric's admin energy — practical, observant, in the room but not running it. He's the one who closes the loop because the consequence touched his world, not because he had a moral awakening. The sprite should not look heroic.

**Sprite sheet requirements:** Standard 4-direction walk + idle, same dimensions and frame layout as the rest of the main cast. Whatever pipeline produced Eric/Jordan/Nick F's sheets should produce Sean's.

**Temporary stand-in:** If shipping before Sean's sheet is ready, tint Nick F's sprite slightly cooler (desaturate, shift hue toward blue-grey) and use that. Not ideal — Nick F's body language reads warmer than Sean should — but functional for a playtest build. Flag clearly as a stand-in.

**Destination:** Wherever the rest of the main cast sprite sheets live (likely `src/assets/images/sprites/characters/` or equivalent — confirm with whoever owns the sprite pipeline).

---

## 5. BOSS ASSETS

**N/A.** This chapter has no `bossFight` beat — the `groupChat` minigame replaces it. No `BossConfig` is needed in `entities.ts`. No boss sprite, no boss music, no QTE modal.

This is the right call per the mechanic spec (Step 2b): the chapter's conflict is ambient and social, not a personal confrontation. The standard boss fight would have made the emotional landing feel like a video game ending.

---

## 6. SFX MAP

Walking the beats — only flagging moments where silence would feel wrong or where a sound lands the beat harder:

| Beat | Context | SFX | Source |
|---|---|---|---|
| 3 | Maria's first DM appears on chat panel | `sfx_message_ding` (soft, infectious) | **NEW** — see §7 |
| 8 | Ben sends his photo | Soft camera-shutter or notification thud | `kenney_interface` — notification/click variant |
| 14 | Minigame runs — `sfx_message_ding` fires on each message arrival (~36 times over 61s) | `sfx_message_ding` (volume 0.3, ambient) | **NEW** — same as beat 3 |
| 21 | Ben blocks the account | Single UI tap — dry, final | `kenney_interface` — clean click |
| 22 | changeScene to classroom (coda) | Brief fade-to-black sting, ~400ms | `kenney_interface` — soft transition |
| 31 | Last line ("The Maria Brooke thing is still funny though.") | Silence | None — non-negotiable |

**Not flagged:** narrator beats, dialogue beats in the classroom, the kart moment, the Ethan Rosner gambit, the coda welcome. These all play better dry. The chapter is about messages arriving — let the message sound carry the rhythm. Over-scoring these moments would make it feel like a cartoon.

**Repetitive SFX risk:** `sfx_message_ding` fires ~36 times during the minigame. Even at volume 0.3, this can become fatiguing. Recommend the mode vary the pitch slightly per play (±5% random) or use 2–3 variants (`sfx_message_ding_a/b/c`) cycling. Step 5 should implement whichever is cheaper. Flag for dev.

---

## 7. NET NEW ASSETS — PRIORITY LIST

**Total: 4 net new assets**

### MUST HAVE (chapter won't work without these)

- [ ] **`stage_wj_classroom`** — 920×660 pixel art classroom background, warm beige tile, whiteboard, 4-column desk layout, open bottom-right quadrant. Source from `highschool.jpg` or commission new. → `src/assets/images/game_decor/stages/`
- [ ] **`stage_wj_track`** — 1200×660 pixel art running track, top-down oval, dark green infield, cream lane lines, bleachers L/R. Source from `rm_track.jpg` or commission new. → `src/assets/images/game_decor/stages/`
- [ ] **`sfx_message_ding`** — Soft Instagram DM-style notification sound, ~200ms, infectious. Should feel like a real phone notification — the kind of sound that makes you reach for your pocket. Needed for the minigame to feel right (per mechanic spec). → `src/assets/audio/`

### NICE TO HAVE (chapter works but looks rough without these)

- [ ] **`sean` sprite sheet** — Standard 4-direction walk + idle, late-high-school track kid, practical-not-heroic vibe. Matches main cast frame layout. → main cast sprite directory (confirm path with sprite pipeline owner)

### CAN DEFER (placeholder is fine for now)

*(nothing — chapter is intentionally light on assets)*

---

## HANDOFF NOTES

- **To whoever owns `audio.ts`:** Confirm Ch7 music assignment. Source doc lists both `commons1522` and `PASTEL GHOST` for Ch7 — recommend PASTEL GHOST only. Add `sfx_message_ding` to the SFX map. Consider pitch variation or 2–3 variants for the repetitive minigame use.
- **To whoever owns the sprite pipeline:** Sean is a new character. If he'll appear in future chapters (likely — he's part of Ben's track world), commission a proper sheet. If this is a one-off, the Nick F tint stand-in works.
- **To whoever owns the stage art pipeline:** Both backgrounds have reference images (`highschool.jpg`, `rm_track.jpg`) — those should be the visual source of truth. If the references aren't usable as-is (wrong resolution, wrong style), commission new pixel art that matches the references' composition.
- **To Step 5 (INTEGRATION):**
  - Register `stage_wj_classroom` and `stage_wj_track` texture keys
  - Register `sfx_message_ding` audio key
  - Add `sean` to canonical speaker ids (per Step 3 handoff)
  - Confirm music routing uses PASTEL GHOST, not commons1522
  - No boss assets to integrate — no `BossConfig` to add to `entities.ts`
  - Playtest cue: confirm beat 31 (last line) plays over silence, not music
