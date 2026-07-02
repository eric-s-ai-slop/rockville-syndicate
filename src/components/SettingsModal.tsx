import { useState } from 'react';
import { useSettings, updateSettings } from '../game/settings';

interface SettingsModalProps {
  onClose: () => void;
  /** Mirrors the muted setting onto the live Phaser sound manager, if a game is booted. */
  syncPhaserMute: (muted: boolean) => void;
}

export default function SettingsModal({ onClose, syncPhaserMute }: SettingsModalProps) {
  const settings = useSettings();
  const [settingsTab, setSettingsTab] = useState<'audio' | 'gameplay' | 'access' | 'controls'>('audio');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.80)' }}
      onClick={onClose}
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
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity text-sm">✕</button>
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
                  syncPhaserMute(next);
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
  );
}
