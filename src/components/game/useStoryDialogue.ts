import { useCallback, useRef, useState } from 'react';
import type { StoryDialoguePayload } from '../../game/ChapterScene';

export interface ActiveStory {
  payload: StoryDialoguePayload;
  done: (choiceIndex?: number) => void;
  lineIndex: number;
}

/** Owns the React side of the Phaser story bridge. */
export function useStoryDialogue() {
  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const activeStoryRef = useRef<ActiveStory | null>(null);

  const showStory = useCallback(
    (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => {
      const next = { payload, done, lineIndex: 0 };
      activeStoryRef.current = next;
      setActiveStory(next);
    },
    [],
  );

  const clearStory = useCallback(() => {
    activeStoryRef.current = null;
    setActiveStory(null);
  }, []);

  // `done` advances Phaser's beat engine. Keep it outside state updaters because
  // React StrictMode may invoke an updater twice in development.
  const advanceStory = useCallback(() => {
    const current = activeStoryRef.current;
    if (!current) return;

    if (current.lineIndex < current.payload.lines.length - 1) {
      const next = { ...current, lineIndex: current.lineIndex + 1 };
      activeStoryRef.current = next;
      setActiveStory(next);
      return;
    }
    if (current.payload.choices?.length) return;

    clearStory();
    current.done();
  }, [clearStory]);

  const chooseStory = useCallback((choiceIndex: number) => {
    const current = activeStoryRef.current;
    if (!current) return;

    clearStory();
    current.done(choiceIndex);
  }, [clearStory]);

  return { activeStory, showStory, clearStory, advanceStory, chooseStory };
}
