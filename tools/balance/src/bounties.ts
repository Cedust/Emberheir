import { type ActRunReport } from "./act";

/**
 * Bounty check (bounties-v2-plan.md B5): per run, how many trips took a bounty, how many were
 * done (by kind), and what Eldrin's Caches add to the Ember Coal and Home Runes of the run.
 */

/** Short names of the bounty kinds for the table. */
const KINDS: Readonly<Record<string, string>> = {
  "elite-hunt": "elite",
  "elite-hunt-2": "elite",
  "trail-hunt": "trail",
  "thief-chase": "thief",
  "dry-throat": "dry",
};

const pct = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(0)} %` : "-";

export function bountyRows(reports: readonly ActRunReport[], generations: number) {
  const rows = [];
  for (let g = 1; g <= generations; g++) {
    const run = reports.filter((r) => r.generation === g && r.act <= g && r.bounties);
    if (!run.length) continue;
    const taken: Record<string, number> = {};
    const done: Record<string, number> = {};
    let caches = 0;
    let coal = 0;
    let homeRunes = 0;
    let incomeCoal = 0;
    let droppedHome = 0;
    for (const r of run) {
      const b = r.bounties;
      if (!b) continue;
      for (const [id, n] of Object.entries(b.taken)) {
        const k = KINDS[id] ?? id;
        taken[k] = (taken[k] ?? 0) + n;
      }
      for (const [id, n] of Object.entries(b.done)) {
        const k = KINDS[id] ?? id;
        done[k] = (done[k] ?? 0) + n;
      }
      caches += b.caches;
      coal += b.emberCoal;
      homeRunes += b.homeRunes;
      incomeCoal += r.income?.emberCoal ?? 0;
      droppedHome += r.homeRunes ?? 0;
    }
    const all = (rec: Record<string, number>) => Object.values(rec).reduce((a, b) => a + b, 0);
    const plays = new Set(run.map((r) => r.act)).size
      ? run.length / new Set(run.map((r) => r.act)).size
      : 1;
    const kind = (k: string) => `${done[k] ?? 0}/${taken[k] ?? 0}`;
    rows.push({
      run: g,
      "taken per play": (all(taken) / plays).toFixed(1),
      done: pct(all(done), all(taken)),
      elite: kind("elite"),
      trail: kind("trail"),
      thief: kind("thief"),
      dry: kind("dry"),
      "cache coal": pct(coal, incomeCoal),
      "home runes": `${homeRunes} of ${homeRunes + droppedHome}`,
      caches,
    });
  }
  return rows;
}
