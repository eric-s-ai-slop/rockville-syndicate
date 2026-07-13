export interface ChapterScaffold {
  fileName: string;
  exportName: string;
  chapterId: string;
  source: string;
}

const titleCase = (slug: string) => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export function createChapterScaffold(index: number, slug: string): ChapterScaffold {
  if (!Number.isInteger(index) || index < 0) throw new Error('chapter index must be a non-negative integer');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('slug must be lowercase kebab-case');

  const pascalSlug = slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  const exportName = `chapter${index}${pascalSlug}`;
  const chapterId = slug.replace(/-/g, '_');
  const title = titleCase(slug);
  const fileName = `chapter${index}.${slug}.ts`;

  return {
    fileName,
    exportName,
    chapterId,
    source: `import type { ChapterConfig } from './types';

const ${exportName}: ChapterConfig = {
  id: '${chapterId}',
  index: ${index},
  title: '${title}',
  subtitle: 'TODO: chapter subtitle',
  location: 'TODO: location',
  description: 'TODO: chapter-select description',
  kind: 'chapter',
  map: {
    width: 920,
    height: 660,
    backdrop: 0x16331a,
    theme: 'apartment',
    areaTitle: 'TODO: area title',
    rects: [],
    labels: [],
    playerSpawn: { x: 460, y: 560 },
  },
  actors: [],
  beats: [
    { type: 'dialogue', speaker: 'narrator', lines: ['TODO: opening line'] },
    { type: 'endChapter' },
  ],
};

export default ${exportName};
`,
  };
}
