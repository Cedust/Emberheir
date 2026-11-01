# Cuts Timo's painted Legendary Power sheets (design/notes/legendary-powers-art-v1.md) into one square
# icon per power id for apps/web/src/ui/PowerIcon.tsx. Run from the repo root: python3 tools/art/cut_powers.py
# (needs Pillow + numpy). Same blob-to-grid-cell cut as cut_uniques.py; the soft legendary glow around each
# motif belongs to the icon, so it stays. Glows of neighbours touch, so only the solid core
# (alpha > CORE) finds the motifs; every visible pixel then goes to the nearest motif's core. Every icon is centred on a square canvas like the skill icons.
from collections import deque
import numpy as np
from PIL import Image

SHEETS = [
  ('/mnt/project-files/art/icons/power-sheet-a-v1.png', [
    ['executioner', 'heavy-hand', 'sanguine-crit', 'counter-slam'],
    ['thorn-flurry', 'avalanche', 'heralds-bolt', 'last-harvest'],
  ]),
  ('/mnt/project-files/art/icons/power-sheet-b-v1.png', [
    ['leech-bloom', 'ember-shell', 'storm-step', 'last-stand'],
    ['tyrants-wrath', 'ice-barrier', 'tailwind'],
  ]),
  ('/mnt/project-files/art/icons/power-sheet-c-v1.png', [
    ['blood-echo', 'wildfire', 'frostbrand', 'undying-heat'],
    ['smoldering-focus', 'quickened-heat', 'mothers-brood', 'eruption'],
    ['endless-hunger', 'rift-pulse', 'stolen-fire'],
  ]),
]
OUT = 'apps/web/src/assets/powers/'
SIZE = 128  # like the skill icons
PAD = 0.03
C = 3  # blob search grid in sheet pixels
CORE = 150


def blobs(alpha):
  """Connected painted areas on a coarse grid: a list of (cells, centre)."""
  h, w = alpha.shape
  gh, gw = (h + C - 1) // C, (w + C - 1) // C
  grid = np.zeros((gh * C, gw * C), bool)
  grid[:h, :w] = alpha > CORE
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


for src, rows in SHEETS:
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
  names = list(masks)
  # Distance of every pixel to each motif's core (coarse grid), nearest core wins.
  yy, xx = np.mgrid[0:gh, 0:gw]
  dist = []
  for name in names:
    if not masks[name].any():
      raise SystemExit(f'nothing painted for {name}')
    cy, cx = np.nonzero(masks[name])
    d = np.full((gh, gw), np.inf)
    for i in range(0, len(cy), 40):  # sampled core points are plenty for the split
      d = np.minimum(d, np.hypot(yy - cy[i], xx - cx[i]))
    dist.append(d)
  owner = np.argmin(np.stack(dist), axis=0)
  for k, name in enumerate(names):
    full = np.kron(owner == k, np.ones((C, C), bool))[:H, :W]
    part = px.copy()
    part[~full, 3] = 0
    ys, xs = np.nonzero(part[:, :, 3] > 8)
    part = Image.fromarray(part[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    side = round(max(part.size) * (1 + 2 * PAD))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
    out = sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    out.save(f'{OUT}{name}.webp', quality=90, method=6)
    print(name, part.size)
