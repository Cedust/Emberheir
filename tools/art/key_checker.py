# Makes a painting transparent whose generator baked the grey-white "transparency" checkerboard
# into the pixels (art/enemies/cinder-tyrant-v1-raw.png). Every light, grey region goes, except
# inside the --keep boxes (e.g. a puff of smoke that is part of the painting).
# Inside --clear boxes every light or yellow pixel goes, dark ones (claws, outlines) stay: for a painted
# glow that the checker shows through (the spark over the Storm Caller's hand; code draws sparks).
# Light specks smaller than --min-area pixels stay too (highlights inside the figure).
# Run: python3 tools/art/key_checker.py <in.png> <out.png> [--keep x0,y0,x1,y1 ...] [--clear x0,y0,x1,y1 ...]
#   [--min-area n] [--grey lo,hi] [--halo chroma,lo,dist]
# --grey: the brightness range of the checker's greys when it is not the light grey-white one
# (120,215 for the mid-grey checker of art/icons/enemy-skill-sheet-b-v1-raw.png).
# --halo: a painted glow lets the checker show through, tinted. Grows the cut-out into greyish pixels
# (max - min below chroma, darkest channel at least lo) up to dist pixels from the plain checker;
# --keep boxes stay out of it. For glowing icon sheets where unmix_checker.py leaves checker patches
# (the light checker of enemy-skill-sheet-c-v1-raw.png, the grey one between B's lightning bolts).
# (needs Pillow, numpy and scipy)
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, dst, *rest = sys.argv[1:]
keep = [tuple(map(int, b.split(','))) for flag, b in zip(rest[::2], rest[1::2]) if flag == '--keep']
clear = [tuple(map(int, b.split(','))) for flag, b in zip(rest[::2], rest[1::2]) if flag == '--clear']
min_area = next((int(v) for flag, v in zip(rest[::2], rest[1::2]) if flag == '--min-area'), 0)
grey = next((list(map(int, v.split(','))) for flag, v in zip(rest[::2], rest[1::2]) if flag == '--grey'), None)
halo = next((list(map(int, v.split(','))) for flag, v in zip(rest[::2], rest[1::2]) if flag == '--halo'), None)

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
lo, hi = a.min(2), a.max(2)
if grey:
  checker = (hi - lo < 22) & (lo >= grey[0]) & (hi <= grey[1])
else:
  checker = (hi - lo < 22) & (lo > 190)

labels, _ = ndimage.label(checker)
remove = np.zeros_like(checker)
for i, sl in enumerate(ndimage.find_objects(labels), 1):
  y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
  if any(x0 >= k[0] and y0 >= k[1] and x1 <= k[2] and y1 <= k[3] for k in keep):
    continue
  part = labels[sl] == i
  if part.sum() < min_area:
    continue
  remove[sl] |= part

for x0, y0, x1, y1 in clear:
  remove[y0:y1, x0:x1] |= ((lo > 110) | (a[..., 1] > 150))[y0:y1, x0:x1]

if halo:
  kept = np.zeros_like(remove)
  for x0, y0, x1, y1 in keep:
    kept[y0:y1, x0:x1] = True
  near = ndimage.distance_transform_edt(~remove) <= halo[2]
  tinted = (hi - lo < halo[0]) & (lo >= halo[1]) & near & ~kept
  remove = ndimage.binary_propagation(remove, mask=remove | tinted)

# Shrink the figure by a pixel and soften the edge, so no light fringe of the checker stays.
alpha = Image.fromarray(np.where(remove, 0, 255).astype(np.uint8))
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
out = im.convert('RGBA')
out.putalpha(alpha)
out.save(dst)
print(dst, 'removed', round(remove.mean() * 100, 1), '%')
