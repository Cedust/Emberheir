# Cuts Timo's painted item sheets (base items on a transparent background, in rows) into one
# square icon per base item for apps/web/src/ui/ItemArt.tsx, named by the base id.
# Run from the repo root: python3 tools/art/cut_items.py [a|b]  (needs Pillow)
# Sheet A (art/items/item-sheet-a-v1.png): the square bases, 5 + 4 + 4 in three rows. Each icon is the biggest blob in its spot;
# loose bits next to it stay with it.
from collections import deque
import sys
from PIL import Image

SHEETS = {
  'a': ('/mnt/project-files/art/items/item-sheet-a-v1.png', [
    ['leather-cap', 'iron-helm', 'circlet', 'leather-gloves', 'gauntlets'],
    ['silk-wraps', 'leather-boots', 'greaves', 'silk-slippers'],
    ['round-shield', 'ember-focus', 'blood-talisman', 'grimoire'],
  ]),
  # Sheet B: tall (Body Armor, Quiver), wide (Belts) and small items, 4 + 4 + 5. These keep their
  # own proportions so a Body Armor fills its 2x3 cell and a Belt its 2x1 cell.
  'b': ('/mnt/project-files/art/items/item-sheet-b-v1.png', [
    ['leather-jerkin', 'chain-mail', 'silk-robe', 'quiver'],
    ['sash', 'heavy-belt', 'bone-amulet', 'ember-pendant'],
    ['iron-ring', 'garnet-ring', 'war-charm', 'ward-charm', 'ember-charm'],
  ]),
}
KEEP_SHAPE = sys.argv[1:2] == ['b']
SRC, ROWS = SHEETS[sys.argv[1] if len(sys.argv) > 1 else 'a']
OUT = 'apps/web/src/assets/items/'
SIZE = 192  # a 2x2 item cell is about 80 stage px, up to 2.4x on 4K stay sharp on 4K (the stage scales up to 2.4x)
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

COUNT = sum(len(r) for r in ROWS)
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
    if len(cells) < biggest * 0.05:
      for cx, cy in cells:
        alpha.paste(0, (cx * c, cy * c, min(w, cx * c + c), min(h, cy * c + c)))
  part.putalpha(alpha)
  return part


# Rows top to bottom (the biggest vertical gaps between icon centres), each left to right.
icons.sort(key=lambda b: centre(b)[1])
gaps = sorted(range(1, COUNT), key=lambda k: centre(icons[k])[1] - centre(icons[k - 1])[1])[-(len(ROWS) - 1):]
cuts = [0] + sorted(gaps) + [COUNT]
rows = [sorted(icons[a:b], key=lambda b: centre(b)[0]) for a, b in zip(cuts, cuts[1:])]
if [len(r) for r in rows] != [len(r) for r in ROWS]:
  sys.exit(f'unexpected layout: {[len(r) for r in rows]}')

for name, b in [(n, b) for names, row in zip(ROWS, rows) for n, b in zip(names, row)]:
  x0, y0, x1, y1 = b['box']
  part = drop_crumbs(im.crop((max(0, x0), max(0, y0), min(W, x1), min(H, y1))))
  part = part.crop(part.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
  if KEEP_SHAPE:
    pad = round(max(part.size) * PAD)
    sq = Image.new('RGBA', (part.width + 2 * pad, part.height + 2 * pad), (0, 0, 0, 0))
    sq.paste(part, (pad, pad))
    scale = 288 / max(sq.size)  # a 2x3 Body Armor is about 120 stage px tall, up to 2.4x on 4K
    out = sq.resize((round(sq.width * scale), round(sq.height * scale)), Image.Resampling.LANCZOS)
  else:
    side = round(max(part.size) * (1 + 2 * PAD))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
    out = sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
  out.save(f'{OUT}{name}.webp', quality=90, method=6)
  print(name, b['box'])
