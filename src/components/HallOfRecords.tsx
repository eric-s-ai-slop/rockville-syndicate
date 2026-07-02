import { getRunRecords } from '../game/settings';
import { GHOST_TARGETS, type RunRecord } from '../game/scoring';
import { playUi } from '../game/uiSound';

interface HallOfRecordsProps {
  heroColor: string;
  onBack: () => void;
}

export default function HallOfRecords({ heroColor, onBack }: HallOfRecordsProps) {
  const records = getRunRecords();
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
            onClick={() => { playUi('back'); onBack(); }}
            className="px-8 py-3 font-pixel text-[10px] cursor-pointer transition-all"
            style={{ background: '#0f1c09', border: `2px solid ${heroColor}66`, color: '#8aaa60', imageRendering: 'pixelated' }}
          >
            ◀ BACK
          </button>
        </div>
      </div>
    </div>
  );
}
