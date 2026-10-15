import { ACTS, GAME_DATA } from "@emberheir/content";
import { type ActData, type GameState } from "@emberheir/sim";
import { type IconName } from "../../ui/Icon";
import { SIGNPOST_DX } from "./art/CampScene";

/** The Camp's people: who stands where, what they say, where a click on them leads. */

export type CampTarget =
  | "legacy"
  | "character"
  | "forge"
  | "altar"
  | "kaelen"
  | "stash"
  | "compendium"
  | "codex"
  | "shop"
  | "runes";

export const NAN_LINES = [
  "Sit, child. The fire remembers every one of you, even the clumsy ones.",
  "Heat is a fickle friend. Swords lose it when they rest, wands gather it while they wait.",
  "Gorrak swings slow and hard. When his Heat runs high, be ready.",
  "The Rotwood bleeds you slowly. Tenacity shortens whatever clings to you.",
  "The Mother of Rot feeds whenever she can. Fire spoils her meal.",
  "Dying costs you the road, not your things. Keep walking.",
  "Thoric fixes steel. Liora fixes moods. Neither fixes you.",
];

export interface Persona {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly icon: IconName;
  readonly cloak: string;
  readonly quote: string;
  readonly actions: readonly { name: string; later?: boolean }[];
  readonly cta: string;
  readonly target?: CampTarget;
  readonly object?: { w: number; h: number };
  readonly figure?: { fs: number };
  readonly locked?: string;
}

export function personas(state: GameState, road: ActData): Persona[] {
  const trainer = state.progress.trainerUnlocked;
  const runesmith = state.progress.runesmithUnlocked;
  const later = "Waits somewhere in the Rotwood.";
  const afterBoss = `Joins the caravan once ${GAME_DATA.acts[0]?.boss.name ?? "the boss"} falls.`;
  const points = state.hero.unspentAttributePoints;
  return [
    {
      id: "hearth",
      name: "Hearthfire",
      role: "Legacy",
      x: 720,
      y: 612,
      icon: "fire",
      cloak: "#a8401a",
      object: { w: 150, h: 230 },
      quote: "Whatever rests near the fire survives the burning.",
      actions: [
        { name: "Worn Gear" },
        { name: "Trophy Wall" },
        { name: "Collections" },
        { name: "Chronicle" },
      ],
      cta: "Open Legacy",
      target: "legacy",
    },
    {
      id: "heir",
      name: "Your Heir",
      role: `Level ${state.hero.level}${points > 0 ? ` · ${points} attribute points` : ""}`,
      x: 930,
      y: 668,
      icon: "user",
      cloak: "#a8401a",
      figure: { fs: 1.25 },
      quote: "Your own gear, stats and attribute points.",
      actions: [
        { name: "Equipment" },
        { name: "Stats" },
        { name: "Attributes" },
        { name: "Inventory" },
      ],
      cta: "Open Character",
      target: "character",
    },
    {
      id: "nan",
      name: "Old Nan",
      role: "Hearthkeeper",
      x: 500,
      y: 655,
      icon: "nan",
      cloak: "#5e4a36",
      figure: { fs: 0.9 },
      quote: "",
      actions: [
        { name: "Talk" },
        { name: "Compendium" },
        { name: "Trigger Codex" },
        { name: "Ember Flask" },
      ],
      cta: "Talk",
    },
    {
      id: "thoric",
      name: "Thoric",
      role: "Blacksmith",
      x: 1205,
      y: 552,
      icon: "hammer",
      cloak: "#4a4a4e",
      figure: { fs: 1.1 },
      quote: "“Bring me steel. I’ll bring it back better. Mostly.”",
      actions: [{ name: "Upgrade" }, { name: "Reforge" }, { name: "Salvage" }],
      cta: "Open Forge",
      target: "forge",
    },
    {
      id: "marisha",
      name: "Marisha",
      role: "Black Market",
      x: 245,
      y: 570,
      icon: "coins",
      cloak: "#7a5a24",
      figure: { fs: 0.95 },
      quote:
        "“Buy now! Everything comes back stronger after the apocalypse. Especially my prices.”",
      actions: [{ name: "Gamble" }],
      cta: "Open Shop",
      target: "shop",
    },
    {
      id: "liora",
      name: "Liora",
      role: "Mystic",
      x: 395,
      y: 550,
      icon: "eye",
      cloak: "#2d5bd0",
      figure: { fs: 0.95 },
      quote: trainer ? "“I foresaw you would come. I also foresee you paying.”" : afterBoss,
      actions: [{ name: "Temper" }, { name: "Kindle" }],
      cta: trainer ? "Open Altar" : "Locked",
      target: "altar",
      ...(trainer ? {} : { locked: "boss" }),
    },
    {
      id: "kaelen",
      name: "Kaelen",
      role: "Trainer",
      x: 830,
      y: 522,
      icon: "sword",
      cloak: "#6a2a20",
      figure: { fs: 1.05 },
      quote: "“Late to one battle. Never late to training.”",
      actions: [{ name: "Skill Tree" }, { name: "Battle Plan" }, { name: "Respec" }],
      cta: "Open Skill Tree",
      target: "kaelen",
    },
    {
      id: "nyssa",
      name: "Nyssa",
      role: "Runesmith",
      x: 1025,
      y: 548,
      icon: "rune",
      cloak: "#4f7a3a",
      figure: { fs: 1 },
      quote: runesmith
        ? "“Did you know there are runes older than the Harvester? Nobody asks about those.”"
        : later,
      actions: [
        { name: "Add Socket" },
        { name: "Socket Runes" },
        { name: "Combine Runes" },
        { name: "Runeword Codex" },
      ],
      cta: runesmith ? "Open Runes" : "Locked",
      target: "runes",
      ...(runesmith ? {} : { locked: later }),
    },
    {
      id: "eldrin",
      name: "Eldrin",
      role: "Scout",
      // Perched on the signpost to the next act: he has seen what's ahead.
      x: 1300 + SIGNPOST_DX,
      y: 647,
      icon: "bow",
      cloak: "#3b5a2c",
      figure: { fs: 0.9 },
      quote: `“${road.name}. ${ACTS.find((a) => a.id === road.id)?.focus ?? ""}. At its end: ${road.boss.name}. ${road.boss.description}”`,
      actions: [{ name: "Act Preview" }, { name: state.bountyDone ? "Turn In" : "Bounty" }],
      cta: `Set Out · Act ${road.number}`,
    },
    {
      id: "wagon",
      name: "Supply Wagon",
      role: "Stash",
      x: 30,
      y: 512,
      icon: "box",
      cloak: "#8a5a32",
      object: { w: 230, h: 270 },
      quote: "Everything you carry but don’t wear. Fixed size, shared by all your Heirs.",
      actions: [{ name: "Stash" }, { name: "Inventory" }],
      cta: "Open Stash",
      target: "stash",
    },
  ];
}
