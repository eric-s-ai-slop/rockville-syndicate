import { useState, useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import ChapterScene, { StoryDialoguePayload } from '../game/ChapterScene';
import { CHARACTER_CLASSES, CharacterClass, BossConfig } from '../data';
import { ChapterConfig } from '../data/chapters';
import { loadProgress, markChapterComplete, rememberHero } from '../game/progress';
import { ShieldAlert, Play } from 'lucide-react';
import DialogueBox from './DialogueBox';
import ChapterSelect from './ChapterSelect';

type GameStatus = 'hero' | 'chapters' | 'playing' | 'chapterComplete' | 'gameover';

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

  const [activeQte, setActiveQte] = useState<{
    boss: BossConfig;
    callback: (success: boolean) => void;
  } | null>(null);
  const [qteTimer, setQteTimer] = useState(8);

  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [titleCard, setTitleCard] = useState<TitleCardData | null>(null);
  const [titleCardVisible, setTitleCardVisible] = useState(false);

  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  // Phaser captures this once at boot — route through a ref so it always calls
  // the latest handler.
  const storyRef = useRef<(payload: StoryDialoguePayload, done: (i?: number) => void) => void>(() => {});

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
    // Fade out card after 2.8s total (0.6 in + 1.6 hold + 0.6 out via CSS)
    setTimeout(() => setTitleCardVisible(false), 2200);
    setTimeout(() => setTitleCard(null), 2900);
  };

  // ─── Story dialogue handling ────────────────────────────────────────────────

  const handleStoryDialogue = useCallback(
    (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => {
      setActiveStory({ payload, done, lineIndex: 0 });
    },
    []
  );
  useEffect(() => {
    storyRef.current = handleStoryDialogue;
  }, [handleStoryDialogue]);

  const advanceStory = () => {
    setActiveStory(prev => {
      if (!prev) return null;
      const last = prev.lineIndex >= prev.payload.lines.length - 1;
      if (last) {
        // On the last line: if there are choices, wait for a pick; otherwise finish.
        if (prev.payload.choices && prev.payload.choices.length) return prev;
        prev.done();
        return null;
      }
      return { ...prev, lineIndex: prev.lineIndex + 1 };
    });
  };

  const chooseStory = (idx: number) => {
    setActiveStory(prev => {
      if (!prev) return null;
      prev.done(idx);
      return null;
    });
  };

  // ─── Phaser boot ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (gameStatus === 'playing' && selectedHero && activeChapter) {
      const container = document.getElementById('phaser-canvas-container');
      const w = container?.offsetWidth || window.innerWidth;
      const h = container?.offsetHeight || (window.innerHeight - 48);
      const chapter = activeChapter;
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
            if (import.meta.env.DEV) (window as unknown as { __OMEGA_GAME__?: Phaser.Game }).__OMEGA_GAME__ = game;
            game.scene.add('ChapterScene', ChapterScene, true, {
              hero: selectedHero,
              chapter,
              playerHp: selectedHero.maxHp,
              onHpChange: (hp: number) => setPlayerHp(hp),
              onTriggerQTE: (boss: BossConfig, callback: (success: boolean) => void) => {
                setQteTimer(8);
                setActiveQte({ boss, callback });
              },
              onStoryDialogue: (payload: StoryDialoguePayload, done: (i?: number) => void) =>
                storyRef.current(payload, done),
              onLedgerChange: (total: number, note: string) => setLedger({ total, note }),
              onChapterCompleted: () => {
                const p = markChapterComplete(chapter.id);
                setCompletedChapters(p.completedChapters);
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
    }
    return () => {
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
          activeQte.callback(false);
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
    activeQte.callback(option === activeQte.boss.weaknessQTE.correctAnswer);
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
    setGameStatus('chapters');
  };

  const protagonist = activeChapter?.protagonistOverride
    ? (CHARACTER_CLASSES.find(c => c.id === activeChapter.protagonistOverride) ?? selectedHero)
    : selectedHero;

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" style={{ background: '#0c1208', fontFamily: 'Inter, sans-serif', color: '#e8f5d0' }}>

      {/* Header */}
      <header className="h-12 px-6 flex items-center justify-between shrink-0 border-b" style={{ background: '#111c0a', borderColor: '#2a3d18' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🌿</span>
          <div>
            <span className="text-sm font-bold tracking-wide" style={{ color: '#c8e89a' }}>Project Omega</span>
            <span className="text-xs ml-2 opacity-50" style={{ color: '#8aaa60' }}>The Rockville Syndicate</span>
          </div>
        </div>
        {gameStatus === 'playing' && protagonist && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span style={{ color: '#8aaa60' }}>HP</span>
              <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: '#1a2e10' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
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
      </header>

      {/* Main */}
      <div className="flex-1 overflow-hidden relative">

        {/* Hero selection */}
        {gameStatus === 'hero' && (
          <div className="h-full overflow-y-auto flex flex-col items-center justify-center p-8" style={{ background: 'linear-gradient(180deg, #0c1208 0%, #0f1c09 100%)' }}>
            <div className="max-w-3xl w-full omega-fade-up">
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🌿</div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: '#c8e89a' }}>Choose your crew member</h2>
                <p className="text-sm opacity-60" style={{ color: '#8aaa60' }}>The Rockville Syndicate, Summer 2026</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {CHARACTER_CLASSES.map(hero => {
                  const selected = selectedHero?.id === hero.id;
                  return (
                    <button
                      key={hero.id}
                      onClick={() => handleSelectHero(hero)}
                      className="text-left p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden"
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
                            <h3 className="font-bold text-base" style={{ color: selected ? hero.color : '#c8e89a' }}>{hero.name}</h3>
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
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: hero.color }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedHero && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs opacity-60" style={{ color: '#8aaa60' }}>
                    <kbd className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: '#1a2e10', border: '1px solid #3a5520' }}>WASD</kbd> to walk ·
                    follow the <span style={{ color: '#fbbf24' }}>✦ markers</span> · the story does the rest
                  </p>
                  <button
                    onClick={handleStartStory}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-150 cursor-pointer"
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
          <ChapterSelect
            heroColor={selectedHero.color}
            completed={completedChapters}
            onPick={handlePickChapter}
          />
        )}

        {/* Playing */}
        {gameStatus === 'playing' && selectedHero && activeChapter && (
          <div className="absolute inset-0">
            <div id="phaser-canvas-container" className="w-full h-full" />

            {/* QTE modal */}
            {activeQte && (
              <div className="absolute inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(12,18,8,0.85)', backdropFilter: 'blur(4px)' }}>
                <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border-2" style={{ background: '#111c0a', borderColor: '#facc15' }}>
                  <div className="w-full h-1 rounded-full mb-5 overflow-hidden" style={{ background: '#1a2e10' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(qteTimer / 8) * 100}%`, background: '#facc15' }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-mono" style={{ color: '#facc15' }}>
                    <ShieldAlert size={14} />
                    <span className="uppercase tracking-widest font-bold">Syndicate Challenge! {qteTimer}s</span>
                  </div>
                  <p className="text-sm font-medium mb-5 leading-relaxed" style={{ color: '#e8f5d0' }}>
                    {activeQte.boss.weaknessQTE.question}
                  </p>
                  <div className="space-y-2">
                    {activeQte.boss.weaknessQTE.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQteResponse(option)}
                        className="w-full text-left p-3 rounded-xl text-sm transition-all duration-150 cursor-pointer border"
                        style={{ background: '#1a2e10', borderColor: '#3a5520', color: '#c8e89a' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#facc15';
                          e.currentTarget.style.color = '#facc15';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#3a5520';
                          e.currentTarget.style.color = '#c8e89a';
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono"
                    style={{ background: `${selectedHero?.color ?? '#8aaa60'}22`, border: `1px solid ${selectedHero?.color ?? '#8aaa60'}55`, color: selectedHero?.color ?? '#8aaa60' }}
                  >
                    <span>📍</span>
                    <span>{titleCard.location}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chapter complete interstitial */}
        {gameStatus === 'chapterComplete' && activeChapter && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 omega-fade-up">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xs font-mono tracking-widest mb-1" style={{ color: '#8aaa60' }}>CHAPTER CLEARED</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#c8e89a' }}>{activeChapter.title}</h2>
            <p className="text-sm mb-8 opacity-60" style={{ color: '#8aaa60' }}>
              The Ledger remembers. ${ledger.total.toFixed(2)} on the books.
            </p>
            <button
              onClick={returnToChapters}
              className="px-8 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all"
              style={{ background: selectedHero?.color ?? '#c8e89a', color: '#0c1208' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Game Over */}
        {gameStatus === 'gameover' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">💀</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#ef4444' }}>Social Collapse</h2>
            <p className="text-sm mb-2 opacity-70" style={{ color: '#c8e89a' }}>
              You failed to verify your liquid reserves.
            </p>
            <p className="text-sm mb-8 opacity-50" style={{ color: '#8aaa60' }}>
              Jacob has blocked you. Nick F cancelled the cabin to fly to Spain.
            </p>
            <button
              onClick={returnToChapters}
              className="px-8 py-3 rounded-xl font-bold text-sm cursor-pointer border transition-all"
              style={{ background: '#1a2e10', borderColor: '#3a5520', color: '#c8e89a' }}
            >
              Return to Chapter Select
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
