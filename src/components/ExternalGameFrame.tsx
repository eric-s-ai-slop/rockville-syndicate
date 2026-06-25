import { useEffect, useRef, useState } from 'react';
import { ModeResult } from '../game/modes/types';

interface ExternalGameFrameProps {
  gameId: string;
  config?: unknown;
  onDone: (result: ModeResult) => void;
  onCancel: () => void;
}

export default function ExternalGameFrame({ gameId, config, onDone, onCancel }: ExternalGameFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const tokenRef = useRef(`omega_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    // Focus the iframe wrapper immediately so we can catch Esc
    iframeRef.current?.focus();

    const handleMessage = (event: MessageEvent) => {
      // Basic origin check (since it's served by our Vite server, same origin)
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data || data.source !== 'omega-game' || data.token !== tokenRef.current) return;

      if (data.type === 'ready') {
        setIsReady(true);
        // Dispatch the start config
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'omega', token: tokenRef.current, type: 'start', config },
          window.location.origin
        );
      } else if (data.type === 'complete') {
        onDone(data.result);
      } else if (data.type === 'error') {
        console.error('[ExternalGameFrame] Minigame error:', data.message);
        onDone({ outcome: 'skip' });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [config, onDone]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
      {!isReady && (
        <div className="absolute text-white animate-pulse">
          Loading {gameId}...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`/minigames/${gameId}/index.html?token=${tokenRef.current}`}
        className="w-full h-full border-none"
        style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.2s' }}
        tabIndex={0}
      />
      <div className="absolute top-2 right-2 text-xs text-white/30 pointer-events-none">
        [Esc] to abort minigame
      </div>
    </div>
  );
}
