# Saves Timo's painted Gatekeeper gate (art/arena/gatekeeper-gate-v1.png, whole and broken) as
# WebP for apps/web/src/game/battle/arenaProps.ts (drawGate).
# Run from the repo root: python3 tools/art/cut_gate.py  (needs Pillow)
import os
from PIL import Image

SRC = '/mnt/project-files/art/arena/'
OUT = 'apps/web/src/assets/arena/'

os.makedirs(OUT, exist_ok=True)
for name in ['gatekeeper-gate', 'gatekeeper-gate-broken']:
  im = Image.open(f'{SRC}{name}-v1.png').convert('RGBA')
  # Both paintings share one frame, so the broken gate lands exactly on the whole one.
  im.save(f'{OUT}{name}.webp', 'WEBP', quality=88, method=6)
  print(name, '->', im.size)
