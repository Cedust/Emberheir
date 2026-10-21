import { z } from "zod";
import { ATTRIBUTES } from "../combat/types";
import { EQUIPMENT_SLOTS, ITEM_SLOTS, type Item, RARITIES } from "../items/types";
import type { PlacedItem } from "../progression/inventory";
import { type GameState, NODE_KINDS } from "../progression/game/state";

/**
 * The shape of a save game (zod). `deserializeGame` parses every save with it, so a broken or
 * hand-edited save fails on loading instead of somewhere in the middle of a run.
 *
 * Each schema is typed against the state type it reads (`z.ZodType<GameState>`), so a field with
 * the wrong type does not compile. A field the schema misses would be dropped on loading: the
 * round-trip tests in `save.test.ts` catch that. Optional fields use `exactOptional` because the
 * state types are written for `exactOptionalPropertyTypes`.
 */

const num = z.number().finite();
const int = z.number().int();
const count = int.nonnegative();
const id = z.string().min(1);
const opt = <T extends z.ZodType>(schema: T) => schema.exactOptional();

const attributes = z.record(z.enum(ATTRIBUTES), num);
const numbersById = z.record(z.string(), num);

const affixRoll = z.object({
  affixId: id,
  quality: num,
  kindled: opt(z.literal(true)),
});

export const itemSchema: z.ZodType<Item> = z.object({
  id: id,
  baseId: id,
  name: z.string(),
  rarity: z.enum(RARITIES),
  itemLevel: count,
  tier: count,
  affixes: z.array(affixRoll),
  lockedAffix: opt(count),
  greater: opt(z.object({ index: count, rank: int.positive() })),
  sockets: opt(count),
  runes: opt(z.array(id)),
  powerId: opt(id),
  uniqueId: opt(id),
});

export const placedItemSchema: z.ZodType<PlacedItem> = z.object({
  item: itemSchema,
  x: count,
  y: count,
  tab: opt(count),
});

const slotModifier = z.enum(["thrifty", "empowered", "reverb", "overcharge"]);

const battlePlan = z.object({
  thresholds: z.array(num.nullable()),
  modifiers: z.array(z.array(slotModifier)),
  conditions: z.array(z.string().nullable()),
  reactions: z.array(z.object({ skillId: id, conditionId: id }).nullable()),
  reactionModifiers: z.array(z.array(slotModifier)),
  capstone: z
    .object({
      id: z.enum(["echo", "crescendo", "vigil", "ignition", "lingeringFlame", "emberWard"]),
      slot: count,
    })
    .nullable(),
  openingMove: opt(z.string().nullable()),
});

const mastery = z.object({
  learned: numbersById,
  choices: z.partialRecord(z.enum(["heatForm", "innateForm", "keystone"]), id),
  echo: z.string().nullable(),
  bonusPoints: opt(count),
});

const hero = z.object({
  name: z.string(),
  classId: id,
  level: int.positive(),
  xp: num.nonnegative(),
  attributes,
  unspentAttributePoints: count,
  unspentSkillPoints: count,
  learned: numbersById,
  weaponId: id,
  mastery,
  equipment: z.partialRecord(z.enum(EQUIPMENT_SLOTS), itemSchema),
  rotation: z.array(z.string().nullable()),
  plan: battlePlan,
  webRunes: opt(z.record(z.string(), id)),
  crucible: opt(z.object({ strike: opt(id), ward: opt(id), ember: opt(id) })),
  ashborn: opt(z.object({ level: count, xp: num, points: z.record(z.string(), count) })),
});

const wallet = z.object({
  acorns: num,
  ash: num,
  emberCoal: num,
  phoenixFeathers: num,
  runes: z.record(z.string(), count),
  cinderglass: opt(count),
});

const boonPick = z.object({ id: id, grade: z.enum(["spark", "flame", "blaze"]) });

const lifeAndDamage = z.object({ life: num, damage: num });

const fightReport = z.object({
  damage: z.array(z.object({ source: z.string(), damage: num })),
  total: num,
  reactions: z.array(z.object({ skill: z.string(), casts: count })),
});

const encounter = z.object({
  enemyId: id,
  level: int.positive(),
  boss: z.boolean(),
  eliteModifiers: z.array(id),
  pressure: opt(lifeAndDamage),
  wall: opt(lifeAndDamage),
  gate: opt(z.boolean()),
  seed: int,
  thief: opt(z.boolean()),
  echo: opt(id),
  champion: opt(z.boolean()),
  omens: opt(z.array(id)),
  challenge: opt(z.boolean()),
  lucky: opt(z.boolean()),
});

const pickKind = z.enum(["equip", "take"]);

const rewards = z.object({
  rank: z.enum(["normal", "elite", "boss"]),
  xp: num,
  acorns: num,
  ash: num,
  emberCoal: num,
  phoenixFeathers: num,
  runes: z.array(id),
  levelsGained: count,
  ashbornLevels: opt(count),
  cinderglass: opt(count),
  waymark: opt(z.boolean()),
  items: z.array(itemSchema),
  picks: opt(count),
  thief: opt(z.enum(["caught", "escaped"])),
  taken: opt(z.array(z.object({ index: count, kind: pickKind }))),
  itemPick: z
    .union([
      z.object({ kind: pickKind, index: count }),
      z.object({ kind: z.literal("salvageAll") }),
    ])
    .nullable(),
  newTrophies: opt(z.array(id)),
  echo: opt(z.object({ id: id, stage: count })),
  salvagedAsh: num,
  bountyDone: opt(z.boolean()),
  report: opt(fightReport),
  boonOffer: opt(z.array(boonPick)),
  boonPick: opt(count.nullable()),
});

const bounty = z.object({
  id: id,
  enemyId: opt(id),
  progress: num,
  status: z.enum(["open", "done", "failed"]),
});

const mapNode = z.object({
  lane: count,
  kind: z.enum(NODE_KINDS),
  next: z.array(count),
});

const visit = z.object({
  kind: z.enum(NODE_KINDS),
  done: opt(z.boolean()),
  event: opt(id),
  runes: opt(z.array(id)),
  emberCoal: opt(count),
  slots: opt(z.array(z.enum(ITEM_SLOTS))),
  bought: opt(z.array(count)),
});

const run = z.object({
  actId: id,
  stage: int.positive(),
  lifeFraction: num.min(0).max(1),
  phase: z.enum(["intermission", "fight", "rewards"]),
  encounter: encounter.nullable(),
  rewards: rewards.nullable(),
  bounty: opt(bounty),
  wildfire: opt(int.positive()),
  draught: opt(id),
  wanders: opt(int.positive()),
  map: opt(z.object({ rows: z.array(z.array(mapNode)) })),
  path: opt(z.array(count)),
  visit: opt(visit),
  fights: opt(count),
  events: opt(z.array(id)),
  challenge: opt(z.boolean()),
  lucky: opt(z.boolean()),
  curse: opt(z.object({ damage: num, until: count })),
  omens: opt(z.array(id)),
});

const notice = z.object({
  kind: z.enum(["death", "retreat", "actCleared", "prestige", "ending"]),
  actId: id,
  stage: count,
  enemyName: opt(z.string()),
  wildfire: opt(int.positive()),
});

const legacy = z.object({
  prestige: count,
  chronicle: z.array(
    z.object({
      generation: int.positive(),
      title: opt(z.string()),
      level: int.positive(),
      deaths: count,
      enemyName: z.string(),
    }),
  ),
  runewords: z.array(id),
  runesFound: z.array(id),
  codex: z.object({ conditions: numbersById, effects: numbersById }),
  branches: z.array(id),
  trophies: z.array(id),
  echoes: z.record(z.string(), z.object({ stage: count, prestige: count })),
  finaleAttempts: opt(count),
  finaleWon: opt(z.boolean()),
  wildfire: opt(count),
  bossesMet: opt(z.array(id)),
});

export const gameStateSchema: z.ZodType<GameState> = z.object({
  version: int,
  seed: int,
  nonce: count,
  hero,
  wallet,
  inventory: z.array(placedItemSchema),
  stash: z.array(placedItemSchema),
  flaskCharges: count,
  progress: z.object({
    actsCleared: z.array(id),
    deathsInAct: count,
    trainerUnlocked: z.boolean(),
    rotationSlots: count,
    runesmithUnlocked: z.boolean(),
    waymarks: z.array(z.string()),
  }),
  run: run.nullable(),
  notice: notice.nullable(),
  stats: z.object({
    fights: count,
    wins: count,
    deaths: count,
    retreats: count,
    bossKills: count,
  }),
  legacy,
  pendingPrestige: z.object({ actId: id, stage: count, enemyName: z.string() }).nullable(),
  boons: z.object({ kept: z.array(boonPick), fresh: z.array(boonPick) }),
  bountyDone: opt(z.object({ id: id, enemyId: opt(id), actId: id })),
  lineage: opt(count),
  draught: opt(id.nullable()),
  powerCodex: opt(z.record(z.string(), int.positive())),
});

/** The shared stash (Supply Wagon) as the UI stores it next to the slots. */
export const stashSchema = z.object({
  version: int,
  items: z.array(placedItemSchema),
});
