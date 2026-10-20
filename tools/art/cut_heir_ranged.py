# Cuts the painted Heir in its ranged poses for the arena: Bow (heir-ranged-v1.png) and Crossbow
# (heir-crossbow-v1.png). Per pose the whole otter, plus the drawing arm and the front paw (Bow
# fist, Crossbow fingers) once more, drawn over the weapon that lies in front of the otter.
# Run from the repo root: python3 tools/art/cut_heir_ranged.py  (needs Pillow)
# The printed top lefts match RANGED_POSES in apps/web/src/game/battle/heirRig.ts.
from PIL import Image, ImageDraw
import json
ART='/mnt/project-files/art/heir/'
OUT='apps/web/src/game/battle/heir/'
POSES={
  'bow':{
    'src':'heir-ranged-v1.png',
    # The drawing arm from the sleeve to the paw at the jaw (not the neck behind the paw).
    'arm':[(140,395),(200,383),(330,373),(398,358),(445,358),(484,374),(490,398),(470,425),(457,449),(412,457),(330,467),(262,492),(200,503),(140,492)],
    # The bow fist's fingers and thumb, the thumb's root reaching back to the hand: the grip
    # lies in the fist under them, over its palm.
    'hand':[(906,436),(918,424),(934,416),(968,420),(997,432),(1000,492),(988,528),(950,531),(946,500),(946,466),(926,464),(906,460)],
  },
  'crossbow':{
    'src':'heir-crossbow-v1.png',
    # The arm from the sleeve to the paw on the stock at the jaw, along the fingers' outline (the
    # jaw's fur right of them stays behind the stock).
    'arm':[(188,420),(225,368),(300,356),(400,358),(470,350),(505,346),(522,353),(536,363),(543,378),(541,393),(530,401),(524,413),(512,425),(504,434),(488,441),(440,446),(380,447),(340,472),(280,507),(210,507),(186,470)],
    # The curled fingers, the palm and the wrist under the fore end: the stock rests in them.
    'hand':[(838,448),(870,436),(886,412),(905,400),(935,402),(978,410),(985,440),(968,468),(930,486),(895,500),(880,535),(820,535),(826,470)],
  },
}
def save(img,name):
  bb=img.getchannel('A').getbbox()
  c=img.crop(bb)
  c=c.resize((round(c.width*0.5),round(c.height*0.5)),Image.LANCZOS)
  c.save(OUT+name,'WEBP',quality=90,method=6)
  return bb[:2]
out={}
for pose,p in POSES.items():
  im=Image.open(ART+p['src']).convert('RGBA')
  # Opaque where the painting is (the generator left alpha at 252-254).
  im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 245 else (0 if a < 12 else a)))
  def cut(poly):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(poly,fill=255)
    part=Image.new('RGBA',im.size,(0,0,0,0)); part.paste(im,(0,0),m)
    return part
  out[pose]={'body':save(im,f'heir-{pose}.webp'),'arm':save(cut(p['arm']),f'heir-{pose}-arm.webp'),'hand':save(cut(p['hand']),f'heir-{pose}-hand.webp')}
print(json.dumps(out))
