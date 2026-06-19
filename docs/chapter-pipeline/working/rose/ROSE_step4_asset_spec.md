# ROSE (Chapter 5b) — Asset Specification

> Handoff document for whoever sources or creates assets for the Rose chapter.
> Produced by the asset specification agent from `ROSE_step4_input_bundle.md`.

**Chapter id:** `rose_florida`
**Chapter index:** 6 (sits between Ch5 and Ch6 in the registry)
**File:** `src/data/chapters/chapter5b.rose.ts`
**Location:** Boca Raton, FL — July 4th, 2024
**Scenes:** 3 (Party → Lawn → Car)
**Boss fight:** None (chapter uses carRide minigame, not `bossFight`)

**Net new asset count: 2 must-have · 3 nice-to-have · 4 can-defer** (see Section 7)

---

## 1. STAGE MUSIC

### Scene 0 — The Party (`apartment` theme, 920×660)

- **Recommended track:** **Reuse `music_ch5`** (the existing `Jordan_and_maharko` track in `src/assets/audio/stage_music/`).
- **Tone brief:** A Florida July 4th house party. The brief says "no phonk" and "something the player wants to leave." `music_ch5` is already Florida-coded and reads as highway-night energy rather than party energy — which actually serves the unease. The player walks into a party that already feels slightly off. If a dedicated `music_ch5b_party` track is later sourced, it should be muffled, like heard through walls, with a beat the player wishes would stop.
- **Cue notes:** No music shifts inside Scene 0. Music stops cleanly when the scene transitions to the lawn.

### Scene 1 — The Lawn (`florida` theme, 920×660)

- **Recommended track:** **No music.** Ambient crickets only (`CRICKET_AMBIENT_URL`, already in audio map).
- **Tone brief:** The lawn photo is the chapter's turn. Silence (or near-silence) is what makes it land. Music would smooth over a moment the brief explicitly wants unsmoothed. The narrator's flat description of Rose on the ground has to play against nothing.
- **Cue notes:** Cricket ambience fades in at scene start and holds flat through the photo moment and the scene transition. No swell, no sting.

### Scene 2 — The Car (`highway_night` theme, 920×660)

- **Recommended track:** **No music.** Engine ambience only (optional — see Section 6).
- **Tone brief:** The silence in the car is the point. Alex's intervention, the threat, the makeout — they all happen in the same flat acoustic register. Anything melodic would undercut the closed-system feel. The carRide fight also has no music per the mechanic spec.
- **Cue notes:** None. The carRide minigame drives its own SFX; the ambient layer stays minimal.

**Audio map changes required:** None, if reusing `music_ch5`. Set `music: 'music_ch5'` on `scenes[0]` in `chapter5b.rose.ts`. Omit `music` on `scenes[1]` and `scenes[2]`.

---

## 2. LOCATION ART

### Scene 0 — The Party

- **Background texture:** Uses `C.floorWood` (existing color constant) as backdrop. **No `stages/` image needed.** Interior is built from LimeZu Modern Interiors free pack tiles (already in `src/assets/images/game_decor/Interiors_free/`).
- **Map theme:** `apartment` — existing theme, carpet footsteps.

### Scene 1 — The Lawn

- **Background texture:** Uses `C.grass` (existing color constant) as backdrop. The "house wall" is a procedural rect (`propType: 'wall'`). The tree is a procedural rect (no `propKey`, fill `0x2d5016`). The walkway is a procedural rect (`propType: 'road'`).
- **Map theme:** `florida` — existing theme, concrete footsteps.
- **Optional new asset:** A `stage_florida_house_night` backdrop image (920×660, pixel art, dark suburban Florida house exterior at night with a lit window and lawn) would replace the procedural wall rect and give the lawn a real sense of place. Nice-to-have, not must-have — the procedural wall reads fine. Flagged in Section 7.

### Scene 2 — The Car

- **Background texture:** **NEEDED — strongly recommended.** No car interior sprite exists in the project. The current chapter config renders every car element (windshield, front seats, console, divider, back seats, doors, rear window) as procedural colored rects. This is the chapter's climactic location — the "closed system" visual metaphor lands harder with a real backdrop.
- **Recommended approach:** Source a single car interior background image (920×660, pixel art, rear-facing view from the back seat of a sedan at night — front seats visible from behind, dashboard glow, dark windows). Use as a backdrop rect with `invisible: true` so the existing procedural rects still handle physics. This matches the existing `stage_hospital` / `stage_jungle_gym` / `stage_watchwater_house` pattern.
- **Suggested asset key:** `stage_car_interior`
- **Suggested file path:** `src/assets/images/game_decor/stages/stage_car_interior.png`
- **Map theme:** `highway_night` — existing theme, concrete footsteps.

---

## 3. PROP SPRITES

Scanning `map.rects` for `propKey` values across all three scenes:

| Scene | propKey | Status |
|---|---|---|
| 0 (Party) | `furn_cabinet_tall` | **EXISTS** — LimeZu Modern Interiors |
| 0 (Party) | `furn_plant_tall` | **EXISTS** — LimeZu Modern Interiors |
| 0 (Party) | `furn_couch_long` | **EXISTS** — LimeZu Modern Interiors |
| 0 (Party) | `furn_coffee_table` | **EXISTS** — LimeZu Modern Interiors |

**That's the complete list of `propKey`'d props in the chapter.** No NEEDED props at the propKey level.

### Procedural props (no `propKey` — rendered as colored rects by design)

These are intentional procedural fallbacks and do **not** need sprites:

- **Scene 0:** TV (`propType: 'tv'`), kitchen counter (`propType: 'counter'`), sink (`propType: 'sink'`), fridge (`propType: 'fridge'`), rug (`propType: 'rug'`, not solid)
- **Scene 1:** house wall (`propType: 'wall'`), tree (no `propKey`, fill `0x2d5016`), walkway (`propType: 'road'`)
- **Scene 2:** all car elements (`propType: 'car'` — seats, console, divider), locked doors (`propType: 'door'`), windshield/rear window (`propType: 'window'`)

If the Scene 2 backdrop image is sourced (see Section 2), all Scene 2 procedural rects should be set to `invisible: true` so they handle physics only and the backdrop image carries the visuals.

---

## 4. CHARACTER SPRITES

Listing every actor id across all three scenes:

### Main cast (sprites EXIST)

| Actor id | Sprite key | Notes |
|---|---|---|
| `maharko` | `hero_maharko_sheet` | Appears in all three scenes |
| `jordan` | `hero_jordan_sheet` | Appears in all three scenes |
| `nick_f` | `hero_nick_f_sheet` | Scenes 0 and 1 |
| `nick_f_front` | `hero_nick_f_sheet` | Scene 2 — uses `spriteKey: 'hero_nick_f_sheet'` explicitly, no new asset |

### New characters (sprites NEEDED)

| Actor id | nameOverride | Priority | Suggested sprite key |
|---|---|---|---|
| `rose` | `'Rose'` | **MUST HAVE** | `npc_rose_sheet` |
| `alex` | `'Alex'` | **MUST HAVE** | `npc_alex_sheet` |
| `benji` | `'Benji'` | Nice-to-have | `npc_benji_sheet` |
| `rose_sister` | `"Rose's Sister"` | Can defer | `npc_rose_sister_sheet` |
| `party1` / `party2` / `party3` | `'Partygoer'` | Can defer | `npc_partygoer_sheet` (shared) |

#### Rose — visual brief
A 16-year-old girl, Florida July 4th, at a house party. Late evening. She should read as visibly younger than the rest of the cast — slighter frame, hair that reads as teenager rather than adult. By the time she's in the car (Scene 2), she's incapacitated; the sprite sheet needs an idle pose that works both standing (party) and slumped (back seat). Suggested stand-in if sprite can't be sourced in time: tinted blob in a soft pink tone — but this is the chapter's central figure and a blob genuinely undermines the weight. **Source the sprite.**

Suggested dimensions: standard NPC sheet size, 32×32 or 48×48 per frame, 4-directional walk cycle + idle. Match the format of existing `hero_*_sheet` assets.

#### Alex — visual brief
A young man, Florida, present at the party and in the car. He's the one who tells Maharko to stop — he has actual dialogue (beats 16–17). Recurring Florida character per the brief. He should read as a peer of Maharko and Jordan, not as an adult authority figure. Suggested stand-in if sprite can't be sourced in time: tinted `hero_jordan_sheet` blob (cooler tint, different hair) — workable for a first pass but not ideal since Alex has his own voice.

Suggested dimensions: same as Rose spec.

#### Benji — visual brief
Present at the party, silent in this chapter. Tinted blob acceptable. If a sprite is sourced later, a generic young-adult-male NPC sheet is fine. Suggested stand-in: tinted `hero_maharko_sheet` blob.

#### Rose's Sister — visual brief
Inside the house, unaware of what's happening on the lawn. Background presence. Tinted blob acceptable. If sourced, she should look like Rose's sibling — similar hair color, slightly older. Suggested stand-in: tinted Rose blob (if Rose has a sprite) or generic pink-tinted blob.

#### Partygoers ×3 — visual brief
Background atmosphere. Three tinted blobs in varying colors are fine. If sourced, three generic NPC sheets with party-clothing tints (or one shared sheet with three tint variations). Suggested stand-in: three differently-tinted blobs.

**Integration note:** Once sprite keys are decided, the Step 5 integration pass adds `spriteKey` to each `ActorPlacement` in `chapter5b.rose.ts`. Until then, the actors fall back to tinted blobs (which is the current code path).

---

## 5. BOSS ASSETS

**N/A — this chapter does not use a `bossFight` beat.**

The chapter's climactic confrontation is the **carRide minigame** (built by a developer per `ROSE_carRide_mode_spec.md`), not a `bossFight` beat. Per input bundle Section 13: no `BossConfig` is needed, no `boss_maharko` entry in the `BOSSES` map, no boss sprite beyond the in-world `hero_maharko_sheet` already placed in Scene 2.

The Maharko in-car sprite is the in-world actor placed at back-left of Scene 2. The carRide mode overlays UI on top of the existing scene; speech bubbles attach to the in-world sprite. **No dedicated portrait asset is required** (per input bundle Section 8, recommendation (a)).

If a Maharko portrait is later desired for visual punch during the fight, the asset key would be `portrait_maharko` (static PNG, facing player, expressive). Not needed for v1 — flagged as can-defer in Section 7.

No `BossConfig` TypeScript object is drafted here, because there is no boss fight to configure.

---

## 6. SFX MAP

Walking the beats and flagging moments where silence would feel wrong or where a sound would land a beat harder. Not every beat needs SFX — only the ones listed below.

| Beat | Context | Recommended SFX | Source |
|---|---|---|---|
| Scene 0 start | Party ambience | Crowd murmur loop | **EXISTS** — `CROWD_MURMUR_URL` (already in audio map) |
| Scene 0 — Maharko pours Rose a drink | The ramp | Liquid pour / cup set down | **EXISTS** — Kenney `kenney_rpg` pack (book/glass-type sounds) or `kenney_impact` (soft thud of cup on counter) |
| Scene 1 start | Lawn at end of night | Cricket ambience loop | **EXISTS** — `CRICKET_AMBIENT_URL` (already in audio map) |
| Beat 10 — Nick F takes the lawn photo | The chapter's central image | Camera shutter + screen flash | **NEEDED** — no camera shutter SFX confirmed in audio map. Closest existing option: Kenney `kenney_interface` UI click (too thin). Recommend sourcing a short mechanical shutter sound (≤500ms, .ogg). Visual: white screen flash, 1 frame. |
| Beat 19 — Nick F takes the car photos | The makeout, photographed | Camera shutter + screen flash | **NEEDED** — same shutter SFX as above, reused |
| Scene 2 start | Inside the moving car | Engine hum loop (low, constant) | **NEEDED** (optional) — not currently in audio map. Low priority. Silence also works per brief. |
| The choice (three lose-lose options) | UI selection | UI select ping | **EXISTS** — `UI_SELECT_URL` (`select_004.ogg`, already in audio map) |
| carRide — correct response | Defense broken | UI success ping | **EXISTS** — `UI_SELECT_URL` or `VICTORY_JINGLE_URL` (`jingles_STEEL03.ogg`) |
| carRide — wrong response | Defense holds | Low thud / glass crack | **EXISTS** — `UI_CRACK_URL` (`impactGlass_light_000.ogg`) |
| carRide — phase transition | Phase 2, Phase 3 | Skip SFX | Camera flash + shake conveys it visually (per mechanic spec) |
| carRide — timer expiry (lose) | Failure sting | Descending tone | **NEEDED** (optional) — no failure sting confirmed in audio map. Workaround: reuse `UI_CRACK_URL` at lower pitch, or defer. |
| Last line ("She does not know about the photos.") | End of chapter | None | Silence is the point. Do not add SFX. |

### SFX assets to source

- **Camera shutter SFX** — short mechanical shutter sound, ≤500ms, .ogg format. Suggested key: `SFX_CAMERA_SHUTTER_URL`. Goes in `src/assets/audio/kenney_interface-sounds/` if pulled from Kenney, or a similar UI sounds folder. **This is the single most-impactful SFX gap** — the lawn photo and car photos are the chapter's spine, and a thin UI click undersells the moment.

### SFX assets not required

- **Engine hum** — silence is acceptable per brief.
- **Timer-expiry sting** — reuse `UI_CRACK_URL` or defer.
- **Phase transition** — skip per mechanic spec.

---

## 7. NET NEW ASSETS — PRIORITY LIST

**Total net new assets: 9** (2 must-have · 3 nice-to-have · 4 can-defer)

```
MUST HAVE (chapter won't work without these):
[ ] npc_rose_sheet — Rose sprite sheet (4-dir walk + idle, 32×32 or 48×48 per frame) — src/assets/sprites/ (or wherever hero_*_sheet assets live). Rose is the chapter's central figure; a tinted blob undermines the weight.
[ ] npc_alex_sheet — Alex sprite sheet (same spec as Rose) — same directory. Alex speaks (beats 16-17) and is a recurring Florida character.

NICE TO HAVE (chapter works but looks rough without these):
[ ] stage_car_interior — 920×660 pixel-art car interior backdrop (rear-facing view from back seat, night, dashboard glow, dark windows) — src/assets/images/game_decor/stages/stage_car_interior.png. Used as invisible backdrop for Scene 2; procedural rects handle physics.
[ ] SFX_CAMERA_SHUTTER_URL — short mechanical camera shutter SFX (.ogg, ≤500ms) — src/assets/audio/kenney_interface-sounds/ or equivalent. Plays at beat 10 (lawn photo) and beat 19 (car photos). Pair with 1-frame white screen flash visual.
[ ] SFX_ENGINE_HUM_URL — low constant engine hum loop (.ogg, seamless) — src/assets/audio/ambient/ or equivalent. Ambient for Scene 2. Silence is also acceptable per brief.

CAN DEFER (placeholder is fine for now):
[ ] npc_benji_sheet — Benji sprite sheet (silent in this chapter; tinted hero_maharko_sheet blob is acceptable stand-in)
[ ] npc_rose_sister_sheet — Rose's sister sprite sheet (background, unaware; tinted blob acceptable)
[ ] npc_partygoer_sheet — shared partygoer sprite sheet (3 actors use it; tinted blobs in varying colors are acceptable)
[ ] music_ch5b_party — dedicated July 4th party track (muffled, party-through-walls energy). Reuse music_ch5 until sourced. Add to CHAPTER_MUSIC_KEY and STAGE_MUSIC_URL when added.
[ ] SFX_TIMER_EXPIRY_URL — descending failure sting for carRide lose condition. Reuse UI_CRACK_URL at lower pitch until sourced.
[ ] stage_florida_house_night — 920×660 pixel-art suburban Florida house exterior at night for Scene 1 backdrop. Procedural wall rect is acceptable; this would add sense of place.
[ ] portrait_maharko — static PNG portrait for carRide UI overlay. Not needed; in-world sprite is recommended approach.
```

### Do NOT source or create

- **Actual photo images of Rose** (lawn photo, car photos). The photos exist only in dialogue. The narrator's flat description is the point. The last line lands because the player has been imagining them. Maximum visualization is a camera flash + shutter SFX. See input bundle Section 9, strong recommendation (a)/(b).
- **`boss_maharko` BossConfig entry.** Chapter uses carRide minigame, not `bossFight`. No boss config needed.
- **New partygoer sprites beyond a shared sheet.** Three tinted blobs in varying colors are fine for background atmosphere.

### Audio map changes required (for the integration step)

**If all MUST HAVE and NICE TO HAVE assets are sourced:**
- `STAGE_MUSIC_URL` — no change (reuse `music_ch5` for Scene 0)
- New constant: `SFX_CAMERA_SHUTTER_URL` in `src/game/audio.ts`
- New constant (optional): `SFX_ENGINE_HUM_URL` in `src/game/audio.ts`
- No new `CHAPTER_MUSIC_KEY` entries required (chapter id `rose_florida` maps to existing `music_ch5`)

**If only MUST HAVE assets are sourced (minimum viable):**
- No audio map changes at all. Scene 0 uses `music_ch5`, Scenes 1 and 2 silent. Lawn photo and car photos land without shutter SFX (visual flash only, or skip flash entirely). Chapter still works.

---

*End of asset spec. Hand off to whoever is sourcing/creating the assets. The two must-haves (Rose + Alex sprites) are the gating items — everything else has an acceptable fallback.*
