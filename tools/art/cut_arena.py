# Saves Timo's painted arena backdrops (art/arena/<act>-v1.png, 21:9) as WebP for
# apps/web/src/game/battle/arenaBackdrop.ts.
# Run from the repo root: python3 tools/art/cut_arena.py  (needs Pillow)
import os
from PIL import Image

SRC = '/mnt/project-files/art/arena/'
OUT = 'apps/web/src/assets/arena/'
IDS = ['ashen-fields', 'rotwood', 'ember-wastes', 'frost-peaks', 'storm-spires']
WIDTH = 1916  # covers a 16:9 stage up to 2.4x on 4K without a visible blur

os.makedirs(OUT, exist_ok=True)
for aid in IDS:
  path = f'{SRC}{aid}-v1.png'
  if not os.path.exists(path):
    continue
  im = Image.open(path).convert('RGB')
  if im.width > WIDTH:
    im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.Resampling.LANCZOS)
  im.save(f'{OUT}{aid}.webp', 'WEBP', quality=86, method=6)
  print(aid, '->', im.size)
