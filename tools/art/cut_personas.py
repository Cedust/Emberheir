# Trims Timo's painted camp personas (art/personas/<id>-v1.png, transparent PNG, facing right)
# to the figure and saves them as WebP for apps/web/src/game/camp/art/paintedPersonas.ts.
# Run from the repo root: python3 tools/art/cut_personas.py [id ...]  (needs Pillow)
# Without ids it cuts every persona that has a painting.
import os
import sys
from PIL import Image

SRC = '/mnt/project-files/art/personas/'
OUT = 'apps/web/src/assets/camp/personas/'
IDS = ['nan', 'thoric', 'marisha', 'liora', 'kaelen', 'nyssa', 'eldrin']
HEIGHT = 600  # figures stand ~150 stage px tall, the stage scales up to 2.4x on 4K

for pid in sys.argv[1:] or IDS:
  path = f'{SRC}{pid}-v1.png'
  if not os.path.exists(path):
    continue
  im = Image.open(path).convert('RGBA')
  # Faint haze around the figure does not count as the figure.
  box = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
  im = im.crop(box)
  w = round(im.width * HEIGHT / im.height)
  im = im.resize((w, HEIGHT), Image.Resampling.LANCZOS)
  im.save(f'{OUT}{pid}.webp', 'WEBP', quality=90, method=6)
  print(pid, box, '->', im.size)
