# Cuts Timo's painted stats sheet (16 icons on a transparent background) into one square icon
# each for the Character Sheet's Stats panel (apps/web/src/ui/gameIcons.tsx).
# Run from the repo root: python3 tools/art/cut_stats.py [sheet.png]  (needs Pillow)
# Sheet layout: two rows of 8. Top: Life, Barrier, Armor, Evasion, Block, Tenacity, Lifesteal,
# Thorns; bottom: Elemental, Speed, Crit Chance, Ailment Effect, Heat Gain, Heat per Hit, Heat
# from Hits Taken, Trigger Chance. The icons' glows touch, so instead of blobs every row is cut
# at the emptiest column near each eighth of the width.
from collections import deque
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/icons/stats-sheet-v2.png'
ROWS = [
  ['life', 'barrier', 'armor', 'evasion', 'block', 'tenacity', 'lifesteal', 'thorns'],
  ['elemental', 'speed', 'crit', 'ailment-effect', 'heat-gain', 'heat-per-hit', 'heat-from-hits', 'trigger'],
]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None  # e.g. "life" to redo one icon
# Hand-set cuts where one icon reaches over its neighbour (Block's arrow, the hourglass wing).
CUT_AT = {(0, 5): 1062, (1, 2): 478}
OUT = 'apps/web/src/assets/stats/'
SIZE = 96  # 30 px icons stay sharp on 4K (the stage scales up to 2.4x)
PAD = 0.02

im = Image.open(SRC).convert('RGBA')
im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 20 else a))
W, H = im.size
alpha = im.getchannel('A')
solid = alpha.point(lambda a: 255 if a > 160 else 0).load()


def drop_crumbs(part):
  """Clears pieces that are much smaller than the icon (a neighbour's glow at the cell edge)."""
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
  a = part.getchannel('A')
  for cells in comps:
    if len(cells) < biggest * 0.12:
      for cx, cy in cells:
        a.paste(0, (cx * c, cy * c, min(w, cx * c + c), min(h, cy * c + c)))
  part.putalpha(a)
  return part


for r, names in enumerate(ROWS):
  y0, y1 = r * H // 2, (r + 1) * H // 2
  cover = [sum(1 for y in range(y0, y1) if solid[x, y]) for x in range(W)]
  n = len(names)
  cuts = [0]
  for k in range(1, n):
    centre = k * W // n
    best = min(range(centre - 50, centre + 51), key=lambda x: (cover[x], abs(x - centre)))
    cuts.append(CUT_AT.get((r, k), best))
  cuts.append(W)
  for i, name in enumerate(names):
    if ONLY and name not in ONLY:
      continue
    part = drop_crumbs(im.crop((cuts[i], y0, cuts[i + 1], y1)))
    part = part.crop(part.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
    side = round(max(part.size) * (1 + 2 * PAD))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
    sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(f'{OUT}{name}.webp', quality=90, method=6)
    print(name, cuts[i], cuts[i + 1])
