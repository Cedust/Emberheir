import { Assets, type Container, NineSliceSprite, Sprite, type Texture } from "pixi.js";
import plateUrl from "../../../assets/ui/hud-enemy-plate.webp";
import ringUrl from "../../../assets/ui/hud-orb-ring.webp";

/**
 * Timo's painted HUD parts (tools/art/cut_hud.py): the orb ring and the enemy Life plate. Until
 * they load (or if they fail) HudScene keeps its drawn shapes.
 */
export interface HudTextures {
  readonly ring: Texture;
  readonly plate: Texture;
}

/** The ring's opening in its texture (cut_hud.py prints it). */
const RING_HOLE = { x: 270, y: 256, r: 150 } as const;
/** Enemy plate slices: brass end caps left and right, the frame above and below the slot. */
const PLATE_SLICE = { side: 112, top: 32, bottom: 32 } as const;

let loading: Promise<HudTextures | null> | null = null;

export function loadHudTextures(): Promise<HudTextures | null> {
  loading ??= Promise.all([ringUrl, plateUrl].map((u) => Assets.load<Texture>(u))).then(
    ([ring, plate]) => (ring && plate ? { ring, plate } : null),
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
