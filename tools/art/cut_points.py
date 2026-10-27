# Cuts Timo's painted point icons (design/notes/punkte-icons-art-v1.md, icon sheet 14) into
# apps/web/src/assets/points/*.webp for ui/kit/Points.tsx (Skill Points, Heirloom Points).
# Run from the repo root: python3 tools/art/cut_points.py  (needs Pillow)
#   art/icons/points-sheet-v1.png  1 x 2: Skill Point (ash key), Heirloom Point (whetstone)
# The whetstone's sparks are loose pieces, so each icon is its half of the sheet, trimmed.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
ns['ART'] = '/mnt/project-files/art/icons/'
ns['OUT'] = 'apps/web/src/assets/points/'
load, trim, save = ns['load'], ns['trim'], ns['save']

ICONS = ['skill', 'heirloom']
SIZE = 128

sheet = load('points-sheet-v1.png')
half = sheet.width // len(ICONS)
for i, name in enumerate(ICONS):
  im = trim(sheet.crop((i * half, 0, (i + 1) * half, sheet.height)))
  out = save(im, name, SIZE / max(im.width, im.height))
  print(f'{name} {out.width}x{out.height}')
