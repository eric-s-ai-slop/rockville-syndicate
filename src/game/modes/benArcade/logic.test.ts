import { describe, expect, it } from "vitest";
import {
  circuitCurrent,
  graphiteState,
  infectionRisk,
  resolveBallCollision,
} from "./logic";

describe("Ben arcade simulations", () => {
  it("transfers velocity between colliding billiard balls", () => {
    const cue = { x: 0, y: 0, vx: 100, vy: 0, radius: 10 };
    const target = { x: 19, y: 0, vx: 0, vy: 0, radius: 10 };
    resolveBallCollision(cue, target);
    expect(cue.vx).toBeCloseTo(0);
    expect(target.vx).toBeCloseTo(100);
  });

  it("makes short graphite paths brighter and hotter", () => {
    const high = graphiteState(circuitCurrent(3, 1.5), 0, 1);
    const low = graphiteState(circuitCurrent(3, 4), 0, 1);
    expect(high.brightness).toBeGreaterThan(low.brightness);
    expect(high.heat).toBeGreaterThan(low.heat);
  });

  it("reduces infection risk with distance and protection", () => {
    expect(infectionRisk(20, 1, false)).toBeGreaterThan(
      infectionRisk(80, 1, false),
    );
    expect(infectionRisk(20, 1, true)).toBe(0);
  });
});
