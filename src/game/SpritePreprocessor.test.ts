import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preprocessShowcaseSheet } from './SpritePreprocessor';

describe('SpritePreprocessor', () => {
  beforeEach(() => {
    // Reset vi mocks if necessary
  });

  it('should process a mock sprite sheet correctly and extract components', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    const result = preprocessShowcaseSheet(img, 'test-character');

    expect(result).toBeDefined();
    expect(result.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(result.frameWidth).toBe(128);
    expect(result.frameHeight).toBe(128);
    expect(result.idleFrontFrames).toBeDefined();
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
  });

  it('should handle edge cases with no components found gracefully', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 10 });
    Object.defineProperty(img, 'naturalHeight', { value: 10 }); // Too small to find our mocked red pixel

    const result = preprocessShowcaseSheet(img, 'test-character');

    expect(result).toBeDefined();
    // It should have fallbacks
    expect(result.idleFrontFrames[0]).toBe(0);
  });

  it('should throw error if canvas context cannot be created', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;

    expect(() => preprocessShowcaseSheet(img, 'test-character')).toThrowError(
      'Could not get temporary canvas 2D context'
    );

    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });
});
