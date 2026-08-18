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

  const update = useCallback((fn: (prev: GameState) => GameState) => {
    setGame(prev => fn(prev));
  }, []);

  return { game, gameRef, update };
};
