import { Stage } from "../../ui/Stage";
import { Gallery, type GalleryConfig } from "./EffectGallery";
import { SFX_REVIEW_KEY } from "./review";
import { SFX, SFX_GROUPS } from "./sfxList";

const SFX_GALLERY: GalleryConfig = {
  title: "SFX Gallery",
  intro:
    "Jeder Kampf-Sound einzeln, mit der Kampfanimation, die ihn auslöst. Klick einen an, er spielt in der Arena rechts.",
  entries: SFX,
  groups: SFX_GROUPS,
  listName: "Sounds",
  seeLabel: "Was man hört",
  reviewKey: SFX_REVIEW_KEY,
  exportKind: "emberheir-sfx-review",
  filePrefix: "sfx-auswahl",
  needsSound: true,
};

/** `?sfx`: every battle sound with its arena moment (game/effects/sfxList.ts). */
export function SfxGallery() {
  return (
    <Stage>
      <Gallery config={SFX_GALLERY} />
    </Stage>
  );
}
