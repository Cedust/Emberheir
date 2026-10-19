# Cuts Timo's painted Ash Tree material (art/tree/, prompts design/notes/ash-tree-art-v1.md) for
# apps/web/src/game/camp/ashTreeArt.ts: the bark tile, the trunk base with its bare patch for the
# Ember sigil, and the eight leaf sprigs of the sheet (4 x 2 grid, each pointing up right).
# Run from the repo root: python3 tools/art/cut_ash_tree.py  (needs Pillow)
from PIL import Image

SRC = '/mnt/project-files/art/tree'
OUT = 'apps/web/src/assets/tree'

# Bark: seamless; a power-of-two size so it can repeat on every GPU.
bark = Image.open(f'{SRC}/ash-bark-v1.png').convert('RGB')
bark.resize((512, 512), Image.Resampling.LANCZOS).save(f'{OUT}/bark.webp', 'WEBP', quality=88, method=6)

# Trunk base: cropped to the painted wood (its soft glow stays), 1024 wide.
base = Image.open(f'{SRC}/ash-trunk-base-v1.png').convert('RGBA')
box = base.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
base = base.crop(box)
base = base.resize((1024, round(base.height * 1024 / base.width)), Image.Resampling.LANCZOS)
# Its top edge is cut straight: fade it out, so it melts into the bark the code draws above.
FADE = 160
alpha = base.getchannel('A')
px = alpha.load()
for y in range(FADE):
    k = y / FADE
    for x in range(base.width):
        px[x, y] = round(px[x, y] * k)
base.putalpha(alpha)
base.save(f'{OUT}/trunk-base.webp', 'WEBP', quality=90, method=6)
print('base', box, '->', base.size)

# Leaves: one sprig per grid cell, trimmed to its leaves, 256 wide.
sheet = Image.open(f'{SRC}/ash-leaves-v1.png').convert('RGBA')
cw, ch = sheet.width / 4, sheet.height / 2
for row in range(2):
    for col in range(4):
        cell = sheet.crop((round(col * cw), round(row * ch), round((col + 1) * cw), round((row + 1) * ch)))
        cell = cell.crop(cell.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox())
        cell = cell.resize((256, round(cell.height * 256 / cell.width)), Image.Resampling.LANCZOS)
        cell.save(f'{OUT}/leaves-{row * 4 + col + 1}.webp', 'WEBP', quality=90, method=6)
        print('leaves', row * 4 + col + 1, cell.size)
