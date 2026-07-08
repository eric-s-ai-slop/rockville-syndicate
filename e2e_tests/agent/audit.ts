/**
 * Static asset audit (C6) — no browser needed. Verifies audio imports exist on
 * disk, stage-music keys referenced by chapters/scenes/beats are registered,
 * `ChapterScene` image imports exist, and every `minigame` beat's `modeId` is
 * actually registered in `src/game/modes/index.ts`.
 *
 * Rewritten onto ts-morph (see `ast.ts`) instead of regex-parsing TS source —
 * the original regex approach was brittle against reordering or reformatting
 * (C6's documented known gap). Still never imports game *engine* code into
 * this Node process (lesson 1); everything below is either data (`CHAPTERS`)
 * or read as an AST, never executed.
 */
import { CHAPTERS } from '../../src/data/chapters';
import { extractDefaultImportsByName, extractStringRecord, extractRegisteredModeIds } from './ast';

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function runAudit() {
  let hasErrors = false;

  // 1. Audio imports (src/game/audio.ts) actually exist on disk.
  const audioImports = extractDefaultImportsByName('src/game/audio.ts');
  for (const [varName, info] of Object.entries(audioImports)) {
    if (!info.existsOnDisk) {
      emit({ type: 'audio_import', status: 'missing', varName, path: info.importPath });
      hasErrors = true;
    }
  }

  // 2. STAGE_MUSIC_URL keys resolve to an import that exists on disk.
  const stageMusicUrl = extractStringRecord('src/game/audio.ts', 'STAGE_MUSIC_URL');
  const stageMusicKeys = new Set(Object.keys(stageMusicUrl));
  for (const [musicKey, varName] of Object.entries(stageMusicUrl)) {
    const info = audioImports[varName];
    if (!info || !info.existsOnDisk) {
      emit({ type: 'stage_music_url', status: 'missing', key: musicKey, varName });
      hasErrors = true;
    }
  }

  // 3. ChapterScene.ts image imports exist on disk.
  const sceneImports = extractDefaultImportsByName('src/game/ChapterScene.ts');
  for (const [varName, info] of Object.entries(sceneImports)) {
    if (/\.(jpg|png)$/.test(info.importPath) && !info.existsOnDisk) {
      emit({ type: 'image_import', status: 'missing', varName, path: info.importPath });
      hasErrors = true;
    }
  }

  // 4. Every registered mode id, for cross-referencing minigame beats.
  const registeredModeIds = new Set(extractRegisteredModeIds());

  // 5. Per-chapter checks.
  const chapterMusicKeyMap = extractStringRecord('src/game/audio.ts', 'CHAPTER_MUSIC_KEY');
  for (const chapter of CHAPTERS) {
    const chapMusicKey = chapterMusicKeyMap[chapter.id];
    if (chapMusicKey && !stageMusicKeys.has(chapMusicKey)) {
      emit({ chapter: chapter.title, key: chapMusicKey, kind: 'music', status: 'missing' });
      hasErrors = true;
    }

    const scenes = chapter.scenes ?? [{ map: chapter.map, actors: chapter.actors }];
    for (const scene of scenes) {
      if (scene.music && !stageMusicKeys.has(scene.music)) {
        emit({ chapter: chapter.title, key: scene.music, kind: 'music', status: 'missing' });
        hasErrors = true;
      }
    }

    for (const beat of chapter.beats ?? []) {
      if (beat.type === 'changeMusic' && beat.key && !stageMusicKeys.has(beat.key)) {
        emit({ chapter: chapter.title, key: beat.key, kind: 'music', status: 'missing' });
        hasErrors = true;
      }
      if (beat.type === 'minigame' && !registeredModeIds.has(beat.modeId)) {
        emit({ chapter: chapter.title, modeId: beat.modeId, kind: 'mode', status: 'unregistered' });
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  } else {
    emit({ status: 'success', message: 'All chapter and static assets verified successfully.' });
    process.exit(0);
  }
}

runAudit();
