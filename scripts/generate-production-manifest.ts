import fs from 'node:fs';
import path from 'node:path';
import { PRODUCTION_CHAPTER_MANIFEST } from '../src/data/chapters';

const output = path.resolve('dist/production-chapters.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify({ schema: 'omega-production-chapters-v1', chapters: PRODUCTION_CHAPTER_MANIFEST }, null, 2)}\n`);
console.warn(`Wrote ${PRODUCTION_CHAPTER_MANIFEST.length} production chapters to ${output}`);
