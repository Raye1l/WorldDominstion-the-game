import { useEffect, useState } from 'react';
import type { GameState } from '../shared/types';

export function useRoundTimer(gameState: GameState | null): number | null {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (gameState?.status === 'playing' && gameState.roundEndTime) {
      const roundEnd = gameState.roundEndTime;
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((roundEnd - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
    setTimeLeft(null);
    return undefined;
  }, [gameState?.status, gameState?.roundEndTime]);

  return timeLeft;
}
