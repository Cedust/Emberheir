# Cuts Timo's painted class and Mastery emblems (prompts design/notes/klassen-masteries-art-v1.md)
# into one square icon each for apps/web/src/game/ClassEmblem.tsx.
# Class sheet: one row, Cinderguard, Ashstrider, Emberseer. Mastery sheet: 3 x 3, one row per class
# (Cinderguard, Ashstrider, Emberseer), columns Burst, Tempo, Ailment.
# Run from the repo root: python3 tools/art/cut_classes_masteries.py  (needs Pillow)
from collections import deque
from PIL import Image

SRC = '/mnt/project-files/art/icons'
SIZE = 128  # 40 px emblems stay sharp on 4K (the stage scales up to 2.4x)
PAD = 0.02
CLASSES = [['cinderguard', 'ashstrider', 'emberseer']]
MASTERIES = [
    ['vanquisher', 'berserker', 'ravager'],
    ['deadeye', 'skirmisher', 'trickster'],
    ['archmage', 'spellweaver', 'warlock'],
]


def own_icon(cell: Image.Image) -> Image.Image:
    """Clears the bits of neighbouring icons that reach into the cell: small blobs on its edge."""
    C = 4
    gw, gh = (cell.width + C - 1) // C, (cell.height + C - 1) // C
    small = cell.getchannel('A').point(lambda a: 255 if a > 0 else 0).resize((gw, gh), Image.Resampling.BOX).load()
    seen = [[False] * gw for _ in range(gh)]
    blobs = []
    for y in range(gh):
        for x in range(gw):
            if small[x, y] == 0 or seen[y][x]:
                continue
            q, cells = deque([(x, y)]), []
            seen[y][x] = True
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < gw and 0 <= ny < gh and small[nx, ny] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            blobs.append(cells)
    biggest = max(len(b) for b in blobs)
    px = cell.load()
    for b in blobs:
        edge = any(x in (0, gw - 1) or y in (0, gh - 1) for x, y in b)
        if edge and len(b) < biggest * 0.25:
            for x, y in b:
                for dx in range(C):
                    for dy in range(C):
                        if x * C + dx < cell.width and y * C + dy < cell.height:
                            px[x * C + dx, y * C + dy] = (0, 0, 0, 0)
    return cell


def cut(sheet: str, grid: list[list[str]], out: str) -> None:
    im = Image.open(f'{SRC}/{sheet}').convert('RGBA')
    # The generator leaves faint smudges around the icons: drop nearly invisible pixels.
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 20 else a))
    rows, cols = len(grid), len(grid[0])
    cw, ch = im.width / cols, im.height / rows
    for r, names in enumerate(grid):
        for c, name in enumerate(names):
            cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            cell = own_icon(cell)
            cell = cell.crop(cell.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox())
            side = round(max(cell.size) * (1 + 2 * PAD))
            sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            sq.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
            sq.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(f'{out}/{name}.webp', 'WEBP', quality=90, method=6)
            print(name, cell.size)


cut('class-sheet-v2.png', CLASSES, 'apps/web/src/assets/classes')
cut('mastery-sheet-v1.png', MASTERIES, 'apps/web/src/assets/masteries')
