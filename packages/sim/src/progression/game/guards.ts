import { fail, type GameState, type RunPhase, type RunState } from "./state";

/** Phase checks for actions: in a run (in one of these phases) or in the Camp. */

export function requireRun(state: GameState, ...phases: RunPhase[]): RunState {
  const run = state.run;
  if (!run) return fail("Not in a run");
  if (!phases.includes(run.phase)) return fail(`Not allowed during ${run.phase}`);
  return run;
}

export function requireCamp(state: GameState): void {
  if (state.run) fail("Only in the Camp");
  if (state.pendingPrestige) fail("The harvest comes first");
}
