import { ACTS, GAME_DATA } from "@emberheir/content";
import {
  type ActData,
  type GameState,
  bossKnown,
  finaleOpen,
  hasMet,
  wildfireTop,
} from "@emberheir/sim";
import { type IconName } from "../../ui/Icon";
import { actVisible } from "../labels";
import { SIGNPOST_DX } from "./art/CampScene";
import { PAINTED } from "./art/paintedPersonas";

/** The Camp's people: who stands where, what they say, where a click on them leads. */

export type CampTarget =
  | "legacy"
  | "character"
  | "forge"
  | "altar"
  | "kaelen"
  | "dummy"
  | "stash"
  | "compendium"
  | "shop"
  | "runes"
  | "road"
  | "nan";

/** Kaelen lunges right of the Hearthfire, at his Training Dummy left of it. */
const KAELEN = { x: 810, y: 555, fs: 1.05 };
const DUMMY_X = KAELEN.x - (PAINTED.kaelen?.prop?.x ?? 0) * KAELEN.fs;

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

/**
 * Eldrin's lines in his Road window: scouting gossip, never what waits on a road (no spoilers)
 * and never where a currency comes from.
 */
const ELDRIN_LINES: readonly {
  readonly text: string;
  readonly when?: (state: GameState) => boolean;
}[] = [
  { text: "I've seen the road ahead. Mostly from above. It looks smaller from up there." },
  { text: "Pack light. I'll carry the bad news." },
  { text: "Every road leads somewhere. Most of them lead to something with teeth." },
  { text: "Maps are just rumors with straight lines." },
  { text: "I don't fly ahead because I'm brave. I fly ahead because I'm nosy." },
  { text: "Ravens never get lost. We just find new places to be." },
  { text: "If you hear cawing, run. If you hear nothing at all, run faster." },
  { text: "I marked every dangerous spot on your map. Yes, that's why it's all red." },
  { text: "Anything shiny on the road is mine. Scout's fee." },
  { text: "The road is very patient. I am not. Shall we?" },
  { text: "Back already? Good. I hate scouting for nobody." },
  {
    text: "Bounty done! I knew you'd make it. I even bet on it. Against Marisha.",
    when: (s) => Boolean(s.bountyDone),
  },
  {
    text: "The whole world burns again. Lovely view. Terrible smell.",
    when: (s) => wildfireTop(s) > 0,
  },
  {
    text: "One road I never scouted. Some roads you walk alone, Heir.",
    when: (s) => finaleOpen(s, GAME_DATA) && !s.legacy.finaleWon,
  },
];

/** The lines Eldrin may say to this Heir. */
export function eldrinLines(state: GameState): string[] {
  return ELDRIN_LINES.filter((l) => !l.when || l.when(state)).map((l) => l.text);
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
  /** A clickable spot in the backdrop; `front` lays it over the personas' spots. */
  readonly object?: { w: number; h: number; front?: boolean };
  readonly figure?: { fs: number };
  /** Not met on the road yet: not in the Camp at all (camp-personas-freischalten-v1.md). */
  readonly locked?: boolean;
}

export function personas(state: GameState, road: ActData): Persona[] {
  const away = (who: Parameters<typeof hasMet>[1]) => (hasMet(state, who) ? {} : { locked: true });
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
      // Over Kaelen's spot: he lunges right behind the fire.
      object: { w: 120, h: 150, front: true },
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
      ...away("marisha"),
    },
    {
      id: "liora",
      name: "Liora",
      role: "Mystic",
      x: 360,
      y: 560,
      icon: "eye",
      cloak: "#2d5bd0",
      figure: { fs: 0.95 },
      quote: "“I foresaw you would come. I also foresee you paying.”",
      target: "altar",
      ...away("liora"),
    },
    {
      id: "kaelen",
      name: "Kaelen",
      role: "Trainer",
      x: KAELEN.x,
      y: KAELEN.y,
      icon: "sword",
      cloak: "#6a2a20",
      figure: { fs: KAELEN.fs },
      quote: "“Late to one battle. Never late to training.”",
      target: "kaelen",
      ...away("kaelen"),
    },
    {
      // Painted with Kaelen (his prop); this is only its clickable spot.
      id: "dummy",
      name: "Training Dummy",
      role: "Test your build",
      x: DUMMY_X,
      y: KAELEN.y,
      icon: "eye",
      cloak: "#8a6a3a",
      // Up to the top of the pot, so the name plate sits above the dummy.
      object: { w: 100, h: 175 },
      quote: "Hit it. It keeps count.",
      target: "dummy",
      ...away("kaelen"),
    },
    {
      id: "nyssa",
      name: "Nyssa",
      role: "Runesmith",
      x: 1000,
      y: 560,
      icon: "rune",
      cloak: "#4f7a3a",
      figure: { fs: 1 },
      quote: "“Did you know there are runes older than the Harvester? Nobody asks about those.”",
      target: "runes",
      ...away("nyssa"),
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
