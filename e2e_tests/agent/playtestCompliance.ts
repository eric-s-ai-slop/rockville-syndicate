import type { CheckpointModeKind } from './visualCheckpoint';

export type CheckpointVerdict = 'clear' | 'issue-found' | 'inconclusive';

export interface CheckpointReview {
  checkpointId: number;
  verdict: CheckpointVerdict;
  note: string;
  timestamp: number;
}

export interface VisualQaSummary {
  status: 'complete' | 'incomplete';
  captured: number;
  reviewed: number;
  pending: number[];
  reviews: CheckpointReview[];
  reasons: string[];
}

export interface PlaytestCompletionVerdict {
  ok: boolean;
  status: 'verified' | 'incomplete-visual-qa';
  exitCode: 0 | 1;
}

export function playtestCompletionVerdict(visualQa: VisualQaSummary): PlaytestCompletionVerdict {
  const ok = visualQa.status === 'complete';
  return {
    ok,
    status: ok ? 'verified' : 'incomplete-visual-qa',
    exitCode: ok ? 0 : 1,
  };
}

const MODE_INTERACTION_COMMANDS = new Set([
  'hold',
  'press',
  'tap',
  'key',
  'mousedown',
  'mousemove',
  'mouseup',
  'click',
  'drag',
  'clickworld',
]);

const ALLOWED_WHILE_CHECKPOINT_PENDING = new Set([
  'help',
  'state',
  'screenshot',
  'text',
  'targets',
  'observe',
  'obs',
  'diff',
  'beat',
  'beats',
  'logs',
  'console',
  'audio',
  'loop',
  'modes',
  'where',
  'anim',
  'depth',
  'hitreport',
  'perf',
  'settings',
  'chapterflag',
  'reviewcheckpoint',
  'release',
  'releaseall',
  'gifstart',
  'gifstop',
  'quit',
  'exit',
]);

const PLACEHOLDER_REVIEW_NOTES = new Set([
  'skip',
  'clear',
  'fine',
  'looks fine',
  'looks good',
  'looks correct',
  'no issues',
  'no bugs',
  'scene entered',
  'minigame started',
  'minigame finished',
  'chapter ended',
]);

/**
 * Tracks the pieces of autonomous visual QA that the CLI can verify without
 * pretending it can see the agent's private reasoning. A review receipt does
 * not prove the image was understood, but it makes silently ignoring 26 PNGs
 * visible in session_summary and gives bypass gates something concrete to
 * enforce at the point of action.
 */
export class PlaytestCompliance {
  private readonly checkpointIds: number[] = [];
  private readonly reviews = new Map<number, CheckpointReview>();
  private activeMode: string | null = null;
  private activeModeAttempted = false;

  /**
   * Record every visual checkpoint, but only synchronize the foreground-mode
   * bypass gate. Background receipts are evidence obligations, not mode-input
   * state, so they cannot clear or reset a foreground attempt.
   */
  captureCheckpoint(
    checkpointId: number,
    foregroundModeId: string | null,
    modeKind: CheckpointModeKind = foregroundModeId ? 'foreground' : null,
  ): void {
    this.checkpointIds.push(checkpointId);
    if (modeKind !== 'background' && foregroundModeId !== this.activeMode) {
      this.activeMode = foregroundModeId;
      this.activeModeAttempted = false;
    }
  }

  pendingCheckpointIds(): number[] {
    return this.checkpointIds.filter((id) => !this.reviews.has(id));
  }

  assertCommandAllowed(command: string, args: string[] = []): void {
    const pending = this.pendingCheckpointIds();
    if (pending.length === 0) return;

    const normalized = command.toLowerCase();
    const readOnlySettings = normalized !== 'settings' || args.length === 0;
    const readOnlyChapterFlags = normalized !== 'chapterflag' || args.length === 0;
    const readOnlyLogs = !['logs', 'console'].includes(normalized) || args[0] !== 'clear';
    if (
      ALLOWED_WHILE_CHECKPOINT_PENDING.has(normalized) &&
      readOnlySettings &&
      readOnlyChapterFlags &&
      readOnlyLogs
    ) {
      return;
    }

    throw new Error(
      `Review pending visual checkpoint(s) ${pending.join(', ')} before "${normalized}". ` +
      `Inspect the PNG, then run reviewcheckpoint <id> clear|issue-found|inconclusive <concrete visual note>.`,
    );
  }

  reviewCheckpoint(checkpointId: number, verdict: string, note = ''): CheckpointReview {
    if (!this.checkpointIds.includes(checkpointId)) {
      throw new Error(`Unknown checkpoint ${checkpointId}; review an emitted visual_checkpoint ID.`);
    }
    if (!['clear', 'issue-found', 'inconclusive'].includes(verdict)) {
      throw new Error('Usage: reviewcheckpoint <id> clear|issue-found|inconclusive <observation-note>');
    }
    const normalizedNote = note.trim().replace(/\s+/g, ' ');
    const normalizedPlaceholder = normalizedNote.toLowerCase().replace(/[.!]+$/g, '');
    const wordCount = normalizedNote.split(/\s+/).filter(Boolean).length;
    if (
      normalizedNote.length < 20 ||
      wordCount < 3 ||
      PLACEHOLDER_REVIEW_NOTES.has(normalizedPlaceholder) ||
      /^scene\s+\d+\s+entered$/.test(normalizedPlaceholder)
    ) {
      throw new Error(
        `Checkpoint verdict "${verdict}" requires a concrete visual note (at least 20 characters) ` +
        'describing visible actors, layout, text, or UI; placeholders such as "looks fine" are rejected.',
      );
    }
    const review: CheckpointReview = {
      checkpointId,
      verdict: verdict as CheckpointVerdict,
      note: normalizedNote,
      timestamp: Date.now(),
    };
    this.reviews.set(checkpointId, review);
    return review;
  }

  recordSuccessfulCommand(command: string): void {
    if (this.activeMode && MODE_INTERACTION_COMMANDS.has(command)) {
      this.activeModeAttempted = true;
    }
  }

  assertBypassAllowed(command: 'skipbeat' | 'winmode' | 'losemode'): void {
    const pendingCheckpointId = this.pendingCheckpointIds()[0];
    if (pendingCheckpointId !== undefined) {
      throw new Error(
        `Review visual_checkpoint ${pendingCheckpointId} before any bypass: ` +
        `reviewcheckpoint ${pendingCheckpointId} clear|issue-found|inconclusive <observation-note>`,
      );
    }
    if (!this.activeMode) return;
    if (command === 'skipbeat') {
      throw new Error(
        `skipbeat 1 cannot bypass active foreground mode "${this.activeMode}"; ` +
        'attempt its visible UI, then use winmode or losemode only if it remains blocking.',
      );
    }
    if (!this.activeModeAttempted) {
      throw new Error(
        `Attempt active foreground mode "${this.activeMode}" with normal keyboard or mouse input ` +
        `before ${command}.`,
      );
    }
  }

  summary(checkpointsEnabled: boolean): VisualQaSummary {
    const pending = this.pendingCheckpointIds();
    const reasons = [
      ...(!checkpointsEnabled ? ['--checkpoints was not enabled'] : []),
      ...(pending.length > 0 ? [`${pending.length} visual checkpoint(s) were not reviewed`] : []),
    ];
    return {
      status: reasons.length === 0 ? 'complete' : 'incomplete',
      captured: this.checkpointIds.length,
      reviewed: this.reviews.size,
      pending,
      reviews: [...this.reviews.values()],
      reasons,
    };
  }
}
