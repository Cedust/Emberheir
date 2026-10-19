# Cuts the painted Heir in its ranged pose (Bow, Crossbow) for the arena: one part, the whole
# otter, the weapon goes behind it.
# Run from the repo root: python3 tools/art/cut_heir_ranged.py [painting.png]  (needs Pillow)
# The printed top left matches RANGED.body in apps/web/src/game/battle/heirRig.ts.
from PIL import Image
import json
import sys
SRC=sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/heir/heir-ranged-v1.png'
OUT='apps/web/src/game/battle/heir/'
im=Image.open(SRC).convert('RGBA')
# Opaque where the painting is (the generator left alpha at 252-254).
im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 245 else (0 if a < 12 else a)))
bb=im.getchannel('A').getbbox()
c=im.crop(bb)
c=c.resize((round(c.width*0.5),round(c.height*0.5)),Image.LANCZOS)
c.save(OUT+'heir-ranged.webp','WEBP',quality=90,method=6)
print(json.dumps({'body':bb}))
