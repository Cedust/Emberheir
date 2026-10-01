export interface ActDefinition {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  /** Arena background gradient (top -> bottom), see docs/design/ui-look-v1.md. */
  readonly arenaGradient: readonly [string, string];
  /** Only Act 1 is playable in the PoC. */
  readonly playableInPoc: boolean;
}

export const STAGES_PER_ACT = 15;

export const ACTS: readonly ActDefinition[] = [
  {
    id: "ashen-fields",
    number: 1,
    name: "Ashen Fields",
    arenaGradient: ["#8a7552", "#3b3024"],
    playableInPoc: true,
  },
  {
    id: "rotwood",
    number: 2,
    name: "Rotwood",
    arenaGradient: ["#4f7a3a", "#1f2e1a"],
    playableInPoc: false,
  },
  {
    id: "ember-wastes",
    number: 3,
    name: "Ember Wastes",
    arenaGradient: ["#d1552a", "#4a1a10"],
    playableInPoc: false,
  },
  {
    id: "frost-peaks",
    number: 4,
    name: "Frost Peaks",
    arenaGradient: ["#7fb8d8", "#1f3647"],
    playableInPoc: false,
  },
  {
    id: "storm-spires",
    number: 5,
    name: "Storm Spires",
    arenaGradient: ["#8a6fd8", "#2a2050"],
    playableInPoc: false,
  },
  {
    id: "void-rift",
    number: 6,
    name: "Void Rift",
    arenaGradient: ["#5a2a7a", "#120a1c"],
    playableInPoc: false,
  },
  {
    id: "emberfall",
    number: 7,
    name: "Emberfall",
    arenaGradient: ["#ffb13b", "#6a1c0a"],
    playableInPoc: false,
  },
];
