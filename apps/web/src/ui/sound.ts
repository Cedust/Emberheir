/**
 * The six drop sounds of the "Spielspaß" plan (Teil 3 D), synthesized with Web Audio so the game
 * needs no sound files: card flip, Rare, Legendary, Unique, Rune and high Rune.
 */
export type DropSound = "flip" | "rare" | "legendary" | "unique" | "rune" | "highRune";

/** Kinds of sound the player can switch off one by one (Settings). */
export const SOUND_GROUPS = ["hover", "click", "window", "coin", "loot", "notice"] as const;
export type SoundGroup = (typeof SOUND_GROUPS)[number];

let enabled = true;
let volume = 0.8;
let groups: Readonly<Record<SoundGroup, boolean>> = {
  hover: true,
  click: true,
  window: true,
  coin: true,
  loot: true,
  notice: true,
};
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function setSoundOptions(options: {
  on: boolean;
  volume: number;
  groups: Readonly<Record<SoundGroup, boolean>>;
}) {
  enabled = options.on;
  volume = options.volume;
  groups = options.groups;
  if (master) master.gain.value = volume;
}

/** The node every sound plays into: the master volume. */
function out(ac: AudioContext): AudioNode {
  if (!master) {
    master = ac.createGain();
    master.gain.value = volume;
    master.connect(ac.destination);
  }
  return master;
}

function audio(group: SoundGroup): AudioContext | null {
  if (!enabled || volume <= 0 || !groups[group]) return null;
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One enveloped oscillator note. */
function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  length: number,
  options: { type?: OscillatorType; gain?: number; slide?: number } = {},
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (options.slide)
    osc.frequency.exponentialRampToValueAtTime(freq * options.slide, start + length);
  const peak = options.gain ?? 0.15;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(out(ac));
  osc.start(start);
  osc.stop(start + length + 0.02);
}

/**
 * A short burst of filtered noise (the card's paper). `rise` fades it in instead of out, like a
 * parchment being pulled open.
 */
function swish(
  ac: AudioContext,
  start: number,
  length: number,
  freq: number,
  peak = 0.12,
  rise = false,
) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (rise ? Math.sin(t * Math.PI) : 1 - t);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = peak;
  src.connect(filter).connect(gain).connect(out(ac));
  src.start(start);
}

export function playSound(kind: DropSound) {
  const ac = audio("loot");
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  switch (kind) {
    case "flip":
      swish(ac, t, 0.09, 2400);
      break;
    case "rare":
      swish(ac, t, 0.09, 2400);
      tone(ac, 660, t + 0.04, 0.35, { type: "triangle", gain: 0.12 });
      tone(ac, 990, t + 0.12, 0.4, { type: "triangle", gain: 0.08 });
      break;
    case "legendary":
      swish(ac, t, 0.12, 1800);
      tone(ac, 196, t, 1.2, { type: "sawtooth", gain: 0.05 });
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(ac, f, t + 0.08 + i * 0.09, 0.9, { type: "triangle", gain: 0.1 }),
      );
      break;
    case "unique":
      swish(ac, t, 0.14, 1600);
      tone(ac, 130, t, 1.6, { type: "sawtooth", gain: 0.06, slide: 1.5 });
      [440, 554, 659, 880, 1109].forEach((f, i) =>
        tone(ac, f, t + 0.1 + i * 0.1, 1.2, { type: "sine", gain: 0.1 }),
      );
      break;
    case "rune":
      // The D2-style "clink" of a Rune hitting the ground.
      tone(ac, 1760, t, 0.25, { type: "square", gain: 0.05, slide: 0.9 });
      tone(ac, 2637, t + 0.05, 0.35, { type: "sine", gain: 0.08 });
      break;
    case "highRune":
      tone(ac, 1760, t, 0.25, { type: "square", gain: 0.05, slide: 0.9 });
      tone(ac, 220, t + 0.1, 1.4, { type: "sawtooth", gain: 0.06, slide: 2 });
      [880, 1320, 1760].forEach((f, i) =>
        tone(ac, f, t + 0.2 + i * 0.12, 1.1, { type: "sine", gain: 0.09 }),
      );
      break;
  }
}

/**
 * The menu sounds of UI plan step 8 (Juice): a soft tick on hover, a wooden click, a parchment
 * swish when a window opens or closes, a page turn for tabs, a coin for a gain and a dull knock
 * for a blocked button. Quieter than the drop sounds, so they never cover them.
 */
export type UiSound = "hover" | "click" | "blocked" | "open" | "close" | "tab" | "coin" | "notice";

/** Few milliseconds apart, the same sound would only buzz (five currencies counting at once). */
const UI_GAP_MS: Readonly<Record<UiSound, number>> = {
  hover: 45,
  click: 40,
  blocked: 120,
  open: 120,
  close: 120,
  tab: 60,
  coin: 140,
  notice: 200,
};
const lastPlayed = new Map<UiSound, number>();

/** Which Settings switch silences a menu sound. */
export const UI_SOUND_GROUP: Readonly<Record<UiSound, SoundGroup>> = {
  hover: "hover",
  click: "click",
  blocked: "click",
  tab: "click",
  open: "window",
  close: "window",
  coin: "coin",
  notice: "notice",
};

export function playUiSound(kind: UiSound) {
  const now = typeof performance === "undefined" ? 0 : performance.now();
  if (now - (lastPlayed.get(kind) ?? -Infinity) < UI_GAP_MS[kind]) return;
  const ac = audio(UI_SOUND_GROUP[kind]);
  if (!ac) return;
  lastPlayed.set(kind, now);
  const t = ac.currentTime + 0.005;
  switch (kind) {
    case "hover":
      tone(ac, 1400, t, 0.05, { type: "sine", gain: 0.018, slide: 1.1 });
      break;
    case "click":
      // A wooden knock: a low thump and a short bright tick on top.
      tone(ac, 190, t, 0.07, { type: "triangle", gain: 0.09, slide: 0.6 });
      tone(ac, 2100, t, 0.025, { type: "square", gain: 0.012 });
      break;
    case "blocked":
      tone(ac, 120, t, 0.12, { type: "triangle", gain: 0.08, slide: 0.8 });
      break;
    case "open":
      swish(ac, t, 0.22, 900, 0.07, true);
      tone(ac, 110, t + 0.05, 0.2, { type: "sine", gain: 0.06 });
      break;
    case "close":
      swish(ac, t, 0.16, 1300, 0.05);
      tone(ac, 150, t, 0.12, { type: "sine", gain: 0.04, slide: 0.7 });
      break;
    case "tab":
      swish(ac, t, 0.07, 3000, 0.05);
      break;
    case "coin":
      tone(ac, 1568, t, 0.12, { type: "triangle", gain: 0.035 });
      tone(ac, 2093, t + 0.05, 0.16, { type: "triangle", gain: 0.03 });
      break;
    case "notice":
      // A small brass chime with a breath of parchment: something happened on the side.
      swish(ac, t, 0.12, 2200, 0.03, true);
      tone(ac, 880, t + 0.02, 0.4, { type: "sine", gain: 0.05 });
      tone(ac, 1318, t + 0.1, 0.5, { type: "sine", gain: 0.04 });
      break;
  }
}
