# Cuts Timo's painted Draught sheet (7 vials on a transparent background, 4 + 3 in two rows) into
# one icon per Draught for the Draught picker (apps/web/src/game/camp/CampPickers.tsx), and the full
# and empty Ember Flask (apps/web/src/ui/Potion.tsx).
# Run from the repo root: python3 tools/art/cut_draughts.py  (needs Pillow)
from collections import deque
import sys
from PIL import Image

SRC = '/mnt/project-files/art/draughts/draught-sheet-v1.png'
OUT = 'apps/web/src/assets/draughts/'
ORDER = ['iron-draught', 'ward-draught', 'vigor-draught', 'fire-draught',
         'cold-draught', 'lightning-draught', 'void-draught']
HEIGHT = 128  # a 40 stage px vial stays sharp on 4K (the stage scales up to 2.4x)
PAD = 0.02


def trimmed(im):
  im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 20 else a))
  return im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())


def padded(part, side_px):
  """Keeps the shape, with a thin margin, scaled so the longer side is side_px."""
  pad = round(max(part.size) * PAD)
  sq = Image.new('RGBA', (part.width + 2 * pad, part.height + 2 * pad), (0, 0, 0, 0))
  sq.paste(part, (pad, pad))
  scale = side_px / max(sq.size)
  return sq.resize((round(sq.width * scale), round(sq.height * scale)), Image.Resampling.LANCZOS)


im = Image.open(SRC).convert('RGBA')
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

blobs.sort(key=lambda b: -b['n'])
icons = blobs[:len(ORDER)]
if len(icons) < len(ORDER):
  sys.exit(f'found only {len(icons)} icons')


def centre(b):
  x0, y0, x1, y1 = b['box']
  return ((x0 + x1) / 2, (y0 + y1) / 2)


top = sorted([b for b in icons if centre(b)[1] < H / 2], key=lambda b: centre(b)[0])
bottom = sorted([b for b in icons if centre(b)[1] >= H / 2], key=lambda b: centre(b)[0])
if len(top) != 4 or len(bottom) != 3:
  sys.exit(f'unexpected layout: {len(top)} top, {len(bottom)} bottom')

for name, b in zip(ORDER, top + bottom):
  x0, y0, x1, y1 = b['box']
  part = trimmed(im.crop((max(0, x0), max(0, y0), min(W, x1), min(H, y1))))
  padded(part, HEIGHT).save(f'{OUT}{name}.webp', quality=90, method=6)
  print(name, b['box'])

# The Ember Flask, full (re-cut from the currency sheet) and empty (Timo's edit of it), same size.
for name, src in [('flask-full', '/mnt/project-files/art/currency/ember-flask-reference.png'),
                  ('flask-empty', '/mnt/project-files/art/currency/ember-flask-empty-v1.png')]:
  part = trimmed(Image.open(src).convert('RGBA'))
  padded(part, 160).save(f'apps/web/src/assets/currency/{name}.webp', quality=90, method=6)
  print(name, part.size)
