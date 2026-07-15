import { describe, expect, it } from 'vitest';
import { selectTests } from './check-selection';

const tests = [
  'src/agentContextMap.test.ts',
  'src/components/GameLayout.test.tsx',
  'src/components/game/useStoryDialogue.test.ts',
  'src/data/chapters.test.ts',
  'src/data/chapters/chaptersDoc.test.ts',
  'src/data/chapters/types.test.ts',
  'src/game/audio.test.ts',
  'src/game/assets/chapter/chapterAssets.test.ts',
  'src/game/packSpriteAtlas.test.ts',
  'src/game/scene/ChaseController.test.ts',
  'src/game/scene/contracts.test.ts',
  'src/components/game/useQte.test.ts',
  'src/game/modes/groupChat/parser.test.ts',
  'src/game/modes/groupChat/timeline.test.ts',
  'src/game/modes/index.test.ts',
  'src/game/modes/conformance.test.ts',
  'src/game/modes/lifecycle.test.ts',
  'src/game/modes/modesDoc.test.ts',
  'src/game/settings.test.ts',
];

describe('selectTests', () => {
  it('selects chapter tests for a chapter config', () => {
    const result = selectTests(['src/data/chapters/chapter13.example.ts'], tests);
    expect(result.fullSuite).toBe(false);
    expect(result.testFiles).toContain('src/data/chapters.test.ts');
    expect(result.testFiles).toContain('src/data/chapters/chaptersDoc.test.ts');
  });

  it('selects local and registry tests for a mode', () => {
    const result = selectTests(['src/game/modes/groupChat/index.ts'], tests);
    expect(result.fullSuite).toBe(false);
    expect(result.testFiles).toEqual(expect.arrayContaining([
      'src/game/modes/groupChat/parser.test.ts',
      'src/game/modes/groupChat/timeline.test.ts',
      'src/game/modes/index.test.ts',
    ]));
  });

  it('falls back to the full suite for cross-cutting or unknown source files', () => {
    expect(selectTests(['src/game/ChapterScene.ts'], tests).fullSuite).toBe(true);
    expect(selectTests(['src/game/new-system.ts'], tests).fullSuite).toBe(true);
  });

  it('routes context-map edits to the drift guard', () => {
    const result = selectTests(['e2e_tests/agent/context-map.json'], tests);
    expect(result.testFiles).toEqual(expect.arrayContaining(['src/agentContextMap.test.ts']));
  });

  it('selects focused tests for extracted hooks and scene modules', () => {
    expect(selectTests(['src/components/game/useQte.ts'], tests).testFiles).toContain('src/components/game/useQte.test.ts');
    expect(selectTests(['src/game/assets/chapter/origins.ts'], tests).testFiles).toContain('src/game/assets/chapter/chapterAssets.test.ts');
    expect(selectTests(['src/game/scene/contracts.ts'], tests).testFiles).toContain('src/game/scene/contracts.test.ts');
    expect(selectTests(['src/game/scene/ChaseController.ts'], tests).testFiles).toContain('src/game/scene/ChaseController.test.ts');
  });

  it('keeps shared contract edits focused without losing their cross-layer guards', () => {
    const modes = selectTests(['src/contracts/mode-configs.ts'], tests);
    expect(modes.fullSuite).toBe(false);
    expect(modes.testFiles).toEqual(expect.arrayContaining([
      'src/game/modes/conformance.test.ts',
      'src/game/modes/index.test.ts',
      'src/data/chapters.test.ts',
    ]));

    const story = selectTests(['src/game/contracts/story.ts'], tests);
    expect(story.fullSuite).toBe(false);
    expect(story.testFiles).toEqual(expect.arrayContaining([
      'src/components/game/useStoryDialogue.test.ts',
      'src/components/GameLayout.test.tsx',
    ]));
  });

  it('uses an adjacent unit test for a focused source edit', () => {
    const result = selectTests(['src/game/modes/lifecycle.ts'], tests);
    expect(result.fullSuite).toBe(false);
    expect(result.testFiles).toContain('src/game/modes/lifecycle.test.ts');
  });
});
