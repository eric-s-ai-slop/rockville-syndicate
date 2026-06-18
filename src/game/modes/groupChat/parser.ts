export type ParseResult = 'true' | 'joke' | 'neutral';

const TRUE_KEYWORDS = [
  'catfish', 'not real', "doesn't exist", 'doesnt exist', 'does not exist',
  'made her up', 'made up', 'made her',
  "it's eric", 'its eric', 'by eric', 'eric made',
  'shes not real', "she's not real",
  'this isnt real', "this isn't real",
  'tell him', 'not a real person', 'stop this', 'stop it',
];

const JOKE_TOKENS = [
  'lmao', 'lmfao', 'lmaooo', 'bro', 'bruh', 'lol', 'dead', 'damn',
  'cooked', 'fr', 'ngl', 'wild', 'crazy', 'insane', 'based', 'cap', 'no cap',
];
const JOKE_EMOJI = ['💀', '😭', '❤️', '😂', '🥲', '🔥', '💯'];

const ASSERTION_KEYWORDS = [
  'not', 'fake', 'real', 'eric', 'stop', 'dont', "don't",
  'should', 'tell', 'truth', 'wrong', 'lie',
];

export function parseMessage(msg: string): ParseResult {
  const lower = msg.toLowerCase();

  const hasJokeToken = JOKE_TOKENS.some(t => lower.includes(t));
  const hasJokeEmoji = JOKE_EMOJI.some(e => msg.includes(e));
  const hasAssertion = ASSERTION_KEYWORDS.some(k => lower.includes(k));

  // Direct keyword hit
  for (const kw of TRUE_KEYWORDS) {
    if (lower.includes(kw)) {
      // False-positive filter for 'fake'
      if (kw === 'fake' && (hasJokeToken || hasJokeEmoji)) return 'joke';
      return 'true';
    }
  }

  // Fallback attempt: earnest 20+ char message with no slang/emoji and an assertion keyword
  if (
    msg.length >= 20 &&
    !hasJokeToken &&
    !hasJokeEmoji &&
    hasAssertion
  ) {
    return 'true';
  }

  // Joke: slang or emoji with no assertion
  if ((hasJokeToken || hasJokeEmoji) && !hasAssertion) return 'joke';

  return 'neutral';
}
