import { describe, it, expect } from 'vitest';
import { resolveSpeaker } from './chapters';

describe('resolveSpeaker', () => {
  it('should resolve a hero ID from CHARACTER_CLASSES', () => {
    const speaker = resolveSpeaker('eric');
    expect(speaker).toEqual({
      id: 'eric',
      name: 'Eric Huang',
      emoji: '📊',
      color: '#818cf8'
    });
  });

  it('should resolve an NPC ID from NPC_CHARACTERS', () => {
    const speaker = resolveSpeaker('jordan');
    expect(speaker).toEqual({
      id: 'jordan',
      name: 'Jordan',
      emoji: '🕶️',
      color: '#f97316'
    });
  });

  it('should resolve an extra speaker ID from EXTRA_SPEAKERS', () => {
    const speaker = resolveSpeaker('narrator');
    expect(speaker).toEqual({
      id: 'narrator',
      name: 'The Group Chat',
      emoji: '💬',
      color: '#c8e89a'
    });
  });

  it('should fallback to a default speaker object for a missing ID', () => {
    const speaker = resolveSpeaker('unknown_id');
    expect(speaker).toEqual({
      id: 'unknown_id',
      name: 'unknown_id',
      emoji: '🗨️',
      color: '#c8e89a'
    });
  });
});
