import { SAVE_VERSION } from "../progression/game";
import { KEYSTONE } from "../progression/skill-tree";

/** A save game or stash as read from JSON, before it is checked against the schema. */
export type RawSave = Record<string, unknown>;

/**
 * One step from `version` to `version + 1` (the key in `MIGRATIONS`).
 *
 * Items live in two places: the slot's save and the shared stash (the UI keeps one Supply Wagon
 * for every slot, `apps/web/src/game/saves.ts`). An item change goes into `item`, so it reaches
 * both: `migrateSave` runs it on every item of a save, `migrateStashItems` on every stashed item.
 * Everything else about the save goes into `state`, which sees the items already migrated.
 */
export interface SaveMigration {
  readonly item?: (item: RawSave) => RawSave;
  readonly state?: (save: RawSave) => RawSave;
}

/** Affix ids that were renamed: old id → new id. */
const RENAMED_AFFIXES_V2: Readonly<Record<string, string>> = {
  // Ailments v2: Ailment Duration became Ailment Effect, with the same roll share.
  "ailment-duration": "ailment-effect",
};

/** Renames affix ids on an item (its stat affixes and the rolls keep their quality). */
function renameAffixes(item: RawSave, renamed: Readonly<Record<string, string>>): RawSave {
  const affixes = item["affixes"];
  if (!Array.isArray(affixes)) return item;
  return {
    ...item,
    affixes: affixes.map((a: unknown) => {
      if (!isRecord(a) || typeof a["affixId"] !== "string") return a;
      const to = renamed[a["affixId"]];
      return to ? { ...a, affixId: to } : a;
    }),
  };
}

/**
 * The migrations by version. The save format started over at version 1 (Early Dev Preview,
 * older saves were dropped).
 */
export const MIGRATIONS: Readonly<Record<number, SaveMigration>> = {
  1: { item: (item) => renameAffixes(item, RENAMED_AFFIXES_V2) },
  // Routes and Champions (neuausrichtung-v1.md 6.1, 6.2): new optional fields, nothing to move.
  2: {},
  // Weapon Mastery v2 (weapon-mastery-v2.md): the paths were rebuilt with forks, so their points
  // come back. Refine, the chosen forms, Keystone, Attunement and the Echo stay.
  3: { state: refundMasteryPaths },
  // Skill Web v3 and the Prestige branches' travel nodes (neuausrichtung-v1.md 4): nodes were
  // rebuilt and renamed, so every Skill Point comes back and the hero keeps the class start.
  4: { state: refundSkillTree },
  // Omens (neuausrichtung-v1.md 5.2 and 7.2): new optional fields, nothing to move.
  5: {},
};

/** Class start nodes of Skill Web v3 (the Sorcerer's was renamed). */
const WEB_V3_STARTS: Readonly<Record<string, string>> = {
  warrior: "might-warriors-oath",
  sorcerer: "arcana-sorcerers-sigil",
  warlock: "affliction-warlocks-brand",
  reaver: "rupture-reavers-edge",
  hunter: "rupture-might-hunters-eye",
};

/** Class start nodes before Web v3: they were free. */
const OLD_STARTS = new Set([...Object.values(WEB_V3_STARTS), "arcana-sorcerers-spark"]);

/** Keystones of the web before v3 (they cost `KEYSTONE.skillPoints`); branch ones end in -keystone. */
const OLD_KEYSTONES = new Set([
  "might-unyielding",
  "might-glass-focus",
  "might-arcana-spellblade",
  "arcana-arcane-conduit",
  "arcana-elemental-overload",
  "arcana-affliction-black-flame",
  "affliction-slow-death",
  "affliction-pact-of-ash",
  "affliction-rupture-plague-bearer",
  "rupture-blood-price",
  "rupture-hemomancer",
  "rupture-might-headsman",
]);
const isOldKeystone = (id: string) => OLD_KEYSTONES.has(id) || /-keystone(-\d)?$/.test(id);

function refundSkillTree(save: RawSave): RawSave {
  const hero = save["hero"];
  if (!isRecord(hero) || !isRecord(hero["learned"])) return save;
  let refund = 0;
  for (const [id, ranks] of Object.entries(hero["learned"])) {
    if (OLD_STARTS.has(id) || typeof ranks !== "number") continue;
    refund += ranks * (isOldKeystone(id) ? KEYSTONE.skillPoints : 1);
  }
  const classId = typeof hero["classId"] === "string" ? hero["classId"] : "";
  const start = WEB_V3_STARTS[classId];
  const unspent = typeof hero["unspentSkillPoints"] === "number" ? hero["unspentSkillPoints"] : 0;
  const rotation = Array.isArray(hero["rotation"]) ? hero["rotation"].map(() => null) : [];
  return {
    ...save,
    hero: {
      ...hero,
      learned: start ? { [start]: 1 } : {},
      unspentSkillPoints: unspent + refund,
      // Tree skills are gone until learned again: the Battle Plan falls back to the Start Skill.
      rotation,
    },
  };
}

/** Refine nodes kept their ids and meaning in Weapon Mastery v2. */
const MASTERY_REFINE = new Set(["balance", "precision", "steady-hand", "full-swing"]);

function refundMasteryPaths(save: RawSave): RawSave {
  const hero = save["hero"];
  if (!isRecord(hero)) return save;
  const mastery = hero["mastery"];
  if (!isRecord(mastery) || !isRecord(mastery["learned"])) return save;
  const learned = Object.fromEntries(
    Object.entries(mastery["learned"]).filter(([id]) => MASTERY_REFINE.has(id)),
  );
  return { ...save, hero: { ...hero, mastery: { ...mastery, learned } } };
}

export interface MigrateOptions {
  /** The version to end at (tests); default `SAVE_VERSION`. */
  readonly to?: number;
  readonly migrations?: Readonly<Record<number, SaveMigration>>;
}

const isRecord = (value: unknown): value is RawSave =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The version a save or stash was written in; throws if it has none or is from the future. */
export function versionOf(raw: RawSave, to = SAVE_VERSION): number {
  const version = raw["version"];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("Save game has no version");
  }
  if (version > to) throw new Error(`Save game version ${version} is newer than this game`);
  return version;
}

function step(version: number, migrations: MigrateOptions["migrations"]): SaveMigration {
  const migration = (migrations ?? MIGRATIONS)[version];
  if (!migration) throw new Error(`Save game version ${version} is not supported`);
  return migration;
}

const mapPlaced = (list: unknown, item: (i: RawSave) => RawSave): unknown =>
  Array.isArray(list)
    ? list.map((p: unknown) =>
        isRecord(p) && isRecord(p["item"]) ? { ...p, item: item(p["item"]) } : p,
      )
    : list;

/** Runs `item` on every item a save holds: equipment, inventory, stash and the item pick. */
function mapSaveItems(save: RawSave, item: (i: RawSave) => RawSave): RawSave {
  const out: RawSave = {
    ...save,
    inventory: mapPlaced(save["inventory"], item),
    stash: mapPlaced(save["stash"], item),
  };
  const hero = save["hero"];
  if (isRecord(hero) && isRecord(hero["equipment"])) {
    const equipment = Object.fromEntries(
      Object.entries(hero["equipment"]).map(([slot, i]) => [slot, isRecord(i) ? item(i) : i]),
    );
    out["hero"] = { ...hero, equipment };
  }
  const run = save["run"];
  const rewards = isRecord(run) ? run["rewards"] : undefined;
  if (isRecord(run) && isRecord(rewards) && Array.isArray(rewards["items"])) {
    const items = rewards["items"].map((i: unknown) => (isRecord(i) ? item(i) : i));
    out["run"] = { ...run, rewards: { ...rewards, items } };
  }
  return out;
}

/** Brings a save game up to the current version, step by step. */
export function migrateSave(raw: RawSave, options: MigrateOptions = {}): RawSave {
  const to = options.to ?? SAVE_VERSION;
  let save = raw;
  for (let version = versionOf(raw, to); version < to; version++) {
    const migration = step(version, options.migrations);
    if (migration.item) save = mapSaveItems(save, migration.item);
    if (migration.state) save = migration.state(save);
    save = { ...save, version: version + 1 };
  }
  return save;
}

/** Brings the items of the shared stash, written in `version`, up to the current version. */
export function migrateStashItems(
  items: readonly unknown[],
  version: number,
  options: MigrateOptions = {},
): unknown[] {
  const to = options.to ?? SAVE_VERSION;
  let out = [...items];
  for (let v = version; v < to; v++) {
    const item = step(v, options.migrations).item;
    if (item) out = mapPlaced(out, item) as unknown[];
  }
  return out;
}

export { isRecord };
