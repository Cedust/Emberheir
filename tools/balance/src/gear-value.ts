import {
  type ActData,
  armorReduction,
  type CombatantSetup,
  type DamageType,
  deriveStats,
  type EnemyDefinition,
  Fight,
  type GameData,
  type GameState,
  heroSetup,
  type Item,
  targetSlot,
} from "@emberheir/sim";

/**
 * How good the hero is with a piece of gear (a leaf module: the autopilot's gear picks, Draughts,
 * attributes and Runes all use the same measure).
 */

/** Seconds the autopilot spends hitting a training dummy to judge a piece of gear. */
const DUMMY_SECONDS = 30;

/**
 * Damage per second of the hero against a training dummy that never hits back: the build's own
 * rotation, ailments and triggers all count, so Ailment Duration matters to a Warlock just as
 * Crit matters to a Marksman.
 */
function dummyDps(setup: CombatantSetup): number {
  const dummy: CombatantSetup = {
    name: "Training Dummy",
    level: setup.level,
    attributes: { strength: 0, dexterity: 0, agility: 0, intelligence: 0, wisdom: 0, vitality: 0 },
    weapon: { ...setup.weapon, attacksPerSecond: 0, triggers: [], ailmentChances: [] },
    rotation: [],
    baseLife: 1e9,
  };
  const fight = new Fight({ ...setup, lifeFraction: 1 }, dummy, 1);
  fight.advance(DUMMY_SECONDS);
  const enemy = fight.snapshot().enemy;
  return Math.max(1, (enemy.maxLife - enemy.life) / DUMMY_SECONDS);
}

/** Share of the incoming damage by type: Physical and the four elements, summing to 1. */
export type DamageProfile = Readonly<Record<DamageType, number>>;

const EVEN_PROFILE: DamageProfile = {
  physical: 0.5,
  fire: 0.125,
  cold: 0.125,
  lightning: 0.125,
  void: 0.125,
};

/** Damage types an enemy deals: its weapon, its skills and its telegraphs, one vote each. */
function enemyProfile(enemy: EnemyDefinition): Record<DamageType, number> {
  const votes: Record<DamageType, number> = {
    physical: 0,
    fire: 0,
    cold: 0,
    lightning: 0,
    void: 0,
  };
  // The Default Attack lands most of the damage over a fight.
  votes[enemy.weapon.damageType] += 4;
  const skills = [...enemy.skills, ...(enemy.telegraphs ?? []).map((t) => t.skill)];
  for (const skill of skills) {
    for (const hit of skill.hits) {
      votes[hit.kind === "spell" ? hit.damageType : (hit.damageType ?? enemy.weapon.damageType)]++;
    }
  }
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(votes) as DamageType[]) votes[key] /= total;
  return votes;
}

/**
 * What an act throws at the hero: half its enemies, half its boss. Like a player reading the
 * Scout's report, the autopilot gears and brews for it.
 */
export function actProfile(act: ActData): DamageProfile {
  const out: Record<DamageType, number> = { physical: 0, fire: 0, cold: 0, lightning: 0, void: 0 };
  const boss = enemyProfile(act.boss);
  for (const enemy of act.enemies) {
    const p = enemyProfile(enemy);
    for (const key of Object.keys(out) as DamageType[]) {
      out[key] += (0.5 * p[key]) / act.enemies.length;
    }
  }
  for (const key of Object.keys(out) as DamageType[]) out[key] += 0.5 * boss[key];
  return out;
}

const PROFILES = new Map<string, DamageProfile>();

/** The damage mix of the act the hero is in (an even mix in the Camp and the finale). */
function runProfile(state: GameState, data: GameData): DamageProfile {
  const actId = state.run?.actId;
  const act = actId ? data.acts.find((a) => a.id === actId) : undefined;
  if (!act) return EVEN_PROFILE;
  let profile = PROFILES.get(act.id);
  if (!profile) {
    profile = actProfile(act);
    PROFILES.set(act.id, profile);
  }
  return profile;
}

/**
 * How good the hero is with this gear: measured damage per second times effective Life against
 * the coming act's damage mix (an even Physical/magic mix when unknown). Like a player, the
 * autopilot builds up what its build lives on and fills its weakest spot.
 */
export function gearValue(
  state: GameState,
  data: GameData,
  profile: DamageProfile = runProfile(state, data),
): number {
  const setup = heroSetup(state, data).setup;
  const st = deriveStats(setup);
  const dps = dummyDps(setup);
  const physTaken =
    (1 - armorReduction(st.armor, setup.level)) * (1 - st.blockReduction * st.blockChance);
  const magic =
    profile.fire * (1 - st.fireResistance) +
    profile.cold * (1 - st.coldResistance) +
    profile.lightning * (1 - st.lightningResistance) +
    profile.void * (1 - st.voidResistance);
  // Tenacity shortens the ailments that ramp up on the hero (Corruption, Poison stacks).
  const taken =
    (profile.physical * physTaken + magic) * (1 - 0.6 * st.evasion) * (1 - 0.3 * st.tenacity);
  // Lifesteal heals back part of the damage dealt over a fight of about 20 s.
  const effectiveLife = (st.maxLife + st.barrier) / taken + st.lifesteal * dps * 20;
  return Math.log(dps) + Math.log(effectiveLife);
}

/** Value gained by wearing `item` in its slot instead of what is there now. */
export function upgradeGain(
  state: GameState,
  data: GameData,
  item: Item,
  profile?: DamageProfile,
): number {
  const slot = targetSlot(item, data, state.hero.equipment);
  if (!slot) return 0;
  const tried: GameState = {
    ...state,
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: item } },
  };
  return gearValue(tried, data, profile) - gearValue(state, data, profile);
}
