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

    describe('triggers true for all assertion keywords if msg length >= 12 and no jokes', () => {
      const keywords = [
        'not', 'fake', 'real', 'eric', 'stop', 'dont', "don't",
        'should', 'tell', 'truth', 'wrong', 'lie', 'warn', 'honest', 'expose',
      ];
      keywords.forEach(kw => {
        const msg = `i think you ${kw} to listen`; // length > 12
        it(`"${msg}" triggers fallback because of "${kw}"`, () => {
          expect(parseMessage(msg)).toBe('true');
        });
      });
    });

    describe('returns neutral if assertion keyword is present but length < 12', () => {
      it('short assertion', () => expect(parseMessage('wrong man')).toBe('neutral'));
      it('short assertion 2', () => expect(parseMessage('expose him')).toBe('neutral'));
    });

    describe('returns neutral if assertion keyword is present AND joke token is present', () => {
      // It has a joke token so it isn't an earnest assertion,
      // and it has an assertion token so it isn't a pure joke.
      // E.g., not matching TRUE_KEYWORDS
      it('assertion with joke token', () => expect(parseMessage('this is wrong lmao')).toBe('neutral'));
      it('assertion with joke emoji', () => expect(parseMessage('expose him 💀')).toBe('neutral'));
    });
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

  describe('edge cases based on tokens, emojis, and length', () => {
    it('soft true-keyword with only emoji is a joke', () => {
      expect(parseMessage('made up 💀')).toBe('joke');
      expect(parseMessage('fake 😭')).toBe('joke');
    });

    it('hard true-keyword with emoji survives as true', () => {
      expect(parseMessage("it's a catfish 💀")).toBe('true');
      expect(parseMessage('tell him 😂')).toBe('true');
    });

    it('assertion with joke tokens or emojis falls through to neutral', () => {
      // hasJokeToken = true, hasAssertion = true
      expect(parseMessage('you should tell the truth lmao')).toBe('neutral');
      // hasJokeEmoji = true, hasAssertion = true
      expect(parseMessage('you should tell the truth 💀')).toBe('neutral');
    });

    it('short assertions bypass freeform fallback and fall through to neutral', () => {
      // length < 12, hasJokeToken = false, hasJokeEmoji = false, hasAssertion = true
      expect(parseMessage('stop')).toBe('neutral');
      expect(parseMessage('lie')).toBe('neutral');
      expect(parseMessage('wrong')).toBe('neutral');
    });
  });
});
