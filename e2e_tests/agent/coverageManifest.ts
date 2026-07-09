/**
 * coverageManifest.ts — derives a static, chapter-agnostic upper bound on what
 * a playtest pass over a `ChapterConfig` could ever exercise.
 *
 * Pure and dependency-free besides the `ChapterConfig` type (no Playwright
 * import, no Phaser import) so it can be unit-tested with plain Vitest and
 * reused by both the `--playtest-smoke` gauntlet variant (cli.ts) and any
 * future coverage tooling without dragging in a browser context.
 *
 * IMPORTANT NUANCE: this counts every beat of a given shape in
 * `chapter.beats`, including beats that live in a goto-only branch block
 * (reachable only via a specific choice option's `goto`, per the "converge
 * pattern" documented in src/data/chapters/CLAUDE.md). A single playtest pass
 * that always takes the first rendered choice option (the standard
 * `advanceUntil` auto-driver behavior) will never visit such a block, so the
 * manifest returned here is an UPPER BOUND on what one pass can exercise, not
 * a prediction of what it will exercise.
 */
import type { ChapterConfig } from '../../src/data/chapters/types';

export interface CoverageManifest {
  /** Number of `choice` beats in the chapter, including any in goto-only branch blocks. */
  choiceBeats: number;
  /** Total options across every `choice` beat (sum of `options.length`). */
  choiceOptions: number;
  /** Non-background `minigame` beats + `bossFight` beats — modes that block the beat flow until completed. */
  foregroundModes: number;
  /** `minigame` beats with `background: true` — modes launched without holding up the beat flow. */
  backgroundModes: number;
  /** `walkTo` beats. */
  walkTargets: number;
  /** `chapter.scenes?.length ?? 1` — single-map chapters implicitly have one scene. */
  scenes: number;
  /** Whether the chapter has a terminal `endChapter` beat anywhere in `beats`. */
  hasEndChapter: boolean;
}

/**
 * Derive the coverage manifest for a chapter config. See the file header for
 * the upper-bound nuance around goto-only branch blocks.
 */
export function deriveCoverageManifest(chapter: ChapterConfig): CoverageManifest {
  let choiceBeats = 0;
  let choiceOptions = 0;
  let foregroundModes = 0;
  let backgroundModes = 0;
  let walkTargets = 0;
  let hasEndChapter = false;

  for (const beat of chapter.beats) {
    switch (beat.type) {
      case 'choice':
        choiceBeats++;
        choiceOptions += beat.options.length;
        break;
      case 'walkTo':
        walkTargets++;
        break;
      case 'bossFight':
        foregroundModes++;
        break;
      case 'minigame':
        if (beat.background) backgroundModes++;
        else foregroundModes++;
        break;
      case 'endChapter':
        hasEndChapter = true;
        break;
      default:
        break;
    }
  }

  return {
    choiceBeats,
    choiceOptions,
    foregroundModes,
    backgroundModes,
    walkTargets,
    scenes: chapter.scenes?.length ?? 1,
    hasEndChapter,
  };
}
