import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Mock localStorage globally for testing environment (Node v26 compat)
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value.toString(); },
  clear: () => { for (const k in store) delete store[k]; },
  removeItem: (key: string) => { delete store[key]; },
  length: 0,
  key: (index: number) => null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock phaser to prevent loading phaser3spectorjs
import { vi } from 'vitest';
vi.mock('phaser', () => {
    return {
        default: {},
        Game: class {},
        Scene: class {},
    };
});

// Improved Mock Canvas 2D Context for jsdom
HTMLCanvasElement.prototype.getContext = function (contextId: string, options?: any): any {
  if (contextId === '2d') {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: (x: number, y: number, w: number, h: number) => {
        // Return dummy image data with fully transparent background
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 0;     // R
          data[i + 1] = 0; // G
          data[i + 2] = 0; // B
          data[i + 3] = 0; // A
        }

        // Add a mock non-background pixel so BFS finds a component
        if (w > 20 && h > 20) {
          const mockPixelIdx = ((15 * w) + 15) * 4;
          if (mockPixelIdx < data.length) {
            data[mockPixelIdx] = 255;
            data[mockPixelIdx+1] = 0;
            data[mockPixelIdx+2] = 0;
            data[mockPixelIdx+3] = 255;
          }
        }

        return {
          data,
          width: w,
          height: h,
        };
      },
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => {
        return { width: 0 };
      },
      transform: () => {},
      rect: () => {},
      clip: () => {},
      imageSmoothingEnabled: false,
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
};
