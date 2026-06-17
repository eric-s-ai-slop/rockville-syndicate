/**
 * Voice line extractor.
 *
 * Walks every chapter's beats, pulls each spoken line for a voiced speaker
 * (see voices.json), and writes lines.json — the work list for generate.py.
 *
 * The clip key is sha1(`${speaker}|${text}`).slice(0,12). The same formula is
 * used by generate.py (to name the MP3) and by the runtime loader (to find it),
 * so all three agree with zero shared state.
 *
 * Run:  npx tsx scripts/voicegen/extract-lines.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CHAPTERS } from '../../src/data/chapters/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

export function voiceKey(speaker: string, text: string): string {
  return createHash('sha1').update(`${speaker}|${text}`).digest('hex').slice(0, 12);
}

const voices: Record<string, string> = JSON.parse(
  readFileSync(join(here, 'voices.json'), 'utf8')
);
const voiced = new Set(Object.keys(voices).filter(k => !k.startsWith('_')));

interface Line { key: string; speaker: string; text: string; chapter: string; }

const seen = new Set<string>();
const lines: Line[] = [];

for (const chapter of CHAPTERS) {
  for (const beat of chapter.beats) {
    // v1 voices `dialogue` beats. To also voice choice reactions, add a branch
    // here for beat.type === 'choice' iterating opt.reactionSpeaker/reactionLines.
    if (beat.type !== 'dialogue') continue;
    if (!voiced.has(beat.speaker)) continue;
    for (const text of beat.lines) {
      const key = voiceKey(beat.speaker, text);
      if (seen.has(key)) continue;        // dedupe identical (speaker,line) reuse
      seen.add(key);
      lines.push({ key, speaker: beat.speaker, text, chapter: chapter.id });
    }
  }
}

writeFileSync(join(here, 'lines.json'), JSON.stringify(lines, null, 2));
console.log(`Extracted ${lines.length} voiced lines from ${CHAPTERS.length} chapters.`);
console.log(`Speakers: ${[...voiced].join(', ')}`);
console.log('Wrote scripts/voicegen/lines.json — now run generate.py');
