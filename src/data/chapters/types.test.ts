import { describe, it, expect } from 'vitest';
import { resolveSpeaker } from './types';
import { CHARACTER_CLASSES, NPC_CHARACTERS } from '../entities';

describe('resolveSpeaker', () => {
  it('should resolve a hero character', () => {
    const hero = CHARACTER_CLASSES[0];
    const result = resolveSpeaker(hero.id);
    expect(result).toEqual({
      id: hero.id,
      name: hero.name,
      emoji: hero.emoji,
      color: hero.color
    });
  });

  it('should resolve an NPC character', () => {
    const npc = NPC_CHARACTERS[0];
    const result = resolveSpeaker(npc.id);
    expect(result).toEqual({
      id: npc.id,
      name: npc.name,
      emoji: npc.emoji,
      color: npc.color
    });
  });

  it('should resolve an extra speaker', () => {
    const result = resolveSpeaker('narrator');
    expect(result).toEqual({
      id: 'narrator',
      name: 'The Group Chat',
      emoji: '💬',
      color: '#c8e89a'
    });
  });

  it('should fallback to default for an unknown ID', () => {
    const result = resolveSpeaker('unknown_character_123');
    expect(result).toEqual({
      id: 'unknown_character_123',
      name: 'unknown_character_123',
      emoji: '🗨️',
      color: '#c8e89a'
    });
  });
});
