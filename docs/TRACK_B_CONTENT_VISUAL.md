# Track B — Content, Visuals & Audio-adjacent Polish (Execution Spec)

**Lane:** 🟩 Engineer B · **Budget:** ~18h (+ Track D audio, speced separately) · **Phase:** 1 (+ QA in Phase 2)
**Audience lens:** This is the **friend-facing lane** — the work that makes each chapter *land*
for the people who lived it. A prop that renders as a gray box breaks the spell; a real couch,
the right song, a portrait that pops on the punchline — that's the whole point.

**Why this lane is the safe place to parallelize:** it's almost entirely **per-chapter data
files** (`src/data/chapters/*.ts`) plus `MapBuilder.ts`. Independent files → near-zero merge
conflict. If extra hands appear, they slot in here by chapter.

> **Reality check first (the docs lie).** The HANDOFF lists R14/R16 as TODO, but the
> furniture-atlas system is **already built and wired** (`furnitureCatalog.ts`,
> `MapBuilder.drawPropShape`), and `scatterNature()` is already called
> (`MapBuilder.ts:35`). This track is *coverage and tuning*, not greenfield. **Verify against
> the code, never the handoff.**

## Hard rules (see `TEAM_COORDINATION_PLAN.md` §0)
- `tsc --noEmit` + `vite build` clean; `npm test` green.
- **Never change physics/collision rects** — visual size ≠ body size. `drawPropShape` already
  keeps the body fixed while drawing larger art; preserve that.
- New assets: graceful fallback + `?url` imports for spaces/parens in filenames.
- All in-world text through `label()`; square corners.

---

## B1 — Real prop sprites everywhere (close the coverage gaps) (~6h)

**Goal:** No prop renders as a primitive colored box in any chapter.

**Current state (verified):**
- `MapBuilder.drawPropShape` (`MapBuilder.ts:475+`) resolves a sprite in priority order:
  (a) `propKey === 'furn_<name>'` → catalog frame; (b) `propType` → `PROPTYPE_FURNITURE`
  map → catalog frame; (c) procedural shape fallback.
- `PROPTYPE_FURNITURE` (`MapBuilder.ts:17-20`) maps only **7** types:
  `couch, tv, desk, counter, bed, bench, window`.
- The LimeZu free pack **lacks** fridge, sink, toilet, bathtub, door (per
  `furnitureCatalog.ts:10-11`) — and has nothing for the *special* props in the `MapRect`
  union: `hottub, firepit, arcade, tollbooth, guardrail, barrier_arm, cone, junglebox, car,
  tree, road`.
- The cabin QA bug (hot tub / firepit / TV / arcade render as boxes) tells us two things:
  some props have **no catalog mapping**, and the cabin's `tv` *is* mapped — so either the
  interiors sheet isn't loaded for that chapter or the rect uses a different `propType`.

**Work:**
1. **Audit every chapter's `rects[]`** (`data/chapters/*.ts`). For each `propType`/`propKey`,
   confirm what it renders as in-game. Produce a quick coverage matrix (propType × chapter ×
   renders-as-sprite?). This is the map for the rest of B1.
2. **Extend `PROPTYPE_FURNITURE`** to cover every interior type the catalog *can* serve. The
   catalog already has art for `armchair, bookshelf, wardrobe, nightstand, dresser, plant_*,
   rug_*, mirror, chalkboard, sideboard, cabinet_tall, counter_wood` etc. Map the unmapped
   interior `propType`s to these (e.g. add `fridge`/`sink` → nearest stand-in or a new
   procedural; `door` → procedural; ensure `rug` uses the existing rug path at
   `MapBuilder.ts:389`).
3. **Investigate the cabin `tv`-as-box case.** Confirm the interiors sheet texture is loaded
   for the cabin chapter (check the preload/`buildFurnitureAtlas` call path) and that the
   cabin rect's `propType` is exactly `'tv'`. Fix whichever is wrong.
4. **Upgrade procedural shapes for the pack-absent specials** (`hottub, firepit, arcade,
   tollbooth, guardrail, barrier_arm, cone, junglebox`). These won't get LimeZu art — make
   their procedural draw *intentional and characterful* (e.g. firepit = stone ring + ember
   glow, which already partially exists at `ChapterScene.ts:2226`; hottub = rounded basin +
   water tint + steam particles). Keep square/pixel aesthetic.
5. **Add new sourced art only where it carries a joke** (e.g. a real arcade cabinet for the
   cabin). Follow `04_ASSETS.md` conventions; `?url` import + fallback.

**Acceptance:** Walk all 11 chapters — every prop reads as deliberate art or characterful
procedural, zero "flat rectangle with a stroke." Bodies unchanged (`git diff` shows no rect
geometry edits).

---

## B2 — Outdoor flora tuning (~3h)

**Goal:** Outdoor maps (Ch2 highway shoulder, Ch4 park, Ch5 Florida, Ch8 cabin exterior)
feel planted, not bare.

**Current state:** `scatterNature(map)` is already called in `buildMapFromConfig`
(`MapBuilder.ts:35`). Verify it actually places flora on each outdoor theme and that the
nature-pack textures load with fallbacks.

**Work:**
1. Confirm nature assets (`game_decor/nature/`) are loaded and `scatterNature` covers each
   outdoor `theme` (`park`, `florida`, `highway_night`, `suburb_night`, `cabin`).
2. Tune density/placement per theme with the existing seeded-RNG pattern (deterministic, so
   it doesn't shimmer between runs). Decorative only — **no physics bodies**.
3. Ensure flora never spawns on roads/walkable paths or over actors (respect the floor regions).

**Acceptance:** Each outdoor map has theme-appropriate flora, deterministic across reloads,
no collision, no overlap with gameplay-critical rects.

---

## B3 — Migrate deprecated `tag:` → `propType`/`propKey` (~2h)

**Goal:** Remove the legacy `tag:` field; `propType` is the single source of truth
(`types.ts:76` marks `tag` `@deprecated`, ignored by the renderer since Phase B).

**Work:** `grep -rn "tag:" src/data/chapters`. For each, replace with the correct `propType`
(and `propKey` where art exists). Pure cleanup, no behavior change. Delete the `tag?` field
from `MapRect` in `types.ts` once no references remain (typecheck enforces completeness).

**Acceptance:** `grep "tag:" src/data/chapters` returns nothing; `tag?` removed from `MapRect`;
`tsc` clean; chapters render identically.

---

## B4 — Nick-F anim frame clamp (~1h)  *(Engineer A makes the edit — hot file)*

**Goal:** Kill the console warning `Texture "hero_nick_f_sheet" has no frame "96"/"97"`.

**Current state:** an anim references frames past the sliced sheet. Lives in the
`registerAnim` callers in `ChapterScene.ts` — **owned by Engineer A** per the merge rules.
B specs it; A lands it.

**Work:** Clamp the frame list to `this.textures.get(key).frameTotal` in the relevant
`registerAnim` call(s). **Acceptance:** no frame warnings in console for any chapter.

---

## B5 — Dialogue micro-polish (~1h)  *(touches `DialogueBox.tsx`, owned by Engineer C — coordinate)*

**Goal:** A small portrait pop/scale-in on speaker change to punch up comedic timing.

**Current state:** `DialogueBox.tsx` already does the 22ms/char typewriter + portraits.

**Work:** Add a brief scale-in (e.g. `motion` is already a dep) on the portrait when the
speaker id changes. Respect the existing typewriter and the mute toggle (no new SFX unless it
honors `omega-muted`). Keep it subtle — this is seasoning, not a cutscene.

**Acceptance:** Portrait visibly pops on speaker change; no regression to typewriter/skip
behavior; honors mute.

---

## Phase-2: Full 11-chapter QA pass (~8h)

Play **every** chapter (0,1,2,3,3b,4,5,5b,6,7,8,9) end-to-end on **all three difficulties**
(once A3 lands). Friend-facing bar:
- Every prop is art or characterful procedural (B1); flora present outdoors (B2).
- Dialogue lands — names, emojis, portraits, ledger gags correct; portrait pop reads (B5).
- Audio: correct track per chapter incl. Ch8's own track (Track D), boss sting→loop, door/knock SFX.
- No console errors (frame warnings gone via B4, border warning gone via E1).
- Difficulty visibly changes boss fights and persists.

Log one report per chapter under `docs/qa/` in the existing report format (see
`plans/sprint3/qa/` for the template). Flag anything that doesn't land to the relevant lane.

## Budget
B1 6 · B2 3 · B3 2 · B4 1 · B5 1 = 13h build · QA 8h (Phase 2) — see coordination doc for
how this composes with Track D in Engineer B's lane.
