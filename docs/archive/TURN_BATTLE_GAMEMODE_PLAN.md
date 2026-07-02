> **ARCHIVED** — Historical planning/handoff doc. May not reflect current code; verify against the source before acting on any item.

# Handoff: `turnBattle` GameMode — Undertale-style Battle (full BattleIQ depth)

> **For an AI agent (Gemini) executing cold.** Read fully before starting. This adds an Undertale/EarthBound-style turn-based battle as a new **minigame GameMode**, porting the mechanics from the standalone `battleiq/` project into Omega's React+Phaser+TS stack. Do the phases in order; each leaves the game playable and tests green.

---

## 0. Context — what & why

The repo `battleiq/` is a **separate, complete game** written in **vanilla JS + DOM + global singletons** (no modules, no Phaser, no React). Its battle system is genuinely good — timing-attack bar, combos, weakness matchups, items, SPARE/pacify endings, and per-boss bullet-hell dodge turns. We want that battle **inside Omega** as a minigame triggered from a chapter.

**We are porting, not embedding.** Do NOT load or run `battleiq/` scripts. They depend on globals (`game`, `GAME_DATA`, `bulletHell`, `pixelArt`, `audio`, `controlsHUD`) and own the DOM + the global keyboard — running them inside Omega means two engines fighting over input and a vanilla-JS island no agent can maintain. Instead we **transcribe its logic, patterns, and data** into a typed `turnBattle` GameMode. `battleiq/` is the **reference spec** — read it, don't import it.

**The integration seam is already built.** Omega has a `GameMode` contract (`src/game/modes/types.ts`), a registry (`src/game/modes/index.ts`), and a `minigame` beat. Adding this battle is: implement the mode, register it, reference it from a chapter beat. The host scene is never edited. The existing `bossFight` mode (`src/game/modes/bossFight/index.ts`) is your reference implementation of the contract.

**Scope: FULL BattleIQ depth** — FIGHT timing-attack, ACT moves, weakness matchup, combo system, items+MP, SPARE/pacify endings, party + SWITCH, multi-pattern bullet-hell enemy turns.

---

## 1. Ground Rules (apply every phase)

1. **Re-locate code by grep, never by line numbers in this doc** — they drift. Re-read `battleiq/battle.js`, `battleiq/bulletHell.js`, `battleiq/data.js` for exact logic.
2. **Reference `battleiq/` for behavior; write idiomatic Omega TS.** Match Omega's conventions (see `CLAUDE.md`), not BattleIQ's DOM/global style.
3. **Honor the React↔Phaser gotcha (this WILL bite the battle UI):** never run a side effect inside a React `setState` updater — `<StrictMode>` double-invokes it. Mirror state into a ref, read the ref, then `setState(...)` and side-effects **outside** the updater. The whole battle UI is a React overlay driven by callbacks, so every bridge resolve must follow this. See the existing `activeStory`/`activeStoryRef` pattern in `src/components/GameLayout.tsx`.
4. **Verify after every phase:** `npm run lint` (clean), `npm test` (green), and for runtime phases `npm run dev` + play the battle. Commit per phase on a branch off `main`.
5. **Preserve existing gotchas** (from `CLAUDE.md`): overlap callbacks identify objects by group membership; route text through `ctx.label()`; canvas sizing stays in scene `update()`; don't add camera bounds.

---

## 2. Architecture decision — how the battle is split

Mirror BattleIQ's own division of labor, but in Omega's stack:

| Concern | Lives in | Why |
|---|---|---|
| **Menus** (FIGHT/ACT/ITEM/SPARE/SWITCH), submenus, party HP cards, narrative log, **timing-attack bar**, damage/combo popups | **React overlay** (`src/components/BattleUI.tsx`) | DOM is ideal for menus; matches Omega's existing `DialogueBox`/QTE overlays |
| **Boss sprite, HP, the bullet-hell dodge arena** (the "soul" + bullets) | **Phaser** (inside the `turnBattle` mode) | physics/collision/render is what Phaser is for; reuse `ctx.enemyProjectiles` + arena |
| **Battle state machine + logic** (turns, combos, timing math, weakness, items, win/lose) | **The mode** (`src/game/modes/turnBattle/engine.ts`) | pure-ish TS, ported from `battle.js`; drives both the React UI and the Phaser arena |

**The bridge:** Add a React overlay + a `ModeContext` callback exactly like `triggerQTE`. The mode pushes UI state to React and receives player choices back through it. This is the single most important new seam — model it on `onTriggerQTE` in `GameLayout.tsx` (assigned to the scene at `src/game/ChapterScene.ts`, exposed on `ModeContext`).

---

## 3. Phase plan

### Phase 0 — Scaffold + data port
- Create `src/game/modes/turnBattle/` (copy `_template/` for shape). Register `turnBattleMode` in `src/game/modes/index.ts`.
- Port `battleiq/data.js` `GAME_DATA` into typed `src/game/modes/turnBattle/battleData.ts`:
  - `BattlePlayer` (id, name, title, hp/maxHp, mp/maxMp, atk, def, speed, color, avatar, inventory[], acts[]) — from `PLAYERS`.
  - `BattleEnemy` (name, hp/maxHp, atk, def, mood, weaknessActId, dialogues[], acts[], bulletPatterns[]) — from `ENEMIES`.
  - `BattleItem` (id, name, desc, heal, mpHeal, + effect flags: stunEnemy, atkBoost, deflect, instantPacify, shield…) — from `ITEMS`.
  - `BattleAct` (id, name, dmg?, pacify?, cost?, desc, successMsg).
- **Content mapping:** BattleIQ enemy ids (`eric`, `jacob`, `hedgecock_boss`, `maharko_boss`, `ben`) don't 1:1 match Omega `BOSSES` (`boss_eric`, `boss_audrey`, …). Add a `battleEnemyId` field to the relevant chapters' `bossFight`/`minigame` config OR a small map. Decide per chapter which boss becomes a turn-battle.
- Add the beat: `{ type: 'minigame', modeId: 'turnBattle', config: { enemyId: 'eric', partyIds: [...] } }`.
- **DoD:** lint clean; `battleData.ts` typed; characterization test (`src/data/chapters.test.ts`) passes — extend it so `turnBattle` config `enemyId` must exist in `battleData`.

### Phase 1 — React BattleUI overlay + bridge
- Add `src/components/BattleUI.tsx`: renders enemy name/HP bar, party cards (HP/MP, active highlight, fainted/locked), the main menu (FIGHT/ACT/ITEM/SPARE/SWITCH), submenus, narrative log, timing-bar container, damage/combo popup layer. Port markup/structure from `battleiq/battle.js` DOM + relevant `battleiq/style.css` classes (re-style to Omega's pixel aesthetic).
- Add the bridge: a `BattleUIState` + `onBattleEvent`/`triggerBattle` callback on `ModeContext` (mirror `triggerQTE`). Wire it in `GameLayout.tsx` (new React state + render `<BattleUI>`) and assign it to the scene in `ChapterScene` (like `onTriggerQTE`). **Apply the ref-mirror setState gotcha.**
- Keyboard: BattleIQ uses A/D + W/S + Enter/Space + Esc. Route input through the React overlay while a battle is active; ensure Phaser player movement is suspended during menu selection (the mode sets `ctx.player.setVelocity(0,0)` and gates input, like `bossFight`).
- **DoD:** the overlay renders with mock state and is keyboard-navigable; no battle logic yet.

### Phase 2 — Core turn loop + FIGHT (timing-attack)
- `engine.ts`: port the turn state machine from `battle.js` — `startBattle`, `executeMenuSelection`, the `isProcessing` guard, `triggerEnemyTurn`/`endEnemyTurn`, `damageEnemy`, `damagePlayer`, `winBattle`/`triggerGameOver`. Replace all DOM with bridge calls and Phaser via `ctx`.
- Port the **timing-attack** (`startTimingAttack`/`drawTimingBar`/`resolveTimingAttack`): the bar + cursor render in React (`requestAnimationFrame`); tiers/multipliers exactly as in `battle.js` (MISS .3 / OK .5 / GOOD .9 / GREAT 1.1 / PERFECT 1.3, PERFECT zone 0.92–1.0). Keep the 4s auto-stop.
- Win → call `onComplete({ outcome: 'win' })` → BeatEngine advances the beat. Lose (party wiped) → `onComplete({ outcome: 'lose' })` (route to Omega's game-over, like `bossFight`).
- **DoD:** a single hero can FIGHT a boss to defeat via timing attacks; win advances the story; lose triggers game-over. Play Ch1.

### Phase 3 — ACT + weakness + ITEM + MP
- Port `openActMenu`/`executeAct`: per-actor acts, damage/pacify, MP cost deduction, **weakness matchup** (`act.id === enemy.weaknessActId` → 1.5× + gold flash via `ctx` camera flash/shake + `flashEnemySpriteWeakness`). Show the ★ weakness marker in the ACT submenu.
- Port `openItemMenu`/`executeItem`: per-member inventory, heal/mpHeal/fullParty, and effect flags (stunEnemy, atkBoost, deflect, instantPacify, shield). Consume from the actor's inventory.
- **DoD:** ACT moves, weakness bonus, and items all function; MP deducts; verify the weakness flash + 1.5× in-game.

### Phase 4 — Combo system
- Port `recordAction`/`calculateComboMultiplier` (last-4 action history; variety/pattern bonuses — keep the nerfed values: full-combo 1.8, variety 1.4, etc.) and `showComboPopup`.
- **DoD:** combos multiply damage and the popup shows; confirm no one-shots (BattleIQ's balance notes warn about this).

### Phase 5 — Bullet-hell enemy turn (Phaser port)
- Port `battleiq/bulletHell.js` into `src/game/modes/turnBattle/bulletHell.ts` running on **Phaser arcade physics**, not canvas:
  - A bounded arena rect (the Undertale "box"); a player-controlled **soul** sprite (arrow/WASD) confined to it.
  - Port `generateBullet` for all ~10 patterns (`cow_melt`, `bedtime_chicken`, `spotify_crazy8`, `a_list_barrage`, `inflation_rain`, `location_lockdown`, `tired_zzz`, `crypto_stalk`, `stew_gokart`, …) — the spawn math (pos/velocity/type) transfers directly; replace manual canvas draw + collision with `ctx.enemyProjectiles` sprites + arcade overlap.
  - Keep i-frames (500ms grace, 600ms after hit) and per-hit damage (12 HP). On hit → `ctx.damagePlayer`/engine HP.
  - Multi-pattern cycling: bosses with `bulletPatterns[]` cycle by turn (`(turnCount-1) % patterns.length`); show the pattern "tell" line in the log first.
  - Duration ~5000ms with the safety-net timeout pattern from `triggerEnemyTurn` so the player never gets stuck.
- **DoD:** enemy turn is a real dodge phase; getting hit costs HP; patterns cycle; surviving returns to the menu. Reuse `bossFight`'s dodge/projectile handling where possible. **Verify hardest — this is the largest piece.**

### Phase 6 — SPARE/pacify + party + SWITCH + endings
- Port SPARE (`executeMenuSelection` 'spare'): success when enemy HP ≤ 30% or `enemyPacified`; otherwise enemy turn. Track spared enemies for a "pacifist" result in `onComplete({ outcome:'win', data:{ spared:true }})`.
- Port `switchActiveMember` (rotate to next living member), party-member fainting/removal, active-member indicator, and `damagePlayer` targeting the active member.
- **DoD:** multi-member party works; SWITCH rotates; SPARE ends fights when valid; fainting/game-over correct.

### Phase 7 — Boss content, sprites, audio
- Map BattleIQ enemy sprites (`pixelArt.drawEric` etc.) to Omega's existing sprite sheets (`SpritePreprocessor`/`Actors`) — use the chapter's existing boss sprite for the battle enemy. Per-boss theme tint optional (`applyBattleThemeTint`).
- Wire SFX through `ctx.audioController`/Omega audio (select, hit, heal, perfect, pacify, boss-defeat). Map BattleIQ `audio.*` calls to the nearest Omega sounds.
- Author/port all intended turn-battle enemies' data (acts, patterns, dialogue, weaknesses).
- **DoD:** each intended battle has correct sprite, audio, content.

### Phase 8 — Integration, tests, balance
- Result → beat advance verified for win/lose/spare across the chapters that use it.
- Extend `chapters.test.ts`: every `turnBattle` beat's `enemyId` + `partyIds` + referenced `act`/`item` ids resolve in `battleData`.
- Balance pass against BattleIQ's tuning notes (HP halving, nerfed multipliers, forgiving 12-HP hits).
- **DoD:** full `npm run lint && npm test && npm run e2e` green; a full battle is winnable and losable; deliberately bad references fail the test.

---

## 4. File layout (new)

```
src/game/modes/turnBattle/
  index.ts            # GameMode impl: start/update/teardown; owns Phaser arena + bridges to React UI
  engine.ts           # battle state machine + logic (ported from battle.js, DOM-free)
  bulletHell.ts       # Phaser port of bulletHell.js (patterns, soul, collision, i-frames)
  battleData.ts       # typed PLAYERS/ENEMIES/ITEMS/acts (ported from data.js)
  types.ts            # BattlePlayer, BattleEnemy, BattleItem, BattleAct, BattleUIState
src/components/
  BattleUI.tsx        # React overlay: menus, party cards, timing bar, popups, log
# modified:
src/game/modes/types.ts        # add battle bridge to ModeContext
src/game/modes/index.ts        # register turnBattleMode
src/components/GameLayout.tsx   # wire <BattleUI> + bridge (ref-mirror setState!)
src/game/ChapterScene.ts        # assign battle bridge to scene (like onTriggerQTE)
src/data/chapters/types.ts      # (if needed) turnBattle minigame config typing
src/data/chapters/chapterN.*.ts # add the minigame beat to chosen chapter(s)
```

## 5. Reuse — don't reinvent
- `src/game/modes/bossFight/index.ts` — reference for the GameMode lifecycle, camera/letterbox intro, boss HP bar, player-freeze, game-over routing.
- `ctx.triggerQTE` flow in `GameLayout.tsx` — reference for the React overlay bridge.
- `ctx.enemyProjectiles`, arena/walls, `ctx.damagePlayer`, `ctx.showDamageNumber`, `ctx.label`, `ctx.audioController` — already exist; the bullet-hell + menus use them.
- `battleiq/` is the behavior spec for every formula and pattern — read it per phase.

## 6. Verification
1. `npm run lint` after every change.
2. `npm test` (extend `chapters.test.ts` as above) + `npm run e2e`.
3. `npm run dev` (port 3000) → reach the chapter with the `turnBattle` beat → play a full battle: FIGHT timing tiers, ACT + weakness flash, ITEM, combo popups, the **bullet-hell dodge turn** (take hits, survive), SPARE, party SWITCH, win → story resumes; lose → game-over. Screenshot each.
4. Recommended first target: **Chapter 1 (Eric)** — it's first (fast to reach) and Eric has the 5-pattern cycling, exercising the hardest bullet-hell path early.

## 7. Sequencing & risk
- Phases 0–1 are scaffolding (safe). Phase 2 makes it playable. Phase 5 (bullet-hell) is the biggest/riskiest — budget the most time and verify in-game hardest. Phases 3/4/6 stack mechanics; 7/8 are content+polish.
- Prototype against **one** boss end-to-end (Phases 0–6) before authoring all enemies (Phase 7). Don't author all content until the loop is proven fun.
- Honor the StrictMode setState gotcha in every React bridge resolve — it's the most likely source of "every other turn skips" bugs.

## Effort
Full depth ≈ **2–3 focused weeks** for one dev; an agent compresses the mechanical ports (engine/data/patterns) with good review, but the React UI feel and balance need human iteration.
