import type { AilmentType, CombatEvent, DamageType, Side } from "@emberheir/sim";

export interface LogLine {
  readonly time: string;
  readonly side: Side | null;
  readonly text: string;
  /** Damage type or ailment for coloring, if any. */
  readonly tone: DamageType | AilmentType | "heal" | "end" | "skill" | null;
}

const AILMENT_NAMES: Record<AilmentType, string> = {
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
};

export function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}

/** Turns a combat event into one readable log line. */
export function formatEvent(event: CombatEvent, names: Record<Side, string>): LogLine {
  const time = formatTime(event.t);
  switch (event.type) {
    case "skill":
      return {
        time,
        side: event.side,
        tone: "skill",
        text: `${names[event.side]} uses ${event.skill} (−${event.heatCost} Heat)`,
      };
    case "hit": {
      const target = names[event.side === "hero" ? "enemy" : "hero"];
      const extras = [event.crit ? "Crit!" : "", event.blocked ? "Blocked" : ""].filter(Boolean);
      return {
        time,
        side: event.side,
        tone: event.damageType,
        text: `${event.source} hits ${target} for ${event.damage}${extras.length ? ` (${extras.join(", ")})` : ""}`,
      };
    }
    case "evade":
      return {
        time,
        side: event.side,
        tone: null,
        text: `${names[event.side]} evades ${event.source}`,
      };
    case "ailment":
      return {
        time,
        side: event.side,
        tone: event.ailment,
        text: `${names[event.side]} suffers ${AILMENT_NAMES[event.ailment]}`,
      };
    case "ailmentExpired":
      return {
        time,
        side: event.side,
        tone: null,
        text: `${AILMENT_NAMES[event.ailment]} on ${names[event.side]} ends`,
      };
    case "dot":
      return {
        time,
        side: event.side,
        tone: event.ailment,
        text: `${AILMENT_NAMES[event.ailment]} deals ${event.damage} to ${names[event.side]}`,
      };
    case "heal":
      return {
        time,
        side: event.side,
        tone: "heal",
        text: `${names[event.side]} heals +${event.amount}`,
      };
    case "death":
      return { time, side: event.side, tone: "end", text: `${names[event.side]} falls` };
    case "fightEnd":
      return {
        time,
        side: null,
        tone: "end",
        text: event.winner ? `${names[event.winner]} wins` : "Time is up: draw",
      };
  }
}
