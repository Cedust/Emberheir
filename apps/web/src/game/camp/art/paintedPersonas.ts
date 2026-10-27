import eldrinUrl from "../../../assets/camp/personas/eldrin.webp";
import heirUrl from "../../../assets/camp/heir-camp.webp";
import kaelenUrl from "../../../assets/camp/personas/kaelen.webp";
import kaelenFace from "../../../assets/camp/personas/kaelen-portrait.webp";
import lioraUrl from "../../../assets/camp/personas/liora.webp";
import lioraFace from "../../../assets/camp/personas/liora-portrait.webp";
import marishaUrl from "../../../assets/camp/personas/marisha.webp";
import marishaFace from "../../../assets/camp/personas/marisha-portrait.webp";
import nanUrl from "../../../assets/camp/personas/nan.webp";
import nanFace from "../../../assets/camp/personas/nan-portrait.webp";
import nyssaUrl from "../../../assets/camp/personas/nyssa.webp";
import nyssaFace from "../../../assets/camp/personas/nyssa-portrait.webp";
import thoricUrl from "../../../assets/camp/personas/thoric.webp";
import thoricFace from "../../../assets/camp/personas/thoric-portrait.webp";
import dummyUrl from "../../../assets/camp/personas/training-dummy.webp";

/**
 * Personas Timo has painted (design/notes/personas-art-v1.md): the image replaces the SVG figure
 * in the camp and the head becomes the round portrait. Cut by tools/art/cut_personas.py; every
 * image faces right and is trimmed to the figure.
 */
export interface PaintedPersona {
  readonly url: string;
  /** On-screen height at fs = 1, in stage pixels. */
  readonly h: number;
  /** Round portrait: CSS background-size and background-position over the head, on `url` when
   * the portrait comes from the persona's first painting (looking at the camera, Timo). */
  readonly face: { readonly url?: string; readonly size: string; readonly pos: string };
  /** Where the head sits left or right of the figure's middle at fs = 1 (stage px, facing right):
   * the camp marker floats above it. */
  readonly head: number;
  /** The image shifts by this share of its width, so an off-centre post stands on the spot. */
  readonly shift?: number;
  /** Overrides "faces the Hearthfire": false = never mirrored (Eldrin already looks left at the
   * fire), true = always mirrored (Kaelen turns left to his Training Dummy). */
  readonly turn?: boolean;
  /** An empty board in the painting the camp writes on: % of the image (left, top, w, h) and
   * the board's tilt in degrees. */
  readonly sign?: readonly [number, number, number, number, number];
  /** A painted prop beside the figure, behind it and turned with it (Kaelen's Training Dummy):
   * its height and where its middle stands right of the figure's middle at fs = 1 (stage px). */
  readonly prop?: { readonly url: string; readonly h: number; readonly x: number };
}

/** Whether the painted figure of a persona standing at `x` is mirrored (painted facing right). */
export function paintedFlip(art: PaintedPersona, x: number, hearthX: number): boolean {
  return art.turn ?? x > hearthX;
}

export const PAINTED: Partial<Record<string, PaintedPersona>> = {
  eldrin: {
    url: eldrinUrl,
    h: 340,
    face: { size: "255% auto", pos: "3% -1%" },
    head: -37,
    shift: 0.136,
    turn: false,
    sign: [6, 38.7, 82, 12, 2.1],
  },
  heir: { url: heirUrl, h: 168, face: { size: "277% auto", pos: "66% 2%" }, head: 16 },
  nan: {
    url: nanUrl,
    h: 160,
    face: { url: nanFace, size: "245% auto", pos: "51% 0%" },
    head: 13,
  },
  kaelen: {
    url: kaelenUrl,
    h: 170,
    face: { url: kaelenFace, size: "360% auto", pos: "76% 4%" },
    head: 11,
    turn: true,
    prop: { url: dummyUrl, h: 150, x: 170 },
  },
  liora: {
    url: lioraUrl,
    h: 165,
    face: { url: lioraFace, size: "210% auto", pos: "59% 8%" },
    head: 18,
  },
  marisha: {
    url: marishaUrl,
    h: 150,
    face: { url: marishaFace, size: "290% auto", pos: "68% 0%" },
    head: 20,
  },
  nyssa: {
    url: nyssaUrl,
    h: 185,
    face: { url: nyssaFace, size: "280% auto", pos: "72% 13%" },
    head: 7,
  },
  thoric: {
    url: thoricUrl,
    h: 195,
    face: { url: thoricFace, size: "240% auto", pos: "49% 0%" },
    head: 2,
  },
};
