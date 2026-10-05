import type { Burst, Fx } from "./fx";

/** The visible part of the arena in world pixels. */
export interface View {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly ground: number;
}

/** One kind of drifting particle; `rate` is per second across a 1440 px wide arena. */
interface Drift {
  readonly rate: number;
  readonly from: "top" | "ground" | "air";
  readonly burst: Omit<Burst, "x" | "y" | "count">;
}

const FALL = Math.PI / 2;
const RISE = -Math.PI / 2;

/** Act weather (arena tinted per Act, ui-look-v1.md): every act has its own air. */
const WEATHER: Record<number, readonly Drift[]> = {
  // Ashen Fields: grey ash sinking slowly.
  1: [
    {
      rate: 9,
      from: "top",
      burst: {
        kind: "bit",
        color: [0x8a8178, 0xb5aca0, 0x5e5750],
        angle: [FALL - 0.4, FALL + 0.2],
        speed: [25, 50],
        life: [9, 13],
        size: [5, 9],
        endSize: 0.8,
        wobble: 18,
        spin: 2,
        alpha: 0.7,
        layer: "back",
      },
    },
  ],
  // Rotwood: fireflies and drifting spores.
  2: [
    {
      rate: 4,
      from: "air",
      burst: {
        color: [0xd8f06a, 0xb5d82c],
        angle: [0, Math.PI * 2],
        speed: [8, 22],
        life: [3, 5],
        size: [10, 16],
        endSize: 0.6,
        wobble: 14,
        alpha: 0.85,
        layer: "back",
      },
    },
    {
      rate: 3,
      from: "top",
      burst: {
        kind: "bit",
        color: [0x6b7f3a, 0x8a6a3a, 0x4f6a2a],
        angle: [FALL - 0.6, FALL],
        speed: [35, 60],
        life: [9, 12],
        size: [10, 14],
        endSize: 1,
        wobble: 30,
        spin: 3,
        alpha: 0.9,
        layer: "back",
      },
    },
  ],
  // Ember Wastes: embers rising from the hot ground.
  3: [
    {
      rate: 12,
      from: "ground",
      burst: {
        color: [0xff6a2b, 0xffb13b, 0xff8a1f],
        angle: [RISE - 0.3, RISE + 0.3],
        speed: [50, 110],
        life: [2.5, 5],
        size: [9, 16],
        wobble: 16,
        layer: "back",
      },
    },
  ],
  // Frost Peaks: snow on the wind.
  4: [
    {
      rate: 26,
      from: "top",
      burst: {
        kind: "bit",
        color: [0xffffff, 0xe0f4ff, 0xbfe6ff],
        angle: [FALL - 0.5, FALL - 0.3],
        speed: [70, 120],
        life: [6, 9],
        size: [4, 8],
        endSize: 1,
        wobble: 12,
        spin: 2,
        alpha: 0.9,
        layer: "back",
      },
    },
  ],
  // Storm Spires: slanting rain.
  5: [
    {
      rate: 40,
      from: "top",
      burst: {
        color: [0xbfd8ff, 0xe0ecff],
        angle: [FALL + 0.18, FALL + 0.24],
        speed: [900, 1100],
        life: [0.8, 1],
        size: [4, 5],
        endSize: 1,
        stretch: 0.9,
        alpha: 0.45,
        layer: "back",
      },
    },
  ],
  // Void Rift: violet motes drifting up.
  6: [
    {
      rate: 8,
      from: "air",
      burst: {
        color: [0xa35cff, 0xc9a0ff, 0x6a3ad8],
        angle: [RISE - 0.5, RISE + 0.5],
        speed: [10, 30],
        life: [3, 5],
        size: [8, 16],
        endSize: 0.1,
        wobble: 20,
        alpha: 0.85,
        layer: "back",
      },
    },
  ],
  // Emberfall: golden embers falling from a burning sky.
  7: [
    {
      rate: 14,
      from: "top",
      burst: {
        color: [0xffb13b, 0xffd84a, 0xff6a2b],
        angle: [FALL - 0.3, FALL + 0.1],
        speed: [60, 110],
        life: [6, 9],
        size: [6, 10],
        endSize: 0.5,
        wobble: 22,
        layer: "back",
      },
    },
  ],
  // The Last Ember: white-gold sparks rising toward the last flame.
  8: [
    {
      rate: 16,
      from: "ground",
      burst: {
        color: [0xffffff, 0xffe9a8, 0xffb13b],
        angle: [RISE - 0.25, RISE + 0.25],
        speed: [60, 120],
        life: [3, 6],
        size: [6, 12],
        wobble: 10,
        layer: "back",
      },
    },
  ],
};

/** Carries fractional spawns between frames so low rates still emit. */
export class Weather {
  private carry: number[] = [];
  private readonly drifts: readonly Drift[];

  constructor(act: number) {
    this.drifts = WEATHER[act] ?? WEATHER[1] ?? [];
  }

  update(fx: Fx, view: View, dt: number): void {
    const width = (view.right - view.left) / 1440;
    this.drifts.forEach((d, i) => {
      const due = (this.carry[i] ?? 0) + d.rate * width * dt;
      const n = Math.floor(due);
      this.carry[i] = due - n;
      for (let k = 0; k < n; k++) {
        const x = fx.rand.range(view.left, view.right);
        const y =
          d.from === "top"
            ? view.top - 20
            : d.from === "ground"
              ? fx.rand.range(view.ground - 160, view.ground)
              : fx.rand.range(view.top + 60, view.ground - 60);
        fx.burst({ ...d.burst, x, y, count: 1 });
      }
    });
  }
}
