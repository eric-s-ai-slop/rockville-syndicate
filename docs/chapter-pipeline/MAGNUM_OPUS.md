# MAGNUM OPUS — The Masterpiece Process

A heavier, slower authoring process for chapters that carry the emotional weight of the
whole game. First run: **Rockville Syndicate: Origins**.

This is NOT a replacement for the standard pipeline (`01_EXTRACTION` → `05_INTEGRATION`).
The standard pipeline turns a story into a shippable chapter efficiently. This process
exists because efficiency is the enemy of depth. Use it for at most one or two chapters
— the ones the whole game is secretly about.

## Why the standard pipeline can't produce a masterpiece

Diagnosis from four shipped-pipeline chapters:

1. **Extraction is shallow.** The brief captures what happened, not what it *felt like*
   or what it *meant*. Downstream agents can only deepen what was extracted; garbage-in
   applies to feelings too.
2. **Dialogue is thin.** Beats are written directly from a brief, so lines read like
   plot summaries with jokes attached. Nothing has subtext because nothing was ever
   written with interiority.
3. **Structure is formulaic.** Setup → minigame → boss → end, every time. The template
   shapes the story instead of the story shaping the template.
4. **Mechanics are bolted on.** A fun game gets attached to a story. The mechanic should
   *be* the story's central action, playable.

The fix for all four is the same principle: **write the literature first, derive the
game from it.** Prose before beats. Meaning before structure. Structure before mechanics.

---

## THE PHASES

Each phase produces a named artifact in `working/<chapter>/` and ends with an explicit
user approval gate. Do not let a phase leak into the next. The artifacts are the memory
— every phase can be run in a fresh conversation by loading the prior artifacts.

```
0. FRAME        What is the reveal? What does it recontextualize?   → 00_frame.md
1. EXCAVATION   Multi-pass deep interview                            → 01_story_bible.md
2. MEANING      Thesis, the question, why the secret was kept        → 02_meaning.md
3. STRUCTURE    Scene list, acts, frame device, pacing map           → 03_structure.md
4. PROSE        Each scene written as literary prose, workshopped    → 04_scenes/
5. MECHANICS    Playable verbs derived FROM the prose scenes         → 05_mechanics.md
6. MAPS         scenes[] layouts per location (standard 02a rigor)   → 06_maps.md
7. TRANSLATION  Prose → beats[], with a compression contract         → 07_chapterN.slug.ts
8. SCORE        Music/SFX as emotional score, assets                 → 08_assets.md
9. POLISH       DEEPEN passes, cold-read test, playtest for feel     → (edits in src/)
```

---

### Phase 0 — FRAME

A masterpiece chapter about a secret is really two stories: the events, and the telling.
Before any interviewing, settle:

- **What is the reveal?** State in one sentence what the player believes about the
  syndicate before this chapter, and what they know after.
- **What does it recontextualize?** Audit every shipped chapter: which existing scenes,
  running gags, and relationships read differently once the origin is known? List them.
  The chapter should quietly plant echoes of these (a masterpiece rewards replaying the
  earlier chapters).
- **Who is the teller and why now?** If the keeper of the secret is a character in the
  game, his reasons for keeping it — and for finally telling it — are part of the story
  and must be excavated in Phase 1, not invented later.
- **Canon Check** (same as standard pipeline): reconcile names, timeline, and character
  histories against `src/data/chapters/` and `src/data/entities/`.

Gate: user confirms the reveal sentence and the recontextualization list.

---

### Phase 1 — EXCAVATION (the deep interview)

The single biggest upgrade over the standard pipeline. Extraction was one interview;
excavation is **five passes**, run as separate conversations or sittings, because memory
surfaces in layers. The interviewer's discipline:

- **Never accept a summary.** "They made fun of him for a while" is a summary. Ask for
  one specific night, one specific line someone said, what the room smelled like.
- **Chase the shame and the pride.** The material that makes a masterpiece is the
  material the teller hesitates on. When the user glosses over something, that is the
  scene.
- **Ask what it felt like, not just what happened** — for the teller AND for each other
  person present (the teller's best guess is canon; the gap between guess and truth is
  usable dramatic irony).
- **Timestamp everything.** Convert "at some point" into a season, a school year, a
  before/after anchor.

**Pass 1 — Chronology.** Full timeline of the founding era, first contact to the moment
the syndicate undeniably existed. Every named event gets a slot. Output: dated event list.

**Pass 2 — Scenes.** For each event that might become a scene: location, who was
present, sensory details (time of night, what people were wearing, what was ordered at
the McDonald's), the exact words anyone remembers saying, what was funny at the time,
what is uncomfortable now.

**Pass 3 — Interiors.** One pass per major character. What did this person want during
this era? What were they afraid of? What did they NOT know that others knew? Crucially:
**who were they before they became who they are now?** The behavioral voice profiles in
`03_SCHEMA.md`/`DEEPEN.md` describe the finished characters — Origins-era versions need
**era-shifted voice profiles** (e.g. a Nick F who hasn't yet earned his current status;
a Jacob who is the target, not yet the friend; an Eric who hasn't yet invented "the
admin"). Write these profiles as deltas from the canonical ones.

**Pass 4 — The Secret.** Only for reveal chapters. Why did the teller keep this? Who
almost found out, and when? What has it cost to hold it? What does the teller expect to
happen when it's known? This pass is about the frame story.

**Pass 5 — The Wound.** The hardest pass. The origin story involves punching down that
became friendship. That transformation is the emotional core, and it only lands if the
early cruelty is portrayed honestly — not sanded into "harmless teasing." Ask: what was
actually mean about it? At what exact moment did mockery start turning into affection?
Did anyone ever acknowledge it out loud? (If the answer is no, that silence is probably
the final scene.)

Output: `01_story_bible.md` — chronology, scene records, interior profiles, era-shifted
voice profiles, secret record, wound record. This is the record downstream phases select
from; it should contain far more than the chapter will use.

Gate: user reads the bible and corrects anything false. Nothing advances while a known
falsehood is in the bible.

---

### Phase 2 — MEANING

One page. From the bible, state:

- **Thesis** — what the chapter argues, in one sentence. (Not the plot. The argument.
  e.g. "Every friendship in this group started as a bit that someone refused to let end.")
- **The question the chapter asks the player** — the thing the player should be turning
  over after the screen fades.
- **The transformation** — who changes, from what to what, and the single scene where
  the change becomes irreversible.
- **The register mix** — this game runs Larry David × Succession × The Office × Ferrante
  (see `DEEPEN.md`). State the blend for THIS chapter. An origin-of-cruelty story likely
  runs heavier on Ferrante/Office than any shipped chapter; say so explicitly so the
  comedy is calibrated as deflection, not decoration.

Gate: user approves the thesis. Every later dispute about a scene gets settled by
pointing at this page.

---

### Phase 3 — STRUCTURE

Now, and only now, shape it. Rules:

- **Derive the shape from the material.** Do not open the beat-type table and start
  filling a template. Ask: does this story want a frame narrative (present-day telling
  wrapping flashbacks)? Chapters? Repetition with variation (the double-call ritual
  recurring, meaning something different each time)? Let the bible answer.
- **Place the reveal deliberately.** For a secret-history chapter the reveal is a
  structural event: decide what the player experiences BEFORE understanding what they're
  seeing, and the exact scene where the frame snaps into place.
- **An escalation ladder is not optional** — but it must be an emotional ladder, not a
  difficulty ladder. Map each scene's emotional temperature; the sequence should climb.
- **The ending is earned silence.** The shipped chapters end on jokes or victory
  jingles. A masterpiece is allowed to end quiet. Plan the last 60 seconds explicitly.

Output: `03_structure.md` — ordered scene list (with one-line emotional job per scene),
act breaks, frame device spec, pacing map, and where each mechanic slot *might* live
(unfilled — mechanics come after prose).

Gate: user approves the scene list.

---

### Phase 4 — PROSE (the masterpiece draft)

**This phase is the reason the process exists.** Write every scene as literary prose or
screenplay — real paragraphs, real dialogue with subtext, interiority on the page —
BEFORE any beat exists. One scene per sitting, workshopped with the user until it's
right. Use the DEEPEN register and the era-shifted voice profiles from Phase 1.

Discipline:

- A line that could belong to any character belongs to no one (DEEPEN rule; applies
  doubly here because the era-shifted voices must be distinguishably *younger*).
- Every joke is a deflection of something true. In this chapter especially: the cruelty
  must be funny the way it was funny at the time, AND legible as cruelty. Both at once.
- Write what characters don't say. The beat translation (Phase 7) will need to know
  where the silences are so it can protect them.
- Target length: a scene's prose draft should be 3–5× longer than its eventual beat
  script. If the prose is already terse, there's nothing for compression to distill.

Output: `04_scenes/scene_NN_slug.md`, one file per scene, each marked APPROVED when the
user signs off.

Gate: every scene file approved.

---

### Phase 5 — MECHANICS (derived, not attached)

Only after the prose exists. For each scene, ask: **what is the verb?** What is the
character *doing* — not physically, but socially? (Orchestrating. Deceiving. Enduring.
Choosing a target. Refusing to laugh.) The mechanic is that verb made playable.

- The founding double-call prank is the archetype: the player as Eric literally wiring
  two people together under false pretenses is inherently a game mechanic. Design it as
  an interaction, not a cutscene.
- Prefer **several small diegetic mechanics** over one big boss. A masterpiece chapter
  may have no boss at all. (If a confrontation scene genuinely wants a bossFight, fine —
  but it must survive the "is this the verb of the scene?" test.)
- **Repetition with variation:** if a ritual recurs across the chapter, the mechanic
  should recur with modified rules, so the player *feels* the meaning shift through
  their hands.
- Each mechanic spec follows `02b_MECHANIC.md` format (loop, win/lose, emotional
  argument) plus one added field: **the prose passage it implements.**
- Losing states: in a memory, "losing" is strange. Consider loseGoto paths that rewind
  ("that's not how it happened") rather than punish.

Output: `05_mechanics.md` — mechanic specs; any net-new `GameMode` follows
`docs/ADDING_A_MINIGAME.md` + `src/game/modes/_template/`.

Gate: user picks/approves each mechanic.

---

### Phase 6 — MAPS

Standard `02a_MAP_DESIGN.md` rigor, with the full `scenes[]` array (this will be the
most multi-scene chapter in the game: McDonald's interior at 3am, bedrooms during the
phone calls, the first real hangout, plus any present-day frame location). Extra care:

- **Theme audit per scene** — a 3am McDonald's is not a shipped theme; decide whether an
  existing theme + heavy `rects`/backdrop work approximates it or a new theme is needed
  (new themes touch `Atmosphere.ts` — see gotchas in root `CLAUDE.md`).
- Split-location simultaneity (two bedrooms during a call) can be one map with two
  lit islands in a void — cameraPan between them — rather than scene changes.

Output: `06_maps.md` + coordinates. Gate: layout approval per scene.

---

### Phase 7 — TRANSLATION (prose → beats, with a compression contract)

Convert each approved prose scene into `beats[]`. The translator must write, at the top
of each scene's beat block, a comment listing what the compression is contractually
required to preserve:

```ts
// SCENE 4 — compression contract:
// - Jacob's pause before answering the second call (wait beat, no dialogue)
// - Nick F never says the word "sorry" — do not add it
// - The joke about fries lands BEFORE the camera reveals who's at the table
```

Rules:

- Silences from the prose become `wait` beats, camera holds, or empty walks — they are
  not cuttable.
- Dialogue comes from the prose verbatim-first: only shorten a line if the bubble
  can't hold it, never "punch it up" during translation (punch-up happens in Phase 9
  with DEEPEN, against the prose).
- Standard schema rules apply (`03_SCHEMA.md` beat grammar, converge pattern, etc.).
- Register the chapter per root `CLAUDE.md` §5; `npm test` content-lints refs.

Output: `chapterN.origins.ts` in `src/data/chapters/`, draft copy in working folder.

---

### Phase 8 — SCORE

Standard `04_ASSETS.md`, plus: treat music as score, not playlist. Map the pacing graph
from Phase 3 to music cues — where the track changes (`changeMusic`), where it drops out
entirely (`stopAllAudio` before the reveal or the ending silence), and any `seek` usage
for impact syncing. Silence placements are part of the asset spec.

---

### Phase 9 — POLISH

1. **DEEPEN pass per scene** — run `DEEPEN.md` against the beats WITH the prose scene
   pasted alongside, so the editor sharpens toward the source instead of freelancing.
2. **Cold-read test** — someone (or a fresh agent conversation) reads only the beats,
   no bible: what do they think the chapter is about? If the answer isn't the Phase 2
   thesis, the translation lost the meaning — fix translation, not the thesis.
3. **Playtest for feel, not function** — beyond `npm test`/lint: play it end to end and
   check the pacing map. Does the quiet ending actually feel quiet, or does a victory
   jingle fire? Do the wait beats hold long enough?
4. **Recontextualization check** — replay one earlier chapter; do the planted echoes
   from Phase 0 land?

---

## OPERATING NOTES

- **One phase per sitting is fine; one scene per sitting in Phase 4 is expected.** The
  working artifacts carry state between conversations.
- **The user is the source of truth for facts, the process is the source of truth for
  craft.** When the user says "that's not what happened," the bible changes. When the
  user says "just skip the prose and write the beats," point at the diagnosis section.
- **Working folder ledger:** add the chapter's row to `working/README.md` like any
  pipeline chapter.
