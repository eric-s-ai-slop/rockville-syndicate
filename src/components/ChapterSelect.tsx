import { useState, useEffect } from 'react';
import { Lock, Play, Check } from 'lucide-react';
import { CHAPTERS, ChapterConfig, MapTheme } from '../data/chapters';
import { isChapterUnlocked, setFreePlay } from '../game/progress';
import { playUi } from '../game/uiSound';

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
};

const THEME_COLOR: Record<MapTheme, string> = {
  apartment:     '#c8e89a',
  highway_night: '#22d3ee',
  hospital:      '#818cf8',
  park:          '#4ade80',
  florida:       '#f59e0b',
  suburb_night:  '#a78bfa',
  cabin:         '#d97706',
};

const THEME_ICON: Record<MapTheme, string> = {
  apartment:     '🏠',
  highway_night: '🌃',
  hospital:      '🏥',
  park:          '🌳',
  florida:       '🌴',
  suburb_night:  '🌙',
  cabin:         '🪵',
};

export default function ChapterSelect({ heroColor, completed, freePlay, onFreePlayChange, onPick }: ChapterSelectProps) {
  const [localFreePlay, setLocalFreePlay] = useState(freePlay);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const toggleFreePlay = () => {
    const next = !localFreePlay;
    setLocalFreePlay(next);
    setFreePlay(next);
    onFreePlayChange(next);
  };

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
        if (ch && isChapterUnlocked(ch.id, completed, localFreePlay)) {
          onPick(ch);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFreePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, completed, localFreePlay, onPick]);

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
          <div className="inline-flex items-center gap-0 border-2" style={{ background: '#0e1509', borderColor: '#2a3d18' }}>
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
            const unlocked = isChapterUnlocked(ch.id, completed, localFreePlay);
            const isSelected = selectedIndex === idx;
            const theme = ch.map?.theme;
            const themeColor = theme ? THEME_COLOR[theme] : '#2a3d18';
            const themeIcon = theme ? THEME_ICON[theme] : '🗺️';
            return (
              <button
                key={ch.id}
                disabled={!unlocked}
                onClick={() => {
                  if (unlocked) {
                    playUi('pick');
                    onPick(ch);
                  }
                }}
                className="text-left border p-5 transition-all duration-200 relative overflow-hidden"
                style={{
                  background: unlocked ? '#142012' : '#0e1509',
                  borderColor: isSelected || isDone ? heroColor : unlocked ? '#2a3d18' : '#1a2410',
                  borderLeftWidth: isSelected ? '4px' : undefined,
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.5,
                  boxShadow: isSelected
                    ? `0 0 0 2px ${heroColor}, 0 0 22px ${heroColor}66`
                    : isDone ? `0 0 12px ${heroColor}33` : 'none',
                  outlineColor: isSelected ? heroColor : 'transparent',
                  transform: isSelected ? 'translateX(4px) scale(1.015)' : 'none',
                }}
                onMouseEnter={e => {
                  setSelectedIndex(idx);
                  if (unlocked) {
                    playUi('hover', 0.2);
                    e.currentTarget.style.borderColor = heroColor;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = isDone ? heroColor : '#2a3d18';
                }}
              >
                {/* Theme accent strip */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: unlocked ? themeColor : '#1a2410', opacity: unlocked ? 0.7 : 0.3 }}
                />

                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 flex items-center justify-center shrink-0 font-mono text-sm font-bold"
                    style={{
                      background: unlocked ? `${heroColor}1a` : '#1a2410',
                      color: unlocked ? heroColor : '#4a5a30',
                    }}
                  >
                    {unlocked ? ch.index : <Lock size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base leading-none">{themeIcon}</span>
                      <span
                        className="text-[10px] font-mono tracking-widest"
                        style={{ color: '#8aaa60' }}
                      >
                        {KIND_TAG[ch.kind]}
                      </span>
                      {isDone && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-mono"
                          style={{ color: heroColor }}
                        >
                          <Check size={11} /> CLEARED
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-base truncate font-display" style={{ color: unlocked ? '#e8f5d0' : '#5a6a40' }}>
                      {ch.title}
                    </h3>
                    <p className="text-xs opacity-60 truncate" style={{ color: '#8aaa60' }}>
                      {ch.subtitle} · 📍 {ch.location}
                    </p>
                  </div>
                  {unlocked && (
                    <Play size={16} fill="currentColor" style={{ color: heroColor }} className="shrink-0" />
                  )}
                </div>
              </button>
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
