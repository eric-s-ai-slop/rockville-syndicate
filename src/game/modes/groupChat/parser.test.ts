import { describe, it, expect } from 'vitest';
import { parseMessage } from './parser';

describe('parseMessage', () => {
  describe('recognizes earnest interventions as "true"', () => {
    const trueCases = [
      "it's a catfish",
      'this is a catfish',
      'catfishing him',
      "she's not real",
      'shes not real',
      "she doesn't exist",
      'that account is fake',
      'fake account',
      "it's fake",
      "that's eric",
      'thats eric',
      'eric made her up',
      'eric created the account',
      'you need to tell him',
      'tell ben',
      'someone should warn him',
      'guys stop this',
      'stop lying to him',
      'come clean',
    ];
    trueCases.forEach(msg => it(`"${msg}"`, () => expect(parseMessage(msg)).toBe('true')));
  });

  describe('short earnest phrasings that used to fall through to neutral', () => {
    ["that's eric", 'tell ben', "she's fake", "it's fake", 'fake account'].forEach(msg =>
      it(`"${msg}"`, () => expect(parseMessage(msg)).toBe('true')));
  });

  describe('freeform earnest fallback (real words, no slang)', () => {
    it('honest plea', () => expect(parseMessage('you should be honest with him')).toBe('true'));
    it('this is just wrong', () => expect(parseMessage('this is just wrong')).toBe('true'));
  });

  describe('downgrades banter that merely contains a soft keyword', () => {
    ['lmao this is so fake 💀', 'so fake bro', 'thats fake lol'].forEach(msg =>
      it(`"${msg}"`, () => expect(parseMessage(msg)).toBe('joke')));
  });

  describe('classifies playing-along banter as "joke"', () => {
    ['lmaooo ben is cooked', 'bro is hooked', 'this is wild', '💀', '😭😭😭', 'dead 💀'].forEach(msg =>
      it(`"${msg}"`, () => expect(parseMessage(msg)).toBe('joke')));
  });

  describe('treats off-topic chatter as "neutral"', () => {
    ['what', 'huh?', 'ok', 'wait', 'idk', 'who is this'].forEach(msg =>
      it(`"${msg}"`, () => expect(parseMessage(msg)).toBe('neutral')));
  });

  it('a hard keyword survives banter tokens ("it\'s a catfish lmao")', () => {
    expect(parseMessage("it's a catfish lmao")).toBe('true');
  });
});
