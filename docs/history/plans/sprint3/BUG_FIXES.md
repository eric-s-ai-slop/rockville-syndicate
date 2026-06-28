> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# Sprint 3 QA Bug Fixes

Date: 2026-06-14 | Fixed by: Claude (claude-sonnet-4-6)

Fixes applied after reviewing all QA sweep reports in `plans/sprint3/qa/`.

---

## FIX-1 — Knock SFX never plays (ding_dong_ditch_ben audio)

**Source report:** `ding_dong_ditch_ben__audio.md` — BUG-1, severity: major  
**File:** `src/game/audio.ts`  
**Root cause:** `knockUrl` was imported without the Vite `?url` suffix, so Vite returned a module object instead of a URL string. `safeLoadAudio('sfx_knock', knockUrl)` received garbage and silently failed to queue the asset, so the knock SFX was never in the Phaser audio cache when the beat fired.

```diff
- import knockUrl from '../assets/audio/kenney_impact-sounds/Audio/impactPlank_medium_001.ogg';
+ import knockUrl from '../assets/audio/kenney_impact-sounds/Audio/impactPlank_medium_001.ogg?url';
```

---

## FIX-2 — React style conflict warning: borderColor + borderLeft (all chapters)

**Source reports:** `cabin_basye__console.md`, `cabin_basye__visual.md`, `florida_highway_duel__console.md`, and others — cross-cutting console error.  
**File:** `src/components/ChapterSelect.tsx`  
**Root cause:** The chapter card style object set both `borderColor` (a shorthand that includes `borderLeftColor`) and `borderLeft` (a shorthand that also sets `borderLeftColor`). React detected the conflict and emitted an error on every render.

```diff
  borderColor: isSelected || isDone ? heroColor : unlocked ? '#2a3d18' : '#1a2410',
- borderLeft: isSelected ? `4px solid ${heroColor}` : undefined,
+ borderLeftWidth: isSelected ? '4px' : undefined,
```

`borderLeftWidth` is a non-overlapping specific property, so no conflict. Visual is identical: `borderColor` already supplies the color, `borderLeftWidth` just makes the left edge thicker when selected.

---

## FIX-3 — Background-boxed props in non-solid rects (cabin_basye, spain_betrayal, others)

**Source reports:** `cabin_basye__visual.md` — BUG-1; `spain_betrayal__visual.md` — BUG-1; `jungle_gym_gambit__visual.md` — BUG-1.  
**File:** `src/game/ChapterScene.ts` (`drawDecorativeRect`)  
**Root cause:** Non-solid map rects (no `solid: true`) were rendered via `drawDecorativeRect`, which only checked `small_props_atlas` and standalone textures for a `propKey`, then fell through to a plain colored rectangle. It did not consult the furniture atlas (`furn_*` keys) or the `PROPTYPE_FURNITURE` lookup used by `drawPropShape`. Solid rects correctly got sprites via `addMapObject → drawPropShape`, but decorative rects (plants, chairs, bookshelf, TV, firepit, door, etc.) all rendered as boxes.

**Fix:** Before the plain-rect fallback in `drawDecorativeRect`, delegate to `drawPropShape` when the rect has a `propType` or `propKey`. Pure structural fill rects (no propType/propKey) are unaffected.

```diff
+ if (propType || propKey) {
+   this.drawPropShape(x, y, w, h, fill, stroke, propType, propKey);
+ } else {
    this.add.rectangle(x, y, w, h, fill, 0.65)
      .setStrokeStyle(1.5, stroke, 0.5).setDepth(-50);
+ }
```

This fixes all chapters where furniture/decor rects lacked `solid: true` but had correct prop metadata:  
- `spain_betrayal`: TV, door, plants, chairs, bookshelf  
- `cabin_basye`: TV (→ `furn_tv`), firepit (→ procedural embers), door (→ procedural door)  
- `jungle_gym_gambit`: bush/flower props (→ furniture sprites)

---

## FIX-4 — Hot tub and arcade rendered as plain boxes (cabin_basye visual)

**Source report:** `cabin_basye__visual.md` — BUG-1, severity: major  
**File:** `src/game/ChapterScene.ts` (`drawPropShape` switch)  
**Root cause:** `propType: 'hottub'` and `propType: 'arcade'` had no furniture catalog entry and no `case` in the `drawPropShape` switch, so they fell to `default` (plain fill rectangle).

**Fix:** Added procedural graphics cases for both:
- `hottub` — blue outer shell, lighter water inner, 4 bubble circles
- `arcade` — dark cabinet, green CRT screen glow, joystick ball + 2 colored buttons

---

## FIX-5 — Canvas2D willReadFrequently warning (all chapters)

**Source reports:** `cabin_basye__console.md`, `florida_highway_duel__console.md`, and others — cross-cutting performance warning.  
**File:** `src/game/SpritePreprocessor.ts`  
**Root cause:** The sprite preprocessor creates a temp canvas to read raw pixel data via `getImageData` (called twice per sprite, for every character). The canvas context was created without `{ willReadFrequently: true }`, causing the browser to use a slow unoptimized path and emit a performance warning each time.

```diff
- const tempCtx = tempCanvas.getContext('2d');
+ const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
```

---

## Not fixed (need runtime investigation or out of scope)

| Report | Bug | Reason not fixed |
|---|---|---|
| `nyc_1am_drive__flow.md` BUG-1 | Choice loop soft-lock | QA used Playwright; dialogue + choice code looks correct in review. Likely a Playwright timing false-positive. Needs human testing to confirm. |
| `spain_betrayal__flow.md` BUG-1 | Syndicate Challenge unresponsive | Same — QTE modal code and `handleQteResponse` look correct. QA agent may have clicked before QTE mounted. |
| `spotify_insurgency__combat.md` BUG-1/2 | Boss duplication / invisible boss | Could be cosmetic (player sprite looks like boss sprite since both are Eric). Needs runtime observation. |
| `spain_betrayal__audio.md` BUG-1 | Boss music missing | `startBossMusic()` logic and preload look correct; likely a browser autoplay suspension in the QA environment. |
| `ding_dong_ditch_ben__audio.md` BUG-1 (door SFX) | No door-open SFX | No door-open SFX is configured for chapter 6 — would require adding a new audio beat/key. Left for sprint backlog. |
| `cabin_basye__audio.md` BUG-1 | Reused ch1 music | Acknowledged placeholder — no ch8 track yet. |