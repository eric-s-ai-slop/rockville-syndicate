/**
 * beatClassification.ts — maps every `Beat['type']` (src/data/chapters/types.ts)
 * to how the playtest loop's `advance` command should treat it: dismiss it
 * automatically, stop and hand control to the agent, or just wait it out.
 *
 * CRITICAL semantic fact (BeatEngine.ts ~line 316): background minigames
 * (`background: true`) also set `scene.activeMode`, but the beat flow
 * continues past the launching beat immediately — they do NOT block. Only a
 * foreground (non-background) `minigame` beat or a `bossFight` beat holds
 * `beatIndex` until the mode completes. So "blocking" is a property of the
 * CURRENT BEAT's classification, never of `activeMode` being truthy by
 * itself — callers must not treat `activeMode` alone as blocking.
 */
import type { Beat } from '../../src/data/chapters/types';

export type AdvanceExpectation =
  | 'dismissable' // dialogue — advance presses Space through it
  | 'interactive-choice' // choice — advance must stop; agent inspects and picks
  | 'interactive-walk' // walkTo — advance must stop; agent walks with real input
  | 'blocking-mode' // foreground minigame / bossFight — advance must stop; agent attempts it
  | 'passive' // resolves on its own; advance just waits
  | 'terminal'; // endChapter

/**
 * Keyed with `Record<Beat['type'], ...>` (rather than a partial map or a
 * switch with a default) so this is the exhaustiveness mechanism: when a 20th
 * beat type is added to the `Beat` union in types.ts, `npm run lint`
 * (`tsc --noEmit`) fails right here on the missing property until the
 * playtest loop is taught how to treat it. Do not weaken this to `Partial<>`
 * or add a catch-all default — that would silently swallow new beat types.
 */
const BEAT_EXPECTATIONS: Record<Beat['type'], AdvanceExpectation> = {
  dialogue: 'dismissable',
  choice: 'interactive-choice',
  walkTo: 'interactive-walk',
  bossFight: 'blocking-mode',
  // Foreground by default; a `background: true` minigame beat is downgraded
  // to 'passive' by classifyBeat below, since the beat flow doesn't wait on it.
  minigame: 'blocking-mode',
  endChapter: 'terminal',
  cameraPan: 'passive',
  hideActor: 'passive',
  showActor: 'passive',
  moveActor: 'passive',
  routeOnMinigame: 'passive',
  chase: 'passive',
  sfx: 'passive',
  wait: 'passive',
  ledger: 'passive',
  stopAllAudio: 'passive',
  screenTint: 'passive',
  changeScene: 'passive',
  changeMusic: 'passive',
};

/** Stop statuses `advanceUntil` can return when its `stopOn*` options are set
 * — exported for callers (cli.ts) that want to reason about them without
 * re-deriving the string list. Kept here rather than in helpers.ts so this
 * module stays dependency-free besides the `Beat` type import. */
export const ADVANCE_STOP_STATUSES = [
  'choice-present',
  'walk-target-present',
  'mode-active',
  'chapter-ended',
] as const;

/** Every status the `advance` command can exit with (the stop statuses plus
 * the two condition-side exits reachWalkControl adds). This is the canonical
 * list the skill/toolkit docs are guarded against (skillDocSync.test.ts) —
 * extend it here first when adding a status, and the guard will point at
 * every doc that still needs teaching. */
export const ADVANCE_STATUSES = [
  'walk-control',
  ...ADVANCE_STOP_STATUSES,
  'ambient-dialogue',
] as const;

/**
 * Classify a beat type as the playtest loop should treat it.
 *  - null/undefined `type` → null (no beat currently running).
 *  - `'minigame'` with `opts.background` true → 'passive' (BeatEngine doesn't
 *    block the flow on background minigames — see file header).
 *  - a known `Beat['type']` → its `BEAT_EXPECTATIONS` entry.
 *  - any other string → 'unclassified'. This must never throw: it means the
 *    running chapter config is newer than this harness build (a beat type
 *    added to types.ts without a matching BEAT_EXPECTATIONS entry would fail
 *    typecheck already, so in practice this covers things like a typo'd type
 *    or a future runtime/config mismatch) — callers surface it in diagnostics
 *    rather than crashing the playtest session over it.
 */
export function classifyBeat(
  type: string | null | undefined,
  opts?: { background?: boolean },
): AdvanceExpectation | 'unclassified' | null {
  if (type === null || type === undefined) return null;
  if (type === 'minigame' && opts?.background) return 'passive';
  if (Object.prototype.hasOwnProperty.call(BEAT_EXPECTATIONS, type)) {
    return BEAT_EXPECTATIONS[type as Beat['type']];
  }
  return 'unclassified';
}
