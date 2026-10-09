import type { SkillTreeDefinition } from "@emberheir/sim";
import { PRESTIGE_BRANCHES, PRESTIGE_BRANCH_NODES } from "./prestige-branches";
import { CLASS_STARTS, WEB_NODES } from "./skill-web";

/**
 * Skill Tree (level-v2.md section 7): the web of eight regions (`skill-web.ts`) with a start
 * node per class, and the Prestige branches growing out of it (`prestige-branches.ts`).
 */
export const SKILL_TREE: SkillTreeDefinition = {
  nodes: [...WEB_NODES, ...PRESTIGE_BRANCH_NODES],
  classStarts: CLASS_STARTS,
  prestigeBranches: PRESTIGE_BRANCHES,
};
