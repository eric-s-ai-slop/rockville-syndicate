> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-S2-06 — Chapter passes: Ch2 (NYC 1AM Drive) + Ch5 (Florida Highway Duel)

## Goal
Clean up the **outdoor highway** chapters — **Ch2 `nyc_1am_drive`** (`highway_night`) and **Ch5
`florida_highway_duel`** (`florida`). These have the rectangle "toll booth," rectangle guardrails, stray squares,
and several `propType:'car'` rects. (The toll-booth screenshot from the owner is Ch2.)

## Depends on
- **TASK-S2-01 + TASK-S2-02 merged.** You edit **data** in `src/data/chapters.ts`
  (Ch2 ≈ lines 318–340; Ch5 ≈ lines 768–786).
- **Toll booth & guardrail have NO asset** and are owned by **TASK-S2-08** (procedural upgrade). For those rects,
  **leave `propType:'tollbooth'` / `propType:'guardrail'` as-is** — do not assign a `propKey`. TASK-08 makes them
  look intentional. Your job here is everything else + flagging.

## House Rules
- Don't change `x/y/w/h` of `solid:true` rects. Done = `tsc`/`build` clean + viewed in-game.

## The pass
1. **Cars.** Ch2 has Nick F's corolla (already `propKey:'prop_nick_f_corolla'` — leave it). Ch5 has Jordan's
   mustang + Maharko's camero (`prop_jordan_mustang` / `prop_maharko_camero` — leave them). Any **other**
   `propType:'car'` rect with **no** propKey (generic/parked/getaway cars) → reuse an existing car showcase sprite
   as a stand-in: set `propKey` to one of the three existing car keys (optionally a different one for variety).
   If the owner later adds more car art, these get swapped — note in PR which rects you stubbed.
2. **Stray squares / decals.** The green square and similar bare rects: identify them (roadside sign? bush? bin?).
   - If it should be foliage → it's outdoor, so prefer the **nature** scatter that already exists, or set a
     `propKey` to a nature key if one is wired; otherwise make it a tasteful non-solid decal and note it.
   - If it's debris/cones/signs with no asset → flag in PR (candidate for TASK-08 / a roadside pack).
3. **Toll booth / guardrails** → leave `propType` as-is for TASK-08.
4. **Road stripes** → the procedural lane stripes already render; leave them.

## Flag back to the owner (put in PR)
List every rect you could not give a real sprite (toll booth, guardrails, generic cars if you didn't stub them,
any roadside object). This is the "let me know what's missing" deliverable for these chapters.

## Acceptance criteria
- No unexplained bare squares remain (each is either a real sprite, a stubbed car, a nature decal, or explicitly
  flagged for an asset the repo lacks).
- Named cars unchanged; generic cars use a real car sprite.
- Toll booth/guardrail left for TASK-08. Solid rects unchanged.
- `tsc`/`build` clean. Screenshot of each chapter + the flagged-items list in PR.