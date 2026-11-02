# Cuts Timo's painted choice icons (design/notes/wahlkarten-icons-art-v1.md) into
# apps/web/src/assets/choices/*.webp for the Cache, Hearth, Event and Warden's Gate cards,
# and the flame of "Stage X ahead" and the Battle Plan wait flames.
# Run from the repo root: python3 tools/art/cut_choices.py  (needs Pillow)
#   art/icons/choice-sheet-v1.png  5 x 2, clean alpha
# Loose sparks (Boon) stay inside their grid cell, so each icon is its cell, trimmed.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
ns['ART'] = '/mnt/project-files/art/icons/'
ns['OUT'] = 'apps/web/src/assets/choices/'
load, trim, save = ns['load'], ns['trim'], ns['save']

ICONS = [
  ['item', 'heal', 'walk', 'challenge', 'challenge-boss'],
  ['wander', 'boon', 'train', 'lucky', 'flame'],
]
SIZE = 128

sheet = load('choice-sheet-v1.png')
cw, ch = sheet.width / 5, sheet.height / 2
for r, row in enumerate(ICONS):
  for c, name in enumerate(row):
    box = (round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))
    im = trim(sheet.crop(box))
    out = save(im, name, SIZE / max(im.width, im.height))
    print(f'{name} {out.width}x{out.height}')
