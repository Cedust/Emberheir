import type { SkillTreeDefinition } from "@emberheir/sim";
import { PRESTIGE_BRANCHES, PRESTIGE_BRANCH_NODES } from "./prestige-branches";
import { CLASS_STARTS, WEB_NODES } from "./skill-web";
import { plantTree } from "./tree-shape";

/**
 * Skill Tree (level-v2.md section 7): the web of eight regions (`skill-web.ts`) with a start
 * node per class, and the Prestige branches growing out of it (`prestige-branches.ts`), set onto
 * the Ash Tree (`tree-shape.ts`).
 */
export const SKILL_TREE: SkillTreeDefinition = {
  nodes: plantTree(
    [...WEB_NODES, ...PRESTIGE_BRANCH_NODES],
    Object.fromEntries(PRESTIGE_BRANCHES.map((b) => [b.id, b.anchor])),
  ),
  classStarts: CLASS_STARTS,
  prestigeBranches: PRESTIGE_BRANCHES,
};
