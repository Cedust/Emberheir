import type { IconName } from "../../ui/Icon";

/** Skill icons and slot tints (placeholder art). */
const SKILL_ICONS: Record<string, IconName> = {
  "power-strike": "strike",
  flurry: "flurry",
  execute: "execute",
  firebolt: "fire",
  "ice-lance": "snow",
  "chain-lightning": "bolt",
  meteor: "meteor",
  lacerate: "claw",
  "venom-coat": "venom",
  rend: "rend",
  "toxic-burst": "toxic",
  rake: "claw",
  "blight-spit": "venom",
  "rot-spray": "toxic",
  "moss-mend": "drop",
  devour: "drop",
};

export function skillIcon(skillId: string): IconName {
  return SKILL_ICONS[skillId] ?? (skillId.includes("slam") ? "slam" : "strike");
}

const SKILL_TINTS: Record<string, string> = {
  "power-strike": "#8a6a4a",
  flurry: "#7a5a24",
  execute: "#6a2a20",
  firebolt: "#a8401a",
  "ice-lance": "#2d6a8a",
  "chain-lightning": "#8a7a20",
  meteor: "#a8401a",
  lacerate: "#8a1f2c",
  "venom-coat": "#4f6a12",
  rend: "#6a1420",
  "toxic-burst": "#5f7a0e",
};

export function skillTint(skillId: string): string {
  return SKILL_TINTS[skillId] ?? "#6b5a3e";
}
