import { lazy } from "react";

/*
 * The PixiJS views load on demand, so the title screen does not wait for PixiJS (about half the
 * game's code). preloadViews() fetches them in the background right after the first paint.
 */
const battle = () => import("./battle/BattleView");
const preview = () => import("./PreviewArena");
const tree = () => import("./camp/SkillTreeTab");
const mastery = () => import("./camp/MasteryTab");

export const BattleView = lazy(() => battle().then((m) => ({ default: m.BattleView })));
export const PreviewArena = lazy(() => preview().then((m) => ({ default: m.PreviewArena })));
export const SkillTreeTab = lazy(() => tree().then((m) => ({ default: m.SkillTreeTab })));
export const MasteryTab = lazy(() => mastery().then((m) => ({ default: m.MasteryTab })));

export function preloadViews(): void {
  for (const load of [preview, battle, tree, mastery]) void load().catch(() => undefined);
}
