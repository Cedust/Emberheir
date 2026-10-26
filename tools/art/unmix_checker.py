# Makes a sheet transparent whose generator baked a grey "transparency" checkerboard into the
# pixels AND painted soft glows over it (the skill sheets B, D and E, runen-skill-icons-art-v1.md).
# key_checker.py only removes the bare checker; here every pixel is unmixed against the two checker
# greys: a glow over the checker keeps its colour and becomes half transparent. Inside a figure
# (closed by its ink outline) everything stays opaque, so grey steel never turns see-through.
# Run: python3 tools/art/unmix_checker.py <in.png> <out.png>   (needs Pillow, numpy and scipy)
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1:3]
c = np.asarray(Image.open(src).convert('RGB')).astype(float)

# The two checker greys: the light and dark half of the grey border pixels.
border = np.concatenate([c[:8].reshape(-1, 3), c[-8:].reshape(-1, 3), c[:, :8].reshape(-1, 3)])
grey = border.mean(1)
mid = (grey.min() + grey.max()) / 2
greys = [grey[grey < mid].mean(), grey[grey >= mid].mean()]


def alpha_over(b):
  # The least alpha that explains colour c as a foreground blended over grey b.
  up = (c - b) / (255 - b)
  down = (b - c) / b
  return np.where(c > b, up, down).max(2).clip(0, 1)


alpha = np.minimum(*(alpha_over(b) for b in greys))
alpha = np.where(alpha < 0.2, 0, (alpha - 0.2) / 0.8)
# A figure: strong pixels, closed and with its holes filled (grey blades inside ink outlines).
# Small holes only: the open loop of a candle handle shows what is behind it.
solid = ndimage.binary_closing(alpha > 0.6, iterations=3)
holes, _ = ndimage.label(ndimage.binary_fill_holes(solid) & ~solid)
sizes = np.bincount(holes.ravel())
core = solid | ((holes > 0) & (sizes[holes] < 1500))
core = ndimage.binary_opening(core, iterations=2)
alpha = np.where(core, 1, alpha)
# Soften the glow, whose alpha still shows a trace of the checker.
soft = ndimage.gaussian_filter(alpha, 4)
alpha = np.where(core, 1, np.minimum(alpha, soft * 1.15))

# The colour under the glow: undo the blend with the nearer checker grey.
b = np.where(np.abs(c.mean(2, keepdims=True) - greys[0]) < np.abs(c.mean(2, keepdims=True) - greys[1]), greys[0], greys[1])
a3 = np.maximum(alpha[..., None], 1e-3)
fg = np.where(core[..., None], c, ((c - (1 - a3) * b) / a3)).clip(0, 255)
out = np.dstack([fg, alpha * 255]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(dst)
print(dst, f'transparent {(alpha == 0).mean():.0%}')
