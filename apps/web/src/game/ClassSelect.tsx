import { GAME_DATA, ITEM_CATALOG, PRESTIGE_BRANCHES } from "@emberheir/content";
import { getBase } from "@emberheir/sim";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "../ui/Icon";
import type { Settings } from "../ui/settings";
import { ClassEmblem } from "./ClassEmblem";
import { PreviewArena } from "./PreviewArena";
import { glimpsePreview, startPreview } from "./classPreview";
import type { NewCharacter } from "./useGame";

/** Axis chips (klassen-v2.md): Damage Type, Range, Delivery and the Heat rhythm. */
const AXES: Record<string, readonly string[]> = {
  warrior: ["Physical", "Melee", "Direct"],
  reaver: ["Physical", "Melee", "Over Time"],
  hunter: ["Physical", "Ranged", "Direct · Over Time"],
  sorcerer: ["Elemental", "Ranged", "Direct"],
  warlock: ["Elemental", "Ranged", "Over Time"],
};

const WEAPON_ICONS: Record<string, IconName> = {
  sword: "sword",
  mace: "hammer",
  axe: "axe",
  dagger: "dagger",
  bow: "bow",
  crossbow: "bow",
  "fire-wand": "wand",
  staff: "wand",
};

const HEAT_NAMES = { cooling: "Cooling Heat", steady: "Steady Heat", warming: "Warming Heat" };

/** A few names per class for the name field; the player can type their own. */
const NAMES: Record<string, readonly string[]> = {
  warrior: ["Bran", "Hilde", "Torvan", "Ysra"],
  reaver: ["Kesh", "Vala", "Mordrin", "Sable"],
  hunter: ["Wren", "Corvin", "Lysa", "Tamsin"],
  sorcerer: ["Ilyra", "Caius", "Senna", "Orrin"],
  warlock: ["Morwen", "Vesk", "Ashra", "Dross"],
};

function suggestName(classId: string): string {
  const list = NAMES[classId] ?? ["Heir"];
  return list[Math.floor(Math.random() * list.length)] ?? "Heir";
}

/**
 * Class select (klassen-v2.md section 6): five class cards, the chosen class fighting live in a
 * small arena (Glimpse shows a late build), a short text, the trait and the recommended paths.
 */
export function ClassSelect(props: {
  slot: number;
  settings: Settings;
  onBegin: (character: NewCharacter) => void;
  onBack: () => void;
}) {
  const classes = GAME_DATA.classes;
  const [classId, setClassId] = useState(classes[0]?.id ?? "warrior");
  const heroClass = classes.find((c) => c.id === classId) ?? classes[0];
  const [weapon, setWeapon] = useState(heroClass?.weapons[0] ?? "sword");
  const [glimpse, setGlimpse] = useState(false);
  const [name, setName] = useState(() => suggestName(classId));
  const [nameTouched, setNameTouched] = useState(false);
  const preview = useMemo(
    () => (glimpse ? glimpsePreview(classId, weapon) : startPreview(classId, weapon)),
    [classId, weapon, glimpse],
  );
  if (!heroClass) return null;

  const pick = (id: string) => {
    const next = classes.find((c) => c.id === id);
    if (!next) return;
    setClassId(id);
    setWeapon(next.weapons[0] ?? "");
    if (!nameTouched) setName(suggestName(id));
  };

  return (
    <div className="class-select" aria-label="Class select">
      <h2 className="title-font">Choose your Heir</h2>
      <div className="class-cards" role="radiogroup" aria-label="Class">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === classId}
            className={`class-card panel-card ${c.id === classId ? "on" : ""}`}
            onClick={() => pick(c.id)}
          >
            <ClassEmblem classId={c.id} size={34} />
            <strong className="title-font">{c.name}</strong>
            <span className="axes">{(AXES[c.id] ?? []).join(" · ")}</span>
          </button>
        ))}
      </div>

      <div className="class-detail">
        <div className="class-preview panel-card">
          <PreviewArena
            key={`${classId}-${weapon}-${glimpse}`}
            preview={preview}
            width={900}
            height={520}
            settings={props.settings}
          />
          <div className="preview-tags">
            <button
              type="button"
              className={`chip ${glimpse ? "" : "on"}`}
              aria-pressed={!glimpse}
              onClick={() => setGlimpse(false)}
            >
              Start
            </button>
            <button
              type="button"
              className={`chip ${glimpse ? "on" : ""}`}
              aria-pressed={glimpse}
              onClick={() => setGlimpse(true)}
            >
              Glimpse
            </button>
            {glimpse && <span className="glimpse-title title-font">{preview.title}</span>}
          </div>
        </div>

        <div className="class-info panel-card">
          <div className="class-name-row">
            <ClassEmblem classId={classId} size={30} />
            <span className="title-font class-name">{heroClass.name}</span>
          </div>
          <p className="class-text">{heroClass.text}</p>
          <p className="class-trait">
            <span className="title-font">{heroClass.trait.name}</span> ·{" "}
            {heroClass.trait.description}
          </p>

          <div className="class-weapons" role="radiogroup" aria-label="Weapon">
            {heroClass.weapons.map((id) => {
              const base = getBase(ITEM_CATALOG, id);
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={id === weapon}
                  className={`weapon-pick ${id === weapon ? "on" : ""}`}
                  onClick={() => setWeapon(id)}
                >
                  <Icon name={WEAPON_ICONS[id] ?? "sword"} size={22} />
                  <span>{base.name}</span>
                  <small>
                    {GAME_DATA.startSkills[id]?.name}
                    {base.weapon ? ` · ${HEAT_NAMES[base.weapon.heatBehavior]}` : ""}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="class-paths" aria-label="Recommended paths">
            {heroClass.recommendedBranches.map((id) => (
              <span
                key={id}
                className="path-chip"
                title={`${PRESTIGE_BRANCHES.find((b) => b.id === id)?.name ?? id} → ${heroClass.titles[id] ?? ""}`}
              >
                <ClassEmblem classId={classId} size={14} />
                {PRESTIGE_BRANCHES.find((b) => b.id === id)?.name ?? id}
              </span>
            ))}
          </div>

          <label className="name-field">
            <span className="eyebrow">NAME</span>
            <input
              value={name}
              maxLength={18}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
            />
          </label>

          <div className="class-buttons">
            <button type="button" className="btn" onClick={props.onBack}>
              Back
            </button>
            <button
              type="button"
              className="btn big primary"
              onClick={() =>
                props.onBegin({
                  slot: props.slot,
                  classId,
                  weapon,
                  name: name.trim() || heroClass.name,
                })
              }
            >
              Begin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
