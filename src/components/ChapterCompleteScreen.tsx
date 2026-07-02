import { GHOST_TARGETS, ghostBeatenIndex, type RunRecord } from '../game/scoring';
import { playUi } from '../game/uiSound';

interface ChapterCompleteScreenProps {
  chapterTitle: string;
  record: RunRecord;
  prevBest: number;
  heroColor: string;
  onContinue: () => void;
  onViewRecords: () => void;
}

export default function ChapterCompleteScreen({ chapterTitle, record, prevBest, heroColor, onContinue, onViewRecords }: ChapterCompleteScreenProps) {
  const rec = record;
  const isNewBest = rec.score > prevBest && prevBest > 0;
  const firstClear = prevBest === 0;
  const beatenIdx = ghostBeatenIndex(rec.score);
  const beatenGhost = beatenIdx >= 0 ? GHOST_TARGETS[beatenIdx] : null;
  const diffLabel = rec.difficulty === 'easy' ? 'EASY ×0.75' : rec.difficulty === 'hard' ? 'HARD ×1.5' : 'NORMAL ×1.0';

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center text-center p-8 omega-fade-up" style={{ background: '#0a1006' }}>
      <p className="font-pixel text-[9px] tracking-widest mb-2" style={{ color: '#8aaa60' }}>CHAPTER CLEARED</p>
      <h2 className="font-display text-xl font-bold mb-1" style={{ color: '#c8e89a' }}>{chapterTitle}</h2>
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
          onClick={() => { playUi('back'); onContinue(); }}
          className="px-6 py-3 font-pixel text-[10px] cursor-pointer transition-all"
          style={{ background: heroColor, color: '#0c1208', border: '2px solid #0c1208', imageRendering: 'pixelated' }}
        >
          ▶ CONTINUE
        </button>
        <button
          onClick={() => { playUi('click'); onViewRecords(); }}
          className="px-6 py-3 font-pixel text-[10px] cursor-pointer transition-all"
          style={{ background: '#0f1c09', border: `2px solid ${heroColor}66`, color: '#8aaa60', imageRendering: 'pixelated' }}
        >
          🏆 HALL OF RECORDS
        </button>
      </div>
    </div>
  );
}
