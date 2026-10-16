# Cuts Timo's painted currency sheet (7 icons on a transparent background) into one square icon
# per currency for apps/web/src/ui/kit/Currency.tsx.
# Run from the repo root: python3 tools/art/cut_currency.py [sheet.png]  (needs Pillow)
# Sheet layout: top row Acorns, Ash, Ember Coal, Phoenix Feathers; bottom row Runes, Cinderglass,
# Ember Flask. Each icon is the biggest blob in its spot; loose sparks next to it stay with it.
from collections import deque
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/currency/currency-sheet-v1.png'
OUT = 'apps/web/src/assets/currency/'
ORDER = ['acorns', 'ash', 'coal', 'feathers', 'runes', 'glass', 'flask']
SIZE = 96  # 26 px icons stay sharp on 4K (the stage scales up to 2.4x)
PAD = 0.02

im = Image.open(SRC).convert('RGBA')
W, H = im.size
# Blobs on a coarse grid: a cell counts if any pixel in it is clearly painted.
C = 6
gw, gh = (W + C - 1) // C, (H + C - 1) // C
alpha = im.getchannel('A').point(lambda a: 255 if a > 40 else 0)
small = alpha.resize((gw, gh), Image.Resampling.BOX).load()
on = [[small[x, y] > 0 for x in range(gw)] for y in range(gh)]
seen = [[False] * gw for _ in range(gh)]
blobs = []
for y in range(gh):
  for x in range(gw):
    if not on[y][x] or seen[y][x]:
      continue
    q, cells = deque([(x, y)]), []
    seen[y][x] = True
    while q:
      cx, cy = q.popleft()
      cells.append((cx, cy))
      for dx in (-2, -1, 0, 1, 2):
        for dy in (-2, -1, 0, 1, 2):
          nx, ny = cx + dx, cy + dy
          if 0 <= nx < gw and 0 <= ny < gh and on[ny][nx] and not seen[ny][nx]:
            seen[ny][nx] = True
            q.append((nx, ny))
    xs, ys = [c[0] for c in cells], [c[1] for c in cells]
    blobs.append({'n': len(cells), 'box': [min(xs) * C, min(ys) * C, (max(xs) + 1) * C, (max(ys) + 1) * C]})

blobs.sort(key=lambda b: -b['n'])
icons, specks = blobs[:len(ORDER)], blobs[len(ORDER):]
if len(icons) < len(ORDER):
  sys.exit(f'found only {len(icons)} icons')


def centre(b):
  x0, y0, x1, y1 = b['box']
  return ((x0 + x1) / 2, (y0 + y1) / 2)


# Sparks belong to the nearest icon, if they sit close to it.
for s in specks:
  sx, sy = centre(s)
  best = min(icons, key=lambda b: (centre(b)[0] - sx) ** 2 + (centre(b)[1] - sy) ** 2)
  x0, y0, x1, y1 = best['box']
  if x0 - 60 < sx < x1 + 60 and y0 - 60 < sy < y1 + 60:
    bx0, by0, bx1, by1 = s['box']
    best['box'] = [min(x0, bx0), min(y0, by0), max(x1, bx1), max(y1, by1)]

top = sorted([b for b in icons if centre(b)[1] < H / 2], key=lambda b: centre(b)[0])
bottom = sorted([b for b in icons if centre(b)[1] >= H / 2], key=lambda b: centre(b)[0])
if len(top) != 4 or len(bottom) != 3:
  sys.exit(f'unexpected layout: {len(top)} top, {len(bottom)} bottom')

for name, b in zip(ORDER, top + bottom):
  x0, y0, x1, y1 = b['box']
  part = im.crop((max(0, x0), max(0, y0), min(W, x1), min(H, y1)))
  part = part.crop(part.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
  side = round(max(part.size) * (1 + 2 * PAD))
  sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
  sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
  sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(f'{OUT}{name}.webp', quality=90, method=6)
  print(name, b['box'])
