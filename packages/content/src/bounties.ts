import type { BountyDefinition } from "@emberheir/sim";

/**
 * The Scout's Bounties (entschlackung-v1.md): one optional task per trip into an act. `#` is the
 * count, `@` the enemy, `%` the Life share. Elites are rare in the first acts, so the Elite hunt
 * asks for more of them only from Act 4 on.
 */
export const BOUNTIES: readonly BountyDefinition[] = [
  {
    id: "elite-hunt",
    name: "Elite Hunt",
    text: "Slay an Elite on this trip.",
    goal: { kind: "elites", count: 1 },
    toAct: 3,
  },
  {
    id: "elite-hunt-2",
    name: "Elite Hunt",
    text: "Slay # Elites on this trip.",
    goal: { kind: "elites", count: 2 },
    fromAct: 4,
  },
  {
    id: "culling",
    name: "Culling",
    text: "Slay # @.",
    goal: { kind: "slay", count: 3 },
  },
  {
    id: "thief-chase",
    name: "Thief Chase",
    text: "Catch the Ember Thief. It was seen nearby.",
    goal: { kind: "thief" },
    fromAct: 2,
  },
  {
    id: "dry-throat",
    name: "Dry Throat",
    text: "Beat the boss without drinking from the Flask.",
    goal: { kind: "bossNoFlask" },
  },
  {
    id: "hale-and-whole",
    name: "Hale and Whole",
    text: "Beat the boss with % Life left.",
    goal: { kind: "bossHale", life: 0.5 },
  },
];
