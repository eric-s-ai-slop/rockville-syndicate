# Agent Handoff: Add Chapter 9 to Project Omega

**TL;DR:** You are adding Chapter 9 (The Suds & Soles Pool Party) to a Phaser 3 + React RPG. Follow the recipe in NEW_CHAPTER_FRAMEWORK.md. All answers are pre-filled in CHAPTER9_BRIEF.md.

---

## What You're Doing

Adding a new story chapter to Project Omega: The Rockville Syndicate. The chapter is a **dialogue-driven pool party** with no combat, 6 characters, and a comedic narrative arc.

---

## The Three Documents You Need (In Order)

1. **CHAPTER9_BRIEF.md** ← ALL PRE-FLIGHT ANSWERS ARE HERE
   - Read this first
   - It has chapter metadata, story beats, assets, everything
   - Copy values from here into the code

2. **NEW_CHAPTER_FRAMEWORK.md** ← MECHANICAL RECIPE
   - Read this second
   - Step-by-step: exactly which file, exactly where, exactly what to write
   - Follow it mechanically — don't improvise

3. **ARCHITECTURE.md** ← OPTIONAL DEEP REFERENCE
   - Read if you get stuck or need context
   - Explains WHY things work, not HOW to do them

---

## The 4 Files You Will Touch

| File | Step | What |
|------|------|------|
| `src/data.ts` | SKIP | No boss in this chapter |
| `src/game/audio.ts` | 1 | Music import + 2 map entries (copy from CHAPTER9_BRIEF) |
| `src/data/chapters.ts` | 2 | Chapter definition + CHAPTERS array entry |
| `src/game/ChapterScene.ts` | 3 | Sprite imports + preload calls |

**Nothing else gets touched. Not even close.**

---

## Exact Implementation Path

```
STEP 1 → src/game/audio.ts
  Copy the 3 audio lines from CHAPTER9_BRIEF

STEP 2 → src/data/chapters.ts
  Copy the chapter9 constant from CHAPTER9_BRIEF
  Add chapter9 to CHAPTERS array

STEP 3 → src/game/ChapterScene.ts
  Copy the 6 sprite imports from CHAPTER9_BRIEF
  Copy the 6 preload calls from CHAPTER9_BRIEF

STEP 4 → Validate
  [ ] npx tsc --noEmit (no TypeScript errors)
  [ ] Load game, pick chapter 9, verify it works
```

---

## Key Facts (Don't Miss These)

1. **Chapter ID:** `suds_and_soles_pool_party` (use exactly)
2. **Chapter Number:** 9 (next after chapter 8: cabin_basye)
3. **Music Key:** `music_ch9` (Phaser key for the audio system)
4. **Map Theme:** `park` (outdoor environment)
5. **No Boss:** Don't add to BOSSES array in src/data.ts
6. **6 Character Sprites:** All in `src/assets/chapters/SUMMER2026_FIRSTPOOLPARTY/`
7. **4 New Speakers:** eric, nick_f, nick_h, jacob (already exist); anastasia, sophia, sam_ferretti (NEW — add to EXTRA_SPEAKERS)

---

## Quick Sanity Check

Before you start, verify:

```bash
# Run this command:
ls -l src/assets/chapters/SUMMER2026_FIRSTPOOLPARTY/

# You should see:
# - Eric(pool).jpg
# - Nick_H(Pool).jpg
# - jacob(pool).jpg
# - nick_f(pool).jpg
# - anastasia(pool).jpg
# - sophia(pool).jpg
# - pool_map.jpg

# And this:
ls -lh src/assets/audio/stage_music/ | grep -i heat

# You should see:
# SUMMER2026_FIRSTPOOLPARTY(Glass Animals - Heat Waves).mp3
```

If both commands return results, you're good to go.

---

## If You Get Stuck

| Error | Fix |
|-------|-----|
| "Chapter doesn't appear in chapter select" | Check CHAPTER9_BRIEF → CHAPTER9_BRIEF says add `chapter9` to CHAPTERS array. Did you? |
| "TypeScript error on import" | Check the `?url` suffix is there: `'../path/to/file.jpg?url'` (not just `.jpg`) |
| "Sprites don't show" | Check sprite filenames match exactly (including capitalization): `Eric(pool).jpg` not `eric(pool).jpg` |
| "Music doesn't play" | Check CHAPTER_MUSIC_KEY[chapter9 id] matches STAGE_MUSIC_URL key exactly |
| "New speakers have no color/emoji" | Add them to EXTRA_SPEAKERS in chapters.ts (look for the pattern in the file) |

---

## Commit Message

When you're done and all tests pass:

```
git commit -m "feat: add chapter 9 — the suds & soles pool party

- Pool party dialogue chapter (no combat)
- 6 character sprites: Eric, Nick F, Nick H, Jacob, Anastasia, Sophia
- Story beats: blockade → girls confirmation → late arrival → hot tub chaos → pool jump fail → victory
- Glass Animals 'Heat Waves' background music
- New speakers: Anastasia, Sophia, Sam Ferretti"
```

---

## You're Ready

Go read CHAPTER9_BRIEF.md first, then follow NEW_CHAPTER_FRAMEWORK.md mechanically.

Good luck! 🎮
