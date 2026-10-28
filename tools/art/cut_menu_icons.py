# Cuts Timo's painted menu and workbench icons (design/notes/menu-buttons/menu-icons-art-v1.md,
# icon sheets 15 + 16) into apps/web/src/assets/actions/*.webp: the persona actions
# (game/camp/personaDefs.ts), the top bar buttons (RunHeader.tsx) and Kaelen's tabs.
# Run from the repo root: python3 tools/art/cut_menu_icons.py  (needs Pillow)
#   art/icons/menu-sheet-a-v1.png  4 x 2: Thoric's and Liora's crafts
#   art/icons/menu-sheet-b-v1.png  4 x 2: Crucible, Nyssa's crafts, Gamble, Ash Tree, Heirloom
#   art/icons/menu-sheet-c-v1.png  1 row of 4 (cut at the empty gaps): Stats, Worn Gear,
#                                  Collections, Lineage (Character Sheet and Legacy tabs)
#   art/icons/menu-sheet-d-v1.png  3 x 2: window medallions Legacy, Supply Wagon, Menu,
#                                  Settings, Credits, Act Map
#   art/icons/menu-compendium-v1.png  one icon: Compendium (menu button)
# Sparks and glow are loose pieces, so each icon is its grid cell of the sheet, trimmed.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
ns['ART'] = '/mnt/project-files/art/icons/'
ns['OUT'] = 'apps/web/src/assets/actions/'
load, trim, save = ns['load'], ns['trim'], ns['save']

SHEETS = {
  'menu-sheet-a-v1.png': ['upgrade', 'reforge', 'salvage', 'temper',
                          'kindle', 'awaken', 'shift', 'intensify'],
  'menu-sheet-b-v1.png': ['crucible', 'socket', 'rune', 'combine',
                          'codex', 'gamble', 'ash-tree', 'heirloom'],
}
SIZE = 128

for sheet_name, icons in SHEETS.items():
  sheet = load(sheet_name)
  cw, ch = sheet.width // 4, sheet.height // 2
  for i, name in enumerate(icons):
    x, y = i % 4 * cw, i // 4 * ch
    im = trim(sheet.crop((x, y, x + cw, y + ch)))
    out = save(im, name, SIZE / max(im.width, im.height))
    print(f'{name} {out.width}x{out.height}')

# Sheet C has one row of four icons of different widths: cut at the gaps between them.
sheet = load('menu-sheet-c-v1.png')
for name, (x0, x1) in zip(
  ['stats', 'worn-gear', 'collections', 'lineage'],
  [(0, 464), (464, 867), (867, 1456), (1456, sheet.width)],
):
  im = trim(sheet.crop((x0, 0, x1, sheet.height)))
  out = save(im, name, SIZE / max(im.width, im.height))
  print(f'{name} {out.width}x{out.height}')

# Sheet D: 3 x 2 window medallions, but the wagon and the scroll reach past an even grid: cut
# at the empty gaps between the icons instead.
sheet = load('menu-sheet-d-v1.png')
ROW = 482
D_BOXES = {
  'legacy': (0, 0, 520, ROW),
  'wagon': (520, 0, 1082, ROW),
  'menu': (1082, 0, sheet.width, ROW),
  'settings': (0, ROW, 550, sheet.height),
  'credits': (550, ROW, 1005, sheet.height),
  'map': (1005, ROW, sheet.width, sheet.height),
}


def centered(im):
  """Pads the icon so the weight of its paint sits in the middle (the wagon's flag sticks out right)."""
  from PIL import Image
  a = im.getchannel('A')
  w, h = im.size
  px = a.load()
  total = sx = sy = 0
  for y in range(0, h, 2):
    for x in range(0, w, 2):
      v = px[x, y]
      total += v
      sx += v * x
      sy += v * y
  cx, cy = sx / total, sy / total
  dx, dy = round(w - 2 * cx), round(h - 2 * cy)
  out = Image.new('RGBA', (w + abs(dx), h + abs(dy)), (0, 0, 0, 0))
  out.paste(im, (max(dx, 0), max(dy, 0)))
  return out


for name, box in D_BOXES.items():
  im = centered(trim(sheet.crop(box)))
  out = save(im, name, SIZE / max(im.width, im.height))
  print(f'{name} {out.width}x{out.height}')

# One more icon on its own sheet: Old Nan's Compendium for the menu button.
im = trim(load('menu-compendium-v1.png'))
out = save(im, 'compendium', SIZE / max(im.width, im.height))
print(f'compendium {out.width}x{out.height}')
