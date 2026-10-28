# Cuts Timo's painted Harvest icons (design/notes/harvest-icons-art-v1.md, icon sheet 12) into
# apps/web/src/assets/harvest/*.webp for The Harvest window after a Prestige (PrestigeView.tsx).
# Run from the repo root: python3 tools/art/cut_harvest_icons.py  (needs Pillow)
#   art/icons/harvest-sheet-v2.png  1 x 4: Level Cap, Attribute Points, Battle Plan, Keystone Place
#   (v2: Timo regenerated it with a real transparent background; v1 was keyed from a checker)
# The icons are drawn at 40 stage pixels and the stage scales up to 2.4x on 4K: 128 px is plenty.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
ns['ART'] = '/mnt/project-files/art/icons/'
ns['OUT'] = 'apps/web/src/assets/harvest/'
load, blobs, save = ns['load'], ns['blobs'], ns['save']

ICONS = ['level-cap', 'attribute-points', 'battle-plan', 'keystone-place']
SIZE = 128

for im, name in zip(blobs(load('harvest-sheet-v2.png'), len(ICONS)), ICONS):
  out = save(im, name, SIZE / max(im.width, im.height))
  print(f'{name} {out.width}x{out.height}')
