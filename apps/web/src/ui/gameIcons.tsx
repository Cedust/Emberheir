import type { HeatBehavior } from "@emberheir/sim";
import afflicterUrl from "../assets/enemy-types/afflicter.webp";
import bruteUrl from "../assets/enemy-types/brute.webp";
import casterUrl from "../assets/enemy-types/caster.webp";
import championUrl from "../assets/enemy-types/champion.webp";
import echoUrl from "../assets/enemy-types/echo.webp";
import harvesterUrl from "../assets/enemy-types/harvester.webp";
import skirmisherUrl from "../assets/enemy-types/skirmisher.webp";
import thornbackUrl from "../assets/enemy-types/thornback.webp";
import wardenUrl from "../assets/enemy-types/warden.webp";
import eliteNodeUrl from "../assets/map/node-elite.webp";
import bossMarkUrl from "../assets/ui/stage-boss.webp";
import gateMarkUrl from "../assets/ui/stage-gate.webp";
import bleedUrl from "../assets/ailments/bleed.webp";
import burnUrl from "../assets/ailments/burn.webp";
import chillUrl from "../assets/ailments/chill.webp";
import corruptionUrl from "../assets/ailments/corruption.webp";
import poisonUrl from "../assets/ailments/poison.webp";
import shockUrl from "../assets/ailments/shock.webp";
import stunUrl from "../assets/ailments/stun.webp";
import coldUrl from "../assets/elements/cold.webp";
import fireUrl from "../assets/elements/fire.webp";
import lightningUrl from "../assets/elements/lightning.webp";
import physicalUrl from "../assets/elements/physical.webp";
import voidUrl from "../assets/elements/void.webp";
import lifeUrl from "../assets/stats/life.webp";
import barrierUrl from "../assets/stats/barrier.webp";
import armorUrl from "../assets/stats/armor.webp";
import evasionUrl from "../assets/stats/evasion.webp";
import blockUrl from "../assets/stats/block.webp";
import tenacityUrl from "../assets/stats/tenacity.webp";
import lifestealUrl from "../assets/stats/lifesteal.webp";
import thornsUrl from "../assets/stats/thorns.webp";
import elementalUrl from "../assets/stats/elemental.webp";
import speedUrl from "../assets/stats/speed.webp";
import critUrl from "../assets/stats/crit.webp";
import ailmentEffectUrl from "../assets/stats/ailment-effect.webp";
import heatGainUrl from "../assets/stats/heat-gain.webp";
import heatPerHitUrl from "../assets/stats/heat-per-hit.webp";
import heatFromHitsUrl from "../assets/stats/heat-from-hits.webp";
import triggerUrl from "../assets/stats/trigger.webp";
import flaskUrl from "../assets/currency/flask.webp";
import heatUrl from "../assets/heat/heat.webp";
import steadyUrl from "../assets/heat/steady.webp";
import coolingUrl from "../assets/heat/cooling.webp";
import warmingUrl from "../assets/heat/warming.webp";
import smolderingUrl from "../assets/heat/smoldering.webp";
import swordUrl from "../assets/weapons/sword.webp";
import maceUrl from "../assets/weapons/mace.webp";
import axeUrl from "../assets/weapons/axe.webp";
import daggerUrl from "../assets/weapons/dagger.webp";
import bowUrl from "../assets/weapons/bow.webp";
import crossbowUrl from "../assets/weapons/crossbow.webp";
import wandUrl from "../assets/weapons/wand.webp";
import staffUrl from "../assets/weapons/staff.webp";

/**
 * Painted damage type, ailment and stat icons (Timo's sheets, tools/art/cut_elements_ailments.py
 * and cut_stats.py). The Ember Flask comes from the currency sheet, Heat from the Heat sheet.
 */
export const GAME_ICONS = {
  physical: physicalUrl,
  fire: fireUrl,
  cold: coldUrl,
  lightning: lightningUrl,
  void: voidUrl,
  burn: burnUrl,
  chill: chillUrl,
  shock: shockUrl,
  corruption: corruptionUrl,
  bleed: bleedUrl,
  poison: poisonUrl,
  stun: stunUrl,
  life: lifeUrl,
  barrier: barrierUrl,
  armor: armorUrl,
  evasion: evasionUrl,
  block: blockUrl,
  tenacity: tenacityUrl,
  lifesteal: lifestealUrl,
  thorns: thornsUrl,
  elemental: elementalUrl,
  speed: speedUrl,
  crit: critUrl,
  "ailment-effect": ailmentEffectUrl,
  "heat-gain": heatGainUrl,
  "heat-per-hit": heatPerHitUrl,
  "heat-from-hits": heatFromHitsUrl,
  trigger: triggerUrl,
  flask: flaskUrl,
  heat: heatUrl,
} as const;

export type GameIconId = keyof typeof GAME_ICONS;

export function GameIcon(props: { id: GameIconId; size?: number; className?: string }) {
  const size = props.size ?? 20;
  return (
    <img
      className={`game-icon ${props.className ?? ""}`}
      src={GAME_ICONS[props.id]}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

/** Painted hero weapons by weapon id (Timo's sheet, tools/art/cut_weapons.py). */
const WEAPON_ICONS: Readonly<Record<string, string>> = {
  sword: swordUrl,
  mace: maceUrl,
  axe: axeUrl,
  dagger: daggerUrl,
  bow: bowUrl,
  crossbow: crossbowUrl,
  wand: wandUrl,
  staff: staffUrl,
};

export const weaponIconUrl = (weaponId: string): string | undefined => WEAPON_ICONS[weaponId];

/** Painted Heat Forms (Timo's Heat sheet, tools/art/cut_heat.py). */
export const HEAT_FORM_ICONS: Readonly<Record<HeatBehavior, string>> = {
  steady: steadyUrl,
  cooling: coolingUrl,
  warming: warmingUrl,
  smoldering: smolderingUrl,
};

/** Painted enemy types (Timo's sheet 12, tools/art/cut_enemy_types.py): archetypes and echoes. */
export const ENEMY_TYPE_ICONS = {
  brute: bruteUrl,
  skirmisher: skirmisherUrl,
  caster: casterUrl,
  afflicter: afflicterUrl,
  warden: wardenUrl,
  thornback: thornbackUrl,
  harvester: harvesterUrl,
  echo: echoUrl,
} as const;

export type EnemyTypeIcon = keyof typeof ENEMY_TYPE_ICONS;

export const ENEMY_TYPE_NAMES: Readonly<Record<EnemyTypeIcon, string>> = {
  brute: "Brute",
  skirmisher: "Skirmisher",
  caster: "Caster",
  afflicter: "Afflicter",
  warden: "Warden",
  thornback: "Thornback",
  harvester: "Harvester",
  echo: "Warden Echo",
};

/** An enemy archetype's icon key; unknown archetypes fall back to Brute. */
export const enemyTypeIcon = (archetype: string | undefined): EnemyTypeIcon =>
  archetype && archetype in ENEMY_TYPE_ICONS ? (archetype as EnemyTypeIcon) : "brute";

export function EnemyTypeImg(props: { type: EnemyTypeIcon; size?: number; className?: string }) {
  const size = props.size ?? 20;
  return (
    <img
      className={`game-icon ${props.className ?? ""}`}
      src={ENEMY_TYPE_ICONS[props.type]}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

/** Painted rank marks on the enemy plaque: the map's Elite helm, the stage track's gate and boss. */
export const RANK_MARKS = {
  ELITE: eliteNodeUrl,
  CHAMPION: championUrl,
  GATEKEEPER: gateMarkUrl,
  BOSS: bossMarkUrl,
} as const;
