import { useEffect, useSyncExternalStore } from "react";

/**
 * Which page of the title screen is open, for the music: the menu pages play the title songs,
 * a new Heir (story intro, class select) already plays the Camp's song.
 */
export type TitleScene = "menu" | "newHeir";

let scene: TitleScene = "menu";
const listeners = new Set<() => void>();

function setTitleScene(next: TitleScene) {
  if (next === scene) return;
  scene = next;
  listeners.forEach((l) => l());
}

/** The title screen tells the music which page is open. */
export function useTitleScene(next: TitleScene) {
  useEffect(() => {
    setTitleScene(next);
    return () => setTitleScene("menu");
  }, [next]);
}

/** The open page, for the music. */
export function useCurrentTitleScene(): TitleScene {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => scene,
  );
}
