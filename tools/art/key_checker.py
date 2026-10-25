# Makes a painting transparent whose generator baked the grey-white "transparency" checkerboard
# into the pixels (art/enemies/cinder-tyrant-v1-raw.png). Every light, grey region goes, except
# inside the --keep boxes (e.g. a puff of smoke that is part of the painting).
# Run: python3 tools/art/key_checker.py <in.png> <out.png> [--keep x0,y0,x1,y1 ...]
# (needs Pillow, numpy and scipy)
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, dst, *rest = sys.argv[1:]
keep = [tuple(map(int, b.split(','))) for flag, b in zip(rest[::2], rest[1::2]) if flag == '--keep']

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
lo, hi = a.min(2), a.max(2)
checker = (hi - lo < 22) & (lo > 190)

labels, _ = ndimage.label(checker)
remove = np.zeros_like(checker)
for i, sl in enumerate(ndimage.find_objects(labels), 1):
  y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
  if any(x0 >= k[0] and y0 >= k[1] and x1 <= k[2] and y1 <= k[3] for k in keep):
    continue
  remove[sl] |= labels[sl] == i

# Shrink the figure by a pixel and soften the edge, so no light fringe of the checker stays.
alpha = Image.fromarray(np.where(remove, 0, 255).astype(np.uint8))
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
out = im.convert('RGBA')
out.putalpha(alpha)
out.save(dst)
print(dst, 'removed', round(remove.mean() * 100, 1), '%')
