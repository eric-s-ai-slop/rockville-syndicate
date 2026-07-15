/** Create the smallest valid unregistered chapter config. */
import fs from 'node:fs';
import path from 'node:path';
import { createChapterScaffold } from './chapter-scaffold';
import { CHAPTERS } from '../../src/data/chapters';

const emit = (value: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(value)}\n`);

function main(): void {
  const index = Number(process.argv[2]);
  const slug = process.argv[3];
  if (!slug) {
    emit({ ok: false, error: 'Usage: npm run agent:scaffold-chapter -- <index> <kebab-case-slug>' });
    process.exit(1);
  }

  try {
    const scaffold = createChapterScaffold(index, slug, CHAPTERS.map(chapter => chapter.id));
    const target = path.resolve('src/data/chapters', scaffold.fileName);
    if (fs.existsSync(target)) throw new Error(`${path.relative(process.cwd(), target)} already exists`);
    fs.writeFileSync(target, scaffold.source);
    emit({
      ok: true,
      created: path.relative(process.cwd(), target),
      chapterId: scaffold.chapterId,
      exportName: scaffold.exportName,
      intentionallyUnregistered: true,
      nextSteps: [
        'Replace TODO content and configure map, actors, beats, and assets.',
        'Add the chapter music mapping or an intentional-silence justification.',
        `Import ${scaffold.exportName} in src/data/chapters/index.ts and append it to CHAPTERS when it is ready to validate.`,
        'Add the finished chapter title to the README chapter table.',
        `Run: npm run agent:validate-chapter -- ${scaffold.chapterId}`,
        `Run: npm run agent:check -- src/data/chapters/${scaffold.fileName}`,
      ],
    });
  } catch (error) {
    emit({ ok: false, error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

main();
