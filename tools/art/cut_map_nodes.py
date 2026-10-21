# Cuts Timo's painted act map nodes (design/notes/act-karte-knoten-art-v1.md, icon sheet 10) into
# apps/web/src/assets/map/node-*.webp for the act map (game/intermission/ActMap.tsx, screens.css).
# Run from the repo root: python3 tools/art/cut_map_nodes.py  (needs Pillow)
#   art/icons/map-nodes-v1.png  3 x 3: fight, elite, thief / shrine, hearth, cache /
#                               event, marisha, empty medallion
# A node is 30 stage pixels; the planning window draws it 1.25x and zooms up to 2x, and the stage
# scales up to 2.4x on 4K: 160 px keeps it sharp everywhere.

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
ns['ART'] = '/mnt/project-files/art/icons/'
ns['OUT'] = 'apps/web/src/assets/map/'
load, blobs, save = ns['load'], ns['blobs'], ns['save']

NODES = ['fight', 'elite', 'thief', 'shrine', 'hearth', 'cache', 'event', 'marisha', 'empty']
SIZE = 160

for im, name in zip(blobs(load('map-nodes-v1.png'), len(NODES)), NODES):
  out = save(im, f'node-{name}', SIZE / max(im.width, im.height))
  print(f'node-{name} {out.width}x{out.height}')
