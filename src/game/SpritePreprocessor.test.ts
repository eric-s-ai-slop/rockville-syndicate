import { describe, it, expect } from 'vitest';
import { preprocessShowcaseSheet } from './SpritePreprocessor';

describe('SpritePreprocessor', () => {
    it('preprocessShowcaseSheet should be exported', () => {
        expect(preprocessShowcaseSheet).toBeDefined();
        expect(typeof preprocessShowcaseSheet).toBe('function');
    });
});
