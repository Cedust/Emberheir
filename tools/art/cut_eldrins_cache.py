# Cuts Timo's painted Eldrin's Cache (design/notes/eldrins-cache-art-v1.md: a chest in a raven's
# nest, closed and open) into apps/web/src/assets/benches/eldrins-cache-*.webp for the Road window.
# Run from the repo root: python3 tools/art/cut_eldrins_cache.py  (needs Pillow)
# Both are cut with the same box so the open chest stands exactly where the closed one did. Drawn
# up to ~200 stage px wide and the stage scales up to 2.4x on 4K, so each keeps 480 px of width.
from PIL import Image

ART = '/mnt/project-files/art/ui/benches/'
OUT = 'apps/web/src/assets/benches/'
NAMES = ['closed', 'open']

images = {n: Image.open(f'{ART}eldrins-cache-{n}-v1.png').convert('RGBA') for n in NAMES}
boxes = [im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() for im in images.values()]
box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
for name, im in images.items():
  im = im.crop(box)
  scale = min(1, 480 / im.width)
  out = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
  out.save(f'{OUT}eldrins-cache-{name}.webp', quality=90, method=6)
  print(f'{name} {out.width}x{out.height}')
