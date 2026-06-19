import { describe, it, expect, vi } from 'vitest';
import { StewOfferingMode } from './modes/stewOffering/index';

describe('StewOfferingMode', () => {
  it('should handle npc clicks and complete the minigame', () => {
    const mode = new StewOfferingMode();
    const mockBen = { x: 100, y: 100, setInteractive: vi.fn(), on: vi.fn(), off: vi.fn(), disableInteractive: vi.fn(), setDepth: vi.fn() };
    const mockTarget = { x: 200, y: 200, setInteractive: vi.fn(), on: vi.fn(), off: vi.fn(), disableInteractive: vi.fn(), setAlpha: vi.fn() };
    
    const mockCtx: any = {
      cameras: { main: { startFollow: vi.fn(), stopFollow: vi.fn(), width: 800, height: 600, zoom: 1 } },
      add: {
        text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), destroy: vi.fn() }),
        graphics: vi.fn().mockReturnValue({ fillStyle: vi.fn(), lineStyle: vi.fn(), fillRoundedRect: vi.fn(), strokeRoundedRect: vi.fn() }),
        container: vi.fn().mockReturnValue({ setScrollFactor: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis() })
      },
      scene: {
        add: {
          graphics: vi.fn().mockReturnValue({ fillStyle: vi.fn(), lineStyle: vi.fn(), fillRoundedRect: vi.fn(), strokeRoundedRect: vi.fn() }),
          container: vi.fn().mockReturnValue({ setScrollFactor: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), setScale: vi.fn().mockReturnThis() })
        }
      },
      label: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), width: 100, height: 20, setText: vi.fn() }),
      actorSprites: {
        'ben': [mockBen],
        'girl1': [mockTarget],
        'girl2': [mockTarget],
        'girl3': [mockTarget]
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onUpdate) config.onUpdate();
          if (config.onComplete) config.onComplete();
        }),
        killTweensOf: vi.fn()
      },
      time: {
        delayedCall: vi.fn((delay, cb) => cb())
      },
      showBubbleText: vi.fn(),
      sound: { play: vi.fn() },
      physics: { scene: { input: { on: vi.fn(), off: vi.fn() } } }
    };

    let completed = false;
    mode.start(mockCtx, {}, () => { completed = true; });

    // Mock uiText directly so it doesn't fail when destroyed
    (mode as any).uiText = { destroy: vi.fn() };

    // Simulate clicking girl1
    (mode as any).handleNpcClick('girl1');
    expect((mode as any).offersCompleted).toBe(1);

    // Simulate clicking girl2
    (mode as any).handleNpcClick('girl2');
    expect((mode as any).offersCompleted).toBe(2);

    // Simulate clicking girl3
    (mode as any).handleNpcClick('girl3');
    expect(completed).toBe(true);
  });
});
