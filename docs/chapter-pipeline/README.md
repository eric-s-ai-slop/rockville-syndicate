# Chapter Pipeline

Agentic pipeline for turning a real story into a shippable chapter.
Steps 1, 2a, 2b, 3, and 4 are AI agent prompts — copy the system prompt into a fresh Claude conversation.
Step 5 is a human integration checklist.

---

## THE PIPELINE

```
Real story
    ↓
[01_EXTRACTION]         Story developer agent
    ↓
Creative brief
    ↓
    ├── [02a_MAP_DESIGN]    Map layout agent      ─┐
    │                                              ├─ run in parallel
    └── [02b_MECHANIC]      Mechanic design agent ─┘
              ↓                        ↓
         MapConfig +           Mechanic spec +
         coordinates           BossConfig / mode spec
              └──────────┬────────────┘
                         ↓
                   [03_SCHEMA]        Technical translator agent
                         ↓
              ChapterConfig + beats[] (TypeScript)
                         ↓
                   [04_ASSETS]        Asset spec agent
                         ↓
              Asset spec (what to source / make)
                         ↓
              Source / create assets
                         ↓
                   [05_INTEGRATION]   Human checklist
                         ↓
                  Shipped chapter
```

**DEEPEN** is a standalone tool — use it any time to improve existing beats.

---

## STEPS

### Step 1 — Extraction (`01_EXTRACTION.md`)
**In:** Raw story dump (voice memo, bullet points, screenshots, anything)
**Out:** Complete creative brief

Interviews you before developing anything. Four mandatory checks before advancing:
- **Label Check** — any named moment that isn't yet a real scene
- **Hinge Character Check** — the person whose one decision changes everything
- **Artifact Check** — any created fiction/object at the center of the story, including what it extracted from the target
- **Causal Chain Check** — any jump from A to C with no B

*Don't advance until every key dramatic moment is specific enough that a writer could pick it up cold.*

---

### Step 2a — Map Design (`02a_MAP_DESIGN.md`) ← run in parallel with 2b
**In:** Location description + who's present + key dramatic moments (from brief)
**Out:** `MapConfig` + `ActorPlacement[]` with real pixel coordinates

Proposes layout in plain English first, gets approval, then writes TypeScript. Output includes boss arena bounds and flags any propKeys that fall back to procedural rendering.

---

### Step 2b — Mechanic Design (`02b_MECHANIC.md`) ← run in parallel with 2a
**In:** Boss section + chapter identity + emotional arc + the question the story asks (from brief)
**Out:** Chosen mechanic concept + full implementation spec

Generates three concepts ranging from conservative (bossFight variant) to ambitious (new mode from scratch). Each concept states the gameplay loop, the win/lose condition, and the emotional argument for why this mechanic fits this chapter. Once a concept is chosen, outputs the exact beat config + either a `BossConfig` draft (in character voice) or a full `GameMode` spec for a new minigame.

*The mechanic should feel like the chapter's emotional conflict made playable, not just a fun game attached to a story.*

---

### Step 3 — Schema (`03_SCHEMA.md`)
**In:** Creative brief + MapConfig + coordinates (from 2a) + mechanic spec (from 2b)
**Out:** Full `ChapterConfig` shell + `beats[]` array, ready to paste

Applies character behavioral voice profiles when writing all dialogue. Two approval gates: confirms its read of the brief, proposes a plain-English beat outline, then writes code only after both are approved.

---

### Step 4 — Assets (`04_ASSETS.md`)
**In:** Completed ChapterConfig + creative brief (for tone context)
**Out:** Structured asset spec + BossConfig (if not already produced in 2b)

Covers: stage music, location art, prop sprites, character sprites, SFX map, and a prioritized net-new asset list. Knows what already exists and won't re-request it.

---

### Step 5 — Integration (`05_INTEGRATION.md`)
**In:** Everything from Steps 3 and 4 + sourced asset files
**Out:** A working, playable chapter

Exact file edits for: chapter file, `index.ts`, `audio.ts` (both music maps), `entities.ts` (BossConfig), custom prop loading, new minigame mode registration, typecheck, and playtest checklist.

---

## STANDALONE — DEEPEN (`DEEPEN.md`)
**In:** Existing beats you want to improve + what's not landing
**Out:** Targeted surgical changes, one at a time

Use after Step 3, after playtesting, or independently.

---

## NOTES

- Steps 2a and 2b are independent — run them in parallel in two separate conversations to save time.
- Each AI prompt is self-contained. Copy everything after the `---` in each file as your system prompt in a fresh Claude conversation.
- Steps 1 and 3 involve the most back-and-forth. Budget time.
- The BossConfig can come from either 2b (if you use bossFight) or 4 (if you spec it later). Don't duplicate — pick one.
- If Step 2b produces a new minigame spec, a developer needs to implement it before the chapter can ship. Factor that into timeline.
