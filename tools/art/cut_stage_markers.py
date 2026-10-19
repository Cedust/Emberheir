# Cuts Timo's painted stage markers (design/notes/ui-rahmen-art-v1.md, sheet 9) into
# apps/web/src/assets/ui/stage-*.webp for the act bar at the top of the run screens
# (ActProgress in game/RunHeader.tsx, game.css). Run from the repo root:
#   python3 tools/art/cut_stage_markers.py  (needs Pillow)
#   art/ui/stage-markers-v1.png  3 x 3: stud, lit stud, current ring / shrine, gatekeeper, boss /
#                                waymark, camp / track rail
# Each piece keeps about 2.4x the stage pixels it is drawn at (the stage scales up to 2.4x on 4K).
# Prints the cap width of the rail that game.css slices.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
load, blobs, save = ns['load'], ns['blobs'], ns['save']

K = 2.4
# Stage pixels of each piece's height on the bar.
PIECES = [
  ('stage-stud', 16),
  ('stage-stud-lit', 16),
  ('stage-current', 40),
  ('stage-shrine', 20),
  ('stage-gate', 22),
  ('stage-boss', 30),
  ('stage-waymark', 16),
  ('stage-camp', 32),
  ('stage-rail', 12),
]

pieces = blobs(load('stage-markers-v1.png'), len(PIECES), reach=1)
for im, (name, height) in zip(pieces, PIECES):
  out = save(im, name, height * K / im.height)
  print(f'{name} {out.width}x{out.height}')
  if name == 'stage-rail':
    # The rounded end with its rivet is as wide as the rail is tall.
    print(f'  rail cap {out.height} px')
