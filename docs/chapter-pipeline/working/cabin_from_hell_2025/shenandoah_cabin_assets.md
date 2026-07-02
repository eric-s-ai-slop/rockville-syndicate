# Shenandoah Cabin — Asset Spec (Step 4)

Chapter: `cabin_from_hell_2025` (index 11). Source: `chapter11.cabin-from-hell.ts` (Step 3) + `shenandoah_cabin_brief.md` (Step 1).
Verified against the code 2026-07: `src/game/audio.ts` (`CHAPTER_MUSIC_KEY`, `STAGE_MUSIC_URL`), `src/data/entities/bosses.ts`, and `ChapterScene.ts`'s `safeLoadImage` preload list.

**Net new assets: 2 MUST HAVE, 5 NICE TO HAVE, 1 CAN DEFER** — see the priority list at the end. Most of what this chapter needs already exists in the codebase; the two real gaps are the diegetic prank track and one image re-roll.

---

## 1. Stage music

**Recommended:** split by act, using the `scenes[]` per-scene `music:` override.

- **Scene 0 (OC Balcony): two tracks, crossfading mid-scene.** "Electric Feel" (MGMT) covers the "spins" stretch — arrival, H2O, the bars, pure lively "whoo vacation" energy before anything's gone wrong. It crossfades to "Space Song" (Beach House) right at the turn (Eric's "We're too old for this" line), carrying the balcony scene and Choice 1 as the mood curdles. Both NEW assets — need sourcing/licensing and adding to `STAGE_MUSIC_URL`. Playing two tracks within one scene needs a small engine addition: `AudioController.crossfadeToMusic()` already exists but is only ever called automatically on `changeScene` today — Step 5 needs a lightweight beat type (e.g. `changeMusic`) to trigger it mid-scene at the turn beat.
- **Scenes 1 & 2 (Cabin Interior / Deck):** reuse **`music_ch7`** ("Dark Beach" — Pastel Ghost), already the shared key for Ch7 (Spain) and Ch8 (Basye cabin). This chapter's brief explicitly builds a callback to Ch8's cabin ("same vocabulary, opposite verdict") — reusing the same moody-cabin track reinforces that rhyme intentionally rather than needing a new asset. **EXISTS, zero new work.**

**Tone brief:** Act 1 should sound like a normal good night — nothing ominous on the surface, all the dread has to live in the narrator's lines, not the score. Act 2 needs the same "moody night-cabin atmosphere" already established for Ch8, since these two cabins are meant to rhyme.

**Cue notes:** consider a `stopAllAudio` beat (short fade) right before the Day 5 "Alex is sick" reveal — the chapter has no hard tonal-turn silence beat yet, and this is the moment that earns one. Not in the current beats array; flag for a Step 3 iteration if you want it.

**Diegetic music — MUST HAVE:** "Ultraphonk" (spelling matches Ch8's established canon — the brief's own spelling variant "ultraphunk" is superseded by the shipped code), the track Eric & Alex blast on all three nights, is a named story element and a Ch8 callback ("the second deployment"). Needs a short (~20-30s loopable) clip. Recommend an original/royalty-free phonk-adjacent loop rather than licensing a real track — Ch8 already treats "Ultraphonk" as an in-universe playlist/genre name, not one specific real song, so an original loop is consistent with existing usage, not a new decision. This is load-bearing for `speakerHunt` specifically — the mode's entire loop is built around panning this track's volume by proximity, so the mode literally doesn't work without an audio file to pan. **Night-only:** it plays exclusively inside the three `speakerHunt` beats — the mode should duck/pause the active stage track (`music_ch7`) on start and restore it on teardown, so Ultraphonk is the only thing audible while the house is supposed to be asleep.

---

## 2. Location art

| Key | Scene | Status |
|---|---|---|
| `stage_oc_balcony_night` | 0 | **EXISTS** — generated, reviewed, matches the design. |
| `stage_cabin_interior` | 1 | **NEEDS REGENERATION** — current draft has a structural mismatch (duplicate room clusters instead of the single hallway the map design specifies). Revised prompt already written; not yet re-rolled. MUST HAVE fix — the map's collision rects won't line up with the art otherwise. |
| `stage_cabin_deck` | 2 | **EXISTS** — generated, reviewed, matches the design well. |

Map theme: `suburb_night` (Scene 0), `cabin` (Scenes 1 & 2) — both existing `MapTheme` values, no new theme needed.

All three images also need `safeLoadImage` calls added to `ChapterScene.ts`'s preload once finalized (convention: `src/assets/chapters/cabin_from_hell_2025/`) — none of the three keys are in the current preload list.

---

## 3. Prop sprites

Scanning `map.rects` for `propKey` values across all three scenes:

| propKey | Status |
|---|---|
| `furn_bed_double`, `furn_nightstand` | **EXISTS** — LimeZu pack |
| `furn_bed_single` (×2) | **EXISTS** — LimeZu pack |
| `furn_couch_long` | **EXISTS** — LimeZu pack |
| `prop_red_toilet` | **EXISTS** — already loaded (Ch3 hospital reuse) |

Everything else in the map (dining table, grandfather clock, recliner, TV, rug, kitchen counter/fridge/sink, gazebo posts, patio table, grill, Adirondack chair, guardrails) uses `propType` only, no `propKey` — these render via the engine's existing procedural fallback, not a missing asset. Two of them are worth flagging for polish:

- **`guardrail`** (balcony railing, deck railing) — no confirmed sprite, procedural fallback. NICE TO HAVE a real railing sprite; reused across two scenes in this chapter alone so it'd pay for itself.
- **`firepit`** (standing in for the gas grill on the deck) — no confirmed sprite, procedural fallback, and semantically a mismatch (a firepit prop rendering as a grill). NICE TO HAVE a real grill sprite or at minimum a `propKey` reskin.

---

## 4. Character sprites

| Actor id | Scene(s) | Status |
|---|---|---|
| `eric`, `jordan`, `nick_h`, `nick_f`, `maharko` | 1 (+0 for maharko) | **EXISTS** — main cast hero sheets |
| `alex`, `benji` | 0, 1 | **EXISTS** — `npc_alex_sheet`, `npc_benji_sheet` |
| `leo` | 1 | **NEW** — confirmed pre-existing gap (per the Step 4 doc's own inventory: "Leo has a speaker entry but no sprite sheet yet"). He's a placed, visible actor in this chapter (Night 2 aftermath line, Day 5 fusion beat), not just a speaker — MUST HAVE at least a temporary stand-in before this ships. Cheapest fix: tint/recolor an existing hero sheet (e.g. a palette-shifted `nick_f` or `jordan` base) as a placeholder rather than waiting on a full custom sheet. |
| `girl_chopped`, `girl_nonchopped` | 0 | **EXISTS as placeholder** — `ChapterScene.ts` already loads three generic girl-silhouette textures (`hero_girl1_raw_jpg` / `hero_girl2_raw_jpg` / `hero_girl3_raw_jpg`, all pointing at the same silhouette image) for exactly this kind of unnamed-background-character case. Wire both ids to these at Step 5 — no new art needed, though a distinct silhouette per girl (rather than the identical placeholder twice) would read better. NICE TO HAVE, not blocking. |

---

## 5. Boss assets

**Not applicable.** Per the mechanic spec (Step 2b) and schema (Step 3), this chapter uses no `bossFight` beat anywhere — the antagonist is the trip itself, carried entirely by `speakerHunt` (Nights 1-3) and the background `cabinCollapse` meter. No `BossConfig` entry needed in `entities.ts`.

---

## 6. SFX map

| Beat | Recommended SFX | Source |
|---|---|---|
| Hospital call phone buzz (silentDrive intro) | iPhone notification ding | **EXISTS** — already loaded ambient asset per `audio.ts` |
| Speaker found (any night) | Short "aha" sting | **EXISTS** — `kenney_music-jingles` has short stings that'll work |
| "The door's barricaded" (Alex, Nights 1 & 3) | Thud / slam | **EXISTS** — `kenney_impact` |
| Night 3 lockpick — segment complete | Rising tick or click | **EXISTS**, close enough — `kenney_interface` UI click layered per segment |
| Deck scene ambient (lanternflies) | Insect buzz | **NICE TO HAVE** dedicated lanternfly buzz; `CRICKET_AMBIENT_URL` (summer-night crickets, already loaded) is a fine substitute if deferred |
| Day 5 "Alex is sick" reveal | Hard cut to quiet | Use `stopAllAudio` beat (engine-native, no asset needed) — flagged above as a Step 3 addition |
| AC breaking (Day 3 narrator line) | Optional mechanical groan/thud | **CAN DEFER** — no close existing asset, low priority, the line reads fine without it |

Kept tight per the doc's own instruction — most of the chapter's beats (dialogue-heavy, siege-paced) don't need a sting; these are the handful where silence would undercut the moment.

---

## 7. Net new assets — priority list

**Total: 2 MUST HAVE, 5 NICE TO HAVE, 1 CAN DEFER**

```
MUST HAVE (chapter won't work without these):
[ ] stage_cabin_interior — regenerate per the corrected single-hallway prompt (see map design doc) — src/assets/chapters/cabin_from_hell_2025/
[ ] Ultraphonk diegetic loop — ~20-30s, original/royalty-free phonk-adjacent track — src/assets/audio/sfx/ (speakerHunt is unplayable without an audio source to pan)

NICE TO HAVE (chapter works but looks/sounds rough without these):
[ ] "Electric Feel" (MGMT) — Act 1 opening stage music, licensed clip — src/assets/audio/stage_music/
[ ] "Space Song" (Beach House) — Act 1 turn stage music, licensed clip — src/assets/audio/stage_music/
[ ] Leo temporary sprite stand-in (tinted existing hero sheet) — src/assets/images/game_decor/heroes/
[ ] guardrail sprite (used twice — balcony + deck railings) — src/assets/images/game_decor/special/
[ ] firepit → grill sprite/reskin (deck) — src/assets/images/game_decor/special/

CAN DEFER (placeholder is fine for now):
[ ] Distinct silhouette art for girl_chopped vs. girl_nonchopped (currently identical placeholder) — cosmetic only
```

Everything else — all four main-cast sprites appearing in this chapter, all furniture propKeys, two of the three stage backgrounds, and the day-side siege's SFX — already exists in the codebase with zero new work.
