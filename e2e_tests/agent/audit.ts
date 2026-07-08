import fs from 'node:fs';
import path from 'node:path';
import { CHAPTERS } from '../../src/data/chapters';

function emit(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function runAudit() {
  let hasErrors = false;

  // 1. Parse src/game/audio.ts for imports and STAGE_MUSIC_URL keys
  const audioPath = path.resolve('src/game/audio.ts');
  const audioContent = fs.readFileSync(audioPath, 'utf8');

  // Find imports like: import ch1Url from '../assets/audio/stage_music/commons1522(coffee beabadobee).mp3?url';
  const audioImports = new Map<string, string>(); // varName -> filePath
  const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(audioContent)) !== null) {
    const [_, varName, importPath] = match;
    const cleanPath = importPath.replace(/\?url$/, '');
    const absolutePath = path.resolve('src/game', cleanPath);
    audioImports.set(varName, absolutePath);

    // Verify file exists on disk
    if (!fs.existsSync(absolutePath)) {
      emit({ type: 'audio_import', status: 'missing', path: cleanPath, fullPath: absolutePath });
      hasErrors = true;
    }
  }

  // Find stage music keys in STAGE_MUSIC_URL
  const stageMusicKeys = new Set<string>();
  const stageMusicRegex = /(\w+)\s*:\s*(\w+)/g;
  const stageMusicSectionMatch = audioContent.match(/export\s+const\s+STAGE_MUSIC_URL[^{]*{([^}]+)}/);
  if (stageMusicSectionMatch) {
    const section = stageMusicSectionMatch[1];
    let keyMatch;
    while ((keyMatch = stageMusicRegex.exec(section)) !== null) {
      stageMusicKeys.add(keyMatch[1]);
    }
  }

  // 2. Parse src/game/ChapterScene.ts for image imports
  const scenePath = path.resolve('src/game/ChapterScene.ts');
  const sceneContent = fs.readFileSync(scenePath, 'utf8');
  let sceneMatch;
  const sceneImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  while ((sceneMatch = sceneImportRegex.exec(sceneContent)) !== null) {
    const [_, varName, importPath] = sceneMatch;
    if (importPath.endsWith('.jpg') || importPath.endsWith('.png')) {
      const absolutePath = path.resolve('src/game', importPath);
      if (!fs.existsSync(absolutePath)) {
        emit({ type: 'image_import', status: 'missing', path: importPath, fullPath: absolutePath });
        hasErrors = true;
      }
    }
  }

  // 3. Check Chapters
  const chapterMusicKeyMap = new Map<string, string>();
  const chapterMusicSectionMatch = audioContent.match(/export\s+const\s+CHAPTER_MUSIC_KEY[^{]*{([^}]+)}/);
  if (chapterMusicSectionMatch) {
    const section = chapterMusicSectionMatch[1];
    let cmMatch;
    const cmRegex = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
    while ((cmMatch = cmRegex.exec(section)) !== null) {
      chapterMusicKeyMap.set(cmMatch[1].trim(), cmMatch[2].trim());
    }
  }

  for (const chapter of CHAPTERS) {
    const chapMusicKey = chapterMusicKeyMap.get(chapter.id);
    if (chapMusicKey && !stageMusicKeys.has(chapMusicKey)) {
      emit({ chapter: chapter.title, key: chapMusicKey, kind: 'music', status: 'missing' });
      hasErrors = true;
    }

    // Check individual scene music keys
    if (chapter.scenes) {
      for (const scene of chapter.scenes) {
        if (scene.music && !stageMusicKeys.has(scene.music)) {
          emit({ chapter: chapter.title, key: scene.music, kind: 'music', status: 'missing' });
          hasErrors = true;
        }
      }
    }

    // Check changeMusic beat keys
    if (chapter.beats) {
      for (const beat of chapter.beats) {
        if (beat.type === 'changeMusic' && beat.key && !stageMusicKeys.has(beat.key)) {
          emit({ chapter: chapter.title, key: beat.key, kind: 'music', status: 'missing' });
          hasErrors = true;
        }
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
