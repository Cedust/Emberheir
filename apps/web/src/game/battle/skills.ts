import { WEAPON_MASTERY } from "@emberheir/content";
import type { IconName } from "../../ui/Icon";

/** Painted skill icons (Timo's sheets, tools/art/cut_skills.py), by skill id. */
const SKILL_ART = import.meta.glob<string>("../../assets/skills/*.webp", {
  eager: true,
  import: "default",
});
const art = (id: string): string | undefined => SKILL_ART[`../../assets/skills/${id}.webp`];

/** Each weapon's Innate: its Innate Forms show the Innate's painting. */
const INNATES: Record<string, string> = {
  sword: "power-strike",
  wand: "shockbolt",
  axe: "lacerate",
  dagger: "envenom",
  bow: "barbed-arrow",
  crossbow: "heavy-bolt",
  mace: "skull-crack",
  staff: "void-bolt",
};

const FORM_OF: Record<string, string> = Object.fromEntries(
  Object.values(WEAPON_MASTERY).flatMap((tree) =>
    tree.nodes.flatMap((n) => {
      const innate = INNATES[tree.weaponId];
      return n.effect.innate && innate ? [[n.effect.innate.id, innate]] : [];
    }),
  ),
);

/**
 * The painted icon of a hero skill, or undefined (enemy skills keep the placeholder). An infused
 * skill ("shock-lance@cold-chill") shows its base; the Wand's bolt turns into Frostbolt in Cold.
 */
export function skillArt(skillId: string): string | undefined {
  const [id = skillId, infusion] = skillId.split("@");
  const base = FORM_OF[id] ?? id;
  const element = infusion?.split("-")[0];
  if (base === "shockbolt" && element === "cold") return art("frostbolt");
  if (base === "shockbolt" && element === "void") return art("void-bolt");
  return art(base);
}

/** Skill icons and slot tints (placeholder art). */
const SKILL_ICONS: Record<string, IconName> = {
  "power-strike": "strike",
  flurry: "flurry",
  execute: "execute",
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
  immolate: "flame",
  corrupt: "void",
  wither: "curse",
  "soul-harvest": "harvest",
  "heavy-swing": "slam",
  "quick-cuts": "flurry",
  "cinder-spit": "fire",
  "flame-dash": "flame",
  fireball: "fire",
  "obsidian-shell": "shell",
  eruption: "meteor",
  pounce: "wolf",
  "ice-bolt": "snow",
  "glacial-mend": "drop",
  avalanche: "slam",
  "void-bolt": "void",
  "arc-dash": "bolt",
  "forked-bolt": "bolt",
  thunderclap: "bolt",
  "void-lance": "void",
  hex: "curse",
  consume: "void",
  "rift-snap": "slam",
  "soul-reap": "harvest",
  "harvest-swing": "harvest",
  ashfall: "meteor",
  "last-harvest": "harvest",
  cleave: "axe",
  thunderstrike: "bolt",
  "frost-nova": "snow",
  inferno: "flame",
  "void-rift": "void",
  "iron-bastion": "shield",
  rally: "cycle",
  "skull-crack": "slam",
  "barbed-arrow": "bow",
  "heavy-bolt": "crossbow",
  "crushing-blow": "hammer",
  "serrated-edge": "claw",
  envenom: "venom",
};

/** The Wand's Innate and its Forms: Lightning, or Cold after Attunement ("shock-lance@cold"). */
const WAND_INNATE = /^(shockbolt|shock-lance|shock-barrage|seeking-shockbolt)(@cold)?$/;

export function skillIcon(skillId: string): IconName {
  const wand = WAND_INNATE.exec(skillId);
  if (wand) return wand[2] ? "snow" : "bolt";
  return SKILL_ICONS[skillId] ?? (skillId.includes("slam") ? "slam" : "strike");
}

const SKILL_TINTS: Record<string, string> = {
  "power-strike": "#8a6a4a",
  flurry: "#7a5a24",
  execute: "#6a2a20",
  "ice-lance": "#2d6a8a",
  "chain-lightning": "#8a7a20",
  meteor: "#a8401a",
  lacerate: "#8a1f2c",
  "venom-coat": "#4f6a12",
  rend: "#6a1420",
  "toxic-burst": "#5f7a0e",
  immolate: "#a8401a",
  corrupt: "#5a2a8a",
  wither: "#4a1f6a",
  "soul-harvest": "#6a2a8a",
  "void-bolt": "#5a2a8a",
  cleave: "#7a1a24",
  thunderstrike: "#8a7a20",
  "frost-nova": "#2d6a8a",
  inferno: "#b8481a",
  "void-rift": "#4a1f7a",
  "iron-bastion": "#5a5a6a",
  rally: "#8a5a1a",
  "skull-crack": "#7a6a3a",
  "barbed-arrow": "#7a2a2c",
  "heavy-bolt": "#5a5a6a",
  "crushing-blow": "#5e5750",
  "serrated-edge": "#8a1f2c",
  envenom: "#4f6a12",
};

function flatTint(skillId: string): string {
  const wand = WAND_INNATE.exec(skillId);
  if (wand) return wand[2] ? "#2d6a8a" : "#8a7a20";
  return SKILL_TINTS[skillId] ?? "#6b5a3e";
}

/**
 * A skill slot's background. Behind a painting the tint only glows faintly in a dark well, so the
 * painted colours stand out (Timo: icons must read well in their frame).
 */
export function skillTint(skillId: string): string {
  const tint = flatTint(skillId);
  return skillArt(skillId) ? `radial-gradient(circle at 50% 45%, ${tint}66, #1a120c 72%)` : tint;
}
