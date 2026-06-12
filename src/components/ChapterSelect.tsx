import { Lock, Play, Check } from 'lucide-react';
import { CHAPTERS, ChapterConfig } from '../data/chapters';
import { isChapterUnlocked } from '../game/progress';

interface ChapterSelectProps {
  heroColor: string;
  completed: string[];
  onPick: (chapter: ChapterConfig) => void;
}

const KIND_TAG: Record<ChapterConfig['kind'], string> = {
  chapter: 'CHAPTER',
  interlude: 'INTERLUDE',
  epilogue: 'EPILOGUE',
};

export default function ChapterSelect({ heroColor, completed, onPick }: ChapterSelectProps) {
  return (
    <div
      className="h-full overflow-y-auto flex flex-col items-center p-8"
      style={{ background: 'linear-gradient(180deg, #0a1006 0%, #0c1208 60%, #0f1c09 100%)' }}
    >
      <div className="max-w-2xl w-full omega-fade-up">
        <div className="text-center mb-8 mt-2">
          <div className="text-3xl mb-2">📖</div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#c8e89a' }}>
            The Rockville Syndicate
          </h2>
          <p className="text-sm opacity-60" style={{ color: '#8aaa60' }}>
            A playable recollection. Pick where to begin.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {CHAPTERS.map(ch => {
            const isDone = completed.includes(ch.id);
            const unlocked = isChapterUnlocked(ch.id, completed);
            return (
              <button
                key={ch.id}
                disabled={!unlocked}
                onClick={() => unlocked && onPick(ch)}
                className="text-left rounded-2xl border p-5 transition-all duration-200 relative overflow-hidden"
                style={{
                  background: unlocked ? '#142012' : '#0e1509',
                  borderColor: isDone ? heroColor : unlocked ? '#2a3d18' : '#1a2410',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.5,
                  boxShadow: isDone ? `0 0 18px ${heroColor}33` : 'none',
                }}
                onMouseEnter={e => {
                  if (unlocked) e.currentTarget.style.borderColor = heroColor;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isDone ? heroColor : '#2a3d18';
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono text-sm font-bold"
                    style={{
                      background: unlocked ? `${heroColor}1a` : '#1a2410',
                      color: unlocked ? heroColor : '#4a5a30',
                    }}
                  >
                    {unlocked ? ch.index : <Lock size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
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
                    <h3 className="font-bold text-base truncate" style={{ color: unlocked ? '#e8f5d0' : '#5a6a40' }}>
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
