export function coughInterval(elapsedMs: number, durationMs: number): number {
  const progress = durationMs <= 0 ? 1 : Math.max(0, Math.min(1, elapsedMs / durationMs));
  return Math.max(620, 1750 - progress * 1050);
}

export function normalizedDirection(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
