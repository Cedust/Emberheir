# Trims Timo's painted arena enemies (art/enemies/<id>-v1.png, transparent, facing left) to the
# figure and saves them as WebP for apps/web/src/game/battle/enemyArt.ts (PAINTED_ENEMIES).
# Run from the repo root: python3 tools/art/cut_enemies.py [id ...]  (needs Pillow)
import os
import sys
from PIL import Image

SRC = '/mnt/project-files/art/enemies/'
OUT = 'apps/web/src/game/battle/enemies/'
IDS = [
  'ashen-brute', 'ashen-skirmisher', 'cinder-caster', 'gorrak', 'ember-thief',
  'barkhide', 'rotwood-stalker', 'blight-spitter', 'mossbound-warden', 'mother-of-rot',
  'magma-brute', 'cinder-imp', 'flame-caller', 'obsidian-guard', 'cinder-tyrant',
]
HEIGHT = 900  # enemies stand up to ~450 stage px tall, the stage scales up to 2.4x on 4K

os.makedirs(OUT, exist_ok=True)
for eid in sys.argv[1:] or IDS:
  path = f'{SRC}{eid}-v1.png'
  if not os.path.exists(path):
    continue
  im = Image.open(path).convert('RGBA')
  # Faint glow around the figure does not count as the figure.
  box = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
  im = im.crop(box)
  h = min(HEIGHT, im.height)
  im = im.resize((round(im.width * h / im.height), h), Image.Resampling.LANCZOS)
  im.save(f'{OUT}{eid}.webp', 'WEBP', quality=88, method=6)
  print(eid, box, '->', im.size)
