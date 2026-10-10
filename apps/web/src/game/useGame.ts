import { GAME_DATA } from "@emberheir/content";
import {
  type AttributePoints,
  type Cheat,
  type GameAction,
  type GameState,
  applyAction,
  applyCheat,
  newGame,
} from "@emberheir/sim";
import { useCallback, useRef, useState } from "react";
import { loadSlot, saveSlot, sharedStashFor } from "./saves";

/** What the class select hands over for a new character. */
export interface NewCharacter {
  readonly slot: number;
  readonly classId: string;
  readonly weapon: string;
  readonly name: string;
  /** The free points of the creation, on top of the Class Array. */
  readonly attributes?: AttributePoints;
}

/**
 * The game state for the UI. Every action goes through `applyAction` from the sim and the
 * result is saved right away into the character's slot (the save game is small).
 */
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<GameState | null>(null);
  const slotRef = useRef(0);

  const replace = useCallback((next: GameState | null) => {
    ref.current = next;
    setState(next);
    if (next) saveSlot(slotRef.current, next);
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

  /** Cheat Mode (PR previews and `?cheat`): changes the save directly. */
  const cheat = useCallback(
    (c: Cheat) => {
      const prev = ref.current;
      if (!prev) return;
      try {
        replace(applyCheat(prev, GAME_DATA, c));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [replace],
  );

  const start = useCallback(
    (character: NewCharacter) => {
      const seed = Math.floor(Math.random() * 0x7fffffff);
      slotRef.current = character.slot;
      replace(
        sharedStashFor(
          newGame(GAME_DATA, {
            seed,
            classId: character.classId,
            weapon: character.weapon,
            name: character.name,
            ...(character.attributes ? { attributes: character.attributes } : {}),
          }),
        ),
      );
    },
    [replace],
  );

  const resume = useCallback(
    (slot: number) => {
      const saved = loadSlot(slot);
      if (!saved) return;
      slotRef.current = slot;
      replace(saved);
    },
    [replace],
  );

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
    cheat,
    start,
    resume,
    quit,
    clearError: () => setError(null),
  };
}

export type GameApi = ReturnType<typeof useGame>;
