# Asset Spec — THE UMBC INCIDENT
**Chapter:** `umbc_incident` (chapter3b.umbc-incident.ts)  
**Net new assets required: 3 MUST HAVE · 4 NICE TO HAVE · 1 CAN DEFER**

---

## 1. STAGE MUSIC

Per-scene music is implemented — two tracks, crossfade on `changeScene`.

### Scene 0 — UMBC Frat Basement
**Key:** `music_umbc_basement`  
**Track:** "Beauty and a Beat" — Justin Bieber ft. Nicki Minaj  
**Status:** ⬜ NEEDED — infrastructure wired, MP3 missing

Steps to activate:
1. Drop MP3 at `src/assets/audio/stage_music/beauty_and_a_beat.mp3`
2. In `src/game/audio.ts`, uncomment/add import:
   ```ts
   import umbcBasementUrl from '../assets/audio/stage_music/beauty_and_a_beat.mp3?url';
   ```
3. Add to `STAGE_MUSIC_URL`:
   ```ts
   music_umbc_basement: umbcBasementUrl,
   ```

### Scene 1 — Parking Lot at Night
**Key:** `music_ch2`  
**Track:** Nightcall — Kavinsky  
**Status:** ✅ DONE — already exists; crossfade fires on `changeScene` beat

---

## 2. LOCATION ART

### Scene 0 — UMBC Frat Basement
- **Existing stage image:** None. `theme: 'apartment'` renders procedurally with rect props.
- **Map theme:** `apartment` ✓ (existing, valid)
- **What's needed (NICE TO HAVE):** `stage_umbc_basement` — 920×660px pixel art overhead view of a college basement. Dark carpet floor, low ceiling, scattered red cups, a couch against the back wall, a folding table in the center-left. Dim, slightly hazy. A single hanging bulb. The three girls should not be rendered in the background image — they appear as actor sprites. Style: consistent with `stage_watchwater_house` (overhead, pixel, slightly washed out at edges).
- **Goes in:** `src/assets/images/game_decor/stages/umbc_basement/`
- **Rect key:** `stage_umbc_basement` (load as full-map backdrop rect with `invisible: true`)

### Scene 1 — Parking Lot at Night
- **Existing stage image:** None. `theme: 'suburb_night'` renders procedurally.
- **Map theme:** `suburb_night` ✓ (existing, valid)
- **What's needed (NICE TO HAVE):** `stage_parking_lot_night` — 920×660px pixel art parking lot, overhead. Dark asphalt, faint painted lines, one parked car (Maharko's Camaro placeholder) at center-left, a distant streetlight casting a cone of yellow. No people baked in. Tone: quiet, empty, late.
- **Goes in:** `src/assets/images/game_decor/stages/parking_lot_night/`
- **Rect key:** `stage_parking_lot_night`

---

## 3. PROP SPRITES

| propKey | Status | Notes |
|---|---|---|
| `furn_rug_large` | ✅ EXISTS | LimeZu atlas, auto-resolved |
| `furn_desk` | ✅ EXISTS | LimeZu atlas, auto-resolved |
| `furn_couch_long` | ✅ EXISTS | LimeZu atlas, auto-resolved |
| `maharko_camero` | ✅ EXISTS | `src/assets/images/game_decor/special/cars/maharko's camero.jpg` |
| door (no propKey, scene 0) | ✅ EXISTS | Procedural fallback from `propType: 'door'` |

No NEEDED prop sprites.

---

## 4. CHARACTER SPRITES

### Scene 0 actors

| id | Status | Notes |
|---|---|---|
| `ben` | ✅ EXISTS | Main cast sprite sheet |
| `maharko` | ✅ EXISTS | Main cast sprite sheet |
| `girl1` `girl2` `girl3` | ⬜ NEEDED | See below |
| `frat1` `frat2` `frat3` | ⚠️ COLORED BLOB | See below |

**girl1 / girl2 / girl3 — NEEDED**  
Three anonymous figures at the edges of the basement. The brief is explicit: they are "treated as bodies in the space, and that is part of the point." A silhouette approach is intentional — they should read as dark, featureless shapes, not characters with faces.

How the actor system resolves sprites: `Actors.ts` looks for `hero_${id}_sheet`. For `girl1` it tries `hero_girl1_sheet`, finds nothing, falls back to a small colored circle. Options:

- **Best (NICE TO HAVE):** A dedicated `npc_girl_silhouette` sprite — a simple female figure in near-black with 40–50% opacity, 32×48px, single static frame. Add a `hero_girl1_sheet` / `hero_girl2_sheet` / `hero_girl3_sheet` preload (all same file), or extend `Actors.ts` to check a `npc_` prefix texture. The name `???` renders above them regardless.
- **Fallback:** The colored blob is functionally fine — their nameplate shows `???` and they're ambient. The intent still lands.

**frat1 / frat2 / frat3 — colored blob**  
`enemy_frat_bro.jpg` is loaded in `ChapterScene.ts` as `enemy_frat_bro_raw` (line 364), but `Actors.ts` resolves via `hero_${id}_sheet`. The `enemy_frat_bro_raw` texture is not wired into the actor placement path. To use it:
- Add `hero_frat1_sheet`, `hero_frat2_sheet`, `hero_frat3_sheet` as load aliases for `enemy_frat_bro.jpg` in `ChapterScene.ts` preload — this is the path of least resistance.
- Or extend `Actors.ts` to check for a `npc_${id}` key before falling back to blobs.

For now the colored blob is acceptable — frat guys are background presence, not speaking roles.

### Scene 1 actors

| id | Status |
|---|---|
| `maharko` | ✅ EXISTS |
| `eric` | ✅ EXISTS |
| `nick_f` | ✅ EXISTS |

---

## 5. BOSS ASSETS

**Boss id:** `boss_ben_umbc`  
**BossConfig:** ✅ Added to `src/data/entities.ts`  
**Sprite:** ✅ DONE — `boss_ben.jpg` loaded under key `boss_ben_umbc` in `ChapterScene.ts` line 355  

No action needed.

---

## 6. SFX MAP

| Beat | Moment | Recommended SFX | Pack |
|---|---|---|---|
| cameraPan (basement reveal) | Camera pans to show Ben in the crowd | Muffled crowd murmur — low, indistinct | None in Kenney packs — defer or source separately |
| dialogue — `ben`: "You're next." | The fatal line | Tense UI sting — one sharp, dry note | `kenney_interface` → `back_001.ogg` or `confirmation_001.ogg` |
| dialogue — narrator: "Shhh." | Shhh motion | Soft shush/whisper texture | `kenney_rpg` → `cloth1.ogg` (approximation) |
| bossFight intro | Boss spawns | **AUTO** — Prowler Sound Effect.mp3 sting | ✅ Already wired |
| minigame — storyFractures: fracture marked | Player clicks a fracture | Soft click with resonance | `kenney_interface` → `click_001.ogg` |
| minigame — storyFractures: fracture missed | Fracture scrolls past unmarked | Low hollow tone | `kenney_interface` → `bong_001.ogg` |
| minigame — storyFractures: ambient | Parking lot background audio | Crickets, distant highway | **NOT IN KENNEY** — see below |
| changeScene | Basement → parking lot | **AUTO** — engine fade + crossfadeToMusic | ✅ Already wired |

**storyFractures SFX (fractureMark / fractureMiss):**  
Files already exist in the project — just need preload calls inside the `storyFractures` mode when it's implemented. Wire them there, not in ChapterScene.

**Parking lot ambient (`parkingAmbient`):**  
Not available in any Kenney pack. The storyFractures mechanic spec calls for this explicitly. Options:
- Source a CC0 cricket/night ambience loop (freesound.org)
- Defer: the mechanic works without it — the ambient is atmospheric only

---

## 7. NET NEW ASSETS — PRIORITY LIST

**Total net new: 3 must-have · 4 nice-to-have · 1 can-defer**

```
MUST HAVE:

[ ] "Beauty and a Beat" MP3 — drop at:
    src/assets/audio/stage_music/beauty_and_a_beat.mp3
    Then uncomment import + add music_umbc_basement key in audio.ts (comments already there).

[ ] fractureMark SFX — kenney_interface/click_001.ogg wired to 'sfx_fracture_mark' key
    in storyFractures mode. Already in project, needs preload call there.
    → implement when storyFractures mode is built

[ ] fractureMiss SFX — kenney_interface/bong_001.ogg wired to 'sfx_fracture_miss' key.
    Same: already in project, needs preload call in storyFractures mode.
    → implement when storyFractures mode is built


NICE TO HAVE:

[ ] npc_girl_silhouette sprite — single female figure, near-black, ~40% opacity,
    32×48px static frame. Load as hero_girl1/2/3_sheet aliases or extend Actors.ts.
    → src/assets/images/

[ ] stage_umbc_basement background — 920×660px pixel art frat basement overhead.
    Dark carpet, folding table, couch, dim bulb. No characters baked in.
    → src/assets/images/game_decor/stages/umbc_basement/

[ ] stage_parking_lot_night background — 920×660px parking lot at night.
    Asphalt, painted lines, one streetlight cone. Empty.
    → src/assets/images/game_decor/stages/parking_lot_night/

[ ] parkingAmbient audio — CC0 cricket/night ambience loop for storyFractures mode.
    → src/assets/audio/


CAN DEFER:

[ ] Crowd murmur SFX for basement cameraPan — atmospheric only,
    chapter reads fine without it.


ALREADY DONE (no action needed):

[x] boss_ben_umbc texture — boss_ben.jpg loaded under key 'boss_ben_umbc' in ChapterScene.ts
[x] Scene 1 music (Nightcall) — music_ch2 already in project, crossfade wired
[x] BossConfig for boss_ben_umbc — in entities.ts
[x] Per-scene music crossfade — ChapterScene.transitionToScene() wired
```
