// Lightweight, class-based Finite State Machine for enemy/boss AI.
// Replaces nested if/else or switch chains tracking "is attacking" / "is stunned"
// booleans scattered across a mode's update() loop with named states, e.g.
// IDLE | CHASE | ATTACK_MELEE | STUNNED. Framework-agnostic (no Phaser import) —
// works for a per-enemy FSM (swarmSurvival) or a single boss-level FSM (bossFight).
export interface FSMState<S extends string> {
  /** Runs once when this state becomes current. */
  enter?: () => void;
  /** Runs every tick while this state is current (forward your mode's time/delta). */
  update?: (time: number, delta: number) => void;
  /** Runs once when leaving this state. */
  exit?: () => void;
}

export class FSM<S extends string> {
  private current: S;
  private states: Record<S, FSMState<S>>;

  constructor(initial: S, states: Record<S, FSMState<S>>) {
    this.states = states;
    this.current = initial;
    this.states[initial]?.enter?.();
  }

  get state(): S { return this.current; }
  is(s: S): boolean { return this.current === s; }

  transition(next: S): void {
    if (next === this.current) return;
    this.states[this.current]?.exit?.();
    this.current = next;
    this.states[next]?.enter?.();
  }

  update(time: number, delta: number): void {
    this.states[this.current]?.update?.(time, delta);
  }
}
