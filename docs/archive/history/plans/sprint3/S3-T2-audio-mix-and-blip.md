> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# S3-T2 — Dialogue blip won't stop + music/text balance

> Fresh agent: read **Global House Rules** in `plans/sprint3/MASTER_PLAN_S3.md` first. Surgical diff only.

## Symptoms (owner's words)
1. "Once the text ends, the text noise keeps playing, and it doesn't stop."
2. "Music vs text sounds — music too loud / text too quiet."

## Your two regions (do not touch anything else)
- **A:** `src/components/DialogueBox.tsx` — the typewriter `useEffect` + `playBlip`/`blipPool` at the top, and
  `skipTypewriter`.
- **B:** `src/game/ChapterScene.ts` — **only** the music-volume numbers inside the music block roughly **L1849–1936**
  (`this.stageMusic`/`this.bossMusic` setup and their `this.tweens.add({ targets: ..., volume: ... })`). Change
  *numbers*, nothing structural. Stay out of every other method in this file (other agents own them).

---

## Bug 1 — blip never stops (region A)

`DialogueBox.tsx` plays a pooled HTML `Audio` per typed character:

```ts
const blipPool = [0, 1, 2].map(() => new Audio(DIALOG_BLIP_URL));
...
function playBlip(rate = 1, volume = 0.35) { const a = blipPool[...]; a.currentTime = 0; a.play()... }
```

The typewriter effect's cleanup (`return () => { if (timerRef.current) clearTimeout(timerRef.current); }`) and
`skipTypewriter()` clear the **timer** but never **stop the audio**. `DIALOG_BLIP_URL` (`dialog_sound.mp3`) is not a
short tick, so the last-started blip keeps playing after the text finishes, and when the dialogue box unmounts the
sound continues — "doesn't stop."

**Fix:** add a helper that hard-stops every pooled element, and call it in every place typing ends:

```ts
function stopAllBlips() {
  for (const a of blipPool) { try { a.pause(); a.currentTime = 0; } catch {} }
}
```
Call `stopAllBlips()`:
- at the start of the typewriter `useEffect` cleanup (the `return () => { ... }`),
- inside `skipTypewriter()` when it short-circuits typing,
- when typing naturally completes (`if (i >= fullText.length) { ...; stopAllBlips(); }` — optional but tidy; the
  cleanup already covers line-change/unmount).

Also consider shortening perceived length: the blip is meant to be a *click per letter*, so a long sample is wrong
even when it stops. If `dialog_sound.mp3` is long, additionally cap it — e.g. start it and schedule a stop, or keep
the existing every-other-letter gate (`i % 2 === 0`) but ensure `stopAllBlips()` runs on completion. The hard
requirement is: **no blip audible after the line finishes typing or after the box closes.**

## Bug 2 — balance (regions A + B)

Current levels:
- Stage music tween → `volume: 0.48` (`ChapterScene` ~L1851), re-raise after boss → `0.48` (~L1918).
- Boss music → `0.62` (~L1896), boss sting → `0.72` (~L1867).
- Dialogue blip → `volume = 0.35` (`DialogueBox.playBlip` default + call site `playBlip(0.95 + Math.random()*0.2)`).

**Fix (these are recommended starting values — tune by ear during verification):**
- Lower stage music: `0.48 → 0.30` (both the initial tween and the post-boss restore).
- Lower boss loop: `0.62 → 0.42`; boss sting `0.72 → 0.55`.
- Raise blip: default `0.35 → 0.55` in `playBlip`.

Keep the relationship: music is a *bed*, dialogue blips sit clearly on top. Do not mute anything; do not touch the
footstep/SFX/victory-jingle volumes.

## Accept criteria
- Type a line of dialogue, let it finish, advance/close — **silence** immediately after the last character; no trailing
  or looping blip.
- During gameplay with dialogue, the blip is clearly audible over the music; music no longer drowns it.
- `npx tsc --noEmit` and `npm run build` clean.

## Verify
Run `npm run dev`, enter any chapter with intro dialogue, listen: (a) blip stops the instant text ends and when you
close the box; (b) blip is audible over the stage/boss music. Before finalizing, **rebase on `main`** and re-find the
music block by searching for `this.stageMusic = this.sound.add` (line numbers may have shifted).