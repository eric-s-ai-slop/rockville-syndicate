import { describe, expect, it, vi } from 'vitest';

const { justDown } = vi.hoisted(() => ({ justDown: vi.fn(() => false) }));

vi.mock('phaser', () => ({
  default: {
    Input: { Keyboard: { KeyCodes: { SPACE: 32 }, JustDown: justDown } },
  },
}));

import { TemplateMode } from './index';

describe('TemplateMode lifecycle', () => {
  it('resolves once and cancels a pending completion during teardown', () => {
    const onComplete = vi.fn();
    const completionEvent = { destroy: vi.fn() };
    const ctx = {
      cameras: { main: { width: 920, height: 660, zoom: 2 } },
      label: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        setScrollFactor: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setText: vi.fn().mockReturnThis(),
        setColor: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
      physics: { scene: { input: { keyboard: { addKey: vi.fn(() => ({ reset: vi.fn() })) } } } },
      time: {
        addEvent: vi.fn(() => ({ destroy: vi.fn() })),
        delayedCall: vi.fn((_delay: number, _callback: () => void) => {
          return completionEvent;
        }),
      },
    } as any;

    const mode = new TemplateMode();
    mode.start(ctx, {}, onComplete);
    justDown.mockReturnValue(true);
    mode.update(0, 16);
    mode.update(16, 16);

    expect(ctx.time.delayedCall).toHaveBeenCalledOnce();
    mode.teardown();
    expect(completionEvent.destroy).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
