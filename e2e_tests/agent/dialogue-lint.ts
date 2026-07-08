/**
 * dialogue-lint.ts (H3) — static check flagging dialogue/choice lines that
 * are long enough to visibly bloat the dialogue box. No browser needed.
 *
 * Honesty note: this is a heuristic, not a measured overflow. The dialogue
 * box (`DialogueBox.tsx`) is `max-w-3xl` (768px) with `px-5` padding (~728px
 * content width) in the monospace "Yoster" pixel font at 14px — averaging
 * ~9px/char gives a rough ~80 chars per wrapped visual line. The box has
 * `min-h-[4rem]`, not a fixed max-height, so a long line doesn't get clipped
 * or hidden — it just grows the box taller, which can look bad or push
 * choice buttons further down. The longest line already shipped in the game
 * is 377 characters (~5 wrapped lines), so the threshold here is set above
 * that on purpose: this reports candidates for a human look, it does not
 * fail a build. Run `npm run agent:lint-dialogue`.
 */
import { CHAPTERS } from '../../src/data/chapters';

const CHARS_PER_LINE = 80; // rough estimate, see file header
const LONG_LINE_THRESHOLD = 420; // ~5.25 wrapped lines — above the current shipped max (377)

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function checkLine(chapter: string, beatIndex: number, source: string, text: string): void {
  if (text.length <= LONG_LINE_THRESHOLD) return;
  emit({
    chapter,
    beatIndex,
    source,
    length: text.length,
    estimatedWrappedLines: Math.ceil(text.length / CHARS_PER_LINE),
    preview: text.length > 80 ? `${text.slice(0, 77)}...` : text,
    severity: 'info',
  });
}

function main() {
  for (const chapter of CHAPTERS) {
    (chapter.beats ?? []).forEach((beat, i) => {
      if (beat.type === 'dialogue') {
        for (const line of beat.lines) {
          checkLine(chapter.title, i, 'dialogue', line);
        }
      }
      if (beat.type === 'choice') {
        checkLine(chapter.title, i, 'choice-prompt', beat.prompt);
        for (const opt of beat.options) {
          checkLine(chapter.title, i, 'choice-option', opt.text);
          if (opt.reactionLines) {
            for (const line of opt.reactionLines) checkLine(chapter.title, i, 'choice-reaction', line);
          }
        }
      }
    });
  }
  emit({ status: 'success', message: `Scanned all chapters (threshold ${LONG_LINE_THRESHOLD} chars); see "info" lines above for candidates worth a human look.` });
}

main();
