# Cuts Timo's painted Unique sheets (design/notes/uniques-art-v1.md) into one icon per unique id
# for apps/web/src/ui/ItemArt.tsx. Run from the repo root: python3 tools/art/cut_uniques.py  (needs Pillow + numpy)
# The items sit in an even grid, but pairs (gloves, boots) have gaps and some items reach into the
# next row, so every painted blob goes to the grid cell its centre lies in, and only those pixels are cut.
# Sheet C holds square items (one square icon each, like item sheet A); sheet D keeps each item's own
# shape (Body Armor, Belts, Amulets, Rings, like item sheet B).
from collections import deque
import numpy as np
from PIL import Image

SHEETS = [
  ('/mnt/project-files/art/items/unique-sheet-c-v1.png', False, [
    ['gorraks-knuckles', 'heirloom-blade', 'avalanche-bow', 'rotfang'],
    ['thornsong', 'ashwalkers', 'stormcallers-greaves', 'riftwalker-wraps'],
    ['barkhide-bulwark', 'wardenshell', 'tyrants-crown', 'cinderwick'],
  ]),
  ('/mnt/project-files/art/items/unique-sheet-d-v1.png', True, [
    ['mossgrown-mail', 'ashmaw-pauldron', 'rotmothers-cradle', 'reapers-due'],
    ['eruption-core', 'the-stolen-flame', 'maws-hunger', 'nans-lucky-ring', 'heraldic-coil'],
  ]),
]
OUT = 'apps/web/src/assets/uniques/'
SIZE = 192  # square icons, as cut_items.py
TALL = 288  # longest side of a shaped icon, as cut_items.py sheet B
PAD = 0.02
C = 3  # blob search grid in sheet pixels


def blobs(alpha):
  """Connected painted areas on a coarse grid: a list of (cells, centre)."""
  h, w = alpha.shape
  gh, gw = (h + C - 1) // C, (w + C - 1) // C
  grid = np.zeros((gh * C, gw * C), bool)
  grid[:h, :w] = alpha > 40
  on = grid.reshape(gh, C, gw, C).any(axis=(1, 3))
  seen = np.zeros_like(on)
  found = []
  for y, x in zip(*np.nonzero(on)):
    if seen[y, x]:
      continue
    q, cells = deque([(y, x)]), []
    seen[y, x] = True
    while q:
      cy, cx = q.popleft()
      cells.append((cy, cx))
      for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
          ny, nx = cy + dy, cx + dx
          if 0 <= ny < gh and 0 <= nx < gw and on[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True
            q.append((ny, nx))
    ys, xs = zip(*cells)
    found.append((cells, (sum(ys) / len(ys) * C, sum(xs) / len(xs) * C)))
  return found, (gh, gw)


for src, keep_shape, rows in SHEETS:
  im = Image.open(src).convert('RGBA')
  # The generator leaves faint smudges around the icons: drop nearly invisible pixels.
  im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 20 else a))
  px = np.array(im)
  H, W = px.shape[:2]
  found, (gh, gw) = blobs(px[:, :, 3])
  masks = {name: np.zeros((gh, gw), bool) for row in rows for name in row}
  for cells, (cy, cx) in found:
    if len(cells) < 4:  # dust
      continue
    row = rows[min(len(rows) - 1, int(cy / H * len(rows)))]
    name = row[min(len(row) - 1, int(cx / W * len(row)))]
    for y, x in cells:
      masks[name][y, x] = True
  for name, mask in masks.items():
    if not mask.any():
      raise SystemExit(f'nothing painted for {name}')
    full = np.kron(mask, np.ones((C, C), bool))[:H, :W]
    part = px.copy()
    part[~full, 3] = 0
    ys, xs = np.nonzero(part[:, :, 3] > 8)
    part = Image.fromarray(part[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    if keep_shape:
      pad = round(max(part.size) * PAD)
      sq = Image.new('RGBA', (part.width + 2 * pad, part.height + 2 * pad), (0, 0, 0, 0))
      sq.paste(part, (pad, pad))
      scale = TALL / max(sq.size)
      out = sq.resize((round(sq.width * scale), round(sq.height * scale)), Image.Resampling.LANCZOS)
    else:
      side = round(max(part.size) * (1 + 2 * PAD))
      sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
      sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
      out = sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    out.save(f'{OUT}{name}.webp', quality=90, method=6)
    print(name, out.size)
