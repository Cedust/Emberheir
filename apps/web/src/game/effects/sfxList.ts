import type { CombatEvent } from "@emberheir/sim";
import type { EffectEntry, Kit, Player } from "./effectList";

/**
 * `?sfx`: every battle sound (game/battle/battleSfx.ts) with the arena moment that plays it, in
 * the same gallery as the effects. A developer page for Timo: German explanations, game terms in
 * English. The sounds come from the real arena, so what plays here is what plays in a fight.
 */
export const SFX_GROUPS = [
  { id: "swings", name: "Schwung" },
  { id: "hits", name: "Treffer" },
  { id: "defense", name: "Verteidigung" },
  { id: "moments", name: "Momente" },
] as const;

type Hit = Extract<CombatEvent, { type: "hit" }>;

const hit = (o: Partial<Omit<Hit, "type" | "t">> = {}): CombatEvent => ({
  t: 0,
  type: "hit",
  side: "hero",
  source: "Strike",
  damage: 248,
  damageType: "physical",
  crit: false,
  blocked: false,
  ...o,
});

const kit = (classId: Kit["classId"], weapon: string): Kit => ({ classId, weapon });

/** One blow: the swing when the weapon moves, the impact when it lands. */
const blow =
  (o: Partial<Omit<Hit, "type" | "t">> = {}) =>
  (p: Player) =>
    p.events([hit(o)]);

const swing = (
  id: string,
  name: string,
  weapon: Kit,
  sound: string,
  o: Partial<Omit<Hit, "type" | "t">> = {},
): EffectEntry => ({
  id,
  group: "swings",
  name,
  verdict: "new",
  kit: weapon,
  what: `Der Held greift mit ${name} an.`,
  see: sound,
  play: blow(o),
});

export const SFX: readonly EffectEntry[] = [
  swing(
    "swing-sword",
    "Sword",
    kit("cinderguard", "sword"),
    "Klingen-Schwung (3 Varianten im Wechsel), dann der dumpfe Einschlag.",
  ),
  swing(
    "swing-axe",
    "Axe",
    kit("cinderguard", "axe"),
    "Schwerer Schwung (2 Varianten), dann der Einschlag.",
  ),
  swing(
    "swing-mace",
    "Mace",
    kit("cinderguard", "mace"),
    "Schwerer Schwung wie bei der Axe, dann der Einschlag.",
  ),
  swing(
    "swing-dagger",
    "Dagger",
    kit("ashstrider", "dagger"),
    "Klingen-Schwung wie beim Sword, dann der Einschlag.",
  ),
  swing(
    "shot-bow",
    "Bow",
    kit("ashstrider", "bow"),
    "Sehne und vorbeizischender Pfeil (3 Varianten), dann der Einschlag.",
  ),
  swing(
    "shot-crossbow",
    "Crossbow",
    kit("ashstrider", "crossbow"),
    "Derselbe Schuss wie beim Bow, dann der Einschlag.",
  ),
  swing(
    "cast-wand",
    "Wand",
    kit("emberseer", "wand"),
    "Ein aufsteigendes Zauber-Schimmern (Web Audio), dann das Knistern von Lightning.",
    { damageType: "lightning" },
  ),
  swing(
    "cast-staff",
    "Staff",
    kit("emberseer", "staff"),
    "Das Zauber-Schimmern, dann der tiefe Sog von Void.",
    { damageType: "void" },
  ),
  {
    id: "enemy-melee",
    group: "swings",
    name: "Gegner schlägt zu",
    verdict: "new",
    what: "Ein Gegner greift im Nahkampf an.",
    see: "Schwerer Schwung, leiser und tiefer als beim Helden, dann ein tieferer Einschlag.",
    play: blow({ side: "enemy" }),
  },
  {
    id: "enemy-spell",
    group: "swings",
    name: "Gegner zaubert",
    verdict: "new",
    what: "Ein Fernkampf-Gegner wirft einen Zauber.",
    see: "Das Zauber-Schimmern, tiefer, dann der Flammen-Stoß von Fire.",
    enemy: (e) => ({ ...e, ranged: true }),
    play: blow({ side: "enemy", damageType: "fire" }),
  },
  {
    id: "hit-fire",
    group: "hits",
    name: "Fire-Treffer",
    verdict: "new",
    what: "Ein Treffer mit Fire-Schaden.",
    see: "Ein Flammen-Stoß: tiefes Rauschen, das abfällt (Web Audio).",
    play: blow({ damageType: "fire" }),
  },
  {
    id: "hit-cold",
    group: "hits",
    name: "Cold-Treffer",
    verdict: "new",
    what: "Ein Treffer mit Cold-Schaden.",
    see: "Eis knackt: ein heller Knacks und zwei gläserne Pings (Web Audio).",
    play: blow({ damageType: "cold" }),
  },
  {
    id: "hit-lightning",
    group: "hits",
    name: "Lightning-Treffer",
    verdict: "new",
    what: "Ein Treffer mit Lightning-Schaden.",
    see: "Knistern: vier kurze helle Stöße und ein Summen (Web Audio).",
    play: blow({ damageType: "lightning" }),
  },
  {
    id: "hit-void",
    group: "hits",
    name: "Void-Treffer",
    verdict: "new",
    what: "Ein Treffer mit Void-Schaden.",
    see: "Ein Sog ins Nichts: ein tief rutschender Ton und ein hohler Hauch (Web Audio).",
    play: blow({ damageType: "void" }),
  },
  {
    id: "crit",
    group: "hits",
    name: "Crit",
    verdict: "new",
    what: "Ein kritischer Treffer.",
    see: "Der Einschlag und darüber ein Krachen wie brechende Rüstung.",
    play: blow({ crit: true, damage: 620 }),
  },
  {
    id: "crit-element",
    group: "hits",
    name: "Crit mit Element",
    verdict: "new",
    what: "Ein kritischer Treffer mit Cold-Schaden.",
    see: "Einschlag, Eis-Knacken und das Krachen, alle drei zusammen.",
    play: blow({ crit: true, damage: 620, damageType: "cold" }),
  },
  {
    id: "glancing",
    group: "hits",
    name: "Glancing Blow",
    verdict: "new",
    what: "Der Treffer landet nicht sauber.",
    see: "Derselbe Einschlag, aber deutlich leiser.",
    play: blow({ glancing: true, damage: 90 }),
  },
  {
    id: "deflected",
    group: "hits",
    name: "Deflect",
    verdict: "new",
    what: "Der Held lenkt einen Zauber mit Evasion ab (halber Schaden).",
    see: "Das Eis-Knacken des Zaubers, leiser.",
    enemy: (e) => ({ ...e, ranged: true }),
    play: blow({ side: "enemy", damageType: "cold", deflected: true, damage: 110 }),
  },
  {
    id: "block",
    group: "defense",
    name: "Block",
    verdict: "new",
    what: "Der Held fängt einen Schlag mit dem Shield ab.",
    see: "Stahl auf Stahl statt des Einschlags.",
    play: blow({ side: "enemy", blocked: true, damage: 140 }),
  },
  {
    id: "parry",
    group: "defense",
    name: "Parry",
    verdict: "new",
    what: "Der Held pariert einen Schlag in einen Glancing Blow.",
    see: "Stahl auf Stahl wie beim Block.",
    play: blow({ side: "enemy", glancing: true, parried: true, damage: 120 }),
  },
  {
    id: "evade",
    group: "defense",
    name: "Evade",
    verdict: "new",
    what: "Der Held weicht einem Angriff aus.",
    see: "Ein kurzes Whoosh am Ohr vorbei (Web Audio).",
    play: (p) => p.events([{ t: 0, type: "evade", side: "hero", source: "Strike" }]),
  },
  {
    id: "telegraph",
    group: "moments",
    name: "Heavy Attack",
    verdict: "new",
    what: "Ein Gegner holt zu einem Heavy Attack aus und schlägt nach 1,4 s zu.",
    see: "Beim Ausholen ein rückwärts laufender Gong als Warnung, dann ein tiefer, lauter Einschlag.",
    play: (p) => {
      const telegraph = { skill: "Heavy Slam", skillId: "heavy-slam", remaining: 1.4, windup: 1.4 };
      p.state((s) => ({ ...s, enemy: { ...s.enemy, telegraph } }));
      p.events([{ t: 0, type: "telegraph", side: "enemy", skill: "Heavy Slam", windup: 1.4 }]);
      p.after(1.4, () => {
        p.state(null);
        p.events([
          { t: 0, type: "skill", side: "enemy", skill: "Heavy Slam", heatCost: 0 },
          hit({ side: "enemy", source: "Heavy Slam", damage: 1320 }),
        ]);
      });
    },
  },
  {
    id: "death-enemy",
    group: "moments",
    name: "Gegner fällt",
    verdict: "new",
    what: "Der Gegner stirbt.",
    see: "Ein schwerer Aufprall mit Kettenrasseln (2 Varianten).",
    play: (p) => {
      p.events([{ t: 0, type: "death", side: "enemy" }]);
      p.reset(2.6);
    },
  },
  {
    id: "death-hero",
    group: "moments",
    name: "Held fällt",
    verdict: "new",
    what: "Der Held stirbt.",
    see: "Ein tiefer, gedämpfter Gong.",
    play: (p) => {
      p.events([{ t: 0, type: "death", side: "hero" }]);
      p.reset(2.6);
    },
  },
  {
    id: "victory",
    group: "moments",
    name: "Sieg",
    verdict: "new",
    what: "Der Kampf ist gewonnen.",
    see: "Ein kurzes Pizzicato-Motiv, eine halbe Sekunde nach dem letzten Treffer.",
    play: (p) => p.events([{ t: 0, type: "fightEnd", winner: "hero" }]),
  },
  {
    id: "defeat",
    group: "moments",
    name: "Niederlage",
    verdict: "new",
    what: "Der Kampf ist verloren.",
    see: "Ein tiefes, gedämpftes Pizzicato-Motiv.",
    play: (p) => p.events([{ t: 0, type: "fightEnd", winner: "enemy" }]),
  },
];
