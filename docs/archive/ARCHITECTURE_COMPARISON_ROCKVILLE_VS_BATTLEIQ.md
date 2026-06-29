# Battlefield Report: The Rockville Syndicate vs. BattleIQ

**Classification:** Architectural Intelligence / Dev War Dossier
**Prepared by:** Senior Software Architect, Technical Analysis Division
**Subject:** Two indie web-game codebases locked in an asymmetric engineering conflict
**Status:** Active engagement — Project A currently holds captured territory

> **Grounding note.** Every figure below was pulled from the live source tree, not the briefing packet. Where intel and reality diverged, reality wins:
> - **Project A ("Rockville"):** 19,840 lines across 78 `.ts`/`.tsx` files under `src/` (plus assets, configs, and Playwright/Vitest specs across the wider repo).
> - **Project B ("BattleIQ"):** 11 files, ~6,850 lines of vanilla JS in the `battleiq/` source tree (~8,260 if you count a stray `battle (1).js` duplicate). The two combat brains — `battle.js` (1,442 lines) and `game.js` (1,419 lines) — confirm the "1,400-line state machine" intel exactly.
> The "10,000 lines" figure in field reports is inflated by roughly 30%. The doctrine it describes is accurate; the headcount is not.

---

## 1. Executive Summary: The Engineering War of Attrition

This is not a fight between a good codebase and a bad one. It is a collision between two coherent, internally consistent, and individually *lethal* engineering doctrines — each optimized for a different theater of war.

**The Rockville Syndicate** fights the war of **logistics**. It is the mechanized army: TypeScript for armor, React 19 for a modular chain of command, Phaser 3.88 as the heavy ordnance, Vite for supply lines, and a fortified perimeter of Playwright E2E suites, Vitest unit tests, ESLint, and Docker. Every level is a declarative config file (`src/data/chapters/`), every subsystem is a wired-in module (`src/game/scene/`, `src/game/modes/`). It scales to teams. It survives contributor turnover. It is slow to move and expensive to feed.

**BattleIQ** fights the war of **maneuver**. It is the guerrilla force: 100% vanilla JavaScript, raw HTML5 Canvas, hand-rolled CSS, zero dependencies, zero build step. It compiles in exactly the time it takes the browser to parse a `<script>` tag. Its logic lives in dense, global-scope state machines that execute bare-metal with no abstraction tax. It is devastatingly fast to iterate and brutally hard to onboard onto.

The decisive event of this campaign is that **Project A captured Project B alive.** Rockville did not destroy BattleIQ — it *annexed* it, dropping the entire static payload into `public/minigames/battleiq/` and serving it through an iframe (`src/components/ExternalGameFrame.tsx`) as a subjugated, skippable minigame inside its own RPG. This is a textbook **Embrace, Extend, Extinguish** maneuver, and it succeeded precisely *because* of BattleIQ's greatest virtue: its frictionless, dependency-free portability made it trivially liftable.

---

## 2. Arsenal Analysis (Tech Stack & Infrastructure)

### Project A — Heavy Logistics

Rockville's arsenal is built around **abstraction as force-multiplier**, and it pays an abstraction tax to get it:

- **TypeScript** — a compile-time officer corps. Nothing ships without passing `tsc --noEmit`. Types are the chain of command that lets multiple engineers operate the same machinery without friendly fire.
- **React 19 + Phaser 3.88** — a deliberate two-runtime split. React owns the UI/menu/HUD layer; Phaser owns the canvas game world. They are bridged carefully (`GameLayout.tsx`), and the seams are dangerous: the codebase carries hard-won scar tissue about never firing side effects inside a `setState` updater under `<StrictMode>`, and about driving canvas sizing from Phaser's `update()` loop rather than React.
- **Vite + Tailwind v4** — fast HMR and utility-first styling, but a build pipeline nonetheless. There is a compile step, a dev server (port 3324), and a transform cache that occasionally needs a hard restart.
- **Docker + Playwright + Vitest + ESLint** — the fortification. This is the expensive, heavy infrastructure that turns "it works on my machine" into "it works on the CI runner, gated and required."

**The tax:** cold-start cognitive load is high. A new contributor must understand the React/Phaser bridge, the declarative chapter schema, the mode registry, and the test harness before landing a single feature. **The dividend:** the project can absorb that contributor *at all*, and survive ten of them.

### Project B — Guerrilla Brute-Force

BattleIQ's arsenal is built around the **total elimination of friction**:

- **Vanilla JS + Canvas + CSS** — no framework, no virtual DOM, no reconciler. State mutates directly; pixels are drawn directly to the canvas. There is no layer between the developer's intent and the machine.
- **Zero-dependency, zero-build** — there is no `node_modules`, no bundler, no compile time. Edit a file, hit refresh, the change is live. Iteration latency approaches zero.
- **Monolithic bespoke engine** — `game.js` and `battle.js` are ~1,400-line high-speed state machines. `overworld.js` (860), `assets.js` (661), `data.js` (650), `debug.js` (612), and `bulletHell.js` (544) round out a custom engine that owes nothing to any third party.

**The tax:** the global scope is the battlefield, and there are no walls between subsystems. Refactoring is hazardous; the developer's memory *is* the type system. Onboarding is an apprenticeship, not a checklist. **The dividend:** raw execution speed, total control, and the ability to ship a change in the time it takes to alt-tab.

---

## 3. The iframe Offensive (The "Heist")

This is the centerpiece of the campaign, and the source tree tells the whole story.

### The capture

Developer A copied BattleIQ's static payload verbatim into `public/minigames/battleiq/` and mounted it through a React component:

```tsx
// src/components/ExternalGameFrame.tsx
<iframe
  src={`/minigames/${gameId}/index.html?token=${tokenRef.current}`}
  className="w-full h-full border-none"
  tabIndex={0}
/>
```

Because BattleIQ is **zero-dependency and zero-build**, there was nothing to port. No bundler to reconcile, no module graph to untangle, no peer-dependency conflict. The payload that made BattleIQ so portable made it *liftable in a single afternoon*. **Its greatest strength was the exact mechanism of its capture.**

### The "Extend" — and the detail the field report missed

The briefing described an Embrace-Extend-Extinguish maneuver but stopped at "wrote a wrapper." The reality is more surgical. Developer A did not fork or rewrite BattleIQ's logic — they injected a **parasitic shim**, `omega-bridge.js`, that monkey-patches the captured engine's own globals without touching a line of its source:

```js
// public/minigames/battleiq/omega-bridge.js
const originalWin = battleController.winBattle;
battleController.winBattle = function (messageText, wasSpared) {
  originalWin.apply(this, arguments);
  setTimeout(() => {
    sendOmegaMessage('complete', { result: { outcome: 'win', data: { spared: wasSpared } } });
  }, 3000);
};
```

This is the "Extend" phase made literal: Rockville wraps `battleController.winBattle` and `triggerGameOver`, intercepts BattleIQ's victory and defeat events, and relays them up to the parent frame via `postMessage`. The bridge even carries defensive comments acknowledging that `game.js` is *not loaded in the sandbox*, so `triggerGameOver` is wrapped in a `try/catch` to report the loss anyway if the captured code throws reaching for a global that no longer exists. BattleIQ has been **vivisected and kept alive on a respirator built by the enemy.**

### Why the borders were undefended

The capture worked because BattleIQ shipped **no perimeter defenses whatsoever**:

- **No `X-Frame-Options` header.** Nothing instructs the browser to refuse embedding.
- **No `Content-Security-Policy: frame-ancestors`.** The modern equivalent is equally absent — any origin may frame the content.
- **No framebusting script.** No `if (window.top !== window.self)` check to detect captivity and break free.

A static payload served from a plain file host *cannot* set HTTP response headers without a server or host configuration to set them — and BattleIQ, by design, has neither. Its zero-infrastructure doctrine left it with no surface on which to mount a defense. The handshake Rockville built (a random per-session `token`, a same-origin `event.origin` check) is a courtesy to *itself*, not a concession to BattleIQ — and note the iframe carries **no `sandbox` attribute**, meaning the captured game runs with full same-origin scripting privileges inside Rockville's own document. The annexation is total and trusting.

---

## 4. Velocity vs. Fortification

| Axis | Project B (BattleIQ) | Project A (Rockville) |
|---|---|---|
| Iteration latency | ~0 (refresh) | Build + HMR + occasional dev-server restart |
| Cold-start onboarding | Apprenticeship | Documented, gated, checklist-driven |
| Refactor safety | Manual / risky | Type-checked + test-gated |
| Encapsulation | Global scope | Modules + declarative configs |
| Failure blast radius | Whole file / global | Isolated subsystem |
| Team scaling ceiling | Low (one or two operators) | High (squad) |

**BattleIQ's tactical edge is tempo.** With no compile step, the OODA loop — observe, orient, decide, act — is bounded only by the developer's reflexes. For a solo operator iterating on game feel, this is a genuine and underrated weapon. Speed of iteration *is* a form of quality.

**Rockville's tactical edge is durability under load.** The fortifications — required E2E gate, unit tests, type checking, modular boundaries — are slow to erect and expensive to maintain, but they convert a fragile artisanal artifact into something that can be handed between engineers, regression-tested, and shipped commercially. It trades tempo for the ability to *not lose ground it has already taken.*

Neither is wrong. They are tuned for different scales of conflict: BattleIQ for the lightning raid, Rockville for the sustained campaign.

---

## 5. The 10,000-Hour War (Long-Term Projections)

**Project A → standardized commercial platform.** Ten thousand hours of disciplined investment carries Rockville toward a productized engine: a stable chapter-authoring schema that non-programmers can edit, a mature minigame-mode SDK (the `src/game/modes/` registry and `_template/` already gesture at this), a component library, and a CI/CD pipeline robust enough to ship on a cadence. The risk is **sclerosis** — abstraction layers calcifying into ceremony, the test suite becoming a tax on velocity, and the React/Phaser bridge accumulating ever more scar tissue. But the trajectory is toward something a *studio* can own.

**Project B → esoteric hyper-optimized bespoke engine.** Ten thousand hours carries BattleIQ toward a singular, idiosyncratic masterwork — a custom engine tuned to the exact contours of one developer's vision, possibly outperforming any off-the-shelf framework for its specific workload. The state machines grow denser, faster, and more clever. The risk is the **bus factor of one**: the codebase becomes a cathedral only its architect can navigate, where the absence of types and tests means every change is performed from memory. It will be brilliant and nearly *uninheritable.*

The poetic irony: after 10,000 hours, Rockville becomes something many people can build; BattleIQ becomes something only one person can.

---

## 6. Counter-Offensive Doctrine for Project B

BattleIQ can strike back **without surrendering the vanilla, zero-build advantage that defines it.** The objective is to add defense and structure while keeping the OODA loop near-zero. Three moves, in priority order:

### A. Break out of the iframe — reclaim sovereignty (immediate)

The fastest counter-strike requires no build pipeline at all: a **framebuster** at the very top of `index.html`.

```js
// First script in <head> — runs before anything Rockville can intercept
if (window.top !== window.self) {
  // Optionally allow only an approved parent origin:
  // if (document.referrer && new URL(document.referrer).origin === 'https://battleiq.example') { /* ok */ }
  window.top.location = window.self.location; // forcibly take over the top frame
}
```

If BattleIQ ever moves behind *any* host that can set headers (even a one-line static config), deploy the real fortifications:

```
Content-Security-Policy: frame-ancestors 'none';
X-Frame-Options: DENY
```

`frame-ancestors 'none'` is the decisive weapon — it instructs every modern browser to refuse rendering BattleIQ inside *any* iframe, collapsing Rockville's annexation instantly. This directly neutralizes the heist described in Section 3.

### B. Weaponize ES Modules for encapsulation (low-friction, no build)

The global scope is BattleIQ's structural weakness — and modern browsers fix it **for free, with no bundler.** Native ES Modules give real encapsulation with zero compile step:

```html
<script type="module" src="game.js"></script>
```

```js
// battle.js — explicit borders instead of shared global scope
export class BattleController { /* ... */ }

// game.js
import { BattleController } from './battle.js';
```

This preserves the buildless doctrine while replacing implicit global coupling with explicit, auditable imports — and, as a bonus, makes the monkey-patch attack from `omega-bridge.js` substantially harder, since module-scoped bindings are not casually reachable from an injected global shim.

### C. Deploy JSDoc for buildless type-checking (defensive intelligence)

BattleIQ does not need TypeScript to gain TypeScript's safety net. JSDoc annotations plus a `// @ts-check` pragma let `tsc` type-check vanilla `.js` files **with no build output and no runtime change:**

```js
// @ts-check
/**
 * @param {string} messageText
 * @param {boolean} wasSpared
 */
function winBattle(messageText, wasSpared) { /* ... */ }
```

Run `tsc --checkJs --noEmit` in CI (or a git hook). The shipped artifact stays 100% vanilla JS; the developer gains type safety, editor autocomplete, and refactor confidence — directly attacking the "bus factor of one" risk from Section 5 without paying the abstraction tax of a framework.

---

## Closing Assessment

Rockville won the opening engagement through superior logistics and an opportunistic, well-executed annexation. But the war is not over. BattleIQ's counter-doctrine is cheap, fast, and decisive: a single framebuster script and one CSP header can break the annexation in an afternoon — the same afternoon-scale agility that made it vulnerable now makes it dangerous. The deeper lesson of this dev war is that **portability and sovereignty are the same property viewed from opposite sides.** What makes your code easy to deploy makes it easy to capture. The mature combatant — on either side — is the one who decides *deliberately* which of those they want, and defends the border accordingly.

*— End of report.*
