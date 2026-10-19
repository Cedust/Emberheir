import { ACTS, GAME_DATA } from "@emberheir/content";
import { type ActData, type GameState, bossKnown } from "@emberheir/sim";
import { type IconName } from "../../ui/Icon";
import { actVisible, visibleActs } from "../labels";
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
  | "shop"
  | "runes"
  | "road"
  | "nan";

/** Old Nan's lines; one about an act or its boss only once the hero knows it (no spoilers). */
const NAN_LINES: readonly {
  readonly text: string;
  readonly act?: string;
  readonly boss?: string;
}[] = [
  { text: "Sit, child. The fire remembers every one of you, even the clumsy ones." },
  {
    text: "Heat is a fickle friend. Swords lose it when they rest, wands gather it while they wait.",
  },
  {
    text: "Gorrak swings slow and hard. When his Heat runs high, be ready.",
    boss: "ashen-fields",
  },
  {
    text: "The Rotwood bleeds you slowly. Tenacity shortens whatever clings to you.",
    act: "rotwood",
  },
  { text: "The Mother of Rot feeds whenever she can. Fire spoils her meal.", boss: "rotwood" },
  { text: "Dying costs you the road, not your things. Keep walking." },
  { text: "Thoric fixes steel. Liora fixes moods. Neither fixes you." },
];

/** The lines Old Nan may say to this Heir. */
export function nanLines(state: GameState): string[] {
  return NAN_LINES.filter(
    (l) => (!l.act || actVisible(state, l.act)) && (!l.boss || bossKnown(state, GAME_DATA, l.boss)),
  ).map((l) => l.text);
}

export interface Persona {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly icon: IconName;
  readonly cloak: string;
  readonly quote: string;
  readonly target?: CampTarget;
  readonly object?: { w: number; h: number };
  readonly figure?: { fs: number };
  readonly locked?: string;
}

export function personas(state: GameState, road: ActData): Persona[] {
  const trainer = state.progress.trainerUnlocked;
  const runesmith = state.progress.runesmithUnlocked;
  const later = "Waits further down the road.";
  const first = visibleActs(state)[0];
  const afterBoss =
    first && bossKnown(state, GAME_DATA, first.id)
      ? `Joins the caravan once ${first.boss.name} falls.`
      : "Joins the caravan once the first boss falls.";
  const points = state.hero.unspentAttributePoints;
  return [
    {
      id: "hearth",
      name: "Hearthfire",
      role: "Legacy",
      x: 710,
      y: 610,
      icon: "fire",
      cloak: "#a8401a",
      object: { w: 150, h: 230 },
      quote: "Whatever rests near the fire survives the burning.",
      target: "legacy",
    },
    {
      id: "heir",
      name: "Your Heir",
      role: `Level ${state.hero.level}${points > 0 ? ` · ${points} attribute points` : ""}`,
      x: 460,
      y: 720,
      icon: "user",
      cloak: "#a8401a",
      figure: { fs: 1.25 },
      quote: "Your own gear, stats and attribute points.",
      target: "character",
    },
    {
      id: "nan",
      name: "Old Nan",
      role: "Hearthkeeper",
      x: 920,
      y: 700,
      icon: "nan",
      cloak: "#5e4a36",
      figure: { fs: 0.9 },
      quote: "",
    },
    {
      id: "thoric",
      name: "Thoric",
      role: "Blacksmith",
      x: 1180,
      y: 600,
      icon: "hammer",
      cloak: "#4a4a4e",
      figure: { fs: 1.1 },
      quote: "“Bring me steel. I’ll bring it back better. Mostly.”",
      target: "forge",
    },
    {
      id: "marisha",
      name: "Marisha",
      role: "Black Market",
      x: 175,
      y: 600,
      icon: "coins",
      cloak: "#7a5a24",
      figure: { fs: 0.95 },
      quote:
        "“Buy now! Everything comes back stronger after the apocalypse. Especially my prices.”",
      target: "shop",
    },
    {
      id: "liora",
      name: "Liora",
      role: "Mystic",
      x: 320,
      y: 560,
      icon: "eye",
      cloak: "#2d5bd0",
      figure: { fs: 0.95 },
      quote: trainer ? "“I foresaw you would come. I also foresee you paying.”" : afterBoss,
      target: "altar",
      ...(trainer ? {} : { locked: "boss" }),
    },
    {
      id: "kaelen",
      name: "Kaelen",
      role: "Trainer",
      x: 610,
      y: 555,
      icon: "sword",
      cloak: "#6a2a20",
      figure: { fs: 1.05 },
      quote: "“Late to one battle. Never late to training.”",
      target: "kaelen",
    },
    {
      id: "nyssa",
      name: "Nyssa",
      role: "Runesmith",
      x: 970,
      y: 560,
      icon: "rune",
      cloak: "#4f7a3a",
      figure: { fs: 1 },
      quote: runesmith
        ? "“Did you know there are runes older than the Harvester? Nobody asks about those.”"
        : later,
      target: "runes",
      ...(runesmith ? {} : { locked: later }),
    },
    {
      id: "eldrin",
      name: "Eldrin",
      role: "Scout",
      // Perched on the signpost to the next act: he has seen what's ahead.
      x: 1300 + SIGNPOST_DX,
      y: 725,
      icon: "bow",
      cloak: "#3b5a2c",
      figure: { fs: 0.9 },
      quote: `“${road.name}. ${ACTS.find((a) => a.id === road.id)?.focus ?? ""}. ${
        bossKnown(state, GAME_DATA, road.id)
          ? `At its end: ${road.boss.name}. ${road.boss.description}`
          : "At its end waits something nobody came back to name."
      }”`,
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
      target: "stash",
    },
  ];
}
