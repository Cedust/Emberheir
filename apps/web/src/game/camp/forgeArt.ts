import type { HeatBehavior } from "@emberheir/sim";
import { Assets, type Texture } from "pixi.js";
import forgeUrl from "../../assets/forge/forge.webp";
import forgeFrontUrl from "../../assets/forge/forge-front.webp";
import lidUrl from "../../assets/forge/lid.webp";
import { HEAT_FORM_ICONS } from "../../ui/gameIcons";

/**
 * Timo's painted Heat Forge for the Heirloom (art/icons/heat-forge-sheet-v1.png, cut by
 * tools/art/cut_heat_forge.py): a cold stone forge with four fire bowls, the same forge with the
 * bowls' insides cut away (drawn over the Heat Form icons, so they sit in the coals) and an iron
 * lid for a bowl that is not open yet. Fire and glow are drawn by the scene.
 */

/** Centres of the four coal beds, as shares of the forge's width and height (printed by the cut). */
export const FORGE_BOWLS: readonly number[] = [0.2138, 0.4215, 0.6292, 0.8369];
export const FORGE_BOWL_Y = 0.1344;
/** A coal bed's half width and half height, as shares of the forge's width. */
export const FORGE_BED = { a: 116 / 1637, b: 44 / 1637 };
/** The lid's width as a share of the forge's width (the bowl's outer rim). */
export const FORGE_LID = 312 / 1637;

export interface ForgeTextures {
  readonly forge: Texture;
  readonly front: Texture;
  readonly lid: Texture;
  readonly icons: Readonly<Record<HeatBehavior, Texture>>;
}

let loaded: ForgeTextures | null = null;
let loading: Promise<ForgeTextures> | null = null;

/** The forge's paintings if they are loaded, else a promise that loads them. */
export function forgeTextures(): ForgeTextures | Promise<ForgeTextures> {
  if (loaded) return loaded;
  loading ??= (async () => {
    const forms = Object.keys(HEAT_FORM_ICONS) as HeatBehavior[];
    const [forge, front, lid, ...icons] = await Promise.all(
      [forgeUrl, forgeFrontUrl, lidUrl, ...forms.map((f) => HEAT_FORM_ICONS[f])].map((u) =>
        Assets.load<Texture>(u),
      ),
    );
    const textures: ForgeTextures = {
      forge: forge as Texture,
      front: front as Texture,
      lid: lid as Texture,
      icons: Object.fromEntries(forms.map((f, i) => [f, icons[i] as Texture])) as Record<
        HeatBehavior,
        Texture
      >,
    };
    loaded = textures;
    return textures;
  })();
  return loading;
}
