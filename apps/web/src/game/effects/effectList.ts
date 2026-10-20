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
 * `?effects`: every arena effect of a fight with a plain explanation and the verdict of the
 * effect review (design/notes/performance-kampfeffekte-v1.md, section 2). A developer page for
 * Timo, so the explanations are German; game terms stay English. Visual only, no fight runs.
 */

export type Verdict = "keep" | "change" | "cut";

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
  /** What you see today. */
  readonly see: string;
  /** What I would do (keep, change, cut). */
  readonly plan: string;
  /** The hero this effect needs (a class trait, a ranged weapon). */
  readonly kit?: Kit;
  readonly hero?: (h: HeroLook) => HeroLook;
  readonly enemy?: (e: EnemyLook) => EnemyLook;
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
  keep: "Behalten",
  change: "Ändern",
  cut: "Streichen",
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

const BOW: Kit = { classId: "ashstrider", weapon: "bow" };
const CROSSBOW: Kit = { classId: "ashstrider", weapon: "crossbow" };
const DAGGER: Kit = { classId: "ashstrider", weapon: "dagger" };
const WAND: Kit = { classId: "emberseer", weapon: "wand" };

/** Heavy Attack: the wind-up ring pulses, then the blow lands. */
function heavyAttack(p: Player, capped: boolean): void {
  const telegraph = { skill: "Heavy Slam", remaining: 1.4, windup: 1.4 };
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
  see: `${see} Beim Auftragen ein Schwall (14), bei jedem Schadens-Tick noch einmal 3. Dazu 12 Partikel pro Sekunde, solange es wirkt.`,
  plan: "Weniger: 4 pro Sekunde, 6 beim Auftragen, beim Tick keine (die Zahl zeigt den Tick schon). Bei mehreren Ailments gleichzeitig wird es sonst eine Partikelwolke.",
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
  see: "Ein eigenes Aufblitzen (Ring, Stern, Funken oder Wind) und der Name des Perks schwebt hoch.",
  plan: shake
    ? "Ein gemeinsamer Look für alle seltenen Perks: Ring in Perk-Farbe und der Name. Dieser hier schüttelt zusätzlich, weil er selten und wichtig ist."
    : "Ein gemeinsamer Look für alle seltenen Perks: Ring in Perk-Farbe und der Name. Man liest den Namen, das reicht.",
  play: (p) => p.events([perk(id)]),
});

const commonPerk = (id: PerkId, name: string, what: string, see: string): EffectEntry => ({
  id: `perk-${id}`,
  group: "perks",
  name,
  verdict: "cut",
  what,
  see: `${see} Ohne Namen.`,
  plan: "Streichen. Feuert bei fast jedem Treffer, sieht fast so aus wie die anderen (Ring oder Funken) und ohne Namen weiß niemand, was es war.",
  play: (p) => p.events([perk(id)]),
});

const weather = (act: number, verdict: Verdict, see: string, plan: string): EffectEntry => {
  const name = act === 8 ? "The Last Ember" : (ACTS.find((a) => a.number === act)?.name ?? "");
  return {
    id: `weather-${act}`,
    group: "weather",
    name: act === 8 ? `Finale: ${name}` : `Act ${act}: ${name}`,
    verdict,
    what: "Die Luft des Acts: läuft im ganzen Kampf und in der Intermission im Hintergrund.",
    see,
    plan,
    enemy: (e) => ({
      archetype: "brute",
      boss: false,
      elite: false,
      act,
      ...(e.id && act === 1 ? { id: e.id } : {}),
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
    plan: "Behalten. Die Sichel wird künftig einmal als Bild gezeichnet statt in jedem Frame neu: sieht gleich aus, kostet weniger.",
    play: (p) => p.events([hit()]),
  },
  {
    id: "arrow",
    group: "hits",
    name: "Pfeil (Bow, Crossbow)",
    verdict: "keep",
    what: "Fernkampfwaffen schießen ihren Default Attack über die Arena.",
    see: "Ein Pfeil fliegt im Bogen und schlägt mit Funken ein.",
    plan: "Behalten, kostet fast nichts.",
    kit: BOW,
    play: (p) => p.events([hit()]),
  },
  {
    id: "orb",
    group: "hits",
    name: "Kugel-Geschoss (Orb)",
    verdict: "change",
    what: "Zauber wie Ice Lance, Fireball oder Void Bolt fliegen als Kugel zum Ziel.",
    see: "Eine leuchtende Kugel mit Schweif aus Partikeln (2 pro Frame).",
    plan: "Der Schweif wird ein einziges gestrecktes Bild statt vieler Partikel. Sieht fast gleich aus.",
    play: (p) => p.events([hit({ source: "Ice Lance", damageType: "cold", damage: 540 })]),
  },
  {
    id: "bolt",
    group: "hits",
    name: "Blitz (Bolt)",
    verdict: "keep",
    what: "Blitz-Zauber wie Chain Lightning springen sofort zum Ziel.",
    see: "Ein Zickzack-Blitz von der Hand zum Gegner.",
    plan: "Behalten. Wird einmal gezeichnet und nur noch ausgeblendet.",
    play: (p) =>
      p.events([hit({ source: "Chain Lightning", damageType: "lightning", damage: 580 })]),
  },
  {
    id: "fall",
    group: "hits",
    name: "Meteor (Fall)",
    verdict: "keep",
    what: "Meteor, Eruption, Avalanche und Ashfall fallen von oben auf das Ziel.",
    see: "Eine Kugel stürzt schräg von oben herab.",
    plan: "Behalten, wie die Kugel ohne Partikelschweif.",
    play: (p) => p.events([hit({ source: "Meteor", damageType: "fire", damage: 920 })]),
  },
  {
    id: "nova",
    group: "hits",
    name: "Bodenring (Nova)",
    verdict: "keep",
    what: "Frost Nova, Toxic Burst, Immolate und ähnliche treffen direkt am Ziel.",
    see: "Ein großer Ring breitet sich am Boden unter dem Gegner aus.",
    plan: "Behalten, der Ring wird ein fertiges Bild.",
    play: (p) => p.events([hit({ source: "Frost Nova", damageType: "cold", damage: 700 })]),
  },
  {
    id: "sparks",
    group: "hits",
    name: "Einschlag-Funken",
    verdict: "change",
    what: "Jeder Treffer, egal welcher Art.",
    see: "14 Funken pro Treffer, bei Crit oder Heavy Attack 34. Hier: erst normal, dann Crit.",
    plan: "Auf 8 und 18 reduzieren. Bei schnellen Waffen landen viele Treffer pro Sekunde, die Hälfte reicht für das Gefühl.",
    play: (p) => {
      p.events([hit()]);
      p.after(1.1, () => p.events([hit({ crit: true, damage: 612 })]));
    },
  },
  {
    id: "nova-column",
    group: "hits",
    name: "Funkensäule bei Nova und Meteor",
    verdict: "cut",
    what: "Ein zusätzlicher Effekt, wenn ein Nova- oder Meteor-Zauber einschlägt.",
    see: "20 Partikel steigen am Ziel als Säule auf, zusätzlich zu Ring und Funken.",
    plan: "Streichen. Ring und Einschlag-Funken zeigen den Treffer schon.",
    play: (p) => p.events([hit({ source: "Immolate", damageType: "fire", damage: 640 })]),
  },
  {
    id: "crit",
    group: "hits",
    name: "Crit (kritischer Treffer)",
    verdict: "keep",
    what: "Ein Treffer macht 150 % Schaden.",
    see: "Weißer Ring, kurzes Bild-Anhalten (Hit-Stop), spürbares Wackeln, große Zahl mit „!“.",
    plan: "Behalten. Das ist der Kern, warum sich ein Treffer gut anfühlt.",
    play: (p) => p.events([hit({ crit: true, damage: 612 })]),
  },
  {
    id: "mini-shake",
    group: "hits",
    name: "Mini-Wackeln bei normalen Treffern",
    verdict: "keep",
    what: "Bei jedem normalen Treffer wackelt die Kamera ein kleines bisschen.",
    see: "Praktisch nichts: das Wackeln bleibt unter einem Pixel. Hier zum Vergleich: normal, dann Crit.",
    plan: "Kann bleiben, es stört nicht und kostet nichts. Wenn normale Treffer mehr Wucht haben sollen, wäre ein leichtes, sichtbares Wackeln ein eigener Vorschlag.",
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
    plan: "Behalten, kostet nichts.",
    play: (p) => p.events([hit({ side: "enemy", damage: 180 })]),
  },
  {
    id: "glancing",
    group: "hits",
    name: "Glancing Blow",
    verdict: "change",
    what: "Ein Angriff trifft nicht sauber (zu wenig Precision): er rutscht ab und macht weniger Schaden.",
    see: "Graue Funken springen nach oben, dazu dunkle Brocken, eine kleine graue Zahl.",
    plan: "Eine kleine graue Funkenwolke reicht.",
    play: (p) => p.events([hit({ glancing: true, damage: 96 })]),
  },
  {
    id: "parry",
    group: "hits",
    name: "Parry",
    verdict: "keep",
    what: "Der Held fängt einen Angriff mit der Waffe ab: der Treffer wird zum Glancing Blow.",
    see: "Ein heller Bogen am Helden, Stahlfunken, „⚔“ an der Zahl.",
    plan: "Behalten, mit halb so vielen Funken.",
    play: (p) => p.events([hit({ side: "enemy", glancing: true, parried: true, damage: 120 })]),
  },
  {
    id: "block",
    group: "hits",
    name: "Block",
    verdict: "keep",
    what: "Ein Shield hält einen Teil des Treffers ab.",
    see: "Ein kleiner Ring am Schild, „⛨“ an der Zahl.",
    plan: "Behalten.",
    play: (p) => p.events([hit({ side: "enemy", blocked: true, damage: 140 })]),
  },
  {
    id: "deflect",
    group: "hits",
    name: "Deflect",
    verdict: "change",
    what: "Evasion lässt den Helden Zauber ablenken: sie machen nur halben Schaden.",
    see: "Der Held weicht halb aus, ein blasser Ring und 10 Partikel, „↺“ an der Zahl.",
    plan: "Ring und Ausweichbewegung behalten, die Partikel weglassen.",
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
    see: "Ein breiter Bodenring, Erdbrocken springen hoch, „⚒“ an der Zahl.",
    plan: "Nur den Bodenring behalten, die Brocken weglassen.",
    play: (p) => p.events([hit({ mighty: true, damage: 480 })]),
  },
  {
    id: "capped",
    group: "hits",
    name: "Heavy Attack gedeckelt („Held“)",
    verdict: "change",
    what: "Ein Heavy Attack des Gegners kann höchstens einen Teil deines Lebens nehmen. Der Rest wird zurückgehalten.",
    see: "Ein Glutschild-Ring am Helden, 22 Funken und das Wort „Held“.",
    plan: "Ring und Wort behalten, 8 Funken.",
    play: (p) => heavyAttack(p, true),
  },
  {
    id: "flurry",
    group: "hits",
    name: "Mehrfach-Treffer (Flurry)",
    verdict: "keep",
    what: "Skills mit mehreren Treffern.",
    see: "Die Treffer landen kurz nacheinander statt alle auf einmal.",
    plan: "Behalten, kostet nichts.",
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
    id: "cast-ring",
    group: "skills",
    name: "Cast-Ring am Boden",
    verdict: "keep",
    what: "Der Held setzt einen Skill aus dem Battle Plan ein.",
    see: "Ein Ring in der Farbe des Elements breitet sich unter dem Helden aus.",
    plan: "Behalten: so sieht man „jetzt kam ein Skill“. Der Ring wird ein fertiges Bild.",
    play: (p) => p.events(cast("Fireball", 30, "fire")),
  },
  {
    id: "cast-sparks",
    group: "skills",
    name: "Cast-Funken und Wackeln",
    verdict: "cut",
    what: "Zusätzlich zum Ring bei jedem Skill.",
    see: "12 aufsteigende Funken, bei teuren Skills (ab 60 Heat) 26 Funken und Wackeln. Hier: erst günstig, dann teuer.",
    plan: "Streichen. Der Ring sagt „Skill“, der Treffer selbst wackelt schon.",
    play: (p) => {
      p.events(cast("Fireball", 30, "fire"));
      p.after(1.4, () => p.events(cast("Meteor", 70, "fire")));
    },
  },
  {
    id: "twin",
    group: "skills",
    name: "Twin Cast",
    verdict: "change",
    what: "Spellweaver-Mastery: ein Zauber wird sofort ein zweites Mal gewirkt.",
    see: "Zwei violette Ringe nacheinander und der Name „Twin Cast“.",
    plan: "Ein Ring und der Name.",
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
    see: "22 Rüstungsplatten fliegen weg, ein Ring, Wackeln.",
    plan: "10 Platten, kein Ring.",
    kit: { classId: "cinderguard", weapon: "mace" },
    play: (p) => p.events([hit({ source: "Crushing Blow", damage: 720 })]),
  },
  {
    id: "earthsplitter",
    group: "skills",
    name: "Signature: Earthsplitter, Skull Crack",
    verdict: "keep",
    what: "Große Schläge der Masteries und Innates: Earthsplitter spaltet den Boden, Skull Crack betäubt.",
    see: "Bodenring, Erdbrocken, kräftiges Wackeln und kurzes Anhalten. Hier: erst Earthsplitter, dann Skull Crack.",
    plan: "Behalten, die Brocken halbieren.",
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
    plan: "Behalten, die Funken halbieren.",
    kit: CROSSBOW,
    play: (p) => p.events([hit({ source: "Heavy Bolt", damage: 980 })]),
  },
  {
    id: "barbed",
    group: "skills",
    name: "Signature: Barbed Arrow, Envenom",
    verdict: "cut",
    what: "Bow und Dagger: Treffer, die Bleed oder Poison auftragen.",
    see: "12 Tropfen spritzen vom Ziel.",
    plan: "Streichen. Das Ailment selbst zeigt es danach schon mit seinen Partikeln und der Tönung.",
    kit: DAGGER,
    play: (p) => {
      p.events([hit({ source: "Envenom", damage: 340 })]);
      p.after(1.2, () => p.events([hit({ source: "Barbed Arrow", damage: 360 })]));
    },
  },

  // ---------------------------------------------------------------- Verteidigung
  {
    id: "heal",
    group: "defense",
    name: "Heilung",
    verdict: "change",
    what: "Der Held heilt sich (Flask, Heal-Skill, Second Breath).",
    see: "18 grüne Funken steigen auf, dazu die grüne Zahl.",
    plan: "Bleibt so für große Heilungen. Partikel nur ab 5 % Max Life.",
    play: (p) => p.events([{ t: 0, type: "heal", side: "hero", amount: 820 }]),
  },
  {
    id: "lifesteal",
    group: "defense",
    name: "Lifesteal-Heilungen",
    verdict: "change",
    what: "Lifesteal heilt bei jedem eigenen Treffer ein wenig.",
    see: "Jede kleine Heilung macht heute dieselben 18 grünen Funken und eine eigene Zahl. Bei schnellen Waffen grünt es dauernd.",
    plan: "Kleine Heilungen pro halbe Sekunde zu einer Zahl zusammenfassen, ohne Funken.",
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
    name: "Barrier-Gewinn",
    verdict: "keep",
    what: "Der Held bekommt Barrier (eine Schicht vor dem Life, z. B. durch INT).",
    see: "Ein heller Ring und „+… Barrier“.",
    plan: "Behalten, Ring als fertiges Bild.",
    play: (p) => p.events([{ t: 0, type: "barrier", side: "hero", amount: 400 }]),
  },
  {
    id: "ward",
    group: "defense",
    name: "Barrier-Blase",
    verdict: "cut",
    what: "Solange ein Kämpfer Barrier hat.",
    see: "Eine blasse, blaue Blase um den Kämpfer, die mit der Barrier verblasst.",
    plan: "Streichen (Timo): die Barrier sieht man beim Helden an der Life-Kugel und beim Gegner am Lebensbalken.",
    state: (s) => side(s, "hero", { barrier: s.hero.maxLife * 0.6 }),
  },
  {
    id: "buff",
    group: "defense",
    name: "Buff",
    verdict: "change",
    what: "Ein Skill oder Trigger gibt dem Helden kurz einen Bonus (z. B. Attack Speed). Coats geben Bleed- oder Poison-Chance.",
    see: "16 gestreckte goldene Funken schießen hoch, bei Coats rot oder grün. Hier: erst ein Buff, dann ein Coat.",
    plan: "Nur Coats zeigen einen kurzen Schimmer an der Waffe. Andere Buffs zeigt die Leiste unten.",
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
    see: "Ein goldener Ring bei jedem Trigger. Wenn er einen Extra-Angriff auslöst, schwebt sein Name hoch. Hier: erst ein Trigger, dann einer mit Extra-Angriff.",
    plan: "Den Ring streichen (Trigger feuern sehr oft, die Boon-Leiste blinkt schon). Der Name beim Extra-Angriff bleibt.",
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
    plan: "Behalten, Staub auf 5.",
    play: (p) => p.events([{ t: 0, type: "evade", side: "hero", source: "Strike" }]),
  },
  {
    id: "stun",
    group: "defense",
    name: "Stun",
    verdict: "keep",
    what: "Ein Kämpfer ist betäubt und kann kurz nichts tun.",
    see: "Sterne kreisen über dem Kopf.",
    plan: "Behalten. Die Sterne werden fertige Bilder, die nur noch kreisen.",
    play: (p) => p.events([{ t: 0, type: "stun", side: "enemy", seconds: 2 }]),
  },

  // ---------------------------------------------------------------- Perks
  rarePerk("titan", "Titan (STR 10)", "Sehr harte Treffer betäuben den Gegner.", true),
  rarePerk("trueShot", "True Shot (DEX 10)", "Jeder n-te Angriff ist ein sicherer Crit."),
  rarePerk(
    "spellfire",
    "Spellfire (INT 10)",
    "Der erste Zauber des Kampfs macht doppelten Schaden.",
  ),
  rarePerk("quickReflexes", "Quick Reflexes (DEX 4)", "Der erste Angriff des Gegners verfehlt."),
  rarePerk("doubleTime", "Double Time (AGI 10)", "Jeder n-te Angriff schlägt zweimal zu."),
  rarePerk("innerFire", "Inner Fire", "Der Held startet mit etwas Heat in den Kampf."),
  rarePerk("secondBreath", "Second Breath", "Einmal pro Kampf bei wenig Life: eine große Heilung."),
  rarePerk(
    "undying",
    "Undying",
    "Einmal pro Kampf überlebt der Held einen tödlichen Treffer mit 1 Life.",
    true,
  ),
  commonPerk(
    "armorbreaker",
    "Armorbreaker (STR 4)",
    "Crits legen einen Sunder-Stack auf (weniger Armor und Resistance beim Gegner).",
    "Graue Splitter fallen vom Gegner.",
  ),
  commonPerk(
    "stoneguard",
    "Stoneguard (STR 7)",
    "Blocks halten mehr ab.",
    "Ein grauer Ring um den Helden.",
  ),
  commonPerk("hawkeye", "Hawkeye (AGI 4)", "Mehr Precision.", "Ein weißer Ring um den Gegner."),
  commonPerk(
    "opportunist",
    "Opportunist (AGI 7)",
    "Auch Glancing Blows lösen On-Hit-Trigger aus.",
    "Ein goldener Funkenstern am Gegner.",
  ),
  commonPerk("attuned", "Attuned (INT 4)", "Mehr Penetration.", "Ein blauer Ring um den Helden."),
  commonPerk(
    "surge",
    "Surge (INT 7)",
    "Mehr Chance auf Ailments.",
    "Ein violetter Funkenstern am Gegner.",
  ),
  commonPerk(
    "emberDance",
    "Ember Dance (DEX 7)",
    "Heat beim Ausweichen.",
    "Goldene Windstreifen am Helden.",
  ),
  commonPerk(
    "afterglow",
    "Afterglow",
    "Skills geben einen Teil ihrer Heat zurück.",
    "Orange Funken steigen am Helden auf.",
  ),
  commonPerk(
    "clarity",
    "Clarity",
    "Payoffs machen mehr Schaden.",
    "Ein violetter Ring um den Gegner.",
  ),
  commonPerk(
    "thickSkin",
    "Thick Skin",
    "Weniger Schaden durch Ailments.",
    "Ein grauer Ring um den Helden.",
  ),

  // ---------------------------------------------------------------- Payoffs
  {
    id: "overflow",
    group: "payoffs",
    name: "Overflow (Poison)",
    verdict: "keep",
    what: "Zu viele Poison-Stacks: das Gift platzt auf einmal.",
    see: "Ring, 26 grüne Tropfen, Wackeln, Name.",
    plan: "Behalten, 16 Tropfen.",
    play: (p) => p.events([payoff("overflow")]),
  },
  {
    id: "combust",
    group: "payoffs",
    name: "Combust (Burn)",
    verdict: "keep",
    what: "Ein Burn flammt auf einmal auf.",
    see: "Ring, 30 Flammen, Wackeln, Name.",
    plan: "Behalten, 16 kleinere Flammen.",
    play: (p) => p.events([payoff("combust")]),
  },
  {
    id: "collapse",
    group: "payoffs",
    name: "Collapse (Corruption)",
    verdict: "keep",
    what: "Corruption fällt in sich zusammen und macht großen Schaden.",
    see: "Ein Ring zieht sich zusammen, dann bricht er mit 32 Partikeln und einem Ring auf.",
    plan: "Behalten, 18 Partikel.",
    play: (p) => p.events([payoff("collapse")]),
  },
  {
    id: "fury-full",
    group: "payoffs",
    name: "Fury voll (Cinderguard)",
    verdict: "keep",
    what: "Class Trait des Cinderguard: Fury ist voll und bricht los.",
    see: "Ein Glutring am Helden und Wackeln.",
    plan: "Behalten.",
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
    plan: "Behalten, ein Ring und 20 Funken.",
    kit: WAND,
    play: (p) => p.events([payoff("overcharge")]),
  },
  {
    id: "spark",
    group: "payoffs",
    name: "Spellcharge (Spark)",
    verdict: "change",
    what: "Wand: ein Spark entlädt sich auf den Gegner.",
    see: "Ein Ring und 14 Funken am Gegner.",
    plan: "Nur der Ring.",
    kit: WAND,
    play: (p) => p.events([payoff("spark")]),
  },
  {
    id: "flashpoint",
    group: "payoffs",
    name: "Flashpoint, Critical Mass (Starfall)",
    verdict: "change",
    what: "Starfall-Pfad der Wand: ein geladener Spark oder gesammelte Crits brechen auf.",
    see: "Ein Riss aus zwei Blitzen, Ring, 44 Funken. Hier: erst Flashpoint, dann Critical Mass.",
    plan: "Ein gemeinsamer Riss mit 16 Funken für beide.",
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
    plan: "Behalten, als fertiges Blitz-Bild kostet er fast nichts.",
    kit: WAND,
    play: (p) => p.events([payoff("conduction")]),
  },
  {
    id: "cash-in",
    group: "payoffs",
    name: "Cash In (Burst)",
    verdict: "change",
    what: "Burst-Masteries: ein Skill zündet alle DoTs auf dem Gegner auf einmal.",
    see: "Drei Ringe ziehen sich zusammen, zwei brechen auf, 44 Funken, Wackeln.",
    plan: "Ein Ring rein, ein Ring raus, 24 Funken.",
    play: (p) => p.events([payoff("cashIn")]),
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
    plan: "Behalten, kostet nichts.",
    state: onFoe("chill"),
  },
  {
    id: "sunder",
    group: "states",
    name: "Sunder-Splitter",
    verdict: "keep",
    what: "Sunder: der Gegner hat weniger Armor.",
    see: "Graue Rüstungssplitter fallen, solange Sunder wirkt.",
    plan: "Behalten, mit derselben kleineren Rate wie Ailments.",
    state: (s) =>
      side(s, "enemy", {
        curses: [{ name: "Sunder", dotDamageTaken: 0, armor: 0.3, remaining: 5 }],
      }),
  },
  {
    id: "fury-aura",
    group: "states",
    name: "Fury-Aura (Cinderguard)",
    verdict: "change",
    what: "Class Trait des Cinderguard: Fury sammelt sich im Kampf.",
    see: "Eine Glut-Ellipse um den Helden, die mit der Fury wächst, dazu bis zu 14 Glutfunken pro Sekunde.",
    plan: "Ein fertiger Glanz, der mit der Fury wächst; 4 Glutfunken pro Sekunde.",
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
    plan: "Behalten, als fertige Bilder.",
    kit: WAND,
    state: (s) =>
      side(s, "hero", { trait: { kind: "overcharge", value: 2, max: 3, damageType: "lightning" } }),
  },
  {
    id: "hunters-mark",
    group: "states",
    name: "Hunter's Mark (Ashstrider)",
    verdict: "keep",
    what: "Class Trait des Ashstrider: der Gegner ist markiert, solange er deine Ailments trägt.",
    see: "Ein drehendes Visier über dem Gegner.",
    plan: "Behalten, als fertiges Bild.",
    kit: BOW,
    state: (s) =>
      side(s, "hero", { trait: { kind: "huntersMark", value: 1, max: 1, damageType: "physical" } }),
  },
  {
    id: "telegraph",
    group: "states",
    name: "Telegraph (Heavy Attack kommt)",
    verdict: "keep",
    what: "Der Gegner holt zu einem Heavy Attack aus.",
    see: "Ein pulsierender oranger Ring um den Gegner und ein leichter Kamera-Zoom, dann der Schlag.",
    plan: "Behalten: die wichtigste Warnung im Kampf.",
    play: (p) => heavyAttack(p, false),
  },

  // ---------------------------------------------------------------- Am Helden
  {
    id: "exalted",
    group: "hero",
    name: "Exalted-Funken",
    verdict: "cut",
    what: "Die Waffe hat den höchsten Grade (Exalted).",
    see: "9 goldene Funken pro Sekunde an der Waffe.",
    plan: "Streichen. Der Glanz der Waffe zeigt den Grade schon.",
    hero: (h) => ({ ...h, weaponLook: { ...h.weaponLook, grade: 4 } }),
  },
  ...(["fire", "lightning", "cold", "void"] as const).map((element): EffectEntry => ({
    id: `infusion-${element}`,
    group: "hero",
    name: `Heirloom Infusion: ${element[0]?.toUpperCase()}${element.slice(1)}`,
    verdict: "change",
    what: "Der Heirloom-Pfad gibt der Waffe ein Element.",
    see: "10 Partikel pro Sekunde an der Waffe (Fire brennt, Lightning knistert mit Bögen, Cold dampft, Void raucht).",
    plan: "Ein fertiger Glanz in der Elementfarbe an der Klinge, der atmet (wie der Echo-Glanz). Keine Partikel.",
    hero: (h) => ({ ...h, weaponLook: { ...h.weaponLook, element } }),
  })),
  ...(
    [
      ["burst", "Glutringe pulsieren um den Helden."],
      ["tempo", "Windstreifen wirbeln um den Helden."],
      ["ailment", "Dunkle Tropfen fallen vom Helden."],
    ] as const
  ).map(([mastery, see]): EffectEntry => ({
    id: `mastery-${mastery}`,
    group: "hero",
    name: `Mastery-Aura: ${mastery[0]?.toUpperCase()}${mastery.slice(1)}`,
    verdict: "cut",
    what: "Die Haupt-Mastery des Helden zeigt ihren Stil.",
    see: `${see} Dauernd.`,
    plan: "Streichen. Niemand weiß, was sie bedeutet; die Mastery zeigt sich schon an der Keystone-Waffe.",
    hero: (h) => ({ ...h, mastery }),
  })),
  {
    id: "echo",
    group: "hero",
    name: "Echo-Glanz an der Waffe",
    verdict: "keep",
    what: "Auf der Waffe steckt ein Echo.",
    see: "Ein weicher Glanz in der Farbe des Echos um die Waffe, der atmet.",
    plan: "Behalten, kostet fast nichts.",
    hero: (h) => ({ ...h, echo: 0x6fd3ff }),
  },
  {
    id: "echo-motes",
    group: "hero",
    name: "Echo-Motes",
    verdict: "cut",
    what: "Auf der Waffe steckt ein Echo.",
    see: "Zusätzlich zum Glanz: 7 Lichtpunkte pro Sekunde schweben um den Helden.",
    plan: "Streichen, der Glanz reicht.",
    hero: (h) => ({ ...h, echo: 0x6fd3ff }),
  },
  {
    id: "off-hand",
    group: "hero",
    name: "Off-Hand-Glanz",
    verdict: "keep",
    what: "Off Hands wie Ember Focus oder Grimoire.",
    see: "Die Glut im Ember Focus glimmt, ein Grimoire schwebt und wippt.",
    plan: "Behalten, kostet fast nichts.",
    kit: WAND,
  },
  {
    id: "draught-ring",
    group: "hero",
    name: "Draught-Ring",
    verdict: "keep",
    what: "Für den Ausflug ist ein Draught gebraut.",
    see: "Ein Ring in der Farbe des Draughts am Boden unter dem Helden, der atmet.",
    plan: "Behalten.",
    hero: (h) => ({ ...h, draught: 0x4fe08a }),
  },
  {
    id: "draught-bubbles",
    group: "hero",
    name: "Draught-Blasen",
    verdict: "cut",
    what: "Für den Ausflug ist ein Draught gebraut.",
    see: "Zusätzlich zum Ring: 4 Blasen pro Sekunde steigen auf.",
    plan: "Streichen, der Ring reicht.",
    hero: (h) => ({ ...h, draught: 0x4fe08a }),
  },
  {
    id: "level-glow",
    group: "hero",
    name: "Level-Glanz",
    verdict: "keep",
    what: "Eine Seite ist viele Level stärker als die andere.",
    see: "Ein Bodenlicht unter der stärkeren Seite (hier: der Gegner ist 8 Level höher).",
    plan: "Behalten, ist eine Info.",
    enemy: (e) => ({ ...e, levelGap: 8 }),
  },
  {
    id: "breath",
    group: "hero",
    name: "Atmen und Arm-Schwung",
    verdict: "keep",
    what: "Die Figuren leben.",
    see: "Beide Figuren atmen leicht; beim Angriff schwingt der Arm des Helden.",
    plan: "Behalten, kostet nichts.",
    play: (p) => p.events([hit()]),
  },

  // ---------------------------------------------------------------- Gegner
  {
    id: "elite",
    group: "enemy",
    name: "Elite-Ring",
    verdict: "keep",
    what: "Der Gegner ist ein Elite.",
    see: "Ein goldener Ring um den Gegner.",
    plan: "Behalten.",
    enemy: (e) => ({ ...e, elite: true }),
  },
  {
    id: "boss",
    group: "enemy",
    name: "Boss-Ring",
    verdict: "keep",
    what: "Der Gegner ist ein Boss.",
    see: "Ein großer oranger Ring.",
    plan: "Behalten.",
    enemy: (e) => ({ ...e, boss: true }),
  },
  {
    id: "champion",
    group: "enemy",
    name: "Champion-Ringe",
    verdict: "keep",
    what: "Ein benannter Champion (ab Run 3).",
    see: "Zwei Ringe: violettes Void-Feuer um Gold.",
    plan: "Behalten.",
    enemy: (e) => ({ ...e, elite: true, champion: true }),
  },
  {
    id: "gate",
    group: "enemy",
    name: "Gatekeeper-Tor",
    verdict: "change",
    what: "Ein Gatekeeper versperrt den Weg ins neue Act.",
    see: "Ein gezeichnetes Steintor hinter dem Gegner, das Siegel pulsiert, aus zwei Feuerschalen kommen je 14 Flammen pro Sekunde.",
    plan: "5 Flammen pro Sekunde je Schale; später ein gemaltes Tor.",
    enemy: (e) => ({ ...e, gate: true }),
  },
  {
    id: "gate-break",
    group: "enemy",
    name: "Tor bricht",
    verdict: "keep",
    what: "Der Gatekeeper fällt.",
    see: "Das Tor bricht, die Feuer gehen in einem Regen aus Stein und Funken aus (54 Partikel je Schale), Wackeln.",
    plan: "Behalten: seltener großer Moment. 30 Partikel je Schale.",
    enemy: (e) => ({ ...e, gate: true }),
    play: (p) => {
      p.events([{ t: 0, type: "death", side: "enemy" }]);
      p.reset(2.6);
    },
  },
  {
    id: "death",
    group: "enemy",
    name: "Tod",
    verdict: "keep",
    what: "Ein Kämpfer fällt.",
    see: "Die Figur verblasst und kippt, 60 Asche-Flocken und 40 Glutfunken steigen auf, Wackeln.",
    plan: "Behalten, 30 Asche und 20 Glut.",
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
    plan: "Behalten, kostet fast nichts.",
    enemy: (e) => ({ ...e, wildfire: 3 }),
  },
  {
    id: "wildfire-edge",
    group: "enemy",
    name: "Wildfire-Randflammen (Tier X)",
    verdict: "change",
    what: "Je höher der Wildfire-Tier, desto mehr brennt es.",
    see: "Große Flammen lecken an den Rändern ((4 + Tier) × 2 pro Sekunde), dazu Glut und Ruß in der Luft. Hier: Tier X.",
    plan: "Ein gemalter oder fertiger Flammenrand, der flackert, ohne Partikel. Glut und Ruß höchstens 40 + 30, egal welcher Tier.",
    enemy: (e) => ({ ...e, wildfire: 10 }),
  },

  // ---------------------------------------------------------------- Wetter
  weather(1, "change", "Asche rieselt, etwa 100 Flocken gleichzeitig.", "Etwa 40 Flocken."),
  weather(2, "keep", "Glühwürmchen und Blätter, etwa 50.", "Unverändert."),
  weather(3, "keep", "Aufsteigende Glut, etwa 45.", "Unverändert."),
  weather(4, "change", "Schnee, etwa 200 Flocken.", "Etwa 60 Flocken."),
  weather(5, "keep", "Schneller Regen, etwa 40 Tropfen.", "Unverändert."),
  weather(6, "keep", "Schwebende Void-Motes, etwa 30.", "Unverändert."),
  weather(7, "change", "Viel Glut, etwa 100.", "Etwa 50."),
  weather(8, "keep", "Funken, etwa 70.", "Unverändert."),

  // ---------------------------------------------------------------- Zahlen
  {
    id: "numbers",
    group: "numbers",
    name: "Schadenszahlen",
    verdict: "keep",
    what: "Jeder Treffer zeigt seinen Schaden.",
    see: "Eine Zahl steigt auf, Crits größer und schräg mit „!“. Lässt sich in den Settings abschalten.",
    plan: "Behalten (sind seit dem Performance-PR schon günstig).",
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
    see: "Jeder Tick jedes Ailments bekommt eine eigene Zahl. Mit drei Ailments regnet es Zahlen.",
    plan: "Kleiner, und pro Ailment und halbe Sekunde zu einer Zahl zusammengefasst.",
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
    plan: "Behalten.",
    play: (p) => p.events([hit({ crit: true, damage: 612 })]),
  },
];
