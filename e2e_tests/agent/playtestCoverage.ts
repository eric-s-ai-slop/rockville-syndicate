import type { CheckpointModeKind } from './visualCheckpoint';

export type InputCategory = 'keyboard' | 'pointer' | 'drag';
export type ModeEnding = 'active' | 'natural' | 'bypassed' | 'replaced';

export interface ModeInputSummary {
  count: number;
  keyboard: number;
  pointer: number;
  drag: number;
}

export interface ModeAttemptSummary {
  id: string;
  beatIndex: number | null;
  kind: Exclude<CheckpointModeKind, null>;
  inputs: ModeInputSummary;
  ending: ModeEnding;
}

export interface ChoiceCoverage {
  sceneIndex: number | null;
  beatIndex: number;
  optionIndex: number;
  optionText: string;
}

export interface WalkCoverage {
  sceneIndex: number | null;
  beatIndex: number | null;
  attempts: number;
  successes: number;
  failures: number;
}

export interface PlaytestCoverageSummary {
  scenes: {
    checkpointed: number[];
    reviewed: number[];
  };
  choices: ChoiceCoverage[];
  walks: WalkCoverage[];
  modes: ModeAttemptSummary[];
  terminalObserved: boolean;
  passive: {
    captured: string[];
    missed: string[];
  };
}

export interface CoverageTransition {
  reason: string;
  modeKind: CheckpointModeKind;
  modeId: string | null;
  modeBeatIndex: number | null;
  identity?: { sceneIndex: number | null };
}

const KEYBOARD_COMMANDS = new Set(['hold', 'press', 'tap', 'key']);
const POINTER_COMMANDS = new Set(['mousedown', 'mousemove', 'mouseup', 'click', 'clickworld']);

function inputCategory(command: string): InputCategory | null {
  if (command === 'drag') return 'drag';
  if (KEYBOARD_COMMANDS.has(command)) return 'keyboard';
  if (POINTER_COMMANDS.has(command)) return 'pointer';
  return null;
}

function freshInputs(): ModeInputSummary {
  return { count: 0, keyboard: 0, pointer: 0, drag: 0 };
}

function freshSummary(): PlaytestCoverageSummary {
  return {
    scenes: { checkpointed: [], reviewed: [] },
    choices: [],
    walks: [],
    modes: [],
    terminalObserved: false,
    passive: { captured: [], missed: [] },
  };
}

function addUnique(values: number[], value: number): void;
function addUnique(values: string[], value: string): void;
function addUnique(values: number[] | string[], value: number | string): void {
  if (typeof value === 'number') {
    const numericValues = values as number[];
    if (!numericValues.includes(value)) numericValues.push(value);
  } else {
    const stringValues = values as string[];
    if (!stringValues.includes(value)) stringValues.push(value);
  }
}

function addModeInput(mode: ModeAttemptSummary, category: InputCategory): void {
  mode.inputs.count++;
  mode.inputs[category]++;
}

/**
 * Compact runtime facts for one playtest. This records actions and lifecycle
 * observations only; it never infers whether a mechanic was understood or
 * applies a universal input-count or duration threshold.
 */
export class PlaytestCoverageTracker {
  private readonly data = freshSummary();
  private readonly checkpointScenes = new Map<number, number | null>();
  private readonly activeModes = new Map<Exclude<CheckpointModeKind, null>, ModeAttemptSummary>();

  recordCheckpoint(
    checkpointId: number,
    sceneIndex: number | null,
    transitions: readonly CoverageTransition[],
  ): void {
    this.checkpointScenes.set(checkpointId, sceneIndex);
    if (sceneIndex !== null) addUnique(this.data.scenes.checkpointed, sceneIndex);

    for (const transition of transitions) {
      const transitionScene = transition.identity?.sceneIndex ?? sceneIndex;
      if (transitionScene !== null) addUnique(this.data.scenes.checkpointed, transitionScene);
      if (transition.modeKind === null || !transition.modeId) continue;

      if (transition.reason.includes(' replaced by ')) {
        this.endMode(transition.modeKind, 'replaced');
        this.startMode(transition.modeKind, transition.modeId, transition.modeBeatIndex);
      } else if (transition.reason.endsWith(' started')) {
        this.startMode(transition.modeKind, transition.modeId, transition.modeBeatIndex);
      } else if (transition.reason.endsWith(' ended')) {
        this.endMode(transition.modeKind, 'natural', transition.modeId, transition.modeBeatIndex);
      }
    }
  }

  recordCheckpointReview(checkpointId: number): void {
    const sceneIndex = this.checkpointScenes.get(checkpointId);
    if (sceneIndex !== undefined && sceneIndex !== null) addUnique(this.data.scenes.reviewed, sceneIndex);
  }

  observeMode(
    kind: Exclude<CheckpointModeKind, null>,
    id: string | null,
    beatIndex: number | null,
  ): void {
    if (id) this.startMode(kind, id, beatIndex);
  }

  recordInput(command: string): void {
    const category = inputCategory(command);
    if (!category) return;
    // A foreground mode owns input whenever both kinds coexist. Background
    // input is still recorded when it is the only active mode, but this fact
    // never changes the foreground bypass gate.
    const mode = this.activeModes.get('foreground') ?? this.activeModes.get('background');
    if (mode) addModeInput(mode, category);
  }

  recordBypass(command: string): void {
    if (command !== 'winmode' && command !== 'losemode') return;
    const mode = this.activeModes.get('foreground') ?? this.activeModes.get('background');
    if (mode && mode.ending === 'active') mode.ending = 'bypassed';
  }

  recordChoice(sceneIndex: number | null, beatIndex: number, optionIndex: number, optionText: string): void {
    const key = `${sceneIndex}:${beatIndex}:${optionIndex}:${optionText}`;
    if (!this.data.choices.some((choice) => `${choice.sceneIndex}:${choice.beatIndex}:${choice.optionIndex}:${choice.optionText}` === key)) {
      this.data.choices.push({ sceneIndex, beatIndex, optionIndex, optionText });
    }
  }

  recordWalk(
    sceneIndex: number | null,
    beatIndex: number | null,
    beatType: string | null,
    success: boolean,
  ): void {
    if (beatType !== 'walkTo' || beatIndex === null) return;
    let walk = this.data.walks.find((entry) => entry.sceneIndex === sceneIndex && entry.beatIndex === beatIndex);
    if (!walk) {
      walk = { sceneIndex, beatIndex, attempts: 0, successes: 0, failures: 0 };
      this.data.walks.push(walk);
    }
    walk.attempts++;
    if (success) walk.successes++;
    else walk.failures++;
  }

  recordTerminalObservation(): void {
    this.data.terminalObserved = true;
  }

  recordPassiveEvents(events: readonly { sceneIndex: number; beatIndex: number; beatType: string; evidence?: string; captureMissed?: boolean }[]): void {
    for (const event of events) {
      const key = `${event.sceneIndex}:${event.beatIndex}:${event.beatType}`;
      const target = event.captureMissed || event.evidence === 'missed'
        ? this.data.passive.missed
        : this.data.passive.captured;
      addUnique(target, key);
    }
  }

  summary(): PlaytestCoverageSummary {
    return {
      scenes: {
        checkpointed: [...this.data.scenes.checkpointed],
        reviewed: [...this.data.scenes.reviewed],
      },
      choices: this.data.choices.map((choice) => ({ ...choice })),
      walks: this.data.walks.map((walk) => ({ ...walk })),
      modes: this.data.modes.map((mode) => ({ ...mode, inputs: { ...mode.inputs } })),
      terminalObserved: this.data.terminalObserved,
      passive: {
        captured: [...this.data.passive.captured],
        missed: [...this.data.passive.missed],
      },
    };
  }

  private startMode(kind: Exclude<CheckpointModeKind, null>, id: string, beatIndex: number | null): void {
    const active = this.activeModes.get(kind);
    if (active?.id === id && active.ending === 'active') return;
    if (active?.ending === 'active') active.ending = 'replaced';
    const mode: ModeAttemptSummary = { id, beatIndex, kind, inputs: freshInputs(), ending: 'active' };
    this.data.modes.push(mode);
    this.activeModes.set(kind, mode);
  }

  private endMode(
    kind: Exclude<CheckpointModeKind, null>,
    ending: Exclude<ModeEnding, 'active'>,
    id: string | null = null,
    beatIndex: number | null = null,
  ): void {
    const active = this.activeModes.get(kind);
    if (!active) {
      if (ending === 'natural' && id) {
        this.data.modes.push({ id, beatIndex, kind, inputs: freshInputs(), ending });
      }
      return;
    }
    if (id && active.id !== id) return;
    if (active.ending === 'active') active.ending = ending;
    this.activeModes.delete(kind);
  }
}
