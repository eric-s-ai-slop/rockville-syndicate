export type OutbreakStage = 1 | 2 | 3;

export function stageForElapsed(elapsedSeconds: number): OutbreakStage {
  if (elapsedSeconds < 16) return 1;
  if (elapsedSeconds < 36) return 2;
  return 3;
}

export function exposurePerSecond(contamination: number, washed: boolean): number {
  const clean = Math.max(0, Math.min(100, contamination));
  return clean * 0.022 * (washed ? 0.45 : 1);
}

export function ventRoom(contamination: number): number {
  return Math.max(0, contamination - 52);
}
