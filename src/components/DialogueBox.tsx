import { useEffect, useCallback, useState, useRef } from 'react';

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
  onNext: () => void;
  onChoose?: (index: number) => void;
}

const TYPEWRITER_MS = 22;

export default function DialogueBox({
  speakerName,
  speakerEmoji,
  speakerColor,
  lines,
  lineIndex,
  portraitDataUrl,
  choices,
  onNext,
  onChoose,
}: DialogueBoxProps) {
  const isLast = lineIndex >= lines.length - 1;
  const showChoices = isLast && !!choices && choices.length > 0;
  const fullText = lines[lineIndex] ?? '';

  const [displayedText, setDisplayedText] = useState('');
  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset and start typewriter on each new line
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText('');
    isTypingRef.current = true;
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        isTypingRef.current = false;
      }
    }, TYPEWRITER_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex, fullText]);

  const skipTypewriter = useCallback(() => {
    if (!isTypingRef.current) return false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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

  const typingDone = displayedText.length >= fullText.length;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 p-4 select-none"
      style={{ cursor: showChoices ? 'default' : 'pointer' }}
      onClick={handleAdvance}
    >
      <div
        className="max-w-3xl mx-auto rounded-2xl border-2 p-5 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a2e10 0%, #0f1c09 100%)',
          borderColor: speakerColor,
          boxShadow: `0 0 32px ${speakerColor}44, 0 8px 32px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Speaker header */}
        <div className="flex items-center gap-3 mb-3">
          {portraitDataUrl ? (
            <img
              src={portraitDataUrl}
              alt={speakerName}
              width={48}
              height={48}
              className="rounded-lg shrink-0 border-2"
              style={{
                imageRendering: 'pixelated',
                borderColor: speakerColor,
                background: `${speakerColor}22`,
              }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shrink-0 border-2"
              style={{ background: `${speakerColor}22`, borderColor: speakerColor }}
            >
              {speakerEmoji}
            </div>
          )}
          <span className="font-bold text-sm tracking-wide" style={{ color: speakerColor }}>
            {speakerName}
          </span>
          <div className="flex-1 h-px opacity-30" style={{ background: speakerColor }} />
        </div>

        {/* Dialogue text */}
        <p className="text-[#e8f5d0] text-sm leading-relaxed font-medium min-h-[2.5rem]">
          {displayedText}
          {!typingDone && (
            <span className="inline-block w-[2px] h-[0.9em] ml-[1px] align-middle animate-pulse" style={{ background: speakerColor }} />
          )}
        </p>

        {showChoices && typingDone ? (
          <div className="mt-4 space-y-2" onClick={e => e.stopPropagation()}>
            {choices!.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => onChoose?.(idx)}
                className="w-full text-left p-3 rounded-xl text-sm transition-all duration-150 cursor-pointer border flex items-start gap-2"
                style={{ background: '#11200a', borderColor: '#3a5520', color: '#e8f5d0' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = speakerColor;
                  e.currentTarget.style.background = `${speakerColor}1a`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#3a5520';
                  e.currentTarget.style.background = '#11200a';
                }}
              >
                <span className="font-mono text-xs opacity-60 shrink-0 mt-0.5" style={{ color: speakerColor }}>
                  {idx + 1}
                </span>
                <span>{choice.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-end mt-3">
            <span className="text-[11px] font-mono opacity-60" style={{ color: speakerColor }}>
              {typingDone ? 'SPACE to continue ▶' : 'SPACE to skip ▶'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
