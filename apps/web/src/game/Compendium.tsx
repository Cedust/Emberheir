import { useState } from "react";
import { Icon } from "../ui/Icon";

const ENTRIES: { title: string; text: string }[] = [
  {
    title: "Heat",
    text: "Every hit builds Heat. Skills in your Battle Plan fire in order once Heat reaches their threshold and cost Heat. Melee weapons are Cooling (Heat fades all the time; the Skill Tree can make enemy hits build it too), bows are Steady, wands and staffs are Warming (Heat fills by itself).",
  },
  {
    title: "Life and the Ember Flask",
    text: "Life carries over from stage to stage. Between stages you can drink the Ember Flask (+35% Life). It holds 3 charges, a Belt “of Plenty” adds 1-2 more, and it refills in the Camp.",
  },
  {
    title: "Death and Retreat",
    text: "When you fall or retreat, you wake in the Camp and keep everything: gear, Acorns, Ash and Inventory. Only the way through the Act starts over. Each death in an Act makes its loot a little better (Pity) until the boss falls.",
  },
  {
    title: "Loot",
    text: "After each win you pick 1 of 3 items: Equip it or Take it into the inventory. The others turn into Ash. Ember Coal, Phoenix Feathers and Runes drop by themselves. Rarities: Normal, Magic, Rare, Epic, Legendary. Every item needs a level: its Item Level minus 5.",
  },
  {
    title: "Harvest and Prestige",
    text: "When the newest Act's boss falls, the Harvester burns the world. The caravan saves everything you carry: gear, Inventory, Stash, Acorns and Ash. You start again at Act 1 with one more Act, a higher Level Cap (5 more per Act), a new Skill Tree branch and a Battle Plan upgrade. Better rarities open up from run to run.",
  },
  {
    title: "Stolen Fire Boons",
    text: "After Stages 5 and 10 and after Elites, the Ember Shrine offers 1 of 3 Boons. Taking the same Boon again raises its rank (up to III). Strike, Skill, Reaction and Heat Boons hold one each; a new one replaces the old. Every Warden adds its family once its act opens, and Fusion Boons need two families. Boons from the current act burn when you fall or retreat; all burn at Prestige.",
  },
  {
    title: "Boss Hoard and the Ember Thief",
    text: "A boss drops a Hoard: 6 cards, take 2. Every Warden has its own trophies, the Trophy Wall in the Camp shows which you found. From Act 2 on, an Ember Thief sometimes shows up. Kill it before it runs off and its sack holds 4 cards, take 2, one at least Rare.",
  },
  {
    title: "The Last Ember",
    text: "After the seventh Prestige, when all seven Acts have fallen, the world no longer burns. One flame got away. Enter The Last Ember from the Camp: six Warden echoes with every boss ability, then the Harvester's Core. There is no loot, only a Shrine after each echo. Fall, and you wake in the Camp with your Boons burned.",
  },
  {
    title: "Elites and Bosses",
    text: "Elites carry modifiers and drop better loot, sometimes a Phoenix Feather. The boss of each Act telegraphs its heavy attack: watch for 'Charging'. Bosses always drop a Phoenix Feather.",
  },
  {
    title: "Thoric, the Blacksmith",
    text: "Upgrade raises an item's Tier (+1) for Acorns and a Phoenix Feather; the affix rolls keep their quality, so the values grow. Reforge rerolls all affixes for Ember Coal and frees the lock. Salvage breaks inventory items into Ash.",
  },
  {
    title: "Liora, the Mystic",
    text: "Temper rerolls one affix value; afterwards only that affix can change again until Thoric reforges the item. Kindle builds a trigger from the Trigger Codex. Trigger Affixes cannot be tempered. There is no Undo.",
  },
  {
    title: "Nyssa, the Runesmith",
    text: "Add Socket gives a Normal item one more Socket. Socket Rune sets a Rune for good, and the right Runes in the right order make a Runeword. Three Runes of a kind combine into the next one.",
  },
  {
    title: "Eldrin, the Scout",
    text: "Eldrin knows what waits on the road ahead, and he hands out one Bounty for every trip: slay Elites, hunt an enemy, catch the Ember Thief or beat the boss in style. Done, it pays at once: Acorns, Ember Coal and a Rare item or better for the Supply Wagon. Failed, nothing is lost.",
  },
  {
    title: "Supply Wagon",
    text: "The Stash is shared by all your Heirs, so a good find helps the next one too. Acorns and the other currencies stay with each Heir.",
  },
  {
    title: "Keystones",
    text: "Keystones change the rules of a fight and cost 3 Skill Points. Only a few can be active at once: one at first, one more at Prestige 2, 4 and 6. The notches in the Ember sigil on the Ash Tree show your places.",
  },
  {
    title: "Marisha, the Black Market",
    text: "Pick a slot and pay Acorns for a random item. Marisha's odds are better than loot: she can give one rarity more than the current run drops.",
  },
  {
    title: "Trigger Codex",
    text: "Salvage an item with a trigger at Thoric and the Codex learns its Condition and its Effect. Liora's Kindle puts any learned Condition and Effect together as a trigger at the item's Tier, for Ash and Ember Coal.",
  },
  {
    title: "Attributes",
    text: "Strength: Physical Damage, Armor. Dexterity: Crit Chance, Trigger Chance. Intelligence: Elemental Damage, All Resistance. Agility: Attack Speed, Evasion. Wisdom: Heat Gain, Ailment Duration. Vitality: Life, Tenacity. Crit Damage is always 150%.",
  },
];

/** Old Nan's Compendium: short rules of the game. */
export function Compendium(props: { onClose: () => void }) {
  const [open, setOpen] = useState(0);
  const entry = ENTRIES[open];
  return (
    <div className="overlay" role="dialog" aria-label="Compendium">
      <div className="overlay-panel compendium">
        <header className="overlay-header">
          <div className="run-title">
            <span className="title-font big">COMPENDIUM</span>
            <span className="sub">Old Nan&apos;s notes on how the ash works</span>
          </div>
          <div className="grow" />
          <button type="button" className="icon-button" aria-label="Close" onClick={props.onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="compendium-body">
          <ul className="compendium-list">
            {ENTRIES.map((e, i) => (
              <li key={e.title}>
                <button
                  type="button"
                  className={`compendium-entry ${i === open ? "on" : ""}`}
                  onClick={() => setOpen(i)}
                >
                  {e.title}
                </button>
              </li>
            ))}
          </ul>
          {entry && (
            <article className="compendium-text">
              <h3 className="title-font">{entry.title}</h3>
              <p>{entry.text}</p>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
