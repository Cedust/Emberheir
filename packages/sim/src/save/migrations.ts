import { SAVE_VERSION } from "../progression/game";

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

/**
 * The migrations by version. The save format started over at version 9 with the Klassengerüst
 * (klassengeruest-v1.md: three new classes, Heirloom, Masteries, a new Ash Tree); older saves and
 * stashes are dropped, not converted (Timo, Early Dev Preview).
 */
export const MIGRATIONS: Readonly<Record<number, SaveMigration>> = {
  // Balancing restart step 4: three travel nodes of the Ash Tree became the element attacks of
  // weapon fighters. A hero who had one learned keeps the Skill Point in the node's place.
  9: { state: (save) => renameLearned(save, ELEMENT_ATTACK_NODES) },
  // Längere Runs: a trip may hold its walks past the Warden's Gate (`run.wanders`, optional).
  10: {},
  // Act map (act-karte-entwurf-v1.md): the forks' routes are gone. A trip under way walks on
  // without a map (every stage a fight) until the next set-out.
  11: { state: dropRoutes },
  // Hunts (hunts-entwurf-v1.md): kills per enemy (`legacy.hunts`) and the Hunt node, optional.
  12: {},
};

function dropRoutes(save: RawSave): RawSave {
  const run = save["run"];
  if (!isRecord(run) || !("routes" in run)) return save;
  const rest = { ...run };
  delete rest["routes"];
  return { ...save, run: rest };
}

export interface MigrateOptions {
  /** The version to end at (tests); default `SAVE_VERSION`. */
  readonly to?: number;
  readonly migrations?: Readonly<Record<number, SaveMigration>>;
}

const isRecord = (value: unknown): value is RawSave =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Old Ash Tree node → the element attack that took its place (save version 10). */
export const ELEMENT_ATTACK_NODES: Readonly<Record<string, string>> = {
  "flame-ember-ash": "flame-searing-blow",
  "storm-steady-mind": "storm-storm-strike",
  "frost-still-mind": "frost-frost-strike",
};

/** Renames learned Ash Tree nodes of the hero; the ranks stay. */
function renameLearned(save: RawSave, names: Readonly<Record<string, string>>): RawSave {
  const hero = save["hero"];
  if (!isRecord(hero) || !isRecord(hero["learned"])) return save;
  const learned = Object.fromEntries(
    Object.entries(hero["learned"]).map(([id, ranks]) => [names[id] ?? id, ranks]),
  );
  return { ...save, hero: { ...hero, learned } };
}

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
