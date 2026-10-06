'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameState,
  loadGameState,
  normalizeForToday,
  saveGameState,
} from './gameState';

// React hook around the localStorage-backed gamification state. `game` is the
// current snapshot, `gameRef` always holds the latest one (safe to read from
// event handlers and intervals without re-subscribing), and `update` applies
// pure transitions from lib/gameState.
export const useGameState = () => {
  const [game, setGame] = useState<GameState>(() =>
    normalizeForToday(loadGameState()),
  );
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    saveGameState(game);
  }, [game]);

  // Keep daily counters correct when the app remains open across midnight or
  // returns from the background on a new day.
  useEffect(() => {
    const refreshDay = () => {
      const prev = gameRef.current;
      const next = normalizeForToday(prev);
      if (
        prev.dailyProgressDate !== next.dailyProgressDate ||
        prev.currentStreak !== next.currentStreak ||
        prev.claimedDays !== next.claimedDays
      ) {
        gameRef.current = next;
        saveGameState(next);
        setGame(next);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshDay();
    };
    const id = window.setInterval(refreshDay, 60_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const update = useCallback((fn: (prev: GameState) => GameState) => {
    const next = fn(gameRef.current);
    gameRef.current = next;
    saveGameState(next);
    setGame(next);
  }, []);

  return { game, gameRef, update };
};
