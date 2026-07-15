export interface PanicTasks {
  mic: boolean;
  monitor: boolean;
  pi: boolean;
  headset: boolean;
  camera: boolean;
}

export function coverScore(tasks: PanicTasks): number {
  const required = [tasks.mic, tasks.monitor, tasks.pi, tasks.headset];
  return required.filter(Boolean).length * 20 + (tasks.camera ? 20 : 0);
}

export function threatRate(noise: number): number {
  return 2.1 + Math.max(0, Math.min(100, noise)) * 0.018;
}

export function waveForElapsed(elapsedSeconds: number): 1 | 2 | 3 {
  if (elapsedSeconds < 13) return 1;
  if (elapsedSeconds < 27) return 2;
  return 3;
}
