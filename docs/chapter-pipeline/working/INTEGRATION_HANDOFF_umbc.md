# Integration Handoff — The UMBC Incident

**Pipeline step:** 5 (Integration). **Your checklist:** `docs/chapter-pipeline/05_INTEGRATION.md` — follow it.
You have the whole repo; read the referenced files directly rather than trusting this summary blindly.

The chapter (`id: 'umbc_incident'`, `src/data/chapters/chapter3b.umbc-incident.ts`) is mostly integrated.
Do **not** rewrite the chapter, the `storyFractures` mode, or the menu — they're finished.

---

## Already done (confirm, don't redo)

- §1 chapter file · §2 in `CHAPTERS` · §3 per-scene music ("Beauty and a Beat" basement → Nightcall parking lot)
- §4 `BossConfig` `boss_ben_umbc` in `entities.ts` · §5 stage images + `npc_girl_silhouette` loaded in `ChapterScene.ts`
- Bespoke: Ben's "You're next." voice clip (`public/voice/ben_youre_next.mp3`, fired from the `basementScene` mode);
  the CLASSIFIED/redacted menu card for this chapter in `ChapterSelect.tsx`; the `storyFractures` mode implementation
  (`src/game/modes/storyFractures/index.ts`).

## Remaining (do these)

1. **§2 ordering.** Currently last in `CHAPTERS` with `index: 10`. Move it to slot 6 (between `chapter5` and
   `chapter6` in `src/data/chapters/index.ts`) and renumber `index:` fields: this `10→6` (drop its TODO comment),
   `chapter6 6→7`, `chapter7 7→8`, `chapter8 8→9`, `chapter9 9→10`.
2. **§6 register the minigame.** Add to `src/game/modes/index.ts`:
   `import { storyFracturesMode } from './storyFractures';` and `registerMode(storyFracturesMode);`
3. **§7 typecheck:** `npm run lint` + `npm test`.
4. **§8 playtest — see visual checklist below.**

---

## Visual verification (use your vision — screenshot each checkpoint)

`tsc` already passed; what's left is everything a typechecker can't see. Run `npm run dev`, drive the UI, and
**capture a screenshot at each point. Judge it, don't just confirm it loaded.** Watch for: text overflow past the
viewport, low contrast / unreadable text, UI off-screen, clicks landing on the wrong element, and whether the
redaction reads as *intentional and ominous* vs. *broken*.

1. **Menu — sealed.** Chapter select, slot 6: the redacted CLASSIFIED card. Screenshot. The "CLASSIFIED" watermark
   should be legible-but-faint, the blackout bars deliberate, the red theme distinct from the green cards around it.
2. **Menu — break.** Click "CLICK TO BREAK SEAL" once. Screenshot the result: it should reveal a normal, playable
   "The UMBC Incident" card (index `6`, Play icon, same styling as siblings). One click only.
3. **Voice line.** Enter the chapter; at Ben's "You're next." beat, confirm audio fires (check console/network for
   `/voice/ben_youre_next.mp3`).
4. **Boss.** `boss_ben_umbc` portrait renders with the HP/QTE overlay; the fight resolves.
5. **Scene crossfade.** `changeScene` to the parking lot: the night stage image renders and music crosses to Nightcall.
6. **storyFractures (the risky one — it's all camera-fixed `setScrollFactor(0)` UI I could not playtest):**
   - Screenshot mid-reveal: story paragraphs readable over the parking-lot backdrop + dark scrim; counter visible
     top-right; fracture hints subtle but present.
   - **Click a fracture line and screenshot** — confirm the click registers (gold pulse + counter tick). This is the
     single most important visual check: camera-fixed interactive text can mis-hit.
   - Mark all four → screenshot the **win** overlay (reassembled-truth text must fit and read).
   - In a second run, let the review window lapse with fractures unmarked → screenshot the **lose / "Listen again"**
     overlay. Confirm no soft-lock — there's always a forward button.
   - Confirm the whole layout fits your viewport height; paragraphs shouldn't run off the bottom.

If something's off, most of these are quick fixes (contrast, font size, hit-area, y-spacing) — note exactly what you
see in the screenshot before changing code.
