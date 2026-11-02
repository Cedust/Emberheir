import type { MusicTrack } from "./musicCatalog";

/**
 * The music player (ported from Crucible): two decks that take turns with an equal-power
 * crossfade. Each deck streams a song through an `HTMLAudioElement` (a decoded song would take
 * ~90 MB), and shortly before `loopEnd` fades back to `loopStart`, so a song never ends.
 *
 * ```text
 * deck A ┐
 * deck B ┴→ duck (Gain) → filter (low-pass) → master (Gain = Music Volume) → out
 * ```
 *
 * Browsers allow sound only after a gesture: the context is made on the first `pointerdown` or
 * `keydown`. Without Web Audio (Node, tests) every call does nothing. A hidden tab fades out and
 * suspends. The UI sounds (ui/sound.ts) have their own context and their own volume.
 */

export interface MusicMix {
  readonly on: boolean;
  /** 0..1, as on the slider. */
  readonly volume: number;
}

export interface PlayOptions {
  /** Start in seconds. */
  readonly at: number;
  /** Length of the crossfade from the song that plays now. */
  readonly fadeS: number;
}

export interface MusicPlayer {
  /** Hooks up the unlock and visibility listeners; returns the undo. */
  install: () => () => void;
  setMix: (mix: MusicMix) => void;
  play: (track: MusicTrack, options: PlayOptions) => void;
  /** Fades out; the spot is kept. */
  stop: (fadeS: number) => void;
  setDampened: (dampened: boolean) => void;
  /** Where a song was faded out, `null` if it never played. */
  positionOf: (id: string) => number | null;
  forget: (id: string) => void;
  /** Called once sound is unlocked (the controller starts its song then). */
  onReady: (listener: () => void) => void;
}

/** Crossfade of the loop jump. */
export const LOOP_CROSSFADE_S = 2;
const DAMPENED_GAIN = 0.5;
const DAMPENED_FILTER_HZ = 1_200;
const OPEN_FILTER_HZ = 20_000;
const SMOOTH_S = 0.15;
const HIDE_S = 0.12;
const WATCH_MS = 200;
const CURVE_POINTS = 32;

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/** Slider value 0..1 → gain. The curve `v²` follows the ear. */
export function volumeToGain(volume: number): number {
  const v = Math.min(Math.max(volume, 0), 1);
  return v * v;
}

/** An equal-power curve: fading in follows the sine, fading out the cosine. */
export function equalPowerCurve(from: number, to: number, points = CURVE_POINTS): Float32Array {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * (Math.PI / 2);
    const shape = to >= from ? Math.sin(x) : 1 - Math.cos(x);
    curve[i] = from + (to - from) * shape;
  }
  return curve;
}

/** Whether a song is so near `loopEnd` that the loop crossfade has to begin. */
export function isNearEnd(track: MusicTrack, time: number): boolean {
  return time >= track.loopEnd - LOOP_CROSSFADE_S;
}

function fadeTo(param: AudioParam, target: number, now: number, durationS: number) {
  const from = param.value;
  param.cancelScheduledValues(now);
  if (durationS <= 0 || from === target) param.setValueAtTime(target, now);
  else param.setValueCurveAtTime(equalPowerCurve(from, target), now, durationS);
}

interface Deck {
  readonly element: HTMLAudioElement;
  readonly gain: GainNode;
  track: MusicTrack | null;
  pauseTimer: ReturnType<typeof setTimeout> | null;
}

interface Rig {
  readonly context: AudioContext;
  readonly master: GainNode;
  readonly filter: BiquadFilterNode;
  readonly duck: GainNode;
  readonly decks: readonly [Deck, Deck];
}

export interface PlayerOptions {
  createContext?: () => AudioContext | null;
  createElement?: () => HTMLAudioElement;
  gestureTarget?: Pick<EventTarget, "addEventListener" | "removeEventListener"> | null;
  visibility?:
    | (Pick<EventTarget, "addEventListener" | "removeEventListener"> & {
        readonly visibilityState: DocumentVisibilityState;
      })
    | null;
}

export function createMusicPlayer({
  createContext = () =>
    typeof AudioContext === "undefined" ? null : new AudioContext({ latencyHint: "playback" }),
  createElement = () => new Audio(),
  gestureTarget = typeof window === "undefined" ? null : window,
  visibility = typeof document === "undefined" ? null : document,
}: PlayerOptions = {}): MusicPlayer {
  let rig: Rig | null = null;
  let mix: MusicMix = { on: true, volume: 0.5 };
  let active: Deck | null = null;
  let watchTimer: ReturnType<typeof setInterval> | null = null;
  let suspendTimer: ReturnType<typeof setTimeout> | null = null;
  let dampened = false;
  const positions = new Map<string, number>();
  const ready = new Set<() => void>();
  const hidden = () => visibility?.visibilityState === "hidden";

  function applyMix(timeConstant = SMOOTH_S / 3) {
    if (!rig) return;
    const target = !mix.on || hidden() ? 0 : volumeToGain(mix.volume);
    rig.master.gain.cancelScheduledValues(rig.context.currentTime);
    rig.master.gain.setTargetAtTime(target, rig.context.currentTime, timeConstant);
  }

  function applyDampening() {
    if (!rig) return;
    const now = rig.context.currentTime;
    rig.duck.gain.setTargetAtTime(dampened ? DAMPENED_GAIN : 1, now, SMOOTH_S);
    rig.filter.frequency.setTargetAtTime(
      dampened ? DAMPENED_FILTER_HZ : OPEN_FILTER_HZ,
      now,
      SMOOTH_S,
    );
  }

  function createDeck(context: AudioContext, duck: GainNode): Deck {
    const element = createElement();
    element.preload = "auto";
    const gain = context.createGain();
    gain.gain.value = 0;
    context.createMediaElementSource(element).connect(gain);
    gain.connect(duck);
    return { element, gain, track: null, pauseTimer: null };
  }

  function unlock() {
    if (!rig) {
      let context: AudioContext | null = null;
      try {
        context = createContext();
      } catch {
        // No free audio device: the game plays on in silence.
      }
      if (!context) return;
      const master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = OPEN_FILTER_HZ;
      filter.connect(master);
      const duck = context.createGain();
      duck.connect(filter);
      rig = {
        context,
        master,
        filter,
        duck,
        decks: [createDeck(context, duck), createDeck(context, duck)],
      };
      applyMix();
      applyDampening();
      ready.forEach((listener) => listener());
    }
    if (rig.context.state === "suspended" && !hidden()) void rig.context.resume().catch(() => {});
  }

  function onVisibility() {
    if (!rig) return;
    if (suspendTimer) clearTimeout(suspendTimer);
    suspendTimer = null;
    applyMix(HIDE_S);
    if (hidden()) {
      const context = rig.context;
      suspendTimer = setTimeout(() => void context.suspend().catch(() => {}), 500);
    } else {
      void rig.context.resume().catch(() => {});
    }
  }

  function clearPause(deck: Deck) {
    if (deck.pauseTimer) clearTimeout(deck.pauseTimer);
    deck.pauseTimer = null;
  }

  /** Fades a deck out, keeps its spot, and pauses the element after the fade. */
  function release(deck: Deck, now: number, fadeS: number) {
    if (deck.track) positions.set(deck.track.id, deck.element.currentTime);
    deck.track = null;
    fadeTo(deck.gain.gain, 0, now, fadeS);
    clearPause(deck);
    deck.pauseTimer = setTimeout(
      () => {
        deck.pauseTimer = null;
        deck.element.pause();
      },
      fadeS * 1000 + 100,
    );
  }

  function watch() {
    const track = active?.track;
    if (active && track && isNearEnd(track, active.element.currentTime))
      play(track, { at: track.loopStart, fadeS: LOOP_CROSSFADE_S });
  }

  function play(track: MusicTrack, options: PlayOptions) {
    if (!rig) return;
    const now = rig.context.currentTime;
    const [a, b] = rig.decks;
    const target = active === a ? b : a;
    if (active) release(active, now, options.fadeS);
    clearPause(target);
    if (!target.element.src.endsWith(track.url)) target.element.src = track.url;
    target.element.currentTime = options.at;
    target.track = track;
    // An element that cannot decode the file stays silent; the game goes on.
    void target.element.play().catch(() => {});
    fadeTo(target.gain.gain, dbToGain(track.gainDb), now, options.fadeS);
    active = target;
    watchTimer ??= setInterval(watch, WATCH_MS);
  }

  return {
    install: () => {
      const events = ["pointerdown", "keydown"] as const;
      events.forEach((t) => gestureTarget?.addEventListener(t, unlock, true));
      visibility?.addEventListener("visibilitychange", onVisibility);
      return () => {
        events.forEach((t) => gestureTarget?.removeEventListener(t, unlock, true));
        visibility?.removeEventListener("visibilitychange", onVisibility);
      };
    },
    setMix: (next) => {
      mix = next;
      applyMix();
    },
    play,
    stop: (fadeS) => {
      if (!rig || !active) return;
      release(active, rig.context.currentTime, fadeS);
      active = null;
      if (watchTimer) clearInterval(watchTimer);
      watchTimer = null;
    },
    setDampened: (next) => {
      if (next === dampened) return;
      dampened = next;
      applyDampening();
    },
    positionOf: (id) => positions.get(id) ?? null,
    forget: (id) => void positions.delete(id),
    onReady: (listener) => {
      ready.add(listener);
      if (rig) listener();
    },
  };
}
