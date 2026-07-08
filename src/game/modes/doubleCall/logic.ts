// Pure logic for the doubleCall mode — no Phaser/DOM deps, unit-testable in isolation.

/**
 * Advances a typed-reply match one keypress at a time. Only the exact next
 * character of `target` (case-sensitive, lowercase canon: "why" / "omw")
 * advances the match; anything else is a no-op (the caller renders a 1px
 * shake, no state change). Never "fails" — there is no lose state.
 */
export function nextTypedState(target: string, typed: string, key: string): { typed: string; complete: boolean; advanced: boolean } {
  if (typed.length >= target.length) {
    return { typed, complete: true, advanced: false };
  }
  const nextChar = target[typed.length];
  if (key === nextChar) {
    const typedNext = typed + key;
    return { typed: typedNext, complete: typedNext.length === target.length, advanced: true };
  }
  return { typed, complete: false, advanced: false };
}

/** Scene 10's rewind counter — every button press counts, never punished, never capped. */
export function incrementPressCount(count: number): number {
  return count + 1;
}

/** Deterministic fake-digit generator for the type-along phone number fields. */
export function nextFakeDigit(index: number): string {
  const DIGITS = '3015558214';
  return DIGITS[index % DIGITS.length];
}
