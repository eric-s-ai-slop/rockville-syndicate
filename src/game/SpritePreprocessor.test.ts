import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preprocessShowcaseSheet, preprocessFemalePoolSheet } from './SpritePreprocessor';

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

describe('preprocessFemalePoolSheet', () => {
  it('should process Anastasia pool sheet correctly and extract animations', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 2752 });
    Object.defineProperty(img, 'naturalHeight', { value: 1536 });

    const result = preprocessFemalePoolSheet(img, 'anastasia');

    expect(result).toBeDefined();
    expect(result.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(result.frameWidth).toBe(128);
    expect(result.frameHeight).toBe(128);
    expect(result.idleFrontFrames).toBeDefined();
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
    expect(result.walkFrames).toBeDefined();
    expect(result.submergedIdleFrames).toBeDefined();
    expect(result.submergedSwimFrames).toBeDefined();
  });

  it('should process Sophia pool sheet correctly and extract animations', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 2752 });
    Object.defineProperty(img, 'naturalHeight', { value: 1536 });

    const result = preprocessFemalePoolSheet(img, 'sophia');

    expect(result).toBeDefined();
    expect(result.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(result.frameWidth).toBe(128);
    expect(result.frameHeight).toBe(128);
    expect(result.submergedIdleFrames.length).toBeGreaterThan(0);
    expect(result.submergedSwimFrames.length).toBeGreaterThan(0);
  });

  it('should handle edge cases with no components found gracefully', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 10 });
    Object.defineProperty(img, 'naturalHeight', { value: 10 });

    const result = preprocessFemalePoolSheet(img, 'anastasia');

    expect(result).toBeDefined();
    // It should still return arrays of numbers for fallbacks
    expect(typeof result.idleFrontFrames[0]).toBe('number');
  });

  it('should throw an error if tempCanvas context cannot be created', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 2752 });
    Object.defineProperty(img, 'naturalHeight', { value: 1536 });

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null as any;

    expect(() => preprocessFemalePoolSheet(img, 'anastasia')).toThrow();

    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });
});
