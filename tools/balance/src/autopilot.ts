import {
  type ActData,
  applyAction,
  ashbornBlockReason,
  ashbornUnspent,
  ATTRIBUTE_RULES,
  ATTRIBUTES,
  type Attributes,
  BOON_GRADES,
  type BoonPick,
  craftBlockReason,
  craftCost,
  CRUCIBLE_SLOTS,
  crucibleLock,
  draughtsOpen,
  equipBlockReason,
  getAct,
  routeAt,
  type GameData,
  type GameState,
  heroAshborn,
  heroBoons,
  heroSetup,
  learnHeirloom,
  openBranches,
  takeBlockReason,
} from "@emberheir/sim";
import { type BuildPlan } from "./builds";
import { actProfile, gearValue, upgradeGain } from "./gear-value";
import { keptBases, wantsBase } from "./runes";

/** The autopilot's choices outside the Skill Tree: gear, Boons, Draughts, attributes, Mastery. */

/** Attribute points per level for each weapon. */
const ATTRIBUTE_PLAN: Record<string, (keyof Attributes)[]> = {
  sword: ["strength", "agility", "vitality"],
  wand: ["intelligence", "wisdom", "vitality"],
  axe: ["strength", "vitality", "wisdom"],
  dagger: ["dexterity", "agility", "vitality"],
  mace: ["strength", "vitality", "agility"],
  staff: ["intelligence", "wisdom", "vitality"],
  bow: ["dexterity", "agility", "vitality"],
  crossbow: ["strength", "dexterity", "vitality"],
};

/**
 * The Draught for the coming trip: the one that adds the most effective Life against the act's
 * damage mix (balance-grundlagen-v1.md F).
 */
export function brewDraught(state: GameState, data: GameData, act: ActData | undefined): GameState {
  if (!draughtsOpen(state, data) || !act) return state;
  const profile = actProfile(act);
  const tryWith = (id: string | undefined): number =>
    gearValue(
      {
        ...state,
        draught: id ?? null,
        // heroSetup reads the brewed Draught from the run; a stand-in run is enough here.
        run: id ? ({ draught: id, lifeFraction: 1 } as unknown as GameState["run"]) : null,
      } as GameState,
      data,
      profile,
    );
  let best: string | null = null;
  let bestValue = tryWith(undefined);
  for (const d of data.draughts ?? []) {
    const value = tryWith(d.id);
    if (value > bestValue + 1e-9) {
      best = d.id;
      bestValue = value;
    }
  }
  return state.draught === best
    ? state
    : applyAction(state, data, { type: "chooseDraught", draughtId: best });
}

/**
 * At a fork (neuausrichtung-v1.md 6.2) the autopilot reads its Life like a player: healthy, it
 * takes the Elite path for the better loot; hurt, it rests on the Hearth path; else the Shrine.
 */
export function chooseRoute(state: GameState, data: GameData): GameState {
  const run = state.run;
  if (!run || run.phase !== "intermission") return state;
  const at = routeAt(run, getAct(data, run.actId), run.stage);
  if (!at || at.second || run.routes?.[String(at.fork)]) return state;
  const life = run.lifeFraction;
  const route = life >= 0.75 ? "elite" : life < 0.5 ? "hearth" : "shrine";
  return applyAction(state, data, { type: "chooseRoute", route });
}

/** Boon choice: a family that fits the weapon (or Hearth) first, then rank-ups, then the grade. */
export function bestBoon(state: GameState, data: GameData, offer: readonly BoonPick[]): number {
  const damageType = heroSetup(state, data).setup.weapon.damageType;
  const owned = new Set(heroBoons(state, data).map((b) => b.def.id));
  const value = (pick: BoonPick) => {
    const def = data.boons?.find((b) => b.id === pick.id);
    const family = data.boonFamilies?.find((f) => f.id === def?.family);
    const fits =
      !family || family.damageTypes.length === 0 || family.damageTypes.includes(damageType);
    return (fits ? 10 : 0) + (owned.has(pick.id) ? 3 : 0) + BOON_GRADES.indexOf(pick.grade);
  };
  let best = 0;
  offer.forEach((pick, i) => {
    if (value(pick) > value(offer[best] ?? pick)) best = i;
  });
  return best;
}

export function autopilotRewards(state: GameState, data: GameData, runes = false): GameState {
  let s = state;
  const rewards = s.run?.rewards;
  if (!rewards) return s;
  // Boss Hoard: up to `picks` cards, the best upgrade each time.
  while (s.run?.rewards && !s.run.rewards.itemPick) {
    const taken = new Set((s.run.rewards.taken ?? []).map((t) => t.index));
    let best = -1;
    let bestGain = 0;
    rewards.items.forEach((item, i) => {
      if (taken.has(i) || equipBlockReason(s, data, item, "pick")) return;
      const gain = upgradeGain(s, data, item);
      if (gain > bestGain + 1e-6) {
        best = i;
        bestGain = gain;
      }
    });
    if (best >= 0) {
      s = applyAction(s, data, { type: "pickItem", index: best, mode: "equip" });
      continue;
    }
    // No upgrade: a Normal card may still be worth taking home as a Runeword base.
    const base = runes
      ? rewards.items.findIndex(
          (item, i) => !taken.has(i) && !takeBlockReason(s, data, item) && wantsBase(s, data, item),
        )
      : -1;
    s =
      base >= 0
        ? applyAction(s, data, { type: "pickItem", index: base, mode: "take" })
        : applyAction(s, data, { type: "salvageAll" });
  }
  // Old items are never needed again by the autopilot: Thoric salvages them in the Camp, so on
  // the road they wait in the inventory (thrown away only to make room). Runeword bases stay.
  const kept = runes ? keptBases(s, data) : new Set<string>();
  const loose = s.inventory.filter((p) => !kept.has(p.item.id));
  for (const placed of loose.slice(0, Math.max(0, loose.length - 4))) {
    s = applyAction(s, data, { type: "discard", itemId: placed.item.id });
  }
  const offer = s.run?.rewards?.boonOffer;
  if (offer?.length)
    s = applyAction(s, data, { type: "pickBoon", index: bestBoon(s, data, offer) });
  return applyAction(s, data, { type: "continue" });
}

/**
 * Spends each point where it helps this hero most (same measure as for gear: damage on the
 * training dummy times effective Life), so a caster facing Corruption raises Vitality like a
 * player would. Ties go to the weapon's plan.
 */
export function spendPoints(state: GameState, data: GameData, weaponId: string): GameState {
  const plan = [...(ATTRIBUTE_PLAN[weaponId] ?? []), ...ATTRIBUTES];
  const order = plan.filter((a, i) => plan.indexOf(a) === i);
  let s = state;
  while (s.hero.unspentAttributePoints > 0) {
    let best: GameState | null = null;
    let bestValue = -Infinity;
    for (const attribute of order) {
      if (s.hero.attributes[attribute] >= ATTRIBUTE_RULES.max) continue;
      const next = applyAction(s, data, { type: "allocateAttributes", points: { [attribute]: 1 } });
      const value = gearValue(next, data);
      if (value > bestValue + 1e-6) {
        best = next;
        bestValue = value;
      }
    }
    if (!best) break;
    s = best;
  }
  return spendAshborn(s, data);
}

/** Ashborn Points (neuausrichtung-v1.md 7.3) one by one where they add the most value. */
function spendAshborn(state: GameState, data: GameData): GameState {
  let s = state;
  while (ashbornUnspent(heroAshborn(s)) > 0) {
    let best: GameState | null = null;
    let bestValue = -Infinity;
    for (const v of data.ashbornValues ?? []) {
      if (ashbornBlockReason(heroAshborn(s), data.ashbornValues ?? [], v.id)) continue;
      const next = applyAction(s, data, { type: "spendAshborn", valueId: v.id });
      const value = gearValue(next, data);
      if (value > bestValue + 1e-6) {
        best = next;
        bestValue = value;
      }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

/** Kaelen: learns the Heirloom along the plan and wears the strongest Echo. */
export function spendMastery(state: GameState, data: GameData, build?: BuildPlan): GameState {
  let s = build ? learnHeirloom(state, data, build) : state;
  const echoes = Object.entries(s.legacy.echoes).sort((a, b) => b[1].stage - a[1].stage);
  const best = echoes[0]?.[0];
  if (best && s.hero.mastery.echo !== best) {
    s = applyAction(s, data, { type: "setEcho", echoId: best });
  }
  return s;
}

/**
 * Harvests with the build's Mastery plan: the main Mastery first (it deepens up to Tier V), then
 * Tier I of the others in plan order. All items stay.
 */
export function autopilotPrestige(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
): GameState {
  const open = openBranches(state, data).map((b) => b.id);
  const plan = build?.masteries ?? [];
  const preferred = plan.find((b) => open.includes(b)) ?? open[0];
  const s = applyAction(state, data, {
    type: "prestige",
    ...(preferred ? { branchId: preferred } : {}),
  });
  return applyAction(s, data, { type: "dismissNotice" });
}

/**
 * Liora's Greater Affixes (neuausrichtung-v1.md 7.5): Cinderglass goes where it adds the most
 * value per glass on the worn items: Awaken, Intensify, or Shift a Greater that sits on an affix
 * the build does not use.
 */
export function spendCinderglass(state: GameState, data: GameData): GameState {
  let s = state;
  for (let guard = 0; guard < 64 && (s.wallet.cinderglass ?? 0) > 0; guard++) {
    const base = gearValue(s, data);
    let best: GameState | null = null;
    let bestGain = 1e-6;
    for (const item of Object.values(s.hero.equipment)) {
      if (!item) continue;
      for (const kind of ["awaken", "intensify", "shift"] as const) {
        const request = { kind, itemId: item.id };
        if (craftBlockReason(s, data, request)) continue;
        const next = applyAction(s, data, { type: "craft", request });
        const glass = craftCost(request, item, data, s).cinderglass ?? 1;
        const gain = (gearValue(next, data) - base) / glass;
        if (gain > bestGain) {
          best = next;
          bestGain = gain;
        }
      }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

/**
 * Ember Crucible (neuausrichtung-v1.md 8): each open slot gets the learned Power that adds the
 * most value; a bound Power is only swapped for a clearly better one (binding costs).
 */
export function bindPowers(state: GameState, data: GameData): GameState {
  let s = state;
  for (const slot of CRUCIBLE_SLOTS) {
    if (crucibleLock(s, slot)) continue;
    const base = gearValue(s, data);
    let best: GameState | null = null;
    let bestValue = base + 0.01;
    for (const power of data.items.powers.values()) {
      if (power.crucible !== slot || !s.powerCodex?.[power.id]) continue;
      if (s.hero.crucible?.[slot] === power.id) continue;
      let next: GameState;
      try {
        next = applyAction(s, data, { type: "bindPower", slot, powerId: power.id });
      } catch {
        continue;
      }
      const value = gearValue(next, data);
      if (value > bestValue) {
        best = next;
        bestValue = value;
      }
    }
    if (best) s = best;
  }
  return s;
}
