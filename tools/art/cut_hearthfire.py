# Cuts Timo's painted Hearthfire bowl (art/camp/hearthfire-bowl-v1.png, transparent PNG) to the
# bowl, without the painted smoke wisps (the camp draws its own moving smoke), for CampScene.tsx.
# Run from the repo root: python3 tools/art/cut_hearthfire.py [bowl.png]  (needs Pillow)
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/camp/hearthfire-bowl-v1.png'
OUT = 'apps/web/src/assets/camp/hearthfire-bowl.webp'
WIDTH = 512  # the bowl stands ~150 stage px wide, the stage scales up to 2.4x on 4K

im = Image.open(SRC).convert('RGBA')
left, _, right, bottom = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
# The smoke is faint (alpha < 130); the bowl's back rim is the first solid row.
top = im.getchannel('A').point(lambda a: 255 if a > 200 else 0).getbbox()[1] - 5
im = im.crop((left, top, right, bottom))
im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.Resampling.LANCZOS)
im.save(OUT, 'WEBP', quality=90, method=6)
print((left, top, right, bottom), '->', im.size)
