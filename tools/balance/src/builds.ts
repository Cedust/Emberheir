import { BUILD_PLANS } from "@emberheir/content";
import { type BuildPlan } from "@emberheir/sim";

/**
 * Autopilot builds: the 24 build plans from `content` (one per Heirloom path). `--mastery` tries
 * another main Mastery of the class.
 */
export type { BuildPlan };

export const BUILDS: readonly BuildPlan[] = BUILD_PLANS;

/** The build with another main Mastery (`--mastery`); the rest keep their order. */
export function withMainMastery(build: BuildPlan, mastery: string): BuildPlan {
  return { ...build, masteries: [mastery, ...build.masteries.filter((m) => m !== mastery)] };
}

/** A build by id, or the first build that starts with the weapon. */
export function findBuild(weaponId: string, buildId?: string): BuildPlan | undefined {
  if (buildId) return BUILDS.find((b) => b.id === buildId);
  return BUILDS.find((b) => b.weapon === weaponId);
}
