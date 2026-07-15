# Ben’s Life — Asset Specification

Audit basis: canonical chapter config in `src/data/chapters/chapter13.bens-life.ts`, chapter manifest in `src/game/assets/chapter/bensLife.ts`, and the runtime preload/sprite pipeline. Statuses below reflect the code, which is authoritative over the draft briefs.

**Net-new asset count: 2** — the Michael Bersofsky and long-term-substitute actor sprite sheets. All selected music, the straw-drinking SFX, stage backgrounds, map prop rendering, and other character art now have source assets or approved existing stand-ins.

## 1. STAGE MUSIC

### Recommended tracks

Use a different track for each era. All seven selected source files now exist; four are currently in the chapter working folder and still need to be moved into the canonical stage-music directory and registered with audio keys.

| Act / scenes | Selected track | Status | Recommended key / implementation note |
| --- | --- | --- | --- |
| Act I — scene 0, 51 Monroe | Roddy Ricch — “The Box” | EXISTS — SOURCE SUPPLIED | `docs/chapter-pipeline/working/bens-life/Roddy Ricch - The Box [Official Audio].mp3`; move to stage music and register as `music_bens_the_box`. |
| Act II — scene 1, quarantine | “In the Hall of the Mountain King” | EXISTS | Use `music_ch6`; the source is `ben_music(in the hall of the mountian king).mp3`. |
| Act III — scene 2, Ocean City | YBN Nahmir — “Rubbin Off the Paint” | EXISTS — SOURCE SUPPLIED | `docs/chapter-pipeline/working/bens-life/YBN Nahmir - Rubbin Off The Paint (432hz).mp3`; move to stage music and register as `music_bens_rubbin_off_the_paint`. |
| Act IVa — scenes 3–4, pool room and Halloween | Yeat — “Turban” | EXISTS — SOURCE SUPPLIED | `docs/chapter-pipeline/working/bens-life/Yeat - ''Turban'' (Up 2 Me).mp3`; move to stage music and register as `music_bens_turban`. |
| Act IVb — scenes 5–6, whiteboard and F1 climax | Yeat — “Money So Big” | EXISTS — SOURCE SUPPLIED | `docs/chapter-pipeline/working/bens-life/Yeat - Monëy so big (Lyrics).mp3`; move to stage music and register as `music_bens_money_so_big`. |
| Act V — scene 7, engineering class | Mac Miller — “The Spins” | EXISTS — RECOMMENDED | Use `music_ch11_spins`. Its buoyant, reckless school-year energy supports the car-battery climax and sets up a strong contrast with the coda. |
| Act VI / coda — scene 8, scenic overlook | Beach House — “Space Song” | EXISTS | Use `music_ch11_space_song`. |

### Tone brief

The score should evolve with Ben: ominous swagger for the roof operation, frantic classical escalation for quarantine, then increasingly internet-era rap energy as his social and Formula One mythology peaks. “The Spins” keeps the electrical climax reckless and funny; “Space Song” then removes that momentum and lets the overlook feel suspended, distant, and briefly uncomfortable.

### Cue notes

- Scene 0 opens on “The Box.”
- The scene 1 transition crossfades to `music_ch6` for the Raspberry Pi and lock-picking panic.
- The scene 2 transition crossfades to “Rubbin Off the Paint” for the Ocean City uniform, toilet-water stunt, and G-force training.
- The scene 3 transition starts “Turban” for the Colleen/pool sequence; carry it through the Halloween scene.
- The scene 5 transition switches to “Money So Big” for the whiteboard era, then carries it into scene 6 so the Formula One plan is the musical peak of the Golden Age.
- The scene 7 transition switches to `music_ch11_spins` for the battery experiment.
- The scene 8 transition crossfades to `music_ch11_space_song`. Let its opening create the coda’s pause; avoid a comic sting over Maharko’s final lines.
- Each scene can carry the corresponding `music:` key, so the existing `changeScene` beats perform the crossfades without extra `changeMusic` beats.
- No boss-intro cue is needed: the Formula One climax is a `minigame`, not a `bossFight`.
- Existing beat cues: `sfx_message_ding` after the dying-phone line and `sfx_door_open` after the lock panic.

The four newly supplied commercial files still need usage-rights confirmation before release. Their game versions should be loop-safe edits that cover the full assigned scenes rather than short one-shot excerpts.

### Diegetic music

**NONE.** No song is part of the story world. The Formula One material is narrated and played as a minigame, not presented as a diegetic broadcast.

## 2. LOCATION ART

All nine chapter backgrounds **EXIST** as 1216×880 JPEGs under `src/assets/chapters/bens_life/` and are wired through `src/game/assets/chapter/bensLife.ts`. The maps are 920×660 and use these images as their full-map backdrop keys.

| Scene | Location / texture key | Status | Map theme | Existing file |
| --- | --- | --- | --- | --- |
| 0 | 51 Monroe roof landing — `stage_bens_51_monroe` | EXISTS | `apartment` | `stage_51_monroe_roof_landing.jpg` |
| 1 | Quarantine bedroom — `stage_bens_quarantine_bedroom` | EXISTS | `apartment` | `stage_quarantine_bedroom.jpg` |
| 2 | Ocean City rental — `stage_bens_ocean_city_rental` | EXISTS | `florida` | `stage_ocean_city_rental.jpg` |
| 3 | Mahargo’s pool room — `stage_bens_mahargos_pool_room` | EXISTS | `pool_party` | `stage_mahargos_pool_room.jpg` |
| 4 | Halloween party — `stage_bens_halloween_party` | EXISTS | `apartment` | `stage_halloween_party.jpg` |
| 5 | Junior classroom / whiteboard — `stage_bens_junior_classroom` | EXISTS | `apartment` | `stage_junior_classroom.jpg` |
| 6 | Formula One career-plan arena — `stage_bens_f1_boss_arena` | EXISTS | `highway_night` | `stage_f1_boss_arena.jpg` |
| 7 | Engineering classroom — `stage_bens_engineering_classroom` | EXISTS | `apartment` | `stage_engineering_classroom.jpg` |
| 8 | I-270 scenic overlook — `stage_bens_scenic_overlook` | EXISTS | `highway_night` | `stage_scenic_overlook.jpg` |

**Map theme:** all values above are existing `MapTheme` values. No new theme is needed. `pool_party` is the intentional exception to the otherwise indoor `apartment` scenes; scene 6 is called an arena in the narrative but correctly uses the outdoor/night `highway_night` theme.

## 3. PROP SPRITES

The only `propKey` values in the nine `map.rects` arrays are the nine stage texture keys listed below. All **EXIST** and are chapter-background assets, not new furniture sprites.

| `propKey` | Used in | Status | Source |
| --- | --- | --- | --- |
| `stage_bens_51_monroe` | Scene 0 | EXISTS | `src/assets/chapters/bens_life/stage_51_monroe_roof_landing.jpg` |
| `stage_bens_quarantine_bedroom` | Scene 1 | EXISTS | `src/assets/chapters/bens_life/stage_quarantine_bedroom.jpg` |
| `stage_bens_ocean_city_rental` | Scene 2 | EXISTS | `src/assets/chapters/bens_life/stage_ocean_city_rental.jpg` |
| `stage_bens_mahargos_pool_room` | Scene 3 | EXISTS | `src/assets/chapters/bens_life/stage_mahargos_pool_room.jpg` |
| `stage_bens_halloween_party` | Scene 4 | EXISTS | `src/assets/chapters/bens_life/stage_halloween_party.jpg` |
| `stage_bens_junior_classroom` | Scene 5 | EXISTS | `src/assets/chapters/bens_life/stage_junior_classroom.jpg` |
| `stage_bens_f1_boss_arena` | Scene 6 | EXISTS | `src/assets/chapters/bens_life/stage_f1_boss_arena.jpg` |
| `stage_bens_engineering_classroom` | Scene 7 | EXISTS | `src/assets/chapters/bens_life/stage_engineering_classroom.jpg` |
| `stage_bens_scenic_overlook` | Scene 8 | EXISTS | `src/assets/chapters/bens_life/stage_scenic_overlook.jpg` |

There are no `furn_*` or other sprite-backed furniture keys in this chapter. The remaining map rectangles use procedural `propType` values: `door`, `wall`, `desk`, `bed`, `rug`, `fridge`, `couch`, `counter`, `window`, `road`, and `guardrail`. No prop sprite is needed for those rectangles. The minigame objects (pressure cooker, M4, hostages, Raspberry Pi, Brooks, wife beater, sippy cup, racing suit, battery, and graphite) can remain text/procedural UI elements unless the mechanic implementation explicitly adds illustrated item cards.

## 4. CHARACTER SPRITES

The table covers the union of actor IDs across all nine scene actor arrays.

| Actor ID | Status | Current source / behavior | Asset handoff |
| --- | --- | --- | --- |
| `ben` | EXISTS | `hero_ben_sheet` is generated at runtime from the chapter-loaded `hero_ben_raw_jpg`, sourced from `src/assets/images/boss_ben.jpg`. | No new source needed. This is the existing Ben portrait reused as a runtime hero sheet. |
| `nick_f` | EXISTS | Main-cast `hero_nick_f_sheet`. | No new asset. |
| `eric` | EXISTS | Main-cast `hero_eric_sheet`. | No new asset. |
| `jordan` | EXISTS | Main-cast `hero_jordan_sheet`. | No new asset. |
| `maharko` | EXISTS | Main-cast `hero_maharko_sheet`. | No new asset. |
| `sophie` | EXISTS | Uses shared `npc_girl_sheet`. | No new asset. |
| `linden` | EXISTS | Uses shared `npc_girl_sheet`. | No new asset. |
| `cara` | EXISTS | Uses shared `npc_girl_sheet`. | No new asset. |
| `michael_bersofsky` | NEW | `src/assets/images/micheal_bersofsky.jpg` exists as the Michael/boss source, but the actor slot has no usable actor sheet and currently falls back to a colored blob. | Create a standard front/side/back actor sheet, preferably derived from the existing photo. Temporary stand-in: tinted Jacob or Nick H sheet. |
| `sean` | EXISTS — REUSE | Use the globally preloaded `enemy_frat_bro_sheet`. | No new asset. Set Sean’s explicit `spriteKey` to `enemy_frat_bro_sheet`; the current `understudyId` does not provide this reuse. |
| `nick_cox` | EXISTS — REUSE | Use `npc_alex_sheet`, sourced from the existing `src/assets/images/npc_alex_sheet.jpg`. | No new asset. Add its raw source to the Ben’s Life chapter manifest and set Nick Cox’s explicit `spriteKey` to `npc_alex_sheet`. |
| `matthew` | EXISTS — REUSE | Use `npc_benji_sheet`, sourced from the existing `src/assets/images/npc_benji_sheet.jpg`. | No new asset. Add its raw source to the Ben’s Life chapter manifest and set Matthew’s explicit `spriteKey` to `npc_benji_sheet`. |
| `substitute` | NEW | No long-term-substitute sheet exists; the actor currently falls back to a colored blob. | Create `npc_long_term_substitute_sheet` or equivalent: visibly ordinary, tired/disengaged adult. Temporary stand-in: tinted Jacob or Michael-derived sheet. |

The three Ocean City girls can share the existing silhouette source `src/assets/images/npc_girl_silhouette.jpg`, loaded three times as `hero_girl1_raw_jpg`, `hero_girl2_raw_jpg`, and `hero_girl3_raw_jpg`. Separate Sophie/Linden/Cara designs are optional; the current generic silhouette treatment is sufficient for the scene.

## 5. BOSS ASSETS

**NONE.** The chapter contains no `bossFight` beat and therefore needs no boss ID, boss sprite, boss music, or `BossConfig`. `stage_bens_f1_boss_arena` is only a background key; it does not imply a boss encounter. The Formula One sequence uses the existing `benF1Plan` minigame.

## 6. SFX MAP

Keep this map selective. Existing keys, packs, and the newly supplied straw sound are sufficient for the core chapter.

| Beat / context | Recommended SFX | Source / status |
| --- | --- | --- |
| Roof planner: selecting and placing each absurd item | Short click/drop confirmation per item | `kenney_interface` click/drop sounds — EXISTS |
| Roof planner: ordinary locked door and rejected “reasonable” item | Metal latch/click, then a dry UI error | `kenney_rpg` metal latch/click + `kenney_interface` error — EXISTS |
| Dying iPhone SE / message beat | Notification ping | Existing `sfx_message_ding` / iPhone notification — EXISTS and already in the beat list |
| Rust panic: hallway approach and lock turning | Several quiet footsteps, handle/latch movement | `kenney_rpg` footsteps and metal latch — EXISTS |
| Door opens after “MICHEAL IS PICKING MY LOCK” | Door opening hit | Existing `sfx_door_open` — EXISTS and already in the beat list |
| Camera-left-on Discord reveal | Tiny interface/glitch tick when the group realizes the camera is live | `kenney_interface` glitch/click — EXISTS |
| Scripted toilet-water drink | Straw slurp timed to Ben drinking from the toilet | EXISTS — `docs/chapter-pipeline/working/bens-life/Slurping Drink from Straw Sound Effect.mp3`; move to `src/assets/audio/` and register as `sfx_ben_straw_slurp` |
| Pool shot that misses completely | Soft cue/wood impact timed just after the cue passes over the ball | `kenney_impact` light wood/soft impact — EXISTS |
| Halloween “Who invited this kid?” / parents’ alc reveal | One small party/glass or UI sting, used once | `kenney_interface` confirmation/error or `kenney_music-jingles` short sting — EXISTS; optional rather than required |
| Whiteboard trivia: sorting claims and result | Quick select sounds; one confirmation/error at the result | `kenney_interface` click/confirmation/error — EXISTS |
| Formula One plan: each answer removes a normal option; “Dubai bitches” reveal | UI error/confirmation escalation, then a short comic sting | `kenney_interface` + `kenney_music-jingles` — EXISTS |
| Electrical minigame: terminal connection, graphite glow, smoke | Metal contact plus glitch/electrical-feeling accent; do not over-score the smoke | `kenney_impact` light metal + `kenney_interface` glitch — EXISTS |
| Scenic-overlook coda | Prefer silence or low room/vehicle tone; no punctuation sting | No new SFX required |

## 7. NET NEW ASSETS — PRIORITY LIST

**Total net new assets: 2.** Existing backgrounds, supplied music/SFX, core character art, and reusable male sheets cover the rest of the chapter.

### MUST HAVE (chapter won’t work without these)

None. All chapter-critical source assets now exist; the supplied music and straw SFX still require integration.

### NICE TO HAVE (chapter works but looks rough without these)

- [ ] `npc_michael_bersofsky_sheet` — standard actor sprite derived from the existing `micheal_bersofsky.jpg`; use for the quarantine-bedroom Michael slot — chapter character asset/runtime sprite registration.
- [ ] `npc_long_term_substitute_sheet` — visibly disengaged adult actor sheet for the engineering-class scene — chapter character asset/runtime sprite registration.

### CAN DEFER (placeholder is fine for now)

None.
