export type BenMemoryScenario = 'roofPlanner' | 'rustPanic' | 'poolShot' | 'electrical';

export const ROOF_REQUIRED = ['Pressure cooker', 'M4', '11 hostages'] as const;
export const RUST_ESCAPE = ['Mute microphone', 'Shut off monitor', 'Throw headset', 'Dive into bed'] as const;
export const ELECTRICAL_SEQUENCE = ['Car battery', 'Battery terminals', 'Pencil lead', 'Graphite'] as const;

export function exactSelection(selected: Iterable<string>, required: readonly string[]): boolean {
  const picked = new Set(selected);
  return picked.size === required.length && required.every((item) => picked.has(item));
}

export function nextSequenceStep(sequence: readonly string[], completed: number, choice: string): {
  completed: number;
  correct: boolean;
  done: boolean;
} {
  const correct = sequence[completed] === choice;
  const next = correct ? completed + 1 : Math.max(0, completed - 1);
  return { completed: next, correct, done: next === sequence.length };
}

export type PoolMissTier = 'tragic' | 'spectacular' | 'historic';

/** Every shot misses; accuracy only decides how entertaining the miss becomes. */
export function poolMissTier(marker: number, target = 0.5): PoolMissTier {
  const distance = Math.abs(marker - target);
  if (distance <= 0.08) return 'tragic';
  if (distance <= 0.28) return 'spectacular';
  return 'historic';
}

export function clampMeter(value: number): number {
  return Math.max(0, Math.min(100, value));
}
