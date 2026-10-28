import { ITEM_CATALOG } from "@emberheir/content";
import {
  affixRollRange,
  describeStat,
  describeTrigger,
  greaterRank,
  resolveTrigger,
  statAffixValue,
  type GameState,
  type Item,
  hasMet,
} from "@emberheir/sim";
import type { IconName } from "../../ui/Icon";

/** The Camp's traders and trainers: their names, actions and the texts of their offers. */

/** Scale of the paperdoll next to the inventory. */
export const SIDE_DOLL = 0.85;

export type PersonaId = "thoric" | "liora" | "nyssa" | "marisha";

export type ActionKind =
  | "upgrade"
  | "socket"
  | "salvage"
  | "reforge"
  | "temper"
  | "kindle"
  | "rune"
  | "combine"
  | "codex"
  | "gamble"
  | "awaken"
  | "shift"
  | "intensify"
  | "crucible";

interface PersonaDef {
  readonly name: string;
  readonly role: string;
  readonly portrait: string;
  readonly accent: string;
  /** What the crafter says in the speech bubble; a different one every visit. */
  readonly quotes: readonly string[];
  readonly actions: readonly {
    k: ActionKind;
    icon: IconName;
    name: string;
    desc: string;
    /** Only after The Last Ember (Greater Affixes need Cinderglass from the Wildfire). */
    endgame?: boolean;
    /** Only once the account knows a Legendary Power (Ember Crucible). */
    powers?: boolean;
  }[];
}

export const PERSONAS: Record<PersonaId, PersonaDef> = {
  thoric: {
    name: "Thoric",
    role: "Blacksmith",
    portrait: "#5a3a24",
    accent: "#c9c2b8",
    quotes: [
      "Bring it here. If it's bent, I straighten it. If it's broken, I charge extra.",
      "Steel remembers every hammer blow. So do I. Mostly the ones on my thumb.",
      "Another dent? What do you do out there, headbutt the trees?",
      "Good steel, bad steel. Hit it hard enough and it all sounds the same.",
      "Don't touch the anvil. It's hot. No, the other one is hot too.",
      "I don't do small talk. I do big hammers.",
    ],
    actions: [
      { k: "upgrade", icon: "hammer", name: "Upgrade", desc: "+1 Tier. Rolls keep their quality." },
      {
        k: "reforge",
        icon: "cycle",
        name: "Reforge",
        desc: "Reroll all stat affixes. Triggers stay. Removes the lock.",
      },
      {
        k: "salvage",
        icon: "trash",
        name: "Salvage",
        desc: "Break an inventory item down into Ash.",
      },
    ],
  },
  liora: {
    name: "Liora",
    role: "Mystic",
    portrait: "#3a2a5a",
    accent: "#b36bff",
    quotes: [
      "One affix at a time, dear. All of them at once? Ask Thoric and his hammer.",
      "The moon told me you'd come. It also told me to buy more candles.",
      "Hold still. Magic is like a cat. It comes when it wants to.",
      "Every item has a little song inside. Yours hums off-key.",
      "I tried to read your future. It was mostly fighting. And some napping.",
      "Breathe in. Breathe out. Now, which affix are we being mean to today?",
    ],
    actions: [
      {
        k: "temper",
        icon: "gear",
        name: "Temper",
        desc: "Two offers for one affix: a new affix or a new value. Or keep it.",
      },
      {
        k: "kindle",
        icon: "fire",
        name: "Kindle",
        desc: "Build a trigger from the Trigger Codex.",
      },
      {
        k: "awaken",
        icon: "eye",
        name: "Awaken",
        desc: "A random affix becomes Greater I: 110 % of its best roll.",
        endgame: true,
      },
      {
        k: "shift",
        icon: "next",
        name: "Shift",
        desc: "The Greater moves to another random affix. Its rank stays.",
        endgame: true,
      },
      {
        k: "intensify",
        icon: "flame",
        name: "Intensify",
        desc: "Greater one rank higher: +10 % up to Greater V (150 %).",
        endgame: true,
      },
      {
        k: "crucible",
        icon: "flask",
        name: "Ember Crucible",
        desc: "Bind Legendary Powers you learned by salvaging.",
        powers: true,
      },
    ],
  },
  nyssa: {
    name: "Nyssa",
    role: "Runesmith",
    portrait: "#2e4a26",
    accent: "#8fd06a",
    quotes: [
      "Three small runes make one bigger rune. It's basically poetry. With rocks.",
      "Careful with that one. It bites. Not really. Probably.",
      "I sort my runes by color, size and how loudly they glow at night.",
      "A Socket is just a hole with ambition.",
      "Did you know some runes are older than the trees? Nobody ever asks about those.",
      "If you hear humming from my bag, that's normal. If it stops, run.",
    ],
    actions: [
      { k: "socket", icon: "shell", name: "Add Socket", desc: "+1 Socket on a Normal item." },
      { k: "rune", icon: "rune", name: "Socket Rune", desc: "A Rune into a free Socket. Forever." },
      {
        k: "combine",
        icon: "stone",
        name: "Combine Runes",
        desc: "Three of a kind make the next Rune.",
      },
      { k: "codex", icon: "book", name: "Runeword Codex", desc: "Every Runeword you know." },
    ],
  },
  marisha: {
    name: "Marisha",
    role: "Black Market",
    portrait: "#5a4218",
    accent: "#e0c27a",
    quotes: [
      "Gamble? Of course. The house always wins. I am the house.",
      "No refunds. No questions. No looking inside before you pay.",
      "Everything in my chest is legal. Somewhere. Probably.",
      "Feeling lucky? Good. Luck is my best customer.",
      "I found this on the road. Well, it was on someone. Near the road.",
      "Psst. Want something shiny? Of course you do.",
    ],
    actions: [
      {
        k: "gamble",
        icon: "coins",
        name: "Gamble",
        desc: "A random item for the slot you choose. Same odds as loot.",
      },
    ],
  },
};

export const PERSONA_ORDER: readonly PersonaId[] = ["thoric", "liora", "nyssa", "marisha"];

/** Whether a persona travels with the caravan yet. */
export function personaPresent(state: GameState, id: PersonaId): boolean {
  if (id === "liora" || id === "nyssa" || id === "marisha") return hasMet(state, id);
  return true;
}

export { greaterName } from "@emberheir/sim";

export function affixText(item: Item, index: number): { text: string; trigger: boolean } {
  const roll = item.affixes[index];
  const affix = roll ? ITEM_CATALOG.affixes.get(roll.affixId) : undefined;
  if (!roll || !affix) return { text: "?", trigger: false };
  const greater = greaterRank(item, index);
  if (affix.kind === "trigger") {
    return {
      text: describeTrigger(resolveTrigger(affix, item.tier, roll.quality, greater)),
      trigger: true,
    };
  }
  return {
    text: describeStat(
      affix.stat,
      statAffixValue(affix, item.tier, roll.quality, item.rarity, greater),
    ),
    trigger: false,
  };
}

export function rangeText(item: Item, affixId: string): string {
  const affix = ITEM_CATALOG.affixes.get(affixId);
  const range = affixRollRange(item, affixId, ITEM_CATALOG);
  if (!affix || affix.kind !== "stat" || !range) return "?";
  const lo = describeStat(affix.stat, range.min);
  const hi = describeStat(affix.stat, range.max);
  // "+3% Crit Chance" and "+5% Crit Chance" → "+3–5% Crit Chance"
  const m1 = /^([+-]?[\d.,]+)(.*)$/.exec(lo);
  const m2 = /^([+-]?[\d.,]+)(.*)$/.exec(hi);
  if (m1 && m2 && m1[2] === m2[2]) {
    return m1[1] === m2[1] ? lo : `${m1[1]}–${(m2[1] ?? "").replace("+", "")}${m1[2]}`;
  }
  return `${lo} to ${hi}`;
}
