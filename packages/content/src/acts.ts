export interface ActDefinition {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  /** What the act tests, shown on the road in the Camp (gegner-bosse-v1.md section 1). */
  readonly focus: string;
  /** Arena background gradient (top -> bottom), see docs/design/ui-look-v1.md. */
  readonly arenaGradient: readonly [string, string];
}

export const STAGES_PER_ACT = 15;

export const ACTS: readonly ActDefinition[] = [
  {
    id: "ashen-fields",
    number: 1,
    name: "Ashen Fields",
    focus: "Physical",
    arenaGradient: ["#8a7552", "#3b3024"],
  },
  {
    id: "rotwood",
    number: 2,
    name: "Rotwood",
    focus: "Bleed · Poison",
    arenaGradient: ["#4f7a3a", "#1f2e1a"],
  },
  {
    id: "ember-wastes",
    number: 3,
    name: "Ember Wastes",
    focus: "Fire · Burn",
    arenaGradient: ["#d1552a", "#4a1a10"],
  },
  {
    id: "frost-peaks",
    number: 4,
    name: "Frost Peaks",
    focus: "Cold · Chill",
    arenaGradient: ["#7fb8d8", "#1f3647"],
  },
  {
    id: "storm-spires",
    number: 5,
    name: "Storm Spires",
    focus: "Lightning · Shock",
    arenaGradient: ["#8a6fd8", "#2a2050"],
  },
  {
    id: "void-rift",
    number: 6,
    name: "Void Rift",
    focus: "Void · Corruption",
    arenaGradient: ["#5a2a7a", "#120a1c"],
  },
  {
    id: "emberfall",
    number: 7,
    name: "Emberfall",
    focus: "Everything",
    arenaGradient: ["#ffb13b", "#6a1c0a"],
  },
];
