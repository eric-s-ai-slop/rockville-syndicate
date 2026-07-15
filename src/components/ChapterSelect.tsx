import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lock, Play, Check, EyeOff, Clock } from 'lucide-react';
import { CHAPTERS, ChapterConfig, MapTheme } from '../data/chapters';
import { isChapterUnlocked, setFreePlay } from '../game/progress';
import { playUi } from '../game/uiSound';

function ShatterParticles({ palette = 'classified' }: { palette?: 'classified' | 'external' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 120 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 200;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const rot = (Math.random() - 0.5) * 1080;
      const sizeX = 8 + Math.random() * 20;
      const sizeY = 8 + Math.random() * 20;
      const isRed = Math.random() > 0.25;
      
      // Generate a sharp glass shard shape
      const p1 = `${Math.random()*30}% ${Math.random()*30}%`;
      const p2 = `${70+Math.random()*30}% ${Math.random()*30}%`;
      const p3 = `${70+Math.random()*30}% ${70+Math.random()*30}%`;
      const p4 = `${Math.random()*30}% ${70+Math.random()*30}%`;
      const clipPath = Math.random() > 0.5 
        ? `polygon(${p1}, ${p2}, ${p3})` // Triangle shard
        : `polygon(${p1}, ${p2}, ${p3}, ${p4})`; // Quad shard

      return { id: i, tx, ty, rot, sizeX, sizeY, isRed, x: 5 + Math.random() * 90, y: 5 + Math.random() * 90, clipPath };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.sizeX, height: p.sizeY,
            backgroundColor: palette === 'external'
              ? (p.isRed ? '#67e8f9' : '#a5b4fc')
              : (p.isRed ? '#ef4444' : '#ffffff'),
            opacity: mounted ? 0 : (p.isRed ? 1 : 0.6),
            clipPath: p.clipPath,
            transform: mounted ? `translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg) scale(0.2)` : 'translate(0,0) rotate(0deg) scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.6s ease-out',
          }}
        />
      ))}
    </div>
  );
}

function ExternalShatterFlash() {
  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{
        inset: '-18px -26px',
        border: '2px solid #a5f3fc',
        boxShadow: '0 0 0 3px #67e8f966, 0 0 42px #67e8f9cc',
        animation: 'omega-external-shatter 650ms cubic-bezier(0.12, 0.8, 0.25, 1) both',
      }}
    />
  );
}

const CrackOverlay = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-90 z-40" viewBox="0 0 800 150" preserveAspectRatio="none">
    <g stroke="#ef4444" fill="none" vectorEffect="non-scaling-stroke">
      {/* Left impact point: x=100, y=75 */}
      <path d="M 100 75 L 0 20 M 100 75 L 0 100 M 100 75 L 20 150 M 100 75 L 250 10 L 400 0 M 100 75 L 300 140 M 100 75 L 200 75 M 100 75 L 150 110" strokeWidth="1.5" />
      <path d="M 50 40 Q 80 20 150 40 M 20 110 Q 70 140 130 110 M 150 90 Q 200 60 250 80 M 130 60 Q 150 40 200 40" strokeWidth="0.5" strokeDasharray="3 3" />
      
      {/* Right impact point: x=700, y=50 */}
      <path d="M 700 50 L 800 0 M 700 50 L 800 90 M 700 50 L 750 150 M 700 50 L 500 0 L 400 0 M 700 50 L 550 120 M 700 50 L 600 60 M 700 50 L 650 90" strokeWidth="1.5" />
      <path d="M 750 25 Q 700 10 650 20 M 780 70 Q 750 120 680 90 M 650 70 Q 600 40 550 50 M 670 40 Q 650 20 600 20" strokeWidth="0.5" strokeDasharray="3 3" />
      
      {/* Connecting massive fracture across the center */}
      <path d="M 250 10 L 350 50 L 450 40 L 550 120" strokeWidth="2" />
      <path d="M 300 140 L 400 110 L 500 130 L 600 60" strokeWidth="1" />
      <path d="M 200 75 L 300 85 L 450 70 L 600 60" strokeWidth="1.5" strokeDasharray="5 2" />
    </g>
  </svg>
);

/**
 * Origins is sealed as an editorial boundary, not as an in-world classified
 * file. The frame deliberately escapes the card so the seal reads as larger
 * than the chapter-select UI itself.
 */
function ExternalCrackOverlay() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
      viewBox="0 0 800 150"
      preserveAspectRatio="none"
      style={{ animation: 'omega-external-impact 650ms ease-out both' }}
    >
      <g stroke="#a5f3fc" fill="none" vectorEffect="non-scaling-stroke">
        <path d="M 400 75 L 270 18 M 400 75 L 300 150 M 400 75 L 470 0 M 400 75 L 560 32 M 400 75 L 650 126" strokeWidth="2" />
        <path d="M 270 18 L 180 8 M 300 150 L 245 150 M 470 0 L 520 0 M 560 32 L 640 10 M 650 126 L 760 145" strokeWidth="1" />
        <circle cx="400" cy="75" r="12" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function ExternalBoundary({ cracked, impact }: { cracked: boolean; impact: boolean }) {
  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          inset: '-18px -26px',
          border: `1px ${cracked ? 'dashed' : 'solid'} ${cracked ? '#a5b4fc' : '#67e8f9'}`,
          opacity: impact ? 0.9 : cracked ? 0.62 : 0.42,
          boxShadow: impact
            ? '0 0 0 3px #cffafe, 0 0 50px #67e8f9aa'
            : cracked
            ? '0 0 0 1px #312e81, 0 0 28px #67e8f955'
            : '0 0 0 1px #164e63, 0 0 18px #67e8f933',
          transform: cracked ? 'rotate(0.7deg)' : 'rotate(-0.7deg)',
          animation: impact ? 'omega-external-impact 650ms ease-out both' : undefined,
        }}
      />
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: '-22px',
          right: '-22px',
          top: '8px',
          transform: 'rotate(-2.5deg)',
          borderTop: '1px solid #67e8f966',
          borderBottom: '1px solid #67e8f966',
          background: '#0b1220ee',
          color: '#a5f3fc',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 'clamp(8px, 1.15vw, 10px)',
          fontWeight: 700,
          letterSpacing: '0.2em',
          padding: '7px 4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textShadow: '0 0 10px #67e8fcaa',
          animation: impact ? 'omega-external-flash 650ms ease-out both' : undefined,
        }}
      >
        {cracked ? 'BOUNDARY BREACHED · OUTSIDE THE FRAME' : 'ARCHIVE EXISTS OUTSIDE THE GAME'}
      </div>
    </>
  );
}

interface ChapterSelectProps {
  heroColor: string;
  completed: string[];
  freePlay: boolean;
  onFreePlayChange: (enabled: boolean) => void;
  onPick: (chapter: ChapterConfig) => void;
}

const KIND_TAG: Record<ChapterConfig['kind'], string> = {
  chapter: 'CHAPTER',
  interlude: 'INTERLUDE',
  epilogue: 'EPILOGUE',
  flashback: 'FLASHBACK',
};

function formatPlaytime(chapter: ChapterConfig): string {
  const estimate = chapter.estimatedMinutes;
  if (!estimate) return `~${Math.max(1, Math.round(chapter.beats.length / 4))} min`;
  return `${estimate.min}–${estimate.max} min`;
}

// Chapters flagged `classified: true` use the in-world redaction treatment.
// `seal: 'external'` uses a separate boundary treatment for content that sits
// outside the game's fiction. Both use two interactions before play begins.
type SealState = 'intact' | 'cracked' | 'broken';

const THEME_COLOR: Record<MapTheme, string> = {
  apartment:     '#c8e89a',
  highway_night: '#22d3ee',
  hospital:      '#818cf8',
  park:          '#4ade80',
  florida:       '#f59e0b',
  suburb_night:  '#a78bfa',
  cabin:         '#d97706',
  pool_party:    '#38bdf8',
  void:          '#c8e89a',
};

const THEME_ICON: Record<MapTheme, string> = {
  apartment:     '🏠',
  highway_night: '🌃',
  hospital:      '🏥',
  park:          '🌳',
  florida:       '🌴',
  suburb_night:  '🌙',
  cabin:         '🪵',
  pool_party:    '🏊',
  void:          '💬',
};

export default function ChapterSelect({ heroColor, completed, freePlay, onFreePlayChange, onPick }: ChapterSelectProps) {
  const [localFreePlay, setLocalFreePlay] = useState(freePlay);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sealStates, setSealStates] = useState<Record<string, SealState>>({});
  const [justShattered, setJustShattered] = useState<string | null>(null);
  const [justCracked, setJustCracked] = useState<string | null>(null);

  const sealStateFor = useCallback((id: string): SealState => sealStates[id] ?? 'intact', [sealStates]);

  const interactSeal = useCallback((id: string) => {
    const state = sealStateFor(id);
    if (state === 'intact') {
      playUi('crack', 0.6);
      setSealStates(prev => ({ ...prev, [id]: 'cracked' }));
      setJustCracked(id);
      setTimeout(() => { setJustCracked(current => current === id ? null : current); }, 650);
    } else if (state === 'cracked') {
      playUi('shatter', 1.0);
      setSealStates(prev => ({ ...prev, [id]: 'broken' }));
      setJustShattered(id);
      setTimeout(() => { setJustShattered(null); }, 600);
    }
  }, [sealStateFor]);

  const toggleFreePlay = useCallback(() => {
    const next = !localFreePlay;
    setLocalFreePlay(next);
    setFreePlay(next);
    onFreePlayChange(next);
  }, [localFreePlay, onFreePlayChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(CHAPTERS.length - 1, prev + 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const ch = CHAPTERS[selectedIndex];
        if (!ch) return;
        const sealKind = ch.seal ?? (ch.classified ? 'classified' : undefined);
        if (sealKind && sealStateFor(ch.id) !== 'broken') {
          if (isChapterUnlocked(ch.id, completed, localFreePlay)) {
            interactSeal(ch.id);
          }
        } else if (isChapterUnlocked(ch.id, completed, localFreePlay)) {
          onPick(ch);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFreePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, completed, localFreePlay, onPick, sealStates, interactSeal, sealStateFor, toggleFreePlay]);

  return (
    <div
      className="h-full overflow-y-auto flex flex-col items-center p-8"
      style={{ background: 'linear-gradient(180deg, #0a1006 0%, #0c1208 60%, #0f1c09 100%)' }}
    >
      <div className="max-w-2xl w-full omega-fade-up">
        <div className="text-center mb-6 mt-2">
          <div className="text-3xl mb-2">📖</div>
          <h2 className="text-2xl font-bold mb-1 font-display" style={{ color: '#c8e89a' }}>
            The Rockville Syndicate
          </h2>
          <p className="text-sm opacity-60 mb-4" style={{ color: '#8aaa60' }}>
            A playable recollection. Pick where to begin.
          </p>
          {/* R7: Linear / Free Play toggle */}
          <div className="inline-flex items-center gap-0" style={{ background: '#0e1509', borderWidth: '2px', borderStyle: 'solid', borderColor: '#2a3d18' }}>
            <button
              onClick={() => {
                if (localFreePlay) {
                  playUi('toggle');
                  toggleFreePlay();
                }
              }}
              className="px-4 py-1.5 text-xs font-mono cursor-pointer"
              style={{
                background: !localFreePlay ? heroColor : 'transparent',
                color: !localFreePlay ? '#0c1208' : '#8aaa60',
                borderRight: '2px solid #2a3d18',
              }}
              title="Linear — chapters unlock in order"
            >
              LINEAR
            </button>
            <button
              onClick={() => {
                if (!localFreePlay) {
                  playUi('toggle');
                  toggleFreePlay();
                }
              }}
              className="px-4 py-1.5 text-xs font-mono cursor-pointer"
              style={{
                background: localFreePlay ? heroColor : 'transparent',
                color: localFreePlay ? '#0c1208' : '#8aaa60',
              }}
              title="Free Play — all chapters unlocked"
            >
              FREE PLAY
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {CHAPTERS.map((ch, idx) => {
            const isDone = completed.includes(ch.id);
            const sealKind = ch.seal ?? (ch.classified ? 'classified' : undefined);
            const isClassified = sealKind === 'classified';
            const isExternal = sealKind === 'external';
            const isSpecial = isClassified || isExternal;
            const specialAccent = isClassified ? '#eab308' : '#67e8f9';
            const chapterTag = isExternal ? 'META' : KIND_TAG[ch.kind];
            const playtime = formatPlaytime(ch);
            const isFlashback = ch.kind === 'flashback';
            const prevIsFlashback = idx > 0 && CHAPTERS[idx - 1].kind === 'flashback';
            const flashbackBadge = isFlashback
              ? `F${CHAPTERS.slice(0, idx + 1).filter(c => c.kind === 'flashback').length}`
              : null;
            // Section header nodes injected before the first flashback and first mainline chapter
            const sectionHeader = isExternal ? (
              <div key="header-meta" className="flex items-center gap-3 pt-2 pb-0">
                <div className="flex-1 h-px" style={{ background: '#164e63' }} />
                <span className="text-[9px] font-mono tracking-[0.3em]" style={{ color: '#67e8f9' }}>META</span>
                <div className="flex-1 h-px" style={{ background: '#164e63' }} />
              </div>
            ) : isFlashback && idx === 0 ? (
              <div key={`header-flashbacks`} className="flex items-center gap-3 pt-1 pb-0">
                <div className="flex-1 h-px" style={{ background: '#2a3d18' }} />
                <span className="text-[9px] font-mono tracking-[0.3em]" style={{ color: '#4a5a30' }}>FLASHBACKS</span>
                <div className="flex-1 h-px" style={{ background: '#2a3d18' }} />
              </div>
            ) : (!isFlashback && prevIsFlashback) ? (
              <div key={`header-main`} className="flex items-center gap-3 pt-1 pb-0">
                <div className="flex-1 h-px" style={{ background: '#2a3d18' }} />
                <span className="text-[9px] font-mono tracking-[0.3em]" style={{ color: '#4a5a30' }}>MAIN STORY</span>
                <div className="flex-1 h-px" style={{ background: '#2a3d18' }} />
              </div>
            ) : null;
            const sealed = !!sealKind && sealStateFor(ch.id) !== 'broken';
            const logicallyUnlocked = isChapterUnlocked(ch.id, completed, localFreePlay);
            const unlocked = logicallyUnlocked;
            const isSelected = selectedIndex === idx;

            // External boundary entry — its frame intentionally exceeds the card.
            if (isExternal && sealed) {
              const cracked = sealStateFor(ch.id) === 'cracked';
              return (
                <div key={ch.id} className="contents">
                {sectionHeader}
                <button
                  disabled={!logicallyUnlocked}
                  aria-label={`${ch.title} — external seal`}
                  onClick={() => {
                    if (logicallyUnlocked) interactSeal(ch.id);
                  }}
                  className="text-left p-5 transition-all duration-200 relative"
                  style={{
                    background: '#090f1c',
                    borderWidth: '1px', borderStyle: 'solid',
                    borderColor: isSelected ? '#67e8f9' : '#164e63',
                    cursor: logicallyUnlocked ? 'pointer' : 'not-allowed',
                    opacity: logicallyUnlocked ? 1 : 0.5,
                    overflow: 'visible',
                    boxShadow: isSelected ? '0 0 0 2px #67e8f9, 0 0 28px #67e8f955' : 'none',
                    transform: cracked
                      ? 'translateX(2px) rotate(0.6deg)'
                      : isSelected ? 'translateX(4px) scale(1.015)' : 'none',
                  }}
                  onMouseEnter={() => { setSelectedIndex(idx); if (logicallyUnlocked) playUi('hover', 0.2); }}
                >
                  <ExternalBoundary cracked={cracked} impact={justCracked === ch.id} />
                  {justCracked === ch.id && <ExternalCrackOverlay />}
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: '#0e2a3a', color: '#67e8f9' }}
                    >
                      <Lock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono tracking-widest mb-1.5" style={{ color: '#67e8f9' }}>
                        ■ META ARCHIVE
                      </div>
                      <div className="h-3 mb-1.5" style={{ width: '66%', background: '#cffafe', opacity: 0.2 }} />
                      <div className="h-2.5" style={{ width: '48%', background: '#cffafe', opacity: 0.12 }} />
                      <p className="text-xs mt-1" style={{ color: '#7dd3fc', opacity: 0.72 }}>
                        Title withheld beyond the game's frame. · {playtime}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-mono tracking-wider px-2 py-1"
                      style={{ color: '#67e8f9', borderWidth: '1px', borderStyle: 'solid', borderColor: '#67e8f966' }}
                    >
                      {cracked ? 'CROSS THE FRAME' : 'TOUCH OUTER SEAL'}
                    </span>
                  </div>
                </button>
                </div>
              );
            }

            // Redacted CLASSIFIED entry — clicks break the seal.
            if (sealed) {
              const cracked = sealStateFor(ch.id) === 'cracked';
              return (
                <div key={ch.id} className="contents">
                {sectionHeader}
                <button
                  disabled={!logicallyUnlocked}
                  onClick={() => {
                    if (logicallyUnlocked) interactSeal(ch.id);
                  }}
                  className="text-left p-5 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: '#120a0a',
                    borderWidth: '1px', borderStyle: 'solid',
                    borderColor: isSelected ? '#ef4444' : '#3a1a1a',
                    cursor: logicallyUnlocked ? 'pointer' : 'not-allowed',
                    opacity: logicallyUnlocked ? 1 : 0.5,
                    boxShadow: isSelected ? '0 0 0 2px #ef4444, 0 0 22px #ef444466' : 'none',
                    transform: cracked
                        ? 'translateX(2px) rotate(1deg)'
                        : isSelected ? 'translateX(4px) scale(1.015)' : 'none',
                  }}
                  onMouseEnter={() => { setSelectedIndex(idx); if (logicallyUnlocked) playUi('hover', 0.2); }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: '#ef4444', opacity: 0.6 }} />
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-12"
                  >
                    <span
                      className="font-mono font-bold tracking-[0.3em] text-2xl"
                      style={{ color: '#ef4444', transform: 'rotate(-8deg)' }}
                    >
                      {cracked ? (
                        <>
                          <span style={{ display: 'inline-block', transform: 'translateY(-2px) translateX(-2px) rotate(-3deg)' }}>CLAS</span>
                          <span style={{ display: 'inline-block', transform: 'translateY(3px) translateX(2px) rotate(4deg)' }}>SIFIED</span>
                        </>
                      ) : (
                        'CLASSIFIED'
                      )}
                    </span>
                  </div>

                  {cracked && <CrackOverlay />}

                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{ background: '#2a1010', color: '#ef4444' }}
                    >
                      <EyeOff size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono tracking-widest mb-1.5" style={{ color: '#ef4444' }}>
                        ■ REDACTED FILE
                      </div>
                      <div className="h-3 mb-1.5" style={{ width: '62%', background: '#000', opacity: 0.85 }} />
                      <div className="h-2.5" style={{ width: '44%', background: '#000', opacity: 0.7 }} />
                      <div className="flex items-center gap-1 mt-2 text-[9px] font-mono" style={{ color: '#ef4444', opacity: 0.75 }}>
                        <Clock size={10} /> EST. {playtime}
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-mono tracking-wider px-2 py-1"
                      style={{ color: '#ef4444', borderWidth: '1px', borderStyle: 'solid', borderColor: '#ef444466' }}
                    >
                      {cracked ? 'SHATTER SEAL' : 'CLICK TO CRACK SEAL'}
                    </span>
                  </div>
                </button>
                </div>
              );
            }

            const theme = ch.map?.theme;
            const themeColor = theme ? THEME_COLOR[theme] : '#2a3d18';
            const themeIcon = theme ? THEME_ICON[theme] : '🗺️';
            return (
              <div key={ch.id} className="contents">
              {sectionHeader}
              <button
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) {
                    playUi('pick');
                    onPick(ch);
                  }
                }}
                className="text-left p-5 transition-all duration-200 relative overflow-hidden"
                style={{
                  backgroundColor: isClassified
                    ? (unlocked ? '#1a180a' : '#0e0e05')
                    : isExternal
                    ? (unlocked ? '#0b1b24' : '#07131a')
                    : (unlocked ? '#142012' : '#0e1509'),
                  borderWidth: '1px', borderStyle: 'solid',
                  borderColor: isClassified
                    ? (isSelected || isDone ? '#eab308' : unlocked ? '#4a3f05' : '#2a2402')
                    : isExternal
                    ? (isSelected || isDone ? '#67e8f9' : unlocked ? '#164e63' : '#102b38')
                    : (isSelected || isDone ? heroColor : unlocked ? '#2a3d18' : '#1a2410'),
                  borderLeftWidth: isSelected ? '4px' : undefined,
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.5,
                  overflow: isExternal ? 'visible' : 'hidden',
                  boxShadow: isClassified
                    ? (isSelected ? `0 0 0 2px #eab308, 0 0 22px #eab30866` : isDone ? `0 0 12px #eab30833` : 'none')
                    : isExternal
                    ? (isSelected ? '0 0 0 2px #67e8f9, 0 0 28px #67e8f955' : isDone ? '0 0 14px #67e8f933' : 'none')
                    : (isSelected ? `0 0 0 2px ${heroColor}, 0 0 22px ${heroColor}66` : isDone ? `0 0 12px ${heroColor}33` : 'none'),
                  outlineColor: isSelected ? (isSpecial ? specialAccent : heroColor) : 'transparent',
                  transform: isSelected ? 'translateX(4px) scale(1.015)' : 'none',
                  backgroundImage: isClassified && unlocked
                    ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(234, 179, 8, 0.03) 10px, rgba(234, 179, 8, 0.03) 20px)'
                    : isExternal && unlocked
                    ? 'repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(103, 232, 249, 0.045) 12px, rgba(103, 232, 249, 0.045) 24px)'
                    : 'none',
                }}
                onMouseEnter={e => {
                  setSelectedIndex(idx);
                  if (unlocked) {
                    playUi('hover', 0.2);
                    e.currentTarget.style.borderColor = isSpecial ? specialAccent : heroColor;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = isClassified
                    ? (isDone ? '#eab308' : '#4a3f05')
                    : isExternal
                    ? (isDone ? '#67e8f9' : '#164e63')
                    : (isDone ? heroColor : '#2a3d18');
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: unlocked ? themeColor : '#1a2410', opacity: unlocked ? 0.7 : 0.3 }}
                />

                {isClassified && justShattered === ch.id && <ShatterParticles />}
                {isExternal && justShattered === ch.id && (
                  <>
                    <ShatterParticles palette="external" />
                    <ExternalShatterFlash />
                  </>
                )}

                <div className="flex items-center gap-4 relative">
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0 font-mono text-sm font-bold"
                    style={{
                      background: isClassified
                        ? (unlocked ? '#eab3081a' : '#2a2402')
                        : isExternal
                        ? (unlocked ? '#67e8f91a' : '#102b38')
                        : (unlocked ? `${heroColor}1a` : '#1a2410'),
                      color: isClassified
                        ? (unlocked ? '#eab308' : '#5a4f02')
                        : isExternal
                        ? (unlocked ? '#67e8f9' : '#2b6478')
                        : (unlocked ? heroColor : '#4a5a30'),
                    }}
                  >
                    {unlocked ? (flashbackBadge ?? ch.index) : <Lock size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base leading-none">{themeIcon}</span>
                      <span
                        className="text-[10px] font-mono tracking-widest"
                        style={{ color: '#8aaa60' }}
                      >
                        {chapterTag}
                      </span>
                      {isDone && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-mono"
                          style={{ color: heroColor }}
                        >
                          <Check size={11} /> CLEARED
                        </span>
                      )}
                      {isClassified && !sealed && (
                        <span
                          className="flex items-center gap-1 text-[9px] font-mono px-1"
                          style={{ color: '#ef4444', borderWidth: '1px', borderStyle: 'solid', borderColor: '#ef444440', marginLeft: 'auto' }}
                        >
                          <EyeOff size={10} /> CLASSIFIED
                        </span>
                      )}
                      {isExternal && !sealed && (
                        <span
                          className="flex items-center gap-1 text-[9px] font-mono px-1"
                          style={{ color: '#67e8f9', borderWidth: '1px', borderStyle: 'solid', borderColor: '#67e8f940', marginLeft: 'auto' }}
                        >
                          <Lock size={10} /> OUTER ARCHIVE
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base truncate font-display" style={{ color: isClassified ? '#fef08a' : isExternal ? '#cffafe' : (unlocked ? '#e8f5d0' : '#5a6a40') }}>
                      {ch.title}
                    </h3>
                    <p className="text-xs opacity-60 truncate" style={{ color: isClassified ? '#eab308' : isExternal ? '#7dd3fc' : '#8aaa60' }}>
                      {ch.subtitle} · 📍 {ch.location}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[9px] font-mono" style={{ color: isClassified ? '#eab308' : isExternal ? '#67e8f9' : '#8aaa60', opacity: 0.78 }}>
                      <Clock size={10} /> EST. {playtime}
                    </div>
                  </div>
                  {unlocked && (
                    <Play size={16} fill="currentColor" style={{ color: isSpecial ? specialAccent : heroColor }} className="shrink-0" />
                  )}
                </div>
              </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs opacity-40 mt-6" style={{ color: '#8aaa60' }}>
          More chapters unlock as the story unfolds.
        </p>
      </div>
    </div>
  );
}
