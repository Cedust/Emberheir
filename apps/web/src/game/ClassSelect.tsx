import { GAME_DATA, ITEM_CATALOG, PRESTIGE_BRANCHES } from "@emberheir/content";
import { ATTRIBUTE_RULES, type Attribute, getBase, sumAttributes } from "@emberheir/sim";
import { Suspense, useMemo, useState } from "react";
import { Icon, type IconName } from "../ui/Icon";
import { Button } from "../ui/kit/Button";
import type { Settings } from "../ui/settings";
import { AttributeStones, NO_POINTS } from "./AttributeStones";
import { ClassEmblem, MasteryEmblem } from "./ClassEmblem";
import { PreviewArena } from "./lazyViews";
import { glimpsePreview, startPreview } from "./classPreview";
import type { NewCharacter } from "./useGame";

/** The class card's line: main attribute and focus (klassengeruest-v1.md 2). */
const ATTRIBUTE_NAMES: Record<Attribute, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  intelligence: "Intelligence",
  agility: "Agility",
  wisdom: "Wisdom",
  vitality: "Vitality",
};

const WEAPON_ICONS: Record<string, IconName> = {
  sword: "sword",
  mace: "hammer",
  axe: "axe",
  dagger: "dagger",
  bow: "bow",
  crossbow: "bow",
  wand: "wand",
  staff: "wand",
};

const HEAT_NAMES = {
  cooling: "Cooling Heat",
  steady: "Steady Heat",
  warming: "Warming Heat",
  smoldering: "Smoldering Heat",
};

/** A few names per class for the name field; the player can type their own. */
const NAMES: Record<string, readonly string[]> = {
  cinderguard: ["Bran", "Hilde", "Torvan", "Ysra"],
  ashstrider: ["Wren", "Corvin", "Kesh", "Sable"],
  emberseer: ["Ilyra", "Morwen", "Senna", "Vesk"],
};

function suggestName(classId: string): string {
  const list = NAMES[classId] ?? ["Heir"];
  return list[Math.floor(Math.random() * list.length)] ?? "Heir";
}

/**
 * Class select (klassengeruest-v1.md 2): three class cards, the chosen class fighting live in a
 * small arena (Glimpse shows a late build), a short text, the trait, the weapons and Masteries.
 */
export function ClassSelect(props: {
  slot: number;
  settings: Settings;
  onBegin: (character: NewCharacter) => void;
  onBack: () => void;
}) {
  const classes = GAME_DATA.classes;
  const [classId, setClassId] = useState(classes[0]?.id ?? "cinderguard");
  const heroClass = classes.find((c) => c.id === classId) ?? classes[0];
  const [weapon, setWeapon] = useState(heroClass?.weapons[0] ?? "sword");
  const [glimpse, setGlimpse] = useState(false);
  const [name, setName] = useState(() => suggestName(classId));
  const [nameTouched, setNameTouched] = useState(false);
  // Second step: the creation's free points (attribute-v1.md section 5).
  const [step, setStep] = useState<"class" | "attributes">("class");
  const [free, setFree] = useState<Record<Attribute, number>>(NO_POINTS);
  const freeLeft = ATTRIBUTE_RULES.creationPoints - sumAttributes(free);
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
    setFree(NO_POINTS);
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
            <ClassEmblem classId={c.id} size={52} />
            <strong className="title-font">{c.name}</strong>
            <span className="axes">
              {ATTRIBUTE_NAMES[c.mainAttribute]} · {c.focus}
            </span>
          </button>
        ))}
      </div>

      <div className="class-detail">
        <div className="class-preview panel-card">
          <Suspense
            fallback={<div className="preview-arena" style={{ width: 900, height: 520 }} />}
          >
            <PreviewArena
              key={`${classId}-${weapon}-${glimpse}`}
              preview={preview}
              width={900}
              height={520}
              settings={props.settings}
            />
          </Suspense>
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

        {step === "attributes" ? (
          <div className="class-info panel-card class-attributes" aria-label="Attributes">
            <div className="class-name-row">
              <ClassEmblem classId={classId} size={40} />
              <span className="title-font class-name">{name.trim() || heroClass.name}</span>
              <div className="grow" />
              <span className={`points ${freeLeft > 0 ? "has" : ""}`} data-testid="free-points">
                {freeLeft} Points
              </span>
            </div>
            <AttributeStones
              mainAttribute={heroClass.mainAttribute}
              base={heroClass.startingAttributes}
              delta={free}
              canAdd={(a) =>
                freeLeft > 0 &&
                heroClass.startingAttributes[a] + free[a] < ATTRIBUTE_RULES.creationMax
              }
              canRemove={(a) => free[a] > 0}
              onAdd={(a) => setFree((f) => ({ ...f, [a]: f[a] + 1 }))}
              onRemove={(a) => setFree((f) => ({ ...f, [a]: f[a] - 1 }))}
            />
            <div className="grow" />
            <div className="class-buttons">
              <Button icon="prev" onClick={() => setStep("class")}>
                Back
              </Button>
              <Button
                big
                variant="primary"
                blocked={freeLeft > 0 ? `${freeLeft} Points left` : null}
                onClick={() =>
                  props.onBegin({
                    slot: props.slot,
                    classId,
                    weapon,
                    name: name.trim() || heroClass.name,
                    attributes: free,
                  })
                }
              >
                Begin
              </Button>
            </div>
          </div>
        ) : (
          <div className="class-info panel-card">
            <div className="class-name-row">
              <ClassEmblem classId={classId} size={40} />
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

            <div className="class-paths" aria-label="Paths">
              {heroClass.branches.map((id) => (
                <span
                  key={id}
                  className="path-chip"
                  title={`${PRESTIGE_BRANCHES.find((b) => b.id === id)?.name ?? id} → ${heroClass.titles[id] ?? ""}`}
                >
                  <MasteryEmblem masteryId={id} size={18} />
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
              <Button icon="prev" onClick={props.onBack}>
                Back
              </Button>
              <Button big variant="primary" onClick={() => setStep("attributes")}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
