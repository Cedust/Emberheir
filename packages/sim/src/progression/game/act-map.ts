import { PROGRESSION } from "../constants";
import type { Rng } from "../../rng";
import { waymarkStages } from "./acts";
import { type ActData, type ActMap, type MapNode, type NodeKind, type RunState } from "./state";

/**
 * The act map (act-karte-entwurf-v1.md, Slay the Spire): three lanes, one row per stage. The
 * first stage and the Waymarks (5, 10 and the boss) are single nodes every lane leads into, so
 * the Gatekeepers, Hearth Embers and Shrines of the Waymarks stay where they are, and every path
 * is equally long. Rolled anew for every walk through the act.
 */

export const MAP_LANES = 3;

/** Nodes without a fight. */
export const QUIET_NODES: readonly NodeKind[] = ["shrine", "hearth", "cache", "event", "marisha"];

export const isQuiet = (kind: NodeKind) => QUIET_NODES.includes(kind);

/** What the map may hold on this walk. */
export interface MapOptions {
  /** Shrines burn (the act is not cleared, no walk past the Gate yet). */
  readonly shrines: boolean;
  /** A "catch the Ember Thief" bounty runs: the thief's trail shows on the map. */
  readonly thief: boolean;
  /** Events exist. */
  readonly events: boolean;
}

/** Rows with a single node: the first stage and the Waymarks. */
export function singleRows(act: ActData): readonly number[] {
  return [1, ...waymarkStages(act)];
}

/** Weights of the node kinds on a row between two Waymarks. */
const KIND_WEIGHTS: readonly (readonly [NodeKind, number])[] = [
  ["fight", 40],
  ["elite", 15],
  ["hearth", 9],
  ["cache", 9],
  ["event", 12],
  ["shrine", 8],
];

/** Marisha shows up once on the middle stretch of a map, this often. */
const MARISHA_CHANCE = 0.6;

const fights = (kind: NodeKind | undefined) =>
  kind === "fight" || kind === "elite" || kind === "thief";

export function generateActMap(act: ActData, options: MapOptions, rng: Rng): ActMap {
  const single = singleRows(act);
  const kinds: NodeKind[][] = [];
  // Each lane holds every quiet kind at most once per stretch between two Waymarks.
  let stretch = 0;
  let used: Set<NodeKind>[] = [];
  for (let row = 1; row <= act.stages; row++) {
    if (single.includes(row)) {
      kinds.push(["fight"]);
      if (row > 1) stretch++;
      used = Array.from({ length: MAP_LANES }, () => new Set<NodeKind>());
      continue;
    }
    const before = kinds[row - 2] ?? [];
    const out: NodeKind[] = [];
    for (let lane = 0; lane < MAP_LANES; lane++) {
      if (row <= PROGRESSION.eliteFreeStages) {
        out.push("fight");
        continue;
      }
      const prev = before.length > 1 ? before[lane] : undefined;
      const pool = KIND_WEIGHTS.filter(([kind]) => {
        // No two quiet nodes and no two Elites in a row on one lane.
        if (isQuiet(kind) && prev && isQuiet(prev)) return false;
        if (kind === "elite" && prev === "elite") return false;
        if (kind === "shrine" && (!options.shrines || stretch >= 2)) return false;
        if (kind === "event" && !options.events) return false;
        return !isQuiet(kind) || !used[lane]?.has(kind);
      });
      const total = pool.reduce((n, [, w]) => n + w, 0);
      let roll = rng.next() * total;
      let kind: NodeKind = "fight";
      for (const [k, w] of pool) {
        roll -= w;
        if (roll < 0) {
          kind = k;
          break;
        }
      }
      used[lane]?.add(kind);
      out.push(kind);
    }
    kinds.push(out);
  }

  // Marisha once on the middle stretch; the thief's trail on the first two stretches.
  const mixed = (inStretch: number) => {
    const rows: number[] = [];
    let s = 0;
    for (let row = 1; row <= act.stages; row++) {
      if (single.includes(row)) {
        if (row > 1) s++;
        continue;
      }
      if (s === inStretch && row > PROGRESSION.eliteFreeStages) rows.push(row);
    }
    return rows;
  };
  const place = (kind: NodeKind, rows: readonly number[], replace: (k: NodeKind) => boolean) => {
    const spots = rows.flatMap((row) =>
      (kinds[row - 1] ?? []).flatMap((k, lane) => (replace(k) ? [{ row, lane }] : [])),
    );
    if (!spots.length) return;
    const spot = spots[rng.int(0, spots.length - 1)];
    const at = spot && kinds[spot.row - 1];
    if (spot && at) at[spot.lane] = kind;
  };
  if (rng.chance(MARISHA_CHANCE)) place("marisha", mixed(1), (k) => isQuiet(k) && k !== "shrine");
  if (options.thief) {
    for (const s of [0, 1]) place("thief", mixed(s), (k) => k === "fight");
  }

  // Lanes run straight; between two rows of three a pair of lanes may cross over one way.
  const next: number[][][] = kinds.map((row, r) => {
    const after = kinds[r + 1];
    if (!after) return row.map(() => []);
    if (row.length === 1) return [after.map((_, lane) => lane)];
    if (after.length === 1) return row.map(() => [0]);
    const links = row.map((_, lane) => [lane]);
    for (let lane = 0; lane < MAP_LANES - 1; lane++) {
      const roll = rng.int(0, 2);
      if (roll === 1) links[lane]?.push(lane + 1);
      if (roll === 2) links[lane + 1]?.push(lane);
    }
    return links.map((l) => [...l].sort((a, b) => a - b));
  });

  // Every node leads to at least one fight: a path that only fights is always there.
  kinds.forEach((row, r) => {
    const after = kinds[r + 1];
    if (!after || after.length === 1) return;
    row.forEach((_, lane) => {
      const ahead = next[r]?.[lane] ?? [];
      if (ahead.some((l) => fights(after[l]))) return;
      after[row.length === 1 ? 1 : lane] = "fight";
    });
  });

  // A Hearth in the row before the boss, where possible on a lane no path needs for its fight.
  const last = kinds[act.stages - 2];
  const before = kinds[act.stages - 3];
  if (last && last.length > 1 && !last.includes("hearth")) {
    const start = rng.int(0, MAP_LANES - 1);
    const lanes = [0, 1, 2].map((i) => (start + i) % MAP_LANES);
    const spare = (lane: number) =>
      (before ?? []).every((_, from) => {
        const ahead = next[act.stages - 3]?.[from] ?? [];
        return !ahead.includes(lane) || ahead.some((l) => l !== lane && fights(last[l]));
      });
    const lane = lanes.find(spare) ?? lanes[0] ?? 0;
    last[lane] = "hearth";
  }

  return {
    rows: kinds.map((row, r) =>
      row.map((kind, i): MapNode => ({
        lane: row.length === 1 ? 1 : i,
        kind,
        next: (next[r]?.[i] ?? []).map((l) => ((kinds[r + 1]?.length ?? 0) === 1 ? 1 : l)),
      })),
    ),
  };
}

/** The node of a row at a lane (a single row's node at any lane). */
export function nodeAt(map: ActMap, stage: number, lane: number): MapNode | undefined {
  const row = map.rows[stage - 1];
  if (!row) return undefined;
  return row.length === 1 ? row[0] : row.find((n) => n.lane === lane);
}

/** The node the hero stands at; `null` without a map (Wildfire, finale, old saves). */
export function currentNode(run: Pick<RunState, "map" | "path" | "stage">): MapNode | null {
  if (!run.map) return null;
  return nodeAt(run.map, run.stage, run.path?.[run.stage - 1] ?? 1) ?? null;
}

/** The nodes of the next row the hero can walk to. */
export function nextNodes(run: Pick<RunState, "map" | "path" | "stage">): MapNode[] {
  const here = currentNode(run);
  if (!here || !run.map) return [];
  const row = run.map.rows[run.stage];
  if (!row) return [];
  return here.next.flatMap((lane) => {
    const node = nodeAt(run.map as ActMap, run.stage + 1, lane);
    return node ? [node] : [];
  });
}

/** The lane chosen for the next row, if any. */
export function chosenNext(run: Pick<RunState, "map" | "path" | "stage">): number | undefined {
  return run.path?.[run.stage];
}

/** Whether the road ahead forks into different kinds of nodes (three plain fights do not). */
export function forkAhead(run: Pick<RunState, "map" | "path" | "stage">): boolean {
  return new Set(nextNodes(run).map((n) => n.kind)).size > 1;
}

/** Whether the next row asks for a choice: a fork ahead and nothing chosen yet. */
export function pathOpen(run: Pick<RunState, "map" | "path" | "stage">): boolean {
  return forkAhead(run) && chosenNext(run) === undefined;
}

/**
 * The node ahead without a choice: a plain fight first (straight on if it can), then any fight,
 * then the first node.
 */
export function defaultNext(run: Pick<RunState, "map" | "path" | "stage">): MapNode | undefined {
  const ahead = nextNodes(run);
  const lane = currentNode(run)?.lane;
  const plain = ahead.filter((n) => n.kind === "fight");
  return (
    plain.find((n) => n.lane === lane) ?? plain[0] ?? ahead.find((n) => fights(n.kind)) ?? ahead[0]
  );
}

/** The next Waymark on or after a stage (the boss row at the latest). */
export function nextWaymark(act: ActData, stage: number): number {
  return waymarkStages(act).find((w) => w >= stage) ?? act.stages;
}
