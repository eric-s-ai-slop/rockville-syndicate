# TASK-S2-07 — Chapter passes: Ch4 (Jungle Gym Gambit) + Ch6 (Ding Dong Ditch Ben)

## Goal
Prop pass for **Ch4 `jungle_gym_gambit`** (`theme: 'park'`) and **Ch6 `ding_dong_ditch_ben`** (`suburb_night`).
Replace bare rectangles with sprites; keep the existing showcase props (jungle gym, watchwater house).

## Depends on
- **TASK-S2-01 + TASK-S2-02 merged.** Edit **data** in `src/data/chapters.ts`
  (Ch4 ≈ lines 619–642; Ch6 ≈ lines 911–940).
- Coordinate with **Sprint-1 TASK-03** if it touched Ch6 (door-open-on-RUN, chase). That task changes *beats/logic*,
  not the `objects` rects — you only touch `objects`. Low conflict, but rebase on `main`.

## House Rules
- Don't change `x/y/w/h` of `solid:true` rects. The **watchwater house** (`propKey:'prop_watchwater'`) and **jungle
  gym** (`propKey:'prop_jungle_gym'`) are showcase art — **leave them**. Done = `tsc`/`build` clean + viewed in-game.

## Ch4 (park) pass
`objects` ≈ lines 636–642. Keep the jungle gym showcase. The **bench** (`propType:'bench'`) now renders a sprite via
the catalog — verify. Add park-appropriate decor using the **nature** pack (bushes/flowers already scatter on
outdoor themes) and `furn_*` only where it makes sense (a park bench `furn_bench`, maybe a `plant_tall` as a tree
stand-in). Trees stay procedural/nature. Flag any "playground equipment" rect that has no asset.

## Ch6 (suburb_night) pass
`objects` ≈ lines 920–940. Keep the watchwater house + the door rect (`propType:'door'` — the door open/close swap
is handled elsewhere; just make sure it renders). Handle:
- **Generic cars** (the getaway car, parked cars — `propType:'car'` without propKey) → stub with an existing car
  showcase sprite (`prop_nick_f_corolla` / `prop_jordan_mustang` / `prop_maharko_camero`) for variety, or flag.
- **Street lamps** (`{ w:12, h:80 }` poles) → minor; the scene already places `light_glow` fake-lights. Either
  leave the pole as a thin primitive (reads fine) or make a small `furn_floor_lamp` stand-in. Low priority.
- **Bushes / hedges** (the `0x0f2a0f` squares) → outdoor foliage: rely on the nature scatter or set a nature
  `propKey` if wired; otherwise a tasteful non-solid green decal. Don't leave them as flat squares.
- Any bare rect with no good asset → flag in PR.

## Acceptance criteria
- Ch4: jungle gym + bench are sprites; park has foliage; no stray rectangles (or they're flagged).
- Ch6: house + door render; generic cars use real car sprites; hedges/lamps look intentional, not like squares.
- Showcase props (jungle gym, watchwater) unchanged. Solid rects unchanged.
- `tsc`/`build` clean. Screenshots + flagged-items list in PR.
