import { BlurFilter, ColorMatrixFilter, Container, Graphics } from "pixi.js";

/**
 * A soft glow around a figure's outline, baked once into a texture: its own art turned into a
 * white silhouette and blurred. Tint and alpha colour it (red for a Heavy Attack wind-up, the
 * Harvester's phase); scaling it from the feet lets it stand a little past the figure.
 */
export function silhouetteGlow(art: Container, blur: number): Container {
  const white = new ColorMatrixFilter();
  white.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  const inner = new Container();
  inner.addChild(art);
  inner.filters = [white, new BlurFilter({ strength: blur, quality: 2 })];
  const b = inner.getLocalBounds();
  const pad = blur * 4;
  const room = new Graphics()
    .rect(b.minX - pad, b.minY - pad, b.width + pad * 2, b.height + pad * 2)
    .fill({ color: 0x000000, alpha: 0.001 });
  const wrap = new Container();
  wrap.addChild(room, inner);
  wrap.blendMode = "add";
  wrap.cacheAsTexture(true);
  return wrap;
}
