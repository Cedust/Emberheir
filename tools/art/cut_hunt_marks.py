# Cuts Timo's painted Trail marks (design/notes/hunts-art-v1.md, icon sheet 11) into
# apps/web/src/assets/hunts/*.webp for the Hunts (game/hunts.ts, BattleHud, Bestiary, Eldrin).
# Run from the repo root: python3 tools/art/cut_hunt_marks.py  (needs Pillow)
#   art/icons/hunt-sheet-v1.png  3 x 2: Tracked, Hunted, Cornered / Apex, Untracked, brand
# The marks are drawn at 14-40 stage pixels and the stage scales up to 2.4x on 4K: 128 px is plenty.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
ns['ART'] = '/mnt/project-files/art/icons/'
ns['OUT'] = 'apps/web/src/assets/hunts/'
load, blobs, save = ns['load'], ns['blobs'], ns['save']

MARKS = ['trail-1', 'trail-2', 'trail-3', 'trail-4', 'trail-0', 'brand']
SIZE = 128

for im, name in zip(blobs(load('hunt-sheet-v1.png'), len(MARKS)), MARKS):
  out = save(im, name, SIZE / max(im.width, im.height))
  print(f'{name} {out.width}x{out.height}')
