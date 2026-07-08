/**
 * transcript.ts (G5) — static narrative dump. Walks a chapter's beat list in
 * play order and prints every dialogue line, speaker, choice, and reaction as
 * JSONL. No browser needed — chapter configs are safe data to import
 * directly (lesson 1's safe case).
 *
 * Enables prose review (typos, tone, broken speaker refs) and narrative
 * diffing between commits: `npm run agent:transcript -- <id> | git diff` on
 * the previous commit's output answers "did this refactor change any
 * player-visible text?" without touching gameplay code at all.
 *
 * Usage: npm run agent:transcript -- <chapterId|title> [--text-only]
 */
import { CHAPTERS } from '../../src/data/chapters';
import { resolveSpeaker } from '../../src/data/chapters/types';

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function main() {
  const args = process.argv.slice(2);
  const textOnly = args.includes('--text-only');
  const target = args.find((a) => a !== '--text-only');

  const chapters = target ? CHAPTERS.filter((c) => c.id === target || c.title === target) : CHAPTERS;
  if (target && chapters.length === 0) {
    emit({ ok: false, error: `No chapter matches id/title "${target}"` });
    process.exit(1);
  }

  for (const chapter of chapters) {
    if (textOnly) process.stdout.write(`\n=== ${chapter.title} ===\n`);
    else emit({ chapter: chapter.title, beatIndex: null, kind: 'chapter-start' });

    (chapter.beats ?? []).forEach((beat, i) => {
      if (beat.type === 'dialogue') {
        const speaker = resolveSpeaker(beat.speaker);
        for (const line of beat.lines) {
          if (textOnly) process.stdout.write(`${speaker.name}: ${line}\n`);
          else emit({ chapter: chapter.title, beatIndex: i, kind: 'dialogue', speaker: speaker.name, speakerId: beat.speaker, text: line });
        }
      } else if (beat.type === 'choice') {
        const speaker = resolveSpeaker(beat.speaker);
        if (textOnly) {
          process.stdout.write(`${speaker.name} (choice): ${beat.prompt}\n`);
          beat.options.forEach((opt, oi) => process.stdout.write(`  [${oi}] ${opt.text}\n`));
        } else {
          emit({ chapter: chapter.title, beatIndex: i, kind: 'choice-prompt', speaker: speaker.name, speakerId: beat.speaker, text: beat.prompt });
          beat.options.forEach((opt, oi) => {
            emit({ chapter: chapter.title, beatIndex: i, kind: 'choice-option', optionIndex: oi, text: opt.text, ledgerDelta: opt.ledgerDelta ?? null, goto: opt.goto ?? null });
            if (opt.reactionLines) {
              const reactionSpeaker = opt.reactionSpeaker ? resolveSpeaker(opt.reactionSpeaker).name : speaker.name;
              for (const line of opt.reactionLines) {
                if (textOnly) process.stdout.write(`    (reaction) ${reactionSpeaker}: ${line}\n`);
                else emit({ chapter: chapter.title, beatIndex: i, kind: 'choice-reaction', speaker: reactionSpeaker, text: line });
              }
            }
          });
        }
      } else if (beat.type === 'endChapter' && !textOnly) {
        emit({ chapter: chapter.title, beatIndex: i, kind: 'end-chapter' });
      }
    });
  }
}

main();
