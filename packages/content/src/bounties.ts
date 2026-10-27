import type { BountyDefinition } from "@emberheir/sim";

/**
 * Eldrin's Bounties (bounties-v2-plan.md): he offers two for a trip into an act, the hero takes
 * one. `#` is the count, `@` the enemy. Each pays Eldrin's Cache (the act's Home Rune and an item
 * pick) plus its own bonus, so the choice is about what the hero needs.
 */
export const BOUNTIES: readonly BountyDefinition[] = [
  {
    id: "elite-hunt",
    name: "Elite Hunt",
    text: "Slay # Elites on this trip. Gatekeepers do not count.",
    goal: { kind: "elites", count: 2 },
    bonus: { kind: "emberCoal", min: 4, max: 6 },
    toAct: 3,
  },
  {
    id: "elite-hunt-2",
    name: "Elite Hunt",
    text: "Slay # Elites on this trip. Gatekeepers do not count.",
    goal: { kind: "elites", count: 3 },
    bonus: { kind: "emberCoal", min: 4, max: 6 },
    fromAct: 4,
  },
  {
    id: "trail-hunt",
    name: "Trail Hunt",
    text: "# Trail kills on @. Elites and its Hunt node count more.",
    goal: { kind: "trail" },
    bonus: { kind: "trail", kills: 5 },
  },
  {
    id: "thief-chase",
    name: "Thief Chase",
    text: "Catch the Ember Thief before it flees. It was seen nearby.",
    goal: { kind: "thief" },
    bonus: { kind: "picks", picks: 2 },
    fromAct: 2,
  },
  {
    id: "dry-throat",
    name: "Dry Throat",
    text: "Beat the boss without drinking from the Flask.",
    goal: { kind: "bossNoFlask" },
    bonus: { kind: "rarity" },
  },
];
