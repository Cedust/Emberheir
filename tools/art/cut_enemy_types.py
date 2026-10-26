# Cuts Timo's painted enemy type sheet (design/notes/gegnertypen-icons-art-v1.md, icon sheet 12)
# into one square icon each: apps/web/src/assets/enemy-types/*.webp (ui/gameIcons.tsx).
# Run from the repo root: python3 tools/art/cut_enemy_types.py [sheet.png]  (needs Pillow)
#   art/icons/enemy-type-sheet-v1.png  3 x 3: Brute, Skirmisher, Caster / Afflicter, Warden,
#                                      Thornback / Champion, Harvester, Warden Echo
# Glows, sparks and smoke wisps are loose pieces: every piece goes to the grid cell its centre
# lies in, so nothing is cut off. 128 px keeps 20-40 px icons sharp on 4K (stage up to 2.4x).
from collections import deque
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/icons/enemy-type-sheet-v1.png'
OUT = 'apps/web/src/assets/enemy-types/'
NAMES = ['brute', 'skirmisher', 'caster', 'afflicter', 'warden', 'thornback', 'champion',
         'harvester', 'echo']
COLS, ROWS = 3, 3
SIZE = 128
PAD = 0.03

im = Image.open(SRC).convert('RGBA')
# The generator leaves faint smudges around the icons: drop nearly invisible pixels.
im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 20 else a))
W, H = im.size
C = 6
gw, gh = (W + C - 1) // C, (H + C - 1) // C
small = im.getchannel('A').point(lambda a: 255 if a > 40 else 0).resize(
  (gw, gh), Image.Resampling.BOX).load()
on = [[small[x, y] > 0 for x in range(gw)] for y in range(gh)]
seen = [[False] * gw for _ in range(gh)]
boxes = [None] * (COLS * ROWS)
for y in range(gh):
  for x in range(gw):
    if not on[y][x] or seen[y][x]:
      continue
    q, cells = deque([(x, y)]), []
    seen[y][x] = True
    while q:
      cx, cy = q.popleft()
      cells.append((cx, cy))
      for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
          nx, ny = cx + dx, cy + dy
          if 0 <= nx < gw and 0 <= ny < gh and on[ny][nx] and not seen[ny][nx]:
            seen[ny][nx] = True
            q.append((nx, ny))
    xs, ys = [c[0] for c in cells], [c[1] for c in cells]
    box = (min(xs) * C, min(ys) * C, (max(xs) + 1) * C, (max(ys) + 1) * C)
    col = min(COLS - 1, int((box[0] + box[2]) / 2 / W * COLS))
    row = min(ROWS - 1, int((box[1] + box[3]) / 2 / H * ROWS))
    i = row * COLS + col
    old = boxes[i]
    boxes[i] = box if old is None else (
      min(old[0], box[0]), min(old[1], box[1]), max(old[2], box[2]), max(old[3], box[3]))

for name, box in zip(NAMES, boxes):
  if box is None:
    sys.exit(f'nothing painted for {name}')
  part = im.crop(box)
  part = part.crop(part.getchannel('A').getbbox())
  side = round(max(part.size) * (1 + 2 * PAD))
  square = Image.new('RGBA', (side, side))
  square.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
  square.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(f'{OUT}{name}.webp', quality=90,
                                                              method=6)
  print(f'{name} {part.width}x{part.height}')
