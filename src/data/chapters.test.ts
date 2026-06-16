import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  return {
    default: {
      Scene: class {},
      GameObjects: {
        Sprite: class {},
        Image: class {},
        Text: class {}
      }
    }
  };
});

import { CHAPTERS } from './chapters';
import { BOSSES } from './entities';
import { getMode } from '../game/modes';

describe('chapters data', () => {
  it('should have chapters defined', () => {
    expect(CHAPTERS).toBeDefined();
    expect(CHAPTERS.length).toBeGreaterThan(0);
  });

  it('chapters should have valid properties', () => {
    CHAPTERS.forEach(chapter => {
      expect(chapter).toHaveProperty('id');
      expect(chapter).toHaveProperty('title');
      expect(chapter).toHaveProperty('beats');
    });
  });

  it('all chapter beats should be valid and resolve dependencies', () => {
    CHAPTERS.forEach(chapter => {
      // 1. Gather all beat IDs inside the chapter for goto resolution
      const beatIds = new Set<string>();
      chapter.beats.forEach(beat => {
        if (beat.id) beatIds.add(beat.id);
      });

      // 2. Iterate through all beats to validate minigames, bossFights, and gotos
      chapter.beats.forEach((beat, idx) => {
        const pathContext = `Chapter ${chapter.id} [${chapter.title}] Beat index ${idx}`;

        // Assert minigames reference a registered modeId
        if (beat.type === 'minigame') {
          const mode = getMode(beat.modeId);
          expect(mode, `${pathContext} references unknown minigame modeId: "${beat.modeId}"`).toBeDefined();
        }

        // Assert bossFight beats reference a valid bossId
        if (beat.type === 'bossFight') {
          const boss = BOSSES.find(b => b.id === beat.bossId);
          expect(boss, `${pathContext} references unknown bossId: "${beat.bossId}"`).toBeDefined();
        }

        // Assert goto references resolve to a real beat id in the same chapter
        if (beat.type === 'choice') {
          beat.options.forEach((opt, optIdx) => {
            if (opt.goto) {
              expect(beatIds.has(opt.goto), `${pathContext} Choice Option ${optIdx} ("${opt.text}") has dangling goto: "${opt.goto}"`).toBe(true);
            }
          });
        }
      });
    });
  });
});
