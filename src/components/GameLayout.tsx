import { useState, useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import ChapterScene, { StoryDialoguePayload } from '../game/ChapterScene';
import { CHARACTER_CLASSES, CharacterClass, BossConfig } from '../data/entities';
import { ChapterConfig } from '../data/chapters';
import { loadProgress, markChapterComplete, rememberHero, setFreePlay as persistFreePlay } from '../game/progress';
import { useSettings, updateSettings, getSettings, saveRunRecord, getRunRecords } from '../game/settings';
import { computeRunScore, GHOST_TARGETS, ghostBeatenIndex, type RunRecord } from '../game/scoring';
import shieldImg from '../assets/images/shield.jpg';
import { Play } from 'lucide-react';
import DialogueBox from './DialogueBox';
import ChapterSelect from './ChapterSelect';
import ExternalGameFrame from './ExternalGameFrame';
import { playUi } from '../game/uiSound';

type GameStatus = 'hero' | 'chapters' | 'playing' | 'chapterComplete' | 'gameover' | 'records';

interface TitleCardData {
  chapterNumber: string;
  kind: string;
  title: string;
  subtitle: string;
  location: string;
}

interface ActiveStory {
  payload: StoryDialoguePayload;
  done: (choiceIndex?: number) => void;
  lineIndex: number;
}

export default function GameLayout() {
  const [selectedHero, setSelectedHero] = useState<CharacterClass | null>(null);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [activeChapter, setActiveChapter] = useState<ChapterConfig | null>(null);
  const [playerHp, setPlayerHp] = useState(120);
  const [ledger, setLedger] = useState<{ total: number; note: string }>({ total: 0, note: '' });
  const [gameStatus, setGameStatus] = useState<GameStatus>('hero');
  const [lastRunRecord, setLastRunRecord] = useState<RunRecord | null>(null);
  const [prevBest, setPrevBest] = useState<number>(0);

  const [activeQte, setActiveQte] = useState<{
    boss: BossConfig;
    callback: (success: boolean, damage: number) => void;
    selectedDamage: number;
  } | null>(null);
  const [qteTimer, setQteTimer] = useState(8);

  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [activeExternalGame, setActiveExternalGame] = useState<{ gameId: string, config: unknown, onDone: (r: any) => void } | null>(null);
  const [titleCard, setTitleCard] = useState<TitleCardData | null>(null);
  const [titleCardVisible, setTitleCardVisible] = useState(false);
  // Settings are sourced from the unified store (save-schema-v2). `useSettings()`
  // re-renders this component whenever any setting changes, from React or Phaser.
  const settings = useSettings();
  const { muted, colorBlind, textScale } = settings;
  const [freePlay, setFreePlayState] = useState(() => loadProgress().freePlay === true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'audio' | 'gameplay' | 'access' | 'controls'>('audio');
  const [soundAlert, setSoundAlert] = useState(false);
  const isMobile = typeof window !== 'undefined' && (
    /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1)
  );

  useEffect(() => {
    document.documentElement.classList.toggle('color-blind', colorBlind);
  }, [colorBlind]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', textScale.toString());
  }, [textScale]);

  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  // Phaser captures this once at boot — route through a ref so it always calls
  // the latest handler.
  const storyRef = useRef<(payload: StoryDialoguePayload, done: (i?: number) => void) => void>(() => {});
  // Mirror of activeStory for reading the latest value outside setState updaters.
  const activeStoryRef = useRef<ActiveStory | null>(null);
  const activeExternalGameRef = useRef<{ onDone: (r: any) => void } | null>(null);

  // Load saved progress on mount.
  useEffect(() => {
    const p = loadProgress();
    setCompletedChapters(p.completedChapters);
    if (p.hero) {
      const hero = CHARACTER_CLASSES.find(c => c.id === p.hero);
      if (hero) setSelectedHero(hero);
    }
  }, []);

  const handleSelectHero = (hero: CharacterClass) => {
    setSelectedHero(hero);
    setPlayerHp(hero.maxHp);
  };

  const handleStartStory = () => {
    if (!selectedHero) return;
    rememberHero(selectedHero.id);
    setGameStatus('chapters');
  };

  const handlePickChapter = (chapter: ChapterConfig) => {
    setActiveChapter(chapter);
    setLedger({ total: 0, note: '' });
    const proto = chapter.protagonistOverride
      ? CHARACTER_CLASSES.find(c => c.id === chapter.protagonistOverride)
      : selectedHero;
    setPlayerHp((proto ?? selectedHero!)?.maxHp ?? 120);

    // Show chapter title card, then boot Phaser underneath
    const chNum = chapter.id.replace('ch', '');
    setTitleCard({
      chapterNumber: chNum,
      kind: chapter.kind === 'interlude' ? 'INTERLUDE' : chapter.kind === 'epilogue' ? 'EPILOGUE' : `CHAPTER ${chNum}`,
      title: chapter.title,
      subtitle: chapter.subtitle,
      location: chapter.location,
    });
    setTitleCardVisible(true);
    setGameStatus('playing');
    if (muted) { setSoundAlert(true); setTimeout(() => setSoundAlert(false), 5000); }
    // Fade out card after 2.8s total (0.6 in + 1.6 hold + 0.6 out via CSS)
    setTimeout(() => setTitleCardVisible(false), 2200);
    setTimeout(() => setTitleCard(null), 2900);
  };

  // ─── Story dialogue handling ────────────────────────────────────────────────

  const handleStoryDialogue = useCallback(
    (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => {
      const next = { payload, done, lineIndex: 0 };
      activeStoryRef.current = next;
      setActiveStory(next);
    },
    []
  );
  useEffect(() => {
    storyRef.current = handleStoryDialogue;
  }, [handleStoryDialogue]);
  // Keep the ref in lockstep with state so advance/choose read the live value.
  useEffect(() => {
    activeStoryRef.current = activeStory;
  }, [activeStory]);

  // The scene's `done` callback drives the beat engine — it MUST run exactly once
  // per dialogue/choice. It is a side effect, so it can never live inside a
  // setState updater: React StrictMode double-invokes updaters in dev, which would
  // fire `done()` twice and skip a beat (e.g. walkTo beats vanish, leaving a stale
  // walkTarget and a soft-locked confrontation). Read the latest story via a ref
  // and perform the side effect outside the updater.
  const advanceStory = () => {
    const cur = activeStoryRef.current;
    if (!cur) return;
    const last = cur.lineIndex >= cur.payload.lines.length - 1;
    if (!last) {
      setActiveStory({ ...cur, lineIndex: cur.lineIndex + 1 });
      return;
    }
    // On the last line: if there are choices, wait for a pick; otherwise finish.
    if (cur.payload.choices && cur.payload.choices.length) return;
    activeStoryRef.current = null;
    setActiveStory(null);
    cur.done();
  };

  const chooseStory = (idx: number) => {
    const cur = activeStoryRef.current;
    if (!cur) return;
    activeStoryRef.current = null;
    setActiveStory(null);
    cur.done(idx);
  };

  // ─── Phaser boot ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    if (gameStatus === 'playing' && selectedHero && activeChapter) {
      const container = document.getElementById('phaser-canvas-container');
      const w = container?.offsetWidth || window.innerWidth;
      const h = container?.offsetHeight || (window.innerHeight - 48);
      const chapter = activeChapter;
      (async () => {
        // Ensure Yoster Island is loaded before Phaser renders any canvas text.
        await document.fonts.load("16px 'Yoster'").catch(() => {});
        if (cancelled) return;

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: 'phaser-canvas-container',
          scale: { mode: Phaser.Scale.RESIZE, width: w, height: h },
          render: { antialias: true, roundPixels: false },
          physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
          scene: [],
          callbacks: {
            postBoot: (game) => {
              game.canvas.setAttribute('tabindex', '0');
              game.canvas.focus();
              game.sound.mute = getSettings().muted;
              game.sound.volume = getSettings().masterVolume;
              if (import.meta.env.DEV) (window as unknown as { __OMEGA_GAME__?: Phaser.Game }).__OMEGA_GAME__ = game;
              game.scene.add('ChapterScene', ChapterScene, true, {
                hero: selectedHero,
                chapter,
                playerHp: selectedHero.maxHp,
                onHpChange: (hp: number) => setPlayerHp(hp),
                onTriggerQTE: (boss: BossConfig, callback: (success: boolean, damage: number) => void) => {
                  setQteTimer(8);
                  const shuffledBoss = { ...boss };

                  const selectedQTE = boss.qtePool
                    ? boss.qtePool[Phaser.Math.Between(0, boss.qtePool.length - 1)]
                    : boss.weaknessQTE;

                  const selectedDamage = selectedQTE?.damage ?? boss.weaknessQTE.damage;

                  if (selectedQTE) {
                    shuffledBoss.weaknessQTE = {
                      ...selectedQTE,
                      options: Phaser.Utils.Array.Shuffle([...selectedQTE.options])
                    };
                  }
                  setActiveQte({ boss: shuffledBoss, callback, selectedDamage });
                },
                onStoryDialogue: (payload: StoryDialoguePayload, done: (i?: number) => void) =>
                  storyRef.current(payload, done),
                mountExternalGame: (opts: { gameId: string; config?: unknown }, onDone: (r: any) => void) => {
                  activeExternalGameRef.current = { onDone };
                  setActiveExternalGame({ gameId: opts.gameId, config: opts.config, onDone });
                },
                unmountExternalGame: () => {
                  activeExternalGameRef.current = null;
                  setActiveExternalGame(null);
                },
                onLedgerChange: (total: number, note: string) => setLedger({ total, note }),
                onChapterCompleted: (stats) => {
                  const p = markChapterComplete(chapter.id);
                  setCompletedChapters(p.completedChapters);
                  const difficulty = getSettings().difficulty;
                  const score = computeRunScore(
                    stats.shardsCollected,
                    stats.hpRemaining,
                    stats.ledgerTotal,
                    difficulty,
                  );
                  const heroId = chapter.protagonistOverride ?? (selectedHero?.id ?? 'unknown');
                  const record: RunRecord = {
                    chapterId: chapter.id,
                    heroId,
                    score,
                    shardsCollected: stats.shardsCollected,
                    ledgerTotal: stats.ledgerTotal,
                    hpRemaining: stats.hpRemaining,
                    difficulty,
                    date: new Date().toISOString(),
                  };
                  const oldBest = p.chapterBests?.[chapter.id] ?? 0;
                  setPrevBest(oldBest);
                  setLastRunRecord(record);
                  saveRunRecord(record);
                  setGameStatus('chapterComplete');
                },
                onGameOver: () => setGameStatus('gameover'),
              });
            },
          },
        };
        const game = new Phaser.Game(config);
        phaserGameRef.current = game;

        // Keep the canvas glued to its container across all environments (Phaser's
        // own RESIZE tracking is unreliable; some headless contexts never fire
        // ResizeObserver). Drive size from observer + resize event + rAF polls.
        let lastW = 0, lastH = 0;
        const syncSize = () => {
          const el = document.getElementById('phaser-canvas-container');
          if (!el || !game.scale) return;
          const cw = el.offsetWidth, ch = el.offsetHeight;
          if (cw < 1 || ch < 1) return;
          if (cw === lastW && ch === lastH) return;
          lastW = cw; lastH = ch;
          game.scale.resize(cw, ch);
        };
        let ro: ResizeObserver | null = null;
        if (container && typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(syncSize);
          ro.observe(container);
        }
        window.addEventListener('resize', syncSize);
        let fastPolls = 0;
        const fastPollId = window.setInterval(() => {
          syncSize();
          if (++fastPolls > 20) window.clearInterval(fastPollId);
        }, 50);
        const slowPollId = window.setInterval(syncSize, 250);

        resizeCleanupRef.current = () => {
          ro?.disconnect();
          window.removeEventListener('resize', syncSize);
          window.clearInterval(fastPollId);
          window.clearInterval(slowPollId);
        };
      })();
    }
    return () => {
      cancelled = true;
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [gameStatus, selectedHero, activeChapter]);

  // ─── QTE countdown ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeQte) return;
    const timer = setInterval(() => {
      setQteTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          activeQte.callback(false, 0);
          setActiveQte(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQte]);

  const handleQteResponse = (option: string) => {
    if (!activeQte) return;
    activeQte.callback(option === activeQte.boss.weaknessQTE.correctAnswer, activeQte.selectedDamage);
    setActiveQte(null);
  };

  const teardownGame = () => {
    if (phaserGameRef.current) { phaserGameRef.current.destroy(true); phaserGameRef.current = null; }
    setActiveQte(null);
    setActiveStory(null);
  };

  const returnToChapters = () => {
    teardownGame();
    setActiveChapter(null);
    setLastRunRecord(null);
    setGameStatus('chapters');
  };

  const openRecords = () => {
    teardownGame();
    setActiveChapter(null);
    setLastRunRecord(null);
    setGameStatus('records');
  };

  const protagonist = activeChapter?.protagonistOverride
    ? (CHARACTER_CLASSES.find(c => c.id === activeChapter.protagonistOverride) ?? selectedHero)
    : selectedHero;

  if (isMobile) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: '#0c1208', fontFamily: 'Yoster, monospace', color: '#e8f5d0' }}>
        <div className="text-5xl mb-6">⌨️</div>
        <h1 className="text-2xl font-bold mb-3 font-display" style={{ color: '#c8e89a' }}>Mobile play isn't available yet</h1>
        <p className="text-sm opacity-70 max-w-xs leading-relaxed" style={{ color: '#8aaa60' }}>
          Project Omega requires a keyboard to play.<br />
          Open it on a laptop or desktop to jump in.
        </p>
        <div className="mt-8 px-4 py-2 text-xs font-mono opacity-40" style={{ border: '1px solid #2a3d18', color: '#8aaa60' }}>
          WASD · SPACE · 1–9
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: '#0c1208', fontFamily: 'Yoster, monospace', color: '#e8f5d0' }}>

      {/* Header */}
      <header className="h-12 px-6 flex items-center justify-between shrink-0 border-b" style={{ background: '#111c0a', borderColor: '#2a3d18' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🌿</span>
          <div>
            <span className="text-sm font-bold tracking-wide font-display" style={{ color: '#c8e89a' }}>Project Omega</span>
            <span className="text-xs ml-2 opacity-50" style={{ color: '#8aaa60' }}>The Rockville Syndicate</span>
          </div>
        </div>
        {gameStatus === 'playing' && protagonist && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span style={{ color: '#8aaa60' }}>HP</span>
              <div className="w-28 h-2 overflow-hidden" style={{ background: '#1a2e10', border: '1px solid #2a3d18' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.max(0, (playerHp / protagonist.maxHp) * 100)}%`,
                    background: playerHp / protagonist.maxHp > 0.5 ? '#4ade80' : playerHp / protagonist.maxHp > 0.25 ? '#facc15' : '#ef4444',
                    boxShadow: '0 0 6px currentColor'
                  }}
                />
              </div>
              <span style={{ color: '#e8f5d0' }}>{playerHp}/{protagonist.maxHp}</span>
            </div>
            <div className="flex items-center gap-1.5" title={ledger.note}>
              <span>🧾</span>
              <span className="font-bold" style={{ color: '#fbbf24' }}>
                The Ledger: ${ledger.total.toFixed(2)}
              </span>
            </div>
            <span className="opacity-70" style={{ color: '#8aaa60' }}>{activeChapter?.title}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playUi('click'); setShowSettings(true); }}
            className="text-base opacity-60 hover:opacity-100 transition-opacity"
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => {
              playUi('toggle');
              const next = !muted;
              updateSettings({ muted: next });
              if (phaserGameRef.current) phaserGameRef.current.sound.mute = next;
            }}
            className="text-base opacity-60 hover:opacity-100 transition-opacity"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 overflow-hidden relative">

        {/* Hero selection */}
        {gameStatus === 'hero' && (
          <div className="h-full overflow-y-auto flex flex-col items-center justify-center p-8" style={{ background: 'linear-gradient(180deg, #0c1208 0%, #0f1c09 100%)' }}>
            <div className="max-w-3xl w-full omega-fade-up">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🌿</div>
                <h2 className="text-2xl font-bold mb-1 font-display" style={{ color: '#c8e89a' }}>Choose your crew member</h2>
                <p className="text-sm opacity-60" style={{ color: '#8aaa60' }}>The Rockville Syndicate, Summer 2026</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {CHARACTER_CLASSES.map(hero => {
                  const selected = selectedHero?.id === hero.id;
                  return (
                    <button
                      key={hero.id}
                      onClick={() => { playUi('pick'); handleSelectHero(hero); }}
                      className="text-left p-5 border-2 transition-all duration-200 cursor-pointer relative overflow-hidden"
                      style={{
                        background: selected ? `${hero.color}18` : '#142012',
                        borderColor: selected ? hero.color : '#2a3d18',
                        boxShadow: selected ? `0 0 24px ${hero.color}44` : 'none'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{hero.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-bold text-base font-display" style={{ color: selected ? hero.color : '#c8e89a' }}>{hero.name}</h3>
                            <span className="text-xs font-mono shrink-0" style={{ color: '#8aaa60' }}>BIQ {hero.biq}</span>
                          </div>
                          <p className="text-xs mb-2 opacity-70" style={{ color: '#c8e89a' }}>{hero.title}</p>
                          <p className="text-xs leading-relaxed opacity-60" style={{ color: '#c8e89a' }}>{hero.description}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#2a3d18' }}>
                        <span className="text-[10px] font-mono" style={{ color: hero.color }}>RELIC: {hero.relicName}</span>
                      </div>
                      {selected && (
                        <div className="absolute top-2 right-2 w-2 h-2" style={{ background: hero.color }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedHero && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs opacity-60" style={{ color: '#8aaa60' }}>
                    <kbd className="px-1 py-0.5 text-xs font-mono" style={{ background: '#1a2e10', border: '1px solid #3a5520' }}>WASD</kbd> to walk ·
                    follow the <span style={{ color: '#fbbf24' }}>✦ markers</span> · the story does the rest
                  </p>
                  <button
                    onClick={() => { playUi('click'); handleStartStory(); }}
                    className="flex items-center gap-2 px-8 py-3 font-bold text-sm tracking-wide cursor-pointer"
                    style={{ background: selectedHero.color, color: '#0c1208' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <Play size={14} fill="currentColor" />
                    Begin the Story
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chapter selection */}
        {gameStatus === 'chapters' && selectedHero && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 flex justify-end px-4 pt-3">
              <button
                onClick={() => { playUi('click'); setGameStatus('records'); }}
                className="font-pixel text-[9px] px-3 py-1.5 transition-colors cursor-pointer"
                style={{ background: '#0f1c09', border: '1px solid #2a3d18', color: '#8aaa60' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = selectedHero.color; e.currentTarget.style.color = selectedHero.color; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a3d18'; e.currentTarget.style.color = '#8aaa60'; }}
              >
                🏆 Hall of Records
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChapterSelect
                heroColor={selectedHero.color}
                completed={completedChapters}
                freePlay={freePlay}
                onFreePlayChange={(next: boolean) => { setFreePlayState(next); persistFreePlay(next); }}
                onPick={handlePickChapter}
              />
            </div>
          </div>
        )}

        {/* Playing */}
        {gameStatus === 'playing' && selectedHero && activeChapter && (
          <div className="absolute inset-0">
            <div id="phaser-canvas-container" className="w-full h-full" />

            {/* QTE modal — 8-bit style */}
            {activeQte && (
              <div className="absolute inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(8,12,6,0.92)', backdropFilter: 'blur(2px)' }}>
                <div className="w-full max-w-lg pixel-panel p-5 shadow-2xl" style={{ borderColor: '#facc15', boxShadow: 'inset 0 0 0 3px #0a1006, inset 0 0 0 6px #facc1566' }}>
                  {/* Timer bar */}
                  <div className="w-full h-3 mb-4 overflow-hidden" style={{ background: '#1a2e10', border: '2px solid #3a5520' }}>
                    <div
                      className="h-full transition-all duration-1000"
                      style={{ width: `${(qteTimer / 8) * 100}%`, background: '#facc15', imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-3" style={{ color: '#facc15' }}>
                    <img src={shieldImg} alt="⚔" width={20} height={20} style={{ imageRendering: 'pixelated' }} />
                    <span className="font-pixel text-[10px] uppercase">Syndicate Challenge! {qteTimer}s</span>
                  </div>
                  <p className="font-pixel text-[10px] mb-4 leading-loose" style={{ color: '#e8f5d0' }}>
                    {activeQte.boss.weaknessQTE.question}
                  </p>
                  <div className="space-y-2">
                    {activeQte.boss.weaknessQTE.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => { playUi('pick'); handleQteResponse(option); }}
                        className="w-full text-left px-3 py-2 cursor-pointer transition-colors duration-100 font-pixel text-[10px]"
                        style={{ background: '#0f1c09', border: '2px solid #3a5520', color: '#c8e89a' }}
                        onMouseEnter={e => {
                          playUi('hover', 0.2);
                          e.currentTarget.style.borderColor = '#facc15';
                          e.currentTarget.style.color = '#facc15';
                          e.currentTarget.style.background = '#1a2e10';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#3a5520';
                          e.currentTarget.style.color = '#c8e89a';
                          e.currentTarget.style.background = '#0f1c09';
                        }}
                      >
                        {idx + 1}. {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* External Minigame Bridge */}
            {activeExternalGame && (
              <ExternalGameFrame
                gameId={activeExternalGame.gameId}
                config={activeExternalGame.config}
                onDone={activeExternalGame.onDone}
                onCancel={() => {
                  activeExternalGame.onDone({ outcome: 'skip' });
                }}
              />
            )}

            {/* Story dialogue / choices */}
            {activeStory && (
              <DialogueBox
                speakerName={activeStory.payload.speakerName}
                speakerEmoji={activeStory.payload.speakerEmoji}
                speakerColor={activeStory.payload.speakerColor}
                portraitDataUrl={activeStory.payload.portraitDataUrl}
                lines={activeStory.payload.lines}
                lineIndex={activeStory.lineIndex}
                choices={
                  activeStory.lineIndex >= activeStory.payload.lines.length - 1
                    ? activeStory.payload.choices
                    : undefined
                }
                muted={muted}
                onNext={advanceStory}
                onChoose={chooseStory}
              />
            )}

            {/* Chapter title card — overlays the game canvas on chapter start */}
            {titleCard && (
              <div
                className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
                style={{
                  background: 'rgba(0,0,0,0.88)',
                  opacity: titleCardVisible ? 1 : 0,
                  transition: titleCardVisible
                    ? 'opacity 0.55s ease-out'
                    : 'opacity 0.65s ease-in',
                }}
              >
                <div className="text-center px-8" style={{ maxWidth: 560 }}>
                  <p
                    className="text-xs font-mono tracking-[0.25em] mb-3"
                    style={{ color: selectedHero?.color ?? '#8aaa60' }}
                  >
                    {titleCard.kind}
                  </p>
                  <h1
                    className="font-bold mb-3 leading-tight"
                    style={{
                      fontSize: 'clamp(1.4rem, 4vw, 2.4rem)',
                      color: '#f1f5f9',
                      textShadow: `0 0 40px ${selectedHero?.color ?? '#8aaa60'}88`,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {titleCard.title}
                  </h1>
                  {titleCard.subtitle && (
                    <p className="text-sm mb-4 opacity-70" style={{ color: '#c8e89a' }}>
                      {titleCard.subtitle}
                    </p>
                  )}
                  <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-mono"
                    style={{ background: `${selectedHero?.color ?? '#8aaa60'}22`, border: `2px solid ${selectedHero?.color ?? '#8aaa60'}88`, color: selectedHero?.color ?? '#8aaa60' }}
                  >
                    <span>📍</span>
                    <span>{titleCard.location}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chapter complete — score summary */}
        {gameStatus === 'chapterComplete' && activeChapter && lastRunRecord && (() => {
          const rec = lastRunRecord;
          const isNewBest = rec.score > prevBest && prevBest > 0;
          const firstClear = prevBest === 0;
          const beatenIdx = ghostBeatenIndex(rec.score);
          const beatenGhost = beatenIdx >= 0 ? GHOST_TARGETS[beatenIdx] : null;
          const heroColor = selectedHero?.color ?? '#c8e89a';
          const diffLabel = rec.difficulty === 'easy' ? 'EASY ×0.75' : rec.difficulty === 'hard' ? 'HARD ×1.5' : 'NORMAL ×1.0';
          return (
            <div className="h-full overflow-y-auto flex flex-col items-center justify-center text-center p-8 omega-fade-up" style={{ background: '#0a1006' }}>
              <p className="font-pixel text-[9px] tracking-widest mb-2" style={{ color: '#8aaa60' }}>CHAPTER CLEARED</p>
              <h2 className="font-display text-xl font-bold mb-1" style={{ color: '#c8e89a' }}>{activeChapter.title}</h2>
              <p className="text-[10px] font-mono mb-5" style={{ color: '#8aaa60' }}>{diffLabel}</p>

              {/* Score readout */}
              <div className="pixel-panel p-5 w-full mb-4" style={{ maxWidth: 400, borderColor: heroColor }}>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="font-pixel text-[9px]" style={{ color: '#8aaa60' }}>RUN SCORE</span>
                  <span className="font-display text-3xl font-bold" style={{ color: heroColor, textShadow: `0 0 20px ${heroColor}88` }}>
                    {rec.score.toLocaleString()}
                  </span>
                </div>
                {/* Breakdown */}
                <div className="space-y-1 text-left border-t pt-3" style={{ borderColor: '#2a3d18' }}>
                  {[
                    ['Shards collected', `${rec.shardsCollected} × 200`, rec.shardsCollected * 200],
                    ['HP remaining', `${rec.hpRemaining} × 10`, Math.max(0, rec.hpRemaining) * 10],
                    ['Ledger balance', `$${rec.ledgerTotal.toFixed(2)} × 5`, Math.max(0, Math.round(rec.ledgerTotal * 5))],
                  ].map(([label, formula, pts]) => (
                    <div key={label as string} className="flex justify-between font-pixel text-[9px]">
                      <span style={{ color: '#8aaa60' }}>{label as string}</span>
                      <span style={{ color: '#c8e89a' }}>{formula as string} = <strong style={{ color: '#e8f5d0' }}>{(pts as number).toLocaleString()}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal best comparison */}
              <div className="pixel-panel p-4 w-full mb-4" style={{ maxWidth: 400, borderColor: '#2a3d18' }}>
                <div className="flex justify-between font-pixel text-[9px] mb-1">
                  <span style={{ color: '#8aaa60' }}>PERSONAL BEST</span>
                  <span style={{ color: firstClear ? '#facc15' : isNewBest ? '#4ade80' : '#c8e89a' }}>
                    {firstClear ? `NEW! ${rec.score.toLocaleString()}` : isNewBest ? `NEW BEST! ${rec.score.toLocaleString()}` : prevBest.toLocaleString()}
                  </span>
                </div>
                {/* Ghost targets */}
                <div className="border-t pt-2 mt-2" style={{ borderColor: '#2a3d18' }}>
                  {GHOST_TARGETS.slice(0, 3).map((g, i) => {
                    const beaten = rec.score > g.score;
                    return (
                      <div key={g.initials} className="flex justify-between font-pixel text-[9px] py-0.5">
                        <span style={{ color: beaten ? '#4ade80' : '#3a5520' }}>
                          {beaten ? '✓' : ' '} #{i + 1} {g.initials}
                        </span>
                        <span style={{ color: beaten ? '#4ade80' : '#3a5520' }}>{g.score.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ghost bark */}
              {beatenGhost && (
                <div className="font-pixel text-[9px] mb-4 px-4 py-2" style={{ background: '#0f2e18', border: '1px solid #4ade80', color: '#4ade80', maxWidth: 400, width: '100%' }}>
                  YOU BEAT {beatenGhost.initials}'s SCORE! The Syndicate takes notice.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { playUi('back'); returnToChapters(); }}
                  className="px-6 py-3 font-pixel text-[10px] cursor-pointer transition-all"
                  style={{ background: heroColor, color: '#0c1208', border: '2px solid #0c1208', imageRendering: 'pixelated' }}
                >
                  ▶ CONTINUE
                </button>
                <button
                  onClick={() => { playUi('click'); openRecords(); }}
                  className="px-6 py-3 font-pixel text-[10px] cursor-pointer transition-all"
                  style={{ background: '#0f1c09', border: `2px solid ${heroColor}66`, color: '#8aaa60', imageRendering: 'pixelated' }}
                >
                  🏆 HALL OF RECORDS
                </button>
              </div>
            </div>
          );
        })()}

        {/* Hall of Records */}
        {gameStatus === 'records' && (() => {
          const records = getRunRecords();
          const heroColor = selectedHero?.color ?? '#c8e89a';
          // Group personal bests by chapter
          const bestByChapter: Record<string, RunRecord> = {};
          for (const r of [...records].reverse()) {
            if (!bestByChapter[r.chapterId] || r.score > bestByChapter[r.chapterId].score) {
              bestByChapter[r.chapterId] = r;
            }
          }
          const bests = Object.values(bestByChapter).sort((a, b) => b.score - a.score);
          const allTimeTotal = bests.reduce((sum, r) => sum + r.score, 0);
          return (
            <div className="h-full overflow-y-auto flex flex-col items-center p-8 omega-fade-up" style={{ background: '#0a1006' }}>
              <div className="w-full" style={{ maxWidth: 560 }}>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🏆</div>
                  <h2 className="font-display text-2xl font-bold mb-1" style={{ color: '#c8e89a' }}>Hall of Records</h2>
                  <p className="font-pixel text-[9px]" style={{ color: '#8aaa60' }}>THE ROCKVILLE SYNDICATE · ALL-TIME</p>
                </div>

                {/* Ghost leaderboard */}
                <div className="pixel-panel p-4 mb-4" style={{ borderColor: '#facc15' }}>
                  <p className="font-pixel text-[9px] tracking-widest mb-3" style={{ color: '#facc15' }}>SYNDICATE GHOST SCORES</p>
                  {GHOST_TARGETS.map((g, i) => {
                    const myBest = bests[0]?.score ?? 0;
                    const beaten = myBest > g.score;
                    return (
                      <div key={g.initials} className="flex justify-between items-center font-pixel text-[9px] py-1 border-b" style={{ borderColor: '#1a2e10' }}>
                        <span style={{ color: beaten ? '#4ade80' : '#8aaa60' }}>
                          #{i + 1}  {beaten ? '✓ ' : ''}{g.initials}
                        </span>
                        <span style={{ color: beaten ? '#4ade80' : '#facc15' }}>{g.score.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {bests[0] && (
                    <div className="flex justify-between items-center font-pixel text-[9px] py-1 mt-1" style={{ borderTop: '1px solid #2a3d18' }}>
                      <span style={{ color: heroColor }}>▶ YOU (best run)</span>
                      <span style={{ color: heroColor }}>{bests[0].score.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Per-chapter personal bests */}
                <div className="pixel-panel p-4 mb-4" style={{ borderColor: '#2a3d18' }}>
                  <p className="font-pixel text-[9px] tracking-widest mb-3" style={{ color: '#8aaa60' }}>YOUR CHAPTER BESTS</p>
                  {bests.length === 0 && (
                    <p className="font-pixel text-[9px]" style={{ color: '#3a5520' }}>No runs recorded yet. Complete a chapter to start.</p>
                  )}
                  {bests.map(r => (
                    <div key={r.chapterId} className="flex justify-between items-center font-pixel text-[9px] py-1 border-b" style={{ borderColor: '#1a2e10' }}>
                      <span style={{ color: '#c8e89a' }}>{r.chapterId.replace('ch', 'Ch. ')}</span>
                      <div className="flex items-center gap-3">
                        <span style={{ color: '#3a5520' }}>{r.difficulty}</span>
                        <span style={{ color: heroColor }}>{r.score.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {bests.length > 0 && (
                    <div className="flex justify-between font-pixel text-[9px] pt-2 mt-1" style={{ borderTop: '1px solid #2a3d18' }}>
                      <span style={{ color: '#8aaa60' }}>ALL-TIME TOTAL</span>
                      <span style={{ color: heroColor, fontWeight: 'bold' }}>{allTimeTotal.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => { playUi('back'); setGameStatus(activeChapter ? 'chapters' : 'chapters'); setActiveChapter(null); }}
                    className="px-8 py-3 font-pixel text-[10px] cursor-pointer transition-all"
                    style={{ background: '#0f1c09', border: `2px solid ${heroColor}66`, color: '#8aaa60', imageRendering: 'pixelated' }}
                  >
                    ◀ BACK
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Game Over — 8-bit style */}
        {gameStatus === 'gameover' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8" style={{ background: '#0a0606' }}>
            <div className="text-5xl mb-4">💀</div>
            <div className="pixel-panel-dark p-6 max-w-sm w-full mb-6" style={{ borderColor: '#ef4444', boxShadow: 'inset 0 0 0 3px #0a0606, inset 0 0 0 6px #ef444466' }}>
              <h2 className="font-display text-xl font-bold mb-3" style={{ color: '#ef4444' }}>Social Collapse</h2>
              <p className="font-pixel text-[9px] leading-loose mb-2" style={{ color: '#c8e89a' }}>
                You failed to verify your liquid reserves.
              </p>
              <p className="font-pixel text-[9px] leading-loose" style={{ color: '#6b7280' }}>
                Jacob has blocked you.<br />Nick F cancelled the cabin to fly to Spain.
              </p>
            </div>
            <button
              onClick={() => { playUi('back'); returnToChapters(); }}
              className="px-8 py-3 font-pixel text-[10px] cursor-pointer transition-all"
              style={{ background: '#0f1c09', border: '2px solid #ef4444', color: '#ef4444', imageRendering: 'pixelated' }}
            >
              ▶ RETRY
            </button>
          </div>
        )}

      </div>

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.80)' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            className="p-6 w-full mx-4"
            style={{ background: '#111c0a', border: '1px solid #2a3d18', color: '#e8f5d0', maxWidth: 420, maxHeight: '82vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <span className="font-bold text-sm font-display" style={{ color: '#c8e89a' }}>Settings</span>
              </div>
              <button onClick={() => setShowSettings(false)} className="opacity-50 hover:opacity-100 transition-opacity text-sm">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5">
              {(['audio', 'gameplay', 'access', 'controls'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  className="flex-1 py-1.5 text-[9px] font-mono uppercase tracking-wide transition-colors cursor-pointer"
                  style={{
                    background: settingsTab === tab ? '#1a2e10' : '#0c1208',
                    border: '1px solid',
                    borderColor: settingsTab === tab ? '#4ade80' : '#2a3d18',
                    color: settingsTab === tab ? '#c8e89a' : '#8aaa60',
                  }}
                >
                  {tab === 'access' ? 'A11y' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* ── Audio ─────────────────────────────────────────────── */}
            {settingsTab === 'audio' && (
              <div className="space-y-4">
                {([
                  ['Master', 'masterVolume'],
                  ['Music', 'musicVolume'],
                  ['SFX', 'sfxVolume'],
                ] as const).map(([label, key]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span style={{ color: '#8aaa60' }}>{label}</span>
                      <span style={{ color: '#c8e89a' }}>{Math.round(settings[key] * 100)}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100}
                      value={Math.round(settings[key] * 100)}
                      onChange={e => updateSettings({ [key]: parseInt(e.target.value) / 100 })}
                      className="w-full cursor-pointer"
                      style={{ accentColor: '#4ade80' }}
                    />
                  </div>
                ))}
                <label className="flex items-center gap-3 text-xs font-mono cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={settings.muted}
                    onChange={e => {
                      const next = e.target.checked;
                      updateSettings({ muted: next });
                      if (phaserGameRef.current) phaserGameRef.current.sound.mute = next;
                    }}
                    style={{ accentColor: '#4ade80' }}
                  />
                  <span style={{ color: '#8aaa60' }}>Mute all audio</span>
                </label>
                <p className="text-[9px] font-mono pt-1" style={{ color: '#3a5520' }}>
                  Volume changes take effect on next chapter load.
                </p>
              </div>
            )}

            {/* ── Gameplay ──────────────────────────────────────────── */}
            {settingsTab === 'gameplay' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-mono mb-2" style={{ color: '#8aaa60' }}>Difficulty</p>
                  <div className="flex gap-1.5">
                    {(['easy', 'normal', 'hard'] as const).map(d => {
                      const accent = d === 'easy' ? '#4ade80' : d === 'hard' ? '#ef4444' : '#facc15';
                      const active = settings.difficulty === d;
                      return (
                        <button
                          key={d}
                          onClick={() => updateSettings({ difficulty: d })}
                          className="flex-1 py-2 text-[10px] font-mono uppercase tracking-wide transition-colors cursor-pointer"
                          style={{
                            background: active ? `${accent}22` : '#0c1208',
                            border: '2px solid',
                            borderColor: active ? accent : '#2a3d18',
                            color: active ? accent : '#8aaa60',
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono mt-2" style={{ color: '#8aaa60', opacity: 0.7 }}>
                    {settings.difficulty === 'easy' && 'Bosses hit softer · more power-up drops · telegraphs last longer.'}
                    {settings.difficulty === 'normal' && 'Balanced. The Syndicate plays fair.'}
                    {settings.difficulty === 'hard' && 'Boss HP +35% · attacks faster · QTE timers tighter.'}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span style={{ color: '#8aaa60' }}>Text Speed</span>
                    <span style={{ color: '#c8e89a' }}>
                      {settings.textSpeedMs === 0
                        ? 'Instant'
                        : settings.textSpeedMs <= 14
                        ? 'Fast'
                        : settings.textSpeedMs <= 35
                        ? 'Normal'
                        : 'Slow'}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100}
                    value={100 - Math.round((settings.textSpeedMs / 200) * 100)}
                    onChange={e => updateSettings({ textSpeedMs: Math.round(((100 - parseInt(e.target.value)) / 100) * 200) })}
                    className="w-full cursor-pointer"
                    style={{ accentColor: '#4ade80' }}
                  />
                  <div className="flex justify-between text-[9px] font-mono mt-0.5" style={{ color: '#3a5520' }}>
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Accessibility ─────────────────────────────────────── */}
            {settingsTab === 'access' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono mb-2" style={{ color: '#8aaa60' }}>Text Scale</p>
                  <div className="flex gap-1.5">
                    {([1, 1.25, 1.5] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateSettings({ textScale: s })}
                        className="flex-1 py-2 text-[10px] font-mono transition-colors cursor-pointer"
                        style={{
                          background: settings.textScale === s ? '#1a2e10' : '#0c1208',
                          border: '2px solid',
                          borderColor: settings.textScale === s ? '#4ade80' : '#2a3d18',
                          color: settings.textScale === s ? '#c8e89a' : '#8aaa60',
                        }}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
                {([
                  { key: 'colorBlind' as const, label: 'Color-Blind Mode', hint: 'Adds patterns alongside color cues' },
                  { key: 'reduceMotion' as const, label: 'Reduce Motion', hint: 'Dampens screen shake, flashes, and big tweens' },
                ] as const).map(({ key, label, hint }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={e => updateSettings({ [key]: e.target.checked })}
                      style={{ accentColor: '#4ade80', marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div className="text-xs font-mono" style={{ color: '#c8e89a' }}>{label}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: '#8aaa60', opacity: 0.7 }}>{hint}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* ── Controls ──────────────────────────────────────────── */}
            {settingsTab === 'controls' && (
              <div className="space-y-3">
                {([
                  ['WASD / ↑↓←→', 'Move'],
                  ['SPACE / E / ENTER', 'Talk · Advance dialogue'],
                  ['1 – 9', 'Select dialogue choice'],
                  ['ESC', 'Back to chapter select'],
                  ['SHIFT + WASD', 'Dash (i-frames active)'],
                ] as const).map(([keys, action]) => (
                  <div key={keys} className="flex items-center justify-between gap-4">
                    <span
                      className="px-2 py-1 text-[10px] font-mono shrink-0"
                      style={{ background: '#0c1208', border: '1px solid #2a3d18', color: '#8aaa60', whiteSpace: 'nowrap' }}
                    >
                      {keys}
                    </span>
                    <span className="text-xs font-mono text-right" style={{ color: '#8aaa60', opacity: 0.7 }}>{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sound-on toast */}
      {soundAlert && (
        <div
          className="omega-fade-up fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 text-xs font-mono pointer-events-none"
          style={{ background: '#111c0a', border: '1px solid #2a3d18', color: '#8aaa60' }}
        >
          <span>🔇</span>
          <span>Sound is off — click <strong style={{ color: '#c8e89a' }}>🔊</strong> in the header to unmute</span>
        </div>
      )}
    </div>
  );
}
