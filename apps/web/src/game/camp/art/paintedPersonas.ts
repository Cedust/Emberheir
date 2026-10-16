import heirUrl from "../../../assets/camp/heir-camp.webp";
import kaelenUrl from "../../../assets/camp/personas/kaelen.webp";
import lioraUrl from "../../../assets/camp/personas/liora.webp";
import marishaUrl from "../../../assets/camp/personas/marisha.webp";
import nanUrl from "../../../assets/camp/personas/nan.webp";
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
}

export const PAINTED: Partial<Record<string, PaintedPersona>> = {
  heir: { url: heirUrl, h: 168, face: { size: "277% auto", pos: "66% 2%" } },
  nan: { url: nanUrl, h: 155, face: { size: "245% auto", pos: "51% 0%" } },
  kaelen: { url: kaelenUrl, h: 210, face: { size: "360% auto", pos: "76% 4%" } },
  liora: { url: lioraUrl, h: 195, face: { size: "320% auto", pos: "66% 16%" } },
  marisha: { url: marishaUrl, h: 185, face: { size: "290% auto", pos: "68% 0%" } },
  thoric: { url: thoricUrl, h: 195, face: { size: "240% auto", pos: "49% 0%" } },
};
