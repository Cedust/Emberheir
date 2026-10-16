import eldrinUrl from "../../../assets/camp/personas/eldrin.webp";
import heirUrl from "../../../assets/camp/heir-camp.webp";
import kaelenUrl from "../../../assets/camp/personas/kaelen.webp";
import lioraUrl from "../../../assets/camp/personas/liora.webp";
import marishaUrl from "../../../assets/camp/personas/marisha.webp";
import nanUrl from "../../../assets/camp/personas/nan.webp";
import nyssaUrl from "../../../assets/camp/personas/nyssa.webp";
import thoricUrl from "../../../assets/camp/personas/thoric.webp";

/**
 * Personas Timo has painted (design/notes/personas-art-v1.md): the image replaces the SVG figure
 * in the camp and the head becomes the round portrait. Cut by tools/art/cut_personas.py; every
 * image faces right and is trimmed to the figure.
 */
export interface PaintedPersona {
  readonly url: string;
  /** On-screen height at fs = 1, in stage pixels. */
  readonly h: number;
  /** Round portrait: CSS background-size and background-position over the head. */
  readonly face: { readonly size: string; readonly pos: string };
  /** Where the head sits left or right of the figure's middle at fs = 1 (stage px, facing right):
   * the camp marker floats above it. */
  readonly head: number;
  /** The image shifts by this share of its width, so an off-centre post stands on the spot. */
  readonly shift?: number;
  /** Already faces the right way: never mirrored (Eldrin looks left at the fire). */
  readonly fixed?: boolean;
  /** An empty board in the painting the camp writes on: % of the image (left, top, w, h) and
   * the board's tilt in degrees. */
  readonly sign?: readonly [number, number, number, number, number];
}

export const PAINTED: Partial<Record<string, PaintedPersona>> = {
  eldrin: {
    url: eldrinUrl,
    h: 340,
    face: { size: "425% auto", pos: "2% 1.5%" },
    head: -37,
    shift: 0.136,
    fixed: true,
    sign: [3, 38.9, 82, 11.9, 2.6],
  },
  heir: { url: heirUrl, h: 168, face: { size: "277% auto", pos: "66% 2%" }, head: 16 },
  nan: { url: nanUrl, h: 155, face: { size: "245% auto", pos: "51% 0%" }, head: 0 },
  kaelen: { url: kaelenUrl, h: 210, face: { size: "360% auto", pos: "76% 4%" }, head: 32 },
  liora: { url: lioraUrl, h: 195, face: { size: "320% auto", pos: "66% 16%" }, head: 15 },
  marisha: { url: marishaUrl, h: 185, face: { size: "290% auto", pos: "68% 0%" }, head: 18 },
  nyssa: { url: nyssaUrl, h: 175, face: { size: "280% auto", pos: "72% 13%" }, head: 20 },
  thoric: { url: thoricUrl, h: 195, face: { size: "240% auto", pos: "49% 0%" }, head: 0 },
};
