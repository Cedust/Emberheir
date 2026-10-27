# Cuts Timo's painted Heat Forge (design/notes/heat-form-esse-art-v1.md, sheet 13): the cold forge
# with its four fire bowls and the iron lid, into apps/web/src/assets/forge/*.webp. The Heirloom
# (camp/MasteryScene.ts) sets the Heat Form icons into the bowls and lights the chosen one in code.
# forge-front.webp is the same forge with the bowls' insides (down to the coal bed's front edge) cut
# away: drawn over the icons, its front rims hide their feet, so they sit in the coals.
# Run from the repo root: python3 tools/art/cut_heat_forge.py [sheet.png]  (needs Pillow)
# Prints the bowls' centres as shares of the cut forge's size (FORGE_BOWLS in MasteryScene.ts).
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/icons/heat-forge-sheet-v1.png'
OUT = 'apps/web/src/assets/forge/'
SPLIT = 1730  # empty column between the forge (left) and the lid (right)
# Centres of the coal beds in the sheet, picked by eye (they sit 340 px apart).
BOWLS = [(395, 240), (735, 240), (1075, 240), (1415, 240)]
# Half width and half height of a coal bed (the inside of a bowl's rim).
BED = (116, 44)
WIDTH = {'forge': 1200, 'lid': 260}

im = Image.open(SRC).convert('RGBA')
# The generator leaves faint smudges around the art: drop nearly invisible pixels.
im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 12 else a))
for name, part in (('forge', (0, 0, SPLIT, im.height)), ('lid', (SPLIT, 0, im.width, im.height))):
  piece = im.crop(part)
  box = piece.getchannel('A').getbbox()
  piece = piece.crop(box)
  scale = WIDTH[name] / piece.width
  size = (WIDTH[name], round(piece.height * scale))
  out = piece.resize(size, Image.Resampling.LANCZOS)
  out.save(f'{OUT}{name}.webp', quality=90, method=6)
  print(f'{name} {out.width}x{out.height}')
  if name == 'forge':
    front = piece.copy()
    mask = front.getchannel('A')
    alpha = mask.load()
    a, b = BED
    for cx, cy in BOWLS:
      cx, cy = cx - box[0], cy - box[1]
      for x in range(cx - a, cx + a + 1):
        edge = cy + b * (1 - ((x - cx) / a) ** 2) ** 0.5
        for y in range(0, int(edge)):
          alpha[x, y] = 0
    front.putalpha(mask)
    front.resize(size, Image.Resampling.LANCZOS).save(f'{OUT}forge-front.webp', quality=90, method=6)
  if name == 'forge':
    for x, y in BOWLS:
      print(f'  bowl {(x - box[0]) / piece.width:.4f} {(y - box[1]) / piece.height:.4f}')
    print(f'  bowl spacing {340 / piece.width:.4f} of the width')
  else:
    print(f'  lid width in sheet px {piece.width}')
