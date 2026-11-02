import { ACTS } from "@emberheir/content";
import type {
  CombatEvent,
  FighterSnapshot,
  FightSnapshot,
  PayoffKind,
  PerkId,
} from "@emberheir/sim";
import type { EnemyLook } from "../battle/enemyArt";
import type { HeroLook } from "../battle/heroArt";

/**
 * `?effects`: every arena effect of a fight with a plain explanation, after the effect cleanup
 * Timo picked in this gallery (design/notes/performance-kampfeffekte-v1.md, section 2): removed
 * effects are gone, changed ones say how they looked before. A developer page for Timo, so the
 * explanations are German; game terms stay English. Visual only, no fight runs.
 */

/** Since the effect cleanup (Timo 2026-11-01): kept as it was, or changed by his pick. */
export type Verdict = "keep" | "change";

/** What an effect can do to the gallery's arena while it plays. */
export interface Player {
  /** Hands fight events to the arena, as a fight would. */
  events(list: readonly CombatEvent[]): void;
  /** Runs later (seconds); cleared when another effect is picked. */
  after(seconds: number, run: () => void): void;
  /** Changes the arena's current state (ailments, Barrier, trait, telegraph); null = back to calm. */
  state(change: ((s: FightSnapshot) => FightSnapshot) | null): void;
  /** Builds the arena again (after a death, so the fighter stands up). */
  reset(afterSeconds: number): void;
}

export interface Kit {
  readonly classId: "cinderguard" | "ashstrider" | "emberseer";
  readonly weapon: string;
}

export interface EffectEntry {
  readonly id: string;
  readonly group: GroupId;
  readonly name: string;
  readonly verdict: Verdict;
  /** What happens in the game, in simple words. */
  readonly what: string;
  /** What you see now. */
  readonly see: string;
  /** What it looked like before the cleanup, for a changed effect. */
  readonly before?: string;
  /** The hero this effect needs (a class trait, a ranged weapon). */
  readonly kit?: Kit;
  readonly hero?: (h: HeroLook) => HeroLook;
  readonly enemy?: (e: EnemyLook) => EnemyLook;
  /** The arena between fights: only the hero stands there. */
  readonly noEnemy?: boolean;
  /** Played on pick and, with Repeat on, again every few seconds. */
  readonly play?: (p: Player) => void;
  /** A lasting state: held while the effect is picked. */
  readonly state?: (s: FightSnapshot) => FightSnapshot;
}

export const GROUPS = [
  { id: "hits", name: "Treffer" },
  { id: "skills", name: "Skills" },
  { id: "defense", name: "Verteidigung" },
  { id: "perks", name: "Perks" },
  { id: "payoffs", name: "Payoffs" },
  { id: "states", name: "Zustände" },
  { id: "hero", name: "Am Helden" },
  { id: "enemy", name: "Gegner" },
  { id: "weather", name: "Wetter" },
  { id: "numbers", name: "Zahlen" },
] as const;
export type GroupId = (typeof GROUPS)[number]["id"];

export const VERDICT_LABEL: Record<Verdict, string> = {
  keep: "Wie bisher",
  change: "Geändert",
};

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

const cast = (skill: string, heatCost: number, damageType: Hit["damageType"]): CombatEvent[] => [
  { t: 0, type: "skill", side: "hero", skill, heatCost },
  hit({ source: skill, damageType, damage: 612 }),
];

const perk = (id: PerkId): CombatEvent => ({ t: 0, type: "perk", side: "hero", perk: id });
const payoff = (id: PayoffKind): CombatEvent => ({
  t: 0,
  type: "payoff",
  side: "hero",
  payoff: id,
  damage: 1840,
});

function side(
  s: FightSnapshot,
  which: "hero" | "enemy",
  change: Partial<FighterSnapshot>,
): FightSnapshot {
  return { ...s, [which]: { ...s[which], ...change } };
}

const onFoe = (type: FighterSnapshot["ailments"][number]["type"]) => (s: FightSnapshot) =>
  side(s, "enemy", { ailments: [{ type, remaining: 5 }] });

/** Marks effects that came into the game after the effect review (2026-10-20). */
const NEW = " · neu";

const HARVESTER: EnemyLook = {
  id: "ashen-harvester",
  archetype: "boss",
  boss: true,
  elite: false,
  act: 7,
};

const BOW: Kit = { classId: "ashstrider", weapon: "bow" };
const CROSSBOW: Kit = { classId: "ashstrider", weapon: "crossbow" };
const WAND: Kit = { classId: "emberseer", weapon: "wand" };
const STAFF: Kit = { classId: "emberseer", weapon: "staff" };

/** Heavy Attack: the wind-up ring pulses, then the blow lands. */
function heavyAttack(p: Player, capped: boolean): void {
  const telegraph = { skill: "Heavy Slam", skillId: "heavy-slam", remaining: 1.4, windup: 1.4 };
  p.state((s) => side(s, "enemy", { telegraph }));
  p.events([{ t: 0, type: "telegraph", side: "enemy", skill: "Heavy Slam", windup: 1.4 }]);
  p.after(1.4, () => {
    p.state(null);
    p.events([
      { t: 0, type: "skill", side: "enemy", skill: "Heavy Slam", heatCost: 0 },
      hit({ side: "enemy", source: "Heavy Slam", damage: 1320, ...(capped ? { capped } : {}) }),
    ]);
  });
}

const ailment = (
  name: string,
  type: FighterSnapshot["ailments"][number]["type"],
  what: string,
  see: string,
): EffectEntry => ({
  id: `ailment-${type}`,
  group: "states",
  name,
  verdict: "change",
  what,
  see: `${see} Beim Auftragen ein Schwall (6), dann 4 Partikel pro Sekunde, solange es wirkt. Ein Schadens-Tick zeigt nur seine Zahl.`,
  before: `${see} Beim Auftragen ein Schwall (14), bei jedem Schadens-Tick noch einmal 3. Dazu 12 Partikel pro Sekunde, solange es wirkt.`,
  state: onFoe(type),
  play: (p) => {
    p.events([{ t: 0, type: "ailment", side: "enemy", ailment: type }]);
    p.after(1, () => p.events([{ t: 0, type: "dot", side: "enemy", ailment: type, damage: 86 }]));
    p.after(2, () => p.events([{ t: 0, type: "dot", side: "enemy", ailment: type, damage: 86 }]));
  },
});

const rarePerk = (id: PerkId, name: string, what: string, shake = false): EffectEntry => ({
  id: `perk-${id}`,
  group: "perks",
  name,
  verdict: "change",
  what,
  see: shake
    ? "Ein Ring in der Farbe des Perks, sein Name schwebt hoch, die Kamera wackelt (selten und wichtig)."
    : "Ein Ring in der Farbe des Perks und sein Name schwebt hoch.",
  before:
    "Ein eigenes Aufblitzen (Ring, Stern, Funken oder Wind) und der Name des Perks schwebt hoch.",
  play: (p) => p.events([perk(id)]),
});

/** A painted enemy of each act stands in the weather of its act. */
const ACT_ENEMY: Record<number, string> = {
  1: "ashen-brute",
  2: "barkhide",
  3: "magma-brute",
  4: "frost-wolf",
  5: "thunder-brute",
  6: "hollow-brute",
  7: "ash-revenant",
};

const weather = (act: number, see: string, before?: string): EffectEntry => {
  const name = act === 8 ? "The Last Ember" : (ACTS.find((a) => a.number === act)?.name ?? "");
  return {
    id: `weather-${act}`,
    group: "weather",
    name: act === 8 ? `Finale: ${name}` : `Act ${act}: ${name}`,
    verdict: before ? "change" : "keep",
    what: "Die Luft des Acts: läuft im ganzen Kampf und in der Intermission im Hintergrund.",
    see,
    ...(before ? { before } : {}),
    enemy: () => ({
      archetype: "brute",
      boss: false,
      elite: false,
      act,
      ...(ACT_ENEMY[act] ? { id: ACT_ENEMY[act] } : {}),
    }),
  };
};

export const EFFECTS: readonly EffectEntry[] = [
  // ---------------------------------------------------------------- Treffer
  {
    id: "slash",
    group: "hits",
    name: "Nahkampf-Treffer (Slash)",
    verdict: "keep",
    what: "Der Held trifft mit Schwert, Axt, Keule oder Dolch.",
    see: "Eine Sichel zieht über den Gegner, Funken fliegen weg, der Gegner zuckt zurück, die Zahl steigt auf.",
    play: (p) => p.events([hit()]),
  },
  {
    id: "arrow",
    group: "hits",
    name: "Pfeil (Bow, Crossbow)",
    verdict: "keep",
    what: "Fernkampfwaffen schießen ihren Default Attack über die Arena.",
    see: "Ein Pfeil fliegt im Bogen und schlägt mit Funken ein.",
    kit: BOW,
    play: (p) => p.events([hit()]),
  },
  {
    id: "orb",
    group: "hits",
    kit: WAND,
    name: "Kugel-Geschoss (Orb)",
    verdict: "change",
    what: "Zauber wie Ice Lance, Fireball oder Void Orb fliegen als Kugel zum Ziel.",
    see: "Eine leuchtende Kugel mit einem gestreckten Schweif (ein Bild statt Partikel).",
    before: "Eine leuchtende Kugel mit Schweif aus Partikeln (2 pro Frame).",
    play: (p) => p.events([hit({ source: "Ice Lance", damageType: "cold", damage: 540 })]),
  },
  {
    id: "bolt",
    group: "hits",
    kit: WAND,
    name: "Blitz (Bolt)",
    verdict: "keep",
    what: "Blitz-Zauber wie Chain Lightning springen sofort zum Ziel.",
    see: "Ein Zickzack-Blitz von der Hand zum Gegner.",
    play: (p) =>
      p.events([hit({ source: "Chain Lightning", damageType: "lightning", damage: 580 })]),
  },
  {
    id: "fall",
    group: "hits",
    kit: STAFF,
    name: "Meteor (Fall)",
    verdict: "keep",
    what: "Meteor, Eruption, Avalanche und Ashfall fallen von oben auf das Ziel.",
    see: "Eine Kugel stürzt schräg von oben herab.",
    play: (p) => p.events([hit({ source: "Meteor", damageType: "fire", damage: 920 })]),
  },
  {
    id: "nova",
    group: "hits",
    kit: STAFF,
    name: "Bodenring (Nova)",
    verdict: "keep",
    what: "Frost Nova, Toxic Burst, Immolate und ähnliche treffen direkt am Ziel.",
    see: "Ein großer Ring breitet sich am Boden unter dem Gegner aus.",
    play: (p) => p.events([hit({ source: "Frost Nova", damageType: "cold", damage: 700 })]),
  },
  {
    id: "sparks",
    group: "hits",
    name: "Einschlag-Funken",
    verdict: "change",
    what: "Jeder Treffer, egal welcher Art.",
    see: "8 Funken pro Treffer, bei Crit oder Heavy Attack 18. Hier: erst normal, dann Crit.",
    before: "14 Funken pro Treffer, bei Crit oder Heavy Attack 34. Hier: erst normal, dann Crit.",
    play: (p) => {
      p.events([hit()]);
      p.after(1.1, () => p.events([hit({ crit: true, damage: 612 })]));
    },
  },
  {
    id: "crit",
    group: "hits",
    name: "Crit (kritischer Treffer)",
    verdict: "change",
    what: "Ein Treffer macht 150 % Schaden.",
    see: "Große, schräge Zahl in Orange mit „!“, kurzes Bild-Anhalten (Hit-Stop), spürbares Wackeln.",
    before: "Weißer Ring, Hit-Stop, Wackeln, große Zahl in hellerer Schadensfarbe mit „!“.",
    play: (p) => p.events([hit({ crit: true, damage: 612 })]),
  },
  {
    id: "mini-shake",
    group: "hits",
    name: "Mini-Wackeln bei normalen Treffern",
    verdict: "keep",
    what: "Bei jedem normalen Treffer wackelt die Kamera ein kleines bisschen.",
    see: "Praktisch nichts: das Wackeln bleibt unter einem Pixel. Hier zum Vergleich: normal, dann Crit.",
    play: (p) => {
      p.events([hit()]);
      p.after(1.1, () => p.events([hit({ crit: true, damage: 612 })]));
    },
  },
  {
    id: "knock",
    group: "hits",
    name: "Aufblitzen und Rückstoß",
    verdict: "keep",
    what: "Wer getroffen wird, zuckt.",
    see: "Der Getroffene blitzt kurz hell auf und wird ein Stück zurückgestoßen.",
    play: (p) => p.events([hit({ side: "enemy", damage: 180 })]),
  },
  {
    id: "glancing",
    group: "hits",
    name: "Glancing Blow",
    verdict: "keep",
    what: "Ein Angriff trifft nicht sauber (zu wenig Precision): er rutscht ab und macht weniger Schaden.",
    see: "Graue Funken springen nach oben, dazu dunkle Brocken, eine kleine graue Zahl.",
    play: (p) => p.events([hit({ glancing: true, damage: 96 })]),
  },
  {
    id: "parry",
    group: "hits",
    name: "Parry",
    verdict: "keep",
    what: "Der Held fängt einen Angriff mit der Waffe ab: der Treffer wird zum Glancing Blow.",
    see: "Ein heller Bogen am Helden, Stahlfunken, „⚔“ an der Zahl.",
    play: (p) => p.events([hit({ side: "enemy", glancing: true, parried: true, damage: 120 })]),
  },
  {
    id: "block",
    group: "hits",
    name: "Block",
    verdict: "change",
    what: "Ein Shield hält einen Teil des Treffers ab.",
    see: "„⛨“ an der Zahl. Kein Ring mehr.",
    before: "Ein kleiner Ring am Schild, „⛨“ an der Zahl.",
    play: (p) => p.events([hit({ side: "enemy", blocked: true, damage: 140 })]),
  },
  {
    id: "deflect",
    group: "hits",
    name: "Deflect",
    verdict: "change",
    what: "Evasion lässt den Helden Zauber ablenken: sie machen nur halben Schaden.",
    see: "Der Held weicht halb aus, „↺“ an der Zahl. Kein Ring mehr.",
    before: "Der Held weicht halb aus, ein blasser Ring, „↺“ an der Zahl.",
    play: (p) =>
      p.events([
        hit({
          side: "enemy",
          source: "Cinder Spit",
          damageType: "fire",
          deflected: true,
          damage: 210,
        }),
      ]),
  },
  {
    id: "mighty",
    group: "hits",
    name: "Mighty Hit",
    verdict: "change",
    what: "Weapon Mastery: ein sauberer Treffer mit besonders hohem Waffenschaden.",
    see: "Große, schräge Zahl in dunklem Orangerot mit „⚒“, Hit-Stop und Wackeln. Kein Ring mehr. Ein Mighty Crit hat „!“ und einen Verlauf von Orange nach dunklem Orangerot. Hier: erst Mighty Hit, dann Mighty Crit.",
    before: "Ein breiter Bodenring und ein weißer Ring, „⚒“ an der kleinen Zahl.",
    play: (p) => {
      p.events([hit({ mighty: true, damage: 480 })]);
      p.after(1.2, () => p.events([hit({ mighty: true, crit: true, damage: 720 })]));
    },
  },
  {
    id: "capped",
    group: "hits",
    name: "Heavy Attack gedeckelt („Held“)",
    verdict: "change",
    what: "Ein Heavy Attack des Gegners kann höchstens einen Teil deines Lebens nehmen. Der Rest wird zurückgehalten.",
    see: "8 Glutfunken am Helden und das Wort „Held“. Kein Ring mehr.",
    before: "Ein Glutschild-Ring und ein weißer Ring am Helden, 8 Funken und das Wort „Held“.",
    play: (p) => heavyAttack(p, true),
  },
  {
    id: "flurry",
    group: "hits",
    name: "Mehrfach-Treffer (Flurry)",
    verdict: "keep",
    what: "Skills mit mehreren Treffern.",
    see: "Die Treffer landen kurz nacheinander statt alle auf einmal.",
    play: (p) =>
      p.events([
        { t: 0, type: "skill", side: "hero", skill: "Flurry", heatCost: 25 },
        hit({ source: "Flurry", damage: 160 }),
        hit({ source: "Flurry", damage: 172 }),
        hit({ source: "Flurry", damage: 155 }),
        hit({ source: "Flurry", damage: 168 }),
      ]),
  },

  // ---------------------------------------------------------------- Skills
  {
    id: "twin",
    group: "skills",
    name: "Twin Cast",
    verdict: "change",
    what: "Spellweaver-Mastery: ein Zauber wird sofort ein zweites Mal gewirkt.",
    see: "Ein violetter Ring und der Name „Twin Cast“.",
    before: "Zwei violette Ringe nacheinander und der Name „Twin Cast“.",
    kit: WAND,
    play: (p) =>
      p.events([
        { t: 0, type: "skill", side: "hero", skill: "Ice Bolt", heatCost: 20, via: "twin" },
        hit({ source: "Ice Bolt", damageType: "cold", damage: 420 }),
      ]),
  },
  {
    id: "crushing-blow",
    group: "skills",
    name: "Signature: Crushing Blow",
    verdict: "change",
    what: "Die Innate der Mace: ein harter Schlag, der Rüstung bricht (Sunder).",
    see: "10 Rüstungsplatten fliegen weg, Wackeln.",
    before: "22 Rüstungsplatten fliegen weg, ein Ring, Wackeln.",
    kit: { classId: "cinderguard", weapon: "mace" },
    play: (p) => p.events([hit({ source: "Crushing Blow", damage: 720 })]),
  },
  {
    id: "earthsplitter",
    group: "skills",
    name: "Signature: Earthsplitter, Skull Crack",
    verdict: "change",
    what: "Große Schläge der Masteries und Innates: Earthsplitter spaltet den Boden, Skull Crack betäubt.",
    see: "Earthsplitter bleibt am Boden: Bodenring und Erdbrocken. Skull Crack bleibt am Kopf: ein Ring dort, nichts am Boden. Beide wackeln und halten kurz an. Hier: erst Earthsplitter, dann Skull Crack.",
    before:
      "Bodenring, Erdbrocken, kräftiges Wackeln und kurzes Anhalten. Hier: erst Earthsplitter, dann Skull Crack.",
    kit: { classId: "cinderguard", weapon: "axe" },
    play: (p) => {
      p.events([hit({ source: "Earthsplitter", damage: 1100 })]);
      p.after(1.4, () => p.events([hit({ source: "Skull Crack", damage: 860 })]));
    },
  },
  {
    id: "heavy-bolt",
    group: "skills",
    name: "Signature: Heavy Bolt",
    verdict: "keep",
    what: "Die Innate der Crossbow: ein schwerer Bolzen.",
    see: "Der Bolzen schlägt durch, Funken schießen hinten heraus, Ring, Wackeln.",
    kit: CROSSBOW,
    play: (p) => p.events([hit({ source: "Heavy Bolt", damage: 980 })]),
  },
  {
    id: "searing-blow",
    group: "skills",
    name: `Signature: Searing Blow${NEW}`,
    verdict: "keep",
    what: "Element-Angriff mit der Waffe (Fire): ein Schlag, der immer Burn auflegt.",
    see: "Ein Vorhang aus Glut steigt vom Gegner auf (26 Funken).",
    play: (p) => p.events(cast("Searing Blow", 40, "fire")),
  },
  {
    id: "storm-strike",
    group: "skills",
    name: `Signature: Storm Strike${NEW}`,
    verdict: "keep",
    what: "Element-Angriff mit der Waffe (Lightning): drei schnelle Schläge, die Shock auflegen können.",
    see: "Bei jedem der drei Schläge fährt ein kurzer Blitz vom Himmel ins Ziel.",
    play: (p) =>
      p.events([
        { t: 0, type: "skill", side: "hero", skill: "Storm Strike", heatCost: 45 },
        hit({ source: "Storm Strike", damageType: "lightning", damage: 210 }),
        hit({ source: "Storm Strike", damageType: "lightning", damage: 220 }),
        hit({ source: "Storm Strike", damageType: "lightning", damage: 205 }),
      ]),
  },
  {
    id: "frost-strike",
    group: "skills",
    name: `Signature: Frost Strike${NEW}`,
    verdict: "change",
    what: "Element-Angriff mit der Waffe (Cold): ein schwerer Schlag, der immer Chill auflegt.",
    see: "Eissplitter springen weg (20), kurzes Anhalten. Kein Ring am Boden.",
    before: "Eissplitter springen weg (20), ein kalter Ring am Boden, kurzes Anhalten.",
    play: (p) => p.events(cast("Frost Strike", 50, "cold")),
  },

  // ---------------------------------------------------------------- Verteidigung
  {
    id: "heal",
    group: "defense",
    name: "Heilung",
    verdict: "keep",
    what: "Der Held heilt sich (Flask, Heal-Skill, Second Breath).",
    see: "18 grüne Funken steigen auf, dazu die grüne Zahl.",
    play: (p) => p.events([{ t: 0, type: "heal", side: "hero", amount: 820 }]),
  },
  {
    id: "lifesteal",
    group: "defense",
    name: "Lifesteal-Heilungen",
    verdict: "keep",
    what: "Lifesteal heilt bei jedem eigenen Treffer ein wenig.",
    see: "Jede kleine Heilung macht heute dieselben 18 grünen Funken und eine eigene Zahl. Bei schnellen Waffen grünt es dauernd.",
    play: (p) => {
      for (let i = 0; i < 4; i++)
        p.after(i * 0.35, () =>
          p.events([
            hit({ damage: 210 + i * 7 }),
            { t: 0, type: "heal", side: "hero", amount: 14 + i },
          ]),
        );
    },
  },
  {
    id: "barrier-gain",
    group: "defense",
    kit: WAND,
    name: "Barrier-Gewinn",
    verdict: "keep",
    what: "Der Held bekommt Barrier (eine Schicht vor dem Life, z. B. durch INT).",
    see: "Ein heller Ring und „+… Barrier“.",
    play: (p) => p.events([{ t: 0, type: "barrier", side: "hero", amount: 400 }]),
  },
  {
    id: "buff",
    group: "defense",
    name: "Buff",
    verdict: "keep",
    what: "Ein Skill oder Trigger gibt dem Helden kurz einen Bonus (z. B. Attack Speed). Coats geben Bleed- oder Poison-Chance.",
    see: "16 gestreckte goldene Funken schießen hoch, bei Coats rot oder grün. Hier: erst ein Buff, dann ein Coat.",
    play: (p) => {
      p.events([
        {
          t: 0,
          type: "buff",
          side: "hero",
          stat: "attackSpeed",
          amount: 0.2,
          stacks: 1,
          duration: 4,
        },
      ]);
      p.after(1.2, () =>
        p.events([
          {
            t: 0,
            type: "buff",
            side: "hero",
            stat: "bleedChance",
            amount: 0.2,
            stacks: 1,
            duration: 4,
          },
        ]),
      );
    },
  },
  {
    id: "trigger",
    group: "defense",
    name: "Trigger",
    verdict: "change",
    what: "Ein Trigger-Affix feuert (z. B. „bei Treffer: …“, Riposte).",
    see: "Ein Trigger allein zeigt nichts in der Arena (die Boon-Leiste blinkt). Löst er einen Extra-Angriff aus, schwebt sein Name hoch. Hier: erst ein Trigger, dann einer mit Extra-Angriff.",
    before:
      "Ein goldener Ring bei jedem Trigger. Wenn er einen Extra-Angriff auslöst, schwebt sein Name hoch. Hier: erst ein Trigger, dann einer mit Extra-Angriff.",
    play: (p) => {
      p.events([{ t: 0, type: "trigger", side: "hero", name: "Ember Spark" }]);
      p.after(1.2, () =>
        p.events([
          { t: 0, type: "trigger", side: "hero", name: "Riposte" },
          hit({ source: "Riposte", damage: 190 }),
        ]),
      );
    },
  },
  {
    id: "evade",
    group: "defense",
    name: "Evade",
    verdict: "keep",
    what: "Der Held weicht einem Angriff ganz aus (Evasion).",
    see: "Ein Ausweichsprung, Staub am Boden (10 Brocken), „Evade“.",
    play: (p) => p.events([{ t: 0, type: "evade", side: "hero", source: "Strike" }]),
  },
  {
    id: "stun",
    group: "defense",
    name: "Stun",
    verdict: "keep",
    what: "Ein Kämpfer ist betäubt und kann kurz nichts tun.",
    see: "Sterne kreisen über dem Kopf.",
    play: (p) => p.events([{ t: 0, type: "stun", side: "enemy", seconds: 2 }]),
  },

  // ---------------------------------------------------------------- Perks
  rarePerk("titan", "Titan (STR 10)", "Sehr harte Treffer betäuben den Gegner.", true),
  rarePerk("trueShot", "True Shot (DEX 10)", "Jeder n-te Angriff ist ein sicherer Crit."),
  {
    id: "perk-barrierBurst",
    group: "perks",
    kit: WAND,
    name: "Barrier Burst (INT 10) · neu",
    verdict: "change",
    what: "Neu seit dem 20.10. (ersetzt Spellfire): bricht die Barrier des Helden, platzt sie und trifft den Gegner mit 50 % der max Barrier im Element der Waffe.",
    see: "Ein Ring in Perk-Farbe, hellblaue Splitter fallen vom Gegner, der Name schwebt hoch.",
    before: "Hellblaue Splitter fallen vom Gegner, der Name schwebt hoch.",
    play: (p) => p.events([perk("barrierBurst")]),
  },
  rarePerk("quickReflexes", "Quick Reflexes (DEX 4)", "Der erste Angriff des Gegners verfehlt."),
  rarePerk("doubleTime", "Double Time (AGI 10)", "Jeder n-te Angriff schlägt zweimal zu."),
  rarePerk("secondBreath", "Second Breath", "Einmal pro Kampf bei wenig Life: eine große Heilung."),
  rarePerk(
    "undying",
    "Undying",
    "Einmal pro Kampf überlebt der Held einen tödlichen Treffer mit 1 Life.",
    true,
  ),

  // ---------------------------------------------------------------- Payoffs
  {
    id: "overflow",
    group: "payoffs",
    name: "Overflow (Poison)",
    verdict: "keep",
    what: "Zu viele Poison-Stacks: das Gift platzt auf einmal.",
    see: "Ring, 26 grüne Tropfen, Wackeln, Name.",
    play: (p) => p.events([payoff("overflow")]),
  },
  {
    id: "combust",
    group: "payoffs",
    name: "Combust (Burn)",
    verdict: "keep",
    what: "Ein Burn flammt auf einmal auf.",
    see: "Ring, 30 Flammen, Wackeln, Name.",
    play: (p) => p.events([payoff("combust")]),
  },
  {
    id: "collapse",
    group: "payoffs",
    kit: STAFF,
    name: "Collapse (Corruption)",
    verdict: "keep",
    what: "Corruption fällt in sich zusammen und macht großen Schaden.",
    see: "Ein Ring zieht sich zusammen, dann bricht er mit 32 Partikeln und einem Ring auf.",
    play: (p) => p.events([payoff("collapse")]),
  },
  {
    id: "fury-full",
    group: "payoffs",
    name: "Fury voll (Cinderguard)",
    verdict: "keep",
    what: "Class Trait des Cinderguard: Fury ist voll und bricht los.",
    see: "Ein Glutring am Helden und Wackeln.",
    kit: { classId: "cinderguard", weapon: "sword" },
    play: (p) => p.events([payoff("fury")]),
  },
  {
    id: "overcharge-nova",
    group: "payoffs",
    name: "Overcharge Nova (Emberseer)",
    verdict: "keep",
    what: "Class Trait des Emberseer: alle Ladungen voll, eine Nova bricht los.",
    see: "Zwei Ringe, 40 Funken, Wackeln.",
    kit: WAND,
    play: (p) => p.events([payoff("overcharge")]),
  },
  {
    id: "spark",
    group: "payoffs",
    name: "Spellcharge (Spark)",
    verdict: "keep",
    what: "Wand: ein Spark entlädt sich auf den Gegner.",
    see: "Ein Ring und 14 Funken am Gegner.",
    kit: WAND,
    play: (p) => p.events([payoff("spark")]),
  },
  {
    id: "flashpoint",
    group: "payoffs",
    name: "Flashpoint, Critical Mass (Starfall)",
    verdict: "keep",
    what: "Starfall-Pfad der Wand: ein geladener Spark oder gesammelte Crits brechen auf.",
    see: "Ein Riss aus zwei Blitzen, Ring, 44 Funken. Hier: erst Flashpoint, dann Critical Mass.",
    kit: WAND,
    play: (p) => {
      p.events([payoff("flashpoint")]);
      p.after(1.4, () => p.events([payoff("criticalMass")]));
    },
  },
  {
    id: "conduction",
    group: "payoffs",
    name: "Conduction (Storm)",
    verdict: "keep",
    what: "Storm-Pfad der Wand: ein Gegner mit Shock gibt Heat zurück. Passiert oft.",
    see: "Ein kleiner Blitz läuft vom Gegner zurück in die Wand, ohne Namen.",
    kit: WAND,
    play: (p) => p.events([payoff("conduction")]),
  },
  {
    id: "cash-in",
    group: "payoffs",
    name: "Cash In (Burst)",
    verdict: "change",
    what: "Burst-Masteries: ein Skill zündet alle DoTs auf dem Gegner auf einmal.",
    see: "Ein Ring zieht sich zusammen, dann bricht ein weißer Ring mit 24 Funken auf, Wackeln.",
    before: "Drei Ringe ziehen sich zusammen, zwei brechen auf, 44 Funken, Wackeln.",
    play: (p) => p.events([payoff("cashIn")]),
  },

  {
    id: "hunters-mark-crit",
    group: "payoffs",
    name: `Hunter's Mark: Crit${NEW}`,
    verdict: "keep",
    what: "Class Trait des Ashstrider: ein Crit verbraucht die gesammelten Marks und trifft dafür härter.",
    see: "Das Visier über dem Gegner bricht wie ein Stern auf, leichtes Wackeln, Name.",
    kit: BOW,
    state: (s) =>
      side(s, "hero", { trait: { kind: "huntersMark", value: 5, max: 5, damageType: "physical" } }),
    play: (p) => {
      p.state(null);
      p.events([hit({ crit: true, damage: 940 }), payoff("huntersMark")]);
      p.after(1.6, () => p.state(null));
    },
  },

  // ---------------------------------------------------------------- Zustände
  ailment(
    "Burn",
    "burn",
    "Feuer-Ailment: brennt den Gegner über Zeit.",
    "Flammen steigen am Gegner auf.",
  ),
  ailment(
    "Chill",
    "chill",
    "Kälte-Ailment: der Gegner wird langsamer.",
    "Frostflocken rieseln herab.",
  ),
  ailment(
    "Shock",
    "shock",
    "Blitz-Ailment: der Gegner nimmt mehr Schaden.",
    "Kurze gelbe Funken zucken.",
  ),
  ailment("Bleed", "bleed", "Physisches Ailment: blutet über Zeit.", "Rote Tropfen fallen."),
  ailment(
    "Poison",
    "poison",
    "Gift-Ailment: stapelt sich und schadet über Zeit.",
    "Grüne Blasen steigen auf.",
  ),
  ailment(
    "Corruption",
    "corruption",
    "Void-Ailment: schadet über Zeit, kann kollabieren.",
    "Violette Schatten steigen auf.",
  ),
  {
    id: "tint",
    group: "states",
    name: "Ailment-Tönung",
    verdict: "keep",
    what: "Solange ein Ailment wirkt.",
    see: "Der Kämpfer färbt sich leicht in der Farbe seines ersten Ailments (hier: Chill).",
    state: onFoe("chill"),
  },
  {
    id: "sunder",
    group: "states",
    name: "Sunder-Splitter",
    verdict: "keep",
    what: "Sunder: der Gegner hat weniger Armor.",
    see: "Graue Rüstungssplitter fallen, solange Sunder wirkt.",
    state: (s) =>
      side(s, "enemy", {
        curses: [{ id: "sunder", name: "Sunder", dotDamageTaken: 0, armor: 0.3, remaining: 5 }],
      }),
  },
  {
    id: "fury-aura",
    group: "states",
    name: "Fury-Aura (Cinderguard)",
    verdict: "change",
    what: "Class Trait des Cinderguard: Fury sammelt sich im Kampf.",
    see: "Nur Glutfunken steigen vom Helden auf, mehr je voller die Fury (bis 14 pro Sekunde). Keine Ellipse mehr.",
    before:
      "Eine Glut-Ellipse um den Helden, die mit der Fury wächst, dazu bis zu 14 Glutfunken pro Sekunde.",
    kit: { classId: "cinderguard", weapon: "sword" },
    state: (s) =>
      side(s, "hero", { trait: { kind: "fury", value: 80, max: 100, damageType: "physical" } }),
  },
  {
    id: "overcharge-orbs",
    group: "states",
    name: "Overcharge-Kugeln (Emberseer)",
    verdict: "keep",
    what: "Class Trait des Emberseer: Ladungen sammeln sich.",
    see: "Kugeln kreisen um den Helden; volle leuchten, leere sind grau.",
    kit: WAND,
    state: (s) =>
      side(s, "hero", { trait: { kind: "overcharge", value: 2, max: 3, damageType: "lightning" } }),
  },
  {
    id: "hunters-mark",
    group: "states",
    name: "Hunter's Mark (Ashstrider)",
    verdict: "keep",
    what: "Class Trait des Ashstrider: Treffer sammeln Marks auf dem Gegner (bis 5), der nächste Crit verbraucht sie.",
    see: "Ein drehendes Visier über dem Gegner, ein Punkt leuchtet pro Mark; bei 5 Marks glüht es orange. Hier: 3 Marks.",
    kit: BOW,
    state: (s) =>
      side(s, "hero", { trait: { kind: "huntersMark", value: 3, max: 5, damageType: "physical" } }),
  },
  {
    id: "telegraph",
    group: "states",
    name: "Telegraph (Heavy Attack kommt)",
    verdict: "change",
    what: "Der Gegner holt zu einem Heavy Attack aus.",
    see: "Der Gegner glüht rot an seinem Umriss und pulsiert, die Kamera zoomt leicht, dann der Schlag.",
    before:
      "Ein pulsierender oranger Ring um den Gegner und ein leichter Kamera-Zoom, dann der Schlag.",
    play: (p) => heavyAttack(p, false),
  },

  // ---------------------------------------------------------------- Am Helden
  {
    id: "off-hand",
    group: "hero",
    name: "Off-Hand-Glanz",
    verdict: "keep",
    what: "Off Hands wie Ember Focus oder Grimoire.",
    see: "Die Glut im Ember Focus glimmt, ein Grimoire schwebt und wippt. Neu: bei jedem Zauber flammt sie kurz auf.",
    kit: WAND,
    play: (p) => p.events(cast("Ice Bolt", 20, "cold")),
  },
  {
    id: "caster-pose",
    group: "hero",
    name: `Zauber-Pose (Wand, Staff)${NEW}`,
    verdict: "keep",
    what: "Der Held mit Wand oder Staff wirkt einen Zauber.",
    see: "Eigene gemalte Pose: der Arm hebt die Waffe, der Zauber löst sich aus ihr.",
    kit: STAFF,
    play: (p) => p.events(cast("Fireball", 30, "fire")),
  },
  {
    id: "breath",
    group: "hero",
    name: "Atmen und Arm-Schwung",
    verdict: "keep",
    what: "Die Figuren leben.",
    see: "Beide Figuren atmen leicht; beim Angriff schwingt der Arm des Helden.",
    play: (p) => p.events([hit()]),
  },

  // ---------------------------------------------------------------- Gegner
  {
    id: "gate",
    group: "enemy",
    name: "Gatekeeper-Tor",
    verdict: "keep",
    what: "Ein Gatekeeper versperrt den Weg ins neue Act.",
    see: "Ein gemaltes Steintor hinter dem Gegner, das Siegel pulsiert, aus zwei Feuerschalen kommen je 14 Flammen pro Sekunde.",
    enemy: (e) => ({ ...e, gate: true }),
  },
  {
    id: "gate-break",
    group: "enemy",
    name: "Tor bricht",
    verdict: "keep",
    what: "Der Gatekeeper fällt.",
    see: "Das gemalte Tor bricht, die Feuer gehen in einem Regen aus Stein und Funken aus (54 Partikel je Schale), Wackeln.",
    enemy: (e) => ({ ...e, gate: true }),
    play: (p) => {
      p.events([{ t: 0, type: "death", side: "enemy" }]);
      p.reset(2.6);
    },
  },
  {
    id: "shatter",
    group: "enemy",
    name: `Shatter (Rime Warden)${NEW}`,
    verdict: "change",
    what: "Boss in Act 4: bricht seine Ice Barrier, fliegen die Eisstücke auf den Helden.",
    see: "Ein heller Ring am Rime Warden, 26 Eissplitter fliegen zum Helden, der Treffer landet, wenn sie ankommen. 14 Frostwolken, „Shatter“, Wackeln.",
    before: "Dazu ein Bodenring unter den Füßen des Helden (wie bei einer Nova).",
    enemy: () => ({ id: "rime-warden", archetype: "warden", boss: true, elite: false, act: 4 }),
    play: (p) =>
      p.events([
        { t: 0, type: "trigger", side: "enemy", name: "Shatter" },
        hit({ side: "enemy", source: "Shatter", damageType: "cold", damage: 520 }),
      ]),
  },
  {
    id: "straw",
    group: "enemy",
    name: `Stroh (Training Dummy)${NEW}`,
    verdict: "keep",
    what: "Im Camp schlägt der Held auf Kaelens Training Dummy.",
    see: "Bei jedem Treffer fliegen 10 Strohhalme vom Dummy weg, bei Crit 26.",
    enemy: (e) => ({ ...e, id: "training-dummy", archetype: "brute", boss: false }),
    play: (p) => {
      p.events([hit()]);
      p.after(1.1, () => p.events([hit({ crit: true, damage: 612 })]));
    },
  },
  {
    id: "ember-lunge",
    group: "enemy",
    name: `Ember Lunge (Kaelen, Sparring)${NEW}`,
    verdict: "keep",
    what: "Beim Training Dummy kämpft Kaelen gegen den Helden und stößt mit glühender Klinge zu.",
    see: "Kaelen springt nach vorn, am Helden sprühen 12 Glutfunken und ein oranger Ring.",
    enemy: (e) => ({ ...e, id: "kaelen", archetype: "brute", boss: false }),
    play: (p) =>
      p.events([
        { t: 0, type: "skill", side: "enemy", skill: "Ember Lunge", heatCost: 50 },
        hit({ side: "enemy", source: "Ember Lunge", damageType: "fire", damage: 180 }),
      ]),
  },
  {
    id: "harvester-phase",
    group: "enemy",
    name: `Harvester: neue Phase${NEW}`,
    verdict: "keep",
    what: "Endboss The Ashen Harvester: unter 66 % und unter 33 % Life beginnt eine neue Phase.",
    see: "Weißer und farbiger Ring, Glut- und Frostfunken (46), starkes Wackeln; in Phase 3 fahren drei Void-Blitze herab. Hier: erst Phase 2, dann 3.",
    enemy: () => HARVESTER,
    play: (p) => {
      p.state((s) => side(s, "enemy", { life: s.enemy.maxLife * 0.6 }));
      p.after(1.8, () => p.state((s) => side(s, "enemy", { life: s.enemy.maxLife * 0.3 })));
      p.reset(4.5);
    },
  },
  {
    id: "harvester-aura",
    group: "enemy",
    name: `Harvester: Echo-Aura${NEW}`,
    verdict: "change",
    what: "Ab Phase 2 trägt der Harvester die Bosse, die er spiegelt.",
    see: "Ein Glanz um den Harvester, der atmet (Phase 2 Glut-Orange, Phase 3 Void-Violett), dazu 5 Funken pro Sekunde.",
    before:
      "Dauernd 16 bis 20 Flammen und Frostflocken pro Sekunde um ihn, in Phase 3 Void und Blitze, ab und zu ein kleiner Void-Blitz.",
    enemy: () => HARVESTER,
    state: (s) => side(s, "enemy", { life: s.enemy.maxLife * 0.5 }),
  },
  {
    id: "death",
    group: "enemy",
    name: "Tod",
    verdict: "keep",
    what: "Ein Kämpfer fällt.",
    see: "Die Figur verblasst und kippt, 60 Asche-Flocken und 40 Glutfunken steigen auf, Wackeln.",
    play: (p) => {
      p.events([{ t: 0, type: "death", side: "enemy" }]);
      p.reset(2.6);
    },
  },
  {
    id: "wildfire-glow",
    group: "enemy",
    name: "Wildfire-Bodenglut",
    verdict: "keep",
    what: "Ein Wildfire-Ausflug (Endgame).",
    see: "Der Boden glüht und atmet.",
    enemy: (e) => ({ ...e, wildfire: 3 }),
  },
  {
    id: "wildfire-edge",
    group: "enemy",
    name: "Wildfire-Randflammen (Tier X)",
    verdict: "change",
    what: "Je höher der Wildfire-Tier, desto mehr brennt es.",
    see: "An beiden Rändern steht ein fertiger Flammenrand, der flackert (je höher der Tier, desto höher die Flammen). Glut und Ruß: etwa 40 und 30, egal welcher Tier. Hier: Tier X.",
    before:
      "Große Flammen lecken an den Rändern ((4 + Tier) × 2 pro Sekunde), dazu Glut und Ruß in der Luft. Hier: Tier X.",
    enemy: (e) => ({ ...e, wildfire: 10 }),
  },

  // ---------------------------------------------------------------- Wetter
  weather(1, "Asche rieselt, etwa 40 Flocken gleichzeitig.", "Etwa 100 Flocken."),
  weather(2, "Glühwürmchen und Blätter, etwa 50."),
  weather(3, "Aufsteigende Glut, etwa 45."),
  weather(4, "Schnee, etwa 60 Flocken.", "Etwa 200 Flocken."),
  weather(5, "Schneller Regen, etwa 40 Tropfen."),
  weather(6, "Schwebende Void-Motes, etwa 30."),
  weather(7, "Glut fällt, etwa 50.", "Etwa 100."),
  weather(8, "Funken, etwa 70."),

  // ---------------------------------------------------------------- Zahlen
  {
    id: "numbers",
    group: "numbers",
    name: "Schadenszahlen",
    verdict: "keep",
    what: "Jeder Treffer zeigt seinen Schaden.",
    see: "Eine Zahl steigt auf, Crits größer und schräg mit „!“. Lässt sich in den Settings abschalten.",
    play: (p) => {
      p.events([hit()]);
      p.after(0.5, () => p.events([hit({ crit: true, damage: 612 })]));
      p.after(1, () => p.events([hit({ damageType: "fire", damage: 301 })]));
    },
  },
  {
    id: "dot-numbers",
    group: "numbers",
    name: "DoT-Zahlen",
    verdict: "change",
    what: "Ailments schaden über Zeit in Ticks.",
    see: "Die Ticks eines Ailments werden eine halbe Sekunde gesammelt und steigen als eine Zahl auf, in derselben Größe wie vorher.",
    before:
      "Jeder Tick jedes Ailments bekommt eine eigene Zahl. Mit drei Ailments regnet es Zahlen.",
    state: (s) =>
      side(s, "enemy", {
        ailments: [
          { type: "burn", remaining: 5 },
          { type: "poison", remaining: 5, stacks: 4 },
          { type: "bleed", remaining: 5 },
        ],
      }),
    play: (p) => {
      for (let i = 0; i < 6; i++)
        p.after(i * 0.3, () =>
          p.events([
            {
              t: 0,
              type: "dot",
              side: "enemy",
              ailment: (["burn", "poison", "bleed"] as const)[i % 3] ?? "burn",
              damage: 40 + i * 3,
            },
          ]),
        );
    },
  },
  {
    id: "hit-stop",
    group: "numbers",
    name: "Hit-Stop",
    verdict: "keep",
    what: "Bei Crits und Heavy Attacks.",
    see: "Das Bild hält für einen Wimpernschlag an. Nur bei normaler Kampfgeschwindigkeit.",
    play: (p) => p.events([hit({ crit: true, damage: 612 })]),
  },
];
