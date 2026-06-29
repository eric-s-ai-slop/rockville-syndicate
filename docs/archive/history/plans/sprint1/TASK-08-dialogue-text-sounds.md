> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-08 — Dialogue text sounds (`dialog_sound.mp3`, cadence/punctuation-aware)

## Goal
Add a talking blip sound while characters' dialogue types out, using **`src/assets/audio/dialog_sound.mp3`**
(already in the repo). It must "match the talking, punctuation, cadence and everything so it seems natural and
doesn't suck to hear" — i.e. not a flat machine-gun tick on every character.

## House Rules (must follow)
- No new deps. Respect mute (`muted` prop is already passed to `DialogueBox`). Don't put side effects in React
  `setState` updaters.
- Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff.

## What exists today
`src/components/DialogueBox.tsx` runs a typewriter: a `setInterval` reveals one char every `TYPEWRITER_MS = 22`ms
and plays a tick per non-space char (`TYPEWRITER_URL` = `tick_002.ogg`):
```ts
const typewriterAudio = new Audio(TYPEWRITER_URL);
...
if (!muted && char && char !== ' ') {
  typewriterAudio.currentTime = 0;
  typewriterAudio.play().catch(() => {});
}
```
Problems to fix: (a) it uses the tick sample, not `dialog_sound.mp3`; (b) every 22ms = a harsh rattle; (c) no
punctuation/cadence awareness.

## Implementation

### 1. Audio export (`src/game/audio.ts`)
Append a labeled block **at the end of the file** (merge-friendly):
```ts
// ── DIALOGUE TEXT (TASK-08) ──
import dialogBlipUrl from '../assets/audio/dialog_sound.mp3?url';
export const DIALOG_BLIP_URL = dialogBlipUrl;
```
(`dialog_sound.mp3` has no spaces, but use `?url` for consistency with the rest of `audio.ts`.)

### 2. Rewrite the typewriter audio in `DialogueBox.tsx` to be cadence-aware
Replace the per-char tick with a blip that fires on a **natural rhythm** and respects punctuation. Approach:

- **Pool a few `Audio` elements** for `DIALOG_BLIP_URL` (rapid overlap without cut-off):
  ```ts
  import { DIALOG_BLIP_URL } from '../game/audio';
  const blipPool = [0,1,2].map(() => new Audio(DIALOG_BLIP_URL));
  let blipIdx = 0;
  function playBlip(rate = 1, volume = 0.35) {
    const a = blipPool[blipIdx = (blipIdx + 1) % blipPool.length];
    try { a.currentTime = 0; a.playbackRate = rate; a.volume = volume; a.play().catch(() => {}); } catch {}
  }
  ```
- **Blip every Nth character, not every char**, so it reads as speech, not a buzz. Blip on roughly every 2nd–3rd
  *letter*, and **skip spaces and punctuation** for the blip itself:
  ```ts
  const isLetter = (c: string) => /[a-zA-Z0-9]/.test(c);
  // inside the interval, after computing `char`:
  if (!muted && isLetter(char) && (i % 2 === 0)) playBlip(/* see pitch below */);
  ```
- **Cadence via variable delay (punctuation pauses).** The current fixed 22ms interval can't pause on punctuation.
  Convert the reveal loop to a self-scheduling `setTimeout` that picks the next delay from the **just-revealed**
  character, so commas/periods/`?`/`!`/`…` create natural beats:
  ```ts
  const delayFor = (c: string) => {
    if (c === '.' || c === '!' || c === '?') return 260;
    if (c === ',' || c === ';' || c === ':') return 150;
    if (c === '…' || c === '—') return 220;
    if (c === ' ') return 34;
    return 22; // base per-letter speed (keep close to the old feel)
  };
  ```
  Each step: reveal next char, maybe `playBlip`, then `setTimeout(step, delayFor(revealedChar))`. Keep the existing
  `isTypingRef` / `timerRef` bookkeeping and the `skipTypewriter()` behaviour (clicking/Space jumps to full text and
  stops audio). Make sure the cleanup in the effect's `return` clears the pending `setTimeout`.
- **Natural pitch variation** so it isn't monotone: vary `playbackRate` slightly per blip, e.g.
  `playBlip(0.95 + Math.random() * 0.2)`. Optionally bias pitch by speaker (e.g. derive a stable per-speaker base
  rate from `speakerName` so different characters sound a little different) — nice-to-have, keep it subtle.
- **Don't blip on punctuation/pauses** — the silence during the longer delay is the "cadence." Keep volume modest
  (~0.3–0.4) and ensure overlapping blips never stack into noise (the pool + every-Nth gating handles this).

### 3. Keep it robust
- All `play()` calls `.catch(() => {})` (autoplay/availability). Missing audio must not break typing.
- Respect `muted`: no blips when muted (typing still works).
- Don't regress the skip-on-click/Space behaviour or the choice rendering.

## Notes / coordination
- This replaces the `TYPEWRITER_URL` tick usage for dialogue. You may leave the `TYPEWRITER_URL` export in
  `audio.ts` (other code/tests might reference it) — just stop using it in `DialogueBox` if you switch fully to the
  blip, or keep it as a fallback. Check `grep -rn TYPEWRITER_URL src` before deleting anything.
- ⚠️ Merge note: TASK-07 (UI sounds) also touches `DialogueBox.tsx`, but only the **choice button onClick** — a
  different region from the typewriter effect. Per MASTER_PLAN this task merges **first**.

## Acceptance criteria
- Dialogue types out with a pleasant talking blip from `dialog_sound.mp3` that pauses on punctuation and doesn't
  sound like a flat rattle.
- Muting silences the blips; typing and skip-to-full still work.
- No console errors; `npx tsc --noEmit` and `npm run build` clean. Note in the PR that you listened to it.