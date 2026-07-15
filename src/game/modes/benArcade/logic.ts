export interface VectorBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function resolveBallCollision(a: VectorBall, b: VectorBall): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minimum = a.radius + b.radius;
  if (distance <= 0 || distance >= minimum) return;
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minimum - distance;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative >= 0) return;
  a.vx += relative * nx;
  a.vy += relative * ny;
  b.vx -= relative * nx;
  b.vy -= relative * ny;
}

export function circuitCurrent(voltage: number, resistance: number): number {
  return resistance <= 0 ? 0 : voltage / resistance;
}

export function graphiteState(
  current: number,
  heat: number,
  deltaSeconds: number,
): { brightness: number; heat: number } {
  const brightness = Math.min(100, current * current * 13);
  const nextHeat = Math.max(
    0,
    heat + (current * current * 7.5 - 8) * deltaSeconds,
  );
  return { brightness, heat: Math.min(120, nextHeat) };
}

export function infectionRisk(
  distance: number,
  airflowMultiplier: number,
  protectedTarget: boolean,
): number {
  if (protectedTarget || distance >= 120) return 0;
  return Math.max(0, 1 - distance / 120) * airflowMultiplier;
}
