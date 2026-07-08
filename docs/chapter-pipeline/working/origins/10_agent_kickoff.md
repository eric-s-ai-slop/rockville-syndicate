# Origins — Build Agent Kickoff

Paste the "KICKOFF PROMPT" block to the build agent as its first message. The ordered
checklist below is what that prompt points at; it's also here for your reference.

---

## KICKOFF PROMPT (paste this)

You're implementing a new chapter, "Rockville Syndicate: Origins," for this Phaser/React
game. All design is DONE and approved — you make ZERO creative decisions. Your job is to
translate finished design docs into working code.

Read these first, in order, before writing anything:
1. `docs/chapter-pipeline/working/origins/09_build_handoff.md` — THE build guide. Start
   with its "VERIFICATION STAMP" (§0) and "WHAT IS BEING BUILT" (§1). Follow it top to
   bottom; it is authoritative.
2. `docs/chapter-pipeline/working/origins/07_mechanics.md` — the one new mode
   (`doubleCall`) and its variants, in full.
3. `docs/chapter-pipeline/working/origins/08_maps.md` — the six maps and the
   `scenes[]` geometry (incl. the hidden-third-island reveal coordinates).
4. `docs/chapter-pipeline/working/origins/06_scenes/` (all four files) — the prose that
   the beats are transcribed from. The "SUBTEXT NOTES"/"COMPRESSION CONTRACT" blocks are
   binding: preserve every silence and verbatim line they name.
5. `docs/chapter-pipeline/working/origins/12_asset_wireup.md` — the art is DONE and the
   image files are ALREADY placed in `src/assets/images/...`. This doc says exactly which
   file attaches to which map rect (`stage_` propKey pattern), how to load the Chris
   sprite and the dialer, and the ONE image still pending (`stage_void_eric_room.jpg`,
   the reveal island — ship that island PROCEDURAL per `08_maps.md` §4.1 until the file
   lands, then swap in the `stage_` rect).
6. Skim `src/game/modes/_template/`, `docs/ADDING_A_MINIGAME.md`, and
   `src/data/chapters/chapter11.cabin-from-hell.ts` for engine patterns (incl. how
   chapter 11 imports/registers its `stage_` background images).

Then build in the order in the checklist below. Do NOT deviate from the handoff's
verbatim lines (spelling like "Apperantly" is intentional canon), the ethics guardrails
(§6), the "DO NOT" gotchas (§8), or the FUN AUDIT in `07_mechanics.md` (juicy interface,
group-chat payoff feel, short walks — the chapter must be fun to operate, not tedious).

When a step is done, run the relevant test (see checklist) before moving on. If a design
doc genuinely contradicts the engine, STOP and report it — do not invent a fix.

Build order:

1. **Engine primitives first** (small, isolated, so everything else compiles):
   - `src/data/chapters/types.ts`: add `'void'` to `MapTheme`; add
     `{ id:'narrator_eric', name:'Eric', emoji:'💬', color:'#c8e89a' }` to
     `EXTRA_SPEAKERS`; add `quietEnd?: boolean` to `ChapterConfig`.
   - `src/game/ChapterScene.ts` `runEndChapter()` (~L1160): wrap the victory anim
     (L1161), the green `flash` (L1162), and `victory_jingle` (L1167) in
     `if (!this.chapter.quietEnd) { … }`. Nothing else.
   - `npm run lint` — must compile.

2. **Build the `doubleCall` mode** (`src/game/modes/doubleCall/`, copy `_template/`).
   Implement all variants per `07_mechanics.md` §0 (ringOnly, founding, rerun, unsent,
   capital, reply). All UI through `screenSpace()` + `ctx.label()`; keyboard via a
   window keydown listener (benTrivia pattern); never emit `'lose'`. Register in
   `src/game/modes/index.ts` and add a row to `src/game/modes/CLAUDE.md`.
   - Write a unit test for the pure logic (typed-reply matcher, unsent rewind counter).
   - Playtest each variant in isolation per `ADDING_A_MINIGAME.md` §7, then revert.
   - `npm test` for `modesDoc.test.ts` + your unit test.

3. **Build the maps** into `scenes[]` per `08_maps.md`. Verify the three void islands'
   coordinates and that Eric's third island sits outside every Act I camera path.

4. **Write the beats** into `src/data/chapters/chapter12.origins.ts`, scene by scene,
   straight from `09_build_handoff.md` §5. Transcribe verbatim lines exactly; honor
   every compression contract. Use `narrator` in Act I, `narrator_eric` from the Scene 5
   handoff to the Scene 11 question, and no narrator in Scene 0 / after the question.

5. **Register + docs:** import & append `chapter12` in `src/data/chapters/index.ts`; add
   `'origins'` to `INTENTIONALLY_SILENT` in `src/data/chapters.test.ts` (path is
   `src/data/chapters.test.ts`, NOT under `chapters/`); add `music_origins` to
   `STAGE_MUSIC_URL` in `src/game/audio.ts` (placeholder url + `// TODO(phase8)` is fine;
   do NOT add a `CHAPTER_MUSIC_KEY` entry); add the chapter title to the root `README.md`
   chapter table.

6. **Verify everything** per `09_build_handoff.md` §7:
   - `npm run lint` (tsc clean) and `npm test` (all guards: chapters ref-lint, modesDoc,
     chaptersDoc, your unit test).
   - `npm run dev` (port 3324; full restart after edits — Vite cache), play the whole
     chapter, and run the §7 walkthrough checklist (Scene 0 silent/no-narrator; third
     island never visible in Act I; Scene 4→5 cut invisible; music never returns after
     the snap; Scene 6 blocks until `why`+💀; Scene 10 rewind + walk-away; Scene 11 25s
     walkable hold, one buzz, `omw`, NO jingle).
   - Cold-read check (§7.5) and the FUN check: Act I should feel *gleeful* to operate.

Report progress after each numbered step. Ask before deviating from any doc.

---

## OPEN DEFAULTS (all already ruled — the agent uses the handoff §9 defaults)

Eric's rulings, for reference (the build defaults in `09_build_handoff.md` §9 already
match these — the agent needs no further input):
- `quietEnd` engine change: **approved.**
- Scene 6 forced typing of `why` + 💀: **keep forced.**
- Scene 5 closing conviction, "That's the bit." (Nick H), Scene 8 live booth texts,
  Scene 11 "—I did it.", "It's shipping.": **all kept as drafted.**
- Chapter slot / menu title: **index 12, explicit title "Rockville Syndicate: Origins"**
  for now (the untitled-tile menu conceit is deferred — do not implement it yet).
- CAST FACT: Nick F and Nick H each have ONE brother, no sister.
