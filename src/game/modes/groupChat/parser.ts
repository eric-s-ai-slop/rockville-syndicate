export type ParseResult = 'true' | 'joke' | 'neutral';

// Direct "the player is breaking the bit" phrases. Substring, case-insensitive.
// Kept lenient on purpose — the chapter's whole argument is that the player's
// own words should land, even clumsy ones.
const TRUE_KEYWORDS = [
  // it's a catfish / a fake account
  'catfish', 'cat fish', 'catfishing',
  'fake account', 'fake acct', 'fake profile', 'fake girl', 'fake person',
  'fake',
  // she isn't real / doesn't exist
  'not real', 'isnt real', "isn't real", 'aint real', "ain't real",
  'not a real', 'not a person', 'not a girl', 'not even real',
  "doesn't exist", 'doesnt exist', 'does not exist', 'dont exist', "don't exist",
  'shes not real', "she's not real", 'shes fake', "she's fake",
  'this isnt real', "this isn't real", 'this is fake', 'its fake', "it's fake",
  // it's eric / he made it up
  "it's eric", 'its eric', 'by eric', 'eric made', 'eric created', "that's eric", 'thats eric',
  'made her up', 'made up', 'made her', 'made the account', 'making it up',
  // tell him / warn him / come clean / stop the bit
  'tell him', 'tell ben', 'warn him', 'warn ben', 'come clean', 'fess up',
  'stop this', 'stop it', 'stop the bit', 'just stop', 'guys stop', 'stop lying',
];

// "Soft" true-keywords that also show up in pure banter ("so fake lmao 💀").
// When the message reads as a joke (slang/emoji present), treat these as banter.
const SOFT_TRUE = new Set(['fake', 'made up', 'made her']);

const JOKE_TOKENS = [
  'lmao', 'lmfao', 'lmaooo', 'bro', 'bruh', 'lol', 'dead', 'damn',
  'cooked', 'fr', 'ngl', 'wild', 'crazy', 'insane', 'based', 'cap', 'no cap',
];
const JOKE_EMOJI = ['💀', '😭', '❤️', '😂', '🥲', '🔥', '💯'];

// Words that signal an earnest assertion (used by the freeform fallback).
const ASSERTION_KEYWORDS = [
  'not', 'fake', 'real', 'eric', 'stop', 'dont', "don't",
  'should', 'tell', 'truth', 'wrong', 'lie', 'warn', 'honest', 'expose',
];

const JOKE_TOKENS_REGEX = new RegExp(JOKE_TOKENS.join('|'), 'i');
const JOKE_EMOJI_REGEX = new RegExp(JOKE_EMOJI.join('|'));
const ASSERTION_KEYWORDS_REGEX = new RegExp(ASSERTION_KEYWORDS.join('|'), 'i');

export function parseMessage(msg: string): ParseResult {
  const lower = msg.toLowerCase();

  const hasJokeToken = JOKE_TOKENS_REGEX.test(lower);
  const hasJokeEmoji = JOKE_EMOJI_REGEX.test(msg);
  const hasAssertion = ASSERTION_KEYWORDS_REGEX.test(lower);

  // Direct keyword hit
  for (const kw of TRUE_KEYWORDS) {
    if (lower.includes(kw)) {
      // Soft keywords inside banter ("so fake lmao 💀") are jokes, not interventions.
      if (SOFT_TRUE.has(kw) && (hasJokeToken || hasJokeEmoji)) return 'joke';
      return 'true';
    }
  }

  // Freeform fallback: a short-ish earnest message (no slang/emoji) that makes an
  // assertion. Catches clumsy real-words attempts like "this is just wrong".
  if (msg.length >= 12 && !hasJokeToken && !hasJokeEmoji && hasAssertion) {
    return 'true';
  }

  // Joke: slang or emoji with no assertion.
  if ((hasJokeToken || hasJokeEmoji) && !hasAssertion) return 'joke';

  return 'neutral';
}
