import type { DamageType } from "@emberheir/sim";
import blade1 from "../../assets/sfx/battle/swing-blade-1.mp3?url";
import blade2 from "../../assets/sfx/battle/swing-blade-2.mp3?url";
import blade3 from "../../assets/sfx/battle/swing-blade-3.mp3?url";
import heavy1 from "../../assets/sfx/battle/swing-heavy-1.mp3?url";
import heavy2 from "../../assets/sfx/battle/swing-heavy-2.mp3?url";
import bow1 from "../../assets/sfx/battle/shot-bow-1.mp3?url";
import bow2 from "../../assets/sfx/battle/shot-bow-2.mp3?url";
import bow3 from "../../assets/sfx/battle/shot-bow-3.mp3?url";
import impact1 from "../../assets/sfx/battle/impact-1.mp3?url";
import clash1 from "../../assets/sfx/battle/clash-1.mp3?url";
import break1 from "../../assets/sfx/battle/break-1.mp3?url";
import deathEnemy1 from "../../assets/sfx/battle/death-enemy-1.mp3?url";
import deathEnemy2 from "../../assets/sfx/battle/death-enemy-2.mp3?url";
import deathHero1 from "../../assets/sfx/battle/death-hero-1.mp3?url";
import telegraph1 from "../../assets/sfx/battle/telegraph-1.mp3?url";
import victory1 from "../../assets/sfx/battle/victory-1.mp3?url";
import defeat1 from "../../assets/sfx/battle/defeat-1.mp3?url";
import { soundOutput } from "../../ui/sound";
import type { Delivery } from "./arenaEffects";
import type { HeroLook } from "./heroArt";

/**
 * Battle sounds (Release 1.0). Recorded cues are CC0 cuts (taken over from Crucible, sources in
 * `apps/web/src/assets/sfx/README.md`); the elements and the spell casts are drawn with Web Audio,
 * like the UI sounds. Sounds play through the UI sound's context and Volume, under their own
 * switch "Battle" (Settings). The arena calls them at the moment the eye sees it: a swing when the
 * weapon moves, an impact when the blow lands.
 *
 * A fast fight must not turn into noise: each cue has a voice limit and a minimum gap, and a
 * Skip (a flood of events) stays quiet like the arena's effects.
 */
export type SampleCue =
  | "swing.blade"
  | "swing.heavy"
  | "shot.bow"
  | "impact"
  | "clash"
  | "break"
  | "death.enemy"
  | "death.hero"
  | "telegraph"
  | "victory"
  | "defeat";

export type SynthCue =
  "cast" | "evade" | "element.fire" | "element.cold" | "element.lightning" | "element.void";

export type BattleCue = SampleCue | SynthCue;

interface Sample {
  readonly urls: readonly string[];
  readonly gainDb: number;
}

export const SAMPLES: Readonly<Record<SampleCue, Sample>> = {
  "swing.blade": { urls: [blade1, blade2, blade3], gainDb: -4 },
  "swing.heavy": { urls: [heavy1, heavy2], gainDb: -4 },
  "shot.bow": { urls: [bow1, bow2, bow3], gainDb: -3 },
  impact: { urls: [impact1], gainDb: -3 },
  clash: { urls: [clash1], gainDb: -4 },
  break: { urls: [break1], gainDb: -4 },
  "death.enemy": { urls: [deathEnemy1, deathEnemy2], gainDb: -1 },
  "death.hero": { urls: [deathHero1], gainDb: -2 },
  telegraph: { urls: [telegraph1], gainDb: -3 },
  victory: { urls: [victory1], gainDb: -7 },
  defeat: { urls: [defeat1], gainDb: -6 },
};

/** How a weapon sounds when it moves. */
const WEAPON_SWING: Readonly<Record<HeroLook["weapon"], BattleCue>> = {
  sword: "swing.blade",
  dagger: "swing.blade",
  axe: "swing.heavy",
  mace: "swing.heavy",
  bow: "shot.bow",
  crossbow: "shot.bow",
  wand: "cast",
  staff: "cast",
};

/** The sound a blow starts with, or `null` (a nova or a falling star has no wind-up sound). */
export function swingCue(
  how: Delivery,
  weapon: HeroLook["weapon"] | null,
  damageType: DamageType,
): BattleCue | null {
  switch (how) {
    case "slash":
      return weapon ? WEAPON_SWING[weapon] : damageType === "physical" ? "swing.heavy" : "cast";
    case "arrow":
      return "shot.bow";
    case "orb":
    case "bolt":
      return "cast";
    default:
      return null;
  }
}

export interface LandedHit {
  readonly damageType: DamageType;
  readonly crit: boolean;
  readonly blocked: boolean;
  readonly glancing?: boolean | undefined;
  readonly parried?: boolean | undefined;
  readonly deflected?: boolean | undefined;
}

/** The sounds of a blow landing: steel on steel when it was stopped, else flesh and its element. */
export function impactCues(hit: LandedHit): BattleCue[] {
  if (hit.blocked || hit.parried) return ["clash"];
  const cues: BattleCue[] = [];
  if (hit.damageType === "physical" || hit.crit) cues.push("impact");
  if (hit.damageType !== "physical") cues.push(`element.${hit.damageType}`);
  // A crit cracks like breaking armor on top.
  if (hit.crit && !hit.glancing && !hit.deflected) cues.push("break");
  return cues;
}

export interface PlayOptions {
  /** Seconds from now. */
  readonly delay?: number;
  /** Quieter, e.g. a Glancing Blow or the enemy's own swing. */
  readonly gainDb?: number;
  /** Playback rate (lower = deeper). */
  readonly rate?: number;
}

/** Voice limits: at most this many of one cue at once, and this many in all. */
export const VOICES = { perCue: 3, total: 10, minGapMs: 45 } as const;

/** Hands out voices: a cue may start when its limits allow, and keeps its voice `lengthMs`. */
export function createVoiceLimiter() {
  const active = new Map<BattleCue, number>();
  const lastStart = new Map<BattleCue, number>();
  let total = 0;
  return {
    admit(
      cue: BattleCue,
      nowMs: number,
      lengthMs: number,
      release: (done: () => void, ms: number) => unknown = (done, ms) => setTimeout(done, ms),
    ): boolean {
      const playing = active.get(cue) ?? 0;
      const prev = lastStart.get(cue);
      if (total >= VOICES.total || playing >= VOICES.perCue) return false;
      if (prev !== undefined && nowMs - prev < VOICES.minGapMs) return false;
      active.set(cue, playing + 1);
      lastStart.set(cue, nowMs);
      total += 1;
      release(() => {
        active.set(cue, Math.max(0, (active.get(cue) ?? 1) - 1));
        total = Math.max(0, total - 1);
      }, lengthMs);
      return true;
    },
  };
}

const voices = createVoiceLimiter();

const buffers = new Map<string, Promise<AudioBuffer | null>>();
const decoded = new Map<string, AudioBuffer>();
const lastVariant = new Map<SampleCue, number>();

function load(ac: AudioContext, url: string): Promise<AudioBuffer | null> {
  let pending = buffers.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ac.decodeAudioData(data))
      .then((buffer) => {
        decoded.set(url, buffer);
        return buffer;
      })
      // A file that does not load stays silent; the fight goes on.
      .catch(() => null);
    buffers.set(url, pending);
  }
  return pending;
}

/** Loads the recorded cues ahead, so the first swing is not late. */
export function preloadBattleSfx() {
  const output = soundOutput("battle");
  if (!output) return;
  for (const sample of Object.values(SAMPLES))
    for (const url of sample.urls) void load(output.ac, url);
}

const dbToGain = (db: number) => 10 ** (db / 20);

/** Plays one battle cue, if Sound and its Battle switch are on. */
export function playBattleSfx(cue: BattleCue, options: PlayOptions = {}) {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  const output = soundOutput("battle");
  if (!output) return;
  const { ac, out } = output;
  const at = ac.currentTime + 0.005 + (options.delay ?? 0);
  // A little pitch and level drift per play, so a long fight does not repeat itself.
  const rate = (options.rate ?? 1) * (1 + (Math.random() * 2 - 1) * 0.04);
  const gainDb = (options.gainDb ?? 0) + (Math.random() * 2 - 1) * 1.2;
  if (cue in SAMPLES) {
    const sample = SAMPLES[cue as SampleCue];
    const n = sample.urls.length;
    const last = lastVariant.get(cue as SampleCue);
    let pick = Math.floor(Math.random() * n);
    if (n > 1 && pick === last) pick = (pick + 1) % n;
    lastVariant.set(cue as SampleCue, pick);
    const url = sample.urls[pick] ?? "";
    const buffer = decoded.get(url);
    // Not loaded yet: start loading, this one blow stays quiet rather than late.
    if (!buffer) {
      void load(ac, url);
      return;
    }
    if (
      !voices.admit(cue, performance.now(), (buffer.duration / rate + (options.delay ?? 0)) * 1000)
    )
      return;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = ac.createGain();
    gain.gain.value = dbToGain(sample.gainDb + gainDb);
    src.connect(gain).connect(out);
    src.start(at);
    return;
  }
  if (!voices.admit(cue, performance.now(), (0.6 + (options.delay ?? 0)) * 1000)) return;
  synth(ac, out, cue as SynthCue, at, rate, dbToGain(gainDb));
}

/** A burst of noise through a filter, with a sweep of its frequency. */
function noise(
  ac: AudioContext,
  out: AudioNode,
  at: number,
  o: {
    length: number;
    type: BiquadFilterType;
    from: number;
    to: number;
    q?: number;
    gain: number;
    attack?: number;
  },
) {
  const length = Math.ceil(ac.sampleRate * o.length);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = o.type;
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.from, at);
  filter.frequency.exponentialRampToValueAtTime(o.to, at + o.length);
  const gain = ac.createGain();
  const attack = o.attack ?? 0.008;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(o.gain, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + o.length);
  src.connect(filter).connect(gain).connect(out);
  src.start(at);
}

/** One enveloped oscillator note with a pitch slide. */
function note(
  ac: AudioContext,
  out: AudioNode,
  at: number,
  o: { type: OscillatorType; from: number; to: number; length: number; gain: number },
) {
  const osc = ac.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, at);
  osc.frequency.exponentialRampToValueAtTime(o.to, at + o.length);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(o.gain, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + o.length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + o.length + 0.02);
}

function synth(
  ac: AudioContext,
  out: AudioNode,
  cue: SynthCue,
  at: number,
  rate: number,
  g: number,
) {
  switch (cue) {
    case "cast":
      // A spell leaves the hand: a rising shimmer over a soft breath.
      noise(ac, out, at, {
        length: 0.22,
        type: "bandpass",
        from: 1200 * rate,
        to: 3200 * rate,
        q: 2,
        gain: 0.07 * g,
        attack: 0.04,
      });
      note(ac, out, at, {
        type: "triangle",
        from: 520 * rate,
        to: 1040 * rate,
        length: 0.16,
        gain: 0.04 * g,
      });
      break;
    case "evade":
      // A quick whoosh past the ear.
      noise(ac, out, at, {
        length: 0.2,
        type: "bandpass",
        from: 1800 * rate,
        to: 380 * rate,
        q: 1.5,
        gain: 0.12 * g,
        attack: 0.05,
      });
      break;
    case "element.fire":
      // A gust of flame: a low roar that falls away.
      noise(ac, out, at, {
        length: 0.42,
        type: "lowpass",
        from: 2400 * rate,
        to: 260 * rate,
        q: 0.8,
        gain: 0.22 * g,
        attack: 0.02,
      });
      note(ac, out, at, {
        type: "sine",
        from: 140 * rate,
        to: 60 * rate,
        length: 0.3,
        gain: 0.08 * g,
      });
      break;
    case "element.cold":
      // Ice cracks: a bright snap and two glassy pings.
      noise(ac, out, at, { length: 0.08, type: "highpass", from: 4200, to: 6000, gain: 0.12 * g });
      note(ac, out, at + 0.01, {
        type: "sine",
        from: 2637 * rate,
        to: 2600 * rate,
        length: 0.35,
        gain: 0.035 * g,
      });
      note(ac, out, at + 0.05, {
        type: "sine",
        from: 3951 * rate,
        to: 3900 * rate,
        length: 0.3,
        gain: 0.025 * g,
      });
      break;
    case "element.lightning":
      // A crackle: short bursts of bright noise and a hum.
      for (let i = 0; i < 4; i++)
        noise(ac, out, at + i * 0.035 + Math.random() * 0.015, {
          length: 0.04,
          type: "highpass",
          from: 2500,
          to: 5000,
          gain: 0.14 * g,
        });
      note(ac, out, at, {
        type: "sawtooth",
        from: 110 * rate,
        to: 90 * rate,
        length: 0.18,
        gain: 0.03 * g,
      });
      break;
    case "element.void":
      // A pull into nothing: a deep sliding tone and a hollow breath.
      note(ac, out, at, {
        type: "sine",
        from: 240 * rate,
        to: 50 * rate,
        length: 0.45,
        gain: 0.12 * g,
      });
      noise(ac, out, at, {
        length: 0.45,
        type: "bandpass",
        from: 300,
        to: 120,
        q: 3,
        gain: 0.08 * g,
        attack: 0.1,
      });
      break;
  }
}
