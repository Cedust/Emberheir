# Cuts Timo's painted UI chrome (design/notes/ui-rahmen-art-v1.md) into the pieces the UI kit
# draws with CSS border-image and plain images (apps/web/src/ui/kit/kit.css).
# Run from the repo root: python3 tools/art/cut_ui.py  (needs Pillow)
#   art/ui/window-frame-v1.png  one window frame; its crest is cut out of the top edge so the
#                               edges can stretch, and drawn on its own in the middle.
#   art/ui/buttons-tabs-v1.png  primary, secondary / tab on, tab off / parchment tile, wood tile
#   art/ui/small-parts-v1.png   3 x 3: item slot, panel frame, portrait ring / close, round button,
#                               marker / level ring, divider, name plate
# The stage scales up to 2.4x on 4K, so every piece keeps about 2.4x the stage pixels it is
# drawn at. Prints the slice sizes kit.css uses.
from collections import deque
import sys
from PIL import Image

ART = '/mnt/project-files/art/ui/'
OUT = 'apps/web/src/assets/ui/'


def load(name):
  im = Image.open(ART + name).convert('RGBA')
  # The painter leaves the paint at alpha ~252; make it solid so stretched edges stay crisp.
  a = im.getchannel('A').point(lambda v: 255 if v > 235 else v)
  im.putalpha(a)
  return im


def trim(im):
  return im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())


def blobs(im, count, reach=3):
  """The `count` biggest painted pieces, in reading order (rows top to bottom, then left).
  Pieces closer than `reach` grid cells (6 px each) count as one."""
  W, H = im.size
  C = 6
  gw, gh = (W + C - 1) // C, (H + C - 1) // C
  alpha = im.getchannel('A').point(lambda a: 255 if a > 40 else 0)
  small = alpha.resize((gw, gh), Image.Resampling.BOX).load()
  on = [[small[x, y] > 0 for x in range(gw)] for y in range(gh)]
  seen = [[False] * gw for _ in range(gh)]
  found = []
  for y in range(gh):
    for x in range(gw):
      if not on[y][x] or seen[y][x]:
        continue
      q, cells = deque([(x, y)]), []
      seen[y][x] = True
      while q:
        cx, cy = q.popleft()
        cells.append((cx, cy))
        for dx in range(-reach, reach + 1):
          for dy in range(-reach, reach + 1):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < gw and 0 <= ny < gh and on[ny][nx] and not seen[ny][nx]:
              seen[ny][nx] = True
              q.append((nx, ny))
      xs, ys = [c[0] for c in cells], [c[1] for c in cells]
      found.append((len(cells), (min(xs) * C, min(ys) * C, (max(xs) + 1) * C, (max(ys) + 1) * C)))
  found.sort(key=lambda b: -b[0])
  if len(found) < count:
    sys.exit(f'found only {len(found)} pieces, expected {count}')
  boxes = [b for _, b in found[:count]]
  # Rows: pieces whose vertical centres lie close together.
  boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
  rows, row = [], []
  for b in boxes:
    if row and (b[1] + b[3]) / 2 - (row[-1][1] + row[-1][3]) / 2 > 80:
      rows.append(row)
      row = []
    row.append(b)
  rows.append(row)
  return [trim(im.crop(b)) for r in rows for b in sorted(r, key=lambda b: b[0])]


def save(im, name, scale):
  out = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
  out.save(f'{OUT}{name}.webp', quality=90, method=6)
  return out


def runs(values):
  """Painted stretches (start, end) along one line of alpha values."""
  out, start = [], None
  for i, v in enumerate(values):
    if v > 128 and start is None:
      start = i
    if v <= 128 and start is not None:
      out.append((start, i))
      start = None
  if start is not None:
    out.append((start, len(values)))
  return out


# --- window frame -----------------------------------------------------------------------------
frame = trim(load('window-frame-v1.png'))
W, H = frame.size
A = frame.getchannel('A')
col = [A.getpixel((W // 4, y)) for y in range(H)]
row = [A.getpixel((x, H // 2)) for x in range(W)]
(top0, top1), (bot0, bot1) = runs(col)[0], runs(col)[-1]
(left0, left1), (right0, right1) = runs(row)[0], runs(row)[-1]
# The crest: the gem and fittings above the wood, its brass arms on the wood and its point below.


def fittings(x0, x1):
  """Columns in [x0, x1) with brass above the top wood or on it."""
  cols = []
  for y in [*range(0, top0), *range(top0 + 12, top0 + 26)]:  # not the trim along the edge
    cols += [x for x in range(x0, x1)
             if (A.getpixel((x, y)) > 40 if y < top0 else frame.getpixel((x, y))[1] > 100)]
  return cols


crest_x = fittings(W // 4, 3 * W // 4)
cx0, cx1 = min(crest_x) - 10, max(crest_x) + 10
crest_y1 = max(y for y in range(H // 3) if any(A.getpixel((x, y)) > 40 for x in range(cx0, cx1))) + 3
crest = frame.crop((cx0, 0, cx1, crest_y1))
# Plain top edge: patch the crest's columns with plain wood from between the corner leaves.
plain = frame.copy()
plain.paste((0, 0, 0, 0), (cx0, 0, cx1, crest_y1))
src0 = max(fittings(left1, W // 4)) + 12
src_w = cx0 - src0 - 12
x = cx0
while x < cx1:
  w = min(src_w, cx1 - x)
  plain.paste(frame.crop((src0, 0, src0 + w, top1 + 2)), (x, 0))
  x += w

SCALE = 0.5
save(plain, 'window-frame', SCALE)
save(crest, 'window-crest', SCALE)
print(f'window-frame {round(W * SCALE)}x{round(H * SCALE)}: wood inner edge '
      f'left {left1 * SCALE:.0f} right {(W - right0) * SCALE:.0f} '
      f'top {top1 * SCALE:.0f} bottom {(H - bot0) * SCALE:.0f}; '
      f'outer wood edge left {left0 * SCALE:.0f} top {top0 * SCALE:.0f}')
print(f'window-crest {round(crest.width * SCALE)}x{round(crest.height * SCALE)}, '
      f'wood top at {top0 * SCALE:.0f}')

# --- buttons and tabs -------------------------------------------------------------------------
names = ['btn-primary', 'btn-secondary', 'tab-on', 'tab-off', 'tile-parchment', 'tile-wood']
for name, part in zip(names, blobs(load('buttons-tabs-v1.png'), len(names))):
  out = save(part, name, 0.5)
  print(f'{name} {out.width}x{out.height}')

# --- small parts ------------------------------------------------------------------------------
# The round button and the divider have no place in the UI yet (None: not written).
names = ['slot', 'panel-frame', 'portrait-ring', 'btn-close', None, 'marker',
         'level-ring', None, 'name-plate']
for name, part in zip(names, blobs(load('small-parts-v1.png'), len(names), reach=1)):
  if name is None:
    continue
  out = save(part, name, 0.5)
  print(f'{name} {out.width}x{out.height}')
