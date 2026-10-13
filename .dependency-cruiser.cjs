/**
 * Import rules (`npm run deps`, part of `npm run check`). No module may import itself back
 * through others: the dependencies point one way, down to small leaf modules.
 *
 * One cycle is allowed on purpose: in a fight a hit can fire a trigger or a Reaction, which casts
 * a skill, which hits again. That recursion is the game's own, so `combat/hits`, `rotation`,
 * `skills` and `trigger-effects` call each other. Type-only imports never form a cycle at runtime.
 */
const FIGHT_RECURSION = "^packages/sim/src/combat/(hits|rotation|skills|trigger-effects)\\.ts$";

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Move the shared piece into a leaf module both sides can import.",
      from: { pathNot: FIGHT_RECURSION },
      to: { circular: true, dependencyTypesNot: ["type-only"] },
    },
    {
      name: "no-circular-in-fight-recursion",
      severity: "error",
      comment: "Only the hit → trigger/Reaction → skill → hit recursion may cycle.",
      from: { path: FIGHT_RECURSION },
      to: {
        circular: true,
        dependencyTypesNot: ["type-only"],
        viaOnly: { path: FIGHT_RECURSION },
        pathNot: FIGHT_RECURSION,
      },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    exclude: { path: "node_modules|\\.test\\.tsx?$|/e2e/" },
    doNotFollow: { path: "node_modules" },
  },
};
