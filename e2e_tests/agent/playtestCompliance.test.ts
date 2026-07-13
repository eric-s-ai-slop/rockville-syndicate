import { describe, expect, it } from 'vitest';
import { PlaytestCoverageTracker } from './playtestCoverage';
import { PlaytestCompliance, playtestCompletionVerdict } from './playtestCompliance';

function terminalCoverage() {
  const coverage = new PlaytestCoverageTracker();
  coverage.recordTerminalObservation();
  return coverage.summary();
}

describe('PlaytestCompliance', () => {
  it('reports emitted but unreviewed checkpoints as incomplete', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);
    compliance.captureCheckpoint(2, 'doubleCall');

    expect(compliance.summary(true)).toMatchObject({
      status: 'incomplete',
      captured: 2,
      reviewed: 0,
      pending: [1, 2],
    });
  });

  it('records explicit visual verdicts', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);

    expect(compliance.reviewCheckpoint(1, 'issue-found', 'labels overlap fields')).toEqual({
      checkpointId: 1,
      verdict: 'issue-found',
      note: 'labels overlap fields',
      timestamp: expect.any(Number),
    });
    expect(compliance.summary(true)).toMatchObject({ status: 'complete', reviewed: 1, pending: [] });
  });

  it('rejects bypasses until the latest checkpoint is reviewed', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(7, 'doubleCall');

    expect(() => compliance.assertBypassAllowed('winmode')).toThrow('Review visual_checkpoint 7');
  });

  it('blocks progression while any checkpoint is pending', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(4, null);

    for (const command of ['advance', 'choose', 'walkto', 'tap', 'wait', 'loadstate']) {
      expect(() => compliance.assertCommandAllowed(command)).toThrow('pending visual checkpoint(s) 4');
    }
  });

  it('allows evidence collection and safe shutdown while a checkpoint is pending', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(4, null);

    for (const command of [
      'reviewcheckpoint', 'recordfinding', 'dismissfinding', 'listfindings',
      'observe', 'screenshot', 'text', 'beats', 'logs', 'quit',
    ]) {
      expect(() => compliance.assertCommandAllowed(command)).not.toThrow();
    }
  });

  it('does not treat mutating forms of otherwise read-only commands as evidence collection', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(4, null);

    expect(() => compliance.assertCommandAllowed('logs', ['clear'])).toThrow('pending visual checkpoint(s) 4');
    expect(() => compliance.assertCommandAllowed('settings', ['musicVolume', '0'])).toThrow('pending visual checkpoint(s) 4');
    expect(() => compliance.assertCommandAllowed('chapterflag', ['ch1', 'complete'])).toThrow('pending visual checkpoint(s) 4');
  });

  it('unblocks progression only after every pending checkpoint is reviewed', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(4, null);
    compliance.captureCheckpoint(5, null);
    compliance.reviewCheckpoint(4, 'clear', 'Dialogue panel is readable and centered above the footer.');

    expect(() => compliance.assertCommandAllowed('advance')).toThrow('pending visual checkpoint(s) 5');
    compliance.reviewCheckpoint(5, 'clear', 'Three actors are visible with labels centered above their sprites.');
    expect(() => compliance.assertCommandAllowed('advance')).not.toThrow();
  });

  it('rejects skipbeat as a foreground-mode bypass', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(7, 'doubleCall');
    compliance.reviewCheckpoint(7, 'clear', 'mode layout inspected');

    expect(() => compliance.assertBypassAllowed('skipbeat')).toThrow(
      'skipbeat 1 cannot bypass active foreground mode "doubleCall"',
    );
  });

  it('requires a normal input attempt before force-completing a mode', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(7, 'doubleCall');
    compliance.reviewCheckpoint(7, 'clear', 'mode layout inspected');

    expect(() => compliance.assertBypassAllowed('winmode')).toThrow('Attempt active foreground mode');
    compliance.recordSuccessfulCommand('click');
    expect(() => compliance.assertBypassAllowed('winmode')).not.toThrow();
  });

  it('does not count observation commands as a normal mode attempt', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(7, 'doubleCall');
    compliance.reviewCheckpoint(7, 'clear', 'mode layout inspected');
    compliance.recordSuccessfulCommand('observe');

    expect(() => compliance.assertBypassAllowed('losemode')).toThrow('Attempt active foreground mode');
  });

  it('counts background checkpoints in visual QA without changing foreground input attempts', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(7, 'doubleCall', 'foreground');
    compliance.reviewCheckpoint(7, 'clear', 'Foreground mode layout and controls are visible.');
    compliance.recordSuccessfulCommand('click');

    compliance.captureCheckpoint(8, null, 'background');
    expect(compliance.summary(true)).toMatchObject({ captured: 2, reviewed: 1, pending: [8] });
    compliance.reviewCheckpoint(8, 'clear', 'Background actors remain visible beside story text.');
    expect(() => compliance.assertBypassAllowed('winmode')).not.toThrow();
  });

  it('does not let a background checkpoint reset an active foreground gate', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(7, 'doubleCall', 'foreground');
    compliance.reviewCheckpoint(7, 'clear', 'Foreground mode layout and controls are visible.');
    compliance.recordSuccessfulCommand('click');

    compliance.captureCheckpoint(8, null, 'background');
    compliance.reviewCheckpoint(8, 'clear', 'Background mode is visible without blocking story flow.');
    expect(() => compliance.assertBypassAllowed('losemode')).not.toThrow();
  });

  it('marks a run without --checkpoints incomplete', () => {
    expect(new PlaytestCompliance().summary(false)).toMatchObject({
      status: 'incomplete',
      reasons: ['--checkpoints was not enabled'],
    });
  });

  it('returns a nonzero fail-closed verdict for incomplete visual QA', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);

    expect(playtestCompletionVerdict(compliance.summary(true), terminalCoverage(), 'natural')).toEqual({
      ok: false,
      status: 'incomplete-visual-qa',
      exitCode: 1,
    });
  });

  it('returns a verified zero-exit verdict only after every checkpoint is reviewed', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);
    compliance.reviewCheckpoint(1, 'clear', 'Dialogue text is readable inside the centered footer panel.');

    expect(playtestCompletionVerdict(compliance.summary(true), terminalCoverage(), 'natural')).toEqual({
      ok: true,
      status: 'verified',
      exitCode: 0,
    });
  });

  it('does not verify a visually complete mid-chapter quit without terminal observation', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);
    compliance.reviewCheckpoint(1, 'clear', 'Choice panel and actors are visible in the active scene.');
    const coverage = new PlaytestCoverageTracker().summary();

    expect(playtestCompletionVerdict(compliance.summary(true), coverage, 'natural')).toEqual({
      ok: false,
      status: 'incomplete-coverage',
      exitCode: 1,
    });
  });

  it('does not verify a bypassed run even when terminal and visual QA are complete', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);
    compliance.reviewCheckpoint(1, 'clear', 'Terminal scene effects are visible and fully rendered.');

    expect(playtestCompletionVerdict(compliance.summary(true), terminalCoverage(), 'partially-bypassed')).toEqual({
      ok: false,
      status: 'incomplete-integrity',
      exitCode: 1,
    });
  });

  it('requires an observation note even for a clear verdict', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);

    expect(() => compliance.reviewCheckpoint(1, 'clear')).toThrow('requires a concrete visual note');
  });

  it('rejects vacuous review notes that do not describe visible evidence', () => {
    const compliance = new PlaytestCompliance();
    compliance.captureCheckpoint(1, null);

    for (const note of ['skip', 'looks fine', 'scene 6 entered', 'minigame started', 'chapter ended']) {
      expect(() => compliance.reviewCheckpoint(1, 'clear', note)).toThrow('requires a concrete visual note');
    }
  });
});
