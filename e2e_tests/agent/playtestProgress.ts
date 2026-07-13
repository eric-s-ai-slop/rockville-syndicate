import fs from 'node:fs';
import path from 'node:path';
import type { ChapterConfig } from '../../src/data/chapters/types';
import type { CoverageManifest } from './coverageManifest';
import type { PlaytestCoverageSummary } from './playtestCoverage';
import type { PlaytestFinding } from './playtestFindings';
import type { VisualQaSummary } from './playtestCompliance';

export type PlaytestProgressStatus =
  | 'running'
  | 'verified'
  | 'incomplete-visual-qa'
  | 'incomplete-integrity'
  | 'incomplete-coverage';

export interface PlaytestProgressSnapshot {
  schema: 'omega-playtest-progress-v1';
  chapter: { id: string; title: string };
  status: PlaytestProgressStatus;
  overallPercent: number;
  bar: string;
  story: { currentBeat: number | null; farthestBeat: number | null; totalBeats: number; percent: number };
  coverage: {
    completed: number;
    total: number;
    percent: number;
    breakdown: Record<string, { completed: number; total: number }>;
  };
  visualQa: { captured: number; reviewed: number; pending: number[]; percent: number };
  findings: { open: number; dismissed: number; total: number };
  updatedAt: string;
}

function percent(completed: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function progressBar(value: number, width = 20): string {
  const filled = Math.round((value / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${value}%`;
}

function uniqueModeCount(coverage: PlaytestCoverageSummary, kind: 'foreground' | 'background'): number {
  const keys = new Set(
    coverage.modes
      .filter((mode) => mode.kind === kind && (kind === 'background' || mode.inputs.count > 0))
      .map((mode) => `${mode.kind}:${mode.beatIndex}:${mode.id}`),
  );
  return keys.size;
}

export function coverageProgress(
  manifest: CoverageManifest,
  coverage: PlaytestCoverageSummary,
): PlaytestProgressSnapshot['coverage'] {
  const breakdown = {
    scenes: {
      completed: Math.min(new Set(coverage.scenes.reviewed).size, manifest.scenes),
      total: manifest.scenes,
    },
    choices: {
      completed: Math.min(
        new Set(coverage.choices.map((choice) => `${choice.sceneIndex}:${choice.beatIndex}:${choice.optionIndex}`)).size,
        manifest.choiceOptions,
      ),
      total: manifest.choiceOptions,
    },
    walks: {
      completed: Math.min(coverage.walks.filter((walk) => walk.successes > 0).length, manifest.walkTargets),
      total: manifest.walkTargets,
    },
    foregroundModes: {
      completed: Math.min(uniqueModeCount(coverage, 'foreground'), manifest.foregroundModes),
      total: manifest.foregroundModes,
    },
    backgroundModes: {
      completed: Math.min(uniqueModeCount(coverage, 'background'), manifest.backgroundModes),
      total: manifest.backgroundModes,
    },
    terminal: {
      completed: coverage.terminalObserved ? 1 : 0,
      total: manifest.hasEndChapter ? 1 : 0,
    },
  };
  const values = Object.values(breakdown);
  const completed = values.reduce((sum, value) => sum + value.completed, 0);
  const total = values.reduce((sum, value) => sum + value.total, 0);
  return { completed, total, percent: percent(completed, total), breakdown };
}

function atomicWrite(file: string, contents: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, file);
}

export class PlaytestProgressWriter {
  private farthestBeat: number | null = null;
  private highestOverall = 0;

  constructor(
    private readonly chapter: ChapterConfig,
    private readonly manifest: CoverageManifest,
    private readonly outDir: string,
  ) {}

  update(input: {
    currentBeat: number | null;
    coverage: PlaytestCoverageSummary;
    visualQa: VisualQaSummary;
    findings: PlaytestFinding[];
    status?: PlaytestProgressStatus;
  }): PlaytestProgressSnapshot {
    if (input.currentBeat !== null) {
      this.farthestBeat = Math.max(this.farthestBeat ?? input.currentBeat, input.currentBeat);
    }
    const totalBeats = this.chapter.beats.length;
    const storyPercent = this.farthestBeat === null
      ? 0
      : percent(Math.min(this.farthestBeat + 1, totalBeats), totalBeats);
    const coverage = coverageProgress(this.manifest, input.coverage);
    const visualPercent = input.visualQa.captured === 0
      ? 0
      : percent(input.visualQa.reviewed, input.visualQa.captured);
    const status = input.status ?? 'running';
    const calculated = Math.round(storyPercent * 0.65 + coverage.percent * 0.25 + visualPercent * 0.10);
    const allMeasuredWorkComplete =
      status === 'verified' && storyPercent === 100 && coverage.percent === 100 && visualPercent === 100;
    const capped = allMeasuredWorkComplete ? 100 : Math.min(99, calculated);
    this.highestOverall = Math.max(this.highestOverall, capped);
    const open = input.findings.filter((finding) => finding.status === 'open').length;
    const dismissed = input.findings.length - open;
    const snapshot: PlaytestProgressSnapshot = {
      schema: 'omega-playtest-progress-v1',
      chapter: { id: this.chapter.id, title: this.chapter.title },
      status,
      overallPercent: this.highestOverall,
      bar: progressBar(this.highestOverall),
      story: {
        currentBeat: input.currentBeat,
        farthestBeat: this.farthestBeat,
        totalBeats,
        percent: storyPercent,
      },
      coverage,
      visualQa: {
        captured: input.visualQa.captured,
        reviewed: input.visualQa.reviewed,
        pending: [...input.visualQa.pending],
        percent: visualPercent,
      },
      findings: { open, dismissed, total: input.findings.length },
      updatedAt: new Date().toISOString(),
    };
    const dir = path.resolve(this.outDir);
    atomicWrite(path.join(dir, 'progress.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
    atomicWrite(path.join(dir, 'progress.md'), this.renderMarkdown(snapshot));
    return snapshot;
  }

  private renderMarkdown(snapshot: PlaytestProgressSnapshot): string {
    const current = snapshot.story.currentBeat === null ? 'not observed' : `${snapshot.story.currentBeat + 1}/${snapshot.story.totalBeats}`;
    return [
      `# Playtest Progress — ${snapshot.chapter.title}`,
      '',
      `## ${snapshot.bar}`,
      '',
      `- Status: \`${snapshot.status}\``,
      `- Story: ${snapshot.story.percent}% (current beat ${current})`,
      `- Coverage: ${snapshot.coverage.percent}% (${snapshot.coverage.completed}/${snapshot.coverage.total} obligations)`,
      `- Visual QA: ${snapshot.visualQa.percent}% (${snapshot.visualQa.reviewed}/${snapshot.visualQa.captured} checkpoints; pending: ${snapshot.visualQa.pending.join(', ') || 'none'})`,
      `- Findings: ${snapshot.findings.open} open, ${snapshot.findings.dismissed} dismissed`,
      `- Updated: ${snapshot.updatedAt}`,
      '',
      '> Overall progress is a monotonic estimate: 65% story position, 25% static coverage obligations, and 10% visual review. 100% requires a verified terminal summary and every measured obligation.',
      '',
    ].join('\n');
  }
}
