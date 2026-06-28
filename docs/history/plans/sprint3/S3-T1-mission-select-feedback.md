> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# S3-T1 — Mission-select screen: visible selection feedback

> You are a fresh agent. Everything you need is in this file. Read the **Global House Rules** in
> `plans/sprint3/MASTER_PLAN_S3.md` first, then do exactly this and nothing more.

## Symptom (owner's words)
"During the mission selection screen, there should be feedback on whichever one you are currently selecting. Right now
there is sound, but the back UI is static."

## Where
**Only** `src/components/ChapterSelect.tsx`. This file is fully self-contained — no other file is involved. You are the
sole owner of it, so no merge-conflict concerns.

## Root cause
The selected chapter row already computes `const isSelected = selectedIndex === idx;` and adds the Tailwind class
`ring-2` when selected:

```tsx
className={`text-left border p-5 transition-all duration-200 relative overflow-hidden ${isSelected ? 'ring-2' : ''}`}
style={{
  ...
  borderColor: isSelected || isDone ? heroColor : unlocked ? '#2a3d18' : '#1a2410',
  boxShadow: isDone || isSelected ? `0 0 18px ${heroColor}33` : 'none',
  outlineColor: isSelected ? heroColor : 'transparent',
}}
```

Two problems make selection look "static":
1. **Tailwind `ring-2` is implemented as a `box-shadow`.** The inline `style={{ boxShadow: ... }}` on the *same
   element* overrides it, so the ring never renders.
2. The remaining selected cues are weak: border goes to `heroColor` (close to the done/hover color) and a faint
   `${heroColor}33` glow. Hovering already calls `setSelectedIndex(idx)`, so with the mouse the change is nearly
   invisible; with arrow keys it's a barely-perceptible border tint.

## The fix
Make the **selected** row unmistakable, driven by the existing `isSelected` flag (keyboard arrows *and* hover both set
`selectedIndex`, so this covers both input modes). Implement a clearly visible state — at minimum **all** of:

- A solid, high-contrast **left accent bar** or full border in `heroColor` that is distinct from hover/done.
- A **transform** nudge so motion is obvious, e.g. `transform: isSelected ? 'translateX(4px) scale(1.015)' : 'none'`
  (the element already has `transition-all duration-200`, so this animates for free).
- A **stronger glow** that does NOT get clobbered. Compose ONE `boxShadow` string that includes both the selected ring
  and the existing done-glow rather than letting them fight, e.g.:
  ```ts
  const shadow = isSelected
    ? `0 0 0 2px ${heroColor}, 0 0 22px ${heroColor}66`
    : isDone ? `0 0 12px ${heroColor}33` : 'none';
  ```
  and use `boxShadow: shadow`. Remove the now-redundant `ring-2` class (it does nothing once boxShadow owns the ring),
  or keep it but stop overriding `boxShadow` — pick one and be consistent. Do not rely on `ring-2` + inline boxShadow
  coexisting.
- Optional but nice: brighten the title color or the index chip background when `isSelected`.

Keep the existing `onMouseEnter`/`onMouseLeave`/keyboard handlers intact — they already maintain `selectedIndex`
correctly. Do **not** change the selection *logic*, only the *visual* expression of `isSelected`.

## Accept criteria
- Arrowing up/down through the list, the highlighted row is **obviously** different (border + glow + slight motion),
  updating immediately on each keypress.
- Moving the mouse over rows produces the same clear highlight.
- Locked rows still look locked; cleared rows still show their CLEARED state; none of those regress.
- `npx tsc --noEmit` and `npm run build` clean.

## How to verify (do this, capture what you see)
Run the dev server (`npm run dev`), open the game, reach the chapter/mission select screen, and arrow through the list.
The selected card must visibly pop. Note in your PR what the selected state now looks like.