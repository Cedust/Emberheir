# Cuts Timo's painted menu and workbench icons (design/notes/menu-buttons/menu-icons-art-v1.md,
# icon sheets 15 + 16) into apps/web/src/assets/actions/*.webp: the persona actions
# (game/camp/personaDefs.ts), the top bar buttons (RunHeader.tsx) and Kaelen's tabs.
# Run from the repo root: python3 tools/art/cut_menu_icons.py  (needs Pillow)
#   art/icons/menu-sheet-a-v1.png  4 x 2: Thoric's and Liora's crafts
#   art/icons/menu-sheet-b-v1.png  4 x 2: Crucible, Nyssa's crafts, Gamble, Ash Tree, Heirloom
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
