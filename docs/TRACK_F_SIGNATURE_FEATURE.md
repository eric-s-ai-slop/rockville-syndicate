# Track F — Signature Feature (Execution Spec)

**Lane:** 🟦 Engineer C · **Budget:** ~10–16h depending on option · **Phase:** 2
**Decide which ONE before Phase 2 starts.** F has no downstream dependencies, so it's also the
**cut reservoir** — shrink or drop it first if Phase-1 estimates slip.

For a game made **for the friend group**, all three options below are good; they trade
"new content the friends will quote" against "showcases the combat work." Recommended:
**Option 1 (local Hall of Records)** as the budget-fitting choice, **Option 2 (new chapter)**
if the team wants pure new content and can free the hours.

> **Decision (user):** the game is **all local — no server-backed leaderboard.** Scoring and
> records persist in `localStorage` only. The Express leaderboard API (`server.ts`) is **not**
> used and becomes dead code → flag it for removal in Track G2.

---

## Option 1 ⭐ (recommended, ~9h) — "Syndicate Hall of Records": local scoring + personal bests

**Why it fits:** turns systems that already exist (loot shards, the Ledger gag, difficulty)
into a real score, persisted with the rest of the local save — no network, fully offline.

**Current state (verified):**
- Loot shards drop but `handleCollectLoot` just destroys them (`ChapterScene.ts:1953`) — no
  score. The Ledger gag (`GameLayout` `ledger` state) is tracked but not scored.
- A server leaderboard exists (`server.ts`) but is **unused and explicitly out of scope** —
  this feature is local-only.

**Work:**
1. **Define a run score.** Compose from what already exists: shards collected, Ledger total,
   boss-clear speed/HP remaining, difficulty multiplier (A3). Make shard pickup actually add
   to it (give `handleCollectLoot` a purpose).
2. **Persist records locally** in the Track C P0 save blob (`omega-save-v2`): per-hero personal
   bests, fastest boss clears, best total run, last run. No initials entry, no POST — it's the
   player's own machine. (Versioned + corruption-guarded by the P0 work.)
3. **Hall of Records screen** (reachable from the title screen): render the local records table
   in-aesthetic — per-hero bests, fastest clears, "the Ledger" all-time high.
4. **Friends flavor — hardcoded "ghost" targets to beat.** Keep the in-joke crew scores
   (ERH 3333, NKF 2910, …) as a **local constant** the player races against, so the comedy
   survives without a server. Beating a ghost pops a celebratory bark.
5. **End-of-run summary** pixel-panel: this run's score vs. your previous best vs. the ghosts.

**Acceptance:** finishing a run computes a score, updates local personal bests, and the Hall of
Records screen shows your records vs. the hardcoded ghost targets; everything survives reload;
**no network calls**; no console errors.

**Risk:** Low — isolated (new screens + scoring hooks + local persistence). No server, no
combat/scene hot-file contention beyond reading existing state.

---

## Option 2 (~14–16h) — A brand-new chapter

**Why:** the most friend-pleasing possible use of the time — a fresh inside-joke episode they
can play. Fully isolated from other lanes (new data file + assets).

**Current state:** a complete **agentic authoring pipeline** exists at
`docs/chapter-pipeline/` (Steps 01_EXTRACTION → 02a_MAP / 02b_MECHANIC → 03_SCHEMA →
04_ASSETS → 05_INTEGRATION, plus DEEPEN). The data model supports single- and multi-scene
chapters (`scenes[]` + `changeScene` beats), bespoke bosses (`BossConfig`), and custom
minigame modes.

**Work:**
1. Pick the real story with the group; run Steps 1-4 of the pipeline to produce
   `ChapterConfig` + `beats[]` + `BossConfig`/mechanic spec + asset list.
2. Step 5 integration: new `chapterN.<slug>.ts`, append to `CHAPTERS` in
   `data/chapters/index.ts`, wire music in `audio.ts` (both maps), add `BossConfig` to
   `entities.ts`, register any new mode in `modes/index.ts`.
3. Source assets (music, location art, sprites) with fallbacks; `?url` imports.
4. Playtest on all three difficulties.

**Budget caveat:** if Step 2b yields a *new minigame mode* (not a `bossFight` variant), add
implementation time — scope to a `bossFight` variant or a light scripted mode to stay near 16h.

**Acceptance:** the new chapter is selectable, plays start-to-finish with no console errors,
renders all props/audio, and lands the joke in playtest with the group.

**Risk:** Medium — content-heavy and asset-dependent; the new-mode trap is the main schedule
risk. Mitigate by choosing a `bossFight`-based mechanic.

---

## Option 3 (~10h) — New Game+ / Boss Rush

**Why:** showcases the Track A combat work; pure replayability for the friends who want to
sweat.

**Work:** a new `modes/bossRush/` (copy `_template/`) that chains every `BossConfig`
back-to-back with the A3 difficulty scaling and a cumulative timer/score (feeds Option 1's
**local** records if both ship). NG+ = a progress flag that unlocks Hard + carries a cosmetic.
Reuses the entire combat system — low new-surface, high reuse.

**Acceptance:** boss rush runs all bosses in sequence on a chosen difficulty, tracks a
cumulative score/time, and ends cleanly; no leaks between fights (reuses `bossFight` teardown).

---

## Decision guidance for the lead
- Want **new content the friends will quote** and can free ~16h → **Option 2**.
- Want **maximum feature-per-hour, fully local** → **Option 1** (recommended default).
- Combat turned out great and you want it replayable → **Option 3** (and it pairs with 1).

Whatever you pick, F is the first thing to trim if the project runs hot.
