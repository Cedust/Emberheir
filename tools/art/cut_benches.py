# Cuts Timo's painted crafting benches (design/notes/ui-rahmen-art-v1.md, sheets 4-7) into
# apps/web/src/assets/benches/*.webp, drawn under the item in a crafter's window (camp/Workbench.tsx).
# Run from the repo root: python3 tools/art/cut_benches.py  (needs Pillow)
# The benches are drawn up to ~330 stage px wide and the stage scales up to 2.4x on 4K, so each
# keeps 800 px of width. Prints each size and the share of the height above the top face's centre
# (where the item rests), which Workbench.tsx uses.
from PIL import Image

ART = '/mnt/project-files/art/ui/benches/'
OUT = 'apps/web/src/assets/benches/'
# file -> y of the top face's centre in the source image (picked by eye)
BENCHES = {'anvil': 100, 'altar': 300, 'rune-table': 262, 'mystery-crate': 275}

for name, top in BENCHES.items():
  im = Image.open(f'{ART}{name}-v1.png').convert('RGBA')
  box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
  im = im.crop(box)
  scale = min(1, 800 / im.width)
  out = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
  out.save(f'{OUT}{name}.webp', quality=90, method=6)
  print(f'{name} {out.width}x{out.height} top face at {(top - box[1]) / im.height:.2f}')
