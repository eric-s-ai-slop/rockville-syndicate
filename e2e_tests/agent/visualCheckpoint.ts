/**
 * Pure visual-checkpoint identity and transition logic.
 *
 * The live CLI only supplies the small set of scene/mode fields below. Keeping
 * the transition rules here makes background-mode lifecycle coverage testable
 * without importing Playwright, Phaser, or the game runtime.
 */

export type CheckpointModeKind = 'foreground' | 'background' | null;

export interface CheckpointIdentity {
  sceneKey: string | null;
  sceneIndex: number | null;
  foregroundModeId: string | null;
  foregroundModeBeatIndex: number | null;
  backgroundModeId: string | null;
  backgroundModeBeatIndex: number | null;
}

export interface CheckpointProbe {
  sceneKey: string | null;
  sceneIndex: number | null;
  activeModeId: string | null;
  activeModeBeatIndex: number | null;
  activeModeBackground: boolean;
}

export interface CheckpointTransition {
  reason: string;
  modeKind: CheckpointModeKind;
  modeId: string | null;
  modeBeatIndex: number | null;
  identity: CheckpointIdentity;
}

export const PASSIVE_VISUAL_BEAT_TYPES = [
  'cameraPan',
  'moveActor',
  'hideActor',
  'showActor',
  'chase',
  'screenTint',
  'ledger',
] as const;

export type PassiveVisualBeatType = (typeof PASSIVE_VISUAL_BEAT_TYPES)[number];

export interface BeatTraceEntry {
  sequence: number;
  beatIndex: number;
  beatType: string;
  sceneIndex: number;
  timestamp: number;
}

export interface PassiveVisualEvent {
  sceneIndex: number;
  beatIndex: number;
  beatType: PassiveVisualBeatType;
  captureMissed?: boolean;
  evidence?: 'live' | 'post-advance' | 'boundary' | 'missed';
}

export function passiveVisualEventKey(event: Pick<PassiveVisualEvent, 'sceneIndex' | 'beatIndex' | 'beatType'>): string {
  return `${event.sceneIndex}:${event.beatIndex}:${event.beatType}`;
}

export function visualEventsFromBeatTrace(entries: BeatTraceEntry[]): PassiveVisualEvent[] {
  const events: PassiveVisualEvent[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!(PASSIVE_VISUAL_BEAT_TYPES as readonly string[]).includes(entry.beatType)) continue;
    const event = {
      sceneIndex: entry.sceneIndex,
      beatIndex: entry.beatIndex,
      beatType: entry.beatType as PassiveVisualBeatType,
    };
    const key = passiveVisualEventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }
  return events;
}

export function contactSheetChunks<T>(items: T[], maxTiles = 6): T[][] {
  if (!Number.isInteger(maxTiles) || maxTiles < 1) throw new Error('maxTiles must be a positive integer');
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += maxTiles) {
    chunks.push(items.slice(index, index + maxTiles));
  }
  return chunks;
}

export function checkpointIdentity(probe: CheckpointProbe): CheckpointIdentity {
  const modeId = probe.activeModeId;
  const beatIndex = modeId ? probe.activeModeBeatIndex : null;
  return {
    sceneKey: probe.sceneKey,
    sceneIndex: probe.sceneIndex,
    foregroundModeId: modeId && !probe.activeModeBackground ? modeId : null,
    foregroundModeBeatIndex: modeId && !probe.activeModeBackground ? beatIndex : null,
    backgroundModeId: modeId && probe.activeModeBackground ? modeId : null,
    backgroundModeBeatIndex: modeId && probe.activeModeBackground ? beatIndex : null,
  };
}

function modeChanged(previousId: string | null, currentId: string | null, previousBeat: number | null, currentBeat: number | null): boolean {
  return previousId !== currentId || previousBeat !== currentBeat;
}

function modeTransition(
  kind: Exclude<CheckpointModeKind, null>,
  previousId: string | null,
  currentId: string | null,
  previousBeat: number | null,
  currentBeat: number | null,
  identity: CheckpointIdentity,
): CheckpointTransition | null {
  if (!modeChanged(previousId, currentId, previousBeat, currentBeat)) return null;

  const label = kind === 'background' ? 'Background' : 'Foreground';
  if (!previousId && currentId) {
    return {
      reason: `${label} mode "${currentId}" started`,
      modeKind: kind,
      modeId: currentId,
      modeBeatIndex: currentBeat,
      identity,
    };
  }
  if (previousId && !currentId) {
    return {
      reason: `${label} mode "${previousId}" ended`,
      modeKind: kind,
      modeId: previousId,
      modeBeatIndex: previousBeat,
      identity,
    };
  }

  return {
    reason: `${label} mode "${previousId}" replaced by "${currentId}"`,
    modeKind: kind,
    modeId: currentId,
    modeBeatIndex: currentBeat,
    identity,
  };
}

/**
 * Return one receipt per changed visual identity. Background and foreground
 * transitions are intentionally independent: replacing a background mode with
 * a foreground mode emits the background end and foreground start receipts.
 * An unchanged identity emits nothing, even when the caller polls repeatedly.
 */
export function checkpointTransitions(
  previous: CheckpointIdentity | null,
  current: CheckpointIdentity,
): CheckpointTransition[] {
  if (!previous) {
    const transitions: CheckpointTransition[] = [{
      reason: current.sceneKey
        ? `scene "${current.sceneKey}" loaded`
        : current.sceneIndex === null
          ? 'scene unloaded'
          : `chapter scene ${current.sceneIndex} entered`,
      modeKind: null,
      modeId: null,
      modeBeatIndex: null,
      identity: current,
    }];
    const foreground = modeTransition(
      'foreground',
      null,
      current.foregroundModeId,
      null,
      current.foregroundModeBeatIndex,
      current,
    );
    if (foreground) transitions.push(foreground);
    const background = modeTransition(
      'background',
      null,
      current.backgroundModeId,
      null,
      current.backgroundModeBeatIndex,
      current,
    );
    if (background) transitions.push(background);
    return transitions;
  }

  const transitions: CheckpointTransition[] = [];
  const sceneChanged = previous.sceneKey !== current.sceneKey || previous.sceneIndex !== current.sceneIndex;

  if (sceneChanged) {
    transitions.push({
      reason: current.sceneIndex === null
        ? 'scene unloaded'
        : `chapter scene ${current.sceneIndex} entered`,
      modeKind: null,
      modeId: null,
      modeBeatIndex: null,
      identity: current,
    });
  }

  const foreground = modeTransition(
    'foreground',
    previous.foregroundModeId,
    current.foregroundModeId,
    previous.foregroundModeBeatIndex,
    current.foregroundModeBeatIndex,
    current,
  );
  if (foreground) transitions.push(foreground);

  const background = modeTransition(
    'background',
    previous.backgroundModeId,
    current.backgroundModeId,
    previous.backgroundModeBeatIndex,
    current.backgroundModeBeatIndex,
    current,
  );
  if (background) transitions.push(background);

  return transitions;
}
