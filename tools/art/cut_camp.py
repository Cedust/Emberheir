# Saves Timo's painted camp backdrops (art/camp/camp-<act>-v1.png, 21:9) as WebP for
# apps/web/src/game/camp/art/CampScene.tsx. Every act is an edit of the Act 1 camp, so the stone
# ring, tents, wagons and anvil stay where the personas stand (lager-hintergruende-v1.md).
# Run from the repo root: python3 tools/art/cut_camp.py  (needs Pillow)
import os
from PIL import Image

SRC = '/mnt/project-files/art/camp/'
OUT = 'apps/web/src/assets/camp/'
# Act 1 (camp-ashen-fields.webp) was saved by PR #32 and stays as it is.
FILES = {
  'rotwood': 'camp-rotwood-v1.png',
  'ember-wastes': 'camp-ember-wastes-v1.png',
  'frost-peaks': 'camp-frost-peaks-v1.png',
  'storm-spires': 'camp-storm-spires-v1.png',
  'void-rift': 'camp-void-rift-v1.png',
  'emberfall': 'camp-emberfall-v1.png',
  'last-ember': 'camp-last-ember-v1.png',
}
SIZE = (1916, 821)  # the Act 1 camp, which CampScene.tsx is laid out on
# The Last Ember painted the camp 88 px lower than Act 1: lift it, and stretch the foreground
# strip below the plaza to fill the bottom again.
LIFT = {'last-ember': 88}
STRIP = 200

os.makedirs(OUT, exist_ok=True)
for aid, name in FILES.items():
  path = SRC + name
  if not os.path.exists(path):
    continue
  im = Image.open(path).convert('RGB')
  if im.size != SIZE:
    im = im.resize(SIZE, Image.Resampling.LANCZOS)
  lift = LIFT.get(aid, 0)
  if lift:
    w, h = SIZE
    out = Image.new('RGB', SIZE)
    out.paste(im.crop((0, lift, w, h - STRIP)), (0, 0))
    strip = im.crop((0, h - STRIP, w, h)).resize((w, STRIP + lift), Image.Resampling.LANCZOS)
    out.paste(strip, (0, h - STRIP - lift))
    im = out
  im.save(f'{OUT}camp-{aid}.webp', 'WEBP', quality=86, method=6)
  print(aid, '->', im.size, f'lift {lift}' if lift else '')
