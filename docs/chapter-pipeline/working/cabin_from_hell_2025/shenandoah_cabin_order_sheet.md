# Shenandoah Cabin — Order Sheet

Everything you need to go source, generate, or license before this chapter is ready for Step 5 (Integration). Pulled from `shenandoah_cabin_assets.md`. This is a shopping list, not a coding task list — nothing here requires touching the codebase.

**2 MUST HAVE — chapter is blocked without these. 5 NICE TO HAVE. 1 CAN DEFER.**

---

## MUST HAVE

### 1. Regenerate `stage_cabin_interior`

The current version (already in the working folder) has a structural mismatch — it shows two separate bedroom/hallway clusters instead of the one hallway with three sequential doors the map design specifies. Re-roll with this prompt:

> Top-down pixel art architectural floorplan of a single-story rustic cabin interior, clean top-down view with thick dark wall outlines and distinct floor-tile zones per room. Exactly ONE floorplan, no duplicate rooms, no second kitchen or second bathroom.
>
> Left half: one large open-plan living room — a wood dining table with high-backed chairs and a tall grandfather clock in the back corner, a worn brick-red leather recliner, an olive-suede pullout sectional sofa with a blanket draped on it, a wall-mounted TV, a round area rug in the center, plaid/flannel curtains on the outer-wall windows, wood-paneled walls, exposed wood beam ceiling.
>
> Bottom-center, directly against the living room: a small kitchen peninsula with a counter, stove, sink, and fridge, open to the living room, positioned right where a front door would be.
>
> Right side: ONE vertical hallway corridor connecting the kitchen/living room area to exactly three bedroom doors in a single row along the hallway, top to bottom in this order: (1) a bedroom with one double bed and a cluttered nightstand — tissues and water bottles scattered, looking like a sick room; (2) a small shared bathroom with a toilet and sink; (3) a bedroom with two single beds. Do not repeat this hallway or add any additional rooms elsewhere in the image.
>
> Warm lamp lighting in the bedrooms, dimmer overhead light in the living room, wood plank flooring throughout. 16-bit RPG top-down interior floorplan style: soft pixel outlines, visible floor-tile grid, warm muted browns and reds, no characters. Generate at a 3:2 landscape aspect ratio (wider than tall, not ultra-wide).

**Target file:** `stage_cabin_interior.jpg`, replacing the current one in this working folder. Aim for a 3:2-ish aspect ratio (target rect is 1200×800) — the engine hard-stretches this image to fit, no cropping, so getting close to 3:2 up front avoids visible distortion.

### 2. Source or commission the Ultraphonk loop

~20-30 seconds, loopable, phonk-adjacent original track (not a licensed real song — Chapter 8 already treats "Ultraphonk" as an in-universe playlist/genre name, so an original/royalty-free loop is consistent, not a downgrade). This is load-bearing: the `speakerHunt` minigame's entire "follow the sound" mechanic is built around panning this track's volume by proximity, so nothing about Nights 1-3 works without an audio file. Royalty-free options: Epidemic Sound, Artlist, or a quick original composition — anything with a hard-hitting bass loop reads fine at this length.

**Target file:** goes in `src/assets/audio/sfx/` once you have it (Step 5 will wire it up).

---

## NICE TO HAVE

### 3. License "Electric Feel" — MGMT

Act 1 opening track — covers the "spins" stretch (arrival, H2O, the bars), the lively "whoo vacation" energy before anything's gone wrong. Most upbeat/confident of the candidates considered. Check your existing needle-drop licensing pipeline (same process used for "Coffee," "Nightcall," "Dark Beach," etc. in prior chapters).

**Target file:** `src/assets/audio/stage_music/` once licensed.

### 4. License "Space Song" — Beach House

Act 1's second track — takes over right at the turn (Eric's "We're too old for this" line), carrying the balcony scene and Choice 1 as the mood curdles. Same licensing pipeline as above.

**Target file:** `src/assets/audio/stage_music/` once licensed.

**Note:** playing two tracks within one scene needs a small engine addition — the underlying crossfade method (`AudioController.crossfadeToMusic()`) already exists, it's just not currently exposed to a story beat (today it only fires automatically on `changeScene`). Step 5 needs to add a lightweight beat type (e.g. `changeMusic`) to trigger it mid-scene. Not blocking for sourcing the songs now, but flagging so it doesn't get missed at integration.

### 5. Leo temporary sprite

No sprite exists for Leo anywhere in the codebase yet (pre-existing gap, not new to this chapter) — he's a visible, placed actor in this chapter (Night 2 aftermath line, Day 5 fusion beat). Cheapest fix: take an existing hero sheet (Nick F or Jordan are close builds) and palette-shift/tint it as a stand-in rather than commissioning a full custom sheet right now.

**Target file:** `src/assets/images/game_decor/heroes/` — can be done in an image editor, no new art commission needed.

### 6. Guardrail sprite

Used twice in this chapter (OC balcony railing, cabin deck railing) — currently renders as a generic procedural gray bar. A real sprite pays for itself being reused across two scenes. Simple metal/composite railing, top-down, ~16-32px grid.

### 7. Grill sprite (replacing the `firepit` stand-in)

The deck's gas grill currently uses the `firepit` prop type as a placeholder, which is a visual mismatch (a firepit shape rendering where a grill should be). A real top-down grill sprite, black metal, roughly matching the reference photo (`IMG_2091.MOV` frames) — propane tank on the side, lid, small wisp-of-smoke detail optional.

---

## CAN DEFER

### 8. Distinct silhouettes for the two OC girls

`girl_chopped` and `girl_nonchopped` currently both point at the same generic placeholder silhouette already loaded in the engine (`hero_girl1/2/3_raw_jpg`) — functional, just visually identical. Purely cosmetic; skip unless you want them to read as distinct on-screen.

---

## Already done, no action needed

`stage_oc_balcony_night` and `stage_cabin_deck` — both generated and confirmed matching the design. `music_ch7` (Dark Beach, reused for the cabin scenes) — already in the codebase. All main-cast sprites (Eric, Jordan, Nick H, Nick F, Maharko, Alex, Benji), all furniture props, and most SFX — already exist, zero new work.
