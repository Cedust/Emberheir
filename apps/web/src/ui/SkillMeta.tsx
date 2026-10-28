import { GAME_DATA } from "@emberheir/content";
import {
  type DamageType,
  type GameState,
  type SkillDefinition,
  type SkillType,
  type WeaponDefinition,
  heroWeapon,
  weaponAilment,
} from "@emberheir/sim";
import { GameIcon } from "./gameIcons";
import { useNoteHover } from "./ItemTooltip";

/**
 * The short facts under a skill's name: its Heat cost as the Heat icon and a number, its damage
 * types as icons and what kind of skill it is. Every part explains itself on hover, so no
 * "50 Heat · direct · any" jargon is left on screen (Timo).
 */

const TYPE_NAMES: Readonly<Record<DamageType, string>> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
};

const KIND: Readonly<Record<SkillType, { name: string; explain: string }>> = {
  attack: { name: "Attack", explain: "Strikes with your weapon. Enemies can dodge it." },
  spell: { name: "Spell", explain: "Magic. Enemies can never dodge it." },
  buff: { name: "Buff", explain: "Makes you stronger for a while." },
  curse: { name: "Curse", explain: "Weakens the enemy for a while." },
};

const isDamageType = (t: string): t is DamageType => t in TYPE_NAMES;

/**
 * The damage types the skill deals. A hit that takes the weapon's type (weapon hits without a
 * type of their own, infused hits) shows `weaponType`; without one, the skill's own tags.
 */
export function skillDamageTypes(skill: SkillDefinition, weaponType?: DamageType): DamageType[] {
  const types = new Set<DamageType>();
  for (const h of skill.hits) {
    const own = h.infused ? undefined : h.damageType;
    const type = own ?? weaponType ?? skill.tags.find(isDamageType);
    if (type) types.add(type);
  }
  if (!skill.hits.length) for (const t of skill.tags) if (isDamageType(t)) types.add(t);
  return [...types];
}

/** Heat icon and amount; "Costs 50 Heat" and what that means on hover. */
export function HeatCost(props: { amount: number; size?: number }) {
  const hover = useNoteHover({
    name: `Costs ${props.amount} Heat`,
    kind: "Heat",
    explain: `The skill fires once your Heat bar reaches ${props.amount} and uses up that much Heat.`,
  });
  return (
    <span className="skill-meta-part" aria-label={`Costs ${props.amount} Heat`} {...hover}>
      <GameIcon id="heat" size={props.size ?? 18} />
      <b className="mono">{props.amount}</b>
    </span>
  );
}

function DamageTypeIcon(props: { type: DamageType }) {
  const name = `${TYPE_NAMES[props.type]} Damage`;
  const hover = useNoteHover({ name, kind: "Damage type", explain: "" });
  return (
    <span className="skill-meta-part" aria-label={name} {...hover}>
      <GameIcon id={props.type} size={18} />
    </span>
  );
}

function SkillKind(props: { type: SkillType }) {
  const kind = KIND[props.type];
  const hover = useNoteHover({ name: kind.name, kind: "Skill", explain: kind.explain });
  return (
    <span className="skill-meta-part skill-meta-kind" {...hover}>
      {kind.name}
    </span>
  );
}

/** One line: [Heat] 50 · [Physical] · Attack. */
export function SkillMeta(props: {
  skill: SkillDefinition;
  /** The hero's weapon damage type, for hits that deal the weapon's damage. */
  weaponType?: DamageType | undefined;
  className?: string;
}) {
  const { skill } = props;
  return (
    <span className={`skill-meta ${props.className ?? ""}`}>
      <HeatCost amount={skill.heatCost} />
      {skillDamageTypes(skill, props.weaponType).map((t) => (
        <DamageTypeIcon key={t} type={t} />
      ))}
      <SkillKind type={skill.type} />
    </span>
  );
}

const AILMENT_NAMES: Readonly<Record<string, string>> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
  stun: "Stun",
};

/**
 * A skill's text for this weapon: Mastery skills say "your ailment" and "your element"; with
 * a weapon they name it ("your Bleed", "as Lightning").
 */
export function skillText(skill: SkillDefinition, weapon?: WeaponDefinition): string {
  if (!weapon) return skill.description;
  const ailment = weaponAilment(weapon);
  const name = ailment ? AILMENT_NAMES[ailment] : undefined;
  let out = skill.description.split("as your element").join(`as ${TYPE_NAMES[weapon.damageType]}`);
  if (name)
    out = out.split("your ailment").join(`your ${name}`).split("Your ailment").join(`Your ${name}`);
  return out;
}

/** The hero's own skills: hits with the weapon's damage show the weapon's damage type. */
export function HeroSkillMeta(props: {
  state: GameState;
  skill: SkillDefinition;
  className?: string;
}) {
  return (
    <SkillMeta
      skill={props.skill}
      weaponType={heroWeapon(props.state, GAME_DATA).weapon.damageType}
      {...(props.className ? { className: props.className } : {})}
    />
  );
}

/** A skill's text with the hero's weapon ailment and element filled in. */
export function heroSkillText(state: GameState, skill: SkillDefinition): string {
  return skillText(skill, heroWeapon(state, GAME_DATA).weapon);
}
