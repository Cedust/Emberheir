/**
 * The six drop sounds of the "Spielspaß" plan (Teil 3 D), synthesized with Web Audio so the game
 * needs no sound files: card flip, Rare, Legendary, Unique, Rune and high Rune.
 */
export type DropSound = "flip" | "rare" | "legendary" | "unique" | "rune" | "highRune";

let enabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === "undefined" || !("AudioContext" in window)) return null;
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
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

/** A short burst of filtered noise (the card's paper). */
function swish(ac: AudioContext, start: number, length: number, freq: number, peak = 0.12) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.value = peak;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(start);
}

export function playSound(kind: DropSound) {
  const ac = audio();
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
