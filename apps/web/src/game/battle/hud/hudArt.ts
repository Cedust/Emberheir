import { Assets, Container, NineSliceSprite, Rectangle, Sprite, Texture } from "pixi.js";
import beamUrl from "../../../assets/ui/hud-beam.webp";
import plateUrl from "../../../assets/ui/hud-enemy-plate.webp";
import ringUrl from "../../../assets/ui/hud-orb-ring.webp";

/**
 * Timo's painted HUD parts (tools/art/cut_hud.py): the orb ring, the enemy Life plate and the
 * beam along the bar. Until they load (or if they fail) HudScene keeps its drawn shapes.
 */
export interface HudTextures {
  readonly ring: Texture;
  readonly plate: Texture;
  readonly beam: Texture;
}

/** The ring's opening in its texture (cut_hud.py prints it). */
const RING_HOLE = { x: 270, y: 256, r: 150 } as const;
/** Enemy plate slices: brass end caps left and right, the frame above and below the slot. */
const PLATE_SLICE = { side: 112, top: 32, bottom: 32 } as const;
/** Beam: the end caps run to the first and last band; the piece between two bands repeats. */
const BEAM_END = 97;
const BEAM_TILE = 219;

let loading: Promise<HudTextures | null> | null = null;

export function loadHudTextures(): Promise<HudTextures | null> {
  loading ??= Promise.all([ringUrl, plateUrl, beamUrl].map((u) => Assets.load<Texture>(u))).then(
    ([ring, plate, beam]) => (ring && plate && beam ? { ring, plate, beam } : null),
    () => null,
  );
  return loading;
}

/** The painted ring around an orb of glass radius `r`, centred on the orb. */
export function orbRing(t: HudTextures, r: number): Sprite {
  const ring = new Sprite(t.ring);
  const s = (r + 3) / RING_HOLE.r;
  ring.scale.set(s);
  ring.position.set(-RING_HOLE.x * s, -RING_HOLE.y * s);
  return ring;
}

/** The wooden plate with brass end caps; its slot holds the rectangle (x, y, w, h). */
export function enemyPlate(t: HudTextures, x: number, y: number, w: number, h: number): Container {
  const slotH = t.plate.height - PLATE_SLICE.top - PLATE_SLICE.bottom;
  const s = (h + 6) / slotH;
  const plate = new NineSliceSprite({
    texture: t.plate,
    leftWidth: PLATE_SLICE.side,
    rightWidth: PLATE_SLICE.side,
    topHeight: PLATE_SLICE.top,
    bottomHeight: PLATE_SLICE.bottom,
  });
  plate.width = w / s + PLATE_SLICE.side * 2 - 40;
  plate.height = t.plate.height;
  plate.scale.set(s);
  plate.position.set(x - (PLATE_SLICE.side - 20) * s, y - 3 - PLATE_SLICE.top * s);
  return plate;
}

/** A wooden beam with brass bands from x0 to x1, `h` tall, centred on y. */
export function beam(t: HudTextures, x0: number, x1: number, y: number, h: number): Container {
  const root = new Container();
  const src = t.beam;
  const s = h / src.height;
  const part = (sx: number, sw: number) =>
    new Texture({ source: src.source, frame: new Rectangle(sx, 0, sw, src.height) });
  const left = new Sprite(part(0, BEAM_END));
  const right = new Sprite(part(src.width - BEAM_END, BEAM_END));
  const end = BEAM_END * s;
  const inner = Math.max(0, x1 - x0 - 2 * end);
  const n = Math.max(1, Math.round(inner / (BEAM_TILE * s)));
  const tw = inner / n;
  const tile = part(BEAM_END, BEAM_TILE);
  left.scale.set(s);
  left.position.set(x0, y - h / 2);
  right.scale.set(s);
  right.position.set(x1 - end, y - h / 2);
  root.addChild(left);
  for (let i = 0; i < n; i++) {
    const piece = new Sprite(tile);
    piece.scale.set(tw / BEAM_TILE, s);
    piece.position.set(x0 + end + i * tw, y - h / 2);
    root.addChild(piece);
  }
  root.addChild(right);
  return root;
}
