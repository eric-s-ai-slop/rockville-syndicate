import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import type { BossConfig } from '../../data/entities';

export interface ActiveQte {
  boss: BossConfig;
  callback: (success: boolean, damage: number) => void;
  selectedDamage: number;
}

const QTE_SECONDS = 8;

/** Owns QTE selection, countdown, and exactly-once response delivery. */
export function useQte() {
  const [activeQte, setActiveQte] = useState<ActiveQte | null>(null);
  const [qteTimer, setQteTimer] = useState(QTE_SECONDS);
  const activeQteRef = useRef<ActiveQte | null>(null);
  const qteTimerRef = useRef(QTE_SECONDS);

  const clearQte = useCallback(() => {
    activeQteRef.current = null;
    setActiveQte(null);
  }, []);

  const triggerQte = useCallback(
    (boss: BossConfig, callback: (success: boolean, damage: number) => void) => {
      const selectedQte = boss.qtePool
        ? boss.qtePool[Phaser.Math.Between(0, boss.qtePool.length - 1)]
        : boss.weaknessQTE;
      const shuffledBoss = { ...boss };
      if (selectedQte) {
        shuffledBoss.weaknessQTE = {
          ...selectedQte,
          options: Phaser.Utils.Array.Shuffle([...selectedQte.options]),
        };
      }

      const next = {
        boss: shuffledBoss,
        callback,
        selectedDamage: selectedQte?.damage ?? boss.weaknessQTE.damage,
      };
      qteTimerRef.current = QTE_SECONDS;
      setQteTimer(QTE_SECONDS);
      activeQteRef.current = next;
      setActiveQte(next);
    },
    [],
  );

  useEffect(() => {
    if (!activeQte) return;
    const timer = window.setInterval(() => {
      const current = activeQteRef.current;
      if (!current) return;

      const nextTime = Math.max(0, qteTimerRef.current - 1);
      qteTimerRef.current = nextTime;
      setQteTimer(nextTime);
      if (nextTime > 0) return;

      window.clearInterval(timer);
      clearQte();
      current.callback(false, 0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeQte, clearQte]);

  const respondToQte = useCallback((option: string) => {
    const current = activeQteRef.current;
    if (!current) return;

    clearQte();
    current.callback(
      option === current.boss.weaknessQTE.correctAnswer,
      current.selectedDamage,
    );
  }, [clearQte]);

  return { activeQte, qteTimer, triggerQte, respondToQte, clearQte };
}
