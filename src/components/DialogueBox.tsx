import { useEffect, useCallback, useState, useRef } from 'react';
import { DIALOG_BLIP_URL } from '../game/audio';

const blipPool = Array.from({ length: 12 }, () => new Audio(DIALOG_BLIP_URL));
function playBlip(rate = 1, volume = 0.55) {
  const a = blipPool.find(audio => audio.paused || audio.ended) ?? blipPool[0];
  try {
    a.currentTime = 0;
    a.playbackRate = rate;
    a.volume = volume;
    a.play().catch(() => {});
  } catch {}
}

function stopAllBlips() {
  for (const a of blipPool) {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  }
}

// Deterministic per-speaker pitch: no speakerId is threaded down to this component,
// but speakerName is unique per character and already available, so hash it into a
// consistent base pitch (e.g. a boss always sounds lower than Eric).
function speakerBasePitch(speakerName: string): number {
  let h = 0;
  for (let i = 0; i < speakerName.length; i++) h = (h * 31 + speakerName.charCodeAt(i)) | 0;
  const norm = (Math.abs(h) % 100) / 100; // 0..1
  return 0.75 + norm * 0.5; // 0.75x - 1.25x
}

const isLetter = (c: string) => /[a-zA-Z0-9]/.test(c);

const delayFor = (c: string) => {
  if (c === '.' || c === '!' || c === '?') return 260;
  if (c === ',' || c === ';' || c === ':') return 150;
  if (c === '…' || c === '—') return 220;
  if (c === ' ') return 34;
  return 22; // base per-letter speed
};

interface DialogueChoice {
  text: string;
}

interface DialogueBoxProps {
  speakerName: string;
  speakerEmoji: string;
  speakerColor: string;
  lines: string[];
  lineIndex: number;
  portraitDataUrl?: string;
  /** When present (and on the last line) the box shows choice buttons. */
  choices?: DialogueChoice[];
  muted?: boolean;
  onNext: () => void;
  onChoose?: (index: number) => void;
}

export default function DialogueBox({
  speakerName,
  speakerEmoji,
  speakerColor,
  lines,
  lineIndex,
  portraitDataUrl,
  choices,
  muted,
  onNext,
  onChoose,
}: DialogueBoxProps) {
  const isLast = lineIndex >= lines.length - 1;
  const showChoices = isLast && !!choices && choices.length > 0;
  const fullText = lines[lineIndex] ?? '';

  const [displayedText, setDisplayedText] = useState('');
  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset and start typewriter on each new line
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedText('');
    isTypingRef.current = true;
    let i = 0;

    const step = () => {
      i++;
      const char = fullText[i - 1];
      setDisplayedText(fullText.slice(0, i));

      if (!muted && char && isLetter(char) && (i % 3 === 0)) {
        const basePitch = speakerBasePitch(speakerName);
        playBlip(basePitch * (0.94 + Math.random() * 0.12), 0.4);
      }

      if (i >= fullText.length) {
        timerRef.current = null;
        isTypingRef.current = false;
        stopAllBlips();
      } else {
        timerRef.current = setTimeout(step, delayFor(char));
      }
    };

    // Only start if there is text
    if (fullText.length > 0) {
      timerRef.current = setTimeout(step, delayFor(fullText[0]));
    } else {
      isTypingRef.current = false;
    }

    return () => {
      stopAllBlips();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex, fullText]);

  const skipTypewriter = useCallback(() => {
    if (!isTypingRef.current) return false;
    stopAllBlips();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    isTypingRef.current = false;
    setDisplayedText(fullText);
    return true;
  }, [fullText]);

  const handleAdvance = useCallback(() => {
    if (skipTypewriter()) return;
    if (showChoices) return;
    onNext();
  }, [onNext, showChoices, skipTypewriter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        handleAdvance();
        return;
      }
      if (showChoices) {
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= (choices?.length ?? 0)) {
          e.preventDefault();
          onChoose?.(n - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAdvance, showChoices, choices, onChoose]);

  // Gamepad: face button 0 (A/Cross) advances dialogue, buttons 1-4 pick a choice —
  // same mapping intent as the keyboard's Space/Enter/E and number keys above.
  // Polled directly via the browser Gamepad API (not Phaser's plugin) since this
  // is a React overlay, not part of the Phaser scene.
  useEffect(() => {
    let raf = 0;
    const wasDown: boolean[] = [];
    const poll = () => {
      const pads = navigator.getGamepads?.() ?? [];
      for (const pad of pads) {
        if (!pad) continue;
        for (let i = 0; i < Math.min(pad.buttons.length, 5); i++) {
          const down = pad.buttons[i].pressed;
          if (down && !wasDown[i]) {
            if (i === 0) handleAdvance();
            else if (showChoices && i - 1 < (choices?.length ?? 0)) onChoose?.(i - 1);
          }
          wasDown[i] = down;
        }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [handleAdvance, showChoices, choices, onChoose]);

  const typingDone = displayedText.length >= fullText.length;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 p-3 select-none"
      style={{ cursor: showChoices ? 'default' : 'pointer' }}
      onClick={handleAdvance}
    >
      <div className="max-w-3xl mx-auto pixel-panel p-0 shadow-2xl" style={{ borderColor: speakerColor, boxShadow: `inset 0 0 0 3px #0f1c09, inset 0 0 0 6px ${speakerColor}66` }}>
        {/* Speaker nameplate — sits flush on the top border, Pokémon-style */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 -mt-px ml-4"
          style={{ background: speakerColor, imageRendering: 'pixelated' }}
        >
          {portraitDataUrl ? (
            <img
              key={speakerName}
              src={portraitDataUrl}
              alt={speakerName}
              width={20}
              height={20}
              className="portrait-pop"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span key={speakerName} className="portrait-pop" style={{ fontSize: 14, display: 'inline-block' }}>{speakerEmoji}</span>
          )}
          <span className="font-pixel text-[14px] font-bold" style={{ color: '#0a1006' }}>
            {speakerName}
          </span>
        </div>

        {/* Dialogue body */}
        <div className="px-5 pt-2 pb-4">
          <p className="font-pixel text-[14px] leading-relaxed min-h-[4rem]" style={{ color: '#e8f5d0', imageRendering: 'pixelated' }}>
            {displayedText}
            {!typingDone && (
              <span className="inline-block w-[2px] h-[0.85em] ml-[2px] align-middle" style={{ background: speakerColor, animation: 'omega-pulse 0.7s ease-in-out infinite' }} />
            )}
          </p>

          {showChoices && typingDone ? (
            <div className="mt-3 space-y-1.5" onClick={e => e.stopPropagation()}>
              {choices!.map((choice, idx) => (
                <button
                  key={idx}
                  data-testid="dialogue-choice"
                  onClick={() => { onChoose?.(idx); }}
                  className="w-full text-left px-3 py-2 cursor-pointer flex items-start gap-2 transition-colors duration-100"
                  style={{ background: '#11200a', border: '2px solid #3a5520', color: '#e8f5d0' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = speakerColor;
                    e.currentTarget.style.background = `${speakerColor}22`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#3a5520';
                    e.currentTarget.style.background = '#11200a';
                  }}
                >
                  <span className="font-pixel text-[13px] shrink-0 mt-0.5" style={{ color: speakerColor }}>
                    {idx + 1}.
                  </span>
                  <span className="font-pixel text-[13px]">{choice.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-end mt-2">
              {typingDone && (
                <span className="pixel-blink font-pixel text-[14px]" style={{ color: speakerColor }}>▼</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
