# Cuts the painted Heir in its ranged pose (Bow, Crossbow) for the arena: the whole otter, plus
# the drawing arm, the bow fist and its fingers once more, drawn over the weapon in front of it.
# Run from the repo root: python3 tools/art/cut_heir_ranged.py [painting.png]  (needs Pillow)
# The printed top lefts match RANGED in apps/web/src/game/battle/heirRig.ts.
from PIL import Image, ImageDraw
import json
import sys
SRC=sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/heir/heir-ranged-v1.png'
OUT='apps/web/src/game/battle/heir/'
im=Image.open(SRC).convert('RGBA')
# Opaque where the painting is (the generator left alpha at 252-254).
im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 245 else (0 if a < 12 else a)))
def save(img,name):
  bb=img.getchannel('A').getbbox()
  c=img.crop(bb)
  c=c.resize((round(c.width*0.5),round(c.height*0.5)),Image.LANCZOS)
  c.save(OUT+name,'WEBP',quality=90,method=6)
  return bb
def cut(poly):
  m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(poly,fill=255)
  part=Image.new('RGBA',im.size,(0,0,0,0)); part.paste(im,(0,0),m)
  return part
# The drawing arm from the sleeve to the paw at the jaw (not the neck behind the paw).
arm=cut([(140,395),(200,383),(330,373),(398,358),(445,358),(484,374),(490,398),(470,425),(457,449),(412,457),(330,467),(262,492),(200,503),(140,492)])
# The bow fist from the wrist on.
fist=cut([(912,424),(940,414),(966,420),(997,432),(1000,492),(988,528),(944,531),(912,518)])
# The bow fist's fingers alone: drawn over a Bow, the rest of the fist under it, so the grip
# lies in the hand.
fingers=cut([(946,418),(968,420),(997,432),(1000,492),(988,528),(950,531),(946,500)])
print(json.dumps({'fingers':save(fingers,'heir-ranged-fingers.webp'),'body':save(im,'heir-ranged.webp'),'arm':save(arm,'heir-ranged-arm.webp'),'fist':save(fist,'heir-ranged-fist.webp')}))
