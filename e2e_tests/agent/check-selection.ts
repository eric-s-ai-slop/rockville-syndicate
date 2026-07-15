import path from 'node:path';

export interface CheckSelection {
  fullSuite: boolean;
  testFiles: string[];
  reasons: string[];
}

const normalize = (file: string) => file.split(path.sep).join('/').replace(/^\.\//, '');

const isExecutableOrBuildInput = (file: string): boolean => {
  if (file.startsWith('public/')) return true;
  if (file.startsWith('.github/')) return true;
  if (/^(server\.ts|index\.html|Dockerfile|Makefile)$/.test(file)) return true;
  return /\.(?:[cm]?[jt]sx?|json|ya?ml|css|scss|html|svg|sh)$/.test(file);
};

/** Select the smallest safe Vitest set for a group of changed files. */
export function selectTests(changedFiles: string[], availableTests: string[]): CheckSelection {
  const available = availableTests.map(normalize);
  const selected = new Set<string>();
  const reasons = new Set<string>();
  let fullSuite = false;

  const add = (...files: string[]) => {
    for (const file of files) {
      const normalized = normalize(file);
      if (available.includes(normalized)) selected.add(normalized);
    }
  };

  for (const rawFile of changedFiles) {
    const file = normalize(rawFile);
    let matched = false;

    if (/^(package-lock\.json|package\.json|tsconfig\.json|vite\.config\.ts|vitest\.config\.ts|vitest\.setup\.ts|eslint\.config\.js)$/.test(file)) {
      fullSuite = true;
      reasons.add(`${file} affects the whole toolchain`);
      continue;
    }

    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      add(file);
      matched = true;
    }

    if (!/\.test\.tsx?$/.test(file) && /\.tsx?$/.test(file)) {
      const base = file.replace(/\.tsx?$/, '');
      const companionTests = [`${base}.test.ts`, `${base}.test.tsx`].filter(test => available.includes(test));
      if (companionTests.length) {
        add(...companionTests);
        matched = true;
      }
    }

    if (file === 'e2e_tests/agent/context-map.json' || file.endsWith('context-map.ts') || file.endsWith('context-map-data.ts')) {
      add('src/agentContextMap.test.ts');
      matched = true;
    }

    if (file.startsWith('src/data/chapters/')) {
      add('src/data/chapters.test.ts', 'src/data/chapters/chaptersDoc.test.ts', 'src/data/chapters/types.test.ts', 'src/data/chapters/mapValidation.test.ts');
      matched = true;
    }

    if (file.startsWith('src/data/entities/')) {
      add('src/data/chapters.test.ts', 'src/game/modes/bossFight/bossFight.test.ts', 'src/game/scoring.test.ts');
      matched = true;
    }

    if (file === 'src/game/settings.ts' || file === 'src/game/progress.ts') {
      add('src/game/settings.test.ts', 'src/game/progress.test.ts', 'src/components/GameLayout.test.tsx');
      matched = true;
    }

    if (file === 'src/game/audio.ts' || file === 'src/game/scene/AudioController.ts') {
      add('src/game/audio.test.ts', 'src/game/scene/AudioController.test.ts', 'src/data/chapters.test.ts');
      matched = true;
    }

    if (file === 'src/game/scoring.ts') {
      add('src/game/scoring.test.ts', 'src/game/settings.test.ts');
      matched = true;
    }

    if (/^src\/game\/(SpritePreprocessor|PropExtractor|packSpriteAtlas)\./.test(file) || file === 'src/game/scene/SpriteLoader.ts') {
      add('src/game/SpritePreprocessor.test.ts', 'src/game/PropExtractor.test.ts', 'src/game/packSpriteAtlas.test.ts');
      matched = true;
    }

    if (file.startsWith('src/game/assets/chapter/')) {
      add('src/game/assets/chapter/chapterAssets.test.ts', 'src/game/packSpriteAtlas.test.ts');
      matched = true;
    }

    if (file === 'src/game/scene/contracts.ts') {
      add('src/game/scene/contracts.test.ts');
      matched = true;
    }

    if (file === 'src/contracts/mode-configs.ts') {
      add(
        'src/game/modes/conformance.test.ts',
        'src/game/modes/index.test.ts',
        'src/data/chapters.test.ts',
        'src/data/chapters/types.test.ts',
      );
      matched = true;
    }

    if (file === 'src/game/contracts/story.ts') {
      add('src/components/game/useStoryDialogue.test.ts', 'src/components/GameLayout.test.tsx');
      matched = true;
    }

    if (file === 'src/game/scene/ChaseController.ts') {
      add('src/game/scene/ChaseController.test.ts', 'src/game/scene/BeatEngine.test.ts');
      matched = true;
    }

    if (file === 'src/game/scene/BeatEngine.ts') {
      add('src/game/scene/BeatEngine.test.ts', 'src/data/chapters.test.ts');
      matched = true;
    }

    if (file === 'src/game/ChapterScene.ts') {
      fullSuite = true;
      reasons.add('ChapterScene is a cross-cutting runtime entrypoint');
      matched = true;
    }

    const modeMatch = file.match(/^src\/game\/modes\/([^/]+)\//);
    if (modeMatch) {
      const localTests = available.filter((test) => test.startsWith(`src/game/modes/${modeMatch[1]}/`));
      add(...localTests, 'src/game/modes/index.test.ts', 'src/game/modes/modesDoc.test.ts');
      if (localTests.length === 0) {
        fullSuite = true;
        reasons.add(`mode ${modeMatch[1]} has no local unit test`);
      }
      matched = true;
    }

    if (file.startsWith('src/components/')) {
      const base = file.replace(/\.tsx?$/, '');
      add(`${base}.test.ts`, `${base}.test.tsx`, 'src/components/GameLayout.test.tsx');
      matched = true;
    }

    if (file.startsWith('e2e_tests/agent/')) {
      add(...available.filter((test) => test.startsWith('e2e_tests/agent/') && test.endsWith('.test.ts')));
      matched = true;
    }

    if (!matched && (file.startsWith('src/') || file.startsWith('e2e_tests/') || isExecutableOrBuildInput(file))) {
      fullSuite = true;
      reasons.add(`${file} has no focused verification rule`);
    }
  }

  return {
    fullSuite,
    testFiles: fullSuite ? available : [...selected].sort(),
    reasons: [...reasons],
  };
}
