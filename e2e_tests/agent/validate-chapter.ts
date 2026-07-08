/**
 * validate-chapter.ts (H1) — typed, static validation of one or all chapter
 * configs. No browser needed; safe to import `src/data/chapters` directly
 * (lesson 1's safe case — it's data, not game engine code that touches
 * `window`). Run via `npm run agent:validate-chapter -- [chapterId]`
 * (omit the id to check every chapter).
 *
 * Subsumes and deepens C6's static audit for the chapter-authoring checks
 * that audit.ts doesn't cover: unknown speakers, out-of-bounds `walkTo`
 * targets, unregistered `minigame` modeIds, `changeMusic` keys missing from
 * the manifest, a misplaced `endChapter`, and scenes with no `map.theme` set
 * (CLAUDE.md: theme drives all procedural decoration — an unset theme is
 * almost always an oversight, not intentional).
 */
import { CHAPTERS } from '../../src/data/chapters';
import { resolveSpeaker, type ChapterConfig, type ChapterSceneConfig } from '../../src/data/chapters/types';
import { extractRegisteredModeIds, extractStringRecord } from './ast';

interface Finding {
  chapter: string;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  beatIndex: number | null;
  detail: string;
}

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/** True if `id` didn't resolve to any known hero/NPC/extra-speaker entry. */
function isUnknownSpeaker(id: string): boolean {
  const resolved = resolveSpeaker(id);
  return resolved.emoji === '🗨️' && resolved.name === id;
}

function scenesOf(chapter: ChapterConfig): ChapterSceneConfig[] {
  return chapter.scenes && chapter.scenes.length ? chapter.scenes : [{ map: chapter.map, actors: chapter.actors }];
}

/**
 * Beats aren't purely linear: a choice option's `goto`, `routeOnMinigame`'s
 * `cases`/`default`, and `minigame`'s `loseGoto` all jump to a beat by `id`,
 * which is how a chapter encodes multiple endings (several `endChapter` beats
 * mid-array, each reached only via a specific branch — verified against
 * `chapter5b.rose.ts`, which has two). A naive "endChapter must be the last
 * beat" check flags every branching chapter as broken, so instead this walks
 * the actual reachability graph from beat 0 and flags whichever beats no path
 * ever reaches — that's the real bug class (the historical Ch8 "never-taken
 * branch" stall lives exactly here).
 */
function computeReachableBeats(beats: ChapterConfig['beats']): Set<number> {
  const idIndex = new Map<string, number>();
  beats.forEach((b, i) => {
    if (b.id) idIndex.set(b.id, i);
  });

  const reachable = new Set<number>();
  const queue: number[] = beats.length ? [0] : [];
  while (queue.length) {
    const i = queue.pop()!;
    if (reachable.has(i) || i < 0 || i >= beats.length) continue;
    reachable.add(i);
    const beat = beats[i];

    if (beat.type === 'endChapter') continue; // terminal — no outgoing edge

    if (beat.type === 'choice') {
      let unconditionalFallthrough = false;
      for (const opt of beat.options) {
        if (opt.goto && idIndex.has(opt.goto)) queue.push(idIndex.get(opt.goto)!);
        else unconditionalFallthrough = true;
      }
      if (unconditionalFallthrough) queue.push(i + 1);
      continue;
    }

    if (beat.type === 'routeOnMinigame') {
      for (const target of Object.values(beat.cases)) {
        if (idIndex.has(target)) queue.push(idIndex.get(target)!);
      }
      if (beat.default && idIndex.has(beat.default)) queue.push(idIndex.get(beat.default)!);
      continue;
    }

    if (beat.type === 'minigame' && beat.loseGoto) {
      if (idIndex.has(beat.loseGoto)) queue.push(idIndex.get(beat.loseGoto)!);
      queue.push(i + 1); // win path falls through sequentially
      continue;
    }

    queue.push(i + 1);
  }
  return reachable;
}

/** goto/loseGoto/routeOnMinigame targets that don't match any beat's `id`. */
function findBrokenGotoTargets(beats: ChapterConfig['beats']): { beatIndex: number; target: string }[] {
  const idIndex = new Set(beats.map((b) => b.id).filter((id): id is string => !!id));
  const broken: { beatIndex: number; target: string }[] = [];
  beats.forEach((beat, i) => {
    if (beat.type === 'choice') {
      for (const opt of beat.options) {
        if (opt.goto && !idIndex.has(opt.goto)) broken.push({ beatIndex: i, target: opt.goto });
      }
    }
    if (beat.type === 'routeOnMinigame') {
      for (const target of Object.values(beat.cases)) {
        if (!idIndex.has(target)) broken.push({ beatIndex: i, target });
      }
      if (beat.default && !idIndex.has(beat.default)) broken.push({ beatIndex: i, target: beat.default });
    }
    if (beat.type === 'minigame' && beat.loseGoto && !idIndex.has(beat.loseGoto)) {
      broken.push({ beatIndex: i, target: beat.loseGoto });
    }
  });
  return broken;
}

function validateChapter(chapter: ChapterConfig, registeredModeIds: Set<string>, stageMusicKeys: Set<string>): Finding[] {
  const findings: Finding[] = [];
  const scenes = scenesOf(chapter);
  const beats = chapter.beats ?? [];
  let sceneIndex = 0;

  const flag = (severity: Finding['severity'], rule: string, beatIndex: number | null, detail: string) => {
    findings.push({ chapter: chapter.title, rule, severity, beatIndex, detail });
  };

  scenes.forEach((scene, idx) => {
    if (!scene.map?.theme) {
      flag('info', 'missing-theme', null, `scene ${idx} has no map.theme set — procedural decoration falls back to defaults`);
    }
  });

  const reachable = computeReachableBeats(beats);
  beats.forEach((beat, i) => {
    if (!reachable.has(i)) {
      flag('error', 'unreachable-beat', i, `beat ${i} (type: ${beat.type}) is not reachable from beat 0 by any sequential path, choice goto, routeOnMinigame case, or minigame loseGoto`);
    }
  });
  for (const broken of findBrokenGotoTargets(beats)) {
    flag('error', 'broken-goto-target', broken.beatIndex, `references beat id "${broken.target}", which doesn't match any beat's id in this chapter`);
  }

  beats.forEach((beat, i) => {
    if (beat.type === 'changeScene') {
      sceneIndex = beat.sceneIndex;
      if (sceneIndex < 0 || sceneIndex >= scenes.length) {
        flag('error', 'changeScene-out-of-range', i, `changeScene targets sceneIndex ${sceneIndex}, but this chapter only has ${scenes.length} scene(s)`);
      }
    }

    if ((beat.type === 'dialogue' || beat.type === 'choice') && isUnknownSpeaker(beat.speaker)) {
      flag('warning', 'unknown-speaker', i, `speaker "${beat.speaker}" does not resolve to a known hero/NPC/extra`);
    }

    if (beat.type === 'choice') {
      for (const opt of beat.options) {
        if (opt.reactionSpeaker && isUnknownSpeaker(opt.reactionSpeaker)) {
          flag('warning', 'unknown-speaker', i, `reactionSpeaker "${opt.reactionSpeaker}" does not resolve to a known hero/NPC/extra`);
        }
      }
    }

    if (beat.type === 'walkTo') {
      // sceneIndex is tracked by a straight sequential scan, so it can be
      // stale for a walkTo reached only via a goto branch that skips the
      // changeScene beat a linear read would've hit first — best-effort, not
      // exact, for non-linear chapters.
      const map = scenes[Math.min(sceneIndex, scenes.length - 1)]?.map;
      if (map && (beat.x < 0 || beat.y < 0 || beat.x > map.width || beat.y > map.height)) {
        flag('error', 'walkTo-out-of-bounds', i, `walkTo (${beat.x}, ${beat.y}) is outside scene ${sceneIndex}'s map bounds (${map.width}x${map.height})`);
      }
    }

    if (beat.type === 'minigame' && !registeredModeIds.has(beat.modeId)) {
      flag('error', 'unregistered-mode-id', i, `modeId "${beat.modeId}" is not registered in src/game/modes/index.ts`);
    }

    if (beat.type === 'changeMusic' && beat.key && !stageMusicKeys.has(beat.key)) {
      flag('error', 'unknown-music-key', i, `changeMusic key "${beat.key}" is not in STAGE_MUSIC_URL`);
    }
  });

  return findings;
}

function main() {
  const targetId = process.argv[2];
  const targets = targetId ? CHAPTERS.filter((c) => c.id === targetId || c.title === targetId) : CHAPTERS;
  if (targetId && targets.length === 0) {
    emit({ ok: false, error: `No chapter matches id/title "${targetId}"` });
    process.exit(1);
  }

  const registeredModeIds = new Set(extractRegisteredModeIds());
  const stageMusicKeys = new Set(Object.keys(extractStringRecord('src/game/audio.ts', 'STAGE_MUSIC_URL')));

  let hasErrors = false;
  for (const chapter of targets) {
    const findings = validateChapter(chapter, registeredModeIds, stageMusicKeys);
    for (const f of findings) {
      emit({ ...f });
      if (f.severity === 'error') hasErrors = true;
    }
  }

  if (hasErrors) {
    emit({ status: 'failed', message: 'One or more chapters failed validation (see "error" severity findings above).' });
    process.exit(1);
  } else {
    emit({ status: 'success', message: `Validated ${targets.length} chapter(s), no errors.` });
    process.exit(0);
  }
}

main();
