# Cuts Timo's painted Battle HUD sheet (design/notes/ui-rahmen-art-v1.md, sheet 8) into
# apps/web/src/assets/ui/hud-*.webp for the PixiJS HUD (game/battle/hud/HudScene.ts) and the
# skill slots (hud.css). Run from the repo root: python3 tools/art/cut_hud.py  (needs Pillow)
#   art/ui/battle-hud-v1.png  orb ring / skill slot / enemy plate / bar beam
# Prints the opening of the ring and the slices HudScene.ts and hud.css use.
from collections import deque

# Only the helpers of cut_ui.py, not its cutting run.
src = open('tools/art/cut_ui.py').read().split('# --- window frame')[0]
ns = {}
exec(src, ns)
load, blobs, save = ns['load'], ns['blobs'], ns['save']


def hole(im):
  """Bounding box and area of the transparent opening around the piece's centre."""
  A = im.getchannel('A').load()
  W, H = im.size
  start = (W // 2, H // 2)
  q, seen = deque([start]), {start}
  while q:
    x, y = q.popleft()
    for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
      if 0 <= n[0] < W and 0 <= n[1] < H and n not in seen and A[n] < 100:
        seen.add(n)
        q.append(n)
  xs, ys = [p[0] for p in seen], [p[1] for p in seen]
  return (min(xs), min(ys), max(xs) + 1, max(ys) + 1), len(seen)


ring, slot, plate, beam = blobs(load('battle-hud-v1.png'), 4, reach=1)

box, area = hole(ring)
out = save(ring, 'hud-orb-ring', 1)
print(f'hud-orb-ring {out.width}x{out.height}: opening centre '
      f'{(box[0] + box[2]) / 2:.0f},{(box[1] + box[3]) / 2:.0f} radius {(area / 3.14159) ** 0.5:.0f}')

box, _ = hole(slot)
out = save(slot, 'hud-slot', 0.6)
print(f'hud-slot {out.width}x{out.height}: rim {box[0] * 0.6:.0f}')

out = save(plate, 'hud-enemy-plate', 0.8)
print(f'hud-enemy-plate {out.width}x{out.height}')

out = save(beam, 'hud-beam', 0.5)
print(f'hud-beam {out.width}x{out.height}')
