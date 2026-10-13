import type { DraughtDefinition } from "@emberheir/sim";

/**
 * Draughts (balance-grundlagen-v1.md F): one Flask charge brewed before setting out, working
 * until the Camp. Defensive only. Starting values for the balance CLI.
 */
const element = (
  id: "fire" | "cold" | "lightning" | "void",
  name: string,
  color: number,
): DraughtDefinition => {
  const label = id[0]?.toUpperCase() + id.slice(1);
  return {
    id: `${id}-draught`,
    name,
    description: `+20 % ${label} Resistance, +5 % max ${label} Resistance`,
    explain: `Brewed against ${label}: your ${label} Resistance rises, and its cap goes up from 75 % to 80 %. Pick it for an act whose boss hits with ${label}.`,
    color,
    bonuses: { [`${id}Resistance`]: 0.2 },
    rules: { maxResistance: { [id]: 0.05 } },
  };
};

export const DRAUGHTS: readonly DraughtDefinition[] = [
  {
    id: "iron-draught",
    name: "Iron Draught",
    description: "+25 % Armor",
    explain: "Your skin turns hard as bark: more Armor against Physical hits.",
    color: 0xb8c0cc,
    bonuses: { increasedArmor: 0.25 },
  },
  {
    id: "ward-draught",
    name: "Ward Draught",
    description: "+25 % Barrier, recharges 50 % faster",
    explain: "Your Barrier grows and fills up again faster. Best for casters with Barrier gear.",
    color: 0x8ec8f0,
    bonuses: { increasedBarrier: 0.25 },
    rules: { barrierRecharge: 1.5 },
  },
  {
    id: "vigor-draught",
    name: "Vigor Draught",
    description: "+10 % max Life",
    explain: "More Life for every fight of the trip.",
    color: 0xc8423a,
    bonuses: { increasedLife: 0.1 },
  },
  element("fire", "Fire Draught", 0xf08a3c),
  element("cold", "Frost Draught", 0x9ad8f8),
  element("lightning", "Storm Draught", 0xe8dc6a),
  element("void", "Void Draught", 0xa070e0),
];
