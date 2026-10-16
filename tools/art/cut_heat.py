# Cuts Timo's painted Heat sheet (5 icons in one row on a transparent background) into one
# square icon each: the Heat bar and the four Heat Forms (apps/web/src/ui/gameIcons.tsx).
# Run from the repo root: python3 tools/art/cut_heat.py [sheet.png]  (needs Pillow)
# Sheet layout, left to right: Heat (crucible), Steady, Cooling, Warming, Smoldering. Each icon is the biggest blob in its spot;
# loose bits next to it stay with it.
from collections import deque
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/icons/heat-sheet-v1.png'
TOP = ['heat', 'steady', 'cooling', 'warming', 'smoldering']
BOTTOM = []
OUT_TOP = 'apps/web/src/assets/heat/'
OUT_BOTTOM = 'apps/web/src/assets/heat/'
SIZE = 192  # the big Heat Form on the Heat plaque stay sharp on 4K (the stage scales up to 2.4x)
PAD = 0.02

im = Image.open(SRC).convert('RGBA')
# The generator leaves faint smudges around the icons: drop nearly invisible pixels.
im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 20 else a))
W, H = im.size
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

COUNT = len(TOP) + len(BOTTOM)
blobs.sort(key=lambda b: -b['n'])
icons, specks = blobs[:COUNT], blobs[COUNT:]
if len(icons) < COUNT:
  sys.exit(f'found only {len(icons)} icons')


def centre(b):
  x0, y0, x1, y1 = b['box']
  return ((x0 + x1) / 2, (y0 + y1) / 2)


# Loose bits belong to the nearest icon, if they sit close to it.
for s in specks:
  sx, sy = centre(s)
  best = min(icons, key=lambda b: (centre(b)[0] - sx) ** 2 + (centre(b)[1] - sy) ** 2)
  x0, y0, x1, y1 = best['box']
  if x0 - 10 < sx < x1 + 10 and y0 - 10 < sy < y1 + 10:
    bx0, by0, bx1, by1 = s['box']
    best['box'] = [min(x0, bx0), min(y0, by0), max(x1, bx1), max(y1, by1)]

def drop_crumbs(part):
  """Clears small stray specks inside an icon's box ."""
  c = 3
  w, h = part.size
  cw, ch = (w + c - 1) // c, (h + c - 1) // c
  grid = part.getchannel('A').point(lambda a: 255 if a > 40 else 0).resize((cw, ch), Image.Resampling.BOX).load()
  seen, comps = set(), []
  for y in range(ch):
    for x in range(cw):
      if grid[x, y] == 0 or (x, y) in seen:
        continue
      q, cells = deque([(x, y)]), []
      seen.add((x, y))
      while q:
        cx, cy = q.popleft()
        cells.append((cx, cy))
        for dx in (-1, 0, 1):
          for dy in (-1, 0, 1):
            n = (cx + dx, cy + dy)
            if 0 <= n[0] < cw and 0 <= n[1] < ch and grid[n] > 0 and n not in seen:
              seen.add(n)
              q.append(n)
      comps.append(cells)
  biggest = max(len(cells) for cells in comps)
  alpha = part.getchannel('A')
  for cells in comps:
    if len(cells) < biggest * 0.02:
      for cx, cy in cells:
        alpha.paste(0, (cx * c, cy * c, min(w, cx * c + c), min(h, cy * c + c)))
  part.putalpha(alpha)
  return part


top = sorted(icons, key=lambda b: centre(b)[0])
bottom = []
if len(top) != len(TOP) or len(bottom) != len(BOTTOM):
  sys.exit(f'unexpected layout: {len(top)} top, {len(bottom)} bottom')

for name, out, b in [(n, OUT_TOP, b) for n, b in zip(TOP, top)] + [(n, OUT_BOTTOM, b) for n, b in zip(BOTTOM, bottom)]:
  x0, y0, x1, y1 = b['box']
  part = drop_crumbs(im.crop((max(0, x0), max(0, y0), min(W, x1), min(H, y1))))
  part = part.crop(part.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
  side = round(max(part.size) * (1 + 2 * PAD))
  sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
  sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
  sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(f'{out}{name}.webp', quality=90, method=6)
  print(name, b['box'])
