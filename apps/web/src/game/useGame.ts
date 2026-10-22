import { GAME_DATA } from "@emberheir/content";
import {
  type Attribute,
  type AttributePoints,
  type Cheat,
  type GameAction,
  type GameState,
  applyAction,
  applyCheat,
  newGame,
} from "@emberheir/sim";
import { useCallback, useMemo, useRef, useState } from "react";
import { accountFor, loadSlot, saveSlot, sharedStashFor } from "./saves";

/** What the class select hands over for a new character. */
export interface NewCharacter {
  readonly slot: number;
  readonly classId: string;
  readonly weapon: string;
  /** The free points of the creation, on top of the Class Array. */
  readonly attributes?: AttributePoints;
  /** Lineage points taken (main attributes of classes that won the finale). */
  readonly lineage?: readonly Attribute[];
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

  const replace = useCallback((raw: GameState | null) => {
    // The account's Lineage and Power Codex ride along: a finale win adds this character to
    // the Lineage, a Power it learned joins the Codex of every character.
    const next = raw && accountFor(raw);
    ref.current = next;
    setState(next);
    if (next) saveSlot(slotRef.current, next);
  }, []);

  /**
   * Runs one change of the state: the result replaces the state, a failed action (a
   * `GameActionError`, or a cheat that does not fit) leaves it as it was and shows why.
   */
  const update = useCallback(
    (change: (state: GameState) => GameState) => {
      const prev = ref.current;
      if (!prev) return;
      try {
        replace(change(prev));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [replace],
  );

  const dispatch = useCallback(
    (action: GameAction) => update((s) => applyAction(s, GAME_DATA, action)),
    [update],
  );

  /** Applies several actions as one step: all or nothing. */
  const dispatchAll = useCallback(
    (actions: readonly GameAction[]) =>
      update((s) => actions.reduce((acc, a) => applyAction(acc, GAME_DATA, a), s)),
    [update],
  );

  /** Cheat Mode (PR previews and `?cheat`): changes the save directly. */
  const cheat = useCallback((c: Cheat) => update((s) => applyCheat(s, GAME_DATA, c)), [update]);

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
            ...(character.attributes ? { attributes: character.attributes } : {}),
            ...(character.lineage?.length ? { lineage: character.lineage } : {}),
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

  const clearError = useCallback(() => setError(null), []);

  // One object per state, so views that keep `game` in an effect's deps do not rerun it on
  // every render (the fight's resolve timer, for one).
  return useMemo(
    () => ({ state, error, dispatch, dispatchAll, cheat, start, resume, quit, clearError }),
    [state, error, dispatch, dispatchAll, cheat, start, resume, quit, clearError],
  );
}

export type GameApi = ReturnType<typeof useGame>;
