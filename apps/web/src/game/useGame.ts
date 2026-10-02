import { GAME_DATA } from "@emberheir/content";
import {
  type GameAction,
  type GameState,
  applyAction,
  deserializeGame,
  newGame,
  serializeGame,
} from "@emberheir/sim";
import { useCallback, useRef, useState } from "react";
import { storageKey } from "../storage";

export const SAVE_KEY = storageKey("save");

/** Reads the save game; broken or outdated saves are ignored. */
export function loadSave(): GameState | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    return json ? deserializeGame(json) : null;
  } catch {
    return null;
  }
}

function writeSave(state: GameState | null): void {
  try {
    if (state) localStorage.setItem(SAVE_KEY, serializeGame(state));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    // Private windows can block storage; the game still runs, it just is not saved.
  }
}

/**
 * The game state for the UI. Every action goes through `applyAction` from the sim and the
 * result is saved right away (the save game is small).
 */
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<GameState | null>(null);

  const replace = useCallback((next: GameState | null) => {
    ref.current = next;
    setState(next);
    writeSave(next);
  }, []);

  const dispatch = useCallback(
    (action: GameAction) => {
      const prev = ref.current;
      if (!prev) return;
      try {
        replace(applyAction(prev, GAME_DATA, action));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [replace],
  );

  /** Applies several actions as one step: all or nothing. */
  const dispatchAll = useCallback(
    (actions: readonly GameAction[]) => {
      const prev = ref.current;
      if (!prev) return;
      try {
        replace(actions.reduce((s, a) => applyAction(s, GAME_DATA, a), prev));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [replace],
  );

  const start = useCallback(
    (starterWeapon: string) => {
      const seed = Math.floor(Math.random() * 0x7fffffff);
      replace(newGame(GAME_DATA, { seed, starterWeapon }));
    },
    [replace],
  );

  const resume = useCallback(() => {
    const saved = loadSave();
    if (saved) replace(saved);
  }, [replace]);

  /** Back to the title screen; the save game stays. */
  const quit = useCallback(() => {
    ref.current = null;
    setState(null);
  }, []);

  return {
    state,
    error,
    dispatch,
    dispatchAll,
    start,
    resume,
    quit,
    clearError: () => setError(null),
  };
}

export type GameApi = ReturnType<typeof useGame>;
