import { GAME_DATA } from "@emberheir/content";
import { type Attribute, type GameState, finaleOpen, hasMet } from "@emberheir/sim";
import type { ReactNode } from "react";
import hearthfireUrl from "../../assets/camp/hearthfire-bowl.webp";
import attributePointsUrl from "../../assets/harvest/attribute-points.webp";
import battlePlanUrl from "../../assets/harvest/battle-plan.webp";
import keystonePlaceUrl from "../../assets/harvest/keystone-place.webp";
import levelCapUrl from "../../assets/harvest/level-cap.webp";
import bossMarkUrl from "../../assets/ui/stage-boss.webp";
import gateMarkUrl from "../../assets/ui/stage-gate.webp";
import glassUrl from "../../assets/currency/glass.webp";
import runesUrl from "../../assets/currency/runes.webp";
import { CURRENCIES, type CurrencyId } from "../../ui/kit/Currency";
import {
  ENEMY_TYPE_ICONS,
  ENEMY_TYPE_NAMES,
  type EnemyTypeIcon,
  GAME_ICONS,
  HEAT_FORM_ICONS,
  RANK_MARKS,
  weaponIconUrl,
} from "../../ui/gameIcons";
import { draughtIconUrl } from "../../ui/Potion";
import { RuneStone, runeName } from "../../ui/RuneArt";
import { TrailMark } from "../../ui/TrailMark";
import { ATTRIBUTE_INFO } from "../AttributeStones";
import { ClassEmblem, MasteryEmblem } from "../ClassEmblem";
import { PersonaPortrait } from "../camp/art/PersonaArt";
import { TRAIL_NAMES, TRAIL_TEXT } from "../hunts";
import {
  A,
  B,
  C,
  Facts,
  Hint,
  LockedRow,
  Nan,
  R,
  S,
  attributeIcon,
  big,
  currencyIcon,
  enemyIcon,
  statIcon,
} from "./bits";

export interface CompendiumPage {
  readonly id: string;
  readonly title: string;
  /** Shown only once the game has shown the thing (no spoilers). */
  readonly when?: (state: GameState) => boolean;
  /** A painting beside the page's title. */
  readonly art?: ReactNode | ((state: GameState) => ReactNode);
  readonly body: (state: GameState) => ReactNode;
}

export interface CompendiumChapter {
  readonly id: string;
  readonly title: string;
  readonly icon: ReactNode | ((state: GameState) => ReactNode);
  readonly pages: readonly CompendiumPage[];
}

const NODE_ART = import.meta.glob<string>("../../assets/map/node-*.webp", {
  eager: true,
  import: "default",
});
const node = (kind: string) => NODE_ART[`../../assets/map/node-${kind}.webp`];

// When a page opens up.
const harvested = (s: GameState) => s.legacy.prestige >= 1;
const runAtLeast = (n: number) => (s: GameState) => s.legacy.prestige + 1 >= n;
const kaelenHere = (s: GameState) => hasMet(s, "kaelen");
const nyssaHere = (s: GameState) => hasMet(s, "nyssa");
const lioraHere = (s: GameState) => hasMet(s, "liora");
const marishaHere = (s: GameState) => hasMet(s, "marisha");
const finaleKnown = (s: GameState) => finaleOpen(s, GAME_DATA) || s.legacy.finaleWon === true;
const finaleWon = (s: GameState) => s.legacy.finaleWon === true;
const runesKnown = (s: GameState) => nyssaHere(s) || s.legacy.runesFound.length > 0;

const chapterIcon = (src: string | undefined) =>
  src ? <img src={src} width={34} height={34} alt="" draggable={false} /> : null;
const portrait = (id: string) => (
  <span className="cp-portrait">
    <PersonaPortrait id={id} />
  </span>
);
const painting = (src: string | undefined) =>
  src ? <img className="cp-painting" src={src} alt="" draggable={false} /> : null;

const ATTRIBUTE_TEXT: Record<Attribute, string> = {
  strength: "Thicker skin, so more Armor. A Cinderguard also hits harder with it.",
  dexterity: "Lighter feet, so more Evasion. An Ashstrider also hits harder with it.",
  intelligence:
    "A sharper mind, so more Barrier, and your Damage refills more of it. An Emberseer also hits harder with it.",
  agility: "Quicker hands: faster Attacks and more Crits.",
  wisdom: "More Heat, stronger Ailments, and Triggers that go off more often.",
  vitality: "A tougher body: more Life, and Ailments on you wear off sooner.",
};

const ENEMY_TEXT: Record<Exclude<EnemyTypeIcon, "harvester" | "echo">, string> = {
  brute: "Lots of Life and Armor, slow heavy blows. Armor-breaking hits wear it down.",
  skirmisher: "Quick and hard to hit. Many hits and Chill keep up with it.",
  caster: "Spells and little Life. Resistances help, and so does ending it fast.",
  afflicter: "Covers you in Ailments. Tenacity and Lifesteal outlast it.",
  warden: "Barrier and Block, and it heals itself. Burn spoils the healing.",
  thornback: "Thorns hurt you on every hit. Fewer, bigger hits are better here.",
};

/** What each currency is, a little playful; the wallet tooltips say what it buys. */
const CURRENCY_TEXT: Partial<Record<CurrencyId, string>> = {
  acorns:
    "The caravan's coin. Everyone in the Camp takes them, for almost anything, and you never seem to have enough.",
  ash: "What is left when an item burns. Crafters swear it still remembers what it used to be.",
  coal: "A coal that never quite goes out. Hot enough to melt an item's Affixes and pour them anew.",
  feathers: "Rare and still warm to the touch. One feather lifts an item a whole Tier higher.",
  runes:
    "Small stones with an old word on each. Alone they help a little. In the right order, they speak a Runeword.",
  glass: "Ash so hot it turned to glass. It wakes the strongest Affixes an item can have.",
};

const CURRENCY_ORDER: readonly CurrencyId[] = ["acorns", "ash", "coal", "feathers", "runes"];
const RUNES = ["ash", "moss", "thorn", "venom", "ember", "rime", "volt", "dusk"] as const;
const MASTERIES: Record<string, readonly string[]> = {
  cinderguard: ["vanquisher", "berserker", "ravager"],
  ashstrider: ["deadeye", "skirmisher", "trickster"],
  emberseer: ["archmage", "spellweaver", "warlock"],
};

export const CHAPTERS: readonly CompendiumChapter[] = [
  {
    id: "journey",
    title: "The Journey",
    icon: chapterIcon(node("fight")),
    pages: [
      {
        id: "runs-acts",
        title: "Runs and Acts",
        art: painting(node("fight")),
        body: (s) => (
          <>
            <p>
              A run is one trip from the Camp through every act that is open. Your first run is only
              the Ashen Fields.{" "}
              {harvested(s)
                ? "Each Harvest opens one more act, so every new run is a little longer than the one before."
                : "Beat the boss at the end, and the road will not stay this short for long."}
            </p>
            <p>
              Every act ends with its Boss. On the way you pass <B>Waymarks</B>. The first time you
              reach one in a run, it gives you a Skill Point. Win a Waymark before the Boss and the
              Hearth Embers heal you a little, every time.
            </p>
            <Nan>Walk the old acts again whenever you like. The road remembers you.</Nan>
          </>
        ),
      },
      {
        id: "act-map",
        title: "The Act Map",
        body: (s) => (
          <>
            <p>
              Every trip into an act draws a fresh map with three trails. You pick the next stop;
              where the trails meet, everyone has to pass. Press <B>M</B> to open the map big.
            </p>
            <Facts
              rows={[
                {
                  icon: big(node("fight")),
                  name: "Fight",
                  text: "A normal fight. Sometimes an Elite turns up.",
                },
                { icon: big(node("elite")), name: "Elite", text: "A sure Elite and better loot." },
                {
                  icon: big(node("shrine")),
                  name: "Shrine",
                  text: "Wildfire only: pick 1 of 3 Boons.",
                },
                {
                  icon: big(node("hearth")),
                  name: "Hearth",
                  text: "Rest for Life, or take one more Flask charge.",
                },
                {
                  icon: big(node("cache")),
                  name: "Cache",
                  text: "An item pick, a Rune or Ember Coal, no fight.",
                },
                {
                  icon: big(node("event")),
                  name: "Event",
                  text: "Something odd on the road. You can always walk on.",
                },
                {
                  icon: big(node("marisha")),
                  name: "Marisha",
                  text: "She gambles here, cheaper than in the Camp.",
                },
                {
                  icon: big(node("empty")),
                  name: "Hunt",
                  text: "A chosen enemy that counts twice for its Trail.",
                },
                ...(harvested(s)
                  ? [
                      {
                        icon: big(node("thief")),
                        name: "Thief's Trail",
                        text: "Only with a Thief Bounty: the Ember Thief, for sure.",
                      },
                    ]
                  : []),
              ]}
            />
          </>
        ),
      },
      {
        id: "gate",
        title: "Warden's Gate",
        art: painting(gateMarkUrl),
        body: () => (
          <>
            <p>
              In the newest act, the Gatekeepers and the Boss stand behind a gate. The gate shows
              their level, red while you are below it.
            </p>
            <p>
              <B>Challenge</B> and you fight. <B>Wander</B> and you go back to the start of the act
              to grow stronger first. You keep your Life, Flask and Bounty, but no new Shrines
              appear while you wander.
            </p>
          </>
        ),
      },
      {
        id: "death",
        title: "Death and Retreat",
        body: () => (
          <>
            <p>
              Fall, and you wake up in the Camp. You keep everything you carry: level, gear,
              currencies and points. Only the way through the act starts over. A Retreat works the
              same, just without the dying.
            </p>
            <p>Each death in an act makes its loot a little better, until its Boss falls.</p>
            <Nan>Dying costs you the road, not your things. Keep walking.</Nan>
          </>
        ),
      },
      {
        id: "harvest",
        title: "The Harvest",
        when: harvested,
        art: painting(levelCapUrl),
        body: () => (
          <>
            <p>
              When the Boss of the newest act falls, the Harvester burns the world. You keep
              everything you carry and start again from the first act, with more to work with:
            </p>
            <Facts
              rows={[
                {
                  icon: big(levelCapUrl),
                  name: "New act",
                  text: "One more act opens, and your Level Cap rises.",
                },
                {
                  icon: big(attributePointsUrl),
                  name: "Points",
                  text: "2 Attribute Points and 2 Skill Points.",
                },
                {
                  icon: big(battlePlanUrl),
                  name: "Battle Plan",
                  text: "A new rung: more slots and new options.",
                },
                {
                  icon: big(keystonePlaceUrl),
                  name: "Mastery",
                  text: "Pick a Mastery or deepen yours. Some Harvests add a Keystone place.",
                },
              ]}
            />
            <p>
              Each Harvest also lowers your Resistances a bit for good (the <B>Ember Penalty</B>).
              Gear has to make up for it.
            </p>
          </>
        ),
      },
      {
        id: "omens",
        title: "Omens",
        when: harvested,
        body: () => (
          <>
            <p>
              Before you set out into an older act, Eldrin offers two Omens. Each one makes the act
              harder in one way and pays you back in another, for example tougher enemies for more
              Ember Coal, or a weaker Flask for stronger Hearths.
            </p>
            <p>The newest act never has an Omen. The one you chose is shown under Up Next.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "fight",
    title: "The Fight",
    icon: chapterIcon(GAME_ICONS.heat),
    pages: [
      {
        id: "how",
        title: "How a Fight Works",
        body: () => (
          <>
            <p>
              Every fight is one against one, and it plays by itself. You win it before it starts:
              with your gear, your points and your Battle Plan.
            </p>
            <p>
              Both sides swing their weapon over and over (the <B>Default Attack</B>). Once there is
              enough <S id="heat" />, the next Skill in the Battle Plan goes off instead.
            </p>
            <p>
              Watch for <B>Charging</B> over an enemy: a heavy Attack is coming. It hurts, but it
              never takes more than about a third of your Life at once.
            </p>
          </>
        ),
      },
      {
        id: "heat",
        title: "Heat",
        art: painting(GAME_ICONS.heat),
        body: () => (
          <>
            <p>
              <S id="heat" /> runs from 0 to 100. Skills cost Heat and fire once there is enough.
              How Heat fills depends on the Heat Form of your weapon:
            </p>
            <Facts
              rows={[
                {
                  icon: big(HEAT_FORM_ICONS.cooling),
                  name: "Cooling",
                  text: "Hits fill more Heat, but you lose 10 % of it every second.",
                },
                {
                  icon: big(HEAT_FORM_ICONS.steady),
                  name: "Steady",
                  text: "Hits fill Heat. It never cools down. Bows and crossbows.",
                },
                {
                  icon: big(HEAT_FORM_ICONS.warming),
                  name: "Warming",
                  text: "Heat fills by itself every second. Wands and staffs.",
                },
                {
                  icon: big(HEAT_FORM_ICONS.smoldering),
                  name: "Smoldering",
                  text: "Heat comes mostly from enemy attacks, even blocked or dodged ones.",
                },
              ]}
            />
            <p>
              <S id="heat-gain" /> fills it faster. At Weapon Rank 3 your Heirloom can learn another
              Heat Form.
            </p>
          </>
        ),
      },
      {
        id: "plan",
        title: "Battle Plan",
        art: painting(battlePlanUrl),
        body: (s) => (
          <>
            <p>
              The Battle Plan is your Skill bar. <B>Rotation</B> slots fire one after another, as
              soon as there is enough Heat. <B>Reaction</B> slots wait for a moment you choose: the
              fight starts, your Life drops, the enemy is charging.
            </p>
            <p>
              You start with one slot that holds your weapon&apos;s Innate Skill.{" "}
              {harvested(s)
                ? "Every Harvest adds something: more slots, Conditions and Modifiers."
                : "It grows with you: more slots and more ways to use them come later."}{" "}
              Press <B>B</B> to look at it.
            </p>
          </>
        ),
      },
      {
        id: "hits",
        title: "Hits and Crits",
        art: painting(GAME_ICONS.crit),
        body: () => (
          <>
            <p>
              Not every swing lands clean. A sloppy one is a <B>Glancing Blow</B>: half Damage, and
              it sets off no Triggers. Spells never glance.
            </p>
            <p>
              Each weapon rolls its Damage in a range. A clean hit at the top of it is a{" "}
              <B>Mighty Hit</B>, and some nodes care about those.
            </p>
            <p>
              A Crit deals 150 % Damage, always. Only the chance grows: <S id="crit" />.
            </p>
          </>
        ),
      },
      {
        id: "ailments",
        title: "Damage and Ailments",
        body: () => (
          <>
            <p>Every hit has a Damage type, and every type has its Ailment:</p>
            <Facts
              rows={[
                {
                  icon: statIcon("physical"),
                  name: "Physical",
                  text: (
                    <>
                      <S id="bleed" /> hurts over time. <S id="poison" /> stacks up.
                    </>
                  ),
                },
                {
                  icon: statIcon("fire"),
                  name: "Fire",
                  text: (
                    <>
                      <S id="burn" /> hurts over time and halves healing and Barrier Siphon.
                    </>
                  ),
                },
                {
                  icon: statIcon("cold"),
                  name: "Cold",
                  text: (
                    <>
                      <S id="chill" /> slows Attacks and Heat.
                    </>
                  ),
                },
                {
                  icon: statIcon("lightning"),
                  name: "Lightning",
                  text: (
                    <>
                      <S id="shock" /> makes every hit after it hurt more.
                    </>
                  ),
                },
                {
                  icon: statIcon("void"),
                  name: "Void",
                  text: (
                    <>
                      <S id="corruption" /> grows each second until it bursts.
                    </>
                  ),
                },
              ]}
            />
            <p>
              Maces can <S id="stun" /> instead: the enemy freezes in place for a moment.{" "}
              <S id="ailment-effect" /> makes all your Ailments stronger, not longer.
            </p>
          </>
        ),
      },
      {
        id: "defense",
        title: "Defense",
        body: () => (
          <>
            <Facts
              rows={[
                {
                  icon: statIcon("life"),
                  name: "Life",
                  text: "When it hits zero, you fall. It does not come back by itself.",
                },
                {
                  icon: statIcon("armor"),
                  name: "Armor",
                  text: "Takes the edge off physical hits.",
                },
                {
                  icon: statIcon("evasion"),
                  name: "Evasion",
                  text: "Dodges Attacks. Spells can't be dodged, but you halve them with the same chance.",
                },
                {
                  icon: statIcon("barrier"),
                  name: "Barrier",
                  text: "Takes Damage before your Life. Full at the start of a fight, your own Damage fills it up again.",
                },
                {
                  icon: statIcon("block"),
                  name: "Block",
                  text: "Shields stop half of a blocked hit.",
                },
                {
                  icon: statIcon("elemental"),
                  name: "Resistances",
                  text: "Cut Fire, Cold, Lightning and Void Damage. They only come from gear.",
                },
                {
                  icon: statIcon("tenacity"),
                  name: "Tenacity",
                  text: "Ailments on you wear off sooner.",
                },
                {
                  icon: statIcon("lifesteal"),
                  name: "Lifesteal",
                  text: "Your hits heal you. Damage over time doesn't.",
                },
              ]}
            />
          </>
        ),
      },
      {
        id: "flask",
        title: "Life and the Flask",
        art: painting(GAME_ICONS.flask),
        body: () => (
          <>
            <p>
              Your Life carries over from one stage to the next. Between stages you can drink the{" "}
              <S id="flask" />: each charge heals about a third of your Life. It holds 3 charges, a
              good Belt adds more, and the Camp fills it up again.
            </p>
            <p>Hearths on the map and Waymarks before the Boss heal you too.</p>
          </>
        ),
      },
      {
        id: "draughts",
        title: "Draughts",
        when: harvested,
        art: painting(draughtIconUrl("iron-draught")),
        body: () => (
          <>
            <p>
              Before you set out, Liora brews one Flask charge and a few <C id="acorns" /> into a
              Draught. It holds for the whole trip. Pick it at Eldrin&apos;s Road.
            </p>
            <Facts
              rows={[
                {
                  icon: big(draughtIconUrl("iron-draught")),
                  name: "Iron Draught",
                  text: (
                    <>
                      More <S id="armor" />.
                    </>
                  ),
                },
                {
                  icon: big(draughtIconUrl("ward-draught")),
                  name: "Ward Draught",
                  text: (
                    <>
                      More <S id="barrier" />.
                    </>
                  ),
                },
                {
                  icon: big(draughtIconUrl("vigor-draught")),
                  name: "Vigor Draught",
                  text: (
                    <>
                      More <S id="life" />.
                    </>
                  ),
                },
                {
                  icon: big(draughtIconUrl("fire-draught")),
                  name: "Fire, Frost, Storm, Void",
                  text: "More of that one Resistance.",
                },
              ]}
            />
          </>
        ),
      },
    ],
  },
  {
    id: "heir",
    title: "Your Heir",
    icon: (s) => <ClassEmblem classId={s.hero.classId} size={34} />,
    pages: [
      {
        id: "classes",
        title: "Classes",
        art: (
          <span className="cp-art-row">
            <ClassEmblem classId="cinderguard" size={64} />
            <ClassEmblem classId="ashstrider" size={64} />
            <ClassEmblem classId="emberseer" size={64} />
          </span>
        ),
        body: () => (
          <>
            <p>
              Your class and weapon are chosen once and stay. Every item and every part of the Ash
              Tree is still open to you.
            </p>
            <Facts
              rows={[
                {
                  icon: <ClassEmblem classId="cinderguard" size={44} />,
                  name: "Cinderguard",
                  text: (
                    <>
                      Sword, Axe or Mace. <B>Fury</B> builds with every blow and goes into the next
                      big one.
                    </>
                  ),
                },
                {
                  icon: <ClassEmblem classId="ashstrider" size={44} />,
                  name: "Ashstrider",
                  text: (
                    <>
                      Bow, Crossbow or Dagger. Clean hits leave <B>Hunter's Marks</B> that a Skill
                      Crit cashes in.
                    </>
                  ),
                },
                {
                  icon: <ClassEmblem classId="emberseer" size={44} />,
                  name: "Emberseer",
                  text: (
                    <>
                      Wand or Staff. Every Skill builds <B>Overcharge</B> until it breaks loose as a
                      Nova.
                    </>
                  ),
                },
              ]}
            />
            <p>
              Each class has a main attribute: <A id="strength" />, <A id="dexterity" /> or{" "}
              <A id="intelligence" />. Only that one adds to your Damage.
            </p>
          </>
        ),
      },
      {
        id: "level",
        title: "Level",
        art: painting(levelCapUrl),
        body: () => (
          <>
            <p>
              Every level gives you more Life and more weapon Damage. That's all it does, and it's
              the safest way past a wall that won't fall.
            </p>
            <p>
              Each run has a Level Cap. An enemy above your level shows its level in red and hits
              harder for every level between you. Enemies far below you give little XP.
            </p>
          </>
        ),
      },
      {
        id: "attributes",
        title: "Attributes",
        art: painting(attributePointsUrl),
        body: (s) => (
          <>
            <Facts
              rows={(Object.keys(ATTRIBUTE_TEXT) as Attribute[]).map((a) => ({
                icon: attributeIcon(a),
                name: ATTRIBUTE_INFO[a].name,
                text: ATTRIBUTE_TEXT[a],
              }))}
            />
            <p>
              Attributes go from 1 to 10. At 4, 7 and 10 points each one wakes a <B>Perk</B>. You
              get 2 new points at every Harvest, and Old Nan can take them back for Acorns.
            </p>
            {(s.lineage?.length ?? 0) > 0 && (
              <p>
                Every class that brought the last flame home lights its <B>Lineage</B>: new Heirs
                start with a point in its main attribute.
              </p>
            )}
          </>
        ),
      },
      {
        id: "heirloom",
        title: "Heirloom",
        art: (s) => painting(weaponIconUrl(s.hero.weaponId)),
        body: () => (
          <>
            <p>
              Your weapon never drops and never changes. It is your Heirloom, and it grows with you:
              it gains XP like you do, and every <B>Weapon Rank</B> gives a point for its tree.
            </p>
            <p>
              The tree has three paths. The first point you spend picks one, and with it your Damage
              type and ailment. Later ranks bring a new Heat Form, new forms of your Innate skill
              and a Keystone that changes how the weapon fights. Bosses leave <B>Echoes</B> in it
              that grow every run.
            </p>
          </>
        ),
      },
      {
        id: "masteries",
        title: "Masteries",
        when: harvested,
        art: (s) => (
          <span className="cp-art-row">
            {(MASTERIES[s.hero.classId] ?? []).map((m) => (
              <MasteryEmblem key={m} masteryId={m} size={56} />
            ))}
          </span>
        ),
        body: () => (
          <>
            <p>
              At your first Harvest you choose a Mastery: big hits, many fast hits, or Ailments. It
              gives you a title, a Skill and a Keystone.
            </p>
            <p>
              Every Harvest after that, you either go deeper into it or take the first step of
              another one.
            </p>
          </>
        ),
      },
      {
        id: "ash-tree",
        title: "Ash Tree",
        when: kaelenHere,
        body: () => (
          <>
            <p>
              Kaelen trains you in the Ash Tree (<B>T</B>). The crown holds one region per Damage
              type, with its Skills. The trunk holds Defense, the roots hold Heat.
            </p>
            <p>
              Skill Points come from Waymarks and Harvests, not from levels. Each region also has a
              Socket for a Rune. Resetting costs Acorns.
            </p>
            <Nan>Every branch is open to you. Only climb the ones that carry your weight.</Nan>
          </>
        ),
      },
      {
        id: "keystones",
        title: "Keystones",
        when: kaelenHere,
        art: painting(keystonePlaceUrl),
        body: () => (
          <>
            <p>
              Keystones change the rules of a fight. Each one costs 3 Skill Points and a Keystone
              place. You start with one place; Harvests 2, 4 and 6 add another.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "loot",
    title: "Loot",
    icon: chapterIcon(node("cache")),
    pages: [
      {
        id: "picks",
        title: "Item Picks",
        body: () => (
          <>
            <p>
              Elites, Gatekeepers and Bosses always let you pick 1 of 3 items. Normal fights do
              every third time. <B>Equip</B> wears it, <B>Take</B> puts it in your bag, and the rest
              turns into <C id="ash" />.
            </p>
            <p>
              An item is as strong as the enemy that dropped it. You can wear it once your level is
              no more than 5 below its Item Level.
            </p>
            <Nan>Take what fits you, not what shines.</Nan>
          </>
        ),
      },
      {
        id: "rarity",
        title: "Rarities",
        body: (s) => (
          <>
            <ul className="cp-rarities">
              <li className="rarity-normal">
                <b className="rarity-text">Normal</b> No Affixes, nothing fancy. But only Normal
                items can hold Sockets, and many of them come with some. A plain shirt with the
                right Runes beats plenty of Rares.
              </li>
              <li className="rarity-magic">
                <b className="rarity-text">Magic</b> One or two Affixes, but each was rolled twice
                and kept the better roll. Fewer Affixes, bigger numbers. Now and then a Trigger
                slips in.
              </li>
              <li className="rarity-rare">
                <b className="rarity-text">Rare</b> Four or five Affixes and a name of its own. The
                bread and butter of every Heir, and now and then one carries a Trigger.
              </li>
              {runAtLeast(3)(s) ? (
                <li className="rarity-epic">
                  <b className="rarity-text">Epic</b> Five or six Affixes and always a Trigger,
                  sometimes two.
                </li>
              ) : (
                <LockedRow />
              )}
              {runAtLeast(4)(s) ? (
                <li className="rarity-legendary">
                  <b className="rarity-text">Legendary</b> Fewer Affixes than an Epic, but a
                  Legendary Power that bends a rule of the fight. They never drop from common
                  enemies: Bosses guard them, and gamblers sometimes get lucky.
                </li>
              ) : (
                <LockedRow />
              )}
            </ul>
            <p>
              Charms play by their own rules: they carry only Triggers, more the rarer they are. The
              frame of an item shows its Rarity.
            </p>
            <Nan>A golden frame is pretty. Read the Affixes anyway.</Nan>
          </>
        ),
      },
      {
        id: "affixes",
        title: "Affixes and Triggers",
        art: painting(GAME_ICONS.trigger),
        body: () => (
          <>
            <p>
              Every item above Normal carries Affixes, listed under its name. Most of them add
              something you can count, like Damage, Life, Crit or Speed. Two Swords of the same kind
              can be worlds apart because of them.
            </p>
            <p>
              Some Affixes do more than add. <B>Trigger Affixes</B> wait for their moment and then
              act on their own: &quot;When you Crit, 20 % chance to cast a Fireball.&quot;{" "}
              <S id="trigger" /> makes them go off more often. The Charm slot holds nothing but
              Triggers.
            </p>
            <p>
              Break an item with a Trigger apart and the <B>Trigger Codex</B> remembers it, so you
              can build it onto another item later.
            </p>
          </>
        ),
      },
      {
        id: "uniques",
        title: "Uniques",
        when: (s) => s.legacy.trophies.length > 0 || runAtLeast(4)(s),
        body: () => (
          <>
            <p>
              Uniques always roll the same Affixes and often carry a Power no other item has. Some
              drop only from one Boss, and some turn up more often in their home act.
            </p>
            <p>Every Unique you find hangs on the Trophy Wall at the Hearthfire.</p>
          </>
        ),
      },
      {
        id: "runes",
        title: "Runes and Runewords",
        when: runesKnown,
        art: painting(runesUrl),
        body: (s) => (
          <>
            <div className="cp-runes">
              {RUNES.filter((r) => s.legacy.runesFound.includes(r)).map((r) => (
                <span key={r} title={runeName(r)}>
                  <RuneStone runeId={r} size={40} />
                </span>
              ))}
            </div>
            <p>
              Runes drop by themselves. Set one into a Socket of a Normal item and it stays there.
              The right Runes in the right order make a <B>Runeword</B>, a lot stronger than its
              parts. A Runeword in a better base is stronger, so forge it anew as your gear grows.
              Three Runes of a kind combine into the next one. Later acts drop the higher Runes.
            </p>
            <p>
              Every act has a Rune that turns up there more often. In the Ashen Fields it is{" "}
              <R id="ash" />.
            </p>
          </>
        ),
      },
      {
        id: "currencies",
        title: "Currencies",
        body: (s) => (
          <>
            <Facts
              rows={[...CURRENCY_ORDER, ...(finaleWon(s) ? (["glass"] as const) : [])].map(
                (id) => ({
                  icon: currencyIcon(id),
                  name: CURRENCIES[id].name,
                  text: CURRENCY_TEXT[id] ?? CURRENCIES[id].explain,
                }),
              )}
            />
            <p>Your pouch has room for only so much. A full one turns orange, and more is lost.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "enemies",
    title: "Enemies",
    icon: chapterIcon(ENEMY_TYPE_ICONS.brute),
    pages: [
      {
        id: "types",
        title: "Enemy Types",
        body: () => (
          <>
            <Facts
              rows={(Object.keys(ENEMY_TEXT) as (keyof typeof ENEMY_TEXT)[]).map((t) => ({
                icon: enemyIcon(t),
                name: ENEMY_TYPE_NAMES[t],
                text: ENEMY_TEXT[t],
              }))}
            />
            <p>Enemies play by your rules: they have Heat, Skills and Ailments too.</p>
          </>
        ),
      },
      {
        id: "elites",
        title: "Elites",
        art: painting(RANK_MARKS.ELITE),
        body: (s) => (
          <>
            <p>
              Elites carry one to three Modifiers, shown under their name. They hit harder and drop
              better loot and some <C id="coal" />.
            </p>
            {runAtLeast(3)(s) && (
              <p>
                Sometimes an Elite is a <B>Champion</B>: three Modifiers, more Life, and a Hoard of
                its own.
              </p>
            )}
          </>
        ),
      },
      {
        id: "bosses",
        title: "Gatekeepers and Bosses",
        art: painting(bossMarkUrl),
        body: () => (
          <>
            <p>
              Gatekeepers guard the middle of an act. They are walls, much tougher than the fights
              around them. If one won&apos;t fall, come back a few levels taller.
            </p>
            <p>
              Every act ends with its Boss. Bosses always drop a <C id="feathers" />, leave a Hoard
              and shake off Stuns twice as fast. Each Harvest teaches every Boss something new.
            </p>
            <Nan>A wall is only a wall until you are a level taller.</Nan>
          </>
        ),
      },
      {
        id: "thief",
        title: "Ember Thief",
        when: harvested,
        art: painting(node("thief")),
        body: () => (
          <>
            <p>
              From the second act on, the Ember Thief sometimes crosses your path. It doesn't fight
              back, it runs. Catch it before it gets away and open its sack: 4 items, and you keep
              2. One of them is always Rare or better.
            </p>
          </>
        ),
      },
      {
        id: "hunts",
        title: "Hunts",
        art: <TrailMark tier={3} size={96} />,
        body: () => (
          <>
            <p>
              Every enemy you kill leaves a <B>Trail</B>. The more of one kind you kill, the better
              its Hunt Affix rolls on the loot it gives you. Kills count across every run.
            </p>
            <Facts
              rows={[1, 2, 3, 4].map((t) => ({
                icon: <TrailMark tier={t} size={44} />,
                name: TRAIL_NAMES[t],
                text: TRAIL_TEXT[t],
              }))}
            />
            <p>
              Hunt nodes on the map count twice. Every Trail you open fills the <B>Bestiary</B> at
              the Hearthfire.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "road",
    title: "Gifts of the Road",
    icon: chapterIcon(node("shrine")),
    pages: [
      {
        id: "shrines",
        title: "Ember Shrines",
        art: painting(node("shrine")),
        body: () => (
          <>
            <p>
              After Stage 5 and 10 of an act an Ember Shrine refills one charge of your Ember Flask.
              Drink now, or save it for the Boss.
            </p>
          </>
        ),
      },
      {
        id: "boons",
        title: "Stolen Fire Boons",
        when: finaleWon,
        body: () => (
          <>
            <p>
              In the Wildfire the Shrines burn hotter: they offer 1 of 3 Boons, sparks stolen from
              the Bosses' fires. Take the same Boon again and it ranks up, up to III.
            </p>
            <p>
              Some Boons are picky: you carry only one Strike Boon, one Skill Boon, one Reaction
              Boon and one Heat Boon at a time. A new one pushes the old one out. All other Boons
              pile up. Every Boss you meet adds its family of Boons: one for each of those slots and
              one that piles up. Shrines favor the families that fit your weapon and skills.
            </p>
            <p>Boons last one Wildfire trip: they burn when you come back to the Camp.</p>
          </>
        ),
      },
      {
        id: "hoard",
        title: "Boss Hoard",
        body: () => (
          <>
            <p>
              A fallen Boss leaves a Hoard of 6 items, and you take 2. Some Bosses keep a Unique of
              their own, a trophy. Now and then it lies in the Hoard.
            </p>
          </>
        ),
      },
      {
        id: "bounties",
        title: "Bounties",
        art: portrait("eldrin"),
        body: () => (
          <>
            <p>
              Eldrin offers two Bounties for each trip, take one if you like: hunt Elites, follow an
              enemy&apos;s Trail, catch the Ember Thief, or beat the Boss without the Flask. The act
              map marks what counts.
            </p>
            <p>
              Done? Turn it in with him back in the Camp. His Cache holds the Rune found often in
              that act, an item to pick, and what the Bounty promised: <C id="coal" />, Trail kills,
              more items or rarer ones. He has new Bounties only after that. Failed, nothing is
              lost.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "camp",
    title: "The Camp",
    icon: chapterIcon(hearthfireUrl),
    pages: [
      {
        id: "kaelen",
        title: "Kaelen, the Trainer",
        when: kaelenHere,
        art: portrait("kaelen"),
        body: () => (
          <>
            <p>
              Kaelen looks after everything you learn: the Ash Tree, your Heirloom and the Battle
              Plan. Every reset costs <C id="acorns" />, more for every point it gives back.
            </p>
            <p>
              His <B>Training Dummy</B> stands on the other side of the fire. Hit it to see where
              your Damage comes from, and try on items before you wear them.
            </p>
          </>
        ),
      },
      {
        id: "thoric",
        title: "Thoric, the Blacksmith",
        art: portrait("thoric"),
        body: () => (
          <>
            <p>Thoric doesn&apos;t talk much. He hammers, and your gear gets better.</p>
            <Facts
              rows={[
                {
                  icon: currencyIcon("feathers"),
                  name: "Upgrade",
                  text: "Raises an item by one Tier. Its Affixes grow with it, and so does its level. Each Tier costs more than the last.",
                },
                {
                  icon: currencyIcon("coal"),
                  name: "Reforge",
                  text: "Rolls all stat Affixes anew. Triggers stay. Each Reforge of the same item costs more.",
                },
                {
                  icon: currencyIcon("ash"),
                  name: "Salvage",
                  text: "Breaks an item into Ash. Hold the button.",
                },
              ]}
            />
          </>
        ),
      },
      {
        id: "liora",
        title: "Liora, the Mystic",
        when: lioraHere,
        art: portrait("liora"),
        body: () => (
          <>
            <p>
              <B>Temper</B> offers two choices for one Affix: a new Affix or a new value. Pick one
              or keep the old Affix. After that, only that Affix can change until Thoric reforges
              the item. Each Temper of the same item costs more <C id="ash" /> than the last.
            </p>
            <p>
              <B>Kindle</B> builds a Trigger from the Trigger Codex onto an item, for <C id="ash" />{" "}
              and <C id="coal" />. There is no undo.
            </p>
          </>
        ),
      },
      {
        id: "nyssa",
        title: "Nyssa, the Runesmith",
        when: nyssaHere,
        art: portrait("nyssa"),
        body: () => (
          <>
            <p>
              Nyssa gives Normal items one more Socket, sets Runes into them and combines three
              Runes into a better one. Her <B>Runeword Codex</B> keeps every Runeword you ever
              forged.
            </p>
          </>
        ),
      },
      {
        id: "marisha",
        title: "Marisha, the Black Market",
        when: marishaHere,
        art: portrait("marisha"),
        body: () => (
          <>
            <p>
              Pick a slot and pay <C id="acorns" /> for a random item from her crate. Her odds beat
              the road: she can sell one rarity higher than the current run drops.
            </p>
            <Nan>Never ask Marisha where her crates come from.</Nan>
          </>
        ),
      },
      {
        id: "eldrin",
        title: "Eldrin, the Scout",
        art: portrait("eldrin"),
        body: (s) => (
          <>
            <p>
              Eldrin knows the road. Choose your act with him, see what waits there, take a Bounty
              {harvested(s) ? ", pick an Omen and brew a Draught" : ""}. Then set out.
            </p>
          </>
        ),
      },
      {
        id: "nan",
        title: "Old Nan, the Hearthkeeper",
        art: portrait("nan"),
        body: () => (
          <>
            <p>
              Old Nan keeps this Compendium and plenty of advice. For <C id="acorns" /> she resets
              your Attributes; you hand the points out again in the Character sheet.
            </p>
          </>
        ),
      },
      {
        id: "wagon",
        title: "Supply Wagon",
        body: () => (
          <>
            <p>
              The Stash is shared by all your Heirs, so a good find helps the next one too.
              Currencies stay with each Heir.
            </p>
            <Hint>
              Right-click or Ctrl+click moves an item across. Q and E flip through the tabs.
            </Hint>
          </>
        ),
      },
      {
        id: "hearthfire",
        title: "Hearthfire",
        art: painting(hearthfireUrl),
        body: () => (
          <>
            <p>
              Everything that outlasts the fire lives here (<B>L</B>): your Collections, the Trophy
              Wall, the Runeword and Trigger Codex, the Bestiary, and the Lineage of your Heirs.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: "beyond",
    title: "Beyond the Harvest",
    icon: chapterIcon(ENEMY_TYPE_ICONS.echo),
    pages: [
      {
        id: "last-ember",
        title: "The Last Ember",
        when: finaleKnown,
        art: painting(ENEMY_TYPE_ICONS.echo),
        body: () => (
          <>
            <p>
              The world no longer burns, but one flame got away. Six Warden Echoes stand in front of
              it, each hotter than the last, and then the Harvester's Core.
            </p>
            <p>
              There is no loot here, and no Shrine: your Flask has to last all seven fights. Fall,
              and you start again at the entrance.
            </p>
          </>
        ),
      },
      {
        id: "wildfire",
        title: "Wildfire",
        when: finaleWon,
        body: () => (
          <>
            <p>
              Eldrin can set any act ablaze again, from Wildfire I up to X. The enemies are far
              above your level, and the loot is better: more Legendaries, more Runes, and{" "}
              <C id="glass" /> from the Boss.
            </p>
            <p>
              Before each trip you can add Wildfire Omens. Each one has a Peril; more Peril, more
              reward. The higher tiers ask for some.
            </p>
          </>
        ),
      },
      {
        id: "ashborn",
        title: "Ashborn",
        when: (s) => finaleWon(s) || s.hero.level >= 100,
        body: () => (
          <>
            <p>
              Past level 100, your XP turns into Ashborn levels. Each one is a point for one of four
              boards in the Character sheet: Onslaught, Aegis, Mending and Ignite. Old Nan resets
              them for <C id="acorns" />.
            </p>
          </>
        ),
      },
      {
        id: "greater",
        title: "Greater Affixes",
        when: finaleWon,
        art: painting(glassUrl),
        body: () => (
          <>
            <p>
              Liora can wake one Affix of an item into a <B>Greater Affix</B>, stronger than any
              roll can be. <B>Awaken</B> makes one, <B>Shift</B> moves it to another Affix,{" "}
              <B>Intensify</B> raises it up to Greater V. All of it costs <C id="glass" />.
            </p>
          </>
        ),
      },
      {
        id: "crucible",
        title: "Ember Crucible",
        when: finaleWon,
        body: () => (
          <>
            <p>
              Salvage a Legendary or a Unique and its Power goes into the <B>Power Codex</B>, for
              all your Heirs. Liora binds learned Powers in the Crucible, so they work without the
              item.
            </p>
          </>
        ),
      },
    ],
  },
];
