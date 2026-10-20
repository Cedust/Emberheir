import { GAME_DATA, ITEM_CATALOG, PRESTIGE_BRANCHES } from "@emberheir/content";
import {
  ATTRIBUTE_RULES,
  type Attribute,
  type HeroClass,
  type WeaponDefinition,
  getBase,
  speedValue,
  sumAttributes,
} from "@emberheir/sim";
import { Suspense, useMemo, useState } from "react";
import { GAME_ICONS, type GameIconId } from "../ui/gameIcons";
import { type NoteHover, useNoteHover, useWeaponHover } from "../ui/ItemTooltip";
import { newWeaponTip } from "../ui/weaponTip";
import { Button } from "../ui/kit/Button";
import type { Settings } from "../ui/settings";
import { useStageSize } from "../ui/Stage";
import { ATTRIBUTE_ICONS, ATTRIBUTE_INFO, AttributeStones, NO_POINTS } from "./AttributeStones";
import { ClassEmblem, MasteryEmblem } from "./ClassEmblem";
import { dummyPreview } from "./classPreview";
import { PreviewArena } from "./lazyViews";
import type { NewCharacter } from "./useGame";
import { ELEMENT_COLOR } from "./weaponLook";

/**
 * Class select: the three classes on the left; the chosen one in the middle, sparring with
 * Kaelen's Training Dummy, with its weapons on a rack below; on the right what makes the class:
 * its trait, the chosen weapon, the three ways that weapon can grow (Heirloom paths) and the
 * three Masteries. Next leads to the free attribute points (attribute-v1.md section 5).
 */

/** Timo's painted weapons (art/mastery, the plain form), with the Wand's and Staff's gem. */
const PAINTINGS = import.meta.glob<string>(
  ["../assets/mastery/*-plain.webp", "../assets/mastery/*-plain-gem.webp"],
  { eager: true, import: "default" },
);

const AXIS_NAMES = { burst: "Burst", tempo: "Tempo", ailment: "Ailments" } as const;

const AILMENT_NAMES: Record<string, string> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
  stun: "Stun",
};

const DAMAGE_NAMES: Record<string, string> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
};

/** Speed and power of every hero weapon, for the five pips on the weapon card. */
const HERO_WEAPONS = GAME_DATA.classes
  .flatMap((c) => c.weapons)
  .map((id) => getBase(ITEM_CATALOG, id).weapon)
  .filter((w): w is WeaponDefinition => !!w);
const hitOf = (w: WeaponDefinition) =>
  ((w.damage.min + w.damage.max) / 2) * (GAME_DATA.weaponMastery[w.id]?.damageScale ?? 1);

function pips(value: number, all: readonly number[]): number {
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  return hi > lo ? 1 + Math.round(((value - lo) / (hi - lo)) * 4) : 3;
}

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
  // Second step: the creation's free points (attribute-v1.md section 5).
  const [step, setStep] = useState<"class" | "attributes">("class");
  const [free, setFree] = useState<Record<Attribute, number>>(NO_POINTS);
  const freeLeft = ATTRIBUTE_RULES.creationPoints - sumAttributes(free);
  const preview = useMemo(() => dummyPreview(classId, weapon), [classId, weapon]);
  const stage = useStageSize();
  // The arena takes what the two side columns leave of the 16:9 area.
  const arenaW = Math.max(600, Math.min(780, Math.min(stage.w, 1600) - 880));
  const arenaH = Math.round(arenaW * 0.6);
  if (!heroClass) return null;

  const pick = (id: string) => {
    const next = classes.find((c) => c.id === id);
    if (!next) return;
    setClassId(id);
    setWeapon(next.weapons[0] ?? "");
    setFree(NO_POINTS);
  };

  return (
    <div className="class-select" aria-label="Class select">
      <h2 className="title-font cs-title">Choose your Heir</h2>
      <div className="cs-body">
        <div className="cs-classes" role="radiogroup" aria-label="Class">
          {classes.map((c) => (
            <ClassBanner key={c.id} heroClass={c} on={c.id === classId} onPick={pick} />
          ))}
        </div>

        <div className="cs-center">
          <header className="cs-head">
            <h3 className="title-font cs-name">{heroClass.name}</h3>
            <p className="cs-text">{heroClass.text}</p>
          </header>
          <div className="cs-arena" style={{ width: arenaW, height: arenaH }}>
            <Suspense fallback={<div className="preview-arena" />}>
              <PreviewArena
                key={`${classId}-${weapon}`}
                preview={preview}
                width={arenaW}
                height={arenaH}
                settings={props.settings}
              />
            </Suspense>
          </div>
          <div className="cs-rack" role="radiogroup" aria-label="Weapon">
            {heroClass.weapons.map((id) => (
              <WeaponCard key={id} id={id} on={id === weapon} onPick={() => setWeapon(id)} />
            ))}
          </div>
        </div>

        <aside className="cs-side">
          {step === "attributes" ? (
            <div className="cs-attributes" aria-label="Attributes">
              <div className="cs-side-head">
                <span className="title-font">Attributes</span>
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
            </div>
          ) : (
            <ClassFacts heroClass={heroClass} weapon={weapon} />
          )}
          <div className="cs-buttons">
            {step === "attributes" ? (
              <>
                <Button icon="prev" onClick={() => setStep("class")}>
                  Back
                </Button>
                <Button
                  big
                  variant="primary"
                  blocked={freeLeft > 0 ? `${freeLeft} Points left` : null}
                  onClick={() =>
                    props.onBegin({ slot: props.slot, classId, weapon, attributes: free })
                  }
                >
                  Begin
                </Button>
              </>
            ) : (
              <>
                <Button icon="prev" onClick={props.onBack}>
                  Back
                </Button>
                <Button big variant="primary" onClick={() => setStep("attributes")}>
                  Next
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** One class on the left: its emblem in the brass ring, name, and main attribute. */
function ClassBanner(props: { heroClass: HeroClass; on: boolean; onPick: (id: string) => void }) {
  const c = props.heroClass;
  const attribute = ATTRIBUTE_INFO[c.mainAttribute];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.on}
      aria-label={c.name}
      className={`cs-class ${props.on ? "on" : ""}`}
      onClick={() => props.onPick(c.id)}
    >
      <span className="cs-class-ring" data-class={c.id}>
        <ClassEmblem classId={c.id} size={70} />
      </span>
      <span className="cs-class-text">
        <strong className="title-font">{c.name}</strong>
        <span className="cs-class-attr">
          <img src={ATTRIBUTE_ICONS[c.mainAttribute]} alt="" width={20} height={20} />
          {attribute.name}
        </span>
      </span>
    </button>
  );
}

/** A painted weapon on the rack: lying aslant on a wooden board, its name on a brass plate. */
function WeaponCard(props: { id: string; on: boolean; onPick: () => void }) {
  const base = getBase(ITEM_CATALOG, props.id);
  const w = base.weapon;
  const id = props.id;
  const hover = useWeaponHover(() => newWeaponTip(id));
  const painting = PAINTINGS[`../assets/mastery/${props.id}-plain.webp`];
  const gem = PAINTINGS[`../assets/mastery/${props.id}-plain-gem.webp`];
  const glow = `#${(ELEMENT_COLOR[w?.damageType ?? "physical"] ?? 0xff6a2a).toString(16).padStart(6, "0")}`;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.on}
      aria-label={base.name}
      className={`cs-weapon ${props.on ? "on" : ""}`}
      onClick={props.onPick}
      {...hover}
    >
      <span className="cs-weapon-art" style={{ "--gem": glow } as React.CSSProperties}>
        {painting && <img className="cs-weapon-img" src={painting} alt="" draggable={false} />}
        {gem && (
          <>
            <img className="cs-weapon-img" src={gem} alt="" draggable={false} />
            <span
              className="cs-weapon-gem"
              style={{ maskImage: `url(${gem})`, WebkitMaskImage: `url(${gem})` }}
            />
          </>
        )}
      </span>
      <span className="cs-weapon-name title-font">{base.name}</span>
    </button>
  );
}

/** The right column: trait, chosen weapon, its three paths and the class's three Masteries. */
function ClassFacts(props: { heroClass: HeroClass; weapon: string }) {
  const { heroClass, weapon } = props;
  const base = getBase(ITEM_CATALOG, weapon);
  const w = base.weapon;
  const skill = GAME_DATA.startSkills[weapon];
  const paths = GAME_DATA.weaponMastery[weapon]?.paths ?? [];
  return (
    <div className="cs-facts">
      <section className="cs-block cs-trait" aria-label="Class Trait">
        <SectionHead
          title="Class Trait"
          note={{
            name: "Class Trait",
            kind: heroClass.name,
            explain: "Always active, from the first fight on. Only this class has it.",
          }}
        />
        <div className="cs-trait-row">
          <ClassEmblem classId={heroClass.id} size={46} />
          <div>
            <span className="title-font cs-trait-name">{heroClass.trait.name}</span>
            <p>{heroClass.trait.description}</p>
          </div>
        </div>
      </section>

      {w && (
        <section className="cs-block" aria-label="Weapon">
          <SectionHead
            title={base.name}
            note={{
              name: "Your weapon",
              kind: heroClass.name,
              explain:
                "It stays with you for the whole game and grows with you. Gear never replaces it.",
            }}
          />
          <div className="cs-innate">
            <span className="cs-innate-label">Innate</span>
            <strong className="title-font">{skill?.name}</strong>
            <p>{skill?.description}</p>
          </div>
          <div className="cs-weapon-facts">
            <Meter
              label="Speed"
              value={pips(
                w.attacksPerSecond,
                HERO_WEAPONS.map((x) => x.attacksPerSecond),
              )}
              note={{
                name: "Speed",
                kind: base.name,
                explain: `Speed ${speedValue(w.attacksPerSecond)}: ${w.attacksPerSecond.toFixed(2)} attacks per second.`,
              }}
            />
            <Meter
              label="Power"
              value={pips(hitOf(w), HERO_WEAPONS.map(hitOf))}
              note={{
                name: "Power",
                kind: base.name,
                explain: "How hard a single hit lands.",
              }}
            />
          </div>
        </section>
      )}

      <section className="cs-block" aria-label="Playstyles">
        <SectionHead
          title="Playstyles"
          note={{
            name: "Heirloom",
            kind: "Playstyles",
            explain:
              "Your weapon grows down one of three paths. The path decides its damage type and the ailment it leaves.",
          }}
        />
        <ul className="cs-paths">
          {paths.map((p) => {
            return (
              <li key={p.id} className="cs-path">
                <span className="cs-path-icons">
                  <img src={GAME_ICONS[p.infusion.damageType as GameIconId]} alt="" />
                  {p.infusion.ailment && (
                    <img src={GAME_ICONS[p.infusion.ailment as GameIconId]} alt="" />
                  )}
                </span>
                <span className="cs-path-text">
                  <strong className="title-font">{p.name}</strong>
                  <small>
                    {DAMAGE_NAMES[p.infusion.damageType] ?? p.infusion.damageType}
                    {p.infusion.ailment
                      ? ` · ${AILMENT_NAMES[p.infusion.ailment] ?? p.infusion.ailment}`
                      : ""}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cs-block" aria-label="Masteries">
        <SectionHead
          title="Masteries"
          note={{
            name: "Masteries",
            kind: heroClass.name,
            explain:
              "At the first Harvest you choose one: it gives you a title, a skill and a Keystone. Every Mastery fits every playstyle.",
          }}
        />
        <div className="cs-masteries">
          {heroClass.branches.map((id) => (
            <MasteryBadge key={id} id={id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHead(props: { title: string; note: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <h4 className="cs-section title-font" tabIndex={0} {...hover}>
      {props.title}
    </h4>
  );
}

function Meter(props: { label: string; value: number; note: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <span
      className="cs-meter"
      tabIndex={0}
      {...hover}
      aria-label={`${props.label} ${props.value} of 5`}
    >
      <span className="cs-meter-label">{props.label}</span>
      <span className="cs-pips" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={i <= props.value ? "lit" : ""} />
        ))}
      </span>
    </span>
  );
}

function MasteryBadge(props: { id: string }) {
  const mastery = PRESTIGE_BRANCHES.find((b) => b.id === props.id);
  const axis = mastery?.axis ? AXIS_NAMES[mastery.axis] : "";
  const hover = useNoteHover(
    mastery && {
      name: mastery.name,
      kind: `Mastery · ${axis}`,
      explain: mastery.theme.replace(/^[A-Za-z]+: /, ""),
    },
  );
  return (
    <span className="cs-mastery" tabIndex={0} {...hover}>
      <MasteryEmblem masteryId={props.id} size={68} />
      <strong className="title-font">{mastery?.name ?? props.id}</strong>
      <small>{axis}</small>
    </span>
  );
}
