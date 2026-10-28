import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
import { type GameState, LINEAGE_STEPS, branchTier, heroClassOf } from "@emberheir/sim";
import type { ReactNode } from "react";
import { GameIcon, type GameIconId } from "../../ui/gameIcons";
import { Icon } from "../../ui/Icon";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { heroWeaponTip } from "../../ui/weaponTip";
import { ClassEmblem, MasteryEmblem } from "../ClassEmblem";

const ROMAN = ["", "I", "II", "III", "IV", "V"];

const TYPE_NAMES: Readonly<Record<string, string>> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
};

const AILMENT_NAMES: Readonly<Record<string, string>> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
  stun: "Stun",
};

function Chip(props: { note: NoteHover; className?: string; children: ReactNode }) {
  const hover = useNoteHover(props.note);
  return (
    <span className={`class-chip ${props.className ?? ""}`} tabIndex={0} {...hover}>
      {props.children}
    </span>
  );
}

/**
 * Who the Heir is, under the level line (Timo 2026-10-28): the Class Trait, the Heirloom path,
 * the Masteries with their tiers and the Lineage flames. Each shows up once it is reached; the
 * chips only name things, their tooltips explain them.
 */
export function ClassChips(props: { state: GameState }) {
  const { state } = props;
  const heroClass = heroClassOf(state, GAME_DATA);
  const path = heroWeaponTip(state).path;
  const masteries = [...new Set(state.legacy.branches)].flatMap((id) => {
    const def = SKILL_TREE.prestigeBranches?.find((b) => b.id === id);
    return def ? [{ def, tier: branchTier(state.legacy.branches, id) }] : [];
  });
  const lineage = state.lineage?.length ?? 0;
  return (
    <div className="class-chips" aria-label="Class">
      <Chip
        note={{
          name: heroClass.trait.name,
          kind: `Class Trait · ${heroClass.name}`,
          explain: heroClass.trait.description,
        }}
      >
        <ClassEmblem classId={heroClass.id} size={24} />
        <span className="title-font">{heroClass.trait.name}</span>
      </Chip>
      {path && (
        <Chip
          note={{
            name: path.name,
            kind: "Heirloom Path",
            explain: `${TYPE_NAMES[path.damageType] ?? path.damageType} · ${
              AILMENT_NAMES[path.ailment] ?? path.ailment
            }`,
          }}
        >
          <GameIcon id={path.damageType as GameIconId} size={22} />
          <GameIcon id={path.ailment as GameIconId} size={22} />
          <span className="title-font">{path.name}</span>
        </Chip>
      )}
      {masteries.map(({ def, tier }) => (
        <Chip
          key={def.id}
          className="class-chip-mastery"
          note={{ name: `${def.name} ${ROMAN[tier] ?? tier}`, kind: "Mastery", explain: def.theme }}
        >
          <MasteryEmblem masteryId={def.id} size={28} />
          <b className="title-font">{ROMAN[tier] ?? tier}</b>
        </Chip>
      ))}
      {lineage > 0 && (
        <Chip
          className="class-chip-lineage"
          note={{
            name: "Lineage",
            kind: `${lineage} of ${LINEAGE_STEPS}`,
            explain:
              "Every class that wins The Last Ember lights a flame. Each new Heir may take +1 in its main attribute.",
          }}
        >
          {Array.from({ length: LINEAGE_STEPS }, (_, i) => (
            <span key={i} className={`class-chip-flame${i < lineage ? " lit" : ""}`}>
              <Icon name="flame" size={20} />
            </span>
          ))}
        </Chip>
      )}
    </div>
  );
}
