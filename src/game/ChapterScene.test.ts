import { describe, it, expect, vi } from 'vitest';

// First, mock Phase completely
vi.mock('phaser', () => {
  class MockScene {
    sys: any;
    load: any;
    constructor() {
      this.sys = {
        game: { events: { emit: vi.fn(), on: vi.fn() } },
        events: { once: vi.fn(), on: vi.fn() },
        settings: { map: {} }
      };
      this.load = {
        audio: vi.fn()
      };
    }
  }

  return {
    default: {
      Scene: MockScene,
      Math: { Vector2: class {} },
      GameObjects: { Text: class {} },
      Input: { Keyboard: { KeyCodes: {} } }
    }
  };
});

// Import ChapterScene using dynamic import inside the test block
describe('ChapterScene Audio Error Handling', () => {
  it('safeLoadAudio catches errors thrown by Phaser load.audio', async () => {
    // Dynamic import to ensure the mock is applied first
    const module = await import('./ChapterScene');
    const ChapterScene = module.default;

    // Instantiate it - using "any" to bypass the missing Phaser things for tests
    const scene = new ChapterScene({} as any);

    // Replace the load.audio with a function that throws
    const mockThrow = vi.fn().mockImplementation(() => {
      throw new Error('File not found');
    });

    scene.load.audio = mockThrow;

    // Call the private method via casting
    expect(() => {
      (scene as any).safeLoadAudio('test-key', 'test-url.mp3');
    }).not.toThrow();

    // Make sure our mock was actually called
    expect(mockThrow).toHaveBeenCalledWith('test-key', 'test-url.mp3');
  });
});
