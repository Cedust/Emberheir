import { useState } from "react";
import { Icon } from "../ui/Icon";

const ENTRIES: { title: string; text: string }[] = [
  {
    title: "Heat",
    text: "Every hit builds Heat. Skills in your Battle Plan fire in order once Heat reaches their threshold and cost Heat. Melee weapons are Cooling (Heat fades when you stop hitting), bows are Steady, wands and staffs are Warming (Heat fills by itself).",
  },
  {
    title: "Life and the Ember Flask",
    text: "Life carries over from stage to stage. Between stages you can drink the Ember Flask (+35% Life). It refills in the Camp. Spoils can add a charge.",
  },
  {
    title: "Death and Retreat",
    text: "When you fall or retreat, you wake in the Camp and keep everything: gear, Gold, Dust and Inventory. Only the way through the Act starts over. Each death in an Act makes its loot a little better (Pity) until the boss falls.",
  },
  {
    title: "Loot",
    text: "After each win you pick 1 of 3 items: Equip it or Take it into the inventory. The others turn into Salvage Dust. Stages 5 and 10 and Elites add a Spoils pick. Rarities: Normal, Magic, Rare, Epic, Legendary.",
  },
  {
    title: "Elites and Bosses",
    text: "Elites carry modifiers and drop better loot, sometimes an Ascension Shard. The boss of each Act telegraphs its heavy attack: watch for 'Charging'. Bosses always drop an Ascension Shard.",
  },
  {
    title: "Thoric, the Blacksmith",
    text: "Upgrade raises an item's Tier (+1) for Gold and an Ascension Shard; the affix rolls keep their quality, so the values grow. Salvage breaks inventory items into Dust.",
  },
  {
    title: "Liora, the Mystic",
    text: "Reforge rerolls all affixes for a Reforge Stone. Temper rerolls one affix value, Imbue replaces one affix with an Essence. After Temper or Imbue only that affix can change again until you Reforge. Trigger Affixes cannot be tempered or imbued. Distill turns Dust into a Reforge Stone. There is no Undo.",
  },
  {
    title: "Attributes",
    text: "Strength: Physical Damage, Armor. Dexterity: Crit Chance, Trigger Chance. Agility: Attack Speed, Evasion. Intelligence: Elemental Damage, All Resistance. Wisdom: Heat Gain, Ailment Duration. Vitality: Life, Tenacity. Crit Damage is always 150%.",
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
