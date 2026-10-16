# Trims Timo's painted camp personas (art/personas/<id>-v1.png, facing right) to the figure and
# saves them as WebP for apps/web/src/game/camp/art/paintedPersonas.ts.
# Run from the repo root: python3 tools/art/cut_personas.py [id ...]  (needs Pillow and numpy)
# Without ids it cuts every persona that has a painting. A painting on black instead of a
# transparent background gets keyed out first.
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = '/mnt/project-files/art/personas/'
OUT = 'apps/web/src/assets/camp/personas/'
IDS = ['nan', 'thoric', 'marisha', 'liora', 'kaelen', 'nyssa', 'eldrin']
HEIGHT = 600  # figures stand ~150 stage px tall, the stage scales up to 2.4x on 4K


def key_black(im):
  """Black background connected to the edge goes; along it alpha follows brightness."""
  w, h = im.size
  m = im.convert('L').point(lambda v: 255 if v <= 4 else 0)
  for x in range(0, w, 4):
    for y in (0, h - 1):
      if m.getpixel((x, y)) == 255:
        ImageDraw.floodfill(m, (x, y), 128)
  for y in range(0, h, 4):
    for x in (0, w - 1):
      if m.getpixel((x, y)) == 255:
        ImageDraw.floodfill(m, (x, y), 128)
  bg = np.array(m) == 128
  band = np.array(Image.fromarray((bg * 255).astype('uint8')).filter(ImageFilter.MaxFilter(9))) > 0
  rgb = np.array(im.convert('RGB')).astype(float)
  # Next to the background the painting sits on black: the ink line (dark brown, ~60) and its
  # soft edge become alpha, and the colour is un-multiplied from black.
  alpha = np.where(band, np.clip(rgb.max(axis=2) / 60.0, 0, 1), 1.0)
  alpha[bg] = 0
  rgb = np.where(band[..., None], np.clip(rgb / np.maximum(alpha, 1e-3)[..., None], 0, 255), rgb)
  return Image.fromarray(np.dstack([rgb, alpha * 255]).astype('uint8'), 'RGBA')


for pid in sys.argv[1:] or IDS:
  path = f'{SRC}{pid}-v1.png'
  if not os.path.exists(path):
    continue
  im = Image.open(path)
  im = im.convert('RGBA') if 'A' in im.getbands() else key_black(im)
  # Faint haze around the figure does not count as the figure.
  box = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
  im = im.crop(box)
  w = round(im.width * HEIGHT / im.height)
  im = im.resize((w, HEIGHT), Image.Resampling.LANCZOS)
  im.save(f'{OUT}{pid}.webp', 'WEBP', quality=90, method=6)
  print(pid, box, '->', im.size)
